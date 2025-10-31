import React from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { useProgressData } from '../hooks/useProgressData';
import { LoadingIndicator } from './common/LoadingIndicator';
import { CalendarHeatmap } from './common/CalendarHeatmap';
import { Badge, ProgressAnalysis, RecentStep } from '../types';
import { FlameIcon, BookOpenIcon, AwardIcon, CheckCircleIcon, CoachAIIcon, StarIcon, LightbulbIcon, ArrowRightIcon } from '../icons';
import { BarChart } from './common/BarChart';
import { useAppContext } from '../contexts/AppContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.FC<any> }> = ({ title, value, icon: Icon }) => (
    <div className="stat-card content-card">
        <div className="stat-icon"><Icon /></div>
        <div className="stat-content">
            <p className="stat-title">{title}</p>
            <div className="stat-value">
                <span>{value}</span>
            </div>
        </div>
    </div>
);

const BadgeDisplay: React.FC<{ badges: Badge[] }> = ({ badges }) => {
    if (badges.length === 0) return null;

    return (
        <div className="badges-section content-card">
            <h3><AwardIcon /> Trophées</h3>
            <div className="badges-grid">
                {badges.map(badge => (
                    <div key={badge.id} className="badge-item" title={`${badge.name}: ${badge.description}`}>
                        <span className="badge-icon">{badge.icon}</span>
                        <span className="badge-name">{badge.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProgressAnalysisCard: React.FC<{
    analysis: ProgressAnalysis;
    onNavigate: (moduleId: string) => void;
}> = ({ analysis, onNavigate }) => (
    <div className="progress-analysis-card content-card fade-in">
        <div className="progress-analysis-header">
            <CoachAIIcon />
            <h3>Analyse de Hal</h3>
        </div>
        <div className="analysis-point">
            <div className="icon"><StarIcon /></div>
            <div className="analysis-point-content">
                <strong>Point Fort</strong>
                <p>{analysis.positiveObservation}</p>
            </div>
        </div>
        <div className="analysis-point">
            <div className="icon"><LightbulbIcon /></div>
            <div className="analysis-point-content">
                <strong>Piste de Réflexion</strong>
                <p>{analysis.areaForAttention}</p>
            </div>
        </div>
        <div className="analysis-point">
            <div className="icon"><ArrowRightIcon /></div>
            <div className="analysis-point-content">
                <strong>Suggestion</strong>
                <p className="analysis-suggestion-text">"{analysis.actionableSuggestion.text}"</p>
                <button 
                    onClick={() => onNavigate(analysis.actionableSuggestion.moduleId)}
                    className="button-secondary"
                    style={{marginTop: 'var(--spacing-sm)'}}
                >
                    {analysis.actionableSuggestion.ctaText}
                </button>
            </div>
        </div>
    </div>
);

const AnalysisSkeleton: React.FC = () => (
     <div className="content-card progress-analysis-card">
        <div className="progress-analysis-header">
             <h3 className="skeleton skeleton-text" style={{width: '60%', height: '1.4rem'}}></h3>
        </div>
        <div className="analysis-point">
             <div className="skeleton" style={{width: '24px', height: '24px', borderRadius: '50%'}}></div>
             <div style={{flex: 1}}>
                 <strong className="skeleton skeleton-text" style={{width: '30%'}}></strong>
                 <p className="skeleton skeleton-text" style={{width: '90%'}}></p>
                 <p className="skeleton skeleton-text" style={{width: '70%'}}></p>
             </div>
        </div>
         <div className="analysis-point">
             <div className="skeleton" style={{width: '24px', height: '24px', borderRadius: '50%'}}></div>
             <div style={{flex: 1}}>
                 <strong className="skeleton skeleton-text" style={{width: '40%'}}></strong>
                 <p className="skeleton skeleton-text" style={{width: '80%'}}></p>
             </div>
        </div>
     </div>
);


export const ProgressView: React.FC = () => {
    const { navigateTo } = useAppContext();
    const { 
        loading, 
        isAnalysisLoading,
        analysis,
        totalJournalEntries,
        totalRitualsCompleted,
        journalingStreak,
        ritualStreak,
        journalHeatmapData,
        ritualHeatmapData,
        badges,
        moodDistribution,
        totalCompletedGoals,
        totalCompletedSteps,
        recentCompletedSteps,
    } = useProgressData();

    if (loading) {
        return (
             <div className="module-view">
                <ModuleHeader title="Progrès" />
                <div className="module-content"><LoadingIndicator /></div>
            </div>
        );
    }
    
    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Progrès & Accomplissements" />
            <div className="module-content progress-view-layout">

                {isAnalysisLoading ? (
                    <AnalysisSkeleton />
                ) : analysis ? (
                    <ProgressAnalysisCard analysis={analysis} onNavigate={navigateTo} />
                ) : null}

                <div className="stats-grid">
                    <StatCard 
                        title="Série Journal (Actuelle / Max)" 
                        value={`${journalingStreak.current} / ${journalingStreak.longest}`}
                        icon={BookOpenIcon} 
                    />
                    <StatCard 
                        title="Série Rituels (Actuelle / Max)" 
                        value={`${ritualStreak.current} / ${ritualStreak.longest}`}
                        icon={FlameIcon} 
                    />
                     <StatCard 
                        title="Entrées de journal" 
                        value={totalJournalEntries}
                        icon={BookOpenIcon} 
                    />
                      <StatCard 
                        title="Rituels complétés" 
                        value={totalRitualsCompleted}
                        icon={FlameIcon} 
                    />
                    <StatCard
                        title="Objectifs Atteints"
                        value={totalCompletedGoals}
                        icon={AwardIcon}
                    />
                    <StatCard
                        title="Étapes Terminées"
                        value={totalCompletedSteps}
                        icon={CheckCircleIcon}
                    />
                </div>
                
                {recentCompletedSteps.length > 0 && (
                    <div className="recent-achievements-section content-card">
                        <h3><CheckCircleIcon /> Activité Récente des Objectifs</h3>
                        <ul className="achievements-list">
                            {recentCompletedSteps.map((step: RecentStep) => (
                                <li key={step.id} className="achievement-item">
                                    <span className="achievement-title">{step.title}</span>
                                    <span className="achievement-goal">dans "{step.goalTitle}"</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <BadgeDisplay badges={badges} />

                <div className="heatmap-section content-card">
                   <CalendarHeatmap
                        label="Activité du Journal"
                        data={journalHeatmapData}
                        colorScale={['var(--color-bg-muted)', 'var(--color-secondary-light)', 'var(--color-secondary)', 'var(--color-secondary-dark)']}
                   />
                </div>
                
                 <div className="heatmap-section content-card">
                   <CalendarHeatmap
                        label="Activité des Rituels"
                        data={ritualHeatmapData}
                        colorScale={['var(--color-bg-muted)', 'var(--color-primary-light)', 'var(--color-primary)', 'var(--color-primary-dark)']}
                   />
                </div>

                {moodDistribution.some(m => m.count > 0) && (
                    <div className="mood-chart-section content-card">
                        <h4>Tendance de l'humeur (30 derniers jours)</h4>
                       <BarChart
                            data={moodDistribution.map(m => ({
                                label: m.label,
                                value: m.count,
                                emoji: m.emoji
                            }))}
                       />
                    </div>
                )}
            </div>
        </div>
    );
};