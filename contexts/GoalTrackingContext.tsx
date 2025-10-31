import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { getTodayDateString } from '../utils/dateHelpers';
import { 
    Goal, 
    GoalsStorage, 
    GOALS_STORAGE_KEY,
    GoalLinkedModule,
    RitualsStorage,
    RITUALS_STORAGE_KEY,
    JournalEntry,
    JOURNAL_STORAGE_KEY,
    Assessment,
    ASSESSMENT_STORAGE_KEY,
    AssessmentStorage,
} from '../types';

interface GoalTrackingContextType {
    goals: GoalsStorage;
    addGoal: (newGoal: Goal) => void;
    updateGoal: (updatedGoal: Goal) => void;
    deleteGoal: (goalId: string) => void;
    logAction: (type: GoalLinkedModule, details?: { ritualId?: string }) => void;
}

const GoalTrackingContext = createContext<GoalTrackingContextType | undefined>(undefined);

export const GoalTrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [goals, setGoals] = useState<GoalsStorage>(() => storage.get(GOALS_STORAGE_KEY, []));

    useEffect(() => {
        storage.set(GOALS_STORAGE_KEY, goals);
    }, [goals]);
    
    // Function to re-evaluate all goals based on stored data
    const reSyncGoals = useCallback(() => {
        const ritualsData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
        const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        const assessments = storage.get<AssessmentStorage>(ASSESSMENT_STORAGE_KEY, []);
        const todayStr = getTodayDateString();

        setGoals(prevGoals => {
            let hasChanged = false;
            const updatedGoals = prevGoals.map(goal => {
                const updatedSteps = goal.steps.map(step => {
                    let isCompleted = step.completed;
                    if (step.linkedModule === 'ritual' && step.linkedRitualId) {
                        const ritual = ritualsData.rituals.find(r => r.id === step.linkedRitualId);
                        if(ritual) {
                            const ritualTaskIds = new Set(ritual.tasks.map(t => t.id));
                            const todayCompletions = new Set(ritualsData.completions[todayStr] || []);
                            isCompleted = ritual.tasks.length > 0 && [...ritualTaskIds].every(id => todayCompletions.has(id));
                        }
                    } else if (step.linkedModule === 'journal') {
                        isCompleted = journalEntries.some(e => e.date.startsWith(todayStr));
                    } else if (step.linkedModule === 'assessment') {
                        isCompleted = assessments.some(a => a.date.startsWith(todayStr));
                    }
                    
                    if (isCompleted !== step.completed) {
                        hasChanged = true;
                    }
                    return { ...step, completed: isCompleted };
                });
                return { ...goal, steps: updatedSteps };
            });

            return hasChanged ? updatedGoals : prevGoals;
        });

    }, []);
    
    // Periodically re-sync goals, e.g., when app becomes visible
    useEffect(() => {
        reSyncGoals();
        document.addEventListener('visibilitychange', reSyncGoals);
        return () => {
            document.removeEventListener('visibilitychange', reSyncGoals);
        };
    }, [reSyncGoals]);


    const addGoal = (newGoal: Goal) => {
        setGoals(prev => [newGoal, ...prev]);
    };

    const updateGoal = (updatedGoal: Goal) => {
        setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    };
    
    const deleteGoal = (goalId: string) => {
        setGoals(prev => prev.filter(g => g.id !== goalId));
    };

    const logAction = useCallback((type: GoalLinkedModule, details?: { ritualId?: string }) => {
        const todayStr = getTodayDateString();
        setGoals(prevGoals => {
            return prevGoals.map(goal => ({
                ...goal,
                steps: goal.steps.map(step => {
                    if (step.completed) return step;

                    let shouldComplete = false;
                    if (step.linkedModule === type) {
                        if (type === 'ritual') {
                            shouldComplete = step.linkedRitualId === details?.ritualId;
                        } else {
                            // Journal and Assessment are completed just by the action type
                            shouldComplete = true;
                        }
                    }

                    return shouldComplete ? { ...step, completed: true } : step;
                })
            }));
        });
    }, []);

    const value = { goals, addGoal, updateGoal, deleteGoal, logAction };

    return (
        <GoalTrackingContext.Provider value={value}>
            {children}
        </GoalTrackingContext.Provider>
    );
};

export const useGoalTracking = (): GoalTrackingContextType => {
    const context = useContext(GoalTrackingContext);
    if (context === undefined) {
        throw new Error('useGoalTracking must be used within a GoalTrackingProvider');
    }
    return context;
};