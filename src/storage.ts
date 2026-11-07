import AsyncStorage from "@react-native-async-storage/async-storage";
import { Booking } from "./slots";

const KEY = "bookeasy.bookings.v1";

function isBooking(x: any): x is Booking {
  return (
    x && typeof x.id === "string" && typeof x.serviceId === "string" &&
    typeof x.start === "string" && !Number.isNaN(Date.parse(x.start)) &&
    typeof x.minutes === "number" && typeof x.name === "string" &&
    typeof x.phone === "string" && (x.status === "booked" || x.status === "cancelled")
  );
}

/** Load saved bookings. Corrupt or unexpected data is ignored instead of crashing the app. */
export async function loadBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isBooking) : [];
  } catch {
    return [];
  }
}

export async function saveBookings(list: Booking[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}
