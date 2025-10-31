import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { SaveIcon, XIcon, ArrowRightIcon } from '../icons';
import { moodOptions } from '../data';

interface DailyCheckinProps {
  onComplete: (entry: Partial<JournalEntry>) => void;
  onDismiss: () => void;
}

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => (
    <div className="checkin-progress">
        {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`progress-segment ${i < step ? 'completed' : ''}`}></div>
        ))}
    </div>
);


export const DailyCheckin: React.FC<DailyCheckinProps> = ({ onComplete, onDismiss }) => {
    const [step, setStep] = useState(1);
    const [mood, setMood] = useState<string | undefined>();
    const [context, setContext] = useState('');
    const [intention, setIntention] = useState('');

    const handleSelectMood = (selectedMood: string) => {
        setMood(selectedMood);
        setStep(2);
    };

    const handleNext = () => {
        if (step < 3) {
            setStep(s => s + 1);
        }
    };
    
    const handleBack = () => {
        if (step > 1) {
            setStep(s => s - 1);
        }
    };

    const handleSubmit = () => {
        if (!mood) return;
        
        const contentParts = [];
        if (context.trim()) {
            const moodLabel = moodOptions.find(m => m.emoji === mood)?.label || '';
            const isPositive = ['Heureux', 'Serein', 'Joyeux', 'Excité'].includes(moodLabel);
            const contextTitle = isPositive ? "Ce qui contribue à cette énergie :" : "Ce qui pèse en ce moment :";
            contentParts.push(`${contextTitle}\n${context.trim()}`);
        }
        if (intention.trim()) {
            contentParts.push(`Mon intention pour aujourd'hui :\n${intention.trim()}`);
        }

        const newEntry: Partial<JournalEntry> = {
            title: `Bilan du ${new Date().toLocaleDateString('fr-FR')}`,
            content: contentParts.length > 0 ? contentParts.join('\n\n') : "Bilan rapide de la journée.",
            mood: mood,
            date: new Date().toISOString(),
        };
        onComplete(newEntry);
    };

    const getContextPrompt = () => {
        const moodLabel = moodOptions.find(m => m.emoji === mood)?.label || '';
        const isPositive = ['Heureux', 'Serein', 'Joyeux', 'Excité'].includes(moodLabel);
        if (isPositive) return "Qu'est-ce qui contribue à cette belle énergie ?";
        return "Qu'est-ce qui pèse sur vous en ce moment ?";
    };
    
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="checkin-step" key={1}>
                        <h2>Comment vous sentez-vous aujourd'hui ?</h2>
                        <div className="checkin-mood-options" role="radiogroup" aria-label="Sélecteur d'humeur">
                            {moodOptions.map((option) => (
                                <button key={option.emoji} type="button" onClick={() => handleSelectMood(option.emoji)} className="checkin-mood-option">
                                    <span className="emoji">{option.emoji}</span>
                                    <span className="label">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="checkin-step" key={2}>
                        <h2>{getContextPrompt()} <small>(optionnel)</small></h2>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Écrivez quelques mots..."
                            rows={4}
                            className="checkin-textarea"
                        />
                        <div className="wizard-actions">
                            <button type="button" onClick={handleBack} className="button-secondary">Précédent</button>
                            <button type="button" onClick={handleNext} className="button-primary">Suivant <ArrowRightIcon/></button>
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div className="checkin-step" key={3}>
                        <h2>Quelle est votre intention pour aujourd'hui ? <small>(optionnel)</small></h2>
                        <textarea
                            value={intention}
                            onChange={(e) => setIntention(e.target.value)}
                            placeholder="Ex: Être présent(e) dans mes conversations..."
                            rows={4}
                            className="checkin-textarea"
                        />
                         <div className="wizard-actions">
                             <button type="button" onClick={handleBack} className="button-secondary">Précédent</button>
                             <button type="button" onClick={handleSubmit} className="button-primary">
                                 <SaveIcon /> Terminer et commencer ma journée
                             </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="daily-checkin-wizard content-card fade-in">
            <button type="button" onClick={onDismiss} className="button-icon dismiss-btn" aria-label="Fermer pour aujourd'hui"><XIcon/></button>
            <ProgressBar step={step} totalSteps={3} />
            <div className="checkin-step-container">
                {renderStepContent()}
            </div>
        </div>
    );
};