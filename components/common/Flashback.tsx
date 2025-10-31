import React from 'react';
import { useMemories } from '../../hooks/useMemories';
import { RefreshCwIcon, BookOpenIcon } from '../../icons';

export const Flashback: React.FC = () => {
    const { memory, getNewMemory, hasMemories } = useMemories();

    if (!hasMemories) {
        return (
            <div className="content-card flashback-card">
                 <div className="flashback-header">
                    <h4>Flashback</h4>
                 </div>
                 <div className="flashback-empty">
                    <BookOpenIcon/>
                    <p>Vos souvenirs apparaîtront ici au fil du temps.</p>
                    <span>Continuez à écrire dans votre journal !</span>
                 </div>
            </div>
        );
    }
    
    if (!memory) {
        return null; // or a loading state, but it should be fast
    }
    
    return (
        <div className="content-card flashback-card fade-in">
            <div className="flashback-header">
                <h4>Flashback</h4>
                <button onClick={getNewMemory} className="button-icon" title="Voir un autre souvenir">
                    <RefreshCwIcon/>
                </button>
            </div>
            <div className="flashback-content">
                <time>{new Date(memory.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <h5>{memory.title}</h5>
                <p>"{memory.content.substring(0, 150)}{memory.content.length > 150 ? '...' : ''}"</p>
            </div>
        </div>
    );
};