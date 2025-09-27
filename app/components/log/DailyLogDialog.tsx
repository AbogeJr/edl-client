import React, { useMemo, useRef, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { CalendarDays } from "lucide-react";
import { type DutyStatus, GRID_H, GRID_W, LABEL_COL, type Segment, STATUS_LABEL, STATUS_TO_ROW_INDEX } from "~/types/edl";
import { segmentsToPolylinePoints } from "~/lib/log";

export interface DailyLogRecapRule {
  onDutyToday?: number;
  totalOnDutyPrevDays?: number;
  availableTomorrow?: number;
}

export interface DailyLogMetadata {
  date?: string;
  timezone?: string;
  driverName?: string;
  carrier?: string;
  mainOffice?: string;
  homeTerminal?: string;
  currentLocation?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  cycleHoursUsed?: number;
  totalMilesDrivingToday?: number;
  totalMileageToday?: number;
  truckTractorTrailer?: string;
  totalMiles?: number;
  totalHours?: number;
  remarks?: string;
  shippingDocs?: string;
  shipperCommodity?: string;
  recap70?: DailyLogRecapRule;
}

export function DailyLogSheet({
  segments,
  metadata,
  previousOnDutyHours7,
  previousOnDutyHours8,
  autoCalc = true,
  showExport = true,
}: {
  segments: Segment[];
  metadata?: DailyLogMetadata;
  previousOnDutyHours7?: number;
  previousOnDutyHours8?: number;
  autoCalc?: boolean;
  showExport?: boolean;
}) {
  const polyPoints = useMemo(() => segmentsToPolylinePoints(segments), [segments]);

  const dutyTotals = useMemo(() => {
    const mins: Record<DutyStatus, number> = { OFF: 0, SB: 0, DRIVE: 0, OND: 0 };
    for (const s of segments) {
      const dur = Math.max(0, s.endMin - s.startMin);
      mins[s.status] += dur;
    }
    const toHours = (m: number) => +(m / 60).toFixed(2);
    return {
      OFF: toHours(mins.OFF),
      SB: toHours(mins.SB),
      DRIVE: toHours(mins.DRIVE),
      OND: toHours(mins.OND),
      onDuty: toHours(mins.DRIVE + mins.OND),
      total: toHours(mins.OFF + mins.SB + mins.DRIVE + mins.OND),
    };
  }, [segments]);

  const recap = useMemo(() => {
    if (!autoCalc) return {  recap70: metadata?.recap70 };
    const onDutyToday = dutyTotals.onDuty;
    const rule70Prev = previousOnDutyHours8 ?? metadata?.recap70?.totalOnDutyPrevDays;
    const calcAvail = (limit: number, prev?: number) => prev === undefined ? undefined : Math.max(0, +(limit - (prev + onDutyToday)).toFixed(2));
    return {
      recap70: {
        onDutyToday,
        totalOnDutyPrevDays: rule70Prev,
        availableTomorrow: calcAvail(70, rule70Prev),
      },
    };
  }, [autoCalc, dutyTotals.onDuty, previousOnDutyHours7, previousOnDutyHours8, metadata?.recap70?.totalOnDutyPrevDays]);

  const mergedMeta: DailyLogMetadata | undefined = useMemo(() => {
    if (!metadata) return metadata;
    if (!autoCalc) return metadata;
    return {
      ...metadata,
      recap70: metadata.recap70 || recap.recap70,
      totalHours: metadata.totalHours ?? dutyTotals.onDuty,
    };
  }, [metadata, recap, dutyTotals, autoCalc]);

  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "white" });
      const link = document.createElement("a");
      link.download = `daily-log-${mergedMeta?.date || "export"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }, [mergedMeta?.date]);

  const handlePrint = useCallback(() => {
    if (!exportRef.current) return;
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) return;

    const styleEls = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
    const styles = styleEls.map(el => el.outerHTML).join('\n');
    const contentHTML = exportRef.current.outerHTML;

    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html><html><head><title>Daily Log</title>${styles}<style>
      body { margin:0; font-family: system-ui, sans-serif; }
      .print-hidden, .print:hidden { display:none !important; }
      @media print { .print-hidden, .print:hidden { display:none !important; } }
    </style></head><body>${contentHTML}</body></html>`);
    printWin.document.close();

    const tryPrint = () => {
      setTimeout(() => {
        try { printWin.print(); } catch { /* ignore */ }
      }, 150);
    };

    if (printWin.document.readyState === 'complete') {
      tryPrint();
    } else {
      printWin.onload = tryPrint;
    }
  }, []);

  return (
    <>
      <div
        className="w-full border rounded-lg overflow-hidden bg-white text-[10px] sm:text-[11px]"
        ref={exportRef}
      >
          {mergedMeta && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-2 bg-muted/10">
                <div className="font-semibold text-sm">Drivers Daily Log <span className="font-normal text-[10px]">(24 hours)</span></div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div>Month: <span className="font-medium">{mergedMeta.date ? mergedMeta.date.split('-')[1] : ""}</span></div>
                  <div>Day: <span className="font-medium">{mergedMeta.date ? mergedMeta.date.split('-')[2] : ""}</span></div>
                  <div>Year: <span className="font-medium">{mergedMeta.date ? mergedMeta.date.split('-')[0] : ""}</span></div>
                  {mergedMeta.timezone && <div>TZ: <span className="font-medium">{mergedMeta.timezone}</span></div>}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 px-4 pt-3 pb-2 border-b
                              xl:grid-cols-12 lg:grid-cols-12 md:grid-cols-12
                              sm:grid-cols-12">
                <div className="col-span-12 md:col-span-5 lg:col-span-4 space-y-2">
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">From:</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.currentLocation || ""}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">To:</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.dropoffLocation || ""}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Truck/Tractor & Trailer / License & State</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.truckTractorTrailer || ""}</div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-4 lg:col-span-3 space-y-2">
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Total Miles Driving Today</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.totalMilesDrivingToday ?? (mergedMeta.totalMiles ? Math.round(mergedMeta.totalMiles) : "")}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Total Mileage Today</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.totalMileageToday ?? ""}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Cycle Used (Hrs)</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.cycleHoursUsed ?? ""}</div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-7 lg:col-span-5 space-y-2">
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Name of Carrier or Carriers</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.carrier || ""}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Main Office Address</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.mainOffice || ""}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Home Terminal Address</div>
                    <div className="border px-2 py-1 min-h-[28px]">{mergedMeta.homeTerminal || ""}</div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 border-b flex flex-col md:flex-row gap-4 md:gap-8">
                <div className="flex-1">
                  <div className="uppercase tracking-wide text-[9px] font-semibold">Driver Name</div>
                  <div className="border px-2 py-1 min-h-[26px]">{mergedMeta.driverName || ""}</div>
                </div>
                {mergedMeta.pickupLocation && (
                  <div className="flex-1">
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Pickup Location</div>
                    <div className="border px-2 py-1 min-h-[26px]">{mergedMeta.pickupLocation}</div>
                  </div>
                )}
                {mergedMeta.totalHours !== undefined && (
                  <div className="flex-1">
                    <div className="uppercase tracking-wide text-[9px] font-semibold">Route Hours (Info)</div>
                    <div className="border px-2 py-1 min-h-[26px]">{mergedMeta.totalHours.toFixed(1)}</div>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="overflow-x-auto thin-scrollbar">
          <div className="grid" style={{ gridTemplateColumns: `${LABEL_COL}px 1fr` }}>
            <div className="border-r  bg-muted/30 px-4 py-2 text-sm font-medium">Status</div>
            <div className="relative" style={{ width: "100%", minWidth: GRID_W }}>
              <div className="flex">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 border-r border-b text-xs text-muted-foreground h-8 flex items-center justify-center">
                    {i === 0 ? "Mid" : i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: `${LABEL_COL}px 1fr` }}>
            <div className="border-r text-sm">
              {(Object.keys(STATUS_TO_ROW_INDEX) as DutyStatus[]).map((key) => (
                <div key={key} className="h-14 min-w-[50px] flex items-center border-b px-4">{STATUS_LABEL[key]}</div>
              ))}
            </div>

            <div className="relative select-none" style={{ width: "100%", minWidth: GRID_W }}>
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="flex">
                  {Array.from({ length: 24 }).map((_, col) => (
                    <div key={col} className="h-14 flex-1 border-r border-b" />
                  ))}
                </div>
              ))}

              <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${GRID_W} ${GRID_H}`} preserveAspectRatio="none">
                <polyline points={polyPoints} stroke="currentColor" strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
          </div>

          {mergedMeta && (
            <div className="grid grid-cols-12 gap-4 px-4 py-4 border-t md:grid-cols-12 sm:grid-cols-12">
              <div className="col-span-12 md:col-span-6 lg:col-span-5 space-y-2">
                <div className="uppercase tracking-wide text-[9px] font-semibold">Remarks</div>
                <div className="border min-h-[120px] p-2 whitespace-pre-wrap text-[10px] leading-snug">{mergedMeta.remarks || ""}</div>
              </div>
              <div className="col-span-12 md:col-span-4 lg:col-span-4 space-y-2">
                <div className="uppercase tracking-wide text-[9px] font-semibold">Shipping Documents</div>
                <div className="border p-2 min-h-[50px] text-[10px]">{mergedMeta.shippingDocs || ""}</div>
                <div className="uppercase tracking-wide text-[9px] font-semibold">Shipper & Commodity</div>
                <div className="border p-2 min-h-[50px] text-[10px]">{mergedMeta.shipperCommodity || ""}</div>
                <p className="text-[9px] text-muted-foreground pt-1 leading-tight">Enter name of place you reported and where released from work and where each change of duty occurred. Use time standard of home terminal.</p>
              </div>
              <div className="col-span-12 md:col-span-2 lg:col-span-3 space-y-2">
                <div className="uppercase tracking-wide text-[9px] font-semibold">Recap (Complete end of day)</div>
                <div className="border divide-y">
                  <div className="p-2">
                    <div className="font-semibold text-[10px]">70 Hour / 8 Day</div>
                    <div className="grid grid-cols-2 text-[9px] mt-1 gap-y-1">
                      <div className="font-medium">On duty today:</div>
                      <div>{(autoCalc ? recap.recap70?.onDutyToday : mergedMeta.recap70?.onDutyToday) ?? ""} h</div>
                      <div className="font-medium">Prev days total:</div>
                      <div>{(autoCalc ? recap.recap70?.totalOnDutyPrevDays : mergedMeta.recap70?.totalOnDutyPrevDays) ?? ""} h</div>
                      <div className="font-medium">Avail tomorrow:</div>
                      <div>{(autoCalc ? recap.recap70?.availableTomorrow : mergedMeta.recap70?.availableTomorrow) ?? ""} h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
      {showExport && (
        <div className="flex justify-end gap-2 px-4 py-2 mt-2 bg-muted/10 rounded-md print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}>Print</Button>
          <Button size="sm" onClick={handleExportPNG} disabled={exporting}>{exporting ? "Exporting..." : "Export PNG"}</Button>
        </div>
      )}
    </>
  );
}

export interface DailyLogDayData {
  date: string;
  segments: Segment[];
  metadata?: DailyLogMetadata;
  previousOnDutyHours7?: number;
  previousOnDutyHours8?: number;
}

interface DailyLogDialogProps extends React.ComponentProps<typeof DailyLogSheet> {
  days?: DailyLogDayData[];
}

export default function DailyLogDialog({ days, ...singleProps }: DailyLogDialogProps) {
  const multi = days && days.length > 0;
  const [index, setIndex] = React.useState(0);
  const active = multi ? days![index] : undefined;
  const buttonLabel = multi ? `Open Daily Logs (${days!.length})` : 'Open Daily Log';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="ml-2">{buttonLabel}</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[1100px]  p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {multi ? 'Daily Logs' : 'Daily Log Sheet'}
          </DialogTitle>
        </DialogHeader>
        {multi && days!.length > 1 && (
          <div className="flex items-center justify-between mb-3 text-xs gap-2">
            <div className="font-medium">Day {index + 1} / {days!.length}{active?.date ? ` • ${active.date}` : ''}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={index === days!.length - 1} onClick={() => setIndex(i => Math.min(days!.length - 1, i + 1))}>Next</Button>
            </div>
          </div>
        )}
        <div className="max-h-[75vh] md:max-h-[80vh] overflow-y-auto pr-1 -mr-1 thin-scrollbar">
          {multi ? (
            <DailyLogSheet
              key={active?.date || index}
              segments={active?.segments || []}
              metadata={active?.metadata}
              previousOnDutyHours7={active?.previousOnDutyHours7}
              previousOnDutyHours8={active?.previousOnDutyHours8}
              autoCalc
              showExport={!multi || index === 0}
            />
          ) : (
            <DailyLogSheet {...singleProps} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
