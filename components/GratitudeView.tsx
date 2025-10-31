import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'https://esm.sh/d3@7';
import { ModuleHeader } from './common/ModuleHeader';
import { GratitudeEntry, GratitudeStorage, GRATITUDE_STORAGE_KEY, GratitudeItem } from '../types';
import { getTodayDateString, getMonthId } from '../utils/dateHelpers';
import { PlusIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, TreeIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { findSilverLining, generateGratitudeReflection } from '../services/generative-ai';
import { Modal } from './common/Modal';
import { useStorageState } from '../hooks/useStorageState';
import { EmptyState } from './common/EmptyState';
import { LoadingIndicator } from './common/LoadingIndicator';

// --- Helper Components ---

const SilverLiningModal: React.FC<{
    onClose: () => void;
    onAddGratitude: (text: string) => void;
}> = ({ onClose, onAddGratitude }) => {
    const [description, setDescription] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleFind = async () => {
        if (!description.trim()) return;
        setIsLoading(true);
        setSuggestion('');
        try {
            const result = await findSilverLining(description);
            setSuggestion(result);
        } catch (error) {
            showToast("La suggestion a échoué. Veuillez réessayer.", "destructive");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        if (suggestion) {
            onAddGratitude(suggestion);
            onClose();
        }
    };

    return (
        <div className="silver-lining-modal">
            <p>Parfois, il est difficile de trouver de la gratitude. Décrivez brièvement pourquoi votre journée est difficile, et l'IA vous aidera à trouver une petite lueur d'espoir.</p>
            <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Ex: Je me sens submergé(e) par le travail et fatigué(e)..."
                disabled={isLoading}
            />
            <button onClick={handleFind} className="button-primary" disabled={isLoading || !description.trim()} style={{ width: '100%', marginTop: '1rem' }}>
                {isLoading ? 'Recherche...' : "Trouver une lueur d'espoir"}
            </button>

            {suggestion && (
                <div className="suggestion-result fade-in" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p>Voici une suggestion :</p>
                    <blockquote className="reflection-question">"{suggestion}"</blockquote>
                    <button onClick={handleAdd} className="button-secondary">
                        <PlusIcon /> Ajouter à ma liste
                    </button>
                </div>
            )}
        </div>
    );
};

const GratitudeDayModal: React.FC<{
    entry: GratitudeEntry | undefined;
    selectedDate: string;
    isToday: boolean;
    onAddItem: (text: string) => void;
    onGenerateReflection: (date: string, items: string[]) => void;
}> = ({ entry, selectedDate, isToday, onAddItem, onGenerateReflection }) => {
    const [newItemText, setNewItemText] = useState('');
    const [showSilverLining, setShowSilverLining] = useState(false);

    useEffect(() => {
        if (entry && entry.items.length > 0 && !entry.reflection && !entry.isGeneratingReflection) {
            onGenerateReflection(entry.date, entry.items.map(i => i.text));
        }
    }, [entry, onGenerateReflection]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddItem(newItemText);
        setNewItemText('');
    };

    return (
        <div className="gratitude-day-modal-content">
            <h3>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            
            {isToday && (
                <div className="gratitude-input-area">
                    <form onSubmit={handleFormSubmit} className="input-with-button">
                        <input
                            type="text"
                            value={newItemText}
                            onChange={e => setNewItemText(e.target.value)}
                            placeholder="Ajouter une gratitude..."
                        />
                        <button type="submit" className="button-primary" disabled={!newItemText.trim()}>
                            <PlusIcon/>
                        </button>
                    </form>
                     <button onClick={() => setShowSilverLining(true)} className="button-secondary" style={{width: '100%', marginTop: 'var(--spacing-sm)'}}>
                        <SparklesIcon/> J'ai du mal aujourd'hui
                    </button>
                </div>
            )}
            
            {entry && entry.items.length > 0 ? (
                <ul className="gratitude-day-modal-list">
                    {entry.items.map(item => <li key={item.id}>{item.text}</li>)}
                </ul>
            ) : (
                <p>Aucune gratitude enregistrée pour ce jour.</p>
            )}

            <div className="reflection-section">
                {entry?.isGeneratingReflection && <LoadingIndicator />}
                {entry?.reflection && (
                    <div className="fade-in">
                        <h4><SparklesIcon/> Piste de Réflexion</h4>
                        <p className="reflection-question">"{entry.reflection}"</p>
                    </div>
                )}
            </div>

             <Modal 
                isOpen={showSilverLining}
                onClose={() => setShowSilverLining(false)}
                title="Trouver une Lueur d'Espoir"
            >
                <SilverLiningModal 
                    onClose={() => setShowSilverLining(false)} 
                    onAddGratitude={onAddItem} 
                />
            </Modal>
        </div>
    );
};

// --- D3 Garden Component ---
const GratitudeGarden: React.FC<{
    entries: GratitudeEntry[];
    onSelectDate: (date: string) => void;
}> = ({ entries, onSelectDate }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const allItems = useMemo(() => entries.flatMap(entry =>
        entry.items.map(item => ({ ...item, date: entry.date }))
    ), [entries]);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const tooltip = d3.select(tooltipRef.current);
        const width = 800;
        const height = 600;

        svg.selectAll("*").remove();
        
        const totalGratitudes = allItems.length;
        if (totalGratitudes === 0) return;

        const maxDepth = Math.min(6, Math.floor(2 + totalGratitudes / 10));
        const startLength = Math.max(80, height / 6 - totalGratitudes);
        
        let leafNodes: { x: number; y: number }[] = [];
        
        function drawBranch(x1: number, y1: number, angle: number, length: number, depth: number, width: number) {
            if (depth > maxDepth) return;

            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 - Math.sin(angle) * length;

            svg.append('line')
                .attr('class', 'branch')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y1)
                .attr('stroke', '#8d6e63')
                .attr('stroke-width', width)
                .transition()
                .duration(800)
                .attr('x2', x2)
                .attr('y2', y2);

            if (depth === maxDepth || (Math.random() < 0.1 && depth > 1)) {
                 leafNodes.push({ x: x2, y: y2 });
                 return;
            }

            const branches = (totalGratitudes > 30 && depth < 3) ? 3 : 2;
            for (let i = 0; i < branches; i++) {
                const newAngle = angle + (Math.random() - 0.5) * (Math.PI / 3);
                const newLength = length * (0.75 + Math.random() * 0.15);
                drawBranch(x2, y2, newAngle, newLength, depth + 1, Math.max(1, width * 0.7));
            }
        }

        drawBranch(width / 2, height, Math.PI / 2, startLength, 1, Math.max(4, totalGratitudes / 5));

        setTimeout(() => {
            if (leafNodes.length === 0) {
                // Failsafe if no terminal nodes were generated
                const lastBranch = svg.selectAll('.branch').nodes().pop();
                if (lastBranch) {
                    const lb = d3.select(lastBranch);
                    leafNodes.push({x: +lb.attr('x2'), y: +lb.attr('y2')});
                } else {
                     leafNodes.push({x: width/2, y: height/2});
                }
            }

            const leafData = d3.shuffle(allItems.slice());
            const leafColorScale = d3.scaleOrdinal(d3.schemeGreens[5]);

            const leaves = svg.selectAll('.gratitude-leaf')
                .data(leafData)
                .enter()
                .append('g')
                .attr('class', 'gratitude-leaf')
                .attr('transform', (d, i) => {
                    const node = leafNodes[i % leafNodes.length];
                    return `translate(${node.x}, ${node.y}) rotate(${Math.random() * 90 - 45})`;
                })
                .style('opacity', 0)
                .on('click', (event, d) => onSelectDate(d.date))
                .on('mouseover', function(event, d) {
                    d3.select(this).raise();
                    tooltip
                        .style('opacity', 1)
                        .style('visibility', 'visible')
                        .html(d.text)
                        .style('left', `${event.pageX}px`)
                        .style('top', `${event.pageY}px`);
                })
                .on('mouseout', () => {
                    tooltip.style('opacity', 0).style('visibility', 'hidden');
                });
            
            leaves.append('path')
                .attr('d', "M0,0 C-10,-10 -10,-20 0,-30 C10,-20 10,-10 0,0")
                .attr('fill', (d, i) => leafColorScale(i.toString()));

            leaves.transition()
                .delay((d, i) => i * 50)
                .duration(500)
                .style('opacity', 1);

        }, 800);

    }, [allItems, onSelectDate]);

    return (
        <div className="gratitude-garden-container">
            <svg ref={svgRef} viewBox={`0 0 800 600`}></svg>
            <div ref={tooltipRef} className="leaf-tooltip"></div>
        </div>
    );
};


// --- Main Component ---

export const GratitudeView: React.FC = () => {
    const [entries, setEntries] = useStorageState<GratitudeStorage>(GRATITUDE_STORAGE_KEY, []);
    const [displayDate, setDisplayDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const { showToast } = useToast();

    const displayMonthId = getMonthId(displayDate);
    const todayStr = getTodayDateString();

    const entriesForMonth = useMemo(() => 
        entries.filter(e => e.date.startsWith(displayMonthId)), 
    [entries, displayMonthId]);
    
    const selectedEntry = useMemo(() => 
        entries.find(e => e.date === selectedDate), 
    [entries, selectedDate]);

    const handleAddItem = (text: string) => {
        if (!text.trim()) return;
        
        const newItem: GratitudeItem = {
            id: Date.now().toString(),
            text: text.trim(),
        };

        setEntries(prev => {
            const entryExists = prev.some(e => e.date === todayStr);
            if (entryExists) {
                return prev.map(e => 
                    e.date === todayStr 
                    ? { ...e, items: [...e.items, newItem], reflection: undefined } // Invalidate reflection
                    : e
                );
            } else {
                const newEntry: GratitudeEntry = { date: todayStr, items: [newItem] };
                return [newEntry, ...prev];
            }
        });
    };
    
    const handleGenerateReflection = useCallback(async (date: string, items: string[]) => {
        setEntries(prev => prev.map(e => e.date === date ? { ...e, isGeneratingReflection: true } : e));
        try {
            const reflection = await generateGratitudeReflection(items);
            setEntries(prev => prev.map(e => e.date === date ? { ...e, reflection, isGeneratingReflection: false } : e));
        } catch (error) {
            console.error("Failed to generate reflection", error);
            setEntries(prev => prev.map(e => e.date === date ? { ...e, isGeneratingReflection: false } : e));
        }
    }, [setEntries]);

    const handleNavigateMonth = (direction: 'prev' | 'next') => {
        setDisplayDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with month lengths
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };
    
    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Jardin de Gratitude" />
            <div className="module-content" style={{ padding: 0, overflow: 'hidden' }}>
                {entries.length === 0 ? (
                    <EmptyState
                        Icon={TreeIcon}
                        title="Votre jardin de gratitude est prêt à fleurir"
                        message="Chaque jour, prenez un moment pour planter une graine de gratitude. Vous serez surpris de voir à quelle vitesse la joie grandit."
                        action={{ text: "Ajouter ma première gratitude", onClick: () => setSelectedDate(todayStr) }}
                    />
                ) : (
                    <div className="gratitude-garden-wrapper">
                         <div className="gratitude-garden-header">
                            <button onClick={() => handleNavigateMonth('prev')} className="button-icon"><ChevronLeftIcon/></button>
                            <h4>{displayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h4>
                            <button onClick={() => handleNavigateMonth('next')} className="button-icon" disabled={getMonthId(displayDate) === getMonthId(new Date())}><ChevronRightIcon/></button>
                        </div>
                        <GratitudeGarden entries={entriesForMonth} onSelectDate={setSelectedDate} />
                        <button className="fab" onClick={() => setSelectedDate(todayStr)} title="Ajouter une gratitude">
                            <PlusIcon />
                        </button>
                    </div>
                )}
            </div>

            <Modal 
                isOpen={!!selectedDate}
                onClose={() => setSelectedDate(null)}
                title="Gratitudes"
            >
                {selectedDate && (
                    <GratitudeDayModal
                        entry={selectedEntry}
                        selectedDate={selectedDate}
                        isToday={selectedDate === todayStr}
                        onAddItem={handleAddItem}
                        onGenerateReflection={handleGenerateReflection}
                    />
                )}
            </Modal>
        </div>
    );
};