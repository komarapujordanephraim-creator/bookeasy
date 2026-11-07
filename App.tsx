import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { HOURS, SERVICES, Service } from "./src/data";
import {
  Booking, availableSlots, canCancel, nextDays, slotProblem, upcoming, validateContact,
} from "./src/slots";
import { loadBookings, saveBookings } from "./src/storage";

type Tab = "book" | "mine";
type Step = "service" | "time" | "details" | "done";

const C = { bg: "#f6f7fb", card: "#fff", tx: "#16181d", mu: "#667085", line: "#e4e7ec", pri: "#2f6fed", bad: "#c0362c", ok: "#12805c" };

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const serviceOf = (id: string) => SERVICES.find((s) => s.id === id);

export default function App() {
  const [tab, setTab] = useState<Tab>("book");
  const [step, setStep] = useState<Step>("service");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [day, setDay] = useState<Date>(new Date());
  const [slot, setSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => { loadBookings().then(setBookings); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const days = useMemo(() => nextDays(now, 7), [now]);
  const slots = useMemo(
    () => (service ? availableSlots(day, service, bookings, now, HOURS) : []),
    [service, day, bookings, now]
  );

  async function persist(list: Booking[]) {
    setBookings(list);
    await saveBookings(list);
  }

  async function confirm() {
    if (!service || !slot) return;
    const contactProblem = validateContact(name, phone);
    if (contactProblem) return setError(contactProblem);
    // Re-check the slot at confirm time: the screen may have been open for a while.
    const problem = slotProblem(slot, service, bookings, new Date(), HOURS);
    if (problem) { setError(problem); setStep("time"); return; }
    const b: Booking = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      serviceId: service.id, start: slot.toISOString(), minutes: service.minutes,
      name: name.trim(), phone: phone.trim(), status: "booked",
    };
    await persist([...bookings, b]);
    setError(null);
    setStep("done");
  }

  async function cancel(id: string) {
    const target = bookings.find((b) => b.id === id);
    if (!target || !canCancel(target, new Date(), HOURS)) return;
    await persist(bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
  }

  function restart() {
    setService(null); setSlot(null); setError(null); setStep("service");
  }

  const mine = upcoming(bookings, now);

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={s.header}><Text style={s.brand}>BookEasy</Text><Text style={s.sub}>Book an appointment</Text></View>

      <ScrollView contentContainerStyle={s.body}>
        {error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}

        {tab === "book" && step === "service" && (
          <>
            <Text style={s.h1}>Choose a service</Text>
            {SERVICES.map((sv) => (
              <Pressable key={sv.id} style={s.card} accessibilityRole="button"
                onPress={() => { setService(sv); setDay(days[0]); setSlot(null); setError(null); setStep("time"); }}>
                <Text style={s.title}>{sv.name}</Text>
                <Text style={s.muted}>{sv.minutes} min · ${sv.price}</Text>
              </Pressable>
            ))}
          </>
        )}

        {tab === "book" && step === "time" && service && (
          <>
            <Text style={s.h1}>{service.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {days.map((d) => {
                const on = d.getTime() === day.getTime();
                return (
                  <Pressable key={d.toISOString()} onPress={() => { setDay(d); setSlot(null); }}
                    style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[s.chipTx, on && s.chipTxOn]}>{fmtDay(d)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {slots.length === 0 ? (
              <Text style={s.muted}>No free times on this day. Try another day.</Text>
            ) : (
              <View style={s.grid}>
                {slots.map((t) => {
                  const on = slot?.getTime() === t.getTime();
                  return (
                    <Pressable key={t.toISOString()} onPress={() => setSlot(t)}
                      style={[s.slot, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[s.chipTx, on && s.chipTxOn]}>{fmtTime(t)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={s.row}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={restart}><Text style={s.btnGhostTx}>Back</Text></Pressable>
              <Pressable style={[s.btn, !slot && s.btnOff]} disabled={!slot} onPress={() => { setError(null); setStep("details"); }}>
                <Text style={s.btnTx}>Continue</Text>
              </Pressable>
            </View>
          </>
        )}

        {tab === "book" && step === "details" && service && slot && (
          <>
            <Text style={s.h1}>Your details</Text>
            <View style={s.card}>
              <Text style={s.title}>{service.name}</Text>
              <Text style={s.muted}>{fmtDay(slot)} at {fmtTime(slot)} · {service.minutes} min · ${service.price}</Text>
            </View>
            <Text style={s.label}>Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
            <Text style={s.label}>Phone</Text>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" autoComplete="tel" />
            <Text style={s.muted}>Free cancellation up to {HOURS.cancelHours} hours before. Payment at the visit.</Text>
            <View style={s.row}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={() => setStep("time")}><Text style={s.btnGhostTx}>Back</Text></Pressable>
              <Pressable style={s.btn} onPress={confirm}><Text style={s.btnTx}>Confirm booking</Text></Pressable>
            </View>
          </>
        )}

        {tab === "book" && step === "done" && service && slot && (
          <View style={s.card}>
            <Text style={[s.h1, { color: C.ok }]}>Booked</Text>
            <Text style={s.title}>{service.name}</Text>
            <Text style={s.muted}>{fmtDay(slot)} at {fmtTime(slot)}</Text>
            <View style={s.row}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={() => { restart(); setTab("mine"); }}><Text style={s.btnGhostTx}>My bookings</Text></Pressable>
              <Pressable style={s.btn} onPress={restart}><Text style={s.btnTx}>Book another</Text></Pressable>
            </View>
          </View>
        )}

        {tab === "mine" && (
          <>
            <Text style={s.h1}>My bookings</Text>
            {mine.length === 0 && <Text style={s.muted}>No upcoming bookings.</Text>}
            {mine.map((b) => {
              const start = new Date(b.start);
              const cancellable = canCancel(b, now, HOURS);
              return (
                <View key={b.id} style={[s.card, b.status === "cancelled" && { opacity: 0.55 }]}>
                  <Text style={s.title}>{serviceOf(b.serviceId)?.name ?? "Service"}</Text>
                  <Text style={s.muted}>{fmtDay(start)} at {fmtTime(start)} · {b.name}</Text>
                  {b.status === "cancelled" ? (
                    <Text style={[s.muted, { color: C.bad }]}>Cancelled</Text>
                  ) : cancellable ? (
                    <Pressable style={[s.btn, s.btnGhost, { alignSelf: "flex-start", marginTop: 8 }]} onPress={() => cancel(b.id)}>
                      <Text style={[s.btnGhostTx, { color: C.bad }]}>Cancel</Text>
                    </Pressable>
                  ) : (
                    <Text style={s.muted}>Too close to the start to cancel in the app.</Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={s.tabs}>
        {(["book", "mine"] as Tab[]).map((t) => (
          <Pressable key={t} style={s.tab} onPress={() => { setTab(t); setError(null); }} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[s.tabTx, tab === t && { color: C.pri, fontWeight: "700" }]}>{t === "book" ? "Book" : "My bookings"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: "#101828" },
  brand: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sub: { color: "#cbd2e0", fontSize: 13 },
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 20, fontWeight: "700", color: C.tx, marginBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "600", color: C.tx },
  muted: { color: C.mu, fontSize: 13, marginTop: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff", marginRight: 8 },
  chipOn: { backgroundColor: C.pri, borderColor: C.pri },
  chipTx: { color: C.tx, fontSize: 13 },
  chipTxOn: { color: "#fff", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "30%", paddingVertical: 10, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff" },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { backgroundColor: C.pri, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnTx: { color: "#fff", fontWeight: "600" },
  btnOff: { backgroundColor: "#a9b8d9" },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
  btnGhostTx: { color: C.tx, fontWeight: "600" },
  label: { fontWeight: "600", color: C.tx, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 15 },
  error: { backgroundColor: "#fdeceb", color: C.bad, padding: 12, borderRadius: 10, marginBottom: 12 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: "#fff", paddingBottom: 18 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTx: { color: C.mu, fontSize: 14 },
});
