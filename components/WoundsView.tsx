import React, { useState } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { WoundsData, WOUNDS_STORAGE_KEY, CoreWound, WoundExercise, TRANSMUTATION_STORAGE_KEY, TransmutationExercise } from '../types';
import { storage } from '../utils/storage';
import { WoundsIcon, HelpCircleIcon, SparklesIcon, SaveIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { generateWoundExercise } from '../services/generative-ai';
import { LoadingIndicator } from './common/LoadingIndicator';
import { TransmutationProgress } from './common/TransmutationProgress';
import { SHADOW_TRANSMUTATIONS } from '../data';
import { useStorageState } from '../hooks/useStorageState';

const QUIZ_QUESTIONS = [
    {
        question: "Quand vous êtes stressé(e), votre réaction principale est de :",
        options: [
            { text: "Vous sentir inadéquat(e) et vouloir disparaître.", value: 'Rejet' },
            { text: "Chercher de l'aide et du réconfort de manière pressante.", value: 'Abandon' },
            { text: "Prendre tout en charge pour les autres, en oubliant vos propres besoins.", value: 'Humiliation' },
            { text: "Devenir méfiant(e) et vouloir tout contrôler.", value: 'Trahison' },
            { text: "Vous sentir frustré(e) par l'imperfection et critiquer.", value: 'Injustice' },
        ],
    },
    {
        question: "Votre plus grande peur dans les relations est :",
        options: [
            { text: "D'être exclu(e) ou de ne pas avoir votre place.", value: 'Rejet' },
            { text: "D'être laissé(e) seul(e) ou oublié(e).", value: 'Abandon' },
            { text: "Que l'on découvre vos 'défauts' et que vous ayez honte.", value: 'Humiliation' },
            { text: "D'être trahi(e), manipulé(e) ou que l'on vous mente.", value: 'Trahison' },
            { text: "De ne pas être respecté(e) ou d'être traité(e) inéquitablement.", value: 'Injustice' },
        ],
    },
    {
        question: "Quelle critique vous blesse le plus ?",
        options: [
            { text: "'Tu n'es rien, tu es nul(le).'", value: 'Rejet' },
            { text: "'Tu ne peux pas t'en sortir sans moi.'", value: 'Abandon' },
            { text: "'Tu es égoïste / Tu ne penses qu'à toi.'", value: 'Humiliation' },
            { text: "'Tu n'es pas fiable / Je ne peux pas te faire confiance.'", value: 'Trahison' },
            { text: "'Ce que tu as fait n'est pas correct / Tu es insensible.'", value: 'Injustice' },
        ],
    },
];

const WOUNDS_REFLECTIONS = {
    'Rejet': "Comment pourriez-vous utiliser votre sensibilité pour créer des espaces où chacun se sent véritablement inclus et accepté ?",
    'Abandon': "Comment pouvez-vous offrir votre capacité de soutien aux autres tout en nourrissant votre propre sécurité intérieure ?",
    'Humiliation': "De quelle manière votre grande sensibilité aux besoins des autres peut-elle devenir un don, une fois que vous honorez d'abord les vôtres ?",
    'Trahison': "Comment votre besoin de fiabilité peut-il se transformer en un talent pour construire des projets et des relations solides basés sur une confiance authentique ?",
    'Injustice': "Comment votre quête de perfection peut-elle servir à élever les standards pour tous, tout en cultivant la compassion pour l'imperfection humaine ?",
    'Indéterminée': "Observez dans quelles situations vous vous sentez le plus activé(e). Qu'est-ce que ces moments révèlent sur ce que vous êtes venu(e) transformer ?"
};

const TransmutationWorkshop: React.FC = () => {
    const [reflections, setReflections] = useStorageState<{[key: string]: string}>(TRANSMUTATION_STORAGE_KEY, {});
    const [activeCardId, setActiveCardId] = useState<string | null>(null);

    const handleSaveReflection = (id: string, text: string) => {
        setReflections(prev => ({ ...prev, [id]: text }));
        setActiveCardId(null);
    };

    return (
        <div className="content-card alchemy-workshop" style={{marginTop: '2rem'}}>
            <h3>Atelier de Transmutation des Ombres</h3>
            <p>Chaque émotion difficile est une énergie qui demande à être transformée. Explorez ces transmutations pour transformer vos ombres en lumière.</p>
            <div className="transmutation-grid">
                {SHADOW_TRANSMUTATIONS.map(item => (
                    <div
                        key={item.id}
                        className={`transmutation-card ${activeCardId === item.id ? 'active' : ''}`}
                        onClick={() => setActiveCardId(activeCardId === item.id ? null : item.id)}
                    >
                        <div className="transmutation-card-front">
                            <span>{item.shadow} ➔ {item.light}</span>
                        </div>
                        <div className="transmutation-card-back">
                            <p><strong>Affirmation :</strong> "{item.affirmation}"</p>
                            <textarea
                                placeholder="Votre réflexion sur cette transmutation..."
                                rows={3}
                                defaultValue={reflections[item.id] || ''}
                                onClick={e => e.stopPropagation()} // Prevent card from flipping back
                                onBlur={(e) => handleSaveReflection(item.id, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const WoundsView: React.FC = () => {
    const [woundsData, setWoundsData] = useState<WoundsData | null>(() => storage.get(WOUNDS_STORAGE_KEY, null));
    const [answers, setAnswers] = useState<string[]>([]);
    const [step, setStep] = useState(0);
    const { showToast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [currentExercise, setCurrentExercise] = useState<{ title: string; prompt: string } | null>(null);
    const [responseText, setResponseText] = useState('');

    const handleAnswer = (value: string) => {
        const newAnswers = [...answers];
        newAnswers[step] = value;
        setAnswers(newAnswers);
        if (step < QUIZ_QUESTIONS.length - 1) {
            setStep(s => s + 1);
        } else {
            calculateResult(newAnswers);
        }
    };

    const calculateResult = (finalAnswers: string[]) => {
        const counts: { [key: string]: number } = {};
        finalAnswers.forEach(answer => {
            counts[answer] = (counts[answer] || 0) + 1;
        });

        const primaryWound = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Indéterminée') as CoreWound;
        
        const newData = { primaryWound, exercises: [] };
        setWoundsData(newData);
        storage.set(WOUNDS_STORAGE_KEY, newData);
    };
    
    const handleReset = () => {
        setWoundsData(null);
        setAnswers([]);
        setStep(0);
        storage.set(WOUNDS_STORAGE_KEY, null);
    };

    const handleGenerateExercise = async () => {
        if (!woundsData) return;
        setIsGenerating(true);
        setCurrentExercise(null);
        setResponseText('');
        try {
            const exercise = await generateWoundExercise(woundsData.primaryWound);
            setCurrentExercise(exercise);
        } catch (error) {
            showToast("La génération de l'exercice a échoué.", "destructive");
        } finally {
            setIsGenerating(false);
        }
    };
    
     const handleSaveExercise = () => {
        if (!responseText.trim() || !woundsData || !currentExercise) return;

        const newExercise: WoundExercise = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            promptTitle: currentExercise.title,
            prompt: currentExercise.prompt,
            response: responseText,
        };

        const updatedData: WoundsData = {
            ...woundsData,
            exercises: [newExercise, ...(woundsData.exercises || [])]
        };

        setWoundsData(updatedData);
        storage.set(WOUNDS_STORAGE_KEY, updatedData);
        setCurrentExercise(null);
        setResponseText('');
        showToast("Réflexion sauvegardée.", "success");
    };

    if (!woundsData) {
        return (
            <div className="module-view fade-in">
                <ModuleHeader title="Identifier votre blessure" />
                <div className="module-content assessment-taker">
                     <div className="assessment-progress">
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%` }}></div>
                        </div>
                        <span>Question {step + 1} sur {QUIZ_QUESTIONS.length}</span>
                    </div>
                    <div className="assessment-question-area">
                        <h3>{QUIZ_QUESTIONS[step].question}</h3>
                        <div className="assessment-options">
                            {QUIZ_QUESTIONS[step].options.map(option => (
                                <button
                                    key={option.value}
                                    className="option-button"
                                    onClick={() => handleAnswer(option.value)}
                                >
                                    {option.text}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentWoundReflection = WOUNDS_REFLECTIONS[woundsData.primaryWound];

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Alchimie Intérieure">
                <button onClick={handleReset} className="button-secondary">Recommencer le test</button>
            </ModuleHeader>
            <div className="module-content" style={{maxWidth: '800px', margin: '0 auto'}}>
                <TransmutationProgress woundsData={woundsData} />

                <div className="content-card" style={{ marginBottom: '2rem', background: 'var(--color-bg-muted)' }}>
                    <div className="analysis-item">
                        <div className="icon"><HelpCircleIcon /></div>
                        <div className="analysis-item-content">
                            <strong>Piste de Réflexion</strong>
                            <p className="reflection-question">{currentWoundReflection}</p>
                        </div>
                    </div>
                </div>

                <div className="content-card alchemy-workshop">
                    <h3>Votre Atelier d'Alchimie Personnalisé</h3>
                    {!currentExercise && (
                        <>
                            <p>Prêt(e) à travailler sur cette blessure ? Générez un exercice personnalisé pour commencer la transmutation.</p>
                            <button onClick={handleGenerateExercise} className="button-primary" disabled={isGenerating}>
                                <SparklesIcon className={isGenerating ? 'spinning' : ''} /> {isGenerating ? 'Génération...' : "Générer un exercice"}
                            </button>
                        </>
                    )}
                    {isGenerating && <LoadingIndicator />}

                    {currentExercise && (
                        <div className="exercise-prompt fade-in">
                            <h4>{currentExercise.title}</h4>
                            <p className="reflection-question"><em>"{currentExercise.prompt}"</em></p>
                            <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Votre réflexion..."
                                rows={5}
                            />
                            <button onClick={handleSaveExercise} className="button-primary" disabled={!responseText.trim()}>
                                <SaveIcon /> Sauvegarder ma réflexion
                            </button>
                        </div>
                    )}
                </div>

                 {(woundsData.exercises || []).length > 0 && (
                    <div className="exercise-history">
                        <h4>Historique de vos réflexions</h4>
                        <div className="exercise-list stagger-fade-in">
                            {(woundsData.exercises || []).map((ex, index) => (
                                <div key={ex.id} className="content-card exercise-card" style={{ '--stagger-index': index } as React.CSSProperties}>
                                    <time>{new Date(ex.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                                    <h5>{ex.promptTitle}</h5>
                                    <p className="response-text">{ex.response}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 <TransmutationWorkshop />
            </div>
        </div>
    );
};