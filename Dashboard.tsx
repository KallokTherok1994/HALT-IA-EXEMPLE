import React from 'react';
import { DashboardSummary } from './components/common/DashboardSummary';
import { SuggestionFeed } from './components/common/SuggestionFeed';
import { QuickActions } from './components/common/QuickActions';
import { ProactiveCoach } from './components/common/ProactiveCoach';
import { useDailyCheckin } from './hooks/useDailyCheckin';
import { DailyCheckin } from './components/DailyCheckin';
import { Flashback } from './components/common/Flashback';
import { useRhythmAdvice } from './hooks/useRhythmAdvice';
import { RhythmIcon } from './icons';
import { useSettings } from './contexts/SettingsContext';
import { useAppContext } from './contexts/AppContext';

const RhythmCard: React.FC<{ onNavigate: (moduleId: string) => void }> = ({ onNavigate }) => {
    const { advice, loading, needsSetup } = useRhythmAdvice();

    if (loading) {
        return (
            <div className="content-card rhythm-card">
                 <div className="rhythm-card-header">
                    <h4 className="skeleton skeleton-text" style={{ width: '60%' }}></h4>
                 </div>
                 <p className="skeleton skeleton-text" style={{ width: '90%' }}></p>
            </div>
        );
    }

    if (needsSetup) {
        return (
             <div className="content-card rhythm-card is-prompt">
                <div className="rhythm-card-header">
                     <RhythmIcon />
                    <h4>Découvrez Votre Rythme</h4>
                </div>
                <p>Alignez vos journées sur votre énergie naturelle.</p>
                <button className="button-secondary" onClick={() => onNavigate('rhythm')}>Faire le test</button>
            </div>
        );
    }
    
    if (!advice) {
        return null;
    }

    return (
        <div className="content-card rhythm-card">
            <div className="rhythm-card-header">
                <span className="rhythm-card-icon">{advice.icon}</span>
                <h4>{advice.title}</h4>
            </div>
            <p>{advice.advice}</p>
        </div>
    );
};


export const Dashboard: React.FC = () => {
    const { navigateTo } = useAppContext();
    const { needsCheckin, completeCheckin } = useDailyCheckin();
    const { settings } = useSettings();

    return (
        <div className="module-view dashboard-view fade-in">
             <div className="module-content">
                {needsCheckin ? (
                    <DailyCheckin onComplete={completeCheckin} />
                ) : (
                    <div className="dashboard-grid">
                        <div className="dashboard-main-column">
                            <DashboardSummary />
                            <SuggestionFeed />
                        </div>
                        <div className="dashboard-side-column">
                             <QuickActions />
                            <ProactiveCoach />
                            {settings.dashboardWidgets.rhythm && <RhythmCard onNavigate={navigateTo} />}
                            {settings.dashboardWidgets.flashback && <Flashback />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};