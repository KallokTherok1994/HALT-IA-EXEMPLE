import React, { useState, useEffect, useCallback } from 'react';
import { GuidedJourneyStorage, GUIDED_JOURNEY_STORAGE_KEY, GuidedJourneyDayState, GuidedJourney } from '../types';
import { storage } from '../utils/storage';
import { generateGuidedJourney } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { SendIcon, CheckCircleIcon, CircleIcon, AwardIcon, SaveIcon, GuidedJourneyIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { SACRED_WEEKEND_JOURNEY } from '../data';
import { useAppContext } from '../contexts/AppContext';

type JourneyStatus = 'idle' | 'loading' | 'active' | 'completed' | 'error';

const PREDEFINED_JOURNEYS = [
    SACRED_WEEKEND_JOURNEY,
    { id: "clarity", title: "Clarifier mes priorités", description: "Apprendre à distinguer l'essentiel de l'urgent pour focaliser mon énergie.", topic: "Clarifier mes priorités de vie" },
    { id: "anchoring", title: "M'ancrer au quotidien", description: "Développer des pratiques simples pour être plus présent dans mon corps et dans ma vie.", topic: "Comment m'ancrer au quotidien" },
    { id: "transmute", title: "Transmuter une blessure", description: "Explorer une blessure passée pour en extraire la sagesse et la transformer en force.", topic: "Comment transmuter une blessure émotionnelle" },
];


const JourneyCreation: React.FC<{ onStartJourney: (journey: GuidedJourney | string) => void, isLoading: boolean }> = ({ onStartJourney, isLoading }) => {
    const [topic, setTopic] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim() && !isLoading) {
            onStartJourney(topic.trim());
        }
    };

    return (
        <div className="empty-state fade-in" style={{padding: '2.5rem', maxWidth: '700px'}}>
            <GuidedJourneyIcon style={{width: 48, height: 48, color: 'var(--color-primary)', marginBottom: '1rem'}}/>
            <h3>Commencez un nouveau parcours</h3>
            <p>Choisissez un parcours thématique ou décrivez votre propre objectif. L'IA créera un parcours simple de 5 jours pour vous aider à progresser.</p>
            
            <div className="scenario-selection">
                <h4>Parcours thématiques :</h4>
                <div className="scenario-grid">
                    {PREDEFINED_JOURNEYS.map(journey => (
                        <button key={journey.id} className="scenario-card" onClick={() => onStartJourney(journey)}>
                            {journey.title}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '2rem' }}>
                <div className="topic-input-wrapper">
                    <input
                        type="text"
                        className="topic-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ou décrivez votre propre thème..."
                        aria-label="Thème du parcours"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="button-primary topic-submit-button"
                        aria-label="Commencer le parcours"
                        disabled={isLoading || !topic.trim()}
                    >
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
};

const JourneyDisplay: React.FC<{ 
    journeyData: GuidedJourneyStorage; 
    journeyDetails: GuidedJourney;
    onSaveDay: (dayIndex: number, response: string) => void;
}> = ({ journeyData, journeyDetails, onSaveDay }) => {
    const { navigateTo } = useAppContext();
    const { dayStates } = journeyData;
    const currentDayIndex = dayStates.findIndex(s => !s.completed);
    
    const [viewingDayIndex, setViewingDayIndex] = useState(currentDayIndex !== -1 ? currentDayIndex : dayStates.length - 1);
    const [responseText, setResponseText] = useState('');

    const isViewingCurrentDay = viewingDayIndex === currentDayIndex;
    const viewingDay = journeyDetails.days[viewingDayIndex];
    const viewingDayState = dayStates[viewingDayIndex];

    const handleSave = () => {
        if (responseText.trim()) {
            onSaveDay(viewingDayIndex, responseText);
            setResponseText('');
        }
    };

    return (
        <div className="journey-display fade-in">
            <aside>
                <ul className="journey-timeline">
                    {journeyDetails.days.map((day, index) => {
                        const state = dayStates[index];
                        const isCurrent = index === currentDayIndex;
                        const isViewing = index === viewingDayIndex;
                        const isUpcoming = !state || (!state.completed && !isCurrent);
                        
                        let statusClass = '';
                        if (state?.completed) statusClass = 'completed';
                        if (isCurrent) statusClass = 'current';
                        if (isViewing) statusClass += ' viewing';
                        if (isUpcoming) statusClass = 'upcoming';

                        return (
                            <li key={index} className={`timeline-step ${statusClass}`} onClick={() => !isUpcoming && setViewingDayIndex(index)}>
                                <div className="timeline-marker">
                                    {state?.completed ? <CheckCircleIcon /> : (isCurrent ? <div className="current-day-pulse"></div> : <CircleIcon />)}
                                </div>
                                <div className="timeline-content">
                                    <span>Jour {index + 1}</span>
                                    <p>{day.title}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </aside>
             <main className="journey-day-content content-card">
                <h3>{viewingDay.title}</h3>
                <p>{viewingDay.task}</p>
                {viewingDay.moduleId && (
                    <button className="button-secondary" onClick={() => navigateTo(viewingDay.moduleId!)}>
                        Aller au module {viewingDay.moduleId}
                    </button>
                )}
                {viewingDayState?.completed ? (
                    <div className="day-response-display">
                        <strong>Votre réflexion :</strong>
                        <p>"{viewingDayState.response}"</p>
                    </div>
                ) : isViewingCurrentDay ? (
                    <div className="day-response-input">
                        <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Écrivez vos pensées ou vos progrès ici..."
                            rows={5}
                        />
                        <button onClick={handleSave} className="button-primary" disabled={!responseText.trim()}>
                            <SaveIcon /> Marquer comme terminé
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    );
};


export const GuidedJourneyView: React.FC = () => {
    const [journeyData, setJourneyData] = useState<GuidedJourneyStorage | null>(() => storage.get(GUIDED_JOURNEY_STORAGE_KEY, null));
    const [journeyDetails, setJourneyDetails] = useState<GuidedJourney | null>(null);
    const [status, setStatus] = useState<JourneyStatus>('idle');
    const { showToast } = useToast();

    useEffect(() => {
        const data = storage.get<GuidedJourneyStorage | null>(GUIDED_JOURNEY_STORAGE_KEY, null);
        if (data) {
            const details = PREDEFINED_JOURNEYS.find(j => j.id === data.journeyId);
            if(details) {
                setJourneyData(data);
                setJourneyDetails(details);
                setStatus(data.dayStates.every(s => s.completed) ? 'completed' : 'active');
            } else {
                 // Could be a custom AI journey, would need to store details too. For now, reset.
                 storage.set(GUIDED_JOURNEY_STORAGE_KEY, null);
                 setStatus('idle');
            }
        } else {
            setStatus('idle');
        }
    }, []);

    useEffect(() => {
        if (journeyData) {
            storage.set(GUIDED_JOURNEY_STORAGE_KEY, journeyData);
            const isCompleted = journeyData.dayStates.every(s => s.completed);
            if (isCompleted) {
                setStatus('completed');
            } else {
                setStatus('active');
            }
        }
    }, [journeyData]);

    const handleStartJourney = useCallback(async (journeyOrTopic: GuidedJourney | string) => {
        setStatus('loading');
        try {
            let journey: GuidedJourney;
            if (typeof journeyOrTopic === 'string') {
                const aiGenerated = await generateGuidedJourney(journeyOrTopic);
                journey = { ...aiGenerated, id: `ai-${Date.now()}` }; // AI journeys don't have a stable ID
                // Note: For AI journeys to be resumable, their details would need to be saved.
                // This implementation prioritizes pre-defined journeys for simplicity.
            } else {
                journey = journeyOrTopic;
            }
            
            const newJourneyData: GuidedJourneyStorage = {
                journeyId: journey.id,
                startDate: new Date().toISOString(),
                dayStates: journey.days.map(() => ({ completed: false, response: '' } as GuidedJourneyDayState)),
            };
            setJourneyDetails(journey);
            setJourneyData(newJourneyData);
        } catch (err) {
            console.error("Failed to start journey", err);
            setStatus('error');
            showToast("La création du parcours a échoué. Veuillez réessayer.", "destructive");
        }
    }, [showToast]);

    const handleSaveDay = (dayIndex: number, response: string) => {
        setJourneyData(prev => {
            if (!prev) return null;
            const newDayStates = [...prev.dayStates];
            newDayStates[dayIndex] = { completed: true, response };
            return { ...prev, dayStates: newDayStates };
        });
    };

    const handleResetJourney = () => {
        if (window.confirm("Êtes-vous sûr de vouloir abandonner ce parcours et en commencer un nouveau ? Votre progression sera perdue.")) {
            setJourneyData(null);
            setJourneyDetails(null);
            storage.set(GUIDED_JOURNEY_STORAGE_KEY, null);
            setStatus('idle');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return <div className="empty-state"><LoadingIndicator /><p>Création de votre parcours personnalisé...</p></div>;
            case 'error':
                return <div className="empty-state"><ErrorMessage message="Impossible de créer le parcours. Veuillez réessayer." /><button onClick={() => setStatus('idle')} className="button-secondary">Réessayer</button></div>;
            case 'idle':
                return <JourneyCreation onStartJourney={handleStartJourney} isLoading={false} />;
            case 'active':
                return journeyData && journeyDetails ? <JourneyDisplay journeyData={journeyData} journeyDetails={journeyDetails} onSaveDay={handleSaveDay} /> : null;
            case 'completed':
                return (
                    <div className="journey-completion-message fade-in">
                        <AwardIcon />
                        <h3>Félicitations !</h3>
                        <p>Vous avez terminé le parcours "{journeyDetails?.title}".</p>
                        <button onClick={handleResetJourney} className="button-primary">Commencer un nouveau parcours</button>
                    </div>
                );
        }
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title={journeyDetails?.title || "Parcours Guidé"}>
                {status === 'active' || status === 'completed' ? (
                    <button onClick={handleResetJourney} className="button-secondary">Recommencer</button>
                ) : null}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};