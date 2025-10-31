import React from 'react';
import { useAffirmation } from '../../hooks/useAffirmation';
import { ArrowRightIcon, SparklesIcon } from '../../icons';
import { useSettings } from '../../contexts/SettingsContext';
import { useAppContext } from '../../contexts/AppContext';
import { useSuggestionContext } from '../../contexts/SuggestionContext';
import { modules } from '../../data';

interface DashboardSummaryProps {}

const AffirmationDisplay: React.FC = () => {
    const { loading, affirmation } = useAffirmation();

    if (loading) {
        return <p className="affirmation-of-the-day skeleton skeleton-text" style={{ width: '80%', margin: '0 auto' }}></p>;
    }

    if (!affirmation) {
        return null;
    }

    return <p className="affirmation-of-the-day">"{affirmation}"</p>;
};

const DashboardSkeleton: React.FC = () => (
    <div className="today-focus-card content-card">
         <div className="focus-card-header">
            <h2 className="skeleton skeleton-title" style={{ width: '40%', height: '2.5rem', marginBottom: '0.5rem' }}></h2>
            <p className="skeleton skeleton-text" style={{ width: '60%', margin: '0' }}></p>
        </div>
        <div className="primary-action-card">
             <div className="primary-action-icon skeleton" style={{ borderRadius: '50%' }}></div>
             <div className="primary-action-content">
                <h3 className="skeleton skeleton-text" style={{ width: '50%', marginBottom: '0.5rem' }}></h3>
                <p className="skeleton skeleton-text" style={{ width: '80%', margin: 0 }}></p>
             </div>
        </div>
        <p className="affirmation-of-the-day skeleton skeleton-text" style={{ width: '70%', margin: '0 auto' }}></p>
    </div>
);


export const DashboardSummary: React.FC<DashboardSummaryProps> = () => {
    const { navigateTo } = useAppContext();
    const { settings } = useSettings();
    const { loading, primarySuggestion } = useSuggestionContext();

    if (loading) {
        return <DashboardSkeleton />;
    }
    
    const today = new Date();
    const dateString = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    const hour = today.getHours();
    let greeting = 'Bonsoir';
    if (hour < 12) greeting = 'Bonne matinée';
    else if (hour < 18) greeting = 'Bon après-midi';
    
    const displayName = settings.userName ? `, ${settings.userName}` : '';

    const primaryActionModule = primarySuggestion ? modules.find(m => m.id === primarySuggestion.moduleId) : null;
    const PrimaryActionIcon = primaryActionModule?.icon || SparklesIcon;

    return (
        <div className="today-focus-card content-card">
            <div className="focus-card-header">
                <p className="date">{dateString}</p>
                <h2>{greeting}{displayName} !</h2>
            </div>

            {primarySuggestion && (
                <div className="primary-action-card">
                    <div className="primary-action-icon"><PrimaryActionIcon /></div>
                    <div className="primary-action-content">
                        <h3>{primarySuggestion.title}</h3>
                        <p>{primarySuggestion.reason}</p>
                    </div>
                    <button className="button-icon" onClick={() => navigateTo(primarySuggestion.moduleId)} aria-label={primarySuggestion.ctaText}>
                        <ArrowRightIcon />
                    </button>
                </div>
            )}
            
            <AffirmationDisplay />
        </div>
    );
};