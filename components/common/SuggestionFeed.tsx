import React, { useMemo } from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorMessage } from './ErrorMessage';
import { Suggestion } from '../../types';
import { modules } from '../../data';
import { SparklesIcon } from '../../icons';
import { useAppContext } from '../../contexts/AppContext';
import { useSuggestionContext } from '../../contexts/SuggestionContext';

interface SuggestionFeedProps {}

const SuggestionCard: React.FC<{ suggestion: Suggestion; onNavigate: (moduleId: string) => void }> = ({ suggestion, onNavigate }) => {
    const module = modules.find(m => m.id === suggestion.moduleId);
    const IconComponent = module?.icon || SparklesIcon;

    return (
        <div className={`suggestion-card content-card ${suggestion.isPrimary ? 'primary' : ''}`}>
            <div className="suggestion-card-header">
                <div className="suggestion-card-icon">
                    <IconComponent />
                </div>
                <h4>{suggestion.title}</h4>
            </div>
            <p className="suggestion-card-reason">{suggestion.reason}</p>
            <div className="suggestion-card-actions">
                <button className="button-secondary" onClick={() => onNavigate(suggestion.moduleId)}>
                    Ouvrir
                </button>
            </div>
        </div>
    );
};

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export const SuggestionFeed: React.FC<SuggestionFeedProps> = () => {
    const { navigateTo } = useAppContext();
    const { loading, otherSuggestions, error } = useSuggestionContext();

    const displayedSuggestions = useMemo(() => {
        if (!otherSuggestions || otherSuggestions.length === 0) {
            return [];
        }
        return shuffleArray(otherSuggestions);
    }, [otherSuggestions]);

    if (loading) {
        return <LoadingIndicator />;
    }
    
    if (error) {
        return <ErrorMessage message="Impossible de charger les suggestions." />;
    }

    if (displayedSuggestions.length === 0) {
        return null;
    }

    return (
        <div className="suggestion-feed">
            <h2 className="suggestion-feed-header">Pour Vous</h2>
            <div className="suggestion-feed-container">
                {displayedSuggestions.map((suggestion) => (
                    <SuggestionCard key={suggestion.title} suggestion={suggestion} onNavigate={navigateTo} />
                ))}
            </div>
        </div>
    );
};