import React, { useState, useMemo } from 'react';
import { useStorageState } from '../hooks/useStorageState';
import { SacredMealLog, SacredNutritionStorage, SACRED_NUTRITION_STORAGE_KEY } from '../types';
import { GUIDED_MEALS } from '../data';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { Modal } from './common/Modal';
import { PlusIcon, SaveIcon, SacredNutritionIcon, ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';

const MealStateEditor: React.FC<{
    state: { energy: number; emotion: string; clarity: number };
    onChange: (newState: { energy: number; emotion: string; clarity: number }) => void;
    legend: string;
}> = ({ state, onChange, legend }) => {
    return (
        <fieldset className="meal-state-editor">
            <legend>{legend}</legend>
            <div className="form-group">
                <label>Énergie (0-10): {state.energy}</label>
                <input
                    type="range" min="0" max="10"
                    value={state.energy}
                    onChange={e => onChange({ ...state, energy: parseInt(e.target.value) })}
                />
            </div>
            <div className="form-group">
                <label>Clarté mentale (0-10): {state.clarity}</label>
                <input
                    type="range" min="0" max="10"
                    value={state.clarity}
                    onChange={e => onChange({ ...state, clarity: parseInt(e.target.value) })}
                />
            </div>
            <div className="form-group">
                <label>Émotion dominante</label>
                <input
                    type="text"
                    value={state.emotion}
                    onChange={e => onChange({ ...state, emotion: e.target.value })}
                />
            </div>
        </fieldset>
    );
};


const MealLogModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (log: Omit<SacredMealLog, 'id' | 'date'>) => void;
    guidedMealName?: string;
}> = ({ isOpen, onClose, onSave, guidedMealName }) => {
    const [mealName, setMealName] = useState(guidedMealName || '');
    const [notes, setNotes] = useState('');
    const [beforeState, setBeforeState] = useState({ energy: 5, emotion: '', clarity: 5 });
    const [afterState, setAfterState] = useState({ energy: 5, emotion: '', clarity: 5 });
    const { showToast } = useToast();

    React.useEffect(() => {
        if (isOpen) {
            setMealName(guidedMealName || '');
            setNotes('');
            setBeforeState({ energy: 5, emotion: '', clarity: 5 });
            setAfterState({ energy: 5, emotion: '', clarity: 5 });
        }
    }, [isOpen, guidedMealName]);

    const handleSave = () => {
        if (!mealName.trim()) {
            showToast("Le nom du repas est requis.", "destructive");
            return;
        }
        onSave({ mealName, notes, beforeState, afterState, guidedMealId: guidedMealName ? GUIDED_MEALS.find(m => m.name === guidedMealName)?.id : undefined });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Journaliser un Repas Sacré">
            <div className="form-group">
                <label>Nom du repas</label>
                <input type="text" value={mealName} onChange={e => setMealName(e.target.value)} />
            </div>
            <div className="meal-state-comparison">
                <MealStateEditor legend="État avant le repas" state={beforeState} onChange={setBeforeState} />
                <MealStateEditor legend="État après le repas" state={afterState} onChange={setAfterState} />
            </div>
             <div className="form-group">
                <label>Notes / Ressentis</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="wizard-actions">
                <button className="button-secondary" onClick={onClose}>Annuler</button>
                <button className="button-primary" onClick={handleSave}><SaveIcon /> Enregistrer</button>
            </div>
        </Modal>
    );
};

const StateChangeIndicator: React.FC<{ change: number }> = ({ change }) => {
    if (change > 0) return <span className="state-change positive"><ArrowUpIcon /> {change}</span>;
    if (change < 0) return <span className="state-change negative"><ArrowDownIcon /> {change}</span>;
    return <span className="state-change neutral"><ArrowRightIcon /> {change}</span>;
};


export const SacredNutritionView: React.FC = () => {
    const [logs, setLogs] = useStorageState<SacredNutritionStorage>(SACRED_NUTRITION_STORAGE_KEY, []);
    const [activeTab, setActiveTab] = useState<'guided' | 'journal'>('guided');
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedGuidedMeal, setSelectedGuidedMeal] = useState<string | undefined>();
    const [selectedLog, setSelectedLog] = useState<SacredMealLog | null>(null);

    const handleSaveLog = (logData: Omit<SacredMealLog, 'id' | 'date'>) => {
        const newLog: SacredMealLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...logData,
        };
        setLogs(prev => [newLog, ...prev]);
    };
    
    const sortedLogs = useMemo(() => 
        [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [logs]);

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Nutrition Sacrée">
                <button className="button-primary" onClick={() => { setSelectedGuidedMeal(undefined); setIsLogModalOpen(true); }}>
                    <PlusIcon /> Journaliser un repas
                </button>
            </ModuleHeader>
            <div className="module-content">
                <div className="goal-tabs">
                    <button className={`goal-tab ${activeTab === 'guided' ? 'active' : ''}`} onClick={() => setActiveTab('guided')}>Repas Guidés</button>
                    <button className={`goal-tab ${activeTab === 'journal' ? 'active' : ''}`} onClick={() => setActiveTab('journal')}>Mon Journal</button>
                </div>

                {activeTab === 'guided' && (
                    <div className="guided-meals-grid stagger-fade-in">
                        {GUIDED_MEALS.map((meal, index) => (
                            <div key={meal.id} className="content-card guided-meal-card" style={{'--stagger-index': index} as React.CSSProperties}>
                                <h4>{meal.name}</h4>
                                <p className="meal-period">{meal.day} - {meal.period}</p>
                                <p className="meal-ingredients">{meal.ingredients}</p>
                                <p><small><strong>Énergie:</strong> {meal.energy}</small></p>
                                <button className="button-secondary" onClick={() => { setSelectedGuidedMeal(meal.name); setIsLogModalOpen(true); }}>Journaliser ce repas</button>
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'journal' && (
                     logs.length === 0 ? (
                        <EmptyState Icon={SacredNutritionIcon} title="Commencez votre journal" message="Journalisez vos repas pour découvrir comment l'alimentation influence votre bien-être."/>
                     ) : (
                        <div className="meal-log-list stagger-fade-in">
                            {sortedLogs.map((log, index) => (
                                <div key={log.id} className="content-card meal-log-card" onClick={() => setSelectedLog(log)} style={{'--stagger-index': index} as React.CSSProperties}>
                                    <div className="meal-log-header">
                                        <h4>{log.mealName}</h4>
                                        <time>{new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</time>
                                    </div>
                                    <div className="meal-log-stats">
                                        <div>
                                            <span>Énergie</span>
                                            <StateChangeIndicator change={log.afterState.energy - log.beforeState.energy} />
                                        </div>
                                        <div>
                                            <span>Clarté</span>
                                            <StateChangeIndicator change={log.afterState.clarity - log.beforeState.clarity} />
                                        </div>
                                         <div>
                                            <span>Émotion</span>
                                            <div className="emotion-change">
                                                <span>{log.beforeState.emotion || 'N/A'}</span>
                                                <ArrowRightIcon />
                                                <span>{log.afterState.emotion || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )
                )}
            </div>

            <MealLogModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                onSave={handleSaveLog}
                guidedMealName={selectedGuidedMeal}
            />

            {selectedLog && (
                <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={selectedLog.mealName}>
                    <div className="meal-log-detail">
                         <div className="meal-state-comparison">
                            <div><strong>Avant:</strong> E: {selectedLog.beforeState.energy}, C: {selectedLog.beforeState.clarity}, Em: {selectedLog.beforeState.emotion}</div>
                            <div><strong>Après:</strong> E: {selectedLog.afterState.energy}, C: {selectedLog.afterState.clarity}, Em: {selectedLog.afterState.emotion}</div>
                        </div>
                        <h4>Notes / Ressentis</h4>
                        <p>{selectedLog.notes || "Aucune note."}</p>
                    </div>
                </Modal>
            )}

        </div>
    );
};
