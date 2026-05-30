import React, { useMemo } from 'react';

const HeatmapCalendar = ({ data = [] }) => {
  // data should be [{ date: '2023-01-01', pnl: 500 }, ...]
  
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = data.find(item => item.date === dateStr);
      result.push({
        date: dateStr,
        pnl: match ? match.pnl : 0
      });
    }
    return result;
  }, [data]);

  const getColor = (pnl) => {
    if (pnl === 0) return 'bg-slate-800 dark:bg-slate-800/50';
    if (pnl > 0 && pnl < 500) return 'bg-cyan/40';
    if (pnl >= 500) return 'bg-cyan';
    if (pnl < 0 && pnl > -500) return 'bg-red-500/40';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1">
        <div className="grid grid-cols-[repeat(13,1fr)] grid-flow-col gap-1 auto-cols-max">
          {days.map((day, idx) => (
            <div
              key={idx}
              title={`${day.date}: ₹${day.pnl}`}
              className={`w-3 h-3 rounded-[2px] ${getColor(day.pnl)} transition-colors cursor-pointer hover:border hover:border-white`}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
        <span>3 Months Ago</span>
        <div className="flex items-center gap-1">
          <span>Loss</span>
          <div className="w-2 h-2 rounded-[2px] bg-red-500"></div>
          <div className="w-2 h-2 rounded-[2px] bg-red-500/40"></div>
          <div className="w-2 h-2 rounded-[2px] bg-slate-800"></div>
          <div className="w-2 h-2 rounded-[2px] bg-cyan/40"></div>
          <div className="w-2 h-2 rounded-[2px] bg-cyan"></div>
          <span>Profit</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;