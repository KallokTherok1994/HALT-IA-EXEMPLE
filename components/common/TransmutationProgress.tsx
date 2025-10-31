import React from 'react';
import { WoundsData, CoreWound } from '../../types';
import { CrystalProgress } from './CrystalProgress';
import { WoundsIcon, LightbulbIcon } from '../../icons';

interface TransmutationProgressProps {
    woundsData: WoundsData;
}

const WOUNDS_INFO = {
    'Rejet': {
        superpower: "Une capacité exceptionnelle à l'autonomie et une grande créativité pour construire vos propres mondes."
    },
    'Abandon': {
        superpower: "Un talent inné pour créer des liens profonds et soutenir les autres avec une présence remarquable."
    },
    'Humiliation': {
        superpower: "Une immense capacité d'empathie, de service et une aptitude à anticiper les besoins des autres."
    },
    'Trahison': {
        superpower: "Un leadership naturel, une grande capacité à prendre des responsabilités et à être un pilier fiable pour les autres."
    },
    'Injustice': {
        superpower: "Un sens aigu de la justice, une grande rigueur et une capacité à créer de l'ordre et de l'excellence."
    },
    'Indéterminée': {
        superpower: "Une nature équilibrée ou complexe qui puise sa force dans plusieurs facettes."
    }
};

const getProgressLevel = (exerciseCount: number): number => {
    if (exerciseCount === 0) return 0;
    if (exerciseCount === 1) return 1;
    if (exerciseCount === 2) return 2;
    if (exerciseCount >= 3 && exerciseCount <= 4) return 3;
    return 4;
};

export const TransmutationProgress: React.FC<TransmutationProgressProps> = ({ woundsData }) => {
    const exerciseCount = woundsData.exercises?.length || 0;
    const progressLevel = getProgressLevel(exerciseCount);
    const woundInfo = WOUNDS_INFO[woundsData.primaryWound];

    return (
        <div className="transmutation-progress-card content-card">
            <div className="transmutation-crystal-container">
                <CrystalProgress progressLevel={progressLevel} />
                <span className="transmutation-progress-label">
                    {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''} complété{exerciseCount > 1 ? 's' : ''}
                </span>
            </div>
            <div className="transmutation-info">
                <div className="info-section">
                    <h4><WoundsIcon /> Blessure : {woundsData.primaryWound}</h4>
                    <p>C'est le point de départ de votre transformation.</p>
                </div>
                <div className="info-section">
                    <h4><LightbulbIcon /> Super-Pouvoir Caché</h4>
                    <p>{woundInfo.superpower}</p>
                </div>
            </div>
        </div>
    );
};