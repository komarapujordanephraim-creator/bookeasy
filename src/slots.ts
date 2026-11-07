import { Hours, Service } from "./data";

export type Booking = {
  id: string;
  serviceId: string;
  start: string; // ISO timestamp
  minutes: number;
  name: string;
  phone: string;
  status: "booked" | "cancelled";
};

const MIN = 60 * 1000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function nextDays(now: Date, count: number): Date[] {
  const first = startOfDay(now);
  return Array.from({ length: count }, (_, i) =>
    new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)
  );
}

function overlaps(aStart: number, aMin: number, bStart: number, bMin: number): boolean {
  return aStart < bStart + bMin * MIN && bStart < aStart + aMin * MIN;
}

/** Why a slot cannot be booked, or null if it can. Used both to build the slot
 * list and again at confirm time, because the list may be stale by then. */
export function slotProblem(
  start: Date,
  service: Service,
  bookings: Booking[],
  now: Date,
  hours: Hours
): string | null {
  if (hours.closedWeekdays.includes(start.getDay())) return "Closed on this day.";
  const day = startOfDay(start).getTime();
  const open = day + hours.openMinute * MIN;
  const close = day + hours.closeMinute * MIN;
  const t = start.getTime();
  if (t < open || t + service.minutes * MIN > close) return "Outside opening hours.";
  if (t < now.getTime() + hours.leadMinutes * MIN) return "Too soon. Please pick a later time.";
  const clash = bookings.some(
    (b) => b.status === "booked" && overlaps(t, service.minutes, Date.parse(b.start), b.minutes)
  );
  if (clash) return "This time was just taken.";
  return null;
}

export function availableSlots(
  day: Date,
  service: Service,
  bookings: Booking[],
  now: Date,
  hours: Hours
): Date[] {
  const base = startOfDay(day);
  const out: Date[] = [];
  for (let m = hours.openMinute; m + service.minutes <= hours.closeMinute; m += hours.stepMinutes) {
    const s = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, m);
    if (slotProblem(s, service, bookings, now, hours) === null) out.push(s);
  }
  return out;
}

export function canCancel(b: Booking, now: Date, hours: Hours): boolean {
  return b.status === "booked" && Date.parse(b.start) - now.getTime() >= hours.cancelHours * 60 * MIN;
}

export function validateContact(name: string, phone: string): string | null {
  const n = name.trim();
  if (n.length < 2 || n.length > 60) return "Enter your name (2 to 60 characters).";
  const digits = phone.replace(/[\s()+-]/g, "");
  if (!/^\d{7,15}$/.test(digits)) return "Enter a valid phone number (7 to 15 digits).";
  return null;
}

export function upcoming(bookings: Booking[], now: Date): Booking[] {
  return bookings
    .filter((b) => Date.parse(b.start) + b.minutes * MIN > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
