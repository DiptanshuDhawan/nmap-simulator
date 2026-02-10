export class Scheduler {
  constructor() {
    this.events = []; // [{ time: 100, action: () => ... }]
    this.currentTime = 0;
  }

  addEvent(time, action) {
    this.events.push({ time, action });
    this.events.sort((a, b) => a.time - b.time);
  }

  tick(dt) {
    this.currentTime += dt;
    // Execute events that are due
    while (this.events.length > 0 && this.events[0].time <= this.currentTime) {
      const event = this.events.shift();
      event.action();
    }
  }

  clear() {
    this.events = [];
    this.currentTime = 0;
  }
}
