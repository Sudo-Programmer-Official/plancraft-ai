package com.sudoprogrammer.plancraftai;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
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
    static final String CHANNEL_ID = "task_reminders_default";
    static final String CHANNEL_WAKE_CHIME_ID = "task_reminders_wake_chime";
    static final String CHANNEL_SOFT_BELL_ID = "task_reminders_soft_bell";
    static final String CHANNEL_RISING_ALARM_ID = "task_reminders_rising_alarm";
    static final String CHANNEL_NAME = "Task reminders";
    static final String CHANNEL_WAKE_CHIME_NAME = "Wake-up reminders";
    static final String CHANNEL_SOFT_BELL_NAME = "Soft bell reminders";
    static final String CHANNEL_RISING_ALARM_NAME = "Rising alarm reminders";
    static final String EXTRA_SOUND = "sound";
    static final String SOUND_WAKE_CHIME = "wake_chime";
    static final String SOUND_SOFT_BELL = "soft_bell";
    static final String SOUND_RISING_ALARM = "rising_alarm";

    @Override
    public void load() {
        ensureNotificationChannels(getContext());
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
            ensureNotificationChannels(getContext());

            JSONArray reminderArray = call.getArray("reminders", new JSArray());
            List<JSONObject> reminders = new ArrayList<>();

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
                }
            }

            JSObject result = scheduleManagedReminders(reminders, true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to sync local reminders: " + error.getMessage());
        }
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            ensureNotificationChannels(getContext());

            JSONObject reminder = call.getObject("reminder");
            if (reminder == null) {
                JSONArray reminderArray = call.getArray("reminders", new JSArray());
                if (reminderArray != null && reminderArray.length() > 0) {
                    Object item = reminderArray.get(0);
                    if (item instanceof JSONObject) {
                        reminder = (JSONObject) item;
                    }
                }
            }

            if (reminder == null) {
                call.reject("Missing reminder payload");
                return;
            }

            List<JSONObject> reminders = new ArrayList<>();
            reminders.add(reminder);
            JSObject result = scheduleManagedReminders(reminders, false);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to schedule local reminder: " + error.getMessage());
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
        String sound = normalizeSound(reminder.optString(EXTRA_SOUND, ""));
        String channelId = channelIdForSound(sound);

        Intent intent = new Intent(getContext(), LocalReminderReceiver.class);
        intent.setAction("com.sudoprogrammer.plancraftai.LOCAL_REMINDER");
        intent.putExtra("id", identifier);
        intent.putExtra("title", reminder.optString("title", "Task reminder"));
        intent.putExtra("body", reminder.optString("body", ""));
        intent.putExtra("taskId", reminder.optString("taskId", ""));
        intent.putExtra("workspaceId", reminder.optString("workspaceId", ""));
        intent.putExtra("type", reminder.optString("type", ""));
        intent.putExtra(EXTRA_SOUND, sound);
        intent.putExtra("channelId", channelId);

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
            payload.put("type", reminder.optString("type", ""));
            payload.put(EXTRA_SOUND, sound);
            payload.put("channelId", channelId);
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

    private JSObject scheduleManagedReminders(List<JSONObject> reminders, boolean replaceExisting) throws JSONException {
        Set<String> existingIds = getManagedIds();
        JSONObject nextPayloads = replaceExisting ? new JSONObject() : getManagedPayloads();
        Set<String> nextIds = replaceExisting ? new HashSet<>() : new HashSet<>(existingIds);
        int scheduledCount = 0;

        if (replaceExisting) {
            Set<String> incomingIds = new HashSet<>();
            for (JSONObject reminder : reminders) {
                String identifier = reminder.optString("id", "").trim();
                if (!identifier.isEmpty()) {
                    incomingIds.add(identifier);
                }
            }
            for (String existingId : existingIds) {
                if (!incomingIds.contains(existingId)) {
                    cancelReminder(existingId);
                }
            }
            nextIds = incomingIds;
        }

        for (JSONObject reminder : reminders) {
            if (scheduleReminder(reminder, nextPayloads)) {
                scheduledCount += 1;
                nextIds.add(reminder.optString("id", "").trim());
            }
        }

        persistManagedState(nextIds, nextPayloads);

        JSObject result = new JSObject();
        result.put("scheduled", scheduledCount);
        result.put("cancelled", replaceExisting ? Math.max(0, existingIds.size() - nextIds.size() + Math.max(0, reminders.size() - scheduledCount)) : 0);
        result.put("count", nextIds.size());
        return result;
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

    private long parseIsoMillis(String raw) {
        try {
            return Instant.parse(raw).toEpochMilli();
        } catch (Exception error) {
            return -1L;
        }
    }

    static void ensureNotificationChannels(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel defaultChannel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        defaultChannel.setDescription("Due task reminders from PlanCraftAI");
        defaultChannel.enableVibration(true);
        defaultChannel.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            attributes
        );
        notificationManager.createNotificationChannel(defaultChannel);

        NotificationChannel wakeChannel = new NotificationChannel(
            CHANNEL_WAKE_CHIME_ID,
            CHANNEL_WAKE_CHIME_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        wakeChannel.setDescription("Wake-up reminders from PlanCraftAI");
        wakeChannel.enableVibration(true);
        Uri wakeSound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/wake_chime");
        wakeChannel.setSound(wakeSound, attributes);
        notificationManager.createNotificationChannel(wakeChannel);

        NotificationChannel softBellChannel = new NotificationChannel(
            CHANNEL_SOFT_BELL_ID,
            CHANNEL_SOFT_BELL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        softBellChannel.setDescription("Soft bell reminders from PlanCraftAI");
        softBellChannel.enableVibration(true);
        Uri softBellSound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/soft_bell");
        softBellChannel.setSound(softBellSound, attributes);
        notificationManager.createNotificationChannel(softBellChannel);

        NotificationChannel risingAlarmChannel = new NotificationChannel(
            CHANNEL_RISING_ALARM_ID,
            CHANNEL_RISING_ALARM_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        risingAlarmChannel.setDescription("Rising alarm reminders from PlanCraftAI");
        risingAlarmChannel.enableVibration(true);
        Uri risingAlarmSound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/rising_alarm");
        risingAlarmChannel.setSound(risingAlarmSound, attributes);
        notificationManager.createNotificationChannel(risingAlarmChannel);
    }

    static String normalizeSound(String raw) {
        if (raw == null) return "default";
        String normalized = raw.trim().toLowerCase().replace('-', '_').replace(' ', '_');
        if (SOUND_WAKE_CHIME.equals(normalized)) return SOUND_WAKE_CHIME;
        if (SOUND_SOFT_BELL.equals(normalized)) return SOUND_SOFT_BELL;
        if (SOUND_RISING_ALARM.equals(normalized)) return SOUND_RISING_ALARM;
        return "default";
    }

    static String channelIdForSound(String sound) {
        String normalized = normalizeSound(sound);
        if (SOUND_WAKE_CHIME.equals(normalized)) return CHANNEL_WAKE_CHIME_ID;
        if (SOUND_SOFT_BELL.equals(normalized)) return CHANNEL_SOFT_BELL_ID;
        if (SOUND_RISING_ALARM.equals(normalized)) return CHANNEL_RISING_ALARM_ID;
        return CHANNEL_ID;
    }
}
