import { useEffect, useMemo, useState } from "react";
import { availabilityResultSchema, type AvailabilityDay } from "@/lib/validation/availability";
import styles from "./BookingCalendar.module.css";
import navStyles from "./CalendarNavigation.module.css";
import { Arrow } from "@/components/brand/Arrow";

type BookingCalendarProps = {
  serviceSlug: string;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

const monthFormatter = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_MONTH_OFFSET = 2;

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The six-week grid a month is drawn on, starting Monday. */
function getCalendarGrid(monthOffset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, iso: toIsoDate(date), inMonth: date.getMonth() === first.getMonth() };
  });
  return { days, month: first, from: days[0].iso, to: days[41].iso };
}

export function BookingCalendar({ serviceSlug, selectedDate, selectedTime, onDateChange, onTimeChange }: BookingCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [availability, setAvailability] = useState<Record<string, AvailabilityDay>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  const grid = useMemo(() => getCalendarGrid(monthOffset), [monthOffset]);

  // Availability is a fact about the business, so it is fetched rather than guessed.
  useEffect(() => {
    if (!serviceSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/availability?service=${encodeURIComponent(serviceSlug)}&from=${grid.from}&to=${grid.to}`);
        if (!response.ok) throw new Error("availability");
        const parsed = availabilityResultSchema.safeParse(await response.json());
        if (cancelled) return;
        if (!parsed.success) throw new Error("shape");
        setAvailability(Object.fromEntries(parsed.data.days.map((day) => [day.date, day])));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [serviceSlug, grid.from, grid.to, attempt]);

  const selectedDay = selectedDate ? availability[selectedDate] : undefined;
  const selectedDateObject = grid.days.find((day) => day.iso === selectedDate)?.date
    ?? (selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined);

  return <div className={styles.bookingPicker}>
    <div className={styles.calendarPanel}>
      <div className={styles.calendarHeader}>
        <div><span>Choose a day</span><h3>{monthFormatter.format(grid.month)}</h3></div>
        <div className={navStyles.monthControls}>
          <button type="button" aria-label="Previous month" disabled={monthOffset === 0} onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}><Arrow direction="left" /></button>
          <button type="button" aria-label="Next month" disabled={monthOffset === MAX_MONTH_OFFSET} onClick={() => setMonthOffset((value) => Math.min(MAX_MONTH_OFFSET, value + 1))}><Arrow /></button>
        </div>
        <div className={styles.legend}><i /> Available</div>
      </div>

      {status === "error" ? <div className={styles.calendarMessage} role="alert">
        <p>We couldn’t load available dates.</p>
        <button type="button" onClick={() => { setStatus("loading"); setAttempt((n) => n + 1); }}>Try again</button>
      </div> : null}

      <div className={styles.weekdays}>{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className={styles.calendarGrid} aria-busy={status === "loading"}>{grid.days.map((day) => {
        const info = availability[day.iso];
        const open = day.inMonth && (info?.openCount ?? 0) > 0;
        return <button
          type="button" key={day.iso} disabled={!open}
          aria-label={open ? `Select ${dateFormatter.format(day.date)}, ${info?.openCount} slots available` : undefined}
          aria-pressed={selectedDate === day.iso}
          className={`${!day.inMonth ? styles.outside : ""} ${selectedDate === day.iso ? styles.selected : ""}`}
          onClick={() => { onDateChange(day.iso); onTimeChange(""); }}
        >
          <span>{day.date.getDate()}</span>
          {open ? <small>{info!.openCount === 1 ? "1 slot" : `${info!.openCount} slots`}</small> : null}
        </button>;
      })}</div>
    </div>

    <div className={styles.timePanel}>
      <span>Available times</span>
      <h3>{selectedDateObject ? dateFormatter.format(selectedDateObject) : "Select a date"}</h3>
      {selectedDay ? <div className={styles.timeSlots}>{selectedDay.slots.map((slot) => <button
        type="button" key={slot.time} disabled={!slot.available} aria-pressed={selectedTime === slot.time}
        className={selectedTime === slot.time ? styles.timeSelected : ""}
        onClick={() => onTimeChange(slot.time)}
      >
        <strong>{slot.time}</strong>
        <small>{slot.available ? slot.label : slot.reason === "Booked" ? "Already booked" : slot.reason === "Closed" ? "Closed" : slot.reason === "Past" ? "Passed" : "Unavailable"}</small>
      </button>)}</div> : <p>{status === "loading" ? "Checking availability…" : "Pick an available date to see appointment times."}</p>}

      <div className={styles.capacityNote}><span>i</span><p><strong>Live availability</strong>Times reflect our working hours and existing bookings. Your slot is reserved when the booking is created.</p></div>
    </div>
  </div>;
}
