const sinkMode = (process.env.EVENT_SINK || "log").toLowerCase();
const maxMemoryEvents = Number(process.env.EVENT_MEMORY_LIMIT || 500);
const activityEnabled = process.env.EVENT_ACTIVITY_ENABLED !== "0";

const memoryBuffer = [];
let eventCounter = 0;

function pushToMemory(event) {
  memoryBuffer.push(event);
  if (memoryBuffer.length > maxMemoryEvents) {
    memoryBuffer.shift(); // simple ring buffer
  }
}

export function dispatchEvent(event) {
  if (!event || typeof event !== "object") return;
  event.id = event.id || ++eventCounter;
  switch (sinkMode) {
    case "none":
      return;
    case "memory":
      pushToMemory(event);
      console.log(JSON.stringify({ level: "info", msg: "event", event }));
      return;
    case "log":
    default:
      console.log(JSON.stringify({ level: "info", msg: "event", event }));
      return;
  }
}

export function getEvents(filter = {}) {
  if (!activityEnabled) return { events: [], nextCursor: null };
  if (sinkMode !== "memory") return { events: [], nextCursor: null };
  const { projectId, workspaceId } = filter;
  let events = memoryBuffer.filter((e) => {
    if (projectId && e.projectId !== projectId) return false;
    if (workspaceId && e.workspaceId !== workspaceId) return false;
    return true;
  });

  const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
  const cursor = filter.cursor;
  if (cursor) {
    const numericCursor = Number(cursor);
    if (!Number.isNaN(numericCursor) && numericCursor > 0) {
      events = events.filter((e) => Number(e.id) > numericCursor);
    } else {
      events = events.filter((e) => e.timestamp > String(cursor));
    }
  }

  const paged = events.slice(0, limit);
  const nextCursor = paged.length ? paged[paged.length - 1].id : null;
  return { events: paged, nextCursor };
}
