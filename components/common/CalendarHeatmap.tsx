import React from 'react';

interface HeatmapProps {
    data: { [date: string]: number }; // YYYY-MM-DD -> value
    colorScale: [string, string, string, string]; // [level-0, level-1, level-2, level-3]
    label: string;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const CalendarHeatmap: React.FC<HeatmapProps> = ({ data, colorScale, label }) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
    const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0=Mon, 6=Sun

    const cells = Array.from({ length: startingDayOffset + daysInMonth });

    const getIntensityColor = (value: number | undefined): string => {
        if (!value || value <= 0) return colorScale[0];
        if (value === 1) return colorScale[1];
        if (value <= 3) return colorScale[2];
        return colorScale[3];
    };

    const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <div className="heatmap-container">
            <h4>{label} - {monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h4>
            <div className="heatmap-grid">
                {weekDays.map(day => <div key={day} className="heatmap-weekday">{day}</div>)}
                {cells.map((_, index) => {
                    if (index < startingDayOffset) {
                        return <div key={`pad-${index}`} className="heatmap-cell empty"></div>;
                    }
                    const day = index - startingDayOffset + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const value = data[dateStr];
                    const color = getIntensityColor(value);
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                    return (
                        <div 
                            key={dateStr}
                            className={`heatmap-cell ${isToday ? 'today' : ''}`}
                            style={{ backgroundColor: color }}
                            title={`${new Date(dateStr + "T00:00:00").toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}: ${value || 0} activité(s)`}
                        ></div>
                    );
                })}
            </div>
        </div>
    );
};