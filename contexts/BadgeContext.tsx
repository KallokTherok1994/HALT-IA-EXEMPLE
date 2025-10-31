import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Badge, BADGE_STORAGE_KEY } from '../types';
import { useStorageState } from '../hooks/useStorageState';
import { checkAndAwardBadges } from '../services/badgeService';

interface BadgeContextType {
    newlyUnlockedBadges: Badge[];
    checkForNewBadges: () => void;
    clearNewlyUnlocked: () => void;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const BadgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [awardedBadges, setAwardedBadges] = useStorageState<Badge[]>(BADGE_STORAGE_KEY, []);
    const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<Badge[]>([]);

    const checkForNewBadges = useCallback(() => {
        const currentBadges = awardedBadges;
        const allUnlocked = checkAndAwardBadges(); // This reads from storage and writes back if needed.

        const newBadges = allUnlocked.filter(
            unlocked => !currentBadges.some(current => current.id === unlocked.id)
        );

        if (newBadges.length > 0) {
            setNewlyUnlockedBadges(prev => [...prev, ...newBadges]);
            // Update the context's state to match storage.
            setAwardedBadges(allUnlocked);
        }
    }, [awardedBadges, setAwardedBadges]);

    const clearNewlyUnlocked = useCallback(() => {
        setNewlyUnlockedBadges([]);
    }, []);

    return (
        <BadgeContext.Provider value={{ newlyUnlockedBadges, checkForNewBadges, clearNewlyUnlocked }}>
            {children}
        </BadgeContext.Provider>
    );
};

export const useBadges = (): BadgeContextType => {
    const context = useContext(BadgeContext);
    if (!context) {
        throw new Error('useBadges must be used within a BadgeProvider');
    }
    return context;
};
