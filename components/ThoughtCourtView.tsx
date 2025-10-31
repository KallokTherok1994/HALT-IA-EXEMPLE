import React, { useState, useEffect } from 'react';
import { ThoughtCase, THOUGHT_COURT_STORAGE_KEY, Connection } from '../types';
import { analyzeThoughtCase } from '../services/generative-ai';
import { useStorageState } from '../hooks/useStorageState';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { AIInteraction } from './common/AIInteraction';
import { ErrorMessage } from './common/ErrorMessage';
import { PlusIcon, DeleteIcon, SaveIcon, AnalyzeIcon, ThoughtCourtIcon, LightbulbIcon, SparklesIcon, LinkIcon, GavelIcon, ThumbsUpIcon, ThumbsDownIcon, CheckCircleIcon, HelpCircleIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useSettings } from '../contexts/SettingsContext';
import { ProgressBar } from './common/ProgressBar';
import { useBadges } from '../contexts/BadgeContext';

interface ThoughtCourtViewProps {
    initialEntryId?: string;
}

type ViewMode = 'list' | 'editor' | 'viewer';

const ThoughtCaseEditor: React.FC<{
    caseToEdit: Partial<ThoughtCase> | null;
    onSave: (data: Omit<ThoughtCase, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError'>) => void;
    onBack: () => void;
}> = ({ caseToEdit, onSave, onBack }) => {
    const [step, setStep] = useState(1);
    const [negativeThought, setNegativeThought] = useState(caseToEdit?.negativeThought || '');
    const [evidenceFor, setEvidenceFor] = useState(caseToEdit?.evidenceFor || '');
    const [evidenceAgainst, setEvidenceAgainst] = useState(caseToEdit?.evidenceAgainst || '');
    const [balancedThought, setBalancedThought] = useState(caseToEdit?.balancedThought || '');
    const { showToast } = useToast();

    const handleSave = () => {
        if (!negativeThought.trim()) {
            showToast("La pensée négative est requise.", "destructive");
            return;
        }
        onSave({ negativeThought, evidenceFor, evidenceAgainst, balancedThought });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="fade-in">
                        <h3>Étape 1: La Pensée à Juger</h3>
                        <div className="form-group">
                            <label>Quelle pensée négative ou automatique vous préoccupe ?</label>
                            <textarea value={negativeThought} onChange={e => setNegativeThought(e.target.value)} rows={4} />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="fade-in">
                        <h3>Étape 2: L'Examen des Preuves</h3>
                        <div className="thought-editor-evidence-grid">
                            <div className="evidence-column prosecution">
                                <h4><ThumbsDownIcon /> Preuves à charge</h4>
                                <textarea value={evidenceFor} onChange={e => setEvidenceFor(e.target.value)} rows={6} placeholder="Qu'est-ce qui soutient cette pensée ?"/>
                            </div>
                             <div className="evidence-column defense">
                                <h4><ThumbsUpIcon /> Preuves à décharge</h4>
                                <textarea value={evidenceAgainst} onChange={e => setEvidenceAgainst(e.target.value)} rows={6} placeholder="Qu'est-ce qui contredit cette pensée ?"/>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="fade-in">
                         <h3>Étape 3: Le Verdict</h3>
                         <div className="form-group">
                            <label>Quelle est une pensée plus équilibrée, nuancée et réaliste ?</label>
                            <textarea value={balancedThought} onChange={e => setBalancedThought(e.target.value)} rows={4} placeholder="Trouvez un juste milieu..."/>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="thought-case-editor">
            <ProgressBar progress={(step / 3) * 100} progressText={`Étape ${step} sur 3`} />
            <div className="editor-content" style={{ marginTop: 'var(--spacing-lg)' }}>
                {renderStep()}
            </div>
            <div className="wizard-actions">
                {step > 1 ? 
                    <button type="button" onClick={() => setStep(s => s - 1)} className="button-secondary">Précédent</button> :
                    <button type="button" onClick={onBack} className="button-secondary">Annuler</button>
                }
                {step < 3 ?
                    <button type="button" onClick={() => setStep(s => s + 1)} className="button-primary" disabled={step === 1 && !negativeThought.trim()}>Suivant</button> :
                    <button type="button" onClick={handleSave} className="button-primary"><SaveIcon /> Enregistrer</button>
                }
            </div>
        </div>
    );
};

const ThoughtCaseViewer: React.FC<{
    caseData: ThoughtCase;
    onAnalyze: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
}> = ({ caseData, onAnalyze, onUpdateConnections }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(caseData.id, newConnections);
        setIsConnectionManagerOpen(false);
    };
    
    return (
        <div className="thought-case-viewer fade-in">
            <div className="thought-section">
                <h4><ThoughtCourtIcon /> L'affaire</h4>
                <h3>"{caseData.negativeThought}"</h3>
            </div>

            <div className="thought-editor-evidence-grid">
                <div className="evidence-column prosecution">
                    <h4><ThumbsDownIcon /> Preuves à charge</h4>
                    <p>{caseData.evidenceFor || "Aucune preuve fournie."}</p>
                </div>
                <div className="evidence-column defense">
                    <h4><ThumbsUpIcon /> Preuves à décharge</h4>
                    <p>{caseData.evidenceAgainst || "Aucune preuve fournie."}</p>
                </div>
            </div>

            <div className="thought-section verdict-section">
                <h4><GavelIcon /> Le Verdict : Pensée Équilibrée</h4>
                <p>{caseData.balancedThought || "Aucune pensée équilibrée fournie."}</p>
            </div>
            
            <ConnectionsDisplay connections={caseData.connections} />
            <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                <LinkIcon /> Gérer les connexions
            </button>
            {isConnectionManagerOpen && (
                <ConnectionManagerModal
                    isOpen={isConnectionManagerOpen}
                    onClose={() => setIsConnectionManagerOpen(false)}
                    currentConnections={caseData.connections || []}
                    onSave={handleSaveConnections}
                    currentEntryIdentifier={{ moduleId: 'thought-court', id: caseData.id }}
                />
            )}

            <div className="journal-analysis-section">
                 <div className="analysis-item">
                    <div className="icon"><SparklesIcon /></div>
                    <h4>L'avis de l'expert Hal</h4>
                </div>

                {caseData.isAnalyzing && (
                    <AIInteraction messages={[
                        "Examen des pièces à conviction...",
                        "Identification des sophismes...",
                        "Préparation du rapport..."
                    ]} />
                )}
                {caseData.analysisError && <ErrorMessage message="L'analyse a échoué. Réessayez." />}

                {caseData.analysis ? (
                    <div className="fade-in">
                        <div className="analysis-item">
                            <div className="icon"><LightbulbIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Distorsions cognitives possibles :</strong>
                                <div className="analysis-pills">
                                    {caseData.analysis.distortions.map(d => <span key={d} className="analysis-pill">{d}</span>)}
                                </div>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><SparklesIcon /></div>
                             <div className="analysis-item-content">
                                <strong>Perspectives alternatives :</strong>
                                <ul>
                                    {caseData.analysis.alternativePerspectives.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><GavelIcon /></div>
                             <div className="analysis-item-content">
                                <strong>Suggestion de verdict :</strong>
                                <p className="reflection-question">"{caseData.analysis.balancedThought}"</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    !caseData.isAnalyzing && (
                        <button onClick={() => onAnalyze(caseData.id)} className="button-primary" style={{marginTop: '1rem'}}>
                            <AnalyzeIcon/> Demander l'analyse de Hal
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export const ThoughtCourtView: React.FC<ThoughtCourtViewProps> = ({ initialEntryId }) => {
    const [cases, setCases] = useStorageState<ThoughtCase[]>(THOUGHT_COURT_STORAGE_KEY, []);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedCase, setSelectedCase] = useState<ThoughtCase | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { checkForNewBadges } = useBadges();

    useEffect(() => {
        if (initialEntryId) {
            const caseToShow = cases.find(c => c.id === initialEntryId);
            if (caseToShow) {
                setSelectedCase(caseToShow);
                setView('viewer');
            }
        }
    }, [initialEntryId, cases]);

    const handleNew = () => {
        setSelectedCase(null);
        setView('editor');
    };

    const handleSave = (data: Omit<ThoughtCase, 'id' | 'date' | 'analysis' | 'isAnalyzing' | 'analysisError'>) => {
        const newCase: ThoughtCase = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...data,
        };
        setCases(prev => [newCase, ...prev]);
        setView('list');
        checkForNewBadges();
    };
    
    const handleUpdateConnections = (caseId: string, connections: Connection[]) => {
        const updatedCases = cases.map(c => c.id === caseId ? { ...c, connections, analysis: undefined } : c);
        setCases(updatedCases);
        if (selectedCase?.id === caseId) {
            setSelectedCase(prev => prev ? { ...prev, connections, analysis: undefined } : null);
        }
        showToast("Connexions mises à jour. L'analyse a été réinitialisée.", "success");
    };
    
    const handleAnalyze = async (caseId: string) => {
        const caseToAnalyze = cases.find(c => c.id === caseId);
        if (!caseToAnalyze) return;

        setCases(prev => prev.map(c => c.id === caseId ? { ...c, isAnalyzing: true, analysisError: false } : c));
        if (selectedCase?.id === caseId) {
            setSelectedCase(prev => prev ? { ...prev, isAnalyzing: true, analysisError: false } : null);
        }

        try {
            const analysis = await analyzeThoughtCase(
                caseToAnalyze.negativeThought,
                caseToAnalyze.evidenceFor,
                caseToAnalyze.evidenceAgainst,
                settings,
                caseToAnalyze.connections
            );
            setCases(prev => prev.map(c => c.id === caseId ? { ...c, analysis, isAnalyzing: false } : c));
             if (selectedCase?.id === caseId) {
                setSelectedCase(prev => prev ? { ...prev, analysis, isAnalyzing: false } : null);
            }
        } catch (error) {
            setCases(prev => prev.map(c => c.id === caseId ? { ...c, isAnalyzing: false, analysisError: true } : c));
             if (selectedCase?.id === caseId) {
                setSelectedCase(prev => prev ? { ...prev, isAnalyzing: false, analysisError: true } : null);
            }
            showToast("L'analyse a échoué. Veuillez réessayer.", "destructive");
        }
    };

    const handleDelete = (caseId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette analyse ?")) {
            setCases(prev => prev.filter(c => c.id !== caseId));
            setView('list');
            setSelectedCase(null);
            showToast("Analyse supprimée.", "info");
        }
    };


    const renderContent = () => {
        if (view === 'editor') {
            return <ThoughtCaseEditor caseToEdit={selectedCase} onSave={handleSave} onBack={() => setView('list')} />;
        }

        if (view === 'viewer' && selectedCase) {
             return <ThoughtCaseViewer caseData={selectedCase} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} />;
        }

        return (
            <>
                {cases.length === 0 ? (
                    <EmptyState
                        Icon={ThoughtCourtIcon}
                        title="Mettez vos pensées au défi"
                        message="Le Tribunal des Pensées vous aide à examiner vos pensées négatives et à trouver une perspective plus équilibrée."
                        action={{ text: 'Commencer ma première analyse', onClick: handleNew }}
                    />
                ) : (
                    <div className="thought-case-list stagger-fade-in">
                        {cases.map((c, index) => (
                            <div 
                                key={c.id} 
                                className="content-card thought-case-card"
                                onClick={() => { setSelectedCase(c); setView('viewer'); }}
                                style={{ '--stagger-index': index } as React.CSSProperties}
                            >
                                <div className="card-header">
                                    <h4>"{c.negativeThought}"</h4>
                                    <div className={`thought-card-status ${c.analysis ? 'analyzed' : ''}`}>
                                        {c.analysis ? <CheckCircleIcon/> : <HelpCircleIcon/>}
                                        <span>{c.analysis ? 'Analysé' : 'Non analysé'}</span>
                                    </div>
                                </div>
                                <p>{new Date(c.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Tribunal des Pensées">
                {view === 'list' && (
                    <button onClick={handleNew} className="button-primary"><PlusIcon /> Nouvelle Analyse</button>
                )}
                 {view === 'viewer' && selectedCase && (
                     <button type="button" onClick={() => handleDelete(selectedCase.id)} className="button-icon destructive" title="Supprimer l'analyse"><DeleteIcon/></button>
                )}
                 {view !== 'list' && (
                    <button onClick={() => setView('list')} className="button-secondary">Retour à la liste</button>
                )}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};