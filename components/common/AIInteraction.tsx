import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '../../icons';

interface AIInteractionProps {
    messages: string[];
}

export const AIInteraction: React.FC<AIInteractionProps> = ({ messages }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (messages.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 2000); // Change message every 2 seconds

        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="ai-interaction-feedback" aria-live="polite">
            <SparklesIcon className="spinning" />
            <p>{messages[currentMessageIndex]}</p>
        </div>
    );
};
