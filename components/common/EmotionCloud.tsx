import React from 'react';
import { JournalEntry, JOURNAL_STORAGE_KEY } from '../../types';
import { BrainCircuitIcon } from '../../icons';
import { storage } from '../../utils/storage';

export const EmotionCloud: React.FC = () => {
    const emotionFrequencies = React.useMemo(() => {
        const entries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        const frequencies: { [key: string]: number } = {};
        entries.forEach(entry => {
            if (entry.analysis?.emotions) {
                entry.analysis.emotions.forEach(emotion => {
                    const key = emotion.toLowerCase().trim();
                    if (key) {
                        frequencies[key] = (frequencies[key] || 0) + 1;
                    }
                });
            }
        });
        return frequencies;
    }, []);

    const sortedEmotions: [string, number][] = React.useMemo(() => {
        return Object.entries(emotionFrequencies)
            .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
            .slice(0, 20); // Limit to top 20 emotions for clarity
    }, [emotionFrequencies]);

    if (sortedEmotions.length < 3) { // Require at least 3 distinct emotions
        return null;
    }

    const maxCount = sortedEmotions.length > 0 ? sortedEmotions[0][1] : 1;

    const getTagSizeClass = (count: number) => {
        const ratio = count / maxCount;
        if (ratio > 0.7) return 'emotion-tag-lg';
        if (ratio > 0.3) return 'emotion-tag-md';
        return 'emotion-tag-sm';
    };

    return (
        <div className="emotion-cloud-container content-card">
            <h3 className="emotion-cloud-title">
                <BrainCircuitIcon />
                Nuage d'Émotions
            </h3>
            <div className="emotion-cloud">
                {sortedEmotions.map(([emotion, count]) => (
                    <span
                        key={emotion}
                        className={`emotion-tag ${getTagSizeClass(count)}`}
                        style={{ opacity: 0.6 + (count / maxCount) * 0.4 }}
                        title={`${count} occurrence(s)`}
                    >
                        {emotion}
                    </span>
                ))}
            </div>
        </div>
    );
};
