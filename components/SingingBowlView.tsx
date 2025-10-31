import React, { useState, useRef, useEffect, useCallback } from 'react';

// Using online audio files
const STRIKE_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/03/24/audio_9062002573.mp3';
const SING_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/05/29/audio_387a22a278.mp3';

interface Ripple {
    id: number;
    x: number;
    y: number;
}

export const SingingBowlView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const [isSinging, setIsSinging] = useState(false);
    const strikeAudioRef = useRef<HTMLAudioElement | null>(null);
    const singAudioRef = useRef<HTMLAudioElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const fadeIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        strikeAudioRef.current = new Audio(STRIKE_SOUND_URL);
        singAudioRef.current = new Audio(SING_SOUND_URL);
        singAudioRef.current.loop = true;
        singAudioRef.current.volume = 0;

        return () => {
            strikeAudioRef.current?.pause();
            singAudioRef.current?.pause();
        };
    }, []);

    const fadeAudio = (audio: HTMLAudioElement, targetVolume: number) => {
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
        }
        const step = 0.05;
        const delay = 50;
        fadeIntervalRef.current = window.setInterval(() => {
            if (Math.abs(audio.volume - targetVolume) < step) {
                audio.volume = targetVolume;
                if (targetVolume === 0) {
                    audio.pause();
                }
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            } else if (audio.volume < targetVolume) {
                audio.volume += step;
            } else {
                audio.volume -= step;
            }
        }, delay);
    };

    const handleStrike = (e: React.MouseEvent) => {
        if (strikeAudioRef.current) {
            strikeAudioRef.current.currentTime = 0;
            strikeAudioRef.current.play();
        }

        if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const newRipple = { id: Date.now(), x, y };
            setRipples(prev => [...prev, newRipple]);
        }
    };
    
    const handleSingStart = () => {
        if (singAudioRef.current) {
            singAudioRef.current.currentTime = 0;
            singAudioRef.current.play().catch(console.error);
            fadeAudio(singAudioRef.current, 0.7);
        }
        setIsSinging(true);
    };

    const handleSingEnd = () => {
        if (singAudioRef.current) {
            fadeAudio(singAudioRef.current, 0);
        }
        setIsSinging(false);
    };

    return (
        <div className="singing-bowl-view">
            <p className="singing-bowl-instructions">
                Cliquez pour frapper le bol. Maintenez le clic sur le bord pour le faire chanter.
            </p>
            <svg ref={svgRef} className="singing-bowl-svg" viewBox="0 0 400 400">
                <defs>
                    <radialGradient id="bowlGradient">
                        <stop offset="0%" stopColor="#FAD961" />
                        <stop offset="100%" stopColor="#F76B1C" />
                    </radialGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Main bowl shape */}
                <circle cx="200" cy="200" r="150" fill="url(#bowlGradient)" onClick={handleStrike} cursor="pointer"/>
                
                {/* Rim for singing */}
                <circle
                    cx="200"
                    cy="200"
                    r="150"
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth="30"
                    cursor="pointer"
                    onMouseDown={handleSingStart}
                    onMouseUp={handleSingEnd}
                    onMouseLeave={handleSingEnd}
                    className={`singing-bowl-rim ${isSinging ? 'singing' : ''}`}
                />

                {ripples.map(ripple => (
                    <circle
                        key={ripple.id}
                        cx={ripple.x}
                        cy={ripple.y}
                        r="0"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        className="ripple"
                        onAnimationEnd={() => setRipples(prev => prev.filter(r => r.id !== ripple.id))}
                    />
                ))}
            </svg>
        </div>
    );
};