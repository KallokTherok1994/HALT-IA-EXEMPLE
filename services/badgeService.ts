import { storage } from '../utils/storage';
import {
    JournalEntry, JOURNAL_STORAGE_KEY,
    RitualsStorage, RITUALS_STORAGE_KEY,
    ThoughtCase, THOUGHT_COURT_STORAGE_KEY,
    GOALS_STORAGE_KEY, GoalsStorage,
    Badge, BADGE_STORAGE_KEY,
    VALUES_STORAGE_KEY, UserValues,
    ASSESSMENT_STORAGE_KEY, AssessmentStorage
} from '../types';
import { calculateStreaks } from '../utils/streaks';


// Badge Definitions
const BADGE_DEFINITIONS: Omit<Badge, 'unlocked' | 'unlockedAt'>[] = [
    { id: 'journal_1', name: 'Chroniqueur Débutant', description: 'Écrire sa première entrée de journal.', icon: '✍️' },
    { id: 'journal_10', name: 'Penseur Prolifique', description: 'Écrire 10 entrées de journal.', icon: '📚' },
    { id: 'ritual_streak_7', name: 'Semaine Impeccable', description: 'Compléter tous ses rituels 7 jours de suite.', icon: '🔥' },
    { id: 'thought_court_1', name: 'Première Objection', description: 'Utiliser le Tribunal des Pensées pour la première fois.', icon: '⚖️' },
    { id: 'thought_court_5', name: 'Avocat de la Défense', description: 'Analyser 5 pensées négatives.', icon: '🏛️' },
    { id: 'goal_1', name: 'Objectif Atteint', description: 'Atteindre son premier objectif.', icon: '🎯' },
    { id: 'all_modules', name: 'Explorateur Holistique', description: 'Utiliser au moins 5 modules différents.', icon: '🧭' },
];

type DataSnapshot = {
    journalEntries: JournalEntry[];
    ritualsData: RitualsStorage;
    thoughtCases: ThoughtCase[];
    goals: GoalsStorage;
    userValues: UserValues;
    assessments: AssessmentStorage;
};

// Functions to check badge criteria
const badgeCheckers: { [key: string]: (data: DataSnapshot) => boolean } = {
    journal_1: (data) => data.journalEntries.length >= 1,
    journal_10: (data) => data.journalEntries.length >= 10,
    ritual_streak_7: (data) => {
        const totalTasks = data.ritualsData.rituals.reduce((sum, r) => sum + r.tasks.length, 0);
        if (totalTasks === 0) return false;
        const completionDates = Object.keys(data.ritualsData.completions).filter(dateStr => {
            const completedCount = data.ritualsData.completions[dateStr]?.length || 0;
            return completedCount >= totalTasks;
        });
        const streaks = calculateStreaks(completionDates);
        return streaks.currentStreak >= 7 || streaks.longestStreak >= 7;
    },
    thought_court_1: (data) => data.thoughtCases.length >= 1,
    thought_court_5: (data) => data.thoughtCases.length >= 5,
    goal_1: (data) => data.goals.some(g => g.steps.length > 0 && g.steps.every(s => s.completed)),
    all_modules: (data) => {
        const usedModules = new Set<string>();
        if (data.journalEntries.length > 0) usedModules.add('journal');
        if (data.ritualsData.rituals.length > 0) usedModules.add('ritual');
        if (data.thoughtCases.length > 0) usedModules.add('thought-court');
        if (data.goals.length > 0) usedModules.add('goals');
        if (data.userValues.prioritizedValues.length > 0) usedModules.add('values');
        if (data.assessments.length > 0) usedModules.add('assessment');
        return usedModules.size >= 5;
    }
};

export const checkAndAwardBadges = (): Badge[] => {
    const awardedBadges = new Map<string, Badge>(
        storage.get<Badge[]>(BADGE_STORAGE_KEY, []).map(b => [b.id, b])
    );

    const dataSnapshot: DataSnapshot = {
        journalEntries: storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []),
        ritualsData: storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} }),
        thoughtCases: storage.get<ThoughtCase[]>(THOUGHT_COURT_STORAGE_KEY, []),
        goals: storage.get<GoalsStorage>(GOALS_STORAGE_KEY, []),
        userValues: storage.get<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} }),
        assessments: storage.get<AssessmentStorage>(ASSESSMENT_STORAGE_KEY, []),
    };

    let updated = false;
    BADGE_DEFINITIONS.forEach(def => {
        if (!awardedBadges.has(def.id)) {
            const checker = badgeCheckers[def.id];
            if (checker && checker(dataSnapshot)) {
                const newBadge: Badge = {
                    ...def,
                    unlocked: true,
                    unlockedAt: new Date().toISOString(),
                };
                awardedBadges.set(def.id, newBadge);
                updated = true;
            }
        }
    });

    if (updated) {
        storage.set(BADGE_STORAGE_KEY, Array.from(awardedBadges.values()));
    }

    return Array.from(awardedBadges.values()).filter(b => b.unlocked);
};