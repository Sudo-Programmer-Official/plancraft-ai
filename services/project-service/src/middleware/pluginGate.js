import { store } from "../store/firestoreStore.js";

export function requireProjectManagementEnabled(req, res, next) {
  const workspaceId = req.workspaceId || req.params.workspaceId || req.query.workspaceId || req.body?.workspaceId;
  if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
  store
    .getPluginSettings(String(workspaceId))
    .then((settings) => {
      if (!settings.projectManagementEnabled) {
        return res.status(403).json({ error: "Project Management disabled", code: "PLUGIN_DISABLED" });
      }
      req.pluginSettings = settings;
      next();
    })
    .catch(next);
}

export function requireSprintEnabled(req, res, next) {
  const workspaceId = req.workspaceId || req.params.workspaceId || req.query.workspaceId || req.body?.workspaceId;
  store
    .getPluginSettings(String(workspaceId))
    .then((settings) => {
      if (!settings.sprintEnabled) {
        return res.status(403).json({ error: "Sprints disabled", code: "PLUGIN_DISABLED" });
      }
      req.pluginSettings = req.pluginSettings || settings;
      next();
    })
    .catch(next);
}
