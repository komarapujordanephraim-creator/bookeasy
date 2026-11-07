export type Service = { id: string; name: string; minutes: number; price: number };

// Fictional demo services. Prices are display-only.
export const SERVICES: Service[] = [
  { id: "consult", name: "Consultation", minutes: 30, price: 25 },
  { id: "checkup", name: "Full check-up", minutes: 60, price: 60 },
  { id: "followup", name: "Follow-up visit", minutes: 30, price: 15 },
  { id: "therapy", name: "Therapy session", minutes: 90, price: 80 },
];

export type Hours = {
  openMinute: number; // minutes after midnight
  closeMinute: number;
  stepMinutes: number;
  closedWeekdays: number[]; // 0 = Sunday
  leadMinutes: number; // earliest booking from now
  cancelHours: number; // free cancellation window
};

export const HOURS: Hours = {
  openMinute: 9 * 60,
  closeMinute: 17 * 60,
  stepMinutes: 30,
  closedWeekdays: [0],
  leadMinutes: 60,
  cancelHours: 2,
};
