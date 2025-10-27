// timeSequencer.js - Handles time sequencing and relationships between tasks
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Adjusts task times based on their temporal relationships
 * @param {Array} tasks - Array of tasks with time relationships
 * @param {Object} timeRelations - Object describing task timing dependencies
 * @param {string} startTime - ISO string of earliest allowed time
 * @param {string} timezone - IANA timezone identifier
 * @returns {Array} Tasks with adjusted scheduledTime fields
 */
export function autoAdjustTimes({
  tasks = [],
  timeRelations = [],
  startTime = new Date().toISOString(),
  timezone = 'UTC',
  defaultGapMinutes = 15
}) {
  if (!tasks.length) return [];
  
  // Convert to timezone-aware dayjs objects
  const tzStart = dayjs.tz(startTime, timezone);
  const adjusted = [...tasks];
  const processed = new Set();
  const scheduled = new Map();

  // First pass: Handle absolute times
  adjusted.forEach((task, index) => {
    if (task.time?.type === 'absolute' && task.time.value) {
      try {
        const taskTime = dayjs.tz(task.time.value, timezone);
        if (taskTime.isValid()) {
          scheduled.set(index, taskTime);
          processed.add(index);
        }
      } catch (e) {
        console.warn(`Invalid absolute time for task ${index}:`, e?.message);
      }
    }
  });

  // Second pass: Resolve relative times
  let changed = true;
  const MAX_ITERATIONS = tasks.length * 2; // Prevent infinite loops
  let iterations = 0;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    timeRelations.forEach(relation => {
      const { taskId, followsTaskId, parallelWithTaskId, minimumGapMinutes } = relation;
      const gap = minimumGapMinutes ?? defaultGapMinutes;

      // Skip if task already processed
      if (processed.has(taskId - 1)) return;

      if (followsTaskId !== null) {
        // Task follows another task
        const prevTaskTime = scheduled.get(followsTaskId - 1);
        if (prevTaskTime) {
          const newTime = prevTaskTime.add(gap, 'minutes');
          scheduled.set(taskId - 1, newTime);
          processed.add(taskId - 1);
          changed = true;
        }
      } else if (parallelWithTaskId !== null) {
        // Task runs parallel with another task
        const parallelTaskTime = scheduled.get(parallelWithTaskId - 1);
        if (parallelTaskTime) {
          scheduled.set(taskId - 1, parallelTaskTime);
          processed.add(taskId - 1);
          changed = true;
        }
      }
    });
  }

  // Third pass: Distribute remaining tasks evenly
  let lastTime = tzStart;
  adjusted.forEach((task, index) => {
    if (!processed.has(index)) {
      lastTime = lastTime.add(defaultGapMinutes, 'minutes');
      scheduled.set(index, lastTime);
    }
  });

  // Update tasks with calculated times
  return adjusted.map((task, index) => {
    const scheduledTime = scheduled.get(index);
    return {
      ...task,
      scheduledTime: scheduledTime ? scheduledTime.utc().toISOString() : null
    };
  });
}

/**
 * Validates temporal consistency of task relationships
 * @param {Array} tasks - Array of task objects
 * @param {Array} timeRelations - Array of time relationship objects
 * @returns {Object} Validation result with any errors found
 */
export function validateTimeRelations(tasks, timeRelations) {
  const errors = [];
  const taskIds = new Set(tasks.map((_, i) => i + 1));

  // Check for invalid task references
  timeRelations.forEach((rel, i) => {
    if (!taskIds.has(rel.taskId)) {
      errors.push(`Relation ${i}: Invalid taskId ${rel.taskId}`);
    }
    if (rel.followsTaskId && !taskIds.has(rel.followsTaskId)) {
      errors.push(`Relation ${i}: Invalid followsTaskId ${rel.followsTaskId}`);
    }
    if (rel.parallelWithTaskId && !taskIds.has(rel.parallelWithTaskId)) {
      errors.push(`Relation ${i}: Invalid parallelWithTaskId ${rel.parallelWithTaskId}`);
    }
  });

  // Check for circular dependencies
  const graph = new Map();
  timeRelations.forEach(rel => {
    if (rel.followsTaskId) {
      if (!graph.has(rel.taskId)) graph.set(rel.taskId, new Set());
      graph.get(rel.taskId).add(rel.followsTaskId);
    }
  });

  function hasCycle(node, visited = new Set(), path = new Set()) {
    if (path.has(node)) return true;
    if (visited.has(node)) return false;
    
    visited.add(node);
    path.add(node);
    
    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      if (hasCycle(dep, visited, path)) return true;
    }
    
    path.delete(node);
    return false;
  }

  taskIds.forEach(id => {
    if (hasCycle(id)) {
      errors.push(`Circular dependency detected involving task ${id}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}