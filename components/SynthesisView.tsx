import React, { useState, useEffect, useCallback } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, BookOpenIcon, TargetIcon, LightbulbIcon, LayersIcon, BrainCircuitIcon } from '../icons';
import { SynthesisReport, SYNTHESIS_STORAGE_KEY, SynthesisStorage, JournalEntry, JOURNAL_STORAGE_KEY, RitualsStorage, RITUALS_STORAGE_KEY, GoalsStorage, GOALS_STORAGE_KEY, ThoughtCase, THOUGHT_COURT_STORAGE_KEY, UserValues, VALUES_STORAGE_KEY, ThematicSynthesis } from '../types';
import { storage } from '../utils/storage';
import { getMonthId, getMonthName, navigateMonth } from '../utils/dateHelpers';
import { generateMonthlySynthesis, generateThematicSynthesis } from '../services/generative-ai';
import { useToast } from '../contexts/ToastContext';
import { useStorageState } from '../hooks/useStorageState';
import { useSettings } from '../contexts/SettingsContext';
import { useAppContext } from '../contexts/AppContext';

// Helper function to prepare data for the AI
const prepareMonthlyDataSummary = (monthId: string): string => {
    const [year, month] = monthId.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let summary = `Synthèse pour ${getMonthName(monthId)}.\n`;

    // Journal
    const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
    const monthlyEntries = journalEntries.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate >= startDate && entryDate <= endDate;
    });
    if (monthlyEntries.length > 0) {
        summary += `\n--- JOURNAL (${monthlyEntries.length} entrées) ---\n`;
        monthlyEntries.slice(0, 15).forEach(e => { // Limit to avoid huge prompts
            summary += `Titre: ${e.title}. Contenu: "${e.content.substring(0, 200)}..."\n`;
        });
    }

    // Rituals
    const ritualsData = storage.get<RitualsStorage>(RITUALS_STORAGE_KEY, { rituals: [], completions: {} });
    if (ritualsData.rituals.length > 0) {
        const monthlyCompletions = Object.entries(ritualsData.completions).filter(([dateStr]) => dateStr.startsWith(monthId));
        const totalDays = endDate.getDate();
        summary += `\n--- RITUELS (${monthlyCompletions.length}/${totalDays} jours avec activité) ---\n`;
        summary += `Rituels définis: ${ritualsData.rituals.map(r => r.name).join(', ')}\n`;
    }

    // Goals
    const goals = storage.get<GoalsStorage>(GOALS_STORAGE_KEY, []);
    const activeGoals = goals.filter(g => !g.steps.every(s => s.completed));
    if (activeGoals.length > 0) {
        summary += `\n--- OBJECTIFS ---\n`;
        activeGoals.forEach(g => {
            const completed = g.steps.filter(s => s.completed).length;
            summary += `Objectif "${g.title}" - Progression: ${completed}/${g.steps.length} étapes.\n`;
        });
    }
    
    // Thought Court
    const thoughtCases = storage.get<ThoughtCase[]>(THOUGHT_COURT_STORAGE_KEY, []);
    const monthlyCases = thoughtCases.filter(c => {
        const caseDate = new Date(c.date);
        return caseDate >= startDate && caseDate <= endDate;
    });
    if (monthlyCases.length > 0) {
        summary += `\n--- TRIBUNAL DES PENSÉES (${monthlyCases.length} affaires) ---\n`;
        monthlyCases.slice(0, 10).forEach(c => {
             summary += `Pensée négative: "${c.negativeThought}" -> Pensée équilibrée: "${c.balancedThought}"\n`;
        });
    }

    // Values
    const userValues = storage.get<UserValues>(VALUES_STORAGE_KEY, { prioritizedValues: [], reflectionQuestions: {} });
    if (userValues.prioritizedValues.length > 0) {
        summary += `\n--- VALEURS FONDAMENTALES ---\n`;
        summary += userValues.prioritizedValues.join(', ');
    }

    return summary;
};


const ReportDisplay: React.FC<{ report: SynthesisReport }> = ({ report }) => (
    <div className="synthesis-report content-card fade-in">
        <div className="synthesis-section">
            <h3 className="synthesis-section-title"><LayersIcon /> Thèmes Émergents</h3>
            <ul className="synthesis-list">
                {report.emergingThemes.map((theme, i) => <li key={i}>{theme}</li>)}
            </ul>
        </div>
        <div className="synthesis-section">
            <h3 className="synthesis-section-title"><TargetIcon /> Progrès & Habitudes</h3>
            <p>{report.progressSummary}</p>
        </div>
        <div className="synthesis-section">
            <h3 className="synthesis-section-title"><BookOpenIcon /> Sagesse de Vos Écrits</h3>
            {report.wisdomFromWritings.map((quote, i) => <blockquote key={i} className="synthesis-quote">"{quote}"</blockquote>)}
        </div>
        <div className="synthesis-section">
            <h3 className="synthesis-section-title"><LightbulbIcon /> Pistes pour le Mois Prochain</h3>
            <ul className="synthesis-list">
                {report.suggestionsForNextMonth.map((suggestion, i) => <li key={i}>{suggestion}</li>)}
            </ul>
        </div>
    </div>
);

const MonthlyView: React.FC = () => {
    const [syntheses, setSyntheses] = useStorageState<SynthesisStorage>(SYNTHESIS_STORAGE_KEY, {});
    const [currentMonthId, setCurrentMonthId] = useState(getMonthId(new Date()));
    const [displayMonthId, setDisplayMonthId] = useState(currentMonthId);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const dataSummary = prepareMonthlyDataSummary(currentMonthId);
            const result = await generateMonthlySynthesis(dataSummary, settings);
            const newReport: SynthesisReport = { monthId: currentMonthId, ...result };
            setSyntheses(prev => ({ ...prev, [currentMonthId]: newReport }));
            showToast("Votre synthèse mensuelle est prête !", "success");
        } catch (err) {
            console.error(err);
            const errorMessage = "La génération de la synthèse a échoué. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
        } finally {
            setIsLoading(false);
        }
    }, [currentMonthId, showToast, setSyntheses, settings]);
    
    const handleNavigate = (direction: 'prev' | 'next') => {
        setDisplayMonthId(prev => navigateMonth(prev, direction));
    };

    const displayedReport = syntheses[displayMonthId];
    const canGenerate = !syntheses[currentMonthId];

    return (
        <>
            <ModuleHeader title={`Synthèse - ${getMonthName(displayMonthId)}`}>
                <div className="action-button-group">
                    <button onClick={() => handleNavigate('prev')} className="button-icon" aria-label="Mois précédent"><ChevronLeftIcon /></button>
                    <button onClick={() => handleNavigate('next')} className="button-icon" aria-label="Mois suivant" disabled={displayMonthId === currentMonthId}><ChevronRightIcon /></button>
                </div>
            </ModuleHeader>
            <div className="module-content">
                {isLoading && <LoadingIndicator />}
                {error && <ErrorMessage message={error} />}
                {!isLoading && !error && (
                    <>
                        {displayedReport ? (
                            <ReportDisplay report={displayedReport} />
                        ) : (
                             <div className="empty-state">
                                {displayMonthId === currentMonthId && canGenerate ? (
                                    <>
                                        <h3>Prêt pour votre synthèse du mois ?</h3>
                                        <p>L'IA va analyser votre parcours du mois écoulé pour vous offrir des perspectives uniques.</p>
                                        <button onClick={handleGenerate} className="button-primary"><SparklesIcon /> Générer ma synthèse</button>
                                    </>
                                ) : (
                                    <>
                                        <h3>Aucune synthèse disponible</h3>
                                        <p>Aucune synthèse n'a été générée pour {getMonthName(displayMonthId)}. Continuez d'utiliser l'application pour pouvoir générer une synthèse à la fin du mois.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

const ThematicView: React.FC = () => {
    const [theme, setTheme] = useState('');
    const [result, setResult] = useState<ThematicSynthesis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { settings } = useSettings();
    const { showToast } = useToast();
    const { navigateTo } = useAppContext();

    const handleAnalyze = async () => {
        if (!theme.trim()) {
            showToast("Veuillez entrer un thème à analyser.", "info");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const analysisResult = await generateThematicSynthesis(theme, settings);
            setResult({ theme, ...analysisResult });
        } catch (err: any) {
            const errorMessage = err.message || "L'analyse thématique a échoué. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <ModuleHeader title="Synthèse Thématique" />
            <div className="module-content">
                <div className="thematic-input-container content-card">
                    <p>Explorez un thème, un concept ou une relation à travers toutes vos données. L'IA trouvera les connexions et les schémas pour vous.</p>
                    <form onSubmit={e => { e.preventDefault(); handleAnalyze(); }} className="input-with-button">
                        <input
                            type="text"
                            value={theme}
                            onChange={e => setTheme(e.target.value)}
                            placeholder="Ex: Confiance en soi, équilibre, anxiété..."
                            disabled={isLoading}
                        />
                        <button type="submit" className="button-primary" disabled={isLoading}>
                            <SparklesIcon className={isLoading ? 'spinning' : ''}/> Analyser
                        </button>
                    </form>
                </div>

                {isLoading && <LoadingIndicator />}
                {error && <ErrorMessage message={error} />}

                {result && (
                    <div className="thematic-result-container fade-in">
                        <div className="synthesis-report content-card">
                            <div className="synthesis-section">
                                <h3 className="synthesis-section-title"><LayersIcon /> Résumé sur "{result.theme}"</h3>
                                <p>{result.summary}</p>
                            </div>
                            <div className="synthesis-section">
                                <h3 className="synthesis-section-title"><BookOpenIcon /> Aperçus & Connexions</h3>
                                {result.keyInsights.map((insight, i) => (
                                    <div key={i} className="insight-card">
                                        <p>{insight.insight}</p>
                                        <div className="insight-sources">
                                            <span>Sources :</span>
                                            {insight.supportingEntries.map(entry => (
                                                <button key={entry.entryId} className="insight-source" onClick={() => navigateTo(entry.moduleId, entry.entryId)}>
                                                    {entry.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="synthesis-section">
                                <h3 className="synthesis-section-title"><BrainCircuitIcon /> Schéma Émergent</h3>
                                <p>{result.emergingPattern}</p>
                            </div>
                             <div className="synthesis-section">
                                <h3 className="synthesis-section-title"><LightbulbIcon /> Piste de Réflexion</h3>
                                <blockquote className="synthesis-quote">"{result.reflectionPrompt}"</blockquote>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export const SynthesisView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'monthly' | 'thematic'>('monthly');

    return (
        <div className="module-view fade-in">
            <div className="synthesis-tabs">
                <button
                    className={`synthesis-tab ${activeTab === 'monthly' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monthly')}
                >
                    Mensuelle
                </button>
                <button
                    className={`synthesis-tab ${activeTab === 'thematic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('thematic')}
                >
                    Thématique
                </button>
            </div>
            {activeTab === 'monthly' ? <MonthlyView /> : <ThematicView />}
        </div>
    );
};