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

/** Show "Join Meet" from 15 minutes before the start until the end. */
export function canJoinNow(session: NextSession | null): boolean {
  return Boolean(session && (session.inProgress || session.minutesUntil <= 15));
}
