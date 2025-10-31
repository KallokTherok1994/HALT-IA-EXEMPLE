import React, { useRef, useState } from 'react';
import { DashboardSummary } from './common/DashboardSummary';
import { SuggestionFeed } from './common/SuggestionFeed';
import { QuickActions } from './common/QuickActions';
import { ProactiveCoach } from './common/ProactiveCoach';
import { useDailyCheckin } from '../hooks/useDailyCheckin';
import { DailyCheckin } from './DailyCheckin';
import { Flashback } from './common/Flashback';
import { useSettings } from '../contexts/SettingsContext';
import { MoodTrackerWidget } from './common/MoodTrackerWidget';
import { RhythmCard } from './common/RhythmCard';
import { DashboardWidgetId, GratitudeItem, GratitudeStorage, GRATITUDE_STORAGE_KEY, JournalEntry, JOURNAL_STORAGE_KEY } from '../types';
import { EmotionCloud } from './common/EmotionCloud';
import { GripVerticalIcon, GratitudeIcon, SendIcon } from '../icons';
import { useStorageState } from '../hooks/useStorageState';
import { useToast } from '../contexts/ToastContext';
import { getTodayDateString } from '../utils/dateHelpers';
import { useAppContext } from '../contexts/AppContext';
import { SuggestionProvider } from '../contexts/SuggestionContext';
import { DailyPromptWidget } from './common/DailyPromptWidget';

const WelcomeCard: React.FC = () => {
    const { navigateTo } = useAppContext();
    const { settings } = useSettings();
    
    const displayName = settings.userName ? `, ${settings.userName}` : '';

    return (
        <div className="welcome-card content-card">
            <h2>Bienvenue{displayName} !</h2>
            <p>HALTE.IA est votre espace personnel pour la réflexion et la croissance. Pour commencer, pourquoi ne pas écrire votre première entrée de journal ?</p>
            <button className="button-primary" onClick={() => navigateTo('journal')}>
                Commencer à écrire
            </button>
        </div>
    );
};

const QuickGratitude: React.FC = () => {
    const [entries, setEntries] = useStorageState<GratitudeStorage>(GRATITUDE_STORAGE_KEY, []);
    const [text, setText] = useState('');
    const { showToast } = useToast();

    const todayStr = getTodayDateString();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        const newItem: GratitudeItem = {
            id: Date.now().toString(),
            text: text.trim(),
        };

        setEntries(prev => {
            const todayEntryIndex = prev.findIndex(e => e.date === todayStr);
            if (todayEntryIndex > -1) {
                const newEntries = [...prev];
                const updatedEntry = {
                    ...newEntries[todayEntryIndex],
                    items: [...newEntries[todayEntryIndex].items, newItem],
                    reflection: undefined, // Invalidate reflection on new item
                };
                newEntries[todayEntryIndex] = updatedEntry;
                return newEntries;
            } else {
                return [{ date: todayStr, items: [newItem] }, ...prev];
            }
        });

        showToast("Gratitude ajoutée !", "success");
        setText('');
    };

    const todayEntry = entries.find(e => e.date === todayStr);
    const gratitudesToday = todayEntry?.items || [];

    return (
        <div className="content-card quick-gratitude-widget">
            <div className="quick-gratitude-header">
                <GratitudeIcon />
                <h4>Note de Gratitude</h4>
            </div>
            {gratitudesToday.length > 0 && (
                <ul className="quick-gratitude-list">
                    {gratitudesToday.slice(-3).map(item => (
                        <li key={item.id}>{item.text}</li>
                    ))}
                    {gratitudesToday.length > 3 && <li>...</li>}
                </ul>
            )}
            <form onSubmit={handleSubmit} className="input-with-button">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Aujourd'hui, je suis reconnaissant(e) pour..."
                    aria-label="Ajouter une gratitude"
                />
                <button type="submit" className="button-primary" disabled={!text.trim()} aria-label="Envoyer gratitude">
                    <SendIcon />
                </button>
            </form>
        </div>
    );
};


const WIDGET_COMPONENTS: Record<DashboardWidgetId, React.FC<any>> = {
    summary: DashboardSummary,
    coach: ProactiveCoach,
    suggestions: SuggestionFeed,
    'quick-actions': QuickActions,
    moodTracker: MoodTrackerWidget,
    rhythm: RhythmCard,
    flashback: Flashback,
    emotionCloud: EmotionCloud,
    quickGratitude: QuickGratitude,
    dailyPrompt: DailyPromptWidget,
};

const DraggableWidgetList: React.FC<{
    widgetIds: DashboardWidgetId[];
    onOrderChange: (newOrder: DashboardWidgetId[]) => void;
    widgetVisibility: { [key in DashboardWidgetId]?: boolean };
}> = ({ widgetIds, onOrderChange, widgetVisibility }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const dragItemNode = useRef<HTMLDivElement | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        dragItemNode.current = e.currentTarget;
        // Add styles for visual feedback
        dragItemNode.current.setAttribute('data-drag-item', 'true');
        const contentDiv = e.currentTarget.querySelector('.dashboard-widget-content');
        contentDiv?.classList.add('dragging');
        // Set a global attribute to style other elements during drag
        document.body.setAttribute('data-dragging', 'true');
    };

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index;
    };
    
    const handleDragEnd = () => {
        // Clean up styles
        document.body.removeAttribute('data-dragging');
        if (dragItemNode.current) {
            dragItemNode.current.removeAttribute('data-drag-item');
            const contentDiv = dragItemNode.current.querySelector('.dashboard-widget-content');
            contentDiv?.classList.remove('dragging');
        }

        // If dropped in a valid new position, update the order
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newOrder = [...widgetIds];
            const [draggedItem] = newOrder.splice(dragItem.current, 1);
            newOrder.splice(dragOverItem.current, 0, draggedItem);
            onOrderChange(newOrder);
        }

        // Reset refs
        dragItem.current = null;
        dragOverItem.current = null;
        dragItemNode.current = null;
    };


    return (
        <>
            {widgetIds.map((widgetId, index) => {
                const WidgetComponent = WIDGET_COMPONENTS[widgetId];
                if (!WidgetComponent) return null;

                const isVisible = widgetVisibility[widgetId];
                if (!isVisible) return null;

                return (
                    <div
                        key={widgetId}
                        className="dashboard-widget-wrapper"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()} // Necessary for onDrop to fire
                    >
                        <div className="drag-handle" title="Glisser pour réorganiser"><GripVerticalIcon /></div>
                        <div className="dashboard-widget-content" style={{width: '100%'}}> 
                            <WidgetComponent />
                        </div>
                    </div>
                );
            })}
        </>
    );
};


export const Dashboard: React.FC = () => {
    const { needsCheckin, completeCheckin, dismissCheckin } = useDailyCheckin();
    const { settings, updateSetting } = useSettings();
    const [journalEntries] = useStorageState<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
    const isNewUser = journalEntries.length === 0;

    const widgetVisibility = {
        summary: true,
        coach: true,
        suggestions: true,
        'quick-actions': true,
        ...settings.dashboardWidgets,
    };

    return (
        <SuggestionProvider>
            <div className="module-view dashboard-view fade-in">
                 <div className="module-content">
                    {needsCheckin ? (
                        <DailyCheckin onComplete={completeCheckin} onDismiss={dismissCheckin} />
                    ) : (
                        <div className="dashboard-grid">
                            <div className="dashboard-main-column">
                               {isNewUser ? (
                                   <WelcomeCard />
                                ) : (
                                     <DraggableWidgetList
                                        widgetIds={settings.dashboardMainOrder}
                                        widgetVisibility={widgetVisibility}
                                        onOrderChange={(newOrder) => updateSetting('dashboardMainOrder', newOrder)}
                                     />
                                )}
                            </div>
                            <div className="dashboard-side-column">
                                {isNewUser ? (
                                    <QuickActions />
                                ) : (
                                     <DraggableWidgetList
                                        widgetIds={settings.dashboardSideOrder}
                                        widgetVisibility={widgetVisibility}
                                        onOrderChange={(newOrder) => updateSetting('dashboardSideOrder', newOrder)}
                                     />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SuggestionProvider>
    );
};