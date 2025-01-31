type Point = {
  x: number;
  y: number;
};

type ElementCoords = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type DisplayElement = {
  id: string;
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  start: number;
  end: number;
  features: string[];
  isDisplayed: boolean;
  tooltip: any;
  visibleX1?: number;
  visibleX2?: number;
  visibleY1?: number;
  visibleY2?: number;
};

type ScreenPositions = {
  start: number;
  end: number;
};

type RequestType = "GET"|"POST"|"PUT"|"DELETE"

type RequestOptions = {
  method: RequestType,
  headers: any,
  body?: string
}

type OffscreenPosition = {
  start: number|null,
  end: number|null,
  scale: number|null,
}

type OnscreenPosition = {
  start: number|null,
  end: number|null,
}

type InteractiveFeature = {
  yStart: number,
  yEnd: number,
  step: number,
  color: string,
}