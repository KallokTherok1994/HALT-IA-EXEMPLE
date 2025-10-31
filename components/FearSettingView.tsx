import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FearSettingExercise, FearSettingScenario, FEAR_SETTING_STORAGE_KEY, Connection, FearSettingAnalysis } from '../types';
import { storage } from '../utils/storage';
import { generateFearSettingSuggestions, analyzeFearSettingExercise } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { PlusIcon, DeleteIcon, ShieldIcon, SparklesIcon, SaveIcon, LinkIcon, LightbulbIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { EmptyState } from './common/EmptyState';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useSettings } from '../contexts/SettingsContext';
import { ErrorMessage } from './common/ErrorMessage';
import { AIInteraction } from './common/AIInteraction';
import { ProgressBar } from './common/ProgressBar';

type ViewMode = 'list' | 'editor' | 'viewer';
type EditorStep = 1 | 2 | 3;

const FearSettingEditor: React.FC<{
    onSave: (exercise: Omit<FearSettingExercise, 'id' | 'date'>) => void;
    onBack: () => void;
}> = ({ onSave, onBack }) => {
    const [step, setStep] = useState<EditorStep>(1);
    const [action, setAction] = useState('');
    const [scenarios, setScenarios] = useState<Omit<FearSettingScenario, 'prevention' | 'repair'>[]>([{ id: Date.now().toString(), fear: '' }]);
    const [mitigation, setMitigation] = useState<{ [key: string]: { prevention: string; repair: string } }>({});
    const [benefits, setBenefits] = useState('');
    const [costOfInaction, setCostOfInaction] = useState({ sixMonths: '', oneYear: '', threeYears: '' });
    const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null);
    const { showToast } = useToast();

    const handleAddScenario = () => setScenarios([...scenarios, { id: Date.now().toString(), fear: '' }]);
    const handleRemoveScenario = (id: string) => setScenarios(scenarios.filter(s => s.id !== id));
    const handleScenarioChange = (id: string, value: string) => {
        setScenarios(scenarios.map(s => s.id === id ? { ...s, fear: value } : s));
    };
    
    const handleGetSuggestions = async (scenario: Omit<FearSettingScenario, 'prevention' | 'repair'>) => {
        if (!scenario.fear.trim()) {
            showToast("Veuillez d'abord décrire la peur.", "destructive");
            return;
        }
        if (!action.trim()) {
            showToast("Veuillez d'abord définir l'action que vous envisagez à l'étape 1.", "destructive");
            return;
        }
        setLoadingSuggestions(scenario.id);
        try {
            const result = await generateFearSettingSuggestions(action, scenario.fear);
            setMitigation(prev => ({
                ...prev,
                [scenario.id]: {
                    prevention: `- ${result.prevention.join('\n- ')}`,
                    repair: `- ${result.repair.join('\n- ')}`,
                }
            }));
        } catch (err) {
            showToast("La suggestion de stratégies par l'IA a échoué. Veuillez réessayer.", "destructive");
        } finally {
            setLoadingSuggestions(null);
        }
    };

    const handleSave = () => {
        const finalScenarios: FearSettingScenario[] = scenarios.map(s => ({
            ...s,
            prevention: mitigation[s.id]?.prevention || '',
            repair: mitigation[s.id]?.repair || '',
        }));

        onSave({ action, scenarios: finalScenarios, benefits, costOfInaction });
    };

    const renderStep = () => {
        switch (step) {
            case 1: return (
                <div className="wizard-step">
                    <h3>Étape 1: Définir la Peur</h3>
                    <div className="form-group">
                        <label>Quelle action ou décision envisagez-vous ?</label>
                        <input type="text" value={action} onChange={e => setAction(e.target.value)} placeholder="Ex: Quitter mon travail pour lancer mon projet" />
                    </div>
                    <div className="form-group">
                        <label>Quels sont les pires scénarios que vous imaginez si vous le faisiez ?</label>
                        <div className="scenario-list-editor">
                            {scenarios.map(s => (
                                <div key={s.id} className="scenario-item-editor">
                                    <input type="text" value={s.fear} onChange={e => handleScenarioChange(s.id, e.target.value)} placeholder="Le pire qui pourrait arriver..." />
                                    <button type="button" onClick={() => handleRemoveScenario(s.id)} className="button-icon destructive"><DeleteIcon /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddScenario} className="button-secondary" style={{ marginTop: '1rem' }}>Ajouter un scénario</button>
                    </div>
                    <div className="wizard-actions">
                        <button type="button" onClick={onBack} className="button-secondary">Annuler</button>
                        <button type="button" onClick={() => setStep(2)} className="button-primary" disabled={!action.trim() || scenarios.some(s => !s.fear.trim())}>Continuer</button>
                    </div>
                </div>
            );
            case 2: return (
                <div className="wizard-step">
                    <h3>Étape 2: Atténuer les Risques</h3>
                    <p>Pour chaque scénario, réfléchissez à comment l'empêcher (Prévention) et comment le réparer s'il se produisait (Réparation).</p>
                     {scenarios.map(s => (
                        <div key={s.id} className="mitigation-editor-item">
                            <h4>Scénario : "{s.fear}"</h4>
                             <button type="button" onClick={() => handleGetSuggestions(s)} className="button-secondary" disabled={!!loadingSuggestions}>
                                <SparklesIcon className={loadingSuggestions === s.id ? 'spinning' : ''} /> Suggérer des stratégies
                            </button>
                            <div className="form-group">
                                <label>Prévention</label>
                                <textarea 
                                    value={mitigation[s.id]?.prevention || ''}
                                    onChange={e => setMitigation(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || { repair: '' }), prevention: e.target.value } }))}
                                    rows={4}
                                />
                            </div>
                            <div className="form-group">
                                <label>Réparation</label>
                                <textarea
                                    value={mitigation[s.id]?.repair || ''}
                                    onChange={e => setMitigation(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || { prevention: '' }), repair: e.target.value } }))}
                                    rows={4}
                                />
                            </div>
                        </div>
                    ))}
                    <div className="wizard-actions">
                        <button type="button" onClick={() => setStep(1)} className="button-secondary">Précédent</button>
                        <button type="button" onClick={() => setStep(3)} className="button-primary">Continuer</button>
                    </div>
                </div>
            );
            case 3:
                return (
                    <div className="wizard-step">
                        <h3>Étape 3: Bénéfices &amp; Coût de l'Inaction</h3>
                        <div className="form-group">
                            <label>Quels sont les bénéfices potentiels d'un succès, même partiel ?</label>
                            <textarea value={benefits} onChange={e => setBenefits(e.target.value)} rows={4} placeholder="Ex: Fierté, apprentissage, nouvelles opportunités..." />
                        </div>
                        <div className="form-group">
                            <label>Quel est le coût de l'inaction (si vous ne faites rien) ?</label>
                            <div className="cost-of-inaction">
                                <label>Dans 6 mois</label>
                                <input type="text" value={costOfInaction.sixMonths} onChange={e => setCostOfInaction(prev => ({ ...prev, sixMonths: e.target.value }))} />
                                <label>Dans 1 an</label>
                                <input type="text" value={costOfInaction.oneYear} onChange={e => setCostOfInaction(prev => ({ ...prev, oneYear: e.target.value }))} />
                                <label>Dans 3 ans</label>
                                <input type="text" value={costOfInaction.threeYears} onChange={e => setCostOfInaction(prev => ({ ...prev, threeYears: e.target.value }))} />
                            </div>
                        </div>
                        <div className="wizard-actions">
                            <button type="button" onClick={() => setStep(2)} className="button-secondary">Précédent</button>
                            <button type="button" onClick={handleSave} className="button-primary"><SaveIcon /> Enregistrer l'exercice</button>
                        </div>
                    </div>
                );
        }
    };
    return renderStep();
};

const FearSettingViewer: React.FC<{ 
    exercise: FearSettingExercise;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
    onAnalyze: (id: string) => void;
}> = ({ exercise, onUpdateConnections, onAnalyze }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(exercise.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    const progress = useMemo(() => {
        let completed = 0;
        const total = 1 + (exercise.scenarios.length * 3) + 1 + 3; // action + 3*scenarios + benefits + 3*cost

        if (exercise.action?.trim()) completed++;
        
        exercise.scenarios.forEach(s => {
            if (s.fear?.trim()) completed++;
            if (s.prevention?.trim()) completed++;
            if (s.repair?.trim()) completed++;
        });

        if (exercise.benefits?.trim()) completed++;
        if (exercise.costOfInaction.sixMonths?.trim()) completed++;
        if (exercise.costOfInaction.oneYear?.trim()) completed++;
        if (exercise.costOfInaction.threeYears?.trim()) completed++;

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }, [exercise]);

    return (
        <div className="fear-setting-viewer fade-in">
            <div className="content-card">
                <h3>Action Envisagée</h3>
                <h2>{exercise.action}</h2>
                <ProgressBar progress={progress} progressText={`Progression de l'exercice : ${progress}%`} />
            </div>

            <div className="content-card">
                <h3>Pires scénarios &amp; stratégies</h3>
                {exercise.scenarios.map(scenario => (
                    <div key={scenario.id} className="scenario-view-item">
                        <h4>{scenario.fear}</h4>
                        <div className="mitigation-view">
                            <div><strong>Prévention:</strong> <pre>{scenario.prevention || "Non défini"}</pre></div>
                            <div><strong>Réparation:</strong> <pre>{scenario.repair || "Non défini"}</pre></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="content-card">
                <h3>Bénéfices Potentiels</h3>
                <pre>{exercise.benefits || "Non défini"}</pre>
            </div>
            
            <div className="content-card">
                <h3>Coût de l'Inaction</h3>
                <div className="cost-view">
                    <p><strong>Dans 6 mois:</strong> {exercise.costOfInaction.sixMonths || "Non défini"}</p>
                    <p><strong>Dans 1 an:</strong> {exercise.costOfInaction.oneYear || "Non défini"}</p>
                    <p><strong>Dans 3 ans:</strong> {exercise.costOfInaction.threeYears || "Non défini"}</p>
                </div>
            </div>

            <div className="content-card">
                <ConnectionsDisplay connections={exercise.connections} />
                <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                    <LinkIcon /> Gérer les connexions
                </button>
            </div>
            {isConnectionManagerOpen && (
                <ConnectionManagerModal
                    isOpen={isConnectionManagerOpen}
                    onClose={() => setIsConnectionManagerOpen(false)}
                    currentConnections={exercise.connections || []}
                    onSave={handleSaveConnections}
                    currentEntryIdentifier={{ moduleId: 'fear-setting', id: exercise.id }}
                />
            )}
            
            <div className="journal-analysis-section">
                {exercise.isAnalyzing && (
                    <AIInteraction messages={["Analyse de vos peurs...", "Identification des schémas...", "Recherche de perspectives encourageantes..."]} />
                )}
                {exercise.analysisError && <ErrorMessage message="L'analyse a échoué. Veuillez réessayer." />}

                {exercise.analysis ? (
                    <div className="content-card fade-in">
                        <h3>Analyse de Hal</h3>
                        <div className="analysis-item">
                            <div className="icon"><SparklesIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Résumé</strong>
                                <p>{exercise.analysis.summary}</p>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><ShieldIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Peur Fondamentale Identifiée</strong>
                                <p><strong>{exercise.analysis.coreFear}</strong></p>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><LightbulbIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Perspective Encourageante</strong>
                                <p className="reflection-question">"{exercise.analysis.empoweringInsight}"</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    !exercise.isAnalyzing && (
                        <div className="content-card" style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                            <p>Obtenez une perspective de l'IA sur votre exercice pour y voir plus clair.</p>
                            <button onClick={() => onAnalyze(exercise.id)} className="button-primary">
                                <SparklesIcon /> Analyser avec Hal
                            </button>
                        </div>
                    )
                )}
            </div>

        </div>
    );
};

export const FearSettingView: React.FC = () => {
    const [exercises, setExercises] = useState<FearSettingExercise[]>(() => storage.get(FEAR_SETTING_STORAGE_KEY, []));
    const [view, setView] = useState<ViewMode>('list');
    const [selectedExercise, setSelectedExercise] = useState<FearSettingExercise | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    useEffect(() => {
        storage.set(FEAR_SETTING_STORAGE_KEY, exercises);
    }, [exercises]);

    const handleNew = () => {
        setSelectedExercise(null);
        setView('editor');
    };

    const handleSave = (data: Omit<FearSettingExercise, 'id' | 'date'>) => {
        const newExercise: FearSettingExercise = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...data,
        };
        setExercises(prev => [newExercise, ...prev]);
        setView('list');
        showToast("Exercice sauvegardé.", "success");
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet exercice ?")) {
            setExercises(prev => prev.filter(e => e.id !== id));
            setView('list');
            setSelectedExercise(null);
        }
    };
    
    const handleUpdateConnections = (exerciseId: string, connections: Connection[]) => {
        setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, connections, analysis: undefined } : ex));
        if (selectedExercise?.id === exerciseId) {
            setSelectedExercise(prev => prev ? { ...prev, connections, analysis: undefined } : null);
        }
        showToast("Connexions mises à jour. L'analyse a été réinitialisée.", "success");
    };
    
    const handleAnalyze = async (exerciseId: string) => {
        const exerciseToAnalyze = exercises.find(ex => ex.id === exerciseId);
        if (!exerciseToAnalyze) return;

        setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, isAnalyzing: true, analysisError: false } : ex));
        setSelectedExercise(prev => (prev && prev.id === exerciseId) ? { ...prev, isAnalyzing: true, analysisError: false } : prev);

        try {
            const analysis = await analyzeFearSettingExercise(exerciseToAnalyze, settings);
            
            setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, analysis, isAnalyzing: false } : ex));
            setSelectedExercise(prev => (prev && prev.id === exerciseId) ? { ...prev, analysis, isAnalyzing: false } : prev);

        } catch (error) {
            setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, isAnalyzing: false, analysisError: true } : ex));
            setSelectedExercise(prev => (prev && prev.id === exerciseId) ? { ...prev, isAnalyzing: false, analysisError: true } : prev);
            showToast("L'analyse a échoué. Veuillez réessayer.", "destructive");
        }
    };


    const renderContent = () => {
        if (view === 'editor') {
            return <FearSettingEditor onSave={handleSave} onBack={() => setView('list')} />;
        }

        if (view === 'viewer' && selectedExercise) {
            return <FearSettingViewer exercise={selectedExercise} onUpdateConnections={handleUpdateConnections} onAnalyze={handleAnalyze} />;
        }
        
        return (
            exercises.length === 0 ? (
                <EmptyState
                    Icon={ShieldIcon}
                    title="Décomposez vos peurs"
                    message="Cet exercice vous aide à clarifier vos peurs pour prendre des décisions plus audacieuses et informées."
                    action={{ text: "Commencer mon premier exercice", onClick: handleNew }}
                />
            ) : (
                <div className="thought-case-list stagger-fade-in">
                    {exercises.map((ex, index) => (
                        <div 
                            key={ex.id} 
                            className="content-card thought-case-card"
                            onClick={() => { setSelectedExercise(ex); setView('viewer'); }}
                            style={{ '--stagger-index': index } as React.CSSProperties}
                        >
                            <h4>{ex.action}</h4>
                            <p>{new Date(ex.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                    ))}
                </div>
            )
        );
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Analyse des Peurs">
                {view === 'list' && <button onClick={handleNew} className="button-primary"><PlusIcon /> Nouvel Exercice</button>}
                {view !== 'list' && <button onClick={() => setView('list')} className="button-secondary">Retour</button>}
                {view === 'viewer' && selectedExercise && <button onClick={() => handleDelete(selectedExercise.id)} className="button-icon destructive" title="Supprimer"><DeleteIcon /></button>}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};