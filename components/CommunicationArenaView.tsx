import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { SendIcon, UsersIcon, LightbulbIcon, StarIcon, FlagIcon, ArrowRightIcon } from '../icons';
import { GEMINI_FLASH_MODEL } from '../services/constants';
import { getConversationFeedback } from '../services/generative-ai';
import { ConversationFeedback } from '../types';
import { useToast } from '../contexts/ToastContext';

type View = 'setup' | 'practice' | 'feedback';
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PREDEFINED_SCENARIOS = [
    {
        title: "Demander une augmentation",
        goal: "Négocier une augmentation de salaire de manière professionnelle et convaincante, en mettant en avant mes contributions.",
        persona: "Mon manager, qui est axé sur les résultats, respecte les données chiffrées, mais est très occupé."
    },
    {
        title: "Exprimer un désaccord à un ami",
        goal: "Exprimer mon désaccord sur une décision qu'il a prise sans endommager notre amitié, en utilisant une communication non-violente.",
        persona: "Un ami proche qui peut être sensible à la critique mais qui est généralement compréhensif."
    },
    {
        title: "Fixer des limites avec un membre de la famille",
        goal: "Communiquer clairement et fermement mes limites concernant ses visites imprévues, tout en restant affectueux.",
        persona: "Un membre de ma famille (ex: ma mère) qui a de bonnes intentions mais a tendance à être envahissant."
    },
    {
        title: "Gérer un retour négatif au travail",
        goal: "Recevoir un feedback négatif sur mon travail de manière constructive, sans devenir défensif, et clarifier les prochaines étapes.",
        persona: "Un collègue ou un manager qui me donne un retour critique sur un projet."
    }
];

const SetupView: React.FC<{ onStart: (goal: string, persona: string) => void }> = ({ onStart }) => {
    const [myGoal, setMyGoal] = useState('');
    const [theirPersona, setTheirPersona] = useState('');

    const handleStart = () => {
        if(myGoal.trim() && theirPersona.trim()) {
            onStart(myGoal, theirPersona);
        }
    };
    
    const handleScenarioSelect = (scenario: { goal: string; persona: string; }) => {
        setMyGoal(scenario.goal);
        setTheirPersona(scenario.persona);
    };

    return (
        <div className="empty-state fade-in" style={{maxWidth: '700px'}}>
            <div className="empty-state-icon"><UsersIcon /></div>
            <h3>Bienvenue dans l'Arène</h3>
            <p>Préparez-vous pour vos conversations importantes en vous entraînant ici. Décrivez le scénario et l'IA jouera le rôle de votre interlocuteur.</p>
            
            <div className="scenario-selection">
                <h4>Ou choisissez un scénario courant :</h4>
                <div className="scenario-grid">
                    {PREDEFINED_SCENARIOS.map(scenario => (
                        <button key={scenario.title} className="scenario-card" onClick={() => handleScenarioSelect(scenario)}>
                            {scenario.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group" style={{width: '100%', textAlign: 'left', marginTop: '2rem'}}>
                <label htmlFor="my-goal">Quel est votre objectif pour cette conversation ?</label>
                <input 
                    id="my-goal"
                    type="text"
                    value={myGoal}
                    onChange={e => setMyGoal(e.target.value)}
                    placeholder="Ex: Demander une augmentation avec confiance"
                />
            </div>
            <div className="form-group" style={{width: '100%', textAlign: 'left'}}>
                <label htmlFor="their-persona">Décrivez la personne à qui vous allez parler</label>
                <textarea
                    id="their-persona"
                    value={theirPersona}
                    onChange={e => setTheirPersona(e.target.value)}
                    placeholder="Ex: Mon patron, qui est souvent stressé et direct."
                    rows={3}
                />
            </div>
            <button 
                onClick={handleStart} 
                className="button-primary" 
                style={{width: '100%', marginTop: '1rem'}}
                disabled={!myGoal.trim() || !theirPersona.trim()}
            >
                Commencer la simulation
            </button>
        </div>
    );
};

const PracticeView: React.FC<{
    chat: Chat;
    onEnd: (history: ChatMessage[]) => void;
}> = ({ chat, onEnd }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const initialMessage: ChatMessage = {
            id: 'initial',
            role: 'model',
            text: "Je suis prêt. Comment souhaitez-vous commencer la conversation ?"
        };
        setMessages([initialMessage]);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleSendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chat.sendMessage({ message: input });
            const modelMessage: ChatMessage = {
                id: Date.now().toString() + '-model',
                role: 'model',
                text: result.text
            };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '-error',
                role: 'model',
                text: "Désolé, une erreur est survenue."
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [chat, input, isLoading]);
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage();
    };

    return (
        <div className="chat-view practice-view fade-in">
             <div className="chat-history">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                        <div className={`message ${msg.role}`}>
                            {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="message-wrapper model"><LoadingIndicator /></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <form className="chat-input-form" onSubmit={handleFormSubmit}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Votre réponse..."
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}><SendIcon /></button>
                </form>
                <button onClick={() => onEnd(messages)} className="button-secondary end-practice-btn">Terminer et obtenir un feedback</button>
            </div>
        </div>
    );
};

const FeedbackView: React.FC<{ feedback: ConversationFeedback, onRestart: () => void }> = ({ feedback, onRestart }) => {
    return (
        <div className="feedback-view fade-in">
            <h3>Votre Feedback de Communication</h3>
            <div className="feedback-card content-card">
                <div className="icon"><StarIcon /></div>
                <h4>Points Forts</h4>
                <ul>
                    {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
             <div className="feedback-card content-card">
                <div className="icon"><FlagIcon /></div>
                <h4>Axes d'Amélioration</h4>
                <ul>
                    {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            {feedback.suggestions.length > 0 && (
                 <div className="feedback-card content-card">
                    <div className="icon"><LightbulbIcon /></div>
                    <h4>Suggestions de Reformulation</h4>
                    {feedback.suggestions.map((s, i) => (
                        <div key={i} className="suggestion-item">
                            <p><strong>Au lieu de :</strong> "{s.original}"</p>
                            <p><strong>Essayez :</strong> "{s.suggested}"</p>
                        </div>
                    ))}
                </div>
            )}
             <button onClick={onRestart} className="button-primary" style={{marginTop: '2rem'}}>
                Recommencer une nouvelle simulation <ArrowRightIcon/>
            </button>
        </div>
    );
};


export const CommunicationArenaView: React.FC = () => {
    const [view, setView] = useState<View>('setup');
    const [chat, setChat] = useState<Chat | null>(null);
    const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    const handleStartPractice = (goal: string, persona: string) => {
        const systemInstruction = `Tu es un partenaire de jeu de rôle pour une simulation de conversation.
        L'objectif de l'utilisateur est : "${goal}".
        Ton personnage est : "${persona}".
        Incarne ce personnage de manière réaliste. Ne sois pas trop facile, mais reste constructif.
        Réponds de manière concise et naturelle. Reste dans ton rôle. Ne sors jamais de ton personnage.`;

        const chatInstance = ai.chats.create({
            model: GEMINI_FLASH_MODEL,
            config: {
                systemInstruction,
            },
        });
        setChat(chatInstance);
        setView('practice');
    };

    const handleEndPractice = async (history: ChatMessage[]) => {
        setIsLoading(true);
        setError('');
        try {
            const userHistory = history.filter(m => m.role === 'user' || m.role === 'model');
            const feedbackResult = await getConversationFeedback(userHistory);
            setFeedback(feedbackResult);
            setView('feedback');
        } catch (err) {
            const errorMessage = "Impossible de générer le feedback. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
            setView('setup'); // Fallback to setup
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRestart = () => {
        setChat(null);
        setFeedback(null);
        setView('setup');
    };

    const renderContent = () => {
        if (isLoading) return <LoadingIndicator />;
        if (error) return <ErrorMessage message={error} />;

        switch(view) {
            case 'setup':
                return <SetupView onStart={handleStartPractice} />;
            case 'practice':
                return chat ? <PracticeView chat={chat} onEnd={handleEndPractice} /> : <LoadingIndicator />;
            case 'feedback':
                return feedback ? <FeedbackView feedback={feedback} onRestart={handleRestart} /> : <LoadingIndicator />;
            default:
                return <SetupView onStart={handleStartPractice} />;
        }
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Arène de Communication" />
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};