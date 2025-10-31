import React, { useState, useCallback, useMemo, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { modules } from './data';
import { ModuleId, NavigationPayload } from './types';
import { SettingsProvider } from './contexts/SettingsContext';
import { GoalTrackingProvider } from './contexts/GoalTrackingContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { LoadingIndicator } from './components/common/LoadingIndicator';
import { AppContextProvider, useAppContext } from './contexts/AppContext';
import { Breadcrumbs } from './components/common/Breadcrumbs';
import { BadgeProvider } from './contexts/BadgeContext';

// Lazy load module components for better initial performance
const JournalView = React.lazy(() => import('./components/JournalView').then(module => ({ default: module.JournalView })));
const ThoughtCourtView = React.lazy(() => import('./components/ThoughtCourtView').then(module => ({ default: module.ThoughtCourtView })));
const RitualView = React.lazy(() => import('./components/RitualView').then(module => ({ default: module.RitualView })));
const ValuesView = React.lazy(() => import('./components/ValuesView').then(module => ({ default: module.ValuesView })));
const WeeklyReviewView = React.lazy(() => import('./components/WeeklyReviewView').then(module => ({ default: module.WeeklyReviewView })));
const GuidedJourneyView = React.lazy(() => import('./components/GuidedJourneyView').then(module => ({ default: module.GuidedJourneyView })));
const CoachAIView = React.lazy(() => import('./components/ChatView').then(module => ({ default: module.CoachAIView })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(module => ({ default: module.SettingsView })));
const AssessmentView = React.lazy(() => import('./components/AssessmentView').then(module => ({ default: module.AssessmentView })));
const GoalsView = React.lazy(() => import('./components/GoalsView').then(module => ({ default: module.GoalsView })));
const CalmSpaceView = React.lazy(() => import('./components/CalmSpaceView').then(module => ({ default: module.CalmSpaceView })));
const CommunicationArenaView = React.lazy(() => import('./components/CommunicationArenaView').then(module => ({ default: module.CommunicationArenaView })));
const UnsentLettersView = React.lazy(() => import('./components/UnsentLettersView').then(module => ({ default: module.UnsentLettersView })));
const FearSettingView = React.lazy(() => import('./components/FearSettingView').then(module => ({ default: module.FearSettingView })));
const ProgressView = React.lazy(() => import('./components/ProgressView').then(module => ({ default: module.ProgressView })));
const RhythmView = React.lazy(() => import('./components/RhythmView').then(module => ({ default: module.RhythmView })));
const WoundsView = React.lazy(() => import('./components/WoundsView').then(module => ({ default: module.WoundsView })));
const RelationalEcosystemView = React.lazy(() => import('./components/RelationalEcosystemView').then(module => ({ default: module.RelationalEcosystemView })));
const SanctuaryView = React.lazy(() => import('./components/SanctuaryView').then(module => ({ default: module.SanctuaryView })));
const SynthesisView = React.lazy(() => import('./components/SynthesisView').then(module => ({ default: module.SynthesisView })));
const GratitudeView = React.lazy(() => import('./components/GratitudeView').then(module => ({ default: module.GratitudeView })));
const BodyMapView = React.lazy(() => import('./components/BodyMapView').then(module => ({ default: module.BodyMapView })));
const ArtTherapyView = React.lazy(() => import('./components/ArtTherapyView').then(module => ({ default: module.ArtTherapyView })));
const PersonalizedPathView = React.lazy(() => import('./components/PersonalizedPathView').then(module => ({ default: module.PersonalizedPathView })));
const OracleView = React.lazy(() => import('./components/OracleView').then(module => ({ default: module.OracleView })));
const DreamJournalView = React.lazy(() => import('./components/DreamJournalView').then(module => ({ default: module.DreamJournalView })));
const NarrativeArcView = React.lazy(() => import('./components/NarrativeArcView').then(module => ({ default: module.NarrativeArcView })));
const ArchetypesView = React.lazy(() => import('./components/ArchetypesView').then(module => ({ default: module.ArchetypesView })));
const SacredNutritionView = React.lazy(() => import('./components/SacredNutritionView').then(module => ({ default: module.SacredNutritionView })));
const AdminView = React.lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));

const renderActiveModule = (activeModuleId: ModuleId | null, initialEntryId?: string, navigationPayload?: NavigationPayload) => {
    if (!activeModuleId) {
        return <Dashboard />;
    }

    const module = modules.find(m => m.id === activeModuleId);
    if (!module) return <Dashboard />;

    switch (module.id) {
        case 'journal': return <JournalView {...(initialEntryId && { initialEntryId })} initialPayload={navigationPayload} />;
        case 'dream-journal': return <DreamJournalView {...(initialEntryId && { initialEntryId })} />;
        case 'thought-court': return <ThoughtCourtView {...(initialEntryId && { initialEntryId })} />;
        case 'ritual': return <RitualView />;
        case 'values': return <ValuesView />;
        case 'weekly-review': return <WeeklyReviewView />;
        case 'guided-journey': return <GuidedJourneyView />;
        case 'coach-ai': return <CoachAIView module={module} />;
        case 'settings': return <SettingsView />;
        case 'assessment': return <AssessmentView />;
        case 'goals': return <GoalsView />;
        case 'calm-space': return <CalmSpaceView />;
        case 'communication-arena': return <CommunicationArenaView />;
        case 'unsent-letters': return <UnsentLettersView />;
        case 'fear-setting': return <FearSettingView />;
        case 'progress': return <ProgressView />;
        case 'rhythm': return <RhythmView />;
        case 'wounds': return <WoundsView />;
        case 'relational-ecosystem': return <RelationalEcosystemView />;
        case 'sanctuary': return <SanctuaryView />;
        case 'art-therapy': return <ArtTherapyView />;
        case 'synthesis': return <SynthesisView />;
        case 'gratitude': return <GratitudeView />;
        case 'body-map': return <BodyMapView />;
        case 'personalized-path': return <PersonalizedPathView />;
        case 'oracle': return <OracleView />;
        case 'narrative-arc': return <NarrativeArcView />;
        case 'archetypes': return <ArchetypesView />;
        case 'sacred-nutrition': return <SacredNutritionView />;
        case 'admin': return <AdminView />;
        default: return <Dashboard />;
    }
};

const AppContent: React.FC = () => {
    const { activeModule, onBack, initialEntryId, navigationPayload, zenMode, navigateTo } = useAppContext();
    const activeModuleName = activeModule ? modules.find(m => m.id === activeModule)?.name || null : null;

    useEffect(() => {
        document.getElementById('root')?.classList.toggle('zen-mode', zenMode);
    }, [zenMode]);
    
    return (
        <>
            <Sidebar activeModule={activeModule} navigateTo={navigateTo} onBack={onBack} />
            <main className="main-content">
                <Breadcrumbs moduleName={activeModuleName} onBack={onBack} />
                <Suspense fallback={<div className="module-loading-fullscreen"><LoadingIndicator /></div>}>
                    {renderActiveModule(activeModule, initialEntryId, navigationPayload)}
                </Suspense>
            </main>
        </>
    );
};

const App: React.FC = () => {
    useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('hidden');
            }, 500);
        }
    }, []);
    
    return (
       <AppContextProvider>
         <AppContent />
        </AppContextProvider>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <SettingsProvider>
            <ToastProvider>
                 <BadgeProvider>
                    <GoalTrackingProvider>
                        <App />
                        <ToastContainer />
                    </GoalTrackingProvider>
                 </BadgeProvider>
            </ToastProvider>
        </SettingsProvider>
    </React.StrictMode>
);