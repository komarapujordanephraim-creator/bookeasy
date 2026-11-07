import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadBookings, saveBookings } from "../src/storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const good = { id: "1", serviceId: "consult", start: new Date(2026, 2, 2, 10).toISOString(), minutes: 30, name: "Asha", phone: "9876543210", status: "booked" as const };

beforeEach(() => AsyncStorage.clear());

test("round trip", async () => {
  await saveBookings([good]);
  expect(await loadBookings()).toEqual([good]);
});

test("empty storage gives an empty list", async () => {
  expect(await loadBookings()).toEqual([]);
});

test("corrupt JSON does not crash the app", async () => {
  await AsyncStorage.setItem("bookeasy.bookings.v1", "{not json");
  expect(await loadBookings()).toEqual([]);
});

test("invalid entries are dropped", async () => {
  await AsyncStorage.setItem("bookeasy.bookings.v1", JSON.stringify([good, { id: 2 }, { ...good, id: "3", start: "nope" }]));
  expect(await loadBookings()).toEqual([good]);
});
