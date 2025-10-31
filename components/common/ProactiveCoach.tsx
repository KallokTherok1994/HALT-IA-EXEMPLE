import React, { useState, useEffect } from 'react';
import { useProactiveCoach } from '../../hooks/useProactiveCoach';
import { ErrorMessage } from './ErrorMessage';
import { BrainCircuitIcon, XIcon } from '../../icons';
import { useToast } from '../../contexts/ToastContext';
import { useAppContext } from '../../contexts/AppContext';

interface ProactiveCoachProps {}

const ProactiveCoachSkeleton: React.FC = () => (
    <div className="proactive-coach-card content-card skeleton-container">
        <div className="proactive-coach-header">
            <div className="proactive-coach-icon skeleton" style={{ borderRadius: '50%' }}></div>
            <h4 className="skeleton skeleton-text" style={{ width: '40%', margin: 0 }}></h4>
        </div>
        <p className="skeleton skeleton-text" style={{ width: '90%' }}></p>
        <p className="skeleton skeleton-text" style={{ width: '70%' }}></p>
    </div>
);

export const ProactiveCoach: React.FC<ProactiveCoachProps> = () => {
    const { navigateTo } = useAppContext();
    const { loading, suggestion, error } = useProactiveCoach();
    const [isDismissed, setIsDismissed] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (error) {
            showToast(error, 'destructive');
        }
    }, [error, showToast]);

    if (loading) {
        return <ProactiveCoachSkeleton />;
    }
    
    if (error || !suggestion || isDismissed) {
        return null;
    }

    return (
        <div className="proactive-coach-card content-card fade-in">
            <button 
                onClick={() => setIsDismissed(true)} 
                className="button-icon dismiss-btn" 
                aria-label="Fermer ce message"
            >
                <XIcon />
            </button>
            <div className="proactive-coach-header">
                <div className="proactive-coach-icon">
                    <BrainCircuitIcon />
                </div>
                <h4>{suggestion.title}</h4>
            </div>
            <p className="proactive-coach-message">{suggestion.message}</p>
            <div className="proactive-coach-actions">
                <button className="button-secondary" onClick={() => navigateTo(suggestion.moduleId)}>
                    {suggestion.ctaText}
                </button>
            </div>
        </div>
    );
};