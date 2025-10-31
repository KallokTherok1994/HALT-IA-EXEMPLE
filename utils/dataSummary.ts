import { storage } from './storage';
import { JournalEntry, RitualsStorage, UserValues, GoalsStorage, JOURNAL_STORAGE_KEY, RITUALS_STORAGE_KEY, VALUES_STORAGE_KEY, GOALS_STORAGE_KEY, AppSettings } from '../types';
import { moodOptions } from '../data';

export const generateContextualSummary = (settings: AppSettings): string => {
    // Check if any context sharing is enabled at all
    const isAnySharingEnabled = Object.values(settings.shareContextWithAI).some(v => v);
    if (!isAnySharingEnabled) {
        return "Le partage de contexte est désactivé par l'utilisateur.";
    }

    const summaries: string[] = [];

    try {
        // 1. Last Journal Entry Info
        if (settings.shareContextWithAI.journal) {
            const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
            if (journalEntries.length > 0) {
                const sortedEntries = [...journalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const lastEntry = sortedEntries[0];
                
                let journalSummary = '';
                if (lastEntry.mood) {
                    const moodLabel = moodOptions.find(m => m.emoji === lastEntry.mood)?.label || 'non spécifiée';
                    journalSummary += `Humeur récente: ${moodLabel}. `;
                }
                if (lastEntry.connections && lastEntry.connections.length > 0) {
                    const connectionTitles = lastEntry.connections
                        .filter(c => settings.shareContextWithAI[c.moduleId]) // Also check connection privacy
                        .map(c => `'${c.entryTitle}' (${c.moduleId})`).join(', ');
                    if (connectionTitles) {
                        journalSummary += `La dernière entrée de journal est connectée à : ${connectionTitles}.`;
                    }
                }
                if(journalSummary.trim()){
                    summaries.push(journalSummary.trim());
                }
            }
        }

        // 2. Yesterday's Ritual Completion
        if (settings.shareContextWithAI.ritual) {
            const ritualsData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
            const totalTasks = ritualsData.rituals.reduce((sum, r) => sum + r.tasks.length, 0);
            if (totalTasks > 0) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const yesterdayCompletionsCount = (ritualsData.completions[yesterdayStr] as string[])?.length || 0;
                const completionRate = Math.round((yesterdayCompletionsCount / totalTasks) * 100);
                summaries.push(`Rituels complétés hier: ${completionRate}%.`);
            }
        }
        
        // 3. Top Value
        if (settings.shareContextWithAI.values) {
            const userValues = storage.get<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} });
            if (userValues.prioritizedValues.length > 0) {
                summaries.push(`Valeur principale: ${userValues.prioritizedValues[0]}.`);
            }
        }
        
        // 4. Active Goal
        if (settings.shareContextWithAI.goals) {
            const goals = storage.get<GoalsStorage>(GOALS_STORAGE_KEY, []);
            const activeGoal = goals.find(g => g.steps.some(s => !s.completed));
            if (activeGoal) {
                const nextStep = activeGoal.steps.find(s => !s.completed);
                if(nextStep) {
                    summaries.push(`Objectif actif: "${activeGoal.title}". Prochaine étape: "${nextStep.title}".`);
                }
            }
        }

        if (summaries.length === 0) {
            return "L'utilisateur est nouveau ou n'a pas partagé de données pertinentes.";
        }
    } catch (e) {
        console.error("Failed to generate contextual summary", e);
        return "Erreur lors de la récupération du contexte.";
    }

    return summaries.join(' ');
};