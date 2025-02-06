import { get } from "./fetch";
import { CHROMOSOMES } from "./track";
import { chromSizes } from "./helper";

function redrawEvent({ region, exclude = [], ...kwargs }) {
  return new CustomEvent("draw", {
    detail: { region: region, exclude: exclude, ...kwargs },
  });
}

function drawEventManager({ target, throttleTime }) {
  const tracks = [
    ...target.querySelectorAll(".track-container"),
    target.querySelector("#cytogenetic-ideogram"),
  ];
  let lastEventTime = 0;
  return (event) => {
    const now = Date.now();
    if (throttleTime < Date.now() - lastEventTime || event.detail.force) {
      lastEventTime = Date.now();
      for (const track of tracks) {
        if (!event.detail.exclude.includes(track.id)) {
          track.dispatchEvent(redrawEvent({ ...event.detail }));
        }
      }
    }
  };
}

export function setupDrawEventManager({ target, throttleTime = 20 }) {
  const manager = drawEventManager({ target, throttleTime });
  target.addEventListener("draw", (event) => {
    manager(event);
  });
}

export function readInputField() {
  const field = document.getElementById("region-field") as HTMLInputElement;
  return parseRegionDesignation(field.value);
}

function updateInputField({
  chrom,
  start,
  end,
}: {
  chrom: string;
  start: number;
  end: number;
}) {
  const field = document.getElementById("region-field") as HTMLInputElement;
  field.value = `${chrom}:${start}-${end}`;
  field.placeholder = field.value;
  field.blur();
}

// parse chromosomal region designation string
// return chromosome, start and end position
// eg 1:12-220 --> 1, 12 220
// 1: --> 1, null, null
// 1 --> 1, null, null
export function parseRegionDesignation(regionString) {
  if (regionString.includes(":")) {
    const [chromosome, position] = regionString.split(":");
    // verify chromosome
    if (!CHROMOSOMES.includes(chromosome)) {
      throw new Error(`${chromosome} is not a valid chromosome`);
    }
    let [start, end] = position.split("-");
    start = parseInt(start);
    end = parseInt(end);
    return { chrom: chromosome, start: start, end: end };
  }
}

export async function limitRegionToChromosome({
  chrom,
  start,
  end,
  genomeBuild = "38",
}) {
  // assert that start/stop are within start and end of chromosome
  const sizes = await chromSizes(genomeBuild);
  const chromSize = sizes[chrom];
  start = start === null ? 1 : start;
  end = end === null ? chromSize : end;
  //  ensure the window size stay the same
  const windowSize = end - start + 1 >= chromSize ? chromSize : end - start;
  let updStart, updEnd;
  if (windowSize >= chromSize) {
    updStart = 1;
    updEnd = chromSize;
  } else if (start < 1) {
    updStart = 1;
    updEnd = windowSize;
  } else if (end > chromSize) {
    updStart = chromSize - windowSize;
    updEnd = chromSize;
  } else {
    updStart = start;
    updEnd = end;
  }
  return { chrom: chrom, start: Math.round(updStart), end: Math.round(updEnd) };
}

export async function drawTrack({
  chrom,
  start,
  end,
  genomeBuild = "38",
  exclude = [],
  force = false,
  ...kwargs
}) {
  // update input field
  const region = await limitRegionToChromosome({
    chrom,
    start,
    end,
    genomeBuild,
  });
  updateInputField({ ...region });
  const trackContainer = document.getElementById("visualization-container");
  trackContainer.dispatchEvent(
    redrawEvent({ region, exclude, force, ...kwargs })
  );
  // make overview update its region marking
  const markRegionEvent = new CustomEvent("mark-region", {
    detail: { region: region },
  });
  document.getElementById("overview-container").dispatchEvent(markRegionEvent);
  document
    .getElementById("cytogenetic-ideogram")
    .dispatchEvent(markRegionEvent);
}

// If query is a regionString draw the relevant region
// If input is a chromosome display entire chromosome
// Else query api for genes with that name and draw that region
export function queryRegionOrGene(query, genomeBuild = 38) {
  if (query.includes(":")) {
    drawTrack(parseRegionDesignation(query));
  } else if (CHROMOSOMES.includes(query)) {
    drawTrack({ chrom: query, start: 1, end: null });
  } else {
    get("search-annotation", { query: query, genome_build: genomeBuild }).then(
      (result) => {
        if (result.status === 200) {
          drawTrack({
            chrom: result.chromosome,
            start: result.start_pos,
            end: result.end_pos,
          });
        }
      }
    );
  }
}

// goto the next chromosome
export function nextChromosome() {
  const position = readInputField();
  const chrom = CHROMOSOMES[CHROMOSOMES.indexOf(position.chrom) + 1];
  drawTrack({ chrom: chrom, start: 1, end: null });
}

// goto the previous chromosome
export function previousChromosome() {
  const position = readInputField();
  const chrom = CHROMOSOMES[CHROMOSOMES.indexOf(position.chrom) - 1];
  drawTrack({ chrom: chrom, start: 1, end: null });
}

// Pan whole canvas and tracks to the left
export function panTracks(direction = "left", speed = 0.1) {
  const pos = readInputField();
  const distance = Math.abs(Math.floor(speed * (pos.end - pos.start)));
  if (direction === "left") {
    pos.start -= distance;
    pos.end -= distance;
  } else {
    pos.start += distance;
    pos.end += distance;
  }
  // drawTrack will correct the window eventually, but let us not go negative at least
  if (pos.start < 0) {
    pos.end = pos.end - pos.start;
    pos.start = 1;
  }
  drawTrack({
    chrom: pos.chrom,
    start: pos.start,
    end: pos.end,
    drawTitle: false,
    exclude: ["cytogenetic-ideogram"],
  });
}

// Handle zoom in button click
export function zoomIn() {
  const pos = readInputField();
  const factor = Math.floor((pos.end - pos.start) * 0.2);
  pos.start += factor;
  pos.end -= factor;
  drawTrack({
    chrom: pos.chrom,
    start: pos.start,
    end: pos.end,
    exclude: ["cytogenetic-ideogram"],
    drawTitle: false,
  });
}

// Handle zoom out button click
export function zoomOut() {
  const pos = readInputField();
  const factor = Math.floor((pos.end - pos.start) / 3);
  pos.start = pos.start - factor < 1 ? 1 : pos.start - factor;
  pos.end += factor;
  drawTrack({
    chrom: pos.chrom,
    start: pos.start,
    end: pos.end,
    exclude: ["cytogenetic-ideogram"],
    drawTitle: false,
  });
}

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
      const keyEvent = new CustomEvent<KeyEventData>("keyevent", { detail: eventData });
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
      (keyEvent) => timeWindow > currentTime - keyEvent.time
    );
  }

  lastKeypressTime(): number {
    // FIXME: Is this correct?
    return Date.now() - this.keyBuffer[this.keyBuffer.length - 1].time;
    // return this.keyBuffer[this.keyBuffer.length - 1] - Date.now();
  }
}

export const keyLogger = new KeyLogger();

// Setup handling of keydown events
const keystrokeDelay = 2000;
document.addEventListener("keyevent", (event: CustomEvent<KeyEventData>) => {
  const key = event.detail.key;

  // dont act on key presses in input fields
  const excludeFileds = ["input", "select", "textarea"];
  if (!excludeFileds.includes(event.detail.target.toLowerCase())) {
    if (key === "Enter") {
      // Enter was pressed, process previous key presses.
      const recentKeys = keyLogger.recentKeys(keystrokeDelay);
      recentKeys.pop(); // skip Enter key
      const lastKey = recentKeys[recentKeys.length - 1];
      const numKeys = parseInt(
        recentKeys
          .slice(Math.max(recentKeys.length - 2, 0))
          .filter((val) => parseInt(val.key))
          .map((val) => val.key)
          .join("")
      );
      // process keys
      if (lastKey.key === "x" || lastKey.key === "y") {
        console.error("FIXME: Should this be working?")
        // drawTrack({ region: lastKey.key });
      } else if (numKeys && numKeys > 0 && numKeys < 23) {
        console.error("FIXME: Should this be working?")
        // drawTrack({ region: numKeys });
      } else {
        return;
      }
    }
    switch (key) {
      case "ArrowLeft":
        previousChromosome();
        break;
      case "ArrowRight":
        nextChromosome();
        break;
      case "a":
        panTracks("left", 0.7);
        break;
      case "d":
        panTracks("right", 0.7);
        break;
      case "ArrowUp":
      case "w":
      case "+":
        zoomIn();
        break;
      case "ArrowDown":
      case "s":
      case "-":
        zoomOut();
        break;
      default:
    }
  }
});
