import React from 'react';

interface ModuleIntroProps {
    title: string;
    description: string;
}

export const ModuleIntro: React.FC<ModuleIntroProps> = ({ title, description }) => {
    return (
        <div className="module-intro">
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    );
};