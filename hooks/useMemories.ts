import { useState, useCallback, useEffect } from 'react';
import { storage } from '../utils/storage';
import { JournalEntry, JOURNAL_STORAGE_KEY } from '../types';

interface MemoriesHook {
    memory: JournalEntry | null;
    getNewMemory: () => void;
    hasMemories: boolean;
}

const MIN_DAYS_OLD = 30;

export const useMemories = (): MemoriesHook => {
    const [allMemories, setAllMemories] = useState<JournalEntry[]>([]);
    const [memory, setMemory] = useState<JournalEntry | null>(null);

    useEffect(() => {
        const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MIN_DAYS_OLD);
        
        const oldEntries = journalEntries.filter(entry => new Date(entry.date) < thirtyDaysAgo);
        setAllMemories(oldEntries);
    }, []);

    const getNewMemory = useCallback(() => {
        if (allMemories.length > 0) {
            if (allMemories.length === 1) {
                setMemory(allMemories[0]);
                return;
            }
            // Exclude the current memory to ensure a new one is picked
            const filteredMemories = memory 
                ? allMemories.filter(m => m.id !== memory.id) 
                : allMemories;

            if (filteredMemories.length > 0) {
                 const randomIndex = Math.floor(Math.random() * filteredMemories.length);
                 setMemory(filteredMemories[randomIndex]);
            } else {
                // This happens if there's only one memory and it's already displayed
                setMemory(allMemories[0]);
            }

        } else {
            setMemory(null);
        }
    }, [allMemories, memory]);

    // Set initial memory
    useEffect(() => {
        if (allMemories.length > 0 && !memory) {
            getNewMemory();
        }
    }, [allMemories, memory, getNewMemory]);

    return {
        memory,
        getNewMemory,
        hasMemories: allMemories.length > 0,
    };
};