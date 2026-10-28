import React, { useMemo } from 'react';

const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Spec §15: calendario anual real debajo de la Gran Meta Anual vigente. */
export default function AnnualCalendar({ year }: { year?: number }) {
  const y = year ?? new Date().getFullYear();
  const now = new Date();
  const isCurrentYear = now.getFullYear() === y;
  const currentMonth = now.getMonth();
  const today = now.getDate();

  const months = useMemo(() => {
    return MONTH_NAMES.map((name, m) => {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      // Lunes primero (ES): (getDay()+6)%7
      const firstOffset = (new Date(y, m, 1).getDay() + 6) % 7;
      const cells: (number | null)[] = [
        ...Array<null>(firstOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, d) => d + 1),
      ];
      return { name, cells };
    });
  }, [y]);

  return (
    <div>
      <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{y}</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {months.map((mo, mi) => {
          const isCurrent = isCurrentYear && mi === currentMonth;
          return (
            <div key={mo.name} className="rounded-2xl overflow-hidden bg-white shadow-lg">
              <div className="bg-[#14144a] px-4 py-2.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-cyan-300' : 'bg-[#3b3bd4]'}`} />
                <h3 className="flex-1 text-center text-white font-extrabold tracking-widest text-sm">{mo.name}</h3>
                <span className="w-2" />
              </div>
              <div className="p-3">
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-500 mb-1">
                  {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 text-center text-[12px] text-gray-800">
                  {mo.cells.map((day, i) => (
                    <span
                      key={i}
                      className={`py-[3px] rounded-full ${
                        day == null
                          ? ''
                          : isCurrent && day === today
                          ? 'bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white font-bold'
                          : ''
                      }`}
                    >
                      {day ?? ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
