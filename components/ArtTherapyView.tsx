import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeArtTherapyDrawing } from '../services/generative-ai';
import { ArtTherapyAnalysis } from '../types';
import { useToast } from '../contexts/ToastContext';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { SparklesIcon, Trash2Icon, RefreshCwIcon } from '../icons';
import { ModuleHeader } from './common/ModuleHeader';

const COLORS = ['#1c1c1c', '#e94b3c', '#34c759', '#3498db', '#f1c40f', '#9b59b6'];
const BRUSH_SIZES = [2, 8, 16];

export const ArtTherapyView: React.FC<{ onClose?: () => void; }> = ({ onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [color, setColor] = useState(COLORS[0]);
    const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
    const [isErasing, setIsErasing] = useState(false);

    const [analysis, setAnalysis] = useState<ArtTherapyAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // A small delay to allow the parent container to have correct dimensions
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                const context = canvas.getContext('2d');
                if (context) {
                    context.lineCap = 'round';
                    context.strokeStyle = color;
                    context.lineWidth = brushSize;
                    contextRef.current = context;
                }
            }
        };
        
        const timer = setTimeout(resizeCanvas, 50); // Small delay for layout
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', resizeCanvas);
        }
    }, [color, brushSize]);

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = brushSize;
            contextRef.current.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        }
    }, [color, brushSize, isErasing]);

    const getCoords = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in event.nativeEvent) {
            return {
                x: event.nativeEvent.touches[0].clientX - rect.left,
                y: event.nativeEvent.touches[0].clientY - rect.top,
            };
        }
        return {
            x: event.nativeEvent.offsetX,
            y: event.nativeEvent.offsetY,
        };
    };

    const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getCoords(event);
        if (contextRef.current) {
            contextRef.current.beginPath();
            contextRef.current.moveTo(x, y);
            setIsDrawing(true);
        }
    }, []);

    const stopDrawing = useCallback(() => {
        if (contextRef.current) {
            contextRef.current.closePath();
            setIsDrawing(false);
        }
    }, []);

    const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(event);
        if (contextRef.current) {
            contextRef.current.lineTo(x, y);
            contextRef.current.stroke();
        }
    }, [isDrawing]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            setAnalysis(null);
        }
    };

    const handleAnalyze = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await analyzeArtTherapyDrawing(base64Image);
            setAnalysis(result);
        } catch (err) {
            const errorMessage = "L'analyse a échoué. Veuillez réessayer.";
            setError(errorMessage);
            showToast(errorMessage, 'destructive');
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <div className="art-therapy-layout">
            <div className="art-canvas-container">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="art-canvas"
                />
                <div className="art-toolbar">
                     <div className="tool-group">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={`color-swatch ${color === c && !isErasing ? 'active' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => { setColor(c); setIsErasing(false); }}
                                aria-label={`Couleur ${c}`}
                            />
                        ))}
                    </div>
                    <div className="tool-group">
                         {BRUSH_SIZES.map(size => (
                            <button
                                key={size}
                                className={`brush-size-btn ${brushSize === size && !isErasing ? 'active' : ''}`}
                                onClick={() => { setBrushSize(size); setIsErasing(false); }}
                            >
                                <span style={{ width: `${size}px`, height: `${size}px` }}></span>
                            </button>
                        ))}
                    </div>
                    <div className="tool-group">
                        <button
                            className={`tool-btn ${isErasing ? 'active' : ''}`}
                            onClick={() => setIsErasing(true)}
                            aria-label="Gomme"
                        >
                            Gomme
                        </button>
                        <button onClick={clearCanvas} className="tool-btn" aria-label="Effacer le dessin"><Trash2Icon/></button>
                    </div>
                </div>
            </div>
            <aside className="art-analysis-panel">
                <h3>Analyse Symbolique</h3>
                <p>Une fois votre dessin terminé, cliquez ici pour obtenir une interprétation de l'IA.</p>
                <button onClick={handleAnalyze} className="button-primary" disabled={isLoading}>
                   <SparklesIcon/> {isLoading ? 'Analyse en cours...' : 'Analyser mon dessin'}
                </button>
                
                {isLoading && <LoadingIndicator />}
                {error && <ErrorMessage message={error} />}
                {analysis && (
                    <div className="analysis-result fade-in">
                        <h4><RefreshCwIcon/> Interprétation</h4>
                        <p>{analysis.interpretation}</p>
                        <h4><SparklesIcon/> Piste de Réflexion</h4>
                        <p className="reflection-question"><em>"{analysis.reflectionPrompt}"</em></p>
                        <p className="assessment-disclaimer">Ceci est une exploration symbolique et non un diagnostic.</p>
                    </div>
                )}
            </aside>
        </div>
    );
    
    // Render for modal context
    if (onClose) {
        return <div className="fade-in" style={{ height: '100%', display: 'flex' }}>{content}</div>;
    }

    // Render for standalone context
    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Atelier Créatif" />
            <div className="module-content" style={{ padding: 0, overflow: 'hidden', display: 'flex' }}>
                {content}
            </div>
        </div>
    );
};