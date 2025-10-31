import { useMemo } from 'react';
import { storage } from '../utils/storage';
import {
    ModuleId,
    ConnectableItem,
    JournalEntry, JOURNAL_STORAGE_KEY,
    ThoughtCase, THOUGHT_COURT_STORAGE_KEY,
    Goal, GOALS_STORAGE_KEY,
    UnsentLetter, UNSENT_LETTER_STORAGE_KEY,
    BodyMapEntry, BODY_MAP_STORAGE_KEY,
    FearSettingExercise, FEAR_SETTING_STORAGE_KEY,
    OracleDraw, ORACLE_STORAGE_KEY,
    DreamEntry, DREAM_JOURNAL_STORAGE_KEY,
    NarrativeArcEntry, NARRATIVE_ARC_STORAGE_KEY,
} from '../types';

export const useConnections = () => {
    const searchConnectableItems = useMemo(() => (
        searchTerm: string,
        currentEntry: { moduleId: ModuleId, id: string }
    ): ConnectableItem[] => {
        if (searchTerm.length < 2) {
            return [];
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        let allItems: ConnectableItem[] = [];

        // Journal
        const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        allItems = allItems.concat(journalEntries.map(e => ({ 
            id: e.id, 
            title: e.title, 
            moduleId: 'journal', 
            date: e.date, 
            snippet: e.content.substring(0, 100) 
        })));
        
        // Thought Court
        const thoughtCases = storage.get<ThoughtCase[]>(THOUGHT_COURT_STORAGE_KEY, []);
        allItems = allItems.concat(thoughtCases.map(c => ({ 
            id: c.id, 
            title: c.negativeThought, 
            moduleId: 'thought-court', 
            date: c.date, 
            snippet: c.balancedThought 
        })));
        
        // Goals
        const goals = storage.get<Goal[]>(GOALS_STORAGE_KEY, []);
        allItems = allItems.concat(goals.map(g => ({ 
            id: g.id, 
            title: g.title, 
            moduleId: 'goals', 
            date: new Date().toISOString(), // Goals don't have dates, use today
            snippet: `${g.steps.filter(s => s.completed).length}/${g.steps.length} étapes terminées` 
        })));

        // Oracle
        const oracleDraws = storage.get<OracleDraw[]>(ORACLE_STORAGE_KEY, []);
        allItems = allItems.concat(oracleDraws.map(d => ({ 
            id: d.id,
            title: `${d.spreadType}: "${d.question}"`, 
            moduleId: 'oracle', 
            date: d.date, 
            snippet: `Cartes: ${d.cards.map(c => c.card.title).join(', ')}` 
        })));
        
        // Dream Journal
        const dreamEntries = storage.get<DreamEntry[]>(DREAM_JOURNAL_STORAGE_KEY, []);
        allItems = allItems.concat(dreamEntries.map(d => ({
            id: d.id,
            title: d.title,
            moduleId: 'dream-journal',
            date: d.date,
            snippet: d.content.substring(0, 100)
        })));

        // Unsent Letters
        const letters = storage.get<UnsentLetter[]>(UNSENT_LETTER_STORAGE_KEY, []);
        allItems = allItems.concat(letters.map(l => ({ 
            id: l.id, 
            title: l.subject, 
            moduleId: 'unsent-letters', 
            date: l.date, 
            snippet: `À: ${l.recipient}` 
        })));

        // Body Map
        const bodyMaps = storage.get<BodyMapEntry[]>(BODY_MAP_STORAGE_KEY, []);
        allItems = allItems.concat(bodyMaps.map(b => ({ 
            id: b.id, 
            title: `Carte pour: ${b.emotion}`, 
            moduleId: 'body-map', 
            date: b.date, 
            snippet: b.sensations.join(', ') 
        })));

        // Fear Setting
        const fears = storage.get<FearSettingExercise[]>(FEAR_SETTING_STORAGE_KEY, []);
        allItems = allItems.concat(fears.map(f => ({ 
            id: f.id, 
            title: `Peur de: ${f.action}`, 
            moduleId: 'fear-setting', 
            date: f.date, 
            snippet: f.scenarios[0]?.fear || '' 
        })));
        
        // Narrative Arc
        const narratives = storage.get<NarrativeArcEntry[]>(NARRATIVE_ARC_STORAGE_KEY, []);
        allItems = allItems.concat(narratives.map(n => ({
            id: n.id,
            title: n.analysis?.title || n.situation.substring(0, 50),
            moduleId: 'narrative-arc',
            date: n.date,
            snippet: `Défi: ${n.challenge.substring(0, 80)}...`
        })));

        return allItems
            .filter(item => 
                !(item.moduleId === currentEntry.moduleId && item.id === currentEntry.id)
            )
            .filter(item => 
                item.title.toLowerCase().includes(lowerCaseSearchTerm) || 
                item.snippet.toLowerCase().includes(lowerCaseSearchTerm)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 50);
    }, []);

    return { searchConnectableItems };
};