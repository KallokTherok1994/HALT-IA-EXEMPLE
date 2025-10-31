export const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const getWeekId = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getWeekDateRange = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay(); // Sunday - Saturday : 0 - 6
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const mondayStr = monday.toLocaleDateString('fr-FR', options);
    const sundayStr = sunday.toLocaleDateString('fr-FR', options);
    
    if (monday.getFullYear() !== sunday.getFullYear()) {
         return `du ${monday.toLocaleDateString('fr-FR', {...options, year: 'numeric'})} au ${sunday.toLocaleDateString('fr-FR', {...options, year: 'numeric'})}`;
    }

    return `du ${mondayStr} au ${sundayStr}`;
};

export const getWeekDates = (date: Date): Date[] => {
    const d = new Date(date);
    const day = d.getDay(); // Sunday - Saturday : 0 - 6
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diffToMonday));
    
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const weekDay = new Date(monday);
        weekDay.setDate(monday.getDate() + i);
        weekDates.push(weekDay);
    }
    return weekDates;
};

export const getWeekBoundaryDates = (date: Date): { startOfWeek: Date, endOfWeek: Date } => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize to start of the day
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(d.setDate(diffToMonday));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // Set to end of the day for inclusive filtering
    
    return { startOfWeek, endOfWeek };
};

export const getMonthId = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const getMonthName = (monthId: string): string => {
    const [year, month] = monthId.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

export const navigateMonth = (monthId: string, direction: 'prev' | 'next'): string => {
    const [year, month] = monthId.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    if (direction === 'prev') {
        date.setMonth(date.getMonth() - 1);
    } else {
        date.setMonth(date.getMonth() + 1);
    }
    return getMonthId(date);
};

export const getTimeOfDay = (): 'matin' | 'après-midi' | 'soir' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'matin';
    if (hour < 18) return 'après-midi';
    return 'soir';
};