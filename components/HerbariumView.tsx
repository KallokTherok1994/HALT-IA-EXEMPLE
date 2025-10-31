import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { herbariumItems } from '../data';
import { HerbariumInfo, HERBARIUM_CACHE_KEY } from '../types';
import { storage } from '../utils/storage';
import { getHerbariumInfo } from '../services/generative-ai';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import { SearchIcon, CheckCircleIcon, LeafIcon, SparklesIcon } from '../icons';

type HerbariumCache = { [itemName: string]: HerbariumInfo };

export const HerbariumView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [cache, setCache] = useState<HerbariumCache>(() => storage.get(HERBARIUM_CACHE_KEY, {}));
    const [selectedItem, setSelectedItem] = useState<(typeof herbariumItems)[0] | null>(null);
    const [info, setInfo] = useState<HerbariumInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        storage.set(HERBARIUM_CACHE_KEY, cache);
    }, [cache]);

    const handleSelectItem = useCallback(async (item: (typeof herbariumItems)[0]) => {
        setSelectedItem(item);
        setInfo(null);
        setError(null);
        
        if (cache[item.name]) {
            setInfo(cache[item.name]);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getHerbariumInfo(item.name);
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
        herbariumItems.filter(item => 
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
                            placeholder="Rechercher..."
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
                                <span className="item-type">{item.type === 'plant' ? 'Plante' : 'Huile'}</span>
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
                                <h3>Principaux Bienfaits</h3>
                                <ul className="benefits-list">
                                    {info.mainBenefits.map((benefit, i) => (
                                        <li key={i}><LeafIcon /> {benefit}</li>
                                    ))}
                                </ul>
                            </div>
                             <div className="herbarium-section">
                                <h3>Utilisations Simples</h3>
                                <ul className="uses-list">
                                    {info.simpleUses.map((use, i) => (
                                         <li key={i}><SparklesIcon /> {use}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="herbarium-precautions">
                                <p>{info.precautions}</p>
                            </div>
                        </div>
                    )}
                    {!selectedItem && !isLoading && (
                        <div className="empty-state" style={{margin: 'auto'}}>
                            <div className="empty-state-icon"><LeafIcon /></div>
                            <h3>Explorez les trésors de la nature</h3>
                            <p>Sélectionnez un élément dans la liste pour découvrir ses bienfaits et ses utilisations.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};