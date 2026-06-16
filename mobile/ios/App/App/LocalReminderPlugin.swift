import Foundation
import Capacitor
import UserNotifications

private enum LocalReminderError: LocalizedError {
    case invalidReminderPayload

    var errorDescription: String? {
        switch self {
        case .invalidReminderPayload:
            return "Invalid reminder payload."
        }
    }
}

private struct LocalReminderItem {
    let identifier: String
    let taskId: String?
    let workspaceId: String?
    let type: String?
    let title: String
    let body: String
    let scheduledAt: Date
}

@objc(LocalReminderPlugin)
class LocalReminderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocalReminderPlugin"
    public let jsName = "LocalReminder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listPending", returnType: CAPPluginReturnPromise),
    ]

    private let managedPrefix = "task-reminder:"
    private let isoFormatterWithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    @objc override func checkPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(self.serializePermission(settings.authorizationStatus))
        }
    }

    @objc override func requestPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, error in
            if let error {
                call.reject("Failed to request notification permissions.", "permission_request_failed", error)
                return
            }

            self.checkPermissions(call)
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        let rawReminders = call.getArray("reminders", JSArray())
        let reminders = self.parseReminders(rawReminders)
        self.replaceManagedReminders(reminders, call: call)
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard let reminder = self.parseSingleReminder(call) else {
            call.reject("Missing reminder payload.")
            return
        }
        self.scheduleReminder(reminder, replaceExisting: false, call: call)
    }

    private func replaceManagedReminders(_ reminders: [LocalReminderItem], call: CAPPluginCall) {
        self.scheduleReminder(reminders, replaceExisting: true, call: call)
    }

    private func scheduleReminder(_ reminder: LocalReminderItem, replaceExisting: Bool, call: CAPPluginCall) {
        self.scheduleReminder([reminder], replaceExisting: replaceExisting, call: call)
    }

    private func scheduleReminder(_ reminders: [LocalReminderItem], replaceExisting: Bool, call: CAPPluginCall) {
        
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let existingManagedIds = requests
                .map { $0.identifier }
                .filter { $0.hasPrefix(self.managedPrefix) }

            let incomingIds = Set(reminders.map { $0.identifier })
            let removals = replaceExisting ? existingManagedIds.filter { !incomingIds.contains($0) } : []

            if !removals.isEmpty {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: removals)
                UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: removals)
            }

            let dispatchGroup = DispatchGroup()
            var scheduledCount = 0

            reminders.forEach { reminder in
                dispatchGroup.enter()
                let request = self.buildRequest(reminder)
                UNUserNotificationCenter.current().add(request) { error in
                    if error == nil {
                        scheduledCount += 1
                    }
                    dispatchGroup.leave()
                }
            }

            dispatchGroup.notify(queue: .main) {
                call.resolve([
                    "scheduled": scheduledCount,
                    "cancelled": removals.count,
                    "count": replaceExisting ? reminders.count : existingManagedIds.count + scheduledCount,
                ])
            }
        }
    }

    @objc func listPending(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let items = requests
                .filter { $0.identifier.hasPrefix(self.managedPrefix) }
                .compactMap { request -> [String: Any]? in
                    let nextTrigger = (request.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate()
                    return [
                        "id": request.identifier,
                        "title": request.content.title,
                        "body": request.content.body,
                        "scheduledAt": nextTrigger.map { self.isoFormatterWithFractionalSeconds.string(from: $0) } ?? "",
                        "taskId": request.content.userInfo["taskId"] as? String ?? "",
                        "workspaceId": request.content.userInfo["workspaceId"] as? String ?? "",
                        "type": request.content.userInfo["type"] as? String ?? "",
                    ]
                }
                .sorted {
                    String(describing: $0["scheduledAt"] ?? "") < String(describing: $1["scheduledAt"] ?? "")
                }

            call.resolve([
                "notifications": items,
                "count": items.count,
            ])
        }
    }
}

private extension LocalReminderPlugin {
    func serializePermission(_ status: UNAuthorizationStatus) -> [String: Any] {
        let display: String
        switch status {
        case .authorized:
            display = "granted"
        case .provisional:
            display = "provisional"
        case .ephemeral:
            display = "ephemeral"
        case .denied:
            display = "denied"
        case .notDetermined:
            display = "prompt"
        @unknown default:
            display = "prompt"
        }

        return [
            "display": display,
            "notifications": display,
        ]
    }

    func parseReminders(_ rawReminders: JSArray) -> [LocalReminderItem] {
        let now = Date()
        return rawReminders.compactMap { entry in
            guard let reminder = entry as? [String: Any] else { return nil }
            guard
                let identifier = reminder["id"] as? String,
                !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                let scheduledAtRaw = reminder["scheduledAt"] as? String,
                let scheduledAt = parseIsoDate(scheduledAtRaw),
                scheduledAt > now.addingTimeInterval(5),
                let titleValue = reminder["title"] as? String
            else {
                return nil
            }

            return LocalReminderItem(
                identifier: identifier,
                taskId: reminder["taskId"] as? String,
                workspaceId: reminder["workspaceId"] as? String,
                type: reminder["type"] as? String,
                title: titleValue.isEmpty ? "Task reminder" : titleValue,
                body: (reminder["body"] as? String) ?? "",
                scheduledAt: scheduledAt
            )
        }
    }

    func parseSingleReminder(_ call: CAPPluginCall) -> LocalReminderItem? {
        guard let rawReminder = call.getObject("reminder") as? [String: Any] else {
            let rawArray = call.getArray("reminders", JSArray())
            guard rawArray.count > 0, let entry = rawArray[0] as? [String: Any] else { return nil }
            return self.parseReminder(entry)
        }
        return self.parseReminder(rawReminder)
    }

    func parseReminder(_ reminder: [String: Any]) -> LocalReminderItem? {
        let now = Date()
        guard
            let identifier = reminder["id"] as? String,
            !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            let scheduledAtRaw = reminder["scheduledAt"] as? String,
            let scheduledAt = parseIsoDate(scheduledAtRaw),
            scheduledAt > now.addingTimeInterval(5)
        else {
            return nil
        }

        let titleValue = (reminder["title"] as? String) ?? "Task reminder"
        return LocalReminderItem(
            identifier: identifier,
            taskId: reminder["taskId"] as? String,
            workspaceId: reminder["workspaceId"] as? String,
            type: reminder["type"] as? String,
            title: titleValue.isEmpty ? "Task reminder" : titleValue,
            body: (reminder["body"] as? String) ?? "",
            scheduledAt: scheduledAt
        )
    }

    func parseIsoDate(_ raw: String) -> Date? {
        if let date = isoFormatterWithFractionalSeconds.date(from: raw) {
            return date
        }
        return isoFormatter.date(from: raw)
    }

    func buildRequest(_ reminder: LocalReminderItem) -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = reminder.title
        content.body = reminder.body
        content.sound = .default
        content.userInfo = [
            "taskId": reminder.taskId ?? "",
            "workspaceId": reminder.workspaceId ?? "",
            "type": reminder.type ?? "",
        ]

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: reminder.scheduledAt
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        return UNNotificationRequest(identifier: reminder.identifier, content: content, trigger: trigger)
    }
}
