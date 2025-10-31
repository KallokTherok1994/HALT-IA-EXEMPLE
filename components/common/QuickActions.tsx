import React from 'react';
import { JournalIcon, RitualIcon, CalmSpaceIcon, TargetIcon } from '../../icons';
import { useAppContext } from '../../contexts/AppContext';

interface QuickActionsProps {}

export const QuickActions: React.FC<QuickActionsProps> = () => {
    const { navigateTo } = useAppContext();
    const actions = [
        { id: 'journal', label: 'Journal', icon: JournalIcon, moduleId: 'journal' },
        { id: 'rituals', label: 'Rituels', icon: RitualIcon, moduleId: 'ritual' },
        { id: 'goals', label: 'Objectifs', icon: TargetIcon, moduleId: 'goals' },
        { id: 'calm', label: 'Espace Calme', icon: CalmSpaceIcon, moduleId: 'calm-space' },
    ];

    return (
        <div className="content-card">
            <h4>Accès Rapide</h4>
            <div className="quick-actions-bar">
                {actions.map(action => {
                    const Icon = action.icon;
                    return (
                        <button key={action.id} className="quick-action-btn" onClick={() => navigateTo(action.moduleId as any)}>
                            <Icon />
                            <span>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};