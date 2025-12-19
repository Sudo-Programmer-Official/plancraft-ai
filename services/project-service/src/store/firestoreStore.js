import { v4 as uuid } from "uuid";
import { firestore } from "../services/firebase.js";

const COLLECTIONS = {
  projects: "projects",
  statuses: "project_statuses",
  sprints: "project_sprints",
  mappings: "project_tasks",
  pluginSettings: "project_plugin_settings",
};

function now() {
  return new Date().toISOString();
}

export class FirestoreStore {
  constructor() {
    this.db = firestore();
  }

  async getPluginSettings(workspaceId) {
    const ref = this.db.collection(COLLECTIONS.pluginSettings).doc(String(workspaceId));
    const snap = await ref.get();
    if (!snap.exists) {
      return {
        workspaceId,
        projectManagementEnabled: false,
        sprintEnabled: false,
        sprintLabel: "Sprint",
        updatedAt: null,
        updatedBy: null,
      };
    }
    return snap.data();
  }

  async upsertPluginSettings(workspaceId, payload, updatedBy) {
    const ref = this.db.collection(COLLECTIONS.pluginSettings).doc(String(workspaceId));
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? existingSnap.data() : null;
    const next = {
      workspaceId,
      projectManagementEnabled: Boolean(payload.projectManagementEnabled),
      sprintEnabled: Boolean(payload.sprintEnabled) && Boolean(payload.projectManagementEnabled),
      sprintLabel: payload.sprintLabel || existing?.sprintLabel || "Sprint",
      updatedAt: now(),
      updatedBy: updatedBy || existing?.updatedBy || null,
    };
    await ref.set(next, { merge: true });
    return next;
  }

  async createProjectWithDefaults({ workspaceId, name, description = "", createdBy }) {
    const projectId = uuid();
    const nowTs = now();
    const projectRef = this.db.collection(COLLECTIONS.projects).doc(projectId);
    const statusRefs = [uuid(), uuid(), uuid()].map((id) =>
      this.db.collection(COLLECTIONS.statuses).doc(id),
    );
    const defaults = [
      { name: "Todo", order: 1, isSystem: true },
      { name: "In Progress", order: 2, isSystem: true },
      { name: "Done", order: 3, isSystem: true },
    ];

    await this.db.runTransaction(async (tx) => {
      tx.set(projectRef, {
        id: projectId,
        workspaceId,
        name,
        description,
        isActive: true,
        createdBy: createdBy || null,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
      defaults.forEach((s, idx) => {
        tx.set(statusRefs[idx], {
          id: statusRefs[idx].id,
          projectId,
          name: s.name,
          order: s.order,
          isSystem: s.isSystem,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
      });
    });

    const projectSnap = await projectRef.get();
    return projectSnap.data();
  }

  async updateProject(id, patch) {
    const ref = this.db.collection(COLLECTIONS.projects).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const payload = { ...patch, updatedAt: now() };
    await ref.set(payload, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  async softDeleteProject(id) {
    return this.updateProject(id, { isActive: false });
  }

  async getProject(id) {
    const snap = await this.db.collection(COLLECTIONS.projects).doc(id).get();
    return snap.exists ? snap.data() : null;
  }

  async listProjects(filter = {}) {
    let query = this.db.collection(COLLECTIONS.projects).where("workspaceId", "==", filter.workspaceId);
    if (typeof filter.isActive === "boolean") {
      query = query.where("isActive", "==", filter.isActive);
    }
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
  }

  async createStatus(data) {
    const id = data.id || uuid();
    const ref = this.db.collection(COLLECTIONS.statuses).doc(id);
    const nowTs = now();
    const payload = {
      id,
      projectId: data.projectId,
      name: data.name,
      order: data.order ?? 1,
      isSystem: data.isSystem || false,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    await ref.set(payload);
    return payload;
  }

  async getStatus(id) {
    const snap = await this.db.collection(COLLECTIONS.statuses).doc(id).get();
    return snap.exists ? snap.data() : null;
  }

  async updateStatus(id, patch) {
    const ref = this.db.collection(COLLECTIONS.statuses).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...patch, updatedAt: now() }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  async deleteStatus(id) {
    const ref = this.db.collection(COLLECTIONS.statuses).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.delete();
    return snap.data();
  }

  async listStatuses(projectId) {
    const snap = await this.db
      .collection(COLLECTIONS.statuses)
      .where("projectId", "==", projectId)
      .orderBy("order")
      .get();
    return snap.docs.map((d) => d.data());
  }

  async createSprint(data) {
    const id = data.id || uuid();
    const ref = this.db.collection(COLLECTIONS.sprints).doc(id);
    const nowTs = now();
    const payload = {
      id,
      projectId: data.projectId,
      name: data.name,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    await ref.set(payload);
    return payload;
  }

  async getSprint(id) {
    const snap = await this.db.collection(COLLECTIONS.sprints).doc(id).get();
    return snap.exists ? snap.data() : null;
  }

  async updateSprint(id, patch) {
    const ref = this.db.collection(COLLECTIONS.sprints).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...patch, updatedAt: now() }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  async deleteSprint(id) {
    const ref = this.db.collection(COLLECTIONS.sprints).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.delete();
    // unassign sprint from mappings referencing it
    const mappingSnap = await this.db
      .collection(COLLECTIONS.mappings)
      .where("sprintId", "==", id)
      .get();
    const batch = this.db.batch();
    mappingSnap.docs.forEach((doc) => {
      batch.set(doc.ref, { sprintId: null, updatedAt: now() }, { merge: true });
    });
    if (!mappingSnap.empty) await batch.commit();
    return snap.data();
  }

  async listSprints(projectId) {
    const snap = await this.db.collection(COLLECTIONS.sprints).where("projectId", "==", projectId).get();
    return snap.docs.map((d) => d.data());
  }

  async createProjectTask(data) {
    const key = `${data.projectId}_${data.taskId}`;
    const ref = this.db.collection(COLLECTIONS.mappings).doc(key);
    const nowTs = now();
    const mapping = {
      projectId: data.projectId,
      taskId: data.taskId,
      statusId: data.statusId,
      sprintId: data.sprintId || null,
      assignedTo: data.assignedTo || null,
      addedBy: data.addedBy || null,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    await ref.set(mapping);
    return mapping;
  }

  async getProjectTask(projectId, taskId) {
    const ref = this.db.collection(COLLECTIONS.mappings).doc(`${projectId}_${taskId}`);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  }

  async updateProjectTask(projectId, taskId, patch) {
    const ref = this.db.collection(COLLECTIONS.mappings).doc(`${projectId}_${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...patch, updatedAt: now() }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  async deleteProjectTask(projectId, taskId) {
    const ref = this.db.collection(COLLECTIONS.mappings).doc(`${projectId}_${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.delete();
    return snap.data();
  }

  async listProjectTasks(projectId, filters = {}) {
    let query = this.db.collection(COLLECTIONS.mappings).where("projectId", "==", projectId);
    if (filters.sprintId) query = query.where("sprintId", "==", filters.sprintId);
    if (filters.statusId) query = query.where("statusId", "==", filters.statusId);
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
  }
}

export const store = new FirestoreStore();
