import React, { useEffect, useState } from 'react';
import { Badge } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

const BADGE_TOAST_TIMEOUT = 8000;
const ANIMATION_DURATION = 500;

export const BadgeToast: React.FC<{ badge: Badge; onRemove: (id: string) => void }> = ({ badge, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const { navigateTo } = useAppContext();

    useEffect(() => {
        const leaveTimer = setTimeout(() => {
            setIsLeaving(true);
        }, BADGE_TOAST_TIMEOUT);
        
        const removeTimer = setTimeout(() => {
            onRemove(badge.id);
        }, BADGE_TOAST_TIMEOUT + ANIMATION_DURATION);

        return () => {
            clearTimeout(leaveTimer);
            clearTimeout(removeTimer);
        };
    }, [badge.id, onRemove]);

    const handleNavigate = () => {
        navigateTo('progress');
        onRemove(badge.id); // Also remove toast on click
    };

    return (
        <div className={`badge-toast ${isLeaving ? 'toast-leave' : ''}`}>
            <div className="badge-toast-icon">
                {badge.icon}
            </div>
            <div className="badge-toast-content">
                <h4>Nouveau Trophée Débloqué !</h4>
                <p><strong>{badge.name}:</strong> {badge.description}</p>
                <button onClick={handleNavigate}>Voir mes trophées</button>
            </div>
        </div>
    );
};
