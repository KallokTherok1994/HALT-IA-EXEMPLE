import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { crystalItems } from '../data';
import { CrystalInfo, CRYSTALS_CACHE_KEY } from '../types';
import { storage } from '../utils/storage';
import { getCrystalInfo } from '../services/generative-ai';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import { SearchIcon, GemIcon, SparklesIcon, XIcon } from '../icons';

type CrystalCache = { [itemName: string]: CrystalInfo };
const MEDITATION_DURATION_MS = 90000; // 90 seconds

const MeditationPlayer: React.FC<{ info: CrystalInfo; onClose: () => void }> = ({ info, onClose }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const currentProgress = (elapsedTime / MEDITATION_DURATION_MS) * 100;
            if (currentProgress >= 100) {
                clearInterval(interval);
                onClose();
            } else {
                setProgress(currentProgress);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [onClose]);

    return (
        <div className="meditation-overlay fade-in">
            <button onClick={onClose} className="meditation-close-btn" aria-label="Fermer la méditation"><XIcon /></button>
            <div className="meditation-content">
                <h2 className="meditation-intention">{info.intention}</h2>
                <p className="meditation-affirmation">"{info.affirmation}"</p>
                <p className="meditation-prompt">{info.meditationPrompt}</p>
            </div>
            <div className="meditation-timer-bar">
                <div className="meditation-timer-progress" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

export const CrystalsView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [cache, setCache] = useState<CrystalCache>(() => storage.get(CRYSTALS_CACHE_KEY, {}));
    const [selectedItem, setSelectedItem] = useState<(typeof crystalItems)[0] | null>(null);
    const [info, setInfo] = useState<CrystalInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMeditating, setIsMeditating] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        storage.set(CRYSTALS_CACHE_KEY, cache);
    }, [cache]);

    const handleSelectItem = useCallback(async (item: (typeof crystalItems)[0]) => {
        setSelectedItem(item);
        setInfo(null);
        setError(null);
        
        if (cache[item.name]) {
            setInfo(cache[item.name]);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getCrystalInfo(item.name);
            setInfo(result);
            setCache(prev => ({ ...prev, [item.name]: result }));
        } catch (err) {
            const errorMessage = "Impossible de charger les informations. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, "destructive");
        } finally {
            setIsLoading(false);
        }
    }, [cache, showToast]);

    const filteredItems = useMemo(() => 
        crystalItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [searchTerm]);

    if (isMeditating && info) {
        return <MeditationPlayer info={info} onClose={() => setIsMeditating(false)} />;
    }

    return (
        <div className="fade-in">
            <div className="herbarium-layout"> {/* Re-using layout class */}
                <aside className="herbarium-list-panel">
                    <div className="journal-search-bar" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <SearchIcon className="search-icon"/>
                        <input
                            type="text"
                            placeholder="Rechercher un cristal..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ul className="herbarium-list">
                        {filteredItems.map(item => (
                            <li 
                                key={item.name} 
                                className={`herbarium-list-item ${selectedItem?.name === item.name ? 'active' : ''}`}
                                onClick={() => handleSelectItem(item)}
                            >
                                {item.name}
                            </li>
                        ))}
                    </ul>
                </aside>
                <main className="herbarium-detail-panel">
                    {isLoading && <LoadingIndicator />}
                    {error && <ErrorMessage message={error} />}
                    {info && selectedItem && (
                        <div className="fade-in">
                            <h2>{selectedItem.name}</h2>
                            
                            <div className="herbarium-section">
                                <h3>Intention</h3>
                                <p className="crystal-intention">{info.intention}</p>
                            </div>
                             <div className="herbarium-section">
                                <h3>Affirmation</h3>
                                <p className="crystal-affirmation"><em>"{info.affirmation}"</em></p>
                            </div>
                            
                            <button onClick={() => setIsMeditating(true)} className="button-primary" style={{marginTop: 'var(--spacing-lg)'}}>
                               <SparklesIcon /> Lancer une méditation d'intention
                            </button>

                            <p className="assessment-disclaimer" style={{marginTop: 'var(--spacing-xl)'}}>
                                Cet outil est un support à la méditation et à la réflexion personnelle. Il ne constitue pas un conseil ou un traitement médical.
                            </p>
                        </div>
                    )}
                    {!selectedItem && !isLoading && (
                        <div className="empty-state" style={{margin: 'auto'}}>
                            <div className="empty-state-icon"><GemIcon /></div>
                            <h3>Définissez votre intention</h3>
                            <p>Sélectionnez un cristal pour explorer un thème de pleine conscience et lancer une courte méditation.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};