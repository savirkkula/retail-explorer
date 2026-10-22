import type { DateRange, Ymd } from "@/queries/helpers";

export type PeriodId = "ltm" | "ytd" | "quarter" | "month";

export interface PeriodOption {
    id: PeriodId;
    label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
    { id: "ltm", label: "Last 12 months" },
    { id: "ytd", label: "Year to date" },
    { id: "quarter", label: "Last quarter" },
    { id: "month", label: "Last month" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function lastDay(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function ymd(year: number, month: number, day: number): Ymd {
    return `${year}-${pad(month)}-${pad(day)}`;
}

/** Shifts a (year, month) pair by `delta` months. */
function shiftMonth(year: number, month: number, delta: number): [number, number] {
    const idx = year * 12 + (month - 1) + delta;
    return [Math.floor(idx / 12), (idx % 12) + 1];
}

/** The last fully covered month for an integer date key such as 20260930. */
export function lastFullMonth(maxDateKey: number): [number, number] {
    const year = Math.floor(maxDateKey / 10000);
    const month = Math.floor((maxDateKey % 10000) / 100);
    const day = maxDateKey % 100;
    return day >= lastDay(year, month) ? [year, month] : shiftMonth(year, month, -1);
}

/** Month-aligned range ending at `endMonth` and spanning `months` months. */
export function monthsRange(endMonth: [number, number], months: number): DateRange {
    const [sy, sm] = shiftMonth(endMonth[0], endMonth[1], -(months - 1));
    return { start: ymd(sy, sm, 1), end: ymd(endMonth[0], endMonth[1], lastDay(endMonth[0], endMonth[1])) };
}

export function resolvePeriod(id: PeriodId, maxDateKey: number): DateRange {
    const end = lastFullMonth(maxDateKey);
    switch (id) {
        case "ytd":
            return monthsRange(end, end[1]);
        case "quarter":
            return monthsRange(end, 3);
        case "month":
            return monthsRange(end, 1);
        default:
            return monthsRange(end, 12);
    }
}

/** Trailing 24 months ending at the same month as the period; used for trend charts. */
export function trendRange(maxDateKey: number): DateRange {
    return monthsRange(lastFullMonth(maxDateKey), 24);
}

export function monthsInRange(range: DateRange): number {
    const [sy, sm] = range.start.split("-").map(Number);
    const [ey, em] = range.end.split("-").map(Number);
    return (ey - sy) * 12 + (em - sm) + 1;
}

/** All month-start dates covered by the range, oldest first. */
export function monthList(range: DateRange): Ymd[] {
    const out: Ymd[] = [];
    let [y, m] = range.start.split("-").map(Number);
    const n = monthsInRange(range);
    for (let i = 0; i < n; i++) {
        out.push(ymd(y, m, 1));
        [y, m] = shiftMonth(y, m, 1);
    }
    return out;
}

export function rangeLabel(range: DateRange): string {
    const fmt = (s: Ymd) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
    return `${fmt(range.start)} – ${fmt(range.end)}`;
}
