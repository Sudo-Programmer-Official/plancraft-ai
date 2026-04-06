package com.sudoprogrammer.plancraftai;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(
    name = "LocalReminder",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = LocalReminderPlugin.NOTIFICATIONS_PERMISSION)
)
public class LocalReminderPlugin extends Plugin {
    static final String NOTIFICATIONS_PERMISSION = "notifications";
    static final String PREFS_NAME = "LocalReminderPlugin";
    static final String PREF_IDS = "managed_ids";
    static final String PREF_PAYLOADS = "managed_payloads";
    static final String CHANNEL_ID = "task_reminders";
    static final String CHANNEL_NAME = "Task reminders";

    @Override
    public void load() {
        ensureNotificationChannel();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(permissionResult());
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATIONS_PERMISSION) == PermissionState.GRANTED) {
            call.resolve(permissionResult());
            return;
        }
        requestPermissionForAlias(NOTIFICATIONS_PERMISSION, call, "permissionsCallback");
    }

    @PermissionCallback
    public void permissionsCallback(PluginCall call) {
        if (call != null) {
            call.resolve(permissionResult());
        }
    }

    @PluginMethod
    public void sync(PluginCall call) {
        try {
            ensureNotificationChannel();

            JSONArray reminderArray = call.getArray("reminders", new JSArray());
            List<JSONObject> reminders = new ArrayList<>();
            Set<String> incomingIds = new HashSet<>();
            JSONObject nextPayloads = new JSONObject();
            int scheduledCount = 0;

            if (reminderArray != null) {
                for (int i = 0; i < reminderArray.length(); i++) {
                    Object item = reminderArray.get(i);
                    if (!(item instanceof JSONObject)) continue;
                    JSONObject reminder = (JSONObject) item;
                    String identifier = reminder.optString("id", "").trim();
                    if (identifier.isEmpty()) continue;
                    long scheduledAtMs = parseIsoMillis(reminder.optString("scheduledAt", ""));
                    if (scheduledAtMs <= System.currentTimeMillis() + 5000) continue;

                    reminders.add(reminder);
                    incomingIds.add(identifier);
                }
            }

            Set<String> existingIds = getManagedIds();
            for (String existingId : existingIds) {
                if (!incomingIds.contains(existingId)) {
                    cancelReminder(existingId);
                }
            }

            for (JSONObject reminder : reminders) {
                if (scheduleReminder(reminder, nextPayloads)) {
                    scheduledCount += 1;
                }
            }

            persistManagedState(incomingIds, nextPayloads);

            JSObject result = new JSObject();
            result.put("scheduled", scheduledCount);
            result.put("cancelled", Math.max(0, existingIds.size() - incomingIds.size() + Math.max(0, reminders.size() - scheduledCount)));
            result.put("count", incomingIds.size());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to sync local reminders: " + error.getMessage());
        }
    }

    @PluginMethod
    public void listPending(PluginCall call) {
        try {
            JSONObject payloads = getManagedPayloads();
            JSArray notifications = new JSArray();
            Iterator<String> keys = payloads.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                JSONObject payload = payloads.optJSONObject(key);
                if (payload == null) continue;
                JSObject entry = new JSObject();
                entry.put("id", key);
                entry.put("title", payload.optString("title", ""));
                entry.put("body", payload.optString("body", ""));
                entry.put("scheduledAt", payload.optString("scheduledAt", ""));
                entry.put("taskId", payload.optString("taskId", ""));
                entry.put("workspaceId", payload.optString("workspaceId", ""));
                entry.put("exact", payload.optBoolean("exact", false));
                notifications.put(entry);
            }
            JSObject result = new JSObject();
            result.put("notifications", notifications);
            result.put("count", notifications.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to list local reminders: " + error.getMessage());
        }
    }

    static void removeManagedReminder(Context context, String identifier) {
        if (context == null || identifier == null || identifier.trim().isEmpty()) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Set<String> ids = new HashSet<>(prefs.getStringSet(PREF_IDS, new HashSet<>()));
        ids.remove(identifier);

        JSONObject payloads = readPayloads(prefs);
        payloads.remove(identifier);

        prefs.edit()
            .putStringSet(PREF_IDS, ids)
            .putString(PREF_PAYLOADS, payloads.toString())
            .apply();
    }

    static int requestCodeForId(String identifier) {
        return Math.abs(identifier.hashCode());
    }

    private JSObject permissionResult() {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.put("display", "granted");
            result.put("notifications", "granted");
            return result;
        }

        PermissionState state = getPermissionState(NOTIFICATIONS_PERMISSION);
        String display = state == PermissionState.GRANTED ? "granted" : "prompt";
        result.put("display", display);
        result.put("notifications", display);
        return result;
    }

    private boolean scheduleReminder(JSONObject reminder, JSONObject nextPayloads) {
        String identifier = reminder.optString("id", "").trim();
        if (identifier.isEmpty()) return false;

        long scheduledAtMs = parseIsoMillis(reminder.optString("scheduledAt", ""));
        if (scheduledAtMs <= System.currentTimeMillis() + 5000) return false;

        Intent intent = new Intent(getContext(), LocalReminderReceiver.class);
        intent.setAction("com.sudoprogrammer.plancraftai.LOCAL_REMINDER");
        intent.putExtra("id", identifier);
        intent.putExtra("title", reminder.optString("title", "Task reminder"));
        intent.putExtra("body", reminder.optString("body", ""));
        intent.putExtra("taskId", reminder.optString("taskId", ""));
        intent.putExtra("workspaceId", reminder.optString("workspaceId", ""));

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(),
            requestCodeForId(identifier),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;

        boolean exact = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, scheduledAtMs, pendingIntent);
            exact = true;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, scheduledAtMs, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, scheduledAtMs, pendingIntent);
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("id", identifier);
            payload.put("title", reminder.optString("title", "Task reminder"));
            payload.put("body", reminder.optString("body", ""));
            payload.put("scheduledAt", reminder.optString("scheduledAt", ""));
            payload.put("taskId", reminder.optString("taskId", ""));
            payload.put("workspaceId", reminder.optString("workspaceId", ""));
            payload.put("exact", exact);
            nextPayloads.put(identifier, payload);
        } catch (JSONException ignored) {
            return false;
        }

        return true;
    }

    private void cancelReminder(String identifier) {
        Intent intent = new Intent(getContext(), LocalReminderReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(),
            requestCodeForId(identifier),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(requestCodeForId(identifier));
        }
    }

    private void persistManagedState(Set<String> ids, JSONObject payloads) {
        getPrefs()
            .edit()
            .putStringSet(PREF_IDS, ids)
            .putString(PREF_PAYLOADS, payloads.toString())
            .apply();
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @NonNull
    private Set<String> getManagedIds() {
        return new HashSet<>(getPrefs().getStringSet(PREF_IDS, new HashSet<>()));
    }

    @NonNull
    private JSONObject getManagedPayloads() {
        return readPayloads(getPrefs());
    }

    @NonNull
    private static JSONObject readPayloads(SharedPreferences prefs) {
        String raw = prefs.getString(PREF_PAYLOADS, "{}");
        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Due task reminders from PlanCraftAI");
        notificationManager.createNotificationChannel(channel);
    }

    private long parseIsoMillis(String raw) {
        try {
            return Instant.parse(raw).toEpochMilli();
        } catch (Exception error) {
            return -1L;
        }
    }
}
