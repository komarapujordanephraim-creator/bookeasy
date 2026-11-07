import { HOURS, SERVICES } from "../src/data";
import { Booking, availableSlots, canCancel, nextDays, slotProblem, upcoming, validateContact } from "../src/slots";

const consult = SERVICES.find((s) => s.id === "consult")!; // 30 min
const checkup = SERVICES.find((s) => s.id === "checkup")!; // 60 min
// Monday 2 March 2026, 08:00 local time
const MON_8AM = new Date(2026, 2, 2, 8, 0);
const at = (h: number, m = 0, day = 2) => new Date(2026, 2, day, h, m);

function booking(start: Date, minutes: number, status: Booking["status"] = "booked"): Booking {
  return { id: start.toISOString(), serviceId: "x", start: start.toISOString(), minutes, name: "A", phone: "1234567", status };
}

describe("availableSlots", () => {
  test("covers opening hours in 30 minute steps and ends before closing", () => {
    const slots = availableSlots(at(0), consult, [], MON_8AM, HOURS);
    expect(slots[0]).toEqual(at(9, 0));
    expect(slots[slots.length - 1]).toEqual(at(16, 30));
    expect(slots).toHaveLength(16);
  });

  test("a 60 minute service cannot start at 16:30", () => {
    const slots = availableSlots(at(0), checkup, [], MON_8AM, HOURS);
    expect(slots[slots.length - 1]).toEqual(at(16, 0));
  });

  test("no slots on Sunday", () => {
    expect(availableSlots(new Date(2026, 2, 1), consult, [], new Date(2026, 1, 28), HOURS)).toEqual([]);
  });

  test("respects the one hour lead time", () => {
    const now = at(10, 10);
    const slots = availableSlots(at(0), consult, [], now, HOURS);
    expect(slots[0]).toEqual(at(11, 30));
  });

  test("hides times that overlap an existing booking", () => {
    const taken = [booking(at(10, 0), 60)];
    const times = availableSlots(at(0), consult, taken, MON_8AM, HOURS).map((d) => d.getHours() * 60 + d.getMinutes());
    expect(times).not.toContain(10 * 60);
    expect(times).not.toContain(10 * 60 + 30);
    expect(times).toContain(11 * 60);
    expect(times).toContain(9 * 60 + 30); // ends exactly when the other starts
  });

  test("a longer service cannot run into a later booking", () => {
    const taken = [booking(at(11, 0), 30)];
    const times = availableSlots(at(0), checkup, taken, MON_8AM, HOURS).map((d) => d.getHours() * 60 + d.getMinutes());
    expect(times).not.toContain(10 * 60 + 30);
    expect(times).toContain(10 * 60);
  });

  test("cancelled bookings free the time again", () => {
    const taken = [booking(at(10, 0), 60, "cancelled")];
    expect(availableSlots(at(0), consult, taken, MON_8AM, HOURS)).toContainEqual(at(10, 0));
  });
});

describe("slotProblem at confirm time", () => {
  test("detects a slot taken after the list was shown", () => {
    expect(slotProblem(at(10), consult, [booking(at(10), 30)], MON_8AM, HOURS)).toMatch(/taken/);
  });
  test("rejects past and off-hours times", () => {
    expect(slotProblem(at(8, 30), consult, [], new Date(2026, 2, 1), HOURS)).toMatch(/hours/);
    expect(slotProblem(at(9), consult, [], at(9, 30), HOURS)).toMatch(/soon/);
  });
});

describe("cancellation rule", () => {
  test("allowed 2 hours or more before, not later", () => {
    const b = booking(at(12), 30);
    expect(canCancel(b, at(10, 0), HOURS)).toBe(true);
    expect(canCancel(b, at(10, 1), HOURS)).toBe(false);
    expect(canCancel({ ...b, status: "cancelled" }, at(8), HOURS)).toBe(false);
  });
});

describe("contact validation", () => {
  test("name and phone", () => {
    expect(validateContact("A", "9876543210")).toMatch(/name/);
    expect(validateContact("Asha", "12ab")).toMatch(/phone/);
    expect(validateContact("Asha", "+91 98765 43210")).toBeNull();
  });
});

describe("helpers", () => {
  test("nextDays returns consecutive midnights", () => {
    const d = nextDays(at(15, 45), 3);
    expect(d).toEqual([at(0), at(0, 0, 3), at(0, 0, 4)]);
  });
  test("upcoming hides finished bookings and sorts by time", () => {
    const list = [booking(at(14), 30), booking(at(9), 30), booking(at(11), 30)];
    expect(upcoming(list, at(10)).map((b) => new Date(b.start).getHours())).toEqual([11, 14]);
  });
});
