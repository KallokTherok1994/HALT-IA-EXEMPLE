import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { MaximizeIcon, MinimizeIcon } from '../../icons';
import { ModuleId } from '../../types';

interface ModuleHeaderProps {
    title: string;
    children?: React.ReactNode;
}

const zenModeModules: ModuleId[] = [
    'journal', 
    'dream-journal',
    'thought-court',
    'art-therapy',
    'coach-ai',
    'unsent-letters',
    'fear-setting',
    'narrative-arc',
    'body-map',
    'communication-arena',
];

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, children }) => {
    const { activeModule, zenMode, toggleZenMode } = useAppContext();

    return (
        <header className="module-header">
            <h1 className="module-title">{title}</h1>
            <div className="module-header-actions">
                {children}
                {activeModule && zenModeModules.includes(activeModule) && (
                    <button
                        onClick={toggleZenMode}
                        className="button-icon"
                        title={zenMode ? "Quitter le mode Zen" : "Activer le mode Zen"}
                        aria-label={zenMode ? "Quitter le mode Zen" : "Activer le mode Zen"}
                    >
                        {zenMode ? <MinimizeIcon /> : <MaximizeIcon />}
                    </button>
                )}
            </div>
        </header>
    );
};