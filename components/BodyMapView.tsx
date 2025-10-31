import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { BodyMapEntry, BodyMapStorage, BODY_MAP_STORAGE_KEY, Connection } from '../types';
import { useStorageState } from '../hooks/useStorageState';
import { EmptyState } from './common/EmptyState';
import { PlusIcon, BodyIcon, SaveIcon, Trash2Icon, SparklesIcon, XIcon, LightbulbIcon, HelpCircleIcon, LinkIcon } from '../icons';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import { analyzeBodyMap } from '../services/generative-ai';
import { AIInteraction } from './common/AIInteraction';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useSettings } from '../contexts/SettingsContext';

type ViewMode = 'list' | 'editor' | 'viewer';

const SENSATIONS = [
    { name: 'Tension', color: 'rgba(233, 75, 60, 0.7)', description: 'Serré, contracté' },
    { name: 'Chaleur', color: 'rgba(243, 156, 18, 0.7)', description: 'Chaud, brûlant' },
    { name: 'Picotements', color: 'rgba(241, 196, 15, 0.7)', description: 'Fourmillements, électrique' },
    { name: 'Lourdeur', color: 'rgba(52, 152, 219, 0.7)', description: 'Pesant, dense' },
    { name: 'Vide', color: 'rgba(149, 165, 166, 0.7)', description: 'Engourdi, creux' },
    { name: 'Énergie', color: 'rgba(155, 89, 182, 0.7)', description: 'Vibrant, agité' },
];

const BodyOutlineSVG: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 150 250" preserveAspectRatio="xMidYMid meet" {...props}>
        <path 
            d="M75,30 A20,20 0 1,1 75,29.9 M50,70 Q50,50 75,50 Q100,50 100,70 L90,120 H60 Z M60,120 L55,190 H70 V120 Z M90,120 L95,190 H80 V120 Z M55,190 L50,240 H70 V190 Z M95,190 L100,240 H80 V190 Z" 
            stroke="var(--color-text-muted)" 
            strokeWidth="2" 
            fill="transparent" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
        />
    </svg>
);


const BodyMapEditor: React.FC<{ onSave: (entry: Omit<BodyMapEntry, 'id' | 'date'>) => void; onBack: () => void; }> = ({ onSave, onBack }) => {
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [emotion, setEmotion] = useState('');
    const [activeSensation, setActiveSensation] = useState(SENSATIONS[0]);
    const { showToast } = useToast();

    useEffect(() => {
        const bgCanvas = bgCanvasRef.current;
        const drawingCanvas = drawingCanvasRef.current;
        if (!bgCanvas || !drawingCanvas) return;
        
        const parent = bgCanvas.parentElement!;
        const dpr = window.devicePixelRatio || 1;
        
        const resizeCanvases = () => {
            bgCanvas.width = parent.clientWidth * dpr;
            bgCanvas.height = parent.clientHeight * dpr;
            drawingCanvas.width = parent.clientWidth * dpr;
            drawingCanvas.height = parent.clientHeight * dpr;

            const bgCtx = bgCanvas.getContext('2d')!;
            bgCtx.scale(dpr, dpr);
            
            const drawingCtx = drawingCanvas.getContext('2d')!;
            drawingCtx.scale(dpr, dpr);
            contextRef.current = drawingCtx;

            drawBodyOutline(bgCtx, bgCanvas.width / dpr, bgCanvas.height / dpr);
        };

        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        return () => window.removeEventListener('resize', resizeCanvases);
    }, []);

    const drawBodyOutline = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const svgPath = "M75,30 A20,20 0 1,1 75,29.9 M50,70 Q50,50 75,50 Q100,50 100,70 L90,120 H60 Z M60,120 L55,190 H70 V120 Z M90,120 L95,190 H80 V120 Z M55,190 L50,240 H70 V190 Z M95,190 L100,240 H80 V190 Z";
        const path = new Path2D(svgPath);
        
        const scale = Math.min(width / 150, height / 250) * 0.8;
        const xOffset = (width - 150 * scale) / 2;
        const yOffset = (height - 250 * scale) / 2;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(xOffset, yOffset);
        ctx.scale(scale, scale);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted');
        ctx.lineWidth = 2 / scale;
        ctx.stroke(path);
        ctx.restore();
    };
    
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = activeSensation.color;
            contextRef.current.lineWidth = 20;
            contextRef.current.lineCap = 'round';
            contextRef.current.lineJoin = 'round';
        }
    }, [activeSensation]);

    const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
        const canvas = drawingCanvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if ('touches' in event.nativeEvent) {
            return {
                x: (event.nativeEvent.touches[0].clientX - rect.left) * dpr,
                y: (event.nativeEvent.touches[0].clientY - rect.top) * dpr,
            };
        }
        return {
            x: event.nativeEvent.offsetX * dpr,
            y: event.nativeEvent.offsetY * dpr,
        };
    };

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getCoords(event);
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(event);
        contextRef.current?.lineTo(x, y);
        contextRef.current?.stroke();
    };

    const stopDrawing = () => {
        contextRef.current?.closePath();
        setIsDrawing(false);
    };
    
    const clearDrawing = () => {
        const canvas = drawingCanvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSave = () => {
        if (!emotion.trim()) {
            showToast("Veuillez nommer l'émotion que vous cartographiez.", 'destructive');
            return;
        }

        const bgCanvas = bgCanvasRef.current!;
        const drawingCanvas = drawingCanvasRef.current!;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = bgCanvas.width;
        finalCanvas.height = bgCanvas.height;
        const ctx = finalCanvas.getContext('2d')!;
        
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(drawingCanvas, 0, 0);
        
        const imageDataUrl = finalCanvas.toDataURL('image/png');

        // This is a simplification; a more robust solution would track which sensations were actually used.
        const sensationsUsed = SENSATIONS.map(s => s.name); 

        onSave({
            emotion,
            sensations: sensationsUsed,
            imageDataUrl,
        });
    };

    return (
        <div className="body-map-editor-layout">
            <div className="body-map-canvas-container">
                <canvas ref={bgCanvasRef} className="body-map-canvas" />
                <canvas 
                    ref={drawingCanvasRef} 
                    className="body-map-canvas drawing-canvas"
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                />
            </div>
            <aside className="body-map-controls">
                <div className="form-group">
                    <label htmlFor="emotion-input">Quelle émotion ressentez-vous ?</label>
                    <input id="emotion-input" type="text" value={emotion} onChange={e => setEmotion(e.target.value)} placeholder="Ex: Anxiété, Joie..."/>
                </div>
                <div className="form-group">
                    <label>Choisissez une sensation et dessinez</label>
                    <div className="sensation-palette">
                        {SENSATIONS.map(sensation => (
                            <button key={sensation.name} className={`sensation-btn ${activeSensation.name === sensation.name ? 'active' : ''}`} onClick={() => setActiveSensation(sensation)}>
                                <div className="sensation-color" style={{ backgroundColor: sensation.color }}></div>
                                <div className="sensation-info" style={{ textAlign: 'left' }}>
                                    <strong>{sensation.name}</strong>
                                    <span>{sensation.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="action-button-group" style={{ flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <button onClick={handleSave} className="button-primary"><SaveIcon/> Enregistrer la carte</button>
                    <button onClick={clearDrawing} className="button-secondary"><Trash2Icon/> Tout effacer</button>
                    <button onClick={onBack} className="button-secondary"><XIcon/> Annuler</button>
                </div>
            </aside>
        </div>
    );
};

const BodyMapViewer: React.FC<{ 
    entry: BodyMapEntry; 
    onAnalyze: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void; 
}> = ({ entry, onAnalyze, onUpdateConnections }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(entry.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    return (
        <div className="body-map-viewer-layout">
            <div className="body-map-display">
                <img src={entry.imageDataUrl} alt={`Cartographie corporelle pour ${entry.emotion}`} />
            </div>
            <div className="body-map-analysis-panel">
                <ConnectionsDisplay connections={entry.connections} />
                <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                    <LinkIcon /> Gérer les connexions
                </button>
                {isConnectionManagerOpen && (
                    <ConnectionManagerModal
                        isOpen={isConnectionManagerOpen}
                        onClose={() => setIsConnectionManagerOpen(false)}
                        currentConnections={entry.connections || []}
                        onSave={handleSaveConnections}
                        currentEntryIdentifier={{ moduleId: 'body-map', id: entry.id }}
                    />
                )}
                {entry.isAnalyzing ? <AIInteraction messages={['Hal se connecte à vos sensations...', 'Interprétation de votre carte...']} /> : null}
                {entry.analysisError ? <ErrorMessage message="L'analyse a échoué. Veuillez réessayer." /> : null}
                
                {entry.analysis ? (
                    <div className="analysis-result fade-in">
                        <div className="analysis-item">
                            <div className="icon"><SparklesIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Interprétation Somatique</strong>
                                <p>{entry.analysis.interpretation}</p>
                            </div>
                        </div>
                        <div className="analysis-item">
                            <div className="icon"><LightbulbIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Suggestion Corporelle</strong>
                                <p>{entry.analysis.suggestion}</p>
                            </div>
                        </div>
                         <div className="analysis-item">
                            <div className="icon"><HelpCircleIcon /></div>
                            <div className="analysis-item-content">
                                <strong>Piste de Réflexion</strong>
                                <p className="reflection-question">"{entry.analysis.reflectionPrompt}"</p>
                            </div>
                        </div>
                        <p className="assessment-disclaimer">Ceci est une exploration personnelle et ne remplace pas l'avis d'un professionnel de santé.</p>
                    </div>
                ) : null}

                {!entry.isAnalyzing && !entry.analysis && (
                    <button onClick={() => onAnalyze(entry.id)} className="button-primary" style={{width: '100%', marginTop: 'var(--spacing-lg)'}}>
                        <SparklesIcon/> Analyser avec Hal
                    </button>
                )}
            </div>
        </div>
    );
};

export const BodyMapView: React.FC = () => {
    const [entries, setEntries] = useStorageState<BodyMapStorage>(BODY_MAP_STORAGE_KEY, []);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedEntry, setSelectedEntry] = useState<BodyMapEntry | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    const handleBack = () => {
        setView('list');
        setSelectedEntry(null);
    };

    const handleSave = (newEntryData: Omit<BodyMapEntry, 'id' | 'date'>) => {
        const newEntry: BodyMapEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...newEntryData,
        };
        setEntries(prev => [newEntry, ...prev]);
        showToast("Carte sauvegardée.", "success");
        setView('list');
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Supprimer cette cartographie ?")) {
            setEntries(prev => prev.filter(e => e.id !== id));
            handleBack();
        }
    };
    
    const handleUpdateConnections = (entryId: string, connections: Connection[]) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, connections, analysis: undefined } : e));
        if (selectedEntry?.id === entryId) {
            setSelectedEntry(prev => prev ? { ...prev, connections, analysis: undefined } : null);
        }
        showToast("Connexions mises à jour. L'analyse a été réinitialisée.", "success");
    };

    const handleAnalyze = async (id: string) => {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        setEntries(prev => prev.map(e => e.id === id ? { ...e, isAnalyzing: true, analysisError: false } : e));
        setSelectedEntry(prev => prev && prev.id === id ? { ...prev, isAnalyzing: true, analysisError: false } : prev);

        try {
            const base64Image = entry.imageDataUrl.split(',')[1];
            const analysis = await analyzeBodyMap(
                entry.emotion, 
                entry.sensations, 
                base64Image,
                settings,
                entry.connections
            );
            
             setEntries(prev => prev.map(e => e.id === id ? { ...e, analysis, isAnalyzing: false } : e));
             setSelectedEntry(prev => prev && prev.id === id ? { ...prev, analysis, isAnalyzing: false } : prev);

        } catch (error) {
             console.error("Body map analysis failed", error);
             setEntries(prev => prev.map(e => e.id === id ? { ...e, isAnalyzing: false, analysisError: true } : e));
             setSelectedEntry(prev => prev && prev.id === id ? { ...prev, isAnalyzing: false, analysisError: true } : prev);
            showToast("L'analyse a échoué. Veuillez réessayer.", "destructive");
        }
    };

    const renderContent = () => {
        switch (view) {
            case 'editor':
                return <BodyMapEditor onSave={handleSave} onBack={handleBack} />;
            case 'viewer':
                return selectedEntry ? <BodyMapViewer entry={selectedEntry} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} /> : null;
            case 'list':
            default:
                return (
                    <>
                        {entries.length === 0 ? (
                            <EmptyState
                                Icon={BodyIcon}
                                title="Écoutez votre corps"
                                message="La cartographie corporelle vous aide à visualiser vos émotions. Créez votre première carte pour commencer."
                                action={{ text: 'Créer une nouvelle carte', onClick: () => setView('editor') }}
                            />
                        ) : (
                            <div className="body-map-list stagger-fade-in">
                                {entries.map((entry, index) => (
                                    <article 
                                        key={entry.id} 
                                        className="body-map-card content-card"
                                        style={{'--stagger-index': index} as React.CSSProperties}
                                        onClick={() => setSelectedEntry(entry)}
                                        onKeyPress={e => e.key === 'Enter' && setSelectedEntry(entry)}
                                        tabIndex={0}
                                        aria-labelledby={`map-title-${entry.id}`}
                                    >
                                        <img src={entry.imageDataUrl} alt={`Cartographie pour ${entry.emotion}`} className="body-map-card-thumbnail"/>
                                        <h3 id={`map-title-${entry.id}`} className="body-map-card-title">{entry.emotion}</h3>
                                        <p className="body-map-card-date">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                );
        }
    };
    
    let headerTitle = "Cartographie Corporelle";
    if (view === 'editor') headerTitle = "Nouvelle Carte";
    if (view === 'viewer' && selectedEntry) headerTitle = selectedEntry.emotion;
    
    return (
        <div className="module-view">
             <ModuleHeader title={headerTitle}>
                 {view === 'list' && <button className="button-primary" onClick={() => setView('editor')}><PlusIcon/> Nouvelle Carte</button>}
                 {view === 'viewer' && selectedEntry && <button className="button-icon destructive" onClick={() => handleDelete(selectedEntry.id)} title="Supprimer"><Trash2Icon/></button>}
             </ModuleHeader>
            <div className="module-content">
                {renderContent()}
                 {/* Modal-like behavior for viewer */}
                 {selectedEntry && view === 'list' && (
                    <div className="modal-backdrop" onClick={handleBack}>
                        <div className="modal-content" style={{maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
                            <button onClick={handleBack} className="button-icon" style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)' }} aria-label="Fermer">
                                <XIcon />
                            </button>
                            <h3 id="modal-title">{selectedEntry.emotion} - {new Date(selectedEntry.date).toLocaleDateString('fr-FR')}</h3>
                            <BodyMapViewer entry={selectedEntry} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} />
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
};