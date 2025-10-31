import React from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { useSettings } from '../contexts/SettingsContext';
import { AppSettings } from '../types';

export const AdminView: React.FC = () => {
    const { settings, updateSetting } = useSettings();

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Administration" />
            <div className="module-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="settings-section">
                    <h3>Configuration des Modules</h3>
                    <div className="admin-module-config">
                        <h4>Configuration des modules</h4>
                        <p>Cette section est réservée aux futures options de configuration avancées pour les modules.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};