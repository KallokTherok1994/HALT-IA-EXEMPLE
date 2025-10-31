import React, { useState, useEffect } from 'react';
import { useStorageState } from '../hooks/useStorageState';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { Connection, NarrativeArcEntry, NARRATIVE_ARC_STORAGE_KEY } from '../types';
import { weaveNarrativeArcStory } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { ProgressBar } from './common/ProgressBar';
import { AIInteraction } from './common/AIInteraction';
import { ErrorMessage } from './common/ErrorMessage';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { PlusIcon, DeleteIcon, SaveIcon, AnalyzeIcon, StoryIcon, LinkIcon, SparklesIcon, LightbulbIcon } from '../icons';

type ViewMode = 'list' | 'editor' | 'viewer';

const NarrativeArcEditor: React.FC<{
    onSave: (data: Omit<NarrativeArcEntry, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError' | 'connections'>) => void;
    onBack: () => void;
}> = ({ onSave, onBack }) => {
    const [step, setStep] = useState(1);
    const [situation, setSituation] = useState('');
    const [challenge, setChallenge] = useState('');
    const [turningPoint, setTurningPoint] = useState('');
    const [resolution, setResolution] = useState('');

    const handleSave = () => {
        onSave({ situation, challenge, turningPoint, resolution });
    };

    const steps = [
        {
            title: "La Situation",
            prompt: "Décrivez une situation ou une période difficile que vous avez vécue.",
            value: situation,
            setter: setSituation,
        },
        {
            title: "Le Défi",
            prompt: "Quel était le principal conflit, obstacle ou défi que vous avez rencontré ?",
            value: challenge,
            setter: setChallenge,
        },
        {
            title: "Le Tournant",
            prompt: "Quel a été le moment où les choses ont commencé à changer ? Une prise de conscience, une décision, une action ?",
            value: turningPoint,
            setter: setTurningPoint,
        },
        {
            title: "La Résolution & Leçon",
            prompt: "Quelle a été l'issue ? Qu'avez-vous appris de cette expérience ?",
            value: resolution,
            setter: setResolution,
        },
    ];

    const currentStep = steps[step - 1];

    return (
        <div className="narrative-arc-editor">
            <ProgressBar progress={(step / steps.length) * 100} progressText={`Étape ${step} sur ${steps.length}`} />
            <div className="wizard-step">
                <h3>{currentStep.title}</h3>
                <div className="form-group">
                    <label>{currentStep.prompt}</label>
                    <textarea value={currentStep.value} onChange={e => currentStep.setter(e.target.value)} rows={8} />
                </div>
                <div className="wizard-actions">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="button-secondary">Précédent</button>
                    ) : (
                        <button onClick={onBack} className="button-secondary">Annuler</button>
                    )}
                    {step < steps.length ? (
                        <button onClick={() => setStep(s => s + 1)} className="button-primary" disabled={!currentStep.value.trim()}>Suivant</button>
                    ) : (
                        <button onClick={handleSave} className="button-primary" disabled={!currentStep.value.trim()}><SaveIcon /> Terminer</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const NarrativeArcViewer: React.FC<{
    entry: NarrativeArcEntry;
    onAnalyze: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
}> = ({ entry, onAnalyze, onUpdateConnections }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);

    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(entry.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    return (
        <div className="narrative-arc-viewer">
            <div className="narrative-arc-user-inputs">
                <div className="content-card">
                    <h4>La Situation</h4>
                    <p>{entry.situation}</p>
                </div>
                <div className="content-card">
                    <h4>Le Défi</h4>
                    <p>{entry.challenge}</p>
                </div>
                <div className="content-card">
                    <h4>Le Tournant</h4>
                    <p>{entry.turningPoint}</p>
                </div>
                <div className="content-card">
                    <h4>La Résolution & Leçon</h4>
                    <p>{entry.resolution}</p>
                </div>
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
                    currentEntryIdentifier={{ moduleId: 'narrative-arc', id: entry.id }}
                />
            )}

            <div className="journal-analysis-section">
                {entry.isAnalyzing && <AIInteraction messages={['Hal tisse les fils de votre histoire...', 'Recherche du thème central...', 'Rédaction du récit...']} />}
                {entry.analysisError && <ErrorMessage message="La création du récit a échoué." />}
                
                {entry.analysis ? (
                    <div className="story-display fade-in">
                        <h2>{entry.analysis.title}</h2>
                        <div className="story-content">{entry.analysis.story}</div>
                        <div className="key-lesson">
                            <strong><LightbulbIcon/> Leçon Clé :</strong>
                            <p>"{entry.analysis.keyLesson}"</p>
                        </div>
                    </div>
                ) : (
                    !entry.isAnalyzing && (
                        <button onClick={() => onAnalyze(entry.id)} className="button-primary" style={{ marginTop: '1rem' }}>
                            <AnalyzeIcon /> Tisser mon histoire
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export const NarrativeArcView: React.FC = () => {
    const [entries, setEntries] = useStorageState<NarrativeArcEntry[]>(NARRATIVE_ARC_STORAGE_KEY, []);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedEntry, setSelectedEntry] = useState<NarrativeArcEntry | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    const sortedEntries = React.useMemo(() =>
        [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]);

    const handleNew = () => {
        setSelectedEntry(null);
        setView('editor');
    };

    const handleSave = (data: Omit<NarrativeArcEntry, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError' | 'connections'>) => {
        const newEntry: NarrativeArcEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...data,
        };
        setEntries(prev => [newEntry, ...prev]);
        setSelectedEntry(newEntry);
        setView('viewer');
        showToast("Récit sauvegardé.", "success");
    };

    const handleAnalyze = async (entryId: string) => {
        const entryToAnalyze = entries.find(e => e.id === entryId);
        if (!entryToAnalyze) return;

        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isAnalyzing: true, analysisError: false } : e));
        if (selectedEntry?.id === entryId) setSelectedEntry(prev => prev ? {...prev, isAnalyzing: true, analysisError: false} : null);

        try {
            const analysis = await weaveNarrativeArcStory(entryToAnalyze, settings);
            const updatedEntries = entries.map(e => e.id === entryId ? { ...e, analysis, isAnalyzing: false } : e);
            setEntries(updatedEntries);
            if (selectedEntry?.id === entryId) {
                setSelectedEntry(updatedEntries.find(e => e.id === entryId) || null);
            }
        } catch (error) {
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isAnalyzing: false, analysisError: true } : e));
            if (selectedEntry?.id === entryId) setSelectedEntry(prev => prev ? {...prev, isAnalyzing: false, analysisError: true} : null);
            showToast("La génération de l'histoire a échoué.", "destructive");
        }
    };

    const handleDelete = (entryId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce récit ?")) {
            setEntries(prev => prev.filter(e => e.id !== entryId));
            setView('list');
            setSelectedEntry(null);
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

    const renderContent = () => {
        if (view === 'editor') {
            return <NarrativeArcEditor onSave={handleSave} onBack={() => setView('list')} />;
        }
        if (view === 'viewer' && selectedEntry) {
            return <NarrativeArcViewer entry={selectedEntry} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} />;
        }

        return (
            <>
                {sortedEntries.length === 0 ? (
                    <EmptyState
                        Icon={StoryIcon}
                        title="Donnez un sens à vos expériences"
                        message="Ce module vous aide à transformer les défis en récits de croissance. Racontez votre histoire pour en découvrir la force."
                        action={{ text: 'Commencer mon premier récit', onClick: handleNew }}
                    />
                ) : (
                    <div className="thought-case-list stagger-fade-in">
                        {sortedEntries.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="content-card thought-case-card"
                                onClick={() => { setSelectedEntry(entry); setView('viewer'); }}
                                style={{ '--stagger-index': index } as React.CSSProperties}
                            >
                                <h4>{entry.analysis?.title || entry.situation.substring(0, 50) + '...'}</h4>
                                <p>{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                                <p><em>Défi: {entry.challenge.substring(0, 100)}...</em></p>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Arc Narratif">
                {view === 'list' && <button onClick={handleNew} className="button-primary"><PlusIcon /> Nouveau Récit</button>}
                {view !== 'list' && <button onClick={() => { setView('list'); setSelectedEntry(null); }} className="button-secondary">Retour à la liste</button>}
                {view === 'viewer' && selectedEntry && (
                    <button onClick={() => handleDelete(selectedEntry.id)} className="button-icon destructive" title="Supprimer"><DeleteIcon /></button>
                )}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};