import { type AbsoluteSegment, type Segment } from "~/types/edl";

export interface DailySegments {
  date: string;
  index: number;
  segments: Segment[];
}

export function splitSegmentsByDay(
  absSegments: AbsoluteSegment[],
  startOfTrip: string,
  dayCount?: number,
  tzOffsetMinutes = 0,
): DailySegments[] {
  if (!absSegments.length) return [];
  const startMidnight = Date.parse(startOfTrip + 'T00:00:00Z');
  const cleaned = absSegments.slice().sort((a, b) => a.startTs - b.startTs);
  const lastEnd = cleaned.reduce((m, s) => Math.max(m, s.endTs), 0);
  const autoDays = Math.ceil((lastEnd - startMidnight) / (24 * 3600_000));
  const days = dayCount ?? autoDays;
  const result: DailySegments[] = [];

  for (let d = 0; d < days; d++) {
    const dayStartUtc = startMidnight + d * 24 * 3600_000;
    const dayEndUtc = dayStartUtc + 24 * 3600_000;
    const segments: Segment[] = [];

    for (const seg of cleaned) {
      const segStartShift = seg.startTs + tzOffsetMinutes * 60_000;
      const segEndShift = seg.endTs + tzOffsetMinutes * 60_000;
      if (segEndShift <= dayStartUtc || segStartShift >= dayEndUtc) continue;
      const clipStart = Math.max(segStartShift, dayStartUtc);
      const clipEnd = Math.min(segEndShift, dayEndUtc);
      const startMin = (clipStart - dayStartUtc) / 60000;
      const endMin = (clipEnd - dayStartUtc) / 60000;
      if (endMin > startMin) {
        segments.push({ startMin, endMin, status: seg.status, note: seg.note });
      }
    }

    if (segments.length) {
      segments.sort((a, b) => a.startMin - b.startMin);
      result.push({
        date: new Date(dayStartUtc).toISOString().slice(0, 10),
        index: d,
        segments,
      });
    }
  }
  return result;
}

export function extractRestStops(
  absSegments: AbsoluteSegment[],
  minDurationMin = 30,
): AbsoluteSegment[] {
  return absSegments.filter(s => (s.status === 'OFF' || s.status === 'SB') && (s.endTs - s.startTs) / 60000 >= minDurationMin);
}
