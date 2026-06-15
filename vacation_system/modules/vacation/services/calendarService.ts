const FIXED_COSTA_RICA_HOLIDAYS = [
  { month: 1, day: 1, name: "Año Nuevo" },
  { month: 4, day: 11, name: "Día de Juan Santamaría" },
  { month: 5, day: 1, name: "Día del Trabajo" },
  { month: 7, day: 25, name: "Anexión del Partido de Nicoya" },
  { month: 8, day: 2, name: "Día de la Virgen de los Ángeles" },
  { month: 8, day: 15, name: "Día de la Madre" },
  { month: 9, day: 15, name: "Día de la Independencia" },
  { month: 12, day: 1, name: "Día de la Abolición del Ejército" },
  { month: 12, day: 25, name: "Navidad" },
] as const;

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEasterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getCostaRicaHolidayKeys(year: number) {
  const holidays = new Set(
    FIXED_COSTA_RICA_HOLIDAYS.map(({ month, day }) =>
      getDateKey(new Date(year, month - 1, day))
    )
  );

  const easterSunday = getEasterSunday(year);
  holidays.add(getDateKey(addDays(easterSunday, -3)));
  holidays.add(getDateKey(addDays(easterSunday, -2)));

  // The Day of the Black Person and Afro-Costa Rican Culture is intentionally
  // not counted here until UCR confirms whether it should affect vacation days.
  // Future UCR-specific institutional closures can be added in this service.

  return holidays;
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isCostaRicaHoliday(date: Date) {
  return getCostaRicaHolidayKeys(date.getFullYear()).has(getDateKey(date));
}

export function calcularDiasHabiles(inicio: Date, fin: Date): number {
  if (fin < inicio) return 0;

  let count = 0;
  const current = new Date(inicio);
  current.setHours(0, 0, 0, 0);
  const end = new Date(fin);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current) && !isCostaRicaHoliday(current)) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}
