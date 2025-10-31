import { useState, useRef, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';

type SpeechState = 'idle' | 'speaking' | 'paused';

const selectBestFrenchVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr'));
    if (frenchVoices.length === 0) return null;

    // 1. Prioritize voices with "Enhanced" or "Premium" in their name
    const premiumVoices = frenchVoices.filter(v => v.name.includes('(Enhanced)') || v.name.toLowerCase().includes('premium'));
    if (premiumVoices.length > 0) {
        // Prefer non-local premium voices if available
        const nonLocalPremium = premiumVoices.find(v => !v.localService);
        if (nonLocalPremium) return nonLocalPremium;
        return premiumVoices[0];
    }

    // 2. Search from a curated list of high-quality voice names
    const preferredVoices = [
        // macOS/iOS
        'Amelie', 'Thomas', 'Audrey', 'Aurelie',
        // Windows
        'Microsoft Julie - French (France)', 'Microsoft Hortense - French (France)',
        // Google/Android
        'Google français',
        // Other
        'Microsoft Paul - French (France)',
    ];

    for (const name of preferredVoices) {
        const found = frenchVoices.find(v => v.name === name);
        if (found) return found;
    }

    // 3. Prioritize any non-local (server-side) voice
    const nonLocal = frenchVoices.find(v => !v.localService);
    if (nonLocal) return nonLocal;

    // 4. Fallback to the first available French voice
    return frenchVoices[0];
};

export const useSpeechSynthesis = (settings: AppSettings) => {
    const [speechState, setSpeechState] = useState<SpeechState>('idle');
    const [progress, setProgress] = useState(0);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    const utteranceQueue = useRef<string[]>([]);
    const isProcessing = useRef(false); // Ref to act as a lock, avoiding stale state issues.

    useEffect(() => {
        const handleVoicesChanged = () => {
            if (window.speechSynthesis) {
                 setVoices(window.speechSynthesis.getVoices());
            }
        };
        if (window.speechSynthesis) {
            handleVoicesChanged();
            window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        }
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Effect for cleanup on unmount
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const processQueue = useCallback(() => {
        if (isProcessing.current || utteranceQueue.current.length === 0 || !window.speechSynthesis) {
            return;
        }

        isProcessing.current = true;
        const text = utteranceQueue.current.shift();
        if (!text) {
            isProcessing.current = false;
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';

        const availableVoices = voices;
        const selectedVoiceURI = settings.coachSettings.voiceURI;
        let voiceToUse: SpeechSynthesisVoice | null = null;

        if (selectedVoiceURI && availableVoices.length > 0) {
            voiceToUse = availableVoices.find(v => v.voiceURI === selectedVoiceURI) || null;
        }
        
        if (!voiceToUse) {
            voiceToUse = selectBestFrenchVoice(availableVoices);
        }

        if (voiceToUse) {
            utterance.voice = voiceToUse;
        }

        utterance.pitch = settings.coachSettings.voicePitch;
        utterance.rate = settings.coachSettings.voiceRate;

        utterance.onstart = () => setSpeechState('speaking');
        utterance.onpause = () => setSpeechState('paused');
        utterance.onresume = () => setSpeechState('speaking');
        
        utterance.onend = () => {
            setProgress(100);
            setTimeout(() => {
                setProgress(0);
                setSpeechState('idle');
                isProcessing.current = false;
                processQueue(); // Process next item
            }, 200);
        };

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                setProgress((event.charIndex / text.length) * 100);
            }
        };

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance Error:', event.error);
            // Don't clear the queue on 'interrupted' as it's likely intentional (e.g., by cancel()).
            if (event.error !== 'interrupted') {
                utteranceQueue.current = [];
            }
            setSpeechState('idle');
            isProcessing.current = false;
        };

        window.speechSynthesis.speak(utterance);
    }, [voices, settings]);

    const cancel = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        utteranceQueue.current = [];
        setSpeechState('idle');
        setProgress(0);
        isProcessing.current = false;
    }, []);

    const play = useCallback((text: string, addToQueue = false) => {
        if (!text.trim()) return;
        if (!addToQueue) {
            cancel();
            utteranceQueue.current = [text];
        } else {
            utteranceQueue.current.push(text);
        }
        processQueue();
    }, [cancel, processQueue]);

    const pause = useCallback(() => {
        if (speechState === 'speaking') {
            window.speechSynthesis.pause();
        }
    }, [speechState]);

    const resume = useCallback(() => {
        if (speechState === 'paused') {
            window.speechSynthesis.resume();
        }
    }, [speechState]);
    
    return { play, pause, resume, cancel, speechState, progress };
};
