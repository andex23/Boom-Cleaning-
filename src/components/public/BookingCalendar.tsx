import { useMemo, useState } from "react";
import styles from "./BookingCalendar.module.css";
import navStyles from "./CalendarNavigation.module.css";

type BookingCalendarProps = {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

const monthFormatter = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeSlots = ["08:00", "10:30", "13:00", "15:30"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(monthOffset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isPast = date <= today;
    const isSunday = date.getDay() === 0;
    const inMonth = date.getMonth() === first.getMonth();
    const scarce = date.getDate() % 5 === 0;
    return { date, iso: toIsoDate(date), available: inMonth && !isPast && !isSunday, inMonth, scarce };
  });
}

export function BookingCalendar({ selectedDate, selectedTime, onDateChange, onTimeChange }: BookingCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const calendarDays = useMemo(() => getCalendarDays(monthOffset), [monthOffset]);
  const currentMonth = calendarDays.find((day) => day.inMonth)?.date ?? new Date();
  const selected = calendarDays.find((day) => day.iso === selectedDate);

  return <div className={styles.bookingPicker}>
    <div className={styles.calendarPanel}>
      <div className={styles.calendarHeader}><div><span>Choose a day</span><h3>{monthFormatter.format(currentMonth)}</h3></div><div className={navStyles.monthControls}><button type="button" aria-label="Previous month" disabled={monthOffset === 0} onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}>←</button><button type="button" aria-label="Next month" disabled={monthOffset === 2} onClick={() => setMonthOffset((value) => Math.min(2, value + 1))}>→</button></div><div className={styles.legend}><i /> Available</div></div>
      <div className={styles.weekdays}>{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className={styles.calendarGrid}>{calendarDays.map((day) => <button type="button" key={day.iso} disabled={!day.available} aria-label={day.available ? `Select ${dateFormatter.format(day.date)}` : undefined} aria-pressed={selectedDate === day.iso} className={`${!day.inMonth ? styles.outside : ""} ${selectedDate === day.iso ? styles.selected : ""}`} onClick={() => { onDateChange(day.iso); onTimeChange(""); }}><span>{day.date.getDate()}</span>{day.available ? <small>{day.scarce ? "Limited" : "Demo"}</small> : null}</button>)}</div>
    </div>

    <div className={styles.timePanel}>
      <span>Available times</span>
      <h3>{selected ? dateFormatter.format(selected.date) : "Select a date"}</h3>
      {selected ? <div className={styles.timeSlots}>{timeSlots.map((time, index) => {
        const unavailable = selected.date.getDate() % 3 === index;
        return <button type="button" key={time} disabled={unavailable} aria-pressed={selectedTime === time} className={selectedTime === time ? styles.timeSelected : ""} onClick={() => onTimeChange(time)}><strong>{time}</strong><small>{unavailable ? "Unavailable" : index < 2 ? "Morning" : "Afternoon"}</small></button>;
      })}</div> : <p>Pick an available date to see appointment times.</p>}
      <div className={styles.capacityNote}><span>i</span><p><strong>Demo availability</strong>Slots are illustrative and are not held while you complete this flow.</p></div>
    </div>
  </div>;
}
