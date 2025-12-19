import { v4 as uuid } from "uuid";

function now() {
  return new Date().toISOString();
}

export class MemoryStore {
  constructor() {
    this.pluginSettings = new Map(); // workspaceId -> settings
    this.projects = new Map(); // projectId -> project
    this.statuses = new Map(); // statusId -> status
    this.projectTasks = new Map(); // `${projectId}:${taskId}` -> mapping
    this.sprints = new Map(); // sprintId -> sprint
  }

  upsertPluginSettings(workspaceId, payload, updatedBy) {
    const existing = this.pluginSettings.get(workspaceId) || {
      workspaceId,
      projectManagementEnabled: false,
      sprintEnabled: false,
      sprintLabel: "Sprint",
      updatedAt: now(),
      updatedBy: updatedBy || null,
    };
    const next = {
      ...existing,
      ...payload,
      updatedBy: updatedBy || existing.updatedBy || null,
      updatedAt: now(),
    };
    if (!next.projectManagementEnabled) {
      next.sprintEnabled = false;
    }
    this.pluginSettings.set(workspaceId, next);
    return next;
  }

  getPluginSettings(workspaceId) {
    return (
      this.pluginSettings.get(workspaceId) || {
        workspaceId,
        projectManagementEnabled: false,
        sprintEnabled: false,
        sprintLabel: "Sprint",
        updatedAt: null,
        updatedBy: null,
      }
    );
  }

  createProject(data) {
    const id = data.id || uuid();
    const nowTs = now();
    const project = {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description || "",
      isActive: data.isActive !== false,
      createdBy: data.createdBy || null,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    this.projects.set(id, project);
    return project;
  }

  updateProject(id, patch) {
    const current = this.projects.get(id);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: now() };
    this.projects.set(id, next);
    return next;
  }

  deleteProject(id) {
    const current = this.projects.get(id);
    if (!current) return null;
    this.projects.delete(id);
    // remove statuses, sprints, mappings for cleanliness
    [...this.statuses.values()] // array copy
      .filter((s) => s.projectId === id)
      .forEach((s) => this.statuses.delete(s.id));
    [...this.sprints.values()].filter((s) => s.projectId === id).forEach((s) => this.sprints.delete(s.id));
    [...this.projectTasks.keys()]
      .filter((k) => k.startsWith(`${id}:`))
      .forEach((k) => this.projectTasks.delete(k));
    return current;
  }

  listProjects(filter = {}) {
    const { workspaceId, isActive } = filter;
    return [...this.projects.values()].filter((p) => {
      if (workspaceId && p.workspaceId !== workspaceId) return false;
      if (typeof isActive === "boolean" && p.isActive !== isActive) return false;
      return true;
    });
  }

  createStatus(data) {
    const id = data.id || uuid();
    const status = {
      id,
      projectId: data.projectId,
      name: data.name,
      order: data.order ?? 1,
      isSystem: data.isSystem || false,
      createdAt: now(),
      updatedAt: now(),
    };
    this.statuses.set(id, status);
    return status;
  }

  updateStatus(id, patch) {
    const current = this.statuses.get(id);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: now() };
    this.statuses.set(id, next);
    return next;
  }

  deleteStatus(id) {
    const current = this.statuses.get(id);
    if (!current) return null;
    this.statuses.delete(id);
    return current;
  }

  listStatuses(projectId) {
    return [...this.statuses.values()].filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order);
  }

  createSprint(data) {
    const id = data.id || uuid();
    const sprint = {
      id,
      projectId: data.projectId,
      name: data.name,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.sprints.set(id, sprint);
    return sprint;
  }

  updateSprint(id, patch) {
    const current = this.sprints.get(id);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: now() };
    this.sprints.set(id, next);
    return next;
  }

  deleteSprint(id) {
    const current = this.sprints.get(id);
    if (!current) return null;
    this.sprints.delete(id);
    // unassign project tasks referencing the sprint
    for (const [key, mapping] of this.projectTasks.entries()) {
      if (mapping.sprintId === id) {
        this.projectTasks.set(key, { ...mapping, sprintId: null, updatedAt: now() });
      }
    }
    return current;
  }

  listSprints(projectId) {
    return [...this.sprints.values()].filter((s) => s.projectId === projectId);
  }

  createProjectTask(data) {
    const nowTs = now();
    const statusId = data.statusId;
    const key = `${data.projectId}:${data.taskId}`;
    const mapping = {
      projectId: data.projectId,
      taskId: data.taskId,
      statusId,
      sprintId: data.sprintId || null,
      assignedTo: data.assignedTo || null,
      addedBy: data.addedBy || null,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    this.projectTasks.set(key, mapping);
    return mapping;
  }

  getProjectTask(projectId, taskId) {
    return this.projectTasks.get(`${projectId}:${taskId}`) || null;
  }

  updateProjectTask(projectId, taskId, patch) {
    const key = `${projectId}:${taskId}`;
    const current = this.projectTasks.get(key);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: now() };
    this.projectTasks.set(key, next);
    return next;
  }

  deleteProjectTask(projectId, taskId) {
    const key = `${projectId}:${taskId}`;
    const current = this.projectTasks.get(key);
    if (!current) return null;
    this.projectTasks.delete(key);
    return current;
  }

  listProjectTasks(projectId, filters = {}) {
    const { sprintId, statusId } = filters;
    return [...this.projectTasks.values()].filter((m) => {
      if (m.projectId !== projectId) return false;
      if (sprintId && m.sprintId !== sprintId) return false;
      if (statusId && m.statusId !== statusId) return false;
      return true;
    });
  }
}

export const store = new MemoryStore();
