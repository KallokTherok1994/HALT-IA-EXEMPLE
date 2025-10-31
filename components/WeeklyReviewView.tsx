import React, { useState, useEffect, useCallback } from 'react';
import { 
    WeeklyReview, 
    WeeklyReviewStorage, 
    WEEKLY_REVIEW_STORAGE_KEY,
    JOURNAL_STORAGE_KEY,
    RITUALS_STORAGE_KEY,
    VALUES_STORAGE_KEY,
    JournalEntry,
    RitualsStorage,
    UserValues
} from '../types';
import { storage } from '../utils/storage';
import { getWeekId, getWeekDateRange, getWeekBoundaryDates } from '../utils/dateHelpers';
import { generateWeeklyReview } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { ClipboardIcon, StarIcon, FlagIcon, CheckCircleIcon, HelpCircleIcon, ChevronLeftIcon, ChevronRightIcon, WeeklyReviewViewIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { useStorageState } from '../hooks/useStorageState';
import { useSettings } from '../contexts/SettingsContext';

const ReviewDisplay: React.FC<{ review: WeeklyReview, onRegenerate: () => void, isCurrentWeek: boolean }> = ({ review, onRegenerate, isCurrentWeek }) => (
    <div className="review-card content-card fade-in">
        <div className="review-section">
            <div className="icon"><ClipboardIcon /></div>
            <div className="review-content">
                <h3>Résumé de la semaine</h3>
                <p>{review.summary}</p>
            </div>
        </div>
        <div className="review-section">
            <div className="icon"><StarIcon /></div>
            <div className="review-content">
                <h3>Points forts et réussites</h3>
                <ul>
                    {review.highlights.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>
        <div className="review-section">
            <div className="icon"><FlagIcon /></div>
            <div className="review-content">
                <h3>Défis rencontrés</h3>
                 <ul>
                    {review.challenges.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>
        <div className="review-section">
            <div className="icon"><CheckCircleIcon /></div>
            <div className="review-content">
                <h3>Régularité des rituels</h3>
                <p>{review.ritualConsistency}</p>
            </div>
        </div>
        <div className="review-section">
            <div className="icon"><HelpCircleIcon /></div>
            <div className="review-content">
                <h3>Question de réflexion</h3>
                <p className="reflection-question">"{review.reflectionQuestion}"</p>
            </div>
        </div>
        {isCurrentWeek && (
            <div className="review-actions">
                <button onClick={onRegenerate} className="button-secondary">Regénérer le bilan</button>
            </div>
        )}
    </div>
);

const IntroDisplay: React.FC<{ onGenerate: () => void }> = ({ onGenerate }) => (
    <div className="empty-state fade-in">
        <h3>Prêt à faire le point ?</h3>
        <p>L'IA va analyser vos entrées de journal et vos rituels de la semaine passée pour vous offrir un bilan personnalisé et bienveillant.</p>
        <button onClick={onGenerate} className="button-primary">Générer mon bilan de la semaine</button>
    </div>
);

export const WeeklyReviewView: React.FC = () => {
    const [reviews, setReviews] = useStorageState<WeeklyReviewStorage>(WEEKLY_REVIEW_STORAGE_KEY, {});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [displayDate, setDisplayDate] = useState(new Date());
    const { showToast } = useToast();
    const { settings } = useSettings();

    const currentWeekId = getWeekId(new Date());
    const displayWeekId = getWeekId(displayDate);
    const displayedReview = reviews[displayWeekId] || null;
    const isViewingCurrentWeek = displayWeekId === currentWeekId;

    const handleGenerateReview = useCallback(async (forceRegenerate = false) => {
        const reviewForCurrentWeek = reviews[currentWeekId];
        if (reviewForCurrentWeek && !forceRegenerate) {
            if(!window.confirm("Un bilan existe déjà pour cette semaine. Voulez-vous le remplacer par un nouveau ?")) {
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const { startOfWeek, endOfWeek } = getWeekBoundaryDates(new Date());
            
            const allJournalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
            const weeklyJournalEntries = allJournalEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startOfWeek && entryDate <= endOfWeek;
            });

            const ritualData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
            const userValues = storage.get<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} });
            
            const weeklyCompletions: { [date: string]: string[] } = {};
            Object.entries(ritualData.completions).forEach(([dateStr, taskIds]) => {
                const completionDate = new Date(dateStr + 'T00:00:00'); // Treat as local midnight
                if (completionDate >= startOfWeek && completionDate <= endOfWeek) {
                    weeklyCompletions[dateStr] = taskIds as string[];
                }
            });
            
            const newReview = await generateWeeklyReview(weeklyJournalEntries, ritualData.rituals, weeklyCompletions, userValues.prioritizedValues, settings);
            
            setReviews(prev => ({
                ...prev,
                [currentWeekId]: newReview
            }));
        } catch (err)  {
            console.error(err);
            const errorMessage = "La génération du bilan a échoué. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
        } finally {
            setIsLoading(false);
        }
    }, [currentWeekId, reviews, showToast, setReviews, settings]);

    const handleNavigateWeek = (direction: 'prev' | 'next') => {
        setDisplayDate(prevDate => {
            const newDate = new Date(prevDate);
            const increment = direction === 'prev' ? -7 : 7;
            newDate.setDate(newDate.getDate() + increment);
            return newDate;
        });
    };

    const renderContent = () => {
        if(isLoading) return <LoadingIndicator />;
        if(error) return <ErrorMessage message={error} />;
        
        if(displayedReview) {
             return <ReviewDisplay review={displayedReview} onRegenerate={() => handleGenerateReview(true)} isCurrentWeek={isViewingCurrentWeek} />;
        }
        
        if (isViewingCurrentWeek) {
            return <IntroDisplay onGenerate={() => handleGenerateReview()} />;
        }
        
        return (
            <div className="empty-state fade-in">
                <WeeklyReviewViewIcon style={{width: 48, height: 48, color: 'var(--color-primary)', marginBottom: '1rem'}} />
                <h3>Aucun bilan pour cette semaine</h3>
                <p>Aucun bilan n'a été généré pour la semaine {getWeekDateRange(displayDate)}. Pour obtenir un bilan, utilisez les modules Journal et Rituels au cours de la semaine.</p>
            </div>
        );
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title={`Bilan ${getWeekDateRange(displayDate)}`}>
                <div className="action-button-group">
                    <button 
                        onClick={() => handleNavigateWeek('prev')} 
                        className="button-icon" 
                        aria-label="Semaine précédente"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button 
                        onClick={() => handleNavigateWeek('next')} 
                        className="button-icon" 
                        aria-label="Semaine suivante"
                        disabled={isViewingCurrentWeek}
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};