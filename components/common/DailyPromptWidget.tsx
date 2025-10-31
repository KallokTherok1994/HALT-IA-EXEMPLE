import React from 'react';
import { useDailyPrompt } from '../../hooks/useDailyPrompt';
import { LightbulbIcon } from '../../icons';
import { useAppContext } from '../../contexts/AppContext';
import { NavigationPayload } from '../../types';

export const DailyPromptWidget: React.FC = () => {
    const { loading, prompt } = useDailyPrompt();
    const { navigateTo } = useAppContext();

    const handleWrite = () => {
        if (prompt) {
            const payload: NavigationPayload = {
                title: `Réponse au prompt du jour`,
                content: `**Prompt : ${prompt}**\n\n`
            };
            navigateTo('journal', undefined, payload);
        }
    };

    if (loading) {
        return (
            <div className="content-card daily-prompt-widget skeleton-container">
                <h4 className="skeleton skeleton-text" style={{ width: '50%' }}></h4>
                <p className="skeleton skeleton-text" style={{ width: '90%' }}></p>
                <p className="skeleton skeleton-text" style={{ width: '70%' }}></p>
            </div>
        );
    }

    if (!prompt) {
        return null; // Don't render if prompt failed to load
    }

    return (
        <div className="content-card daily-prompt-widget fade-in">
            <div className="daily-prompt-header">
                <LightbulbIcon />
                <h4>Prompt du Jour</h4>
            </div>
            <p className="daily-prompt-text">"{prompt}"</p>
            <button className="button-secondary" onClick={handleWrite}>
                Écrire sur ce sujet
            </button>
        </div>
    );
};
