import React, { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";

type AbsSeg = { start: string; end: string; status: "OFF"|"SB"|"DRIVE"|"OND"; note?: string };
const StatusLabels: Record<string, string> = {
  OFF: "Off Duty",
  SB: "Sleeper Berth",
  DRIVE: "Driving",
  OND: "On Duty (Not Driving)",
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60); const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TripSummaryDialog({ segments }: { segments: AbsSeg[] }) {
  const grouped = useMemo(() => {
    const list = [...segments].sort((a, b) => a.start.localeCompare(b.start));
    const map: Record<string, AbsSeg[]> = {};
    for (const s of list) {
      const key = s.start.slice(0, 10);
      (map[key] ||= []).push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [segments]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Trip Summary</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[900px] lg:max-w-[1000px] p-4">
        <DialogHeader>
          <DialogTitle>Trip Summary</DialogTitle>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto thin-scrollbar pr-1 -mr-1 space-y-4">
          {grouped.length === 0 && (
            <div className="text-sm text-muted-foreground">No trip data yet. Plan a route to see the summary.</div>
          )}
          {grouped.map(([date, segs]) => (
            <div key={date} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 text-sm font-medium bg-muted/30 border-b">{date}</div>
              <ul className="divide-y">
                {segs.map((s, i) => {
                  const st = new Date(s.start);
                  const en = new Date(s.end);
                  return (
                    <li key={i} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                      <div className="min-w-[160px] shrink-0 text-muted-foreground">
                        <div>{fmtTime(st)} – {fmtTime(en)}</div>
                        <div className="text-xs">{fmtDuration(en.getTime() - st.getTime())}</div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{StatusLabels[s.status]}</div>
                        {s.note && <div className="text-xs text-muted-foreground mt-0.5">{s.note}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
