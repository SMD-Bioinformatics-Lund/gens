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

    // Records keypress combinations
    constructor(bufferSize: number = 10) {
        // Setup variables
        this.bufferSize = bufferSize;
        this.lastKeyTime = Date.now();
        this.heldKeys = {}; // store held keys
        this.keyBuffer = []; // store recent keys
        //  Setup event listending functions
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            const targetElement = event.target as HTMLElement;
            // store event
            const eventData = {
                key: event.key,
                // FIXME: Does this change work? Remove the comment below if confirmed
                target: targetElement.nodeName,
                // target: window.event.target.nodeName,
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
        // get keys pressed within a window of time.
        const currentTime = Date.now();
        return this.keyBuffer.filter(
            (keyEvent) => timeWindow > currentTime - keyEvent.time,
        );
    }

    lastKeypressTime(): number {
        // FIXME: Is this correct?
        return Date.now() - this.keyBuffer[this.keyBuffer.length - 1].time;
        // return this.keyBuffer[this.keyBuffer.length - 1] - Date.now();
    }
}

export const keyLogger = new KeyLogger();

// // Setup handling of keydown events
// const keystrokeDelay = 2000;
// document.addEventListener("keyevent", (event: CustomEvent<KeyEventData>) => {
//     const key = event.detail.key;

//     // dont act on key presses in input fields
//     const excludeFileds = ["input", "select", "textarea"];
//     if (!excludeFileds.includes(event.detail.target.toLowerCase())) {
//         if (key === "Enter") {
//             // Enter was pressed, process previous key presses.
//             const recentKeys = keyLogger.recentKeys(keystrokeDelay);
//             recentKeys.pop(); // skip Enter key
//             const lastKey = recentKeys[recentKeys.length - 1];
//             const numKeys = parseInt(
//                 recentKeys
//                     .slice(Math.max(recentKeys.length - 2, 0))
//                     .filter((val) => parseInt(val.key))
//                     .map((val) => val.key)
//                     .join(""),
//             );
//             // process keys
//             if (lastKey.key === "x" || lastKey.key === "y") {
//                 console.error("FIXME: Should this be working?");
//                 // drawTrack({ region: lastKey.key });
//             } else if (numKeys && numKeys > 0 && numKeys < 23) {
//                 console.error("FIXME: Should this be working?");
//                 // drawTrack({ region: numKeys });
//             } else {
//                 return;
//             }
//         }
//         switch (key) {
//             case "ArrowLeft":
//                 // previousChromosome();
//                 break;
//             case "ArrowRight":
//                 // nextChromosome();
//                 break;
//             case "a":
//                 // panTracks("left", 0.7);
//                 break;
//             case "d":
//                 // panTracks("right", 0.7);
//                 break;
//             case "ArrowUp":
//             case "w":
//             case "+":
//                 // zoomIn();
//                 break;
//             case "ArrowDown":
//             case "s":
//             case "-":
//                 // zoomOut();
//                 break;
//             default:
//         }
//     }
// });
