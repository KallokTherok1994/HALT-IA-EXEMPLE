import React, { useEffect, useState } from 'react';
import { useToastManager } from '../../contexts/ToastContext';
import { ToastMessage, Badge } from '../../types';
import { CheckCircleIcon, AlertTriangleIcon, HelpCircleIcon } from '../../icons';
import { useBadges } from '../../contexts/BadgeContext';
import { BadgeToast } from './BadgeToast';

const TOAST_TIMEOUT = 5000;
const ANIMATION_DURATION = 500;

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const leaveTimer = setTimeout(() => {
            setIsLeaving(true);
        }, TOAST_TIMEOUT);
        
        const removeTimer = setTimeout(() => {
            onRemove(toast.id);
        }, TOAST_TIMEOUT + ANIMATION_DURATION);

        return () => {
            clearTimeout(leaveTimer);
            clearTimeout(removeTimer);
        };
    }, [toast.id, onRemove]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircleIcon />;
            case 'destructive':
                return <AlertTriangleIcon />;
            case 'info':
                return <HelpCircleIcon />;
            default:
                return null;
        }
    };

    return (
        <div className={`toast toast-${toast.type} ${isLeaving ? 'toast-leave' : ''}`}>
            <div className="toast-icon">
                {getIcon()}
            </div>
            <p>{toast.message}</p>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastManager();
    const { newlyUnlockedBadges, clearNewlyUnlocked } = useBadges();
    const [displayedBadges, setDisplayedBadges] = useState<Badge[]>([]);

    useEffect(() => {
        if (newlyUnlockedBadges.length > 0) {
            setDisplayedBadges(prev => [...prev, ...newlyUnlockedBadges]);
            clearNewlyUnlocked();
        }
    }, [newlyUnlockedBadges, clearNewlyUnlocked]);

    const handleRemoveBadgeToast = (id: string) => {
        setDisplayedBadges(prev => prev.filter(b => b.id !== id));
    };

    if (toasts.length === 0 && displayedBadges.length === 0) {
        return null;
    }

    return (
        <div className="toast-container">
            {displayedBadges.map(badge => (
                <BadgeToast key={badge.id} badge={badge} onRemove={handleRemoveBadgeToast} />
            ))}
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};
