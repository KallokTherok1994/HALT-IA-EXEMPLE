import React from 'react';

interface CrystalProgressProps {
    progressLevel: number; // 0-4
}

export const CrystalProgress: React.FC<CrystalProgressProps> = ({ progressLevel }) => {
    const levelStyles = [
        { fill: '#3a3a3c', filter: '', opacity: 0.8 }, // Level 0
        { fill: 'url(#glow1)', filter: '', opacity: 1 }, // Level 1
        { fill: 'url(#glow2)', filter: 'url(#softGlow)', opacity: 1 }, // Level 2
        { fill: 'url(#glow3)', filter: 'url(#softGlow)', opacity: 1 }, // Level 3
        { fill: 'url(#glow4)', filter: 'url(#strongGlow)', opacity: 1 }, // Level 4
    ];

    const currentStyle = levelStyles[Math.min(progressLevel, 4)];

    return (
        <svg viewBox="0 0 100 100" className={`crystal-progress-svg ${progressLevel >= 4 ? 'glowing' : ''}`}>
            <defs>
                <radialGradient id="glow1">
                    <stop offset="0%" stopColor="var(--color-primary-light)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                </radialGradient>
                <radialGradient id="glow2">
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="60%" stopColor="var(--color-primary-dark)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                </radialGradient>
                 <radialGradient id="glow3">
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="40%" stopColor="var(--color-primary-dark)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                </radialGradient>
                <radialGradient id="glow4">
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="30%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-primary-dark)" />
                </radialGradient>
                <filter id="softGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </filter>
                 <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="glow" />
                    <feComposite in="glow" in2="SourceGraphic" operator="over" />
                </filter>
            </defs>
            <path
                d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z M50 0 L0 25 M50 0 L100 25 M50 100 L0 75 M50 100 L100 75 M0 25 L50 50 L0 75 M100 25 L50 50 L100 75"
                stroke="var(--color-text-primary)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill={currentStyle.fill}
                filter={currentStyle.filter}
                opacity={currentStyle.opacity}
                className="crystal-path"
            />
        </svg>
    );
};