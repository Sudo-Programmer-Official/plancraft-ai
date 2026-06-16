package com.sudoprogrammer.plancraftai;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class LocalReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String identifier = valueOrEmpty(intent.getStringExtra("id"));
        String title = valueOrEmpty(intent.getStringExtra("title"));
        String body = valueOrEmpty(intent.getStringExtra("body"));
        String taskId = valueOrEmpty(intent.getStringExtra("taskId"));
        String workspaceId = valueOrEmpty(intent.getStringExtra("workspaceId"));
        String type = valueOrEmpty(intent.getStringExtra("type"));
        boolean wakeUp = "wake_up".equalsIgnoreCase(type);

        ensureNotificationChannel(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted =
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            if (!granted) {
                LocalReminderPlugin.removeManagedReminder(context, identifier);
                return;
            }
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.putExtra("notification_task_id", taskId);
            launchIntent.putExtra("notification_workspace_id", workspaceId);
            launchIntent.putExtra("notification_reminder_id", identifier);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            contentIntent = PendingIntent.getActivity(
                context,
                LocalReminderPlugin.requestCodeForId(identifier),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, LocalReminderPlugin.CHANNEL_ID)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title.isEmpty() ? (wakeUp ? "Wake-up reminder" : "Task reminder") : title)
            .setContentText(body.isEmpty() ? (wakeUp ? "Wake up now." : "A scheduled task is due now.") : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body.isEmpty() ? (wakeUp ? "Wake up now." : "A scheduled task is due now.") : body))
            .setPriority(wakeUp ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
            .setCategory(wakeUp ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setDefaults(Notification.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(wakeUp);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
            if (wakeUp) {
                builder.setFullScreenIntent(contentIntent, true);
            }
        }

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(LocalReminderPlugin.requestCodeForId(identifier), builder.build());
        }

        LocalReminderPlugin.removeManagedReminder(context, identifier);
    }

    private static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        NotificationChannel channel = new NotificationChannel(
            LocalReminderPlugin.CHANNEL_ID,
            LocalReminderPlugin.CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Due task reminders from PlanCraftAI");
        notificationManager.createNotificationChannel(channel);
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
