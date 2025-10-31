import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { JournalEntry, JOURNAL_STORAGE_KEY, FoodLog, Connection, NavigationPayload, UserValues, VALUES_STORAGE_KEY } from '../types';
import { moodOptions, foodMoodTags } from '../data';
import { useStorageState } from '../hooks/useStorageState';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { analyzeJournalEntry } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { Modal } from './common/Modal';
import { MicIcon, PlusIcon, SaveIcon, AnalyzeIcon, JournalIcon, SmileIcon, LightbulbIcon, HelpCircleIcon, SearchIcon, UtensilsIcon, DeleteIcon, EditIcon, LinkIcon, LayersIcon, SparklesIcon } from '../icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useBadges } from '../contexts/BadgeContext';
import { useAppContext } from '../contexts/AppContext';
import { storage } from '../utils/storage';
import { AIInteraction } from './common/AIInteraction';

interface JournalViewProps {
    initialEntryId?: string;
    initialPayload?: NavigationPayload;
}

const JournalListPanel: React.FC<{
    entries: JournalEntry[];
    activeEntryId: string | null;
    onSelect: (id: string) => void;
    onSearch: (term: string) => void;
    searchTerm: string;
}> = ({ entries, activeEntryId, onSelect, onSearch, searchTerm }) => {
    return (
        <div className="journal-list-panel">
            <div className="sidebar-search" style={{marginBottom: 'var(--spacing-sm)'}}>
                <SearchIcon/>
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            <div className="stagger-fade-in">
                {entries.length > 0 ? (
                    entries.map((entry, index) => (
                        <div 
                            key={entry.id} 
                            className={`journal-entry-card ${entry.id === activeEntryId ? 'active' : ''}`}
                            onClick={() => onSelect(entry.id)}
                            style={{ '--stagger-index': index } as React.CSSProperties}
                        >
                            <time>{new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                            <div className="journal-entry-title-line">
                                <h3>{entry.title}</h3>
                                {entry.mood && <span className="journal-entry-mood">{entry.mood}</span>}
                            </div>
                            <p>{entry.content.substring(0, 80)}...</p>
                            {entry.analysis && entry.analysis.themes.length > 0 && (
                                <div className="entry-card-analysis-summary">
                                    {entry.analysis.themes.slice(0, 3).map(theme => (
                                        <span key={theme} className="summary-theme-pill">{theme}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    searchTerm ? <div className="journal-list-empty"><p>Aucun résultat pour "{searchTerm}"</p></div> : null
                )}
            </div>
        </div>
    );
};

const FoodLogger: React.FC<{
    logs: FoodLog[];
    onAdd: (log: Omit<FoodLog, 'id'>) => void;
    onDelete: (id: string) => void;
}> = ({ logs, onAdd, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mealType, setMealType] = useState<'Petit-déjeuner' | 'Déjeuner' | 'Dîner' | 'En-cas'>('Déjeuner');
    const [description, setDescription] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    
    const handleAddLog = () => {
        if (!description.trim()) return;
        onAdd({ mealType, description, moodTags: selectedTags });
        setIsModalOpen(false);
        setDescription('');
        setSelectedTags([]);
    };
    
    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };
    
    return (
        <div className="food-logger-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h4><UtensilsIcon style={{ marginRight: '8px', verticalAlign: 'bottom' }}/> Journal Alimentaire</h4>
                <button className="button-secondary" onClick={() => setIsModalOpen(true)}><PlusIcon/> Ajouter</button>
            </div>
            {logs.length > 0 ? (
                <div className="food-log-list">
                    {logs.map(log => (
                        <div key={log.id} className="food-log-item">
                            <div>
                                <strong>{log.mealType}</strong>
                                <p className="food-description">{log.description}</p>
                                <div className="food-tags">
                                    {log.moodTags.map(tag => <span key={tag}>{tag}</span>)}
                                </div>
                            </div>
                            <button className="button-icon destructive" onClick={() => onDelete(log.id)}><DeleteIcon/></button>
                        </div>
                    ))}
                </div>
            ) : <p style={{color: 'var(--color-text-muted)', fontSize: '0.9rem'}}>Aucun repas enregistré pour cette entrée.</p>}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter un repas">
                <div className="form-group">
                    <label>Type de repas</label>
                    <select value={mealType} onChange={e => setMealType(e.target.value as any)}>
                        <option>Petit-déjeuner</option>
                        <option>Déjeuner</option>
                        <option>Dîner</option>
                        <option>En-cas</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Description du repas</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                 <div className="form-group">
                    <label>Comment vous êtes-vous senti(e) après ?</label>
                    <div className="analysis-pills">
                        {foodMoodTags.map(tag => (
                            <button key={tag} className={`analysis-pill ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
                        ))}
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="button-primary" onClick={handleAddLog}>Ajouter</button>
                </div>
            </Modal>
        </div>
    );
};

const JournalEditor: React.FC<{
    entry: JournalEntry | null;
    onSave: (entryData: Partial<JournalEntry>) => void;
    onDelete: (id: string) => void;
    isNew: boolean;
}> = ({ entry, onSave, onDelete, isNew }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<string | undefined>();
    const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);

    const { isListening, transcript, startListening, stopListening, isSupported, error: speechError } = useSpeechRecognition();
    const { showToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    useEffect(() => {
        if (entry) {
            setTitle(entry.title || '');
            setContent(entry.content || '');
            setMood(entry.mood);
            setFoodLogs(entry.foodLogs || []);
            setConnections(entry.connections || []);
        } else {
             setTitle('');
             setContent('');
             setMood(undefined);
             setFoodLogs([]);
             setConnections([]);
        }
    }, [entry]);

    useEffect(() => {
        if (speechError) showToast(`Erreur de reconnaissance vocale : ${speechError}`, 'destructive');
    }, [speechError, showToast]);

    useEffect(() => {
        if (transcript && textareaRef.current) {
            const cursorPosition = textareaRef.current.selectionStart;
            const textBefore = content.substring(0, cursorPosition);
            const textAfter = content.substring(cursorPosition);
            setContent(textBefore + (textBefore ? ' ' : '') + transcript + textAfter);
        }
    }, [transcript]); 

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            showToast("Le titre et le contenu sont requis.", "destructive");
            return;
        }
        onSave({ id: entry?.id, title, content, mood, foodLogs, connections });
    };

    const handleAddFoodLog = (log: Omit<FoodLog, 'id'>) => {
        setFoodLogs(prev => [...prev, { ...log, id: Date.now().toString() }]);
    };
    const handleDeleteFoodLog = (id: string) => {
        setFoodLogs(prev => prev.filter(log => log.id !== id));
    };

    const handleSaveConnections = (newConnections: Connection[]) => {
        setConnections(newConnections);
        setIsConnectionManagerOpen(false);
    };

    return (
        <div className="journal-detail-panel">
            <div className="journal-editor-header">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Titre de votre entrée"
                    aria-label="Titre de l'entrée"
                />
                <div className="action-button-group">
                    {isSupported && (
                        <button onClick={isListening ? stopListening : startListening} className={`button-icon ${isListening ? 'recording' : ''}`} aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}>
                            <MicIcon />
                        </button>
                    )}
                    <button onClick={handleSave} className="button-primary"><SaveIcon /> Enregistrer</button>
                    {!isNew && entry && <button onClick={() => onDelete(entry.id)} className="button-icon destructive"><DeleteIcon /></button>}
                </div>
            </div>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Écrivez librement..."
                className="journal-editor-content"
                aria-label="Contenu de l'entrée"
            />
            <div className="character-count">{content.length} caractères</div>
            
            <ConnectionsDisplay connections={connections} />
            <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                <LinkIcon /> Gérer les connexions
            </button>
            {isConnectionManagerOpen && entry && (
                <ConnectionManagerModal
                    isOpen={isConnectionManagerOpen}
                    onClose={() => setIsConnectionManagerOpen(false)}
                    currentConnections={connections}
                    onSave={handleSaveConnections}
                    currentEntryIdentifier={{ moduleId: 'journal', id: entry.id }}
                />
            )}
            
            <FoodLogger logs={foodLogs} onAdd={handleAddFoodLog} onDelete={handleDeleteFoodLog} />
            
            <div className="mood-selector">
                <label>Quelle est votre humeur générale ?</label>
                <div className="mood-selector-buttons">
                    {moodOptions.map(option => (
                        <button
                            key={option.emoji}
                            onClick={() => setMood(option.emoji)}
                            className={mood === option.emoji ? 'selected' : ''}
                            title={option.label}
                            aria-label={option.label}
                        >
                            {option.emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const JournalViewer: React.FC<{
    entry: JournalEntry;
    onAnalyze: (id: string) => void;
    onEdit: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
}> = ({ entry, onAnalyze, onEdit, onUpdateConnections }) => {
    const { navigateTo } = useAppContext();
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(entry.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    return (
        <div className="journal-detail-panel fade-in">
            <div className="journal-viewer-header">
                <h2>{entry.title}</h2>
                <div className="action-button-group">
                    <button onClick={() => onEdit(entry.id)} className="button-icon"><EditIcon/></button>
                </div>
            </div>
            <div className="journal-viewer-meta">
                <span>{new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {entry.mood && <span>Humeur : {entry.mood}</span>}
            </div>
            <div className="journal-viewer-content">
                {entry.content.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            
            <ConnectionsDisplay connections={entry.connections} />
            <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                <LinkIcon /> Gérer les connexions
            </button>
            {isConnectionManagerOpen && (
                <ConnectionManagerModal
                    isOpen={isConnectionManagerOpen}
                    onClose={() => setIsConnectionManagerOpen(false)}
                    currentConnections={entry.connections || []}
                    onSave={handleSaveConnections}
                    currentEntryIdentifier={{ moduleId: 'journal', id: entry.id }}
                />
            )}
            
            <div className="journal-analysis-section">
                <div className="analysis-header">
                    <h4><SparklesIcon /> L'analyse de Hal</h4>
                </div>
                {entry.isAnalyzing && <AIInteraction messages={["Analyse de votre entrée...", "Identification des thèmes..."]}/>}
                {entry.analysisError && <ErrorMessage message="L'analyse a échoué. Réessayez."/>}
                {entry.analysis ? (
                    <div className="fade-in">
                        <div className="analysis-item">
                            <div className="icon"><SmileIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Émotions :</strong>
                                <div className="analysis-pills">
                                    {entry.analysis.emotions.map(e => <span key={e} className="analysis-pill">{e}</span>)}
                                </div>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><LayersIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Thèmes :</strong>
                                <div className="analysis-pills">
                                    {entry.analysis.themes.map(t => <span key={t} className="analysis-pill">{t}</span>)}
                                </div>
                            </div>
                        </div>
                         <div className="analysis-item">
                            <div className="icon"><LightbulbIcon /></div>
                             <div className="analysis-item-content">
                                <strong>Perspective :</strong>
                                <p>{entry.analysis.emotionalInsight}</p>
                            </div>
                        </div>
                        <div className="analysis-item">
                             <div className="icon"><HelpCircleIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Suggestion :</strong>
                                <p>"{entry.analysis.suggestedPractice.rationale}"</p>
                                <button className="button-secondary" onClick={() => navigateTo(entry.analysis!.suggestedPractice.actionModuleId || 'journal')}>
                                    {entry.analysis.suggestedPractice.icon} {entry.analysis.suggestedPractice.name}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    !entry.isAnalyzing && <button onClick={() => onAnalyze(entry.id)} className="button-primary"><AnalyzeIcon /> Analyser l'entrée</button>
                )}
            </div>
        </div>
    );
};


export const JournalView: React.FC<JournalViewProps> = ({ initialEntryId, initialPayload }) => {
    const [entries, setEntries] = useStorageState<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { settings } = useSettings();
    const { showToast } = useToast();
    const { checkForNewBadges } = useBadges();

    const sortedEntries = useMemo(() =>
        [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]);

    const filteredEntries = useMemo(() =>
        searchTerm
            ? sortedEntries.filter(e =>
                e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.content.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : sortedEntries,
    [sortedEntries, searchTerm]);

    useEffect(() => {
        if (initialEntryId) {
            setActiveEntryId(initialEntryId);
            setIsNew(false);
        } else if (initialPayload) {
            handleNewEntry(initialPayload);
        } else if (sortedEntries.length > 0) {
            setActiveEntryId(sortedEntries[0].id);
        } else {
            setIsNew(true);
        }
    }, [initialEntryId, sortedEntries, initialPayload]);

    const handleSelectEntry = (id: string) => {
        setActiveEntryId(id);
        setIsNew(false);
    };

    const handleNewEntry = (payload?: NavigationPayload) => {
        const newEntry: JournalEntry = {
            id: `new-${Date.now()}`,
            date: new Date().toISOString(),
            title: payload?.title || '',
            content: payload?.content || '',
        };
        setActiveEntryId(newEntry.id);
        setIsNew(true);
        // Temporarily add to entries to display in editor
        setEntries(prev => [newEntry, ...prev]);
    };

    const handleSaveEntry = (entryData: Partial<JournalEntry>) => {
        setEntries(prev => {
            const now = new Date().toISOString();
            if (isNew) {
                const newEntry = {
                    ...entryData,
                    id: Date.now().toString(),
                    date: now,
                } as JournalEntry;
                // Replace temp new entry with final one
                const filtered = prev.filter(e => !e.id.startsWith('new-'));
                setActiveEntryId(newEntry.id);
                return [newEntry, ...filtered];
            } else {
                return prev.map(e => e.id === activeEntryId ? { ...e, ...entryData, date: e.date || now, analysis: undefined } as JournalEntry : e);
            }
        });
        showToast("Entrée sauvegardée.", "success");
        setIsNew(false);
        checkForNewBadges();
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
            setEntries(prev => prev.filter(e => e.id !== id));
            setActiveEntryId(null);
            if (entries.length > 1) {
                const remainingEntries = entries.filter(e => e.id !== id);
                setActiveEntryId(remainingEntries[0]?.id || null);
            } else {
                setIsNew(true);
            }
        }
    };
    
    const handleUpdateConnections = (entryId: string, connections: Connection[]) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, connections, analysis: undefined } : e));
        showToast("Connexions mises à jour. L'analyse sera regénérée si besoin.", "success");
    };

    const handleAnalyze = async (id: string) => {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        setEntries(prev => prev.map(e => e.id === id ? { ...e, isAnalyzing: true, analysisError: false } : e));
        
        try {
            const userValues = storage.get<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} });
            const analysis = await analyzeJournalEntry(entry.content, entry.foodLogs, userValues.prioritizedValues, entry.mood, settings, entry.connections);
            setEntries(prev => prev.map(e => e.id === id ? { ...e, analysis, isAnalyzing: false } : e));
        } catch (error) {
            console.error("Analysis failed", error);
            setEntries(prev => prev.map(e => e.id === id ? { ...e, isAnalyzing: false, analysisError: true } : e));
            showToast("L'analyse a échoué.", "destructive");
        }
    };

    const activeEntry = useMemo(() => entries.find(e => e.id === activeEntryId) || null, [entries, activeEntryId]);

    const renderDetailPanel = () => {
        if (isNew) {
            const tempEntry = entries.find(e => e.id === activeEntryId && e.id.startsWith('new-'));
            return <JournalEditor entry={tempEntry || null} onSave={handleSaveEntry} onDelete={handleDeleteEntry} isNew={true} />;
        }
        if (activeEntry) {
            return <JournalViewer entry={activeEntry} onAnalyze={handleAnalyze} onEdit={() => setIsNew(true)} onUpdateConnections={handleUpdateConnections}/>;
        }
        return (
            <div className="journal-detail-panel">
                <EmptyState
                    Icon={JournalIcon}
                    title="Bienvenue dans votre journal"
                    message="Sélectionnez une entrée pour la lire ou créez-en une nouvelle pour commencer à écrire."
                    action={{ text: 'Nouvelle Entrée', onClick: () => handleNewEntry() }}
                />
            </div>
        );
    };

    return (
        <div className="module-view has-internal-sidebar">
            <ModuleHeader title="Journal">
                <button onClick={() => handleNewEntry()} className="button-primary"><PlusIcon/> Nouvelle Entrée</button>
            </ModuleHeader>
            <div className="module-content journal-view-layout">
                <JournalListPanel entries={filteredEntries} activeEntryId={activeEntryId} onSelect={handleSelectEntry} onSearch={setSearchTerm} searchTerm={searchTerm} />
                {renderDetailPanel()}
            </div>
        </div>
    );
};