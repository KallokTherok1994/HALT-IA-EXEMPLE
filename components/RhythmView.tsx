import React, { useState, useEffect } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { RhythmData, RHYTHM_STORAGE_KEY, Chronotype, InnerSeason } from '../types';
import { storage } from '../utils/storage';
import { RhythmIcon } from '../icons';
import { useRhythmAdvice } from '../hooks/useRhythmAdvice';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';

const QUIZ_QUESTIONS = [
    {
        question: "Si vous n'aviez aucune contrainte, vous vous lèveriez naturellement :",
        options: [
            { text: "Entre 5h et 6h30", value: 'A' },
            { text: "Entre 6h30 et 8h", value: 'B' },
            { text: "Entre 8h et 9h30", value: 'C' },
            { text: "Après 9h30", value: 'D' },
        ],
    },
    {
        question: "Votre pic de créativité et d'énergie mentale arrive :",
        options: [
            { text: "Très tôt le matin (6h-9h)", value: 'A' },
            { text: "En fin de matinée (9h-12h)", value: 'B' },
            { text: "En début d'après-midi (14h-17h)", value: 'C' },
            { text: "En soirée (18h-22h)", value: 'D' },
        ],
    },
    {
        question: "Pour une tâche complexe, vous êtes le plus efficace :",
        options: [
            { text: "Dès le réveil", value: 'A' },
            { text: "Après le café du matin", value: 'B' },
            { text: "Après le déjeuner", value: 'C' },
            { text: "En fin de journée", value: 'D' },
        ],
    },
     {
        question: "Votre humeur naturelle le matin est :",
        options: [
            { text: "Excellente, je bondis du lit", value: 'A' },
            { text: "Bonne après quelques minutes", value: 'B' },
            { text: "Moyenne, il faut du temps", value: 'C' },
            { text: "Difficile pendant au moins 1 heure", value: 'D' },
        ],
    },
];

const CHRONOTYPE_INFO = {
    'Alouette': {
        icon: '☀️',
        description: "Vous êtes plus productif et énergique le matin. Votre défi est de protéger vos soirées pour bien récupérer.",
        tip: "Planifiez vos tâches les plus importantes avant midi pour surfer sur votre vague d'énergie naturelle."
    },
    'Bimodal': {
        icon: '🔄',
        description: "Vous avez deux pics d'énergie, souvent en fin de matinée et en fin d'après-midi, avec un creux après le déjeuner.",
        tip: "Utilisez le creux de l'après-midi pour des tâches légères ou une pause régénérante."
    },
    'Hibou': {
        icon: '🌙',
        description: "Votre énergie et votre créativité culminent en fin d'après-midi et en soirée. Les matins peuvent être difficiles.",
        tip: "Ne luttez pas contre votre nature. Gardez les tâches simples pour le matin et réservez vos soirées pour le travail de fond."
    },
    'Indéterminé': {
        icon: '❓',
        description: "Votre rythme semble flexible ou ne correspond pas à un profil clair. Écoutez vos signaux quotidiens.",
        tip: "Tenez un journal de votre énergie pendant une semaine pour identifier des schémas plus subtils."
    }
};

const INNER_SEASONS: { name: InnerSeason; icon: string; description: string }[] = [
    { name: 'Printemps', icon: '🌱', description: "Énergie de commencement, curiosité, nouvelles idées." },
    { name: 'Été', icon: '🌳', description: "Énergie d'action, de construction, de pleine expression." },
    { name: 'Automne', icon: '🍂', description: "Énergie de bilan, de récolte, de consolidation." },
    { name: 'Hiver', icon: '❄️', description: "Énergie de repos, d'introspection, de régénération." },
];

const RhythmAdviceSection: React.FC = () => {
    const { advice, loading, error } = useRhythmAdvice();

    if (loading) return <LoadingIndicator />;
    if (error) return <ErrorMessage message={error} />;
    if (!advice) return null;

    return (
        <div className="rhythm-advice-section content-card fade-in">
            <div className="rhythm-advice-header">
                <span className="rhythm-advice-icon">{advice.icon}</span>
                <h4>{advice.title}</h4>
            </div>
            <p className="rhythm-advice-content">{advice.advice}</p>
        </div>
    );
};


export const RhythmView: React.FC = () => {
    const [rhythmData, setRhythmData] = useState<RhythmData | null>(() => storage.get(RHYTHM_STORAGE_KEY, null));
    const [answers, setAnswers] = useState<string[]>([]);
    const [step, setStep] = useState(0);

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
        const counts: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0 };
        finalAnswers.forEach(answer => {
            counts[answer]++;
        });

        let chronotype: Chronotype = 'Indéterminé';
        if (counts.A + counts.B > counts.C + counts.D) chronotype = 'Alouette';
        if (counts.D > counts.A + counts.B) chronotype = 'Hibou';
        if (counts.C > counts.A && counts.C > counts.D) chronotype = 'Bimodal';

        const newData = { chronotype, season: rhythmData?.season || null };
        setRhythmData(newData);
        storage.set(RHYTHM_STORAGE_KEY, newData);
    };

    const handleSeasonSelect = (season: InnerSeason) => {
        const newData = { ...rhythmData!, season };
        setRhythmData(newData);
        storage.set(RHYTHM_STORAGE_KEY, newData);
    };
    
    const handleReset = () => {
        setRhythmData(null);
        setAnswers([]);
        setStep(0);
        storage.set(RHYTHM_STORAGE_KEY, null);
    }

    if (!rhythmData) {
        return (
            <div className="module-view fade-in">
                <ModuleHeader title="Découvrez Votre Rythme" />
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

    const currentChronotypeInfo = CHRONOTYPE_INFO[rhythmData.chronotype];

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Votre Rythme Naturel">
                <button onClick={handleReset} className="button-secondary">Recommencer le test</button>
            </ModuleHeader>
            <div className="module-content" style={{maxWidth: '800px', margin: '0 auto'}}>
                <div className="content-card" style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <span style={{fontSize: '3rem'}}>{currentChronotypeInfo.icon}</span>
                    <h2>Vous êtes du type : {rhythmData.chronotype}</h2>
                    <p>{currentChronotypeInfo.description}</p>
                    <p><strong>Conseil :</strong> <em>{currentChronotypeInfo.tip}</em></p>
                </div>

                <div className="content-card" style={{marginBottom: '2rem'}}>
                    <h3 style={{textAlign: 'center'}}>Votre Saison Intérieure Actuelle</h3>
                    <p style={{textAlign: 'center', color: 'var(--color-text-secondary)'}}>Inspiré du livre, reconnaître votre saison intérieure vous aide à aligner vos actions avec votre énergie du moment.</p>
                     <div className="scenario-grid" style={{marginTop: '1.5rem'}}>
                        {INNER_SEASONS.map(season => (
                            <button
                                key={season.name}
                                className={`scenario-card ${rhythmData.season === season.name ? 'selected' : ''}`}
                                onClick={() => handleSeasonSelect(season.name)}
                                style={{textAlign: 'center', borderColor: rhythmData.season === season.name ? 'var(--color-primary)' : 'var(--color-border)'}}
                            >
                                <span style={{fontSize: '2rem'}}>{season.icon}</span>
                                <strong>{season.name}</strong>
                                <span style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>{season.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {rhythmData.season && <RhythmAdviceSection />}
            </div>
        </div>
    );
};