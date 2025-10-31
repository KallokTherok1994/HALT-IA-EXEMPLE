import { useState, useCallback, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getTodayDateString } from '../utils/dateHelpers';
import { JournalEntry, JOURNAL_STORAGE_KEY, LAST_CHECKIN_DATE_KEY } from '../types';

interface DailyCheckinHook {
    needsCheckin: boolean;
    completeCheckin: (entry: Partial<JournalEntry>) => void;
    dismissCheckin: () => void;
}

export const useDailyCheckin = (): DailyCheckinHook => {
    const [needsCheckin, setNeedsCheckin] = useState(() => {
        const lastCheckinDate = storage.get<string | null>(LAST_CHECKIN_DATE_KEY, null);
        const todayStr = getTodayDateString();
        const dismissedToday = sessionStorage.getItem('dailyCheckinDismissed') === todayStr;
        return lastCheckinDate !== todayStr && !dismissedToday;
    });

    const completeCheckin = useCallback((entry: Partial<JournalEntry>) => {
        const todayStr = getTodayDateString();
        const fullEntry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            title: entry.title || `Bilan du ${new Date().toLocaleDateString('fr-FR')}`,
            content: entry.content || "Bilan rapide de la journée.",
            mood: entry.mood,
        };

        const allEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        storage.set(JOURNAL_STORAGE_KEY, [fullEntry, ...allEntries]);
        storage.set(LAST_CHECKIN_DATE_KEY, todayStr);
        setNeedsCheckin(false);
    }, []);

    const dismissCheckin = useCallback(() => {
        const todayStr = getTodayDateString();
        sessionStorage.setItem('dailyCheckinDismissed', todayStr);
        setNeedsCheckin(false);
    }, []);

    return { needsCheckin, completeCheckin, dismissCheckin };
};
