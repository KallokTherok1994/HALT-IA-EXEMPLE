import React from 'react';
import { useRhythmAdvice } from '../../hooks/useRhythmAdvice';
import { RhythmIcon } from '../../icons';
import { useAppContext } from '../../contexts/AppContext';

export const RhythmCard: React.FC = () => {
    const { navigateTo } = useAppContext();
    const { advice, loading, needsSetup } = useRhythmAdvice();

    if (loading) {
        return (
            <div className="content-card rhythm-card">
                 <div className="rhythm-card-header">
                    <h4 className="skeleton skeleton-text" style={{ width: '60%' }}></h4>
                 </div>
                 <p className="skeleton skeleton-text" style={{ width: '90%' }}></p>
            </div>
        );
    }

    if (needsSetup) {
        return (
             <div className="content-card rhythm-card is-prompt">
                <div className="rhythm-card-header">
                     <RhythmIcon />
                    <h4>Découvrez Votre Rythme</h4>
                </div>
                <p>Alignez vos journées sur votre énergie naturelle.</p>
                <button className="button-secondary" onClick={() => navigateTo('rhythm')}>Faire le test</button>
            </div>
        );
    }
    
    if (!advice) {
        return null;
    }

    return (
        <div className="content-card rhythm-card">
            <div className="rhythm-card-header">
                <span className="rhythm-card-icon">{advice.icon}</span>
                <h4>{advice.title}</h4>
            </div>
            <p>{advice.advice}</p>
        </div>
    );
};