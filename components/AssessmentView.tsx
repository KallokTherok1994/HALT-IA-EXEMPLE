import React, { useState, useEffect, useCallback } from 'react';
import {
    Assessment,
    AssessmentQuestion,
    AssessmentStorage,
    ASSESSMENT_STORAGE_KEY
} from '../types';
import { storage } from '../utils/storage';
import { generateAssessmentQuestions, analyzeAssessmentResults } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { PlusIcon, TrendingUpIcon, LightbulbIcon, ChevronRightIcon, AssessmentIcon } from '../icons';
import { useGoalTracking } from '../contexts/GoalTrackingContext';
import { useToast } from '../contexts/ToastContext';
import { useBadges } from '../contexts/BadgeContext';

type View = 'list' | 'taking' | 'result';

const AssessmentTaker: React.FC<{
    onComplete: (questions: AssessmentQuestion[], answers: number[]) => void;
    onBack: () => void;
}> = ({ onComplete, onBack }) => {
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const fetchedQuestions = await generateAssessmentQuestions();
                setQuestions(fetchedQuestions);
                setAnswers(new Array(fetchedQuestions.length).fill(-1));
            } catch (err) {
                const errorMessage = "Impossible de générer les questions. Veuillez réessayer.";
                setError(errorMessage);
                showToast(errorMessage, "destructive");
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuestions();
    }, [showToast]);

    const handleAnswer = (optionIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = optionIndex;
        setAnswers(newAnswers);
    };
    
    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            onComplete(questions, answers);
        }
    };
    
    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    }

    if (isLoading) return <LoadingIndicator />;
    if (error) return <ErrorMessage message={error} />;
    if (questions.length === 0) return <div className="empty-state"><p>Aucune question n'a pu être chargée.</p></div>

    const currentQuestion = questions[currentStep];
    const isLastStep = currentStep === questions.length - 1;

    return (
        <div className="assessment-taker fade-in">
            <div className="assessment-progress">
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}></div>
                </div>
                <span>Question {currentStep + 1} sur {questions.length}</span>
            </div>
            <div className="assessment-question-area">
                <h3>{currentQuestion.questionText}</h3>
                <div className="assessment-options">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            type="button"
                            className={`option-button ${answers[currentStep] === index ? 'selected' : ''}`}
                            onClick={() => handleAnswer(index)}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
            <div className="wizard-actions">
                <button type="button" onClick={handlePrev} className="button-secondary" disabled={currentStep === 0}>Précédent</button>
                <button type="button" onClick={handleNext} className="button-primary" disabled={answers[currentStep] === -1}>
                    {isLastStep ? 'Terminer' : 'Suivant'}
                </button>
            </div>
        </div>
    );
};

const AssessmentResultDisplay: React.FC<{
    assessment: Assessment;
    onBackToList: () => void;
}> = ({ assessment, onBackToList }) => {
    return (
        <div className="assessment-result-view fade-in">
            <div className="assessment-summary-card">
                 <div className="icon"><LightbulbIcon /></div>
                 <div className="summary-content">
                    <h3>Votre Bilan Personnalisé</h3>
                    <strong>{assessment.result.positiveHighlight}</strong>
                    <p>{assessment.result.gentleSuggestion}</p>
                 </div>
            </div>
            <div className="assessment-answers-review">
                 <h4>Vos réponses</h4>
                 {assessment.questions.map((q, i) => (
                    <div key={i} className="answer-item">
                        <p><strong>{q.questionText}</strong></p>
                        <span>{q.options[assessment.answers[i]]}</span>
                    </div>
                 ))}
            </div>
             <p className="assessment-disclaimer">
                Avertissement : Cette évaluation est un outil de réflexion personnelle et non un diagnostic médical.
            </p>
            <div className="wizard-actions">
                <button type="button" onClick={onBackToList} className="button-primary">Retour à l'historique</button>
            </div>
        </div>
    );
};


export const AssessmentView: React.FC = () => {
    const [assessments, setAssessments] = useState<AssessmentStorage>(() => storage.get(ASSESSMENT_STORAGE_KEY, []));
    const [view, setView] = useState<View>('list');
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { logAction } = useGoalTracking();
    const { showToast } = useToast();
    const { checkForNewBadges } = useBadges();

    useEffect(() => {
        storage.set(ASSESSMENT_STORAGE_KEY, assessments);
    }, [assessments]);

    const handleStartNew = () => {
        setView('taking');
        setSelectedAssessment(null);
    };

    const handleViewResult = (assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setView('result');
    };

    const handleCompleteAssessment = useCallback(async (questions: AssessmentQuestion[], answers: number[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await analyzeAssessmentResults(questions, answers);
            const newAssessment: Assessment = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                questions,
                answers,
                result,
            };
            setAssessments(prev => [newAssessment, ...prev]);
            setSelectedAssessment(newAssessment);
            setView('result');
            logAction('assessment');
            checkForNewBadges();
        } catch (err) {
            const errorMessage = "L'analyse de vos résultats a échoué. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
            setView('list'); // Go back to list on error
        } finally {
            setIsLoading(false);
        }
    }, [logAction, showToast, checkForNewBadges]);
    
    const renderContent = () => {
        if (isLoading) return <LoadingIndicator />;

        switch (view) {
            case 'taking':
                return <AssessmentTaker onComplete={handleCompleteAssessment} onBack={() => setView('list')} />;
            case 'result':
                return selectedAssessment ? <AssessmentResultDisplay assessment={selectedAssessment} onBackToList={() => setView('list')} /> : null;
            case 'list':
            default:
                return (
                     <div className="module-content">
                        {error && <ErrorMessage message={error} />}
                        {assessments.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><AssessmentIcon /></div>
                                <h3>Suivez votre bien-être</h3>
                                <p>Prenez quelques instants pour une évaluation rapide et obtenez une perspective sur votre état d'esprit actuel.</p>
                                <button onClick={handleStartNew} className="button-primary">Commencer ma première évaluation</button>
                            </div>
                        ) : (
                            <div className="assessment-history-list">
                                {assessments.map(item => (
                                    <div key={item.id} className="assessment-history-card" onClick={() => handleViewResult(item)}>
                                        <div className="card-icon"><TrendingUpIcon /></div>
                                        <div className="card-content">
                                            <h4>Évaluation du {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                                            <p>{item.result.positiveHighlight}</p>
                                        </div>
                                         <div className="card-arrow"><ChevronRightIcon /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Évaluation">
                {view === 'list' && (
                    <button onClick={handleStartNew} className="button-primary">
                        <PlusIcon /> Nouvelle Évaluation
                    </button>
                )}
                 {view !== 'list' && (
                    <button onClick={() => setView('list')} className="button-secondary">Retour à l'historique</button>
                )}
            </ModuleHeader>
            {renderContent()}
        </div>
    );
};