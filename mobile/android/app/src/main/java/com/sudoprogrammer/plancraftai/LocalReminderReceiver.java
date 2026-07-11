package com.sudoprogrammer.plancraftai;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.RingtoneManager;
import android.net.Uri;
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
        String sound = LocalReminderPlugin.normalizeSound(intent.getStringExtra("sound"));
        boolean wakeUp = "wake_up".equalsIgnoreCase(type);
        String channelId = valueOrEmpty(intent.getStringExtra("channelId"));
        if (channelId.isEmpty()) {
            channelId = LocalReminderPlugin.channelIdForSound(sound);
        }

        LocalReminderPlugin.ensureNotificationChannels(context);

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

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title.isEmpty() ? (wakeUp ? "Wake-up reminder" : "Task reminder") : title)
            .setContentText(body.isEmpty() ? (wakeUp ? "Wake up now." : "A scheduled task is due now.") : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body.isEmpty() ? (wakeUp ? "Wake up now." : "A scheduled task is due now.") : body))
            .setPriority(wakeUp ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
            .setCategory(wakeUp ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(wakeUp);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri soundUri;
            if ("wake_chime".equals(sound)) {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/raw/wake_chime");
            } else if ("soft_bell".equals(sound)) {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/raw/soft_bell");
            } else if ("rising_alarm".equals(sound)) {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/raw/rising_alarm");
            } else {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            builder.setSound(soundUri);
        } else {
            builder.setDefaults(Notification.DEFAULT_ALL);
        }

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

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
