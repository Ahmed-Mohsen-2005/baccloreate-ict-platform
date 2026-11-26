import { describe, expect, it } from "vitest";
import { canJoinNow, localClock, nextSession } from "@/lib/schedule";
import { parseSchedule } from "@/lib/db/domain";

// 2026-11-28 is a Saturday. Cairo is UTC+2 in November.
const SAT_1500_CAIRO = new Date("2026-11-28T13:00:00Z");

describe("localClock", () => {
  it("reads weekday and minutes in Cairo time", () => {
    expect(localClock(SAT_1500_CAIRO, "Africa/Cairo")).toEqual({ weekday: 6, minutes: 15 * 60 });
  });
});

describe("nextSession", () => {
  const slots = [
    { weekday: 6, start: "16:00", minutes: 90 }, // Saturday 4pm
    { weekday: 2, start: "18:30", minutes: 60 }, // Tuesday 6:30pm
  ];

  it("finds the next session later the same day", () => {
    const s = nextSession(slots, SAT_1500_CAIRO);
    expect(s?.slot.weekday).toBe(6);
    expect(s?.minutesUntil).toBe(60);
    expect(s?.inProgress).toBe(false);
    expect(s?.startsAt.toISOString()).toBe("2026-11-28T14:00:00.000Z");
  });

  it("reports a session in progress", () => {
    const s = nextSession(slots, new Date("2026-11-28T14:30:00Z")); // Sat 16:30 Cairo
    expect(s?.inProgress).toBe(true);
    expect(s?.slot.start).toBe("16:00");
  });

  it("wraps to next week's first slot after the last one ends", () => {
    const s = nextSession(slots, new Date("2026-11-28T16:00:00Z")); // Sat 18:00, after 17:30 end
    expect(s?.slot.weekday).toBe(2);
    expect(s?.startsAt.toISOString()).toBe("2026-12-01T16:30:00.000Z"); // Tue 18:30 Cairo
  });

  it("returns null with no slots", () => {
    expect(nextSession([], SAT_1500_CAIRO)).toBeNull();
  });

  it("opens the join button 15 minutes early and while running", () => {
    expect(canJoinNow(nextSession(slots, new Date("2026-11-28T13:50:00Z")))).toBe(true); // 10 min before
    expect(canJoinNow(nextSession(slots, new Date("2026-11-28T13:30:00Z")))).toBe(false); // 30 min before
    expect(canJoinNow(nextSession(slots, new Date("2026-11-28T15:00:00Z")))).toBe(true); // in progress
  });
});

describe("parseSchedule", () => {
  it("keeps only valid slots", () => {
    expect(
      parseSchedule([
        { weekday: 6, start: "16:00", minutes: 90 },
        { weekday: 7, start: "16:00", minutes: 90 },
        { weekday: 1, start: "25:00", minutes: 90 },
        { weekday: 1, start: "10:00", minutes: 5 },
        "junk",
      ]),
    ).toEqual([{ weekday: 6, start: "16:00", minutes: 90 }]);
    expect(parseSchedule(null)).toEqual([]);
  });
});
