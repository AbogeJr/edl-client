export type DutyStatus = "OFF" | "SB" | "DRIVE" | "OND";

export type Segment = {
  startMin: number;
  endMin: number;
  status: DutyStatus;
  note?: string;
};

export type AbsoluteSegment = {
  startTs: number;
  endTs: number;
  status: DutyStatus;
  note?: string;
};

export type LngLat = { lat: number; lng: number };

export type Stop = {
  label: string;
  query: string;
  coord?: LngLat | null;
};

export const STATUS_TO_ROW_INDEX: Record<DutyStatus, number> = {
  OFF: 0, SB: 1, DRIVE: 2, OND: 3,
};

export const STATUS_LABEL: Record<DutyStatus, string> = {
  OFF: "1. Off Duty",
  SB: "2. Sleeper Berth",
  DRIVE: "3. Driving",
  OND: "4. On Duty (Not Driving)",
};

export const HOUR_WIDTH = 25;
export const ROW_HEIGHT = 56;
export const LABEL_COL = 210;
export const GRID_W = 24 * HOUR_WIDTH;
export const GRID_H = 4 * ROW_HEIGHT;

