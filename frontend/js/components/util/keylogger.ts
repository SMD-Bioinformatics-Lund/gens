type KeyEventData = {
  key: string;
  target: string;
  time: number;
};

// Dispatch dispatch an event to draw a given region
// Redraw events can be limited to certain tracks or include all tracks
class KeyLogger {
  bufferSize: number;
  lastKeyTime: number;
  heldKeys: Record<string, boolean>;
  keyBuffer: KeyEventData[];

  constructor(bufferSize: number = 10) {
    this.bufferSize = bufferSize;
    this.lastKeyTime = Date.now();
    this.heldKeys = {};
    this.keyBuffer = [];

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement;
      const eventData = {
        key: event.key,
        target: targetElement.nodeName,
        time: Date.now(),
      };
      const keyEvent = new CustomEvent<KeyEventData>("keyevent", {
        detail: eventData,
      });
      this.heldKeys[event.key] = true;
      this.keyBuffer.push(eventData);
      while (this.keyBuffer.length > this.bufferSize) {
        this.keyBuffer.shift();
      }
      document.dispatchEvent(keyEvent);
    });
    document.addEventListener("keyup", (event: KeyboardEvent) => {
      delete this.heldKeys[event.key];
    });
  }

  recentKeys(timeWindow: number): KeyEventData[] {
    const currentTime = Date.now();
    return this.keyBuffer.filter(
      (keyEvent) => timeWindow > currentTime - keyEvent.time,
    );
  }

  lastKeypressTime(): number {
    return Date.now() - this.keyBuffer[this.keyBuffer.length - 1].time;
  }
}

export const keyLogger = new KeyLogger();
