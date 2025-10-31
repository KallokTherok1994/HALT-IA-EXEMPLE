import React, { useState, useEffect } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { Archetype, ArchetypeId, ArchetypeActivation, ARCHETYPES_STORAGE_KEY } from '../types';
import { SACRED_ARCHETYPES } from '../data';
import { ShieldIcon, FlameIcon, AwardIcon, PlayIcon, PauseIcon, CheckCircleIcon } from '../icons';
import { useStorageState } from '../hooks/useStorageState';
import { getTodayDateString } from '../utils/dateHelpers';
import { useToast } from '../contexts/ToastContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSettings } from '../contexts/SettingsContext';

const ArchetypeCard: React.FC<{ archetype: Archetype; onSelect: () => void; }> = ({ archetype, onSelect }) => {
    const getIcon = () => {
        switch(archetype.id) {
            case 'gardien': return <ShieldIcon />;
            case 'alchimiste': return <FlameIcon />;
            case 'phenix': return <AwardIcon />;
            default: return null;
        }
    }
    return (
        <div className="content-card archetype-card" onClick={onSelect}>
            <div className="archetype-card-icon">{getIcon()}</div>
            <h3>{archetype.name}</h3>
            <p>{archetype.energy}</p>
        </div>
    );
};

const ArchetypeDetailView: React.FC<{
    archetype: Archetype;
    onBack: () => void;
    todaysArchetype: ArchetypeId | null;
    onActivate: (archetype: Archetype) => void;
}> = ({ archetype, onBack, todaysArchetype, onActivate }) => {
    const { settings } = useSettings();
    const { play, pause, resume, cancel, speechState } = useSpeechSynthesis(settings);
    const [speakingSection, setSpeakingSection] = useState<'invocation' | 'poem' | null>(null);

    useEffect(() => {
        if (speechState === 'idle') {
            setSpeakingSection(null);
        }
    }, [speechState]);
    
    // Cleanup speech on unmount or when archetype changes
    useEffect(() => {
        return () => cancel();
    }, [cancel, archetype]);

    const handlePlayPause = (section: 'invocation' | 'poem', text: string[]) => {
        if (speakingSection === section) {
            if (speechState === 'speaking') {
                pause();
            } else if (speechState === 'paused') {
                resume();
            } else {
                play(text.join(' \n\n '));
                setSpeakingSection(section);
            }
        } else {
            cancel();
            play(text.join(' \n\n '));
            setSpeakingSection(section);
        }
    };

    const getPlayButtonIcon = (section: 'invocation' | 'poem') => {
        if (speakingSection === section) {
            if (speechState === 'speaking') return <PauseIcon />;
            if (speechState === 'paused') return <PlayIcon />;
        }
        return <PlayIcon />;
    }

    return (
        <div className="archetype-detail-view fade-in">
            <div className="archetype-detail-header">
                <h2>{archetype.name}</h2>
                <p><em>{archetype.energy}</em></p>
            </div>
            <div className="archetype-detail-content">
                <div className="archetype-section">
                    <h4>
                        Invocation
                        <button onClick={() => handlePlayPause('invocation', archetype.invocation)} className="button-icon" title="Écouter l'invocation">
                            {getPlayButtonIcon('invocation')}
                        </button>
                    </h4>
                    <div className="archetype-poem">
                        {archetype.invocation.map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                </div>
                 <div className="archetype-section">
                    <h4>
                        Poème
                         <button onClick={() => handlePlayPause('poem', archetype.poem)} className="button-icon" title="Écouter le poème">
                             {getPlayButtonIcon('poem')}
                        </button>
                    </h4>
                    <div className="archetype-poem">
                        {archetype.poem.map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                </div>
                 <div className="archetype-section">
                    <h4>Mantras</h4>
                    <ul className="mantra-list">
                        <li><strong>Flash:</strong> {archetype.mantras.flash}</li>
                        <li><strong>Long:</strong> {archetype.mantras.long}</li>
                        <li><strong>Méditatif:</strong> {archetype.mantras.meditative}</li>
                        <li><strong>Ancrage:</strong> {archetype.mantras.anchoring}</li>
                    </ul>
                </div>
                 <div className="archetype-activation-section">
                    {todaysArchetype === archetype.id ? (
                        <p className="archetype-active-status"><CheckCircleIcon /> Cet archétype est activé pour aujourd'hui.</p>
                    ) : (
                        <button onClick={() => onActivate(archetype)} className="button-primary" disabled={!!todaysArchetype}>
                            Activer pour la journée
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


export const ArchetypesView: React.FC = () => {
    const [selectedArchetypeId, setSelectedArchetypeId] = useState<ArchetypeId | null>(null);
    const [activation, setActivation] = useStorageState<ArchetypeActivation | null>(ARCHETYPES_STORAGE_KEY, null);
    const { showToast } = useToast();
    
    const todayStr = getTodayDateString();
    const todaysArchetype = activation?.date === todayStr ? activation.archetypeId : null;

    const handleActivate = (archetype: Archetype) => {
        setActivation({ date: todayStr, archetypeId: archetype.id });
        showToast(`L'archétype ${archetype.name} est activé pour la journée !`, 'success');
    };

    const selectedArchetype = SACRED_ARCHETYPES.find(a => a.id === selectedArchetypeId);

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Archétypes Sacrés">
                {selectedArchetype && (
                     <button onClick={() => setSelectedArchetypeId(null)} className="button-secondary">Retour</button>
                )}
            </ModuleHeader>
            <div className="module-content">
                {selectedArchetype ? (
                    <ArchetypeDetailView 
                        archetype={selectedArchetype} 
                        onBack={() => setSelectedArchetypeId(null)}
                        todaysArchetype={todaysArchetype}
                        onActivate={handleActivate}
                    />
                ) : (
                    <div className="archetype-selection-view">
                        <p style={{textAlign: 'center', maxWidth: '600px', margin: '0 auto 2rem auto'}}>Explorez ces trois archétypes comme des miroirs de votre âme, des énergies que vous pouvez invoquer pour vous accompagner sur votre chemin.</p>
                        <div className="archetype-grid">
                            {SACRED_ARCHETYPES.map(archetype => (
                                <ArchetypeCard key={archetype.id} archetype={archetype} onSelect={() => setSelectedArchetypeId(archetype.id)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};