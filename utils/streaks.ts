/**
 * Calculates the current and longest streaks from a list of dates.
 * @param dates An array of date strings in 'YYYY-MM-DD' format.
 * @returns An object with the current and longest streaks in days.
 */
export const calculateStreaks = (dates: string[]): { currentStreak: number; longestStreak: number } => {
    if (dates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    // Ensure unique dates and sort them
    const sortedDates = [...new Set(dates)].sort();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let localStreak = 0;

    // Calculate longest streak
    for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i] + 'T00:00:00');
        currentDate.setHours(0,0,0,0);
        
        if (i > 0) {
            const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
            prevDate.setHours(0,0,0,0);
            
            const diffTime = currentDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                localStreak++;
            } else {
                localStreak = 1;
            }
        } else {
            localStreak = 1;
        }

        if (localStreak > longestStreak) {
            longestStreak = localStreak;
        }
    }
    
    // Calculate current streak
    localStreak = 0;
    const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
    lastDate.setHours(0,0,0,0);

    const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffFromToday <= 1) { // Activity today or yesterday counts for current streak
        localStreak = 1;
        for (let i = sortedDates.length - 1; i > 0; i--) {
            const currentDate = new Date(sortedDates[i] + 'T00:00:00');
            const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
            currentDate.setHours(0,0,0,0);
            prevDate.setHours(0,0,0,0);

            const diffTime = currentDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                localStreak++;
            } else {
                break;
            }
        }
        currentStreak = localStreak;
    }

    return { currentStreak, longestStreak };
};