import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Ritual, RitualsStorage, RITUALS_STORAGE_KEY } from '../types';
import { generateRitual, generateCompletionMessage } from '../services/generative-ai';
import { getTodayDateString } from '../utils/dateHelpers';
import { ModuleHeader } from './common/ModuleHeader';
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon, SaveIcon, StarIcon } from '../icons';
import { useGoalTracking } from '../contexts/GoalTrackingContext';
import { useToast } from '../contexts/ToastContext';
import { useStorageState } from '../hooks/useStorageState';
import { EmptyState } from './common/EmptyState';
import { useSettings } from '../contexts/SettingsContext';
import { Modal } from './common/Modal';
import { useBadges } from '../contexts/BadgeContext';

const RitualEditorModal: React.FC<{
    ritualToEdit?: Ritual | null;
    onSave: (name: string, tasks: { text: string }[]) => void;
    onClose: () => void;
}> = ({ ritualToEdit, onSave, onClose }) => {
    const [name, setName] = useState(ritualToEdit?.name || '');
    const [tasks, setTasks] = useState<{ text: string }[]>(ritualToEdit?.tasks || [{ text: '' }]);
    const [goal, setGoal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleGenerateRitual = async () => {
        if (!goal.trim()) return;
        setIsLoading(true);
        try {
            const result = await generateRitual(goal);
            setName(result.name);
            setTasks(result.tasks.map(text => ({ text })));
        } catch (e) {
            showToast("La suggestion de rituel a échoué. Veuillez réessayer.", "destructive");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (name.trim() && tasks.length > 0 && tasks.every(t => t.text.trim())) {
            onSave(name, tasks.filter(t => t.text.trim()));
        } else {
            showToast("Le nom du rituel et au moins une tâche sont requis.", "destructive");
        }
    };
    
    const handleTaskChange = (index: number, text: string) => {
        const newTasks = [...tasks];
        newTasks[index].text = text;
        setTasks(newTasks);
    };

    const handleAddTask = () => setTasks([...tasks, { text: '' }]);
    
    const handleRemoveTask = (index: number) => {
        if (tasks.length > 1) {
            setTasks(tasks.filter((_, i) => i !== index));
        } else {
            showToast("Un rituel doit avoir au moins une tâche.", "info");
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={ritualToEdit ? "Modifier le Rituel" : "Nouveau Rituel"}>
            <div className="form-group">
                <label>Quel objectif ce rituel doit-il soutenir ? (Optionnel)</label>
                <div className="input-with-button">
                    <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ex: Avoir une matinée plus sereine" disabled={isLoading} />
                    <button type="button" onClick={handleGenerateRitual} className="button-secondary" disabled={isLoading}>
                        <SparklesIcon className={isLoading ? 'spinning' : ''}/> {isLoading ? 'Suggestion...' : 'Suggérer'}
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>Nom du rituel</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            </div>

            <div className="form-group">
                <label>Tâches</label>
                <div className="task-list-editor">
                    {tasks.map((task, index) => (
                        <div key={index} className="editor-task-item">
                            <input
                                type="text"
                                value={task.text}
                                onChange={e => handleTaskChange(index, e.target.value)}
                                placeholder={`Tâche ${index + 1}`}
                            />
                            <button onClick={() => handleRemoveTask(index)} className="button-icon destructive"><DeleteIcon/></button>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddTask} className="button-secondary" style={{ marginTop: '0.5rem' }}><PlusIcon/> Ajouter une tâche</button>
            </div>

            <div className="modal-actions">
                <button onClick={onClose} className="button-secondary">Annuler</button>
                <button onClick={handleSave} className="button-primary"><SaveIcon/> Enregistrer</button>
            </div>
        </Modal>
    );
};

export const RitualView: React.FC = () => {
    const [storageData, setStorageData] = useStorageState<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
    const { rituals, completions } = storageData;

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [ritualToEdit, setRitualToEdit] = useState<Ritual | null>(null);

    const { logAction } = useGoalTracking();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { checkForNewBadges } = useBadges();

    const todayString = getTodayDateString();
    const todayCompletions = useMemo(() => new Set(completions[todayString] || []), [completions, todayString]);

    const allTasksCompleted = useMemo(() => {
        const allTaskIds = rituals.flatMap(r => r.tasks.map(t => t.id));
        if (allTaskIds.length === 0) return false;
        return allTaskIds.every(id => todayCompletions.has(id));
    }, [rituals, todayCompletions]);

    const prevAllTasksCompleted = useRef(allTasksCompleted);
    const ritualCountRef = useRef(rituals.length);

    useEffect(() => {
        if (allTasksCompleted && !prevAllTasksCompleted.current && settings.celebrateRitualCompletion && rituals.length > 0 && rituals.length === ritualCountRef.current) {
            const showCompletionMessage = async () => {
                try {
                    const message = await generateCompletionMessage(rituals.map(r => r.name));
                    showToast(message, 'success');
                } catch (e) {
                    showToast("Bravo, tous vos rituels sont complétés !", 'success');
                }
            };
            showCompletionMessage();
        }
        prevAllTasksCompleted.current = allTasksCompleted;
        ritualCountRef.current = rituals.length;
    }, [allTasksCompleted, rituals, settings.celebrateRitualCompletion, showToast]);

    const handleToggleTask = (taskId: string) => {
        const newCompletions = new Set(todayCompletions);
        if (newCompletions.has(taskId)) {
            newCompletions.delete(taskId);
        } else {
            newCompletions.add(taskId);
        }

        const updatedCompletions = {
            ...completions,
            [todayString]: Array.from(newCompletions),
        };

        const ritual = rituals.find(r => r.tasks.some(t => t.id === taskId));
        if (ritual) {
            const ritualTaskIds = new Set(ritual.tasks.map(t => t.id));
            if ([...ritualTaskIds].every(id => newCompletions.has(id))) {
                logAction('ritual', { ritualId: ritual.id });
            }
        }
        
        setStorageData({ rituals, completions: updatedCompletions });
        checkForNewBadges();
    };

    const handleSaveRitual = (name: string, tasksData: { text: string }[]) => {
        if (ritualToEdit) {
            const updatedRitual = {
                ...ritualToEdit,
                name,
                tasks: tasksData.map((t, i) => ({
                    id: ritualToEdit.tasks[i]?.id || `${ritualToEdit.id}-${Date.now()}-${i}`,
                    text: t.text
                })),
            };
            setStorageData(prev => ({
                ...prev,
                rituals: prev.rituals.map(r => r.id === ritualToEdit.id ? updatedRitual : r)
            }));
            showToast("Rituel mis à jour.", "success");
        } else {
            const newRitual: Ritual = {
                id: Date.now().toString(),
                name,
                tasks: tasksData.map((t, i) => ({
                    id: `${Date.now()}-${i}`,
                    text: t.text
                })),
            };
            setStorageData(prev => ({ ...prev, rituals: [newRitual, ...prev.rituals] }));
            showToast("Rituel créé.", "success");
        }
        setIsEditorOpen(false);
    };
    
    const handleDeleteRitual = (ritualId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce rituel ?")) {
            setStorageData(prev => ({
                ...prev,
                rituals: prev.rituals.filter(r => r.id !== ritualId)
            }));
            showToast("Rituel supprimé.", "info");
        }
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Rituels">
                <button onClick={() => { setRitualToEdit(null); setIsEditorOpen(true); }} className="button-primary"><PlusIcon /> Nouveau Rituel</button>
            </ModuleHeader>
            <div className="module-content">
                {rituals.length === 0 ? (
                    <EmptyState
                        Icon={StarIcon}
                        title="Créez votre premier rituel"
                        message="Les rituels sont de petites habitudes qui vous ancrent et soutiennent vos objectifs. Créez un rituel matinal, une routine du soir, ou tout ce qui vous inspire."
                        action={{ text: "Créer un rituel", onClick: () => { setRitualToEdit(null); setIsEditorOpen(true); } }}
                    />
                ) : (
                    <div className="rituals-list">
                        {rituals.map(ritual => (
                            <div key={ritual.id} className="content-card ritual-card">
                                <div className="ritual-card-header">
                                    <h3>{ritual.name}</h3>
                                    <div className="action-button-group">
                                        <button onClick={() => { setRitualToEdit(ritual); setIsEditorOpen(true); }} className="button-icon" title="Modifier"><EditIcon/></button>
                                        <button onClick={() => handleDeleteRitual(ritual.id)} className="button-icon destructive" title="Supprimer"><DeleteIcon/></button>
                                    </div>
                                </div>
                                <ul className="ritual-task-list">
                                    {ritual.tasks.map(task => (
                                        <li key={task.id} onClick={() => handleToggleTask(task.id)} className={todayCompletions.has(task.id) ? 'completed' : ''} role="checkbox" aria-checked={todayCompletions.has(task.id)}>
                                            <div className="custom-checkbox"></div>
                                            <span>{task.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isEditorOpen && (
                <RitualEditorModal
                    ritualToEdit={ritualToEdit}
                    onSave={handleSaveRitual}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    );
};
