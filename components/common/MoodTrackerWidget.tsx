import React, { useMemo } from 'react';
import { BarChart } from './BarChart';
import { SmileIcon } from '../../icons';
import { JournalEntry, JOURNAL_STORAGE_KEY } from '../../types';
import { moodOptions } from '../../data';
import { storage } from '../../utils/storage';

export const MoodTrackerWidget: React.FC = () => {
    const moodData = useMemo(() => {
        const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentEntries = journalEntries.filter(entry => new Date(entry.date) >= sevenDaysAgo);
        
        const moodCounts: { [emoji: string]: number } = {};
        recentEntries.forEach(entry => {
            if (entry.mood) {
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            }
        });

        return Object.entries(moodCounts)
            .map(([emoji, count]) => {
                const moodInfo = moodOptions.find(m => m.emoji === emoji);
                return {
                    emoji: emoji,
                    label: moodInfo ? moodInfo.label : 'Inconnu',
                    value: count,
                };
            });
    }, []);

    return (
        <div className="content-card mood-tracker-widget">
            {moodData.length > 0 ? (
                <>
                    <h4>Humeur de la semaine</h4>
                    <BarChart data={moodData} />
                </>
            ) : (
                <div className="mood-tracker-empty">
                    <SmileIcon />
                    <h4>Suivi d'humeur</h4>
                    <p>Enregistrez votre humeur dans le journal pour voir vos tendances ici.</p>
                </div>
            )}
        </div>
    );
};
