

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Goal, GoalStep, GOALS_STORAGE_KEY, RitualsStorage, RITUALS_STORAGE_KEY, Ritual, GoalLinkedModule, Connection } from '../types';
import { useGoalTracking } from '../contexts/GoalTrackingContext';
import { useStorageState } from '../hooks/useStorageState';
import { useToast } from '../contexts/ToastContext';
import { generateGoalSteps } from '../services/generative-ai';
import { storage } from '../utils/storage';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { Modal } from './common/Modal';
import { LoadingIndicator } from './common/LoadingIndicator';
import { PlusIcon, SaveIcon, TargetIcon, EditIcon, DeleteIcon, SparklesIcon, BookOpenIcon, FlameIcon, AssessmentIcon, LinkIcon, CheckCircleIcon } from '../icons';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useBadges } from '../contexts/BadgeContext';

interface GoalsViewProps {}

const getLinkIcon = (linkedModule: GoalLinkedModule | null) => {
    switch(linkedModule) {
        case 'journal': return BookOpenIcon;
        case 'ritual': return FlameIcon;
        case 'assessment': return AssessmentIcon;
        default: return null;
    }
}

const GoalCard: React.FC<{
    goal: Goal;
    onEdit: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    onManageConnections: (goal: Goal) => void;
}> = ({ goal, onEdit, onDelete, onManageConnections }) => {
    const completedSteps = goal.steps.filter(s => s.completed).length;
    const progress = goal.steps.length > 0 ? (completedSteps / goal.steps.length) * 100 : 0;
    const isCompleted = progress >= 100;
    
    return (
        <div className={`content-card goal-card ${isCompleted ? 'completed' : ''}`}>
            <div className="goal-card-header">
                <h3>{goal.title}</h3>
                <div className="goal-header-actions">
                    {isCompleted && (
                        <span className="goal-completed-badge">
                            <CheckCircleIcon /> Terminé
                        </span>
                    )}
                    <div className="action-button-group">
                        <button className="button-icon" onClick={() => onManageConnections(goal)} title="Gérer les connexions"><LinkIcon /></button>
                        <button className="button-icon" onClick={() => onEdit(goal)} title="Modifier"><EditIcon /></button>
                        <button className="button-icon destructive" onClick={() => onDelete(goal.id)} title="Supprimer"><DeleteIcon /></button>
                    </div>
                </div>
            </div>

            <div className="goal-progress-bar-container">
                <div className="goal-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="goal-progress-text">{completedSteps} sur {goal.steps.length} étapes terminées</p>

            <ul className="goal-steps-list">
                {goal.steps.map(step => {
                    const LinkIcon = getLinkIcon(step.linkedModule);
                    return (
                        <li key={step.id} className={`goal-step-item ${step.completed ? 'completed' : ''}`}>
                            <div className="completion-indicator" title={step.completed ? 'Terminé' : 'En cours'}></div>
                            <span className="step-title">{step.title}</span>
                            {LinkIcon && (
                                <span className="step-link-icon" title={`Lié à ${step.linkedModule}`}>
                                    <LinkIcon />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
            <ConnectionsDisplay connections={goal.connections} />
        </div>
    );
};

const GoalEditorModal: React.FC<{
    goalToEdit: Goal | null;
    onSave: (goal: Goal) => void;
    onClose: () => void;
}> = ({ goalToEdit, onSave, onClose }) => {
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<Partial<GoalStep>[]>([]);
    const [rituals, setRituals] = useState<Ritual[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const ritualsData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
        setRituals(ritualsData.rituals);
        
        if (goalToEdit) {
            setTitle(goalToEdit.title);
            setSteps(goalToEdit.steps);
        } else {
            setTitle('');
            setSteps([]);
        }
    }, [goalToEdit]);

    const handleStepChange = (index: number, field: keyof GoalStep, value: any) => {
        const newSteps = [...steps];
        const step = { ...newSteps[index] };
        (step as any)[field] = value;

        // Reset ritual link if module changes
        if (field === 'linkedModule' && value !== 'ritual') {
            step.linkedRitualId = null;
        }
        newSteps[index] = step;
        setSteps(newSteps);
    };

    const addStep = () => {
        setSteps([...steps, { id: `new-${Date.now()}`, title: '', completed: false, linkedModule: null }]);
    };
    
    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleSuggestSteps = async () => {
        if (!title.trim()) {
            showToast("Veuillez d'abord donner un titre à votre objectif.", 'destructive');
            return;
        }
        setIsSuggesting(true);
        try {
            const suggestions = await generateGoalSteps(title, rituals);
            const newSteps: GoalStep[] = suggestions.map((s, i) => {
                 const linkedRitual = s.suggestedRitualName ? rituals.find(r => r.name === s.suggestedRitualName) : null;
                 return {
                    id: `ai-${Date.now()}-${i}`,
                    title: s.title,
                    completed: false,
                    linkedModule: s.linkedModule,
                    linkedRitualId: linkedRitual ? linkedRitual.id : null,
                 };
            });
            setSteps(newSteps);
        } catch (error) {
            showToast("La suggestion d'étapes a échoué. Veuillez réessayer.", 'destructive');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSave = () => {
        if (!title.trim()) {
            showToast("Le titre de l'objectif est requis.", 'destructive');
            return;
        }
        const finalSteps = steps
            .filter(s => s.title?.trim())
            .map(s => ({ ...s, id: s.id?.startsWith('new-') || s.id?.startsWith('ai-') ? Date.now().toString() + Math.random() : s.id } as GoalStep));

        const goalData: Goal = {
            id: goalToEdit?.id || Date.now().toString(),
            title,
            steps: finalSteps,
            connections: goalToEdit?.connections || [],
        };
        onSave(goalData);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={goalToEdit ? "Modifier l'objectif" : "Nouvel Objectif"}>
            <div className="goal-editor-content">
                <div className="form-group">
                    <label htmlFor="goal-title">Titre de l'objectif</label>
                    <div className="input-with-button">
                        <input id="goal-title" type="text" value={title} onChange={e => setTitle(e.target.value)} />
                         <button className="button-secondary" onClick={handleSuggestSteps} disabled={isSuggesting}>
                            <SparklesIcon className={isSuggesting ? 'spinning' : ''}/> Suggérer
                        </button>
                    </div>
                </div>

                <div className="goal-editor-body">
                    {isSuggesting ? <LoadingIndicator /> : (
                        <div className="step-editor-list">
                            {steps.map((step, index) => (
                                <div key={index} className="step-editor-row">
                                    <input type="text" value={step.title} onChange={e => handleStepChange(index, 'title', e.target.value)} placeholder="Titre de l'étape"/>
                                    <select value={step.linkedModule || ''} onChange={e => handleStepChange(index, 'linkedModule', e.target.value || null)}>
                                        <option value="">Aucun lien</option>
                                        <option value="journal">Journal</option>
                                        <option value="ritual">Rituel</option>
                                        <option value="assessment">Évaluation</option>
                                    </select>
                                    {step.linkedModule === 'ritual' && (
                                        <select value={step.linkedRitualId || ''} onChange={e => handleStepChange(index, 'linkedRitualId', e.target.value)}>
                                            <option value="">Choisir un rituel</option>
                                            {rituals.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    )}
                                    <button className="button-icon destructive" onClick={() => removeStep(index)}><DeleteIcon /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="wizard-actions">
                     <button onClick={addStep} className="button-secondary" style={{ marginRight: 'auto' }}><PlusIcon /> Ajouter une étape</button>
                    <button onClick={onClose} className="button-secondary">Annuler</button>
                    <button onClick={handleSave} className="button-primary"><SaveIcon/> Enregistrer</button>
                </div>
            </div>
        </Modal>
    );
};


export const GoalsView: React.FC<GoalsViewProps> = () => {
    const { goals, addGoal, updateGoal, deleteGoal } = useGoalTracking();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    const [goalForConnections, setGoalForConnections] = useState<Goal | null>(null);
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const { checkForNewBadges } = useBadges();
    const prevGoalsRef = useRef<Goal[]>([]);

    useEffect(() => {
        const previouslyCompleted = new Set(prevGoalsRef.current
            .filter(g => g.steps.length > 0 && g.steps.every(s => s.completed))
            .map(g => g.id)
        );
        const newlyCompleted = goals.find(g =>
            g.steps.length > 0 &&
            g.steps.every(s => s.completed) &&
            !previouslyCompleted.has(g.id)
        );

        if (newlyCompleted) {
            checkForNewBadges();
        }

        prevGoalsRef.current = goals;
    }, [goals, checkForNewBadges]);

    const activeGoals = useMemo(() => goals.filter(g => g.steps.some(s => !s.completed)), [goals]);
    const completedGoals = useMemo(() => goals.filter(g => g.steps.length > 0 && g.steps.every(s => s.completed)), [goals]);

    const handleNew = () => {
        setGoalToEdit(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (goal: Goal) => {
        setGoalToEdit(goal);
        setIsEditorOpen(true);
    };

    const handleDelete = (goalId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) {
            deleteGoal(goalId);
            showToast("Objectif supprimé.", "info");
        }
    };
    
    const handleSave = (goal: Goal) => {
        if (goalToEdit) {
            updateGoal(goal);
            showToast("Objectif mis à jour.", "success");
        } else {
            addGoal(goal);
            showToast("Objectif créé !", "success");
        }
        