import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStorageState } from '../hooks/useStorageState';
import { AppSettings, OracleCard, OracleDraw, ORACLE_STORAGE_KEY, Connection } from '../types';
import { oracleCards } from '../data/oracle-cards';
import { getOracleInterpretation } from '../services/generative-ai';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { SparklesIcon, PlayIcon, PauseIcon, BookOpenIcon, Trash2Icon, LinkIcon, XIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { Modal } from './common/Modal';
import { EmptyState } from './common/EmptyState';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useSettings } from '../contexts/SettingsContext';
import { AIInteraction } from './common/AIInteraction';

const SPREADS = [
    {
        id: 'single',
        name: 'Guidance du Jour',
        description: 'Une carte pour éclairer votre journée.',
        cardCount: 1,
        positions: ['Guidance du Jour'],
    },
    {
        id: 'three-card',
        name: 'Passé-Présent-Futur',
        description: 'Explorez les dynamiques temporelles de votre situation.',
        cardCount: 3,
        positions: ['Le Passé', 'Le Présent', 'Le Futur'],
    },
    {
        id: 'situation-obstacle-advice',
        name: 'Situation-Obstacle-Conseil',
        description: 'Clarifiez un problème et trouvez une voie à suivre.',
        cardCount: 3,
        positions: ['La Situation', "L'Obstacle", 'Le Conseil'],
    },
];
type Spread = typeof SPREADS[0];

type DrawState = 'intro' | 'spread-selection' | 'deck' | 'drawing' | 'result';
type OracleSubView = 'draw' | 'history';
type SpeechState = 'idle' | 'speaking' | 'paused';

const IntroView: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="oracle-intro content-card fade-in">
        <h2>L'Oracle de Soi</h2>
        <p>Prenez un instant. Fermez les yeux, respirez profondément. Laissez une question émerger, une intention se clarifier. Cet oracle n'est pas là pour prédire, mais pour refléter la sagesse qui est déjà en vous.</p>
        <button onClick={onStart} className="button-primary">Commencer le rituel</button>
    </div>
);

const SpreadSelectionView: React.FC<{ onSelect: (spread: Spread) => void }> = ({ onSelect }) => (
    <div className="spread-selection-view fade-in">
        <h2>Choisissez votre type de tirage</h2>
        <div className="spread-grid">
            {SPREADS.map(spread => (
                <div key={spread.id} className="content-card spread-card" onClick={() => onSelect(spread)}>
                    <h3>{spread.name}</h3>
                    <div className="spread-card-layout">
                        {Array.from({ length: spread.cardCount }).map((_, i) => <div key={i} className="spread-card-placeholder" />)}
                    </div>
                    <p>{spread.description}</p>
                </div>
            ))}
        </div>
    </div>
);

const DeckView: React.FC<{ spread: Spread; onQuestionSubmit: (question: string) => void }> = ({ spread, onQuestionSubmit }) => {
    const [question, setQuestion] = useState('');

    const handleSubmit = () => {
        onQuestionSubmit(question.trim() || 'Pour une guidance générale.');
    };

    return (
        <div className="oracle-deck-view fade-in">
            <div className="form-group" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <label htmlFor="oracle-question">Pour le tirage "{spread.name}", posez votre question (optionnel) :</label>
                <input
                    id="oracle-question"
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ex: Quelle énergie dois-je cultiver aujourd'hui ?"
                />
            </div>
            <button onClick={handleSubmit} className="button-primary" style={{marginTop: 'var(--spacing-lg)'}}>Continuer vers le tirage</button>
        </div>
    );
};

const CardDrawingView: React.FC<{
    spread: Spread;
    onDrawComplete: (cards: OracleCard[]) => void;
}> = ({ spread, onDrawComplete }) => {
    const cardFanCount = 21;
    const [deck] = useState(() => [...oracleCards].sort(() => 0.5 - Math.random()).slice(0, cardFanCount));
    const [selectedCards, setSelectedCards] = useState<OracleCard[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    const handleSelectCard = (card: OracleCard, index: number) => {
        if (selectedCards.length < spread.cardCount && !selectedIndices.includes(index)) {
            setSelectedCards(prev => [...prev, card]);
            setSelectedIndices(prev => [...prev, index]);
        }
    };
    
    useEffect(() => {
        if (selectedCards.length === spread.cardCount) {
            const timer = setTimeout(() => {
                onDrawComplete(selectedCards);
            }, 800); // Wait for selection animation
            return () => clearTimeout(timer);
        }
    }, [selectedCards, spread.cardCount, onDrawComplete]);

    return (
        <div className="card-drawing-view">
            <h3>Choisissez {spread.cardCount} carte{spread.cardCount > 1 ? 's' : ''}. ({selectedCards.length}/{spread.cardCount})</h3>
            <div className="oracle-fan-deck">
                {deck.map((card, index) => {
                    const isSelected = selectedIndices.includes(index);
                    const totalCards = deck.length;
                    const angle = (index - (totalCards - 1) / 2) * 5; // Adjust spread angle
                    return (
                        <div
                            key={card.id}
                            className={`oracle-fan-card ${isSelected ? 'selected' : ''}`}
                            style={{ transform: `rotate(${angle}deg)` }}
                            onClick={() => handleSelectCard(card, index)}
                        />
                    );
                })}
            </div>
            <div className="drawn-cards-placeholders">
                {Array.from({ length: spread.cardCount }).map((_, i) => (
                    <div key={i} className={`drawn-card-placeholder ${i < selectedCards.length ? 'filled' : ''}`}>
                        {i < selectedCards.length ? `Carte ${i+1}` : ''}
                    </div>
                ))}
            </div>
        </div>
    );
};


const PlayerControls: React.FC<{
    speechState: SpeechState;
    progress: number;
    onPlayPause: () => void;
}> = ({ speechState, progress, onPlayPause }) => (
    <div className="audio-player-controls">
        <button
            onClick={onPlayPause}
            className={`button-primary ${speechState === 'speaking' ? 'speaking' : ''}`}
            aria-label={speechState === 'speaking' ? 'Pause' : 'Play'}
        >
            {speechState === 'speaking' ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="audio-progress-bar">
            <div className="audio-progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
    </div>
);

const DrawDetailView: React.FC<{
    draw: OracleDraw;
    onUpdateConnections: (connections: Connection[]) => void;
    allDraws: OracleDraw[];
    setAllDraws: (updater: (prev: OracleDraw[]) => OracleDraw[]) => void;
    settings: AppSettings;
}> = ({ draw, onUpdateConnections, allDraws, setAllDraws, settings }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { play, pause, resume, cancel, speechState, progress } = useSpeechSynthesis(settings);
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    
    const interpretation = draw.interpretation;

    const handleGenerateInterpretation = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pastDraws = allDraws.filter(d => d.id !== draw.id);
            const result = await getOracleInterpretation(draw, pastDraws, settings);
            setAllDraws(prev => prev.map(d => d.id === draw.id ? { ...d, interpretation: result } : d));
        } catch (e) {
            setError("La génération de l'interprétation a échoué.");
        } finally {
            setIsLoading(false);
        }
    }, [allDraws, draw, setAllDraws, settings]);
    
    useEffect(() => {
        const revealTimer = setTimeout(() => {
            draw.cards.forEach((_, index) => {
                setTimeout(() => {
                    setRevealedCards(prev => [...prev, index]);
                }, index * 400); // 400ms delay between flips
            });
        }, 300); // initial delay before first card flips

        return () => clearTimeout(revealTimer);
    }, [draw.cards]);


    useEffect(() => {
        if (revealedCards.length === draw.cards.length) {
            if (!interpretation && !isLoading) {
                // Wait a bit after the last card flips
                const analysisTimer = setTimeout(() => {
                    handleGenerateInterpretation();
                }, 800);
                return () => clearTimeout(analysisTimer);
            }
        }
    }, [revealedCards.length, draw.cards.length, interpretation, isLoading, handleGenerateInterpretation]);
    
    useEffect(() => {
        return () => cancel();
    }, [cancel, draw]);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(newConnections);
        setIsConnectionManagerOpen(false);
    };

    const playPauseAudio = () => {
        if (!interpretation) return;
        if (speechState === 'speaking') pause();
        else if (speechState === 'paused') resume();
        else play(interpretation);
    };

    return (
        <div className="oracle-result-view">
            <p style={{textAlign: 'center'}}><strong>Votre question :</strong> "{draw.question}"</p>
             <div className="oracle-result-spread-container">
                {draw.cards.map(({ card, position }, index) => (
                    <div key={index} className={`oracle-result-spread-card ${revealedCards.includes(index) ? 'is-revealing' : ''}`} style={{animationDelay: `${index * 0.2}s`}}>
                        <h4>{position}</h4>
                        <div className="card-inner-container">
                           <div className="card-inner">
                                <div className="card-face card-front">
                                    <img src={card.image} alt={card.title} className="oracle-result-card-image" />
                                </div>
                                <div className="card-face card-back"></div>
                            </div>
                        </div>
                        <h3>{card.title}</h3>
                    </div>
                ))}
            </div>
            <div className="oracle-result-content">
                <div className="oracle-interpretation-area">
                    {isLoading && <AIInteraction messages={["Hal interprète votre tirage...", "Connexion à votre sagesse intérieure..."]} />}
                    {error && <ErrorMessage message={error} />}
                    {interpretation ? (
                        <div className="interpretation-content">
                            <h3>Interprétation de Hal</h3>
                            <PlayerControls speechState={speechState} progress={progress} onPlayPause={playPauseAudio} />
                            <div className="interpretation-text">
                                {interpretation.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                            </div>
                        </div>
                    ) : (
                         !isLoading && !error && revealedCards.length === draw.cards.length && (
                            <LoadingIndicator />
                         )
                    )}
                </div>
                
                <ConnectionsDisplay connections={draw.connections} />
                <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{ marginTop: 'var(--spacing-sm)' }}>
                    <LinkIcon /> Gérer les connexions
                </button>
                {isConnectionManagerOpen && (
                    <ConnectionManagerModal
                        isOpen={isConnectionManagerOpen}
                        onClose={() => setIsConnectionManagerOpen(false)}
                        currentConnections={draw.connections || []}
                        onSave={handleSaveConnections}
                        currentEntryIdentifier={{ moduleId: 'oracle', id: draw.id }}
                    />
                )}
            </div>
        </div>
    );
};


const OracleHistoryView: React.FC<{
    draws: OracleDraw[];
    onViewDraw: (draw: OracleDraw) => void;
    onDeleteDraw: (id: string) => void;
}> = ({ draws, onViewDraw, onDeleteDraw }) => {
    if (draws.length === 0) {
        return (
            <EmptyState
                Icon={BookOpenIcon}
                title="Aucun tirage dans votre historique"
                message="Vos tirages passés apparaîtront ici pour que vous puissiez les consulter."
            />
        );
    }
    
    return (
        <div className="oracle-history-list stagger-fade-in">
            {draws.map((draw, index) => (
                <div key={draw.id} className="content-card oracle-history-item" style={{ '--stagger-index': index } as React.CSSProperties}>
                    <div className="history-item-content" onClick={() => onViewDraw(draw)}>
                        <img src={draw.cards[0].card.image} alt={draw.cards[0].card.title} className="history-item-thumbnail" />
                        <div className="history-item-details">
                            <time>{new Date(draw.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                            <h4>{draw.spreadType}</h4>
                            <p><em>"{draw.question}"</em></p>
                        </div>
                    </div>
                    <button
                        className="button-icon destructive"
                        onClick={(e) => { e.stopPropagation(); onDeleteDraw(draw.id); }}
                        title="Supprimer ce tirage"
                    >
                        <Trash2Icon />
                    </button>
                </div>
            ))}
        </div>
    );
};

export const OracleView: React.FC = () => {
    const [draws, setDraws] = useStorageState<OracleDraw[]>(ORACLE_STORAGE_KEY, []);
    const [subView, setSubView] = useState<OracleSubView>('draw');
    const [drawState, setDrawState] = useState<DrawState>('intro');
    const [lastDraw, setLastDraw] = useState<OracleDraw | null>(null);
    const [selectedHistoryDraw, setSelectedHistoryDraw] = useState<OracleDraw | null>(null);
    const [currentSpread, setCurrentSpread] = useState<Spread | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const { showToast } = useToast();
    const { settings } = useSettings();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!isInitialized.current) {
            if (draws.length > 0) {
                setDrawState('spread-selection');
            }
            isInitialized.current = true;
        }
    }, [draws]);
    
    useEffect(() => {
        if (lastDraw) {
            const updated = draws.find(d => d.id === lastDraw.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(lastDraw)) {
                 setLastDraw(updated);
            }
        }
        if (selectedHistoryDraw) {
            const updated = draws.find(d => d.id === selectedHistoryDraw.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedHistoryDraw)) {
                 setSelectedHistoryDraw(updated);
            }
        }
    }, [draws, lastDraw, selectedHistoryDraw]);

    const handleSelectSpread = (spread: Spread) => {
        setCurrentSpread(spread);
        setDrawState('deck');
    };
    
    const handleQuestionSubmit = (question: string) => {
        setCurrentQuestion(question);
        setDrawState('drawing');
    };

    const handleDrawComplete = (cards: OracleCard[]) => {
        if (!currentSpread) return;
        
        const newDraw: OracleDraw = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            question: currentQuestion,
            spreadType: currentSpread.name,
            cards: cards.map((card, index) => ({
                card,
                position: currentSpread.positions[index],
            })),
            connections: [],
        };
        setLastDraw(newDraw);
        setDraws(prev => [newDraw, ...prev]);
        setDrawState('result');
    };
    
    const handleResetDraw = () => {
        setLastDraw(null);
        setCurrentSpread(null);
        setCurrentQuestion('');
        setDrawState('spread-selection');
    };
    
    const handleDeleteDraw = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce tirage de votre historique ?")) {
            const newDraws = draws.filter(d => d.id !== id);
            setDraws(newDraws);
            if (selectedHistoryDraw?.id === id) setSelectedHistoryDraw(null);
            if (newDraws.length === 0) setDrawState('intro');
            showToast("Tirage supprimé.", "info");
        }
    };
    
    const handleUpdateConnections = (drawId: string, newConnections: Connection[]) => {
        setDraws(prevDraws =>
            prevDraws.map(d =>
                d.id === drawId ? { ...d, connections: newConnections, interpretation: undefined } : d
            )
        );
        showToast("Connexions mises à jour. L'interprétation sera regénérée.", "success");
    };
    
    const sortedDraws = React.useMemo(() => 
        [...draws].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [draws]);

    const renderDrawingView = () => {
        switch (drawState) {
            case 'intro': return <IntroView onStart={() => setDrawState('spread-selection')} />;
            case 'spread-selection': return <SpreadSelectionView onSelect={handleSelectSpread} />;
            case 'deck': return currentSpread ? <DeckView spread={currentSpread} onQuestionSubmit={handleQuestionSubmit} /> : null;
            case 'drawing': return currentSpread ? <CardDrawingView spread={currentSpread} onDrawComplete={handleDrawComplete} /> : null;
            case 'result': return lastDraw ? <div className="fade-in">
                                                <DrawDetailView
                                                    draw={lastDraw} 
                                                    onUpdateConnections={(connections) => handleUpdateConnections(lastDraw.id, connections)}
                                                    allDraws={draws}
                                                    setAllDraws={setDraws}
                                                    settings={settings}
                                                /> 
                                                <button onClick={handleResetDraw} className="button-secondary" style={{ marginTop: 'var(--spacing-xl)', display: 'block', margin: 'auto' }}>Tirer d'autres cartes</button>
                                             </div> : null;
            default: return null;
        }
    };
    
    return (
        <div className="module-view oracle-view">
             <ModuleHeader title="Oracle de Soi">
                 <button className="button-secondary" onClick={() => setSubView(subView === 'draw' ? 'history' : 'draw')}>
                     {subView === 'draw' ? 'Voir l\'historique' : 'Tirer une carte'}
                 </button>
             </ModuleHeader>
             <div className="module-content">
                {subView === 'draw' ? renderDrawingView() : (
                    <OracleHistoryView
                        draws={sortedDraws}
                        onViewDraw={setSelectedHistoryDraw}
                        onDeleteDraw={handleDeleteDraw}
                    />
                )}
             </div>
             {selectedHistoryDraw &&
                <Modal isOpen={!!selectedHistoryDraw} onClose={() => setSelectedHistoryDraw(null)} title={selectedHistoryDraw.spreadType}>
                    <DrawDetailView
                        draw={selectedHistoryDraw}
                        onUpdateConnections={(connections) => handleUpdateConnections(selectedHistoryDraw.id, connections)}
                        allDraws={draws}
                        setAllDraws={setDraws}
                        settings={settings}
                    />
                </Modal>
             }
        </div>
    );
};