export const DOMAINS = ["society", "cipher", "protocol", "swatch", "data", "signal", "neuron", "programming"] as const;
export type Domain = (typeof DOMAINS)[number];

export function domainClass(domain: Domain | null | undefined): string {
  return `domain-${domain ?? "programming"}`;
}

export type ScheduleSlot = { weekday: number; start: string; minutes: number };

export function isScheduleSlot(v: unknown): v is ScheduleSlot {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.weekday === "number" && Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6 &&
    typeof s.start === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.start) &&
    typeof s.minutes === "number" && s.minutes >= 15 && s.minutes <= 360
  );
}

export function parseSchedule(v: unknown): ScheduleSlot[] {
  return Array.isArray(v) ? v.filter(isScheduleSlot) : [];
}
