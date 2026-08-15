/**
 * MissionEvents: Decoupled event bus for campaign mission progression.
 */
class MissionEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const list = this.listeners.get(eventName);
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(eventName, payload) {
    if (!this.listeners.has(eventName)) return;
    const list = this.listeners.get(eventName);
    list.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[MissionEvents] Error in handler for "${eventName}":`, err);
      }
    });
  }
}

export const missionEvents = new MissionEventBus();
