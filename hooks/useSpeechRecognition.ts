import { useState, useEffect, useRef } from 'react';
import { SpeechRecognition, SpeechRecognitionStatic, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types';

interface SpeechRecognitionHook {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    isSupported: boolean;
    error: string | null;
}

const SpeechRecognitionAPI: SpeechRecognitionStatic | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (!SpeechRecognitionAPI) {
            setError("L'API de reconnaissance vocale n'est pas supportée par ce navigateur.");
            return;
        }

        const recognition: SpeechRecognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.lang = 'fr-FR';
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let combinedTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                combinedTranscript += event.results[i][0].transcript;
            }
            setTranscript(combinedTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            setError(`Erreur de reconnaissance vocale: ${event.error}`);
            setIsListening(false);
        };
        
        recognition.onend = () => {
             setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setError(null);
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported: !!SpeechRecognitionAPI,
        error,
    };
};