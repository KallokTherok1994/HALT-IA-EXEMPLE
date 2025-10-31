import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { calculateStreaks } from '../utils/streaks';
import { JournalEntry, RitualsStorage, JOURNAL_STORAGE_KEY, RITUALS_STORAGE_KEY, Badge, GoalsStorage, GOALS_STORAGE_KEY, GoalStep, ProgressAnalysis, ProgressAnalysisCache, PROGRESS_ANALYSIS_CACHE_KEY, RecentStep } from '../types';
import { checkAndAwardBadges } from '../services/badgeService';
import { moodOptions } from '../data';
import { getTodayDateString } from '../utils/dateHelpers';
import { analyzeProgress } from '../services/generative-ai';

export interface ProgressData {
    loading: boolean;
    totalJournalEntries: number;
    totalRitualsCompleted: number;
    journalingStreak: { current: number; longest: number; };
    ritualStreak: { current: number; longest: number; };
    journalHeatmapData: { [date: string]: number };
    ritualHeatmapData: { [date: string]: number };
    badges: Badge[];
    moodDistribution: { emoji: string; label: string; count: number }[];
    totalCompletedGoals: number;
    totalCompletedSteps: number;
    recentCompletedSteps: RecentStep[];
    analysis: ProgressAnalysis | null;
    isAnalysisLoading: boolean;
}

const formatProgressDataForAI = (data: Omit<ProgressData, 'loading' | 'analysis' | 'isAnalysisLoading' | 'badges' | 'journalHeatmapData' | 'ritualHeatmapData' | 'recentCompletedSteps'>): string => {
    let summary = '';
    summary += `Journal: ${data.totalJournalEntries} entrées au total. Série actuelle: ${data.journalingStreak.current} jours, record: ${data.journalingStreak.longest} jours.\n`;
    summary += `Rituels: ${data.totalRitualsCompleted} tâches complétées. Série actuelle: ${data.ritualStreak.current} jours, record: ${data.ritualStreak.longest} jours.\n`;
    summary += `Objectifs: ${data.totalCompletedGoals} objectifs atteints, ${data.totalCompletedSteps} étapes terminées.\n`;
    const recentMoods = data.moodDistribution.filter(m => m.count > 0).map(m => `${m.label} (${m.count})`).join(', ');
    if (recentMoods) {
        summary += `Humeurs récentes (30j): ${recentMoods}.\n`;
    }
    return summary;
};


export const useProgressData = (): ProgressData => {
    const [data, setData] = useState<ProgressData>({
        loading: true,
        totalJournalEntries: 0,
        totalRitualsCompleted: 0,
        journalingStreak: { current: 0, longest: 0 },
        ritualStreak: { current: 0, longest: 0 },
        journalHeatmapData: {},
        ritualHeatmapData: {},
        badges: [],
        moodDistribution: [],
        totalCompletedGoals: 0,
        totalCompletedSteps: 0,
        recentCompletedSteps: [],
        analysis: null,
        isAnalysisLoading: true,
    });

    useEffect(() => {
        const calculateDataAndAnalysis = async () => {
            // --- Synchronous calculations first ---
            const ritualsData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
            const totalTasks = ritualsData.rituals.reduce((sum, r) => sum + r.tasks.length, 0);
            const totalRitualsCompleted = Object.values(ritualsData.completions).reduce((sum, tasks) => sum + (Array.isArray(tasks) ? tasks.length : 0), 0);
            const ritualCompletionDates = Object.keys(ritualsData.completions).filter(dateStr => {
                 const completedCount = (ritualsData.completions[dateStr] as string[])?.length || 0;
                 return totalTasks > 0 && completedCount >= totalTasks;
            });
            const ritualStreaks = calculateStreaks(ritualCompletionDates);

            const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
            const totalJournalEntries = journalEntries.length;
            const journalEntryDates = [...new Set(journalEntries.map(e => e.date.split('T')[0]))];
            const journalStreaks = calculateStreaks(journalEntryDates);

            const goals = storage.get<GoalsStorage>(GOALS_STORAGE_KEY, []);
            const totalCompletedGoals = goals.filter(g => g.steps.length > 0 && g.steps.every(s => s.completed)).length;
            const allCompletedSteps = goals.flatMap(g => g.steps.filter(s => s.completed).map(s => ({ ...s, goalTitle: g.title })));
            const totalCompletedSteps = allCompletedSteps.length;
            const recentCompletedSteps = allCompletedSteps.slice(-5).reverse();

            const journalHeatmapData: { [date: string]: number } = {};
            journalEntries.forEach(entry => {
                const dateStr = entry.date.split('T')[0];
                journalHeatmapData[dateStr] = (journalHeatmapData[dateStr] || 0) + 1;
            });

            const ritualHeatmapData: { [date: string]: number } = {};
            Object.entries(ritualsData.completions).forEach(([dateStr, tasks]) => {
                ritualHeatmapData[dateStr] = (tasks as string[]).length;
            });
            
            const awardedBadges = checkAndAwardBadges();

            const moodDistributionData = moodOptions.map(option => ({ ...option, count: 0 }));
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            journalEntries
                .filter(entry => new Date(entry.date) >= thirtyDaysAgo)
                .forEach(entry => {
                    if (entry.mood) {
                        const moodIndex = moodDistributionData.findIndex(m => m.emoji === entry.mood);
                        if (moodIndex !== -1) {
                            moodDistributionData[moodIndex].count++;
                        }
                    }
                });

            const statsOnly = {
                totalJournalEntries,
                totalRitualsCompleted,
                journalingStreak: { current: journalStreaks.currentStreak, longest: journalStreaks.longestStreak },
                ritualStreak: { current: ritualStreaks.currentStreak, longest: ritualStreaks.longestStreak },
                journalHeatmapData,
                ritualHeatmapData,
                badges: awardedBadges,
                moodDistribution: moodDistributionData,
                totalCompletedGoals,
                totalCompletedSteps,
                recentCompletedSteps,
            };

            // --- First state update with sync data ---
            setData(prev => ({
                ...prev,
                ...statsOnly,
                loading: false,
                isAnalysisLoading: true,
            }));

            // --- Asynchronous part for AI analysis ---
            const todayStr = getTodayDateString();
            const cachedAnalysis = storage.get<ProgressAnalysisCache | null>(PROGRESS_ANALYSIS_CACHE_KEY, null);

            if (cachedAnalysis && cachedAnalysis.date === todayStr) {
                setData(prev => ({ ...prev, analysis: cachedAnalysis.analysis, isAnalysisLoading: false }));
            } else {
                try {
                    const summary = formatProgressDataForAI(statsOnly);
                    const analysisResult = await analyzeProgress(summary);
                    storage.set<ProgressAnalysisCache>(PROGRESS_ANALYSIS_CACHE_KEY, { date: todayStr, analysis: analysisResult });
                    setData(prev => ({ ...prev, analysis: analysisResult, isAnalysisLoading: false }));
                } catch (error) {
                    console.error("Failed to get progress analysis", error);
                    setData(prev => ({ ...prev, isAnalysisLoading: false, analysis: null }));
                }
            }
        };

        calculateDataAndAnalysis();
    }, []);

    return data;
};
