// Generic aggregation by day (in current month), week (in current month), or year (12 months)
export type Granularity = 'day' | 'week' | 'year';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function buildSeries<T extends { date: string }>(
  records: T[],
  granularity: Granularity,
  month: number,
  year: number,
  fields: Record<string, (r: T) => number>,
): Array<Record<string, any>> {
  const fieldKeys = Object.keys(fields);
  const blankAcc = () => fieldKeys.reduce((a, k) => ({ ...a, [k]: 0 }), {} as Record<string, number>);

  if (granularity === 'day') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const acc = blankAcc();
      records.filter(r => r.date === dateStr).forEach(r => {
        for (const k of fieldKeys) acc[k] += fields[k](r);
      });
      return { label: String(day), day, date: dateStr, ...acc };
    });
  }

  if (granularity === 'week') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Record<string, any>> = [];
    for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
      const start = w * 7 + 1;
      const end = Math.min(start + 6, daysInMonth);
      const acc = blankAcc();
      records.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        if (d.getMonth() !== month || d.getFullYear() !== year) return false;
        const day = d.getDate();
        return day >= start && day <= end;
      }).forEach(r => { for (const k of fieldKeys) acc[k] += fields[k](r); });
      weeks.push({ label: `${start}-${end}`, week: `${start}-${end}`, ...acc });
    }
    return weeks;
  }

  // year: 12 months
  return MONTHS_ES.map((label, m) => {
    const acc = blankAcc();
    records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === m;
    }).forEach(r => { for (const k of fieldKeys) acc[k] += fields[k](r); });
    return { label, month: m, ...acc };
  });
}