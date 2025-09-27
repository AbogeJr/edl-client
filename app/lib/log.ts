import { HOUR_WIDTH, ROW_HEIGHT, STATUS_TO_ROW_INDEX, type Segment } from "~/types/edl";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function minToX(min: number) {
  return (clamp(min, 0, 1440) / 60) * HOUR_WIDTH;
}

export function rowToY(rowIndex: number) {
  return rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export function segmentsToPolylinePoints(segments: Segment[]): string {
  const pts: Array<[number, number]> = [];
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin);

  const normalized: Segment[] = (() => {
    if (sorted.length === 0) return sorted;
    const first = sorted[0];
    if (first.startMin <= 0) return sorted;
    if (first.status === 'OFF') {
      return [{ ...first, startMin: 0 }, ...sorted.slice(1)];
    }
    return [{ startMin: 0, endMin: first.startMin, status: 'OFF', note: 'Auto-fill' }, ...sorted];
  })();

  for (let i = 0; i < normalized.length; i++) {
    const s = normalized[i];
    const y = rowToY(STATUS_TO_ROW_INDEX[s.status]);
    const x1 = minToX(s.startMin);
    const x2 = minToX(s.endMin);

    if (i === 0) {
      pts.push([x1, y]);
    } else {
      const prev = normalized[i - 1];
      const prevY = rowToY(STATUS_TO_ROW_INDEX[prev.status]);
      const prevEndX = minToX(prev.endMin);
      if (pts.length === 0 || pts[pts.length - 1][0] !== prevEndX) pts.push([prevEndX, prevY]);
      pts.push([prevEndX, y]);
    }
    pts.push([x2, y]);
  }

  if (normalized.length) {
    const last = normalized[normalized.length - 1];
    const lastY = rowToY(STATUS_TO_ROW_INDEX[last.status]);
    const lastX = minToX(last.endMin);
    if (last.endMin < 1440) pts.push([(1440 / 60) * HOUR_WIDTH, lastY]);
    else if (lastX !== (1440 / 60) * HOUR_WIDTH) pts.push([(1440 / 60) * HOUR_WIDTH, lastY]);
  }

  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}
