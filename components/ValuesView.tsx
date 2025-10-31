import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserValues, VALUES_STORAGE_KEY } from '../types';
import { generateValueReflection, generateValueMicroActions } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { GripVerticalIcon, RefreshCwIcon, LightbulbIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { useStorageState } from '../hooks/useStorageState';
import { useBadges } from '../contexts/BadgeContext';

const VALUE_OPTIONS = [
  'Authenticité', 'Accomplissement', 'Aventure', 'Autorité', 'Autonomie',
  'Équilibre', 'Beauté', 'Audace', 'Compassion', 'Défi', 'Amitié',
  'Citoyenneté', 'Communauté', 'Compétence', 'Contribution', 'Créativité',
  'Curiosité', 'Détermination', 'Équité', 'Excellence', 'Enthousiasme',
  'Foi', 'Famille', 'Liberté', 'Plaisir', 'Croissance', 'Honnêteté',
  'Humour', 'Influence', 'Harmonie Intérieure', 'Justice', 'Gentillesse',
  'Connaissance', 'Leadership', 'Apprentissage', 'Amour', 'Loyauté',
  'Sens', 'Nature', 'Ouverture', 'Optimisme', 'Paix', 'Perfection',
  'Plaisir', 'Popularité', 'Reconnaissance', 'Réputation', 'Respect',
  'Responsabilité', 'Sécurité', 'Service', 'Spiritualité', 'Stabilité',
  'Succès', 'Statut', 'Confiance', 'Richesse', 'Sagesse'
];

const SELECTION_LIMIT = 5;

type ViewMode = 'selection' | 'prioritization' | 'dashboard';
type LoadingStates = { [key: string]: boolean };
type ActionStates = { [key: string]: string[] | undefined };

export const ValuesView: React.FC = () => {
    const [userValues, setUserValues] = useStorageState<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} });
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [tempSelected, setTempSelected] = useState<string[]>([]);
    const [tempPrioritized, setTempPrioritized] = useState<string[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState<LoadingStates>({});
    const [loadingActions, setLoadingActions] = useState<string | null>(null);
    const [actions, setActions] = useState<ActionStates>({});
    const { showToast } = useToast();
    const { checkForNewBadges } = useBadges();
    
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (userValues.prioritizedValues.length === 0) {
            setViewMode('selection');
        } else {
            setViewMode('dashboard');
        }
    }, [userValues.prioritizedValues.length]);

    const handleGenerateQuestion = useCallback(async (value: string, force = false) => {
        if (userValues.reflectionQuestions[value] && !force) return;

        setLoadingQuestions(prev => ({ ...prev, [value]: true }));
        try {
            const question = await generateValueReflection(value);
            setUserValues(prev => ({
                ...prev,
                reflectionQuestions: { ...prev.reflectionQuestions, [value]: question }
            }));
        } catch (error) {
            console.error(`Failed to generate question for ${value}`, error);
            showToast(`La génération de question pour "${value}" a échoué.`, "destructive");
        } finally {
            setLoadingQuestions(prev => ({ ...prev, [value]: false }));
        }
    }, [userValues.reflectionQuestions, showToast, setUserValues]);

    useEffect(() => {
        if (viewMode === 'dashboard') {
            userValues.prioritizedValues.forEach(value => {
                if (!userValues.reflectionQuestions[value] && !loadingQuestions[value]) {
                    handleGenerateQuestion(value);
                }
            });
        }
    }, [viewMode, userValues.prioritizedValues, userValues.reflectionQuestions, loadingQuestions, handleGenerateQuestion]);

    const handleGenerateActions = useCallback(async (value: string) => {
        setLoadingActions(value);
        try {
            const result = await generateValueMicroActions(value);
            setActions(prev => ({ ...prev, [value]: result }));
        } catch (error) {
            console.error(`Failed to generate actions for ${value}`, error);
            showToast(`La génération d'actions pour "${value}" a échoué.`, "destructive");
        } finally {
            setLoadingActions(null);
        }
    }, [showToast]);

    const handleValueToggle = (value: string) => {
        setTempSelected(prev => {
            if (prev.includes(value)) {
                return prev.filter(v => v !== value);
            }
            if (prev.length < SELECTION_LIMIT) {
                // If it's a new selection and we don't have a question for it, generate one.
                if (!userValues.reflectionQuestions[value] && !loadingQuestions[value]) {
                    handleGenerateQuestion(value);
                }
                return [...prev, value];
            }
            return prev;
        });
    };

    const handleConfirmSelection = () => {
        setTempPrioritized(tempSelected);
        setViewMode('prioritization');
    };

    const handleSavePrioritization = () => {
        setUserValues(prev => ({ ...prev, prioritizedValues: tempPrioritized }));
        setViewMode('dashboard');
        checkForNewBadges();
    };
    
    const handleReset = () => {
        if (window.confirm("Êtes-vous sûr de vouloir redéfinir vos valeurs ? Vos questions de réflexion actuelles seront perdues.")) {
            setTempSelected([]);
            setTempPrioritized([]);
            setUserValues({ prioritizedValues: [], reflectionQuestions: {} });
            setViewMode('selection');
        }
    };
    
    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const items = [...tempPrioritized];
        const [reorderedItem] = items.splice(dragItem.current, 1);
        items.splice(dragOverItem.current, 0, reorderedItem);
        dragItem.current = null;
        dragOverItem.current = null;
        setTempPrioritized(items);
    };

    const renderSelection = () => (
        <div className="fade-in">
            <div className="values-intro">
                <h3>Étape 1: Identifiez vos valeurs</h3>
                <p>Parcourez la liste ci-dessous et sélectionnez les <strong>{SELECTION_LIMIT} valeurs</strong> qui vous sont les plus chères. Celles qui guident vos décisions et définissent qui vous êtes au fond.</p>
            </div>
            <div className="value-grid">
                {VALUE_OPTIONS.map(value => {
                    const isSelected = tempSelected.includes(value);
                    return (
                        <div
                            key={value}
                            className={`value-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleValueToggle(value)}
                        >
                            <span>{value}</span>
                            {isSelected && (
                                <div className="value-card-reflection">
                                    {loadingQuestions[value] ? (
                                        <div className="mini-spinner"></div>
                                    ) : userValues.reflectionQuestions[value] ? (
                                        <p>"{userValues.reflectionQuestions[value]}"</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="values-actions">
                <p>{tempSelected.length} / {SELECTION_LIMIT} valeurs sélectionnées</p>
                <button
                    className="button-primary"
                    disabled={tempSelected.length !== SELECTION_LIMIT}
                    onClick={handleConfirmSelection}
                >
                    Confirmer la sélection
                </button>
            </div>
        </div>
    );

    const renderPrioritization = () => (
        <div className="fade-in">
            <div className="values-intro">
                <h3>Étape 2: Classez vos valeurs</h3>
                <p>Maintenant, organisez vos valeurs sélectionnées de la plus importante (en haut) à la moins importante (en bas). Cliquez et glissez pour les déplacer.</p>
            </div>
            <div className="prioritization-list">
                {tempPrioritized.map((value, index) => (
                    <div
                        key={value}
                        className="draggable-item"
                        draggable
                        onDragStart={() => (dragItem.current = index)}
                        onDragEnter={() => (dragOverItem.current = index)}
                        onDragEnd={handleDragSort}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <span className="drag-handle"><GripVerticalIcon /></span>
                        {value}
                    </div>
                ))}
            </div>
            <div className="values-actions">
                <button className="button-primary" onClick={handleSavePrioritization}>
                    Sauvegarder mon classement
                </button>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="fade-in">
            <div className="value-dashboard-header">
                <h3>Vos valeurs fondamentales</h3>
                <button className="button-secondary" onClick={handleReset}>Redéfinir mes valeurs</button>
            </div>
            <div className="value-dashboard">
                {userValues.prioritizedValues.map((value, index) => {
                    const valueActions = actions[value];
                    const isActionsLoading = loadingActions === value;
                    return (
                        <div key={value} className="value-reflection-card content-card">
                            <div className="value-reflection-header">
                                <span className="value-rank">#{index + 1}</span>
                                <h4 className="value-name">{value}</h4>
                                <button 
                                    className="button-icon" 
                                    title="Générer une nouvelle question"
                                    onClick={() => handleGenerateQuestion(value, true)}
                                >
                                    <RefreshCwIcon />
                                </button>
                            </div>
                            <div className="value-reflection-content">
                                {loadingQuestions[value] ? (
                                    <div className="reflection-question-loading">
                                        <div className="spinner"></div> L'IA réfléchit...
                                    </div>
                                ) : (
                                    <p>"{userValues.reflectionQuestions[value] || '...'}"</p>
                                )}
                            </div>
                             <div className="value-actions-container">
                                {isActionsLoading ? (
                                    <LoadingIndicator />
                                ) : valueActions ? (
                                    <div className="micro-actions-list">
                                        <h5>Actions suggérées :</h5>
                                        <ul>
                                            {valueActions.map((action, i) => <li key={i}>{action}</li>)}
                                        </ul>
                                    </div>
                                ) : (
                                    <button 
                                        className="button-secondary"
                                        onClick={() => handleGenerateActions(value)}
                                        disabled={isActionsLoading}
                                    >
                                        <LightbulbIcon/> Comment vivre cette valeur ?
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    
    const renderContent = () => {
        switch(viewMode) {
            case 'selection': return renderSelection();
            case 'prioritization': return renderPrioritization();
            case 'dashboard': return renderDashboard();
            default: return <LoadingIndicator />;
        }
    }

    return (
        <div className="module-view">
            <ModuleHeader title="Valeurs" />
            <div className="module-content values-view">
                {renderContent()}
            </div>
        </div>
    );
};
