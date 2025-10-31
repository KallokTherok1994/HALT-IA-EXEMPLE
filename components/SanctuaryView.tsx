import React, { useState } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { HerbariumView } from './HerbariumView';
import { CrystalsView } from './CrystalsView';
import { ArtTherapyView } from './ArtTherapyView';
import { ArboretumView } from './ArboretumView';
import { BestiaryView } from './BestiaryView';
import { WordTreeView } from './WordTreeView';
import { LeafIcon, GemIcon, BrushIcon, TreeIcon, PawPrintIcon } from '../icons';
import { Modal } from './common/Modal';
// FIX: LoadingIndicator was not defined. Imported it to be used in Suspense fallbacks.
import { LoadingIndicator } from './common/LoadingIndicator';

type SanctuarySubView = 'menu' | 'herbarium' | 'crystals' | 'art-therapy' | 'arboretum' | 'bestiary' | 'word-tree' | 'singing-bowl';
type TooltipState = { visible: boolean; text: string; x: number; y: number; };

const SingingBowlView = React.lazy(() => import('./SingingBowlView').then(module => ({ default: module.SingingBowlView })));

const SANCTUARY_MODULES: { id: SanctuarySubView; name: string; component: React.FC<{ onClose: () => void }>; }[] = [
    { id: 'herbarium', name: 'Herbier & Aromathèque', component: HerbariumView },
    { id: 'crystals', name: 'Cristaux & Intentions', component: CrystalsView },
    { id: 'art-therapy', name: 'Atelier Créatif', component: ArtTherapyView },
    { id: 'arboretum', name: 'Arboretum Symbolique', component: ArboretumView },
    { id: 'bestiary', name: 'Bestiaire Symbolique', component: BestiaryView },
    { id: 'word-tree', name: 'Arbre à Mots', component: WordTreeView },
    { id: 'singing-bowl', name: 'Bol Tibétain', component: SingingBowlView },
];

const InteractiveSanctuary: React.FC<{ onSelect: (view: SanctuarySubView) => void }> = ({ onSelect }) => {
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });

    const showTooltip = (e: React.MouseEvent<SVGGElement>, text: string) => {
        // Position tooltip relative to the interactive element, not the whole screen
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ visible: true, text, x: rect.left + rect.width / 2, y: rect.top - 10 });
    };

    const hideTooltip = () => {
        setTooltip({ ...tooltip, visible: false });
    };

    const handleKeyDown = (e: React.KeyboardEvent, view: SanctuarySubView) => {
        if (e.key === 'Enter' || e.key === ' ') {
            onSelect(view);
        }
    };
    
    return (
        <div className="sanctuary-interactive-container">
            {tooltip.visible && <div className="sanctuary-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>}
            <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" aria-labelledby="sanctuary-title" role="img">
                <title id="sanctuary-title">Paysage interactif du Sanctuaire</title>
                <defs>
                    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--color-primary-light)', stopOpacity: 0.5 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--color-bg-primary)', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
                <rect width="800" height="450" fill="url(#skyGradient)" />
                
                <path d="M0 450 L0 350 Q 200 320, 400 350 T 800 350 L800 450 Z" fill="var(--color-secondary-light)" opacity="0.5" />
                <path d="M0 450 L0 380 Q 250 360, 450 380 T 800 370 L800 450 Z" fill="var(--color-secondary-light)" opacity="0.7" />

                <g className="sanctuary-interactive-zone" onClick={() => onSelect('arboretum')} onMouseMove={(e) => showTooltip(e, 'Arboretum Symbolique')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'arboretum')} role="button" aria-label="Arboretum Symbolique" tabIndex={0}>
                    <title>Arboretum Symbolique</title>
                    <path className="sanctuary-tree-trunk" d="M400 360 L400 200 Q 390 190 380 180 T 370 150 M400 280 Q 420 270 430 250 T 440 200" />
                    <circle className="sanctuary-tree-canopy" cx="400" cy="150" r="100" />
                </g>

                <g className="sanctuary-interactive-zone" onClick={() => onSelect('word-tree')} onMouseMove={(e) => showTooltip(e, 'Arbre à Mots')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'word-tree')} role="button" aria-label="Arbre à Mots" tabIndex={0}>
                    <title>Arbre à Mots</title>
                    <text className="sanctuary-word-tree-letter" x="450" y="100">A</text>
                    <text className="sanctuary-word-tree-letter" x="350" y="80">B</text>
                    <text className="sanctuary-word-tree-letter" x="480" y="150">C</text>
                </g>

                 <g className="sanctuary-interactive-zone" onClick={() => onSelect('bestiary')} onMouseMove={(e) => showTooltip(e, 'Bestiaire Symbolique')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'bestiary')} role="button" aria-label="Bestiaire Symbolique" tabIndex={0}>
                    <title>Bestiaire Symbolique</title>
                    <path className="sanctuary-animal" d="M360 340 C 355 330, 365 330, 360 335 L 350 345 L 355 350 Z M355 338 L345 338" />
                </g>

                 <g className="sanctuary-interactive-zone" onClick={() => onSelect('herbarium')} onMouseMove={(e) => showTooltip(e, 'Herbier & Aromathèque')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'herbarium')} role="button" aria-label="Herbier & Aromathèque" tabIndex={0}>
                    <title>Herbier & Aromathèque</title>
                    <path className="sanctuary-plant" d="M150 380 Q 155 360 160 380 M155 380 L 155 350 M145 360 C 150 355, 150 355, 155 350 M165 360 C 160 355, 160 355, 155 350" />
                    <path className="sanctuary-plant" d="M180 370 Q 185 350 190 370 M185 370 L 185 340" />
                </g>

                 <g className="sanctuary-interactive-zone" onClick={() => onSelect('crystals')} onMouseMove={(e) => showTooltip(e, 'Cristaux & Intentions')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'crystals')} role="button" aria-label="Cristaux & Intentions" tabIndex={0}>
                    <title>Cristaux & Intentions</title>
                    <path className="sanctuary-crystal" d="M600 380 L 610 350 L 620 380 Z M610 350 L 615 340 L 625 350 L 620 380 L 610 350" />
                </g>

                <g className="sanctuary-interactive-zone" onClick={() => onSelect('art-therapy')} onMouseMove={(e) => showTooltip(e, 'Atelier Créatif')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'art-therapy')} role="button" aria-label="Atelier Créatif" tabIndex={0}>
                    <title>Atelier Créatif</title>
                    <path className="sanctuary-easel" d="M680 380 L 700 300 L 720 380 M 690 370 L 710 370 M 700 300 L 700 380" />
                    <rect className="sanctuary-canvas" x="685" y="310" width="30" height="40" />
                </g>

                <g className="sanctuary-interactive-zone" transform="translate(280, 360)" onClick={() => onSelect('singing-bowl')} onMouseMove={(e) => showTooltip(e, 'Bol Tibétain')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'singing-bowl')} role="button" aria-label="Bol Tibétain" tabIndex={0}>
                    <title>Bol Tibétain</title>
                    <circle r="25" fill="gold" opacity="0.5" className="calm-glow-anim" />
                    <circle r="20" fill="gold" opacity="0.8" />
                </g>
            </svg>
        </div>
    );
};


export const SanctuaryView: React.FC = () => {
    const [activeView, setActiveView] = useState<SanctuarySubView>('menu');

    const handleBack = () => {
        setActiveView('menu');
    };
    
    const activeModule = SANCTUARY_MODULES.find(m => m.id === activeView);
    const ActiveComponent = activeModule?.component;

    return (
        <div className="module-view fade-in" style={{ paddingBottom: 0 }}>
            <ModuleHeader title="Sanctuaire" />
            <div className="module-content" style={{ padding: 0, display: 'flex' }}>
                 <React.Suspense fallback={<div className="module-loading-fullscreen"><LoadingIndicator /></div>}>
                    <InteractiveSanctuary onSelect={setActiveView} />
                </React.Suspense>
            </div>

            <Modal
                isOpen={activeView !== 'menu'}
                onClose={handleBack}
                title={activeModule?.name || ''}
            >
                {ActiveComponent && <React.Suspense fallback={<LoadingIndicator />}><ActiveComponent onClose={handleBack} /></React.Suspense>}
            </Modal>
        </div>
    );
};