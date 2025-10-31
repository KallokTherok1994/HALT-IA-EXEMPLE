import React, { useState, useEffect } from 'react';
import { DreamEntry, DREAM_JOURNAL_STORAGE_KEY, Connection } from '../types';
import { useStorageState } from '../hooks/useStorageState';
import { analyzeDreamEntry } from '../services/generative-ai';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';

import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { AIInteraction } from './common/AIInteraction';
import { ErrorMessage } from './common/ErrorMessage';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { PlusIcon, DeleteIcon, SaveIcon, AnalyzeIcon, DreamJournalIcon, LinkIcon, SparklesIcon, LightbulbIcon, HelpCircleIcon, EditIcon } from '../icons';

interface DreamJournalViewProps {
    initialEntryId?: string;
}

type ViewMode = 'list' | 'editor' | 'viewer';

const DreamEditor: React.FC<{
    entryToEdit: Partial<DreamEntry> | null;
    onSave: (data: Omit<DreamEntry, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError' | 'connections'>) => void;
    onBack: () => void;
}> = ({ entryToEdit, onSave, onBack }) => {
    const [title, setTitle] = useState(entryToEdit?.title || '');
    const [content, setContent] = useState(entryToEdit?.content || '');
    const [clarity, setClarity] = useState<'low' | 'medium' | 'high'>(entryToEdit?.clarity || 'medium');
    const [emotions, setEmotions] = useState(entryToEdit?.emotions?.join(', ') || '');
    const { showToast } = useToast();

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            showToast("Le titre et le contenu du rêve sont requis.", "destructive");
            return;
        }
        onSave({
            title,
            content,
            clarity,
            emotions: emotions.split(',').map(e => e.trim()).filter(Boolean),
        });
    };

    return (
        <div className="dream-editor fade-in">
            <div className="form-group">
                <label htmlFor="dream-title">Titre du rêve</label>
                <input id="dream-title" type="text" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
                <label htmlFor="dream-content">Description du rêve</label>
                <textarea id="dream-content" value={content} onChange={e => setContent(e.target.value)} rows={10} />
            </div>
            <div className="clarity-selector form-group">
                <label>Clarté du souvenir</label>
                <div className="radio-group">
                    <button className={`radio-button ${clarity === 'low' ? 'active' : ''}`} onClick={() => setClarity('low')}>Brouillon</button>
                    <button className={`radio-button ${clarity === 'medium' ? 'active' : ''}`} onClick={() => setClarity('medium')}>Moyen</button>
                    <button className={`radio-button ${clarity === 'high' ? 'active' : ''}`} onClick={() => setClarity('high')}>Vif</button>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="dream-emotions">Émotions ressenties (séparées par une virgule)</label>
                <input id="dream-emotions" type="text" value={emotions} onChange={e => setEmotions(e.target.value)} />
            </div>
            <div className="wizard-actions">
                <button onClick={onBack} className="button-secondary">Annuler</button>
                <button onClick={handleSave} className="button-primary"><SaveIcon /> Enregistrer le rêve</button>
            </div>
        </div>
    );
};

const DreamViewer: React.FC<{
    entry: DreamEntry;
    onAnalyze: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
}> = ({ entry, onAnalyze, onUpdateConnections }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(entry.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    const clarityMap = { low: 'Brouillon', medium: 'Moyen', high: 'Vif' };

    return (
        <div className="dream-viewer fade-in">
            <h2>{entry.title}</h2>
            <div className="dream-viewer-meta">
                <span>{new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>Clarté : {clarityMap[entry.clarity]}</span>
                {entry.emotions.length > 0 && <span>Émotions : {entry.emotions.join(', ')}</span>}
            </div>
            <div className="dream-viewer-content">
                {entry.content}
            </div>

            <ConnectionsDisplay connections={entry.connections} />
            <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{ marginTop: 'var(--spacing-sm)' }}>
                <LinkIcon /> Gérer les connexions
            </button>
            {isConnectionManagerOpen && (
                <ConnectionManagerModal
                    isOpen={isConnectionManagerOpen}
                    onClose={() => setIsConnectionManagerOpen(false)}
                    currentConnections={entry.connections || []}
                    onSave={handleSaveConnections}
                    currentEntryIdentifier={{ moduleId: 'dream-journal', id: entry.id }}
                />
            )}

            <div className="journal-analysis-section">
                {entry.isAnalyzing && <AIInteraction messages={['Hal explore le monde onirique...', 'Interprétation des symboles...', 'Recherche de sens...']} />}
                {entry.analysisError && <ErrorMessage message="L'analyse du rêve a échoué." />}
                
                {entry.analysis ? (
                    <div className="fade-in">
                        <div className="analysis-item">
                            <div className="icon"><SparklesIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Symboles & Interprétations</strong>
                                {entry.analysis.symbols.map((s, i) => (
                                    <div key={i} className="dream-analysis-symbol">
                                        <strong>{s.symbol}:</strong>
                                        <p>{s.interpretation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="analysis-item">
                            <div className="icon"><LightbulbIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Signification Globale</strong>
                                <p>{entry.analysis.overallMeaning}</p>
                            </div>
                        </div>
                         <div className="analysis-item">
                            <div className="icon"><HelpCircleIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Piste de Réflexion</strong>
                                <p className="reflection-question">"{entry.analysis.reflectionPrompt}"</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    !entry.isAnalyzing && (
                        <button onClick={() => onAnalyze(entry.id)} className="button-primary" style={{ marginTop: '1rem' }}>
                            <AnalyzeIcon /> Analyser avec Hal
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export const DreamJournalView: React.FC<DreamJournalViewProps> = ({ initialEntryId }) => {
    const [entries, setEntries] = useStorageState<DreamEntry[]>(DREAM_JOURNAL_STORAGE_KEY, []);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedEntry, setSelectedEntry] = useState<DreamEntry | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    const sortedEntries = React.useMemo(() => 
        [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]);

    useEffect(() => {
        if (initialEntryId) {
            const entryToShow = sortedEntries.find(e => e.id === initialEntryId);
            if (entryToShow) {
                setSelectedEntry(entryToShow);
                setView('viewer');
            }
        }
    }, [initialEntryId, sortedEntries]);

    const handleNew = () => {
        setSelectedEntry(null);
        setView('editor');
    };

    const handleSave = (data: Omit<DreamEntry, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError' | 'connections'>) => {
        if (selectedEntry) {
            const updatedEntry = { ...selectedEntry, ...data, analysis: undefined };
            setEntries(prev => prev.map(e => e.id === selectedEntry.id ? updatedEntry : e));
            setSelectedEntry(updatedEntry);
            setView('viewer');
            showToast("Rêve mis à jour.", "success");
        } else {
            const newEntry: DreamEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                ...data,
                connections: [],
            };
            setEntries(prev => [newEntry, ...prev]);
            setSelectedEntry(newEntry);
            setView('viewer');
            showToast("Rêve enregistré.", "success");
        }
    };

    const handleUpdateConnections = (entryId: string, connections: Connection[]) => {
        const updatedEntries = entries.map(e => e.id === entryId ? { ...e, connections, analysis: undefined } : e);
        setEntries(updatedEntries);
        if (selectedEntry?.id === entryId) {
            setSelectedEntry(prev => prev ? { ...prev, connections, analysis: undefined } : null);
        }
        showToast("Connexions mises à jour. L'analyse a été réinitialisée.", "success");
    };

    const handleAnalyze = async (entryId: string) => {
        const entryToAnalyze = entries.find(e => e.id === entryId);
        if (!entryToAnalyze) return;

        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isAnalyzing: true, analysisError: false } : e));
        if (selectedEntry?.id === entryId) setSelectedEntry(prev => prev ? {...prev, isAnalyzing: true, analysisError: false} : null);

        try {
            const analysis = await analyzeDreamEntry(
                entryToAnalyze.content,
                entryToAnalyze.emotions,
                settings,
                entryToAnalyze.connections
            );
            const updatedEntries = entries.map(e => e.id === entryId ? { ...e, analysis, isAnalyzing: false } : e);
            setEntries(updatedEntries);
            if (selectedEntry?.id === entryId) setSelectedEntry(updatedEntries.find(e => e.id === entryId) || null);
        } catch (error) {
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isAnalyzing: false, analysisError: true } : e));
            if (selectedEntry?.id === entryId) setSelectedEntry(prev => prev ? {...prev, isAnalyzing: false, analysisError: true} : null);
            showToast("L'analyse du rêve a échoué.", "destructive");
        }
    };

    const handleDelete = (entryId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce rêve ?")) {
            setEntries(prev => prev.filter(e => e.id !== entryId));
            setView('list');
            setSelectedEntry(null);
            showToast("Rêve supprimé.", "info");
        }
    };
    
    const renderContent = () => {
        if (view === 'editor') {
            return <DreamEditor entryToEdit={selectedEntry} onSave={handleSave} onBack={() => { setView('list'); setSelectedEntry(null); }} />;
        }
        if (view === 'viewer' && selectedEntry) {
            return <DreamViewer entry={selectedEntry} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} />;
        }

        return (
            <>
                {sortedEntries.length === 0 ? (
                    <EmptyState
                        Icon={DreamJournalIcon}
                        title="Explorez votre monde onirique"
                        message="Notez vos rêves pour découvrir les messages cachés de votre subconscient. Chaque rêve est une porte vers une meilleure connaissance de soi."
                        action={{ text: 'Noter mon premier rêve', onClick: handleNew }}
                    />
                ) : (
                    <div className="stagger-fade-in">
                        {sortedEntries.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="content-card dream-card"
                                onClick={() => { setSelectedEntry(entry); setView('viewer'); }}
                                style={{ '--stagger-index': index } as React.CSSProperties}
                            >
                                <div className="journal-entry-title-line">
                                    <h3>{entry.title}</h3>
                                    <span className={`clarity-indicator clarity-${entry.clarity}`}>
                                        {entry.clarity === 'low' ? 'Brouillon' : entry.clarity === 'medium' ? 'Moyen' : 'Vif'}
                                    </span>
                                </div>
                                <time>{new Date(entry.date).toLocaleDateString('fr-FR')}</time>
                                <p>{entry.content.substring(0, 100)}...</p>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Journal des Rêves">
                {view === 'list' && <button onClick={handleNew} className="button-primary"><PlusIcon /> Nouveau Rêve</button>}
                {view !== 'list' && <button onClick={() => { setView('list'); setSelectedEntry(null); }} className="button-secondary">Retour à la liste</button>}
                {view === 'viewer' && selectedEntry && (
                    <div className="action-button-group">
                        <button onClick={() => setView('editor')} className="button-icon" title="Modifier"><EditIcon /></button>
                        <button onClick={() => handleDelete(selectedEntry.id)} className="button-icon destructive" title="Supprimer"><DeleteIcon /></button>
                    </div>
                )}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};
