import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { bestiaryItems } from '../data';
import { AnimalInfo, BESTIARY_CACHE_KEY } from '../types';
import { storage } from '../utils/storage';
import { getAnimalInfo } from '../services/generative-ai';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import { SearchIcon, PawPrintIcon, SparklesIcon } from '../icons';

type BestiaryCache = { [itemName: string]: AnimalInfo };

export const BestiaryView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [cache, setCache] = useState<BestiaryCache>(() => storage.get(BESTIARY_CACHE_KEY, {}));
    const [selectedItem, setSelectedItem] = useState<(typeof bestiaryItems)[0] | null>(null);
    const [info, setInfo] = useState<AnimalInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        storage.set(BESTIARY_CACHE_KEY, cache);
    }, [cache]);

    const handleSelectItem = useCallback(async (item: (typeof bestiaryItems)[0]) => {
        setSelectedItem(item);
        setInfo(null);
        setError(null);
        
        if (cache[item.name]) {
            setInfo(cache[item.name]);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getAnimalInfo(item.name);
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
        bestiaryItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [searchTerm]);

    return (
        <div className="fade-in">
            <div className="herbarium-layout">
                <aside className="herbarium-list-panel">
                    <div className="journal-search-bar" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <SearchIcon className="search-icon"/>
                        <input
                            type="text"
                            placeholder="Rechercher un animal..."
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
                            <p className="herbarium-description"><em>{info.description}</em></p>

                            <div className="herbarium-section">
                                <h3>Symbolisme</h3>
                                <ul className="benefits-list">
                                    {info.symbolism.map((symbol, i) => (
                                        <li key={i}><PawPrintIcon style={{width: 18, height: 18}} /> {symbol}</li>
                                    ))}
                                </ul>
                            </div>
                             <div className="herbarium-section">
                                <h3>Leçon de Vie</h3>
                                <p className="reflection-question"><em>"{info.lifeLesson}"</em></p>
                            </div>
                        </div>
                    )}
                    {!selectedItem && !isLoading && (
                        <div className="empty-state" style={{margin: 'auto'}}>
                            <div className="empty-state-icon"><PawPrintIcon /></div>
                            <h3>La sagesse du monde animal</h3>
                            <p>Sélectionnez un animal dans la liste pour découvrir son symbolisme et les leçons qu'il peut vous offrir.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};