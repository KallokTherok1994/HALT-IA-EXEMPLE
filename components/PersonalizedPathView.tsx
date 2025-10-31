import React, { useState, useCallback } from 'react';
import { PersonalizedPath, PERSONALIZED_PATH_STORAGE_KEY, PathStep, ModuleId } from '../types';
import { generatePersonalizedPath } from '../services/generative-ai';
import { useStorageState } from '../hooks/useStorageState';
import { useSettings } from '../contexts/SettingsContext';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { LoadingIndicator } from './common/LoadingIndicator';
import { AIInteraction } from './common/AIInteraction';
import { PathIcon, SparklesIcon } from '../icons';
import { modules } from '../data';

const PathCreationView: React.FC<{
    onStartPath: (goal: string) => void;
    isLoading: boolean;
}> = ({ onStartPath, isLoading }) => {
    const [goal, setGoal] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (goal.trim() && !isLoading) {
            onStartPath(goal.trim());
        }
    };

    const handlePredefinedClick = (text: string) => {
        setGoal(text);
    };

    return (
        <div className="path-creation-view">
            <EmptyState
                Icon={PathIcon}
                title="Créez votre parcours sur mesure"
                message="Décrivez un objectif ou un défi personnel, et laissez Hal concevoir une feuille de route personnalisée en utilisant les outils de l'application."
            />
            <div className="scenario-selection" style={{maxWidth: '700px', margin: '0 auto'}}>
                <h4>Quelques idées pour commencer :</h4>
                <div className="scenario-grid">
                    <button className="scenario-card" onClick={() => handlePredefinedClick("Mieux gérer mon stress au quotidien")}>Mieux gérer mon stress</button>
                    <button className="scenario-card" onClick={() => handlePredefinedClick("Trouver plus de clarté sur mes priorités de vie")}>Clarifier mes priorités</button>
                    <button className="scenario-card" onClick={() => handlePredefinedClick("Améliorer ma confiance en moi dans mes relations")}>Améliorer ma confiance en moi</button>
                </div>
            </div>
            <form onSubmit={handleSubmit} style={{maxWidth: '700px', margin: '0 auto', marginTop: 'var(--spacing-lg)'}}>
                <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ex: Je veux me sentir plus aligné(e) avec mes valeurs..."
                    rows={3}
                    disabled={isLoading}
                />
                <button type="submit" className="button-primary" disabled={isLoading || !goal.trim()}>
                    <SparklesIcon /> Générer mon parcours
                </button>
            </form>
        </div>
    );
};

const PathDisplayView: React.FC<{
    path: PersonalizedPath;
    onUpdateStep: (stepIndex: number, completed: boolean) => void;
}> = ({ path, onUpdateStep }) => {
    const { navigateTo } = useAppContext();
    const currentDayIndex = path.steps.findIndex(s => !s.completed);
    
    const getModuleIcon = (moduleId: ModuleId) => {
        const module = modules.find(m => m.id === moduleId);
        return module ? module.icon : SparklesIcon;
    };

    return (
        <div className="path-display-view">
            <div className="path-timeline"></div>
            <div className="content-card" style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
                <h2>{path.title}</h2>
                <p><em>{path.description}</em></p>
            </div>
            
            <div className="stagger-fade-in">
                {path.steps.map((step, index) => {
                    const Icon = getModuleIcon(step.moduleId);
                    let statusClass = '';
                    if (step.completed) statusClass = 'completed';
                    else if (index === currentDayIndex) statusClass = 'current';

                    return (
                        <div key={index} className={`path-step ${statusClass}`} style={{ '--stagger-index': index } as React.CSSProperties}>
                            <div className="path-step-marker"></div>
                            <div className="path-step-card content-card">
                                <div className="path-step-header">
                                    <span className="path-step-day">Jour {step.day}</span>
                                    <h4>{step.title}</h4>
                                </div>
                                <div className="path-step-content">
                                    <div className="path-step-icon"><Icon /></div>
                                    <div className="path-step-details">
                                        <p>{step.task}</p>
                                        <div className="path-step-actions">
                                            <button className="button-secondary" onClick={() => navigateTo(step.moduleId)}>
                                                Commencer
                                            </button>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={step.completed}
                                                    onChange={(e) => onUpdateStep(index, e.target.checked)}
                                                />
                                                Terminé
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const PersonalizedPathView: React.FC = () => {
    const [path, setPath] = useStorageState<PersonalizedPath | null>(PERSONALIZED_PATH_STORAGE_KEY, null);
    const [isLoading, setIsLoading] = useState(false);
    const { settings } = useSettings();
    const { showToast } = useToast();

    const handleStartPath = useCallback(async (userGoal: string) => {
        setIsLoading(true);
        try {
            const result = await generatePersonalizedPath(userGoal, settings);
            const newPath: PersonalizedPath = {
                id: Date.now().toString(),
                userGoal,
                title: result.title,
                description: result.description,
                steps: result.steps.map(step => ({ ...step, completed: false })),
            };
            setPath(newPath);
            showToast("Votre parcours personnalisé est prêt !", "success");
        } catch (error) {
            console.error(error);
            showToast("La création du parcours a échoué. Veuillez réessayer.", "destructive");
        } finally {
            setIsLoading(false);
        }
    }, [settings, setPath, showToast]);

    const handleUpdateStep = (stepIndex: number, completed: boolean) => {
        if (!path) return;
        const newSteps = [...path.steps];
        newSteps[stepIndex].completed = completed;
        setPath({ ...path, steps: newSteps });
    };

    const handleReset = () => {
        if (window.confirm("Êtes-vous sûr de vouloir abandonner ce parcours ? Votre progression sera perdue.")) {
            setPath(null);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <AIInteraction messages={['Hal conçoit votre parcours...', 'Sélection des meilleurs outils pour vous...', 'Personnalisation des étapes...']} />;
        }
        if (path) {
            return <PathDisplayView path={path} onUpdateStep={handleUpdateStep} />;
        }
        return <PathCreationView onStartPath={handleStartPath} isLoading={isLoading} />;
    };

    return (
        <div className="module-view personalized-path-view fade-in">
            <ModuleHeader title="Parcours Personnalisé">
                {path && (
                    <button onClick={handleReset} className="button-secondary">Recommencer</button>
                )}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};