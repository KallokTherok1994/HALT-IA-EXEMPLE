import React from 'react';

interface ProgressBarProps {
    progress: number;
    label?: string;
    progressText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, progressText }) => {
    const safeProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className="progress-wrapper">
            {label && <label className="progress-label">{label}</label>}
            <div className="progress-track">
                <div 
                    className="progress-fill" 
                    style={{ width: `${safeProgress}%` }}
                    role="progressbar"
                    aria-valuenow={safeProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={label || progressText || `Progression: ${safeProgress}%`}
                ></div>
            </div>
            {progressText && <span className="progress-text">{progressText}</span>}
        </div>
    );
};
