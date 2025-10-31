import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Module, ChatMessage, CHAT_STORAGE_KEY } from '../types';
import { ModuleHeader } from './common/ModuleHeader';
import { RefreshCwIcon, MicIcon, SendIcon } from '../icons';
import { GEMINI_FLASH_MODEL } from '../services/constants';
import { useStorageState } from '../hooks/useStorageState';
import { generateContextualSummary } from '../utils/dataSummary';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { TypingIndicator } from './common/TypingIndicator';
import { getCoachSystemInstruction } from '../services/generative-ai';

interface CoachAIViewProps {
  module: Module;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const CoachAIView: React.FC<CoachAIViewProps> = ({ module }) => {
    const { settings } = useSettings();
    const { showToast } = useToast();
    const [messages, setMessages] = useStorageState<ChatMessage[]>(CHAT_STORAGE_KEY, []);
    const [chat, setChat] = useState<Chat | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { isListening, transcript, startListening, stopListening, isSupported, error: speechError } = useSpeechRecognition();
    const { play, cancel } = useSpeechSynthesis(settings);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const summary = generateContextualSummary(settings);
        const systemInstruction = `${getCoachSystemInstruction(settings)}\n- Tu es Hal, un coach IA.\n- CONTEXTE UTILISATEUR (ne jamais le mentionner directement) : ${summary}`;
        
        const chatInstance = ai.chats.create({
            model: GEMINI_FLASH_MODEL,
            config: { systemInstruction },
        });
        setChat(chatInstance);

        if (messages.length === 0) {
            const initialMessage = {
                id: 'initial',
                role: 'model' as const,
                text: `Bonjour ${settings.userName || ''}! Je suis Hal. Comment puis-je vous aider aujourd'hui ?`
            };
            setMessages([initialMessage]);
            play(initialMessage.text);
        }
    }, [settings]); 

    useEffect(scrollToBottom, [messages, isLoading]);

    useEffect(() => {
        if (speechError) showToast(`Erreur de reconnaissance vocale: ${speechError}`, 'destructive');
    }, [speechError, showToast]);

    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || !chat) return;

        cancel(); // Stop any ongoing speech

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const resultStream = await chat.sendMessageStream({ message: messageText });
            
            let fullResponse = '';
            let modelMessageId = Date.now().toString() + '-model';
            let firstChunk = true;
            let textBuffer = '';

            for await (const chunk of resultStream) {
                const chunkText = chunk.text;
                fullResponse += chunkText;
                textBuffer += chunkText;

                if (firstChunk) {
                    setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: fullResponse }]);
                    firstChunk = false;
                } else {
                    setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: fullResponse } : m));
                }

                const sentences = textBuffer.split(/(?<=[.!?\n])\s*/);
                if (sentences.length > 1) {
                    const completeSentences = sentences.slice(0, -1);
                    textBuffer = sentences[sentences.length - 1] || '';
                    for (const sentence of completeSentences) {
                        if (sentence.trim()) {
                            play(sentence.trim(), true);
                        }
                    }
                }
            }
            
            if (textBuffer.trim()) {
                play(textBuffer.trim(), true);
            }

        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = "Désolé, une erreur est survenue. Veuillez réessayer.";
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '-error',
                role: 'model',
                text: errorMsg,
            }]);
            play(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [chat, setMessages, play, cancel]);
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input);
    };
    
    const handleSuggestionClick = (prompt: string) => {
        setInput(prompt);
        textareaRef.current?.focus();
        handleSendMessage(prompt);
    }
    
    const handleNewChat = useCallback(() => {
        if (window.confirm("Voulez-vous vraiment commencer une nouvelle discussion ? L'historique actuel sera effacé.")) {
            cancel();
            const initialMessage = {
                id: 'initial-new',
                role: 'model' as const,
                text: 'Bonjour ! Comment puis-je vous aider ?'
            };
            setMessages([initialMessage]);
            play(initialMessage.text);
            const summary = generateContextualSummary(settings);
            const systemInstruction = `${getCoachSystemInstruction(settings)}\n- Tu es Hal, un coach IA.\n- CONTEXTE UTILISATEUR (ne jamais le mentionner directement) : ${summary}`;
            const chatInstance = ai.chats.create({ model: GEMINI_FLASH_MODEL, config: { systemInstruction } });
            setChat(chatInstance);
        }
    }, [cancel, play, setMessages, settings]);
    
    const toggleListen = () => {
        if (isListening) stopListening();
        else startListening();
    };

    return (
        <div className="module-view chat-view fade-in">
            <ModuleHeader title={module.name}>
                <button onClick={handleNewChat} className="button-secondary" title="Nouvelle discussion">
                    <RefreshCwIcon /> Recommencer
                </button>
            </ModuleHeader>
            <div className="chat-history">
                {messages.map(msg => (
                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                        <div className={`message ${msg.role}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <div className="chat-input-actions">
                    <div className="chat-suggestions">
                        {settings.customCoachPrompts.slice(0, 2).map(prompt => (
                            <button key={prompt} type="button" className="suggestion-chip" onClick={() => handleSuggestionClick(prompt)}>
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
                <form className="chat-input-form" onSubmit={handleFormSubmit}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(input);
                            }
                        }}
                        placeholder="Posez votre question à Hal..."
                        rows={1}
                        disabled={isLoading}
                    />
                     {isSupported && (
                        <button
                            type="button"
                            onClick={toggleListen}
                            className={`voice-input-button ${isListening ? 'recording' : ''}`}
                            aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
                        >
                            <MicIcon />
                        </button>
                    )}
                    <button type="submit" className="button-primary" disabled={isLoading || !input.trim()}><SendIcon /></button>
                </form>
            </div>
        </div>
    );
};