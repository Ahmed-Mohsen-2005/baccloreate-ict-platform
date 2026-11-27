import type { ScheduleSlot } from "@/lib/db/domain";

const WEEK_MINUTES = 7 * 24 * 60;

/** Weekday (0=Sunday) and minutes since midnight for `date` in `timeZone`. */
export function localClock(date: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function slotMinute(slot: ScheduleSlot): number {
  const [h, m] = slot.start.split(":").map(Number);
  return slot.weekday * 24 * 60 + (h ?? 0) * 60 + (m ?? 0);
}

export type NextSession = { slot: ScheduleSlot; startsAt: Date; inProgress: boolean; minutesUntil: number };

/**
 * The session happening now (until it ends) or the next one to start.
 * `joinWindowMinutes` treats a session as "now" shortly before it starts, for the Join Meet button.
 */
export function nextSession(slots: ScheduleSlot[], now: Date, timeZone = "Africa/Cairo"): NextSession | null {
  if (slots.length === 0) return null;
  const clock = localClock(now, timeZone);
  const nowMinute = clock.weekday * 24 * 60 + clock.minutes;

  let best: NextSession | null = null;
  for (const slot of slots) {
    const start = slotMinute(slot);
    let delta = (start - nowMinute + WEEK_MINUTES) % WEEK_MINUTES; // minutes until the next start
    const sinceStart = (nowMinute - start + WEEK_MINUTES) % WEEK_MINUTES;
    const inProgress = sinceStart < slot.minutes;
    if (inProgress) delta = -sinceStart;
    const candidate: NextSession = {
      slot,
      startsAt: new Date(now.getTime() + delta * 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds())),
      inProgress,
      minutesUntil: delta,
    };
    if (!best || candidate.minutesUntil < best.minutesUntil) best = candidate;
  }
  return best;
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - date.getTime()) / 60000;
}

/** The UTC instant at which the wall clock in `timeZone` reads y-m-d h:mi (handles daylight saving). */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const once = guess - tzOffsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess - tzOffsetMinutes(new Date(once), timeZone) * 60000);
}

/** Sessions the weekly `slots` produce on the calendar day (in `timeZone`) that contains `date`. */
export function sessionsOn(slots: ScheduleSlot[], date: Date, timeZone = "Africa/Cairo"): { startsAt: Date; endsAt: Date }[] {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const weekday = localClock(date, timeZone).weekday;
  return slots
    .filter((s) => s.weekday === weekday)
    .map((s) => {
      const [h, mi] = s.start.split(":").map(Number);
      const startsAt = zonedToUtc(y, m, d, h ?? 0, mi ?? 0, timeZone);
      return { startsAt, endsAt: new Date(startsAt.getTime() + s.minutes * 60000) };
    });
}

/** Show "Join Meet" from 15 minutes before the start until the end. */
export function canJoinNow(session: NextSession | null): boolean {
  return Boolean(session && (session.inProgress || session.minutesUntil <= 15));
}
