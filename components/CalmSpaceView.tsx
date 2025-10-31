import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { LoadingIndicator } from './common/LoadingIndicator';
import { generateQuickReframe } from '../services/generative-ai';
import { SparklesIcon, BodyIcon, EditIcon, DeleteIcon, PlusIcon, SaveIcon, XIcon, PlayIcon, PauseIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { AIInteraction } from './common/AIInteraction';
import { CustomSound, CUSTOM_SOUNDS_STORAGE_KEY, SoundMix, CUSTOM_SOUND_MIXES_STORAGE_KEY } from '../types';
import { useStorageState } from '../hooks/useStorageState';
import { Modal } from './common/Modal';

// --- Tool Components ---

const BreathingExercise: React.FC = () => {
    const [phase, setPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
    const phaseTexts = {
        idle: 'Cliquez pour commencer',
        inhale: 'Inspirez (4s)',
        hold: 'Retenez (3s)',
        exhale: 'Expirez (6s)',
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (phase !== 'idle') {
            const cycle = () => {
                setPhase('inhale');
                timer = setTimeout(() => {
                    setPhase('hold');
                    timer = setTimeout(() => {
                        setPhase('exhale');
                        timer = setTimeout(cycle, 6000); // 6s exhale
                    }, 3000); // 3s hold
                }, 4000); // 4s inhale
            };
            cycle();
        }
        return () => clearTimeout(timer);
    }, [phase]);

    const handleToggle = () => {
        setPhase(prev => (prev === 'idle' ? 'inhale' : 'idle'));
    };

    let visualizerClass = 'breathing-visualizer';
    if (phase === 'inhale') visualizerClass += ' breathing-inhale';
    if (phase === 'exhale') visualizerClass += ' breathing-exhale';

    return (
        <div className="calm-tool-container calm-tool-fullscreen" onClick={handleToggle}>
            <div className={visualizerClass}>
                <div className="visual-element"></div>
            </div>
            <p className="breathing-phase-text">{phaseTexts[phase]}</p>
        </div>
    );
};

const QuickReframe: React.FC = () => {
    const [thought, setThought] = useState('');
    const [reframe, setReframe] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleReframe = async () => {
        if (!thought.trim()) return;
        setIsLoading(true);
        setReframe('');
        try {
            const result = await generateQuickReframe(thought);
            setReframe(result);
        } catch (error) {
            showToast("La génération du recadrage a échoué. Veuillez réessayer.", "destructive");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="calm-tool-container quick-reframe-view">
            <h2>Recadrage Rapide</h2>
            <p>Notez une pensée angoissante et laissez l'IA vous proposer une perspective plus douce.</p>
            <textarea
                value={thought}
                onChange={e => setThought(e.target.value)}
                placeholder="Ex: Je ne vais jamais y arriver..."
                rows={3}
                style={{ width: '100%' }}
            />
            <button onClick={handleReframe} className="button-primary" disabled={isLoading || !thought.trim()}>
                <SparklesIcon /> {isLoading ? 'Réflexion...' : 'Recadrer ma pensée'}
            </button>
            {isLoading && <AIInteraction messages={["Analyse de votre pensée...", "Recherche d'une perspective plus douce..."]} />}
            {reframe && (
                <div className="ai-reframe-response fade-in">
                    <p>{reframe}</p>
                </div>
            )}
        </div>
    );
};


const FiveSensesGrounding: React.FC = () => {
    const senses = [
        { name: "5 choses que vous pouvez VOIR", icon: '👁️' },
        { name: "4 choses que vous pouvez SENTIR (tactile)", icon: '🖐️' },
        { name: "3 choses que vous pouvez ENTENDRE", icon: '👂' },
        { name: "2 choses que vous pouvez ODORER", icon: '👃' },
        { name: "1 chose que vous pouvez GOÛTER", icon: '👅' },
    ];
    const [currentSense, setCurrentSense] = useState(0);

    return (
        <div className="calm-tool-container">
            <div className="five-senses-card content-card fade-in" key={currentSense}>
                <div className="icon" style={{fontSize: '3rem'}}>{senses[currentSense].icon}</div>
                <h2>{senses[currentSense].name}</h2>
                <p>Prenez un moment pour identifier ces éléments autour de vous.</p>
                <button
                    onClick={() => setCurrentSense((currentSense + 1) % senses.length)}
                    className="button-primary"
                >
                    {currentSense === senses.length - 1 ? 'Recommencer' : 'Suivant'}
                </button>
            </div>
        </div>
    );
};

const ProgressiveMuscleRelaxation: React.FC = () => {
    const muscleGroups = ["Pieds", "Jambes", "Hanches", "Ventre", "Mains", "Bras", "Épaules", "Visage"];
    const [groupIndex, setGroupIndex] = useState(0);
    const [phase, setPhase] = useState<'tense' | 'release'>('tense');

    const handleNext = () => {
        if (phase === 'tense') {
            setPhase('release');
        } else {
            setPhase('tense');
            setGroupIndex((groupIndex + 1) % muscleGroups.length);
        }
    };

    return (
        <div className="calm-tool-container">
             <div className={`pmr-card content-card fade-in ${phase}`} key={`${groupIndex}-${phase}`}>
                 <div className="icon" style={{fontSize: '3rem'}}>🧘</div>
                 <h2>Relaxation Musculaire Progressive</h2>
                 <p>Concentrez-vous sur vos <strong>{muscleGroups[groupIndex]}</strong>.</p>
                 <div className="pmr-phase-indicator">
                    {phase === 'tense' ? 'Tendez (5s)' : 'Relâchez (10s)'}
                 </div>
                 <button onClick={handleNext} className="button-primary" style={{marginTop: '1.5rem'}}>Suivant</button>
             </div>
        </div>
    );
};

const SoundEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (sound: Omit<CustomSound, 'id'> & { id?: string }) => void;
    soundToEdit: CustomSound | null;
}> = ({ isOpen, onClose, onSave, soundToEdit }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('🎶');

    useEffect(() => {
        if (soundToEdit) {
            setName(soundToEdit.name);
            setUrl(soundToEdit.url);
            setIcon(soundToEdit.icon);
        } else {
            setName('');
            setUrl('');
            setIcon('🎶');
        }
    }, [soundToEdit, isOpen]);

    const handleSave = () => {
        if (name.trim() && url.trim()) {
            onSave({ id: soundToEdit?.id, name, url, icon });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={soundToEdit ? "Modifier le Son" : "Ajouter un Son"}>
            <div className="form-group">
                <label htmlFor="sound-name">Nom</label>
                <input id="sound-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pluie sur une tente" />
            </div>
            <div className="form-group">
                <label htmlFor="sound-icon">Icône (emoji)</label>
                <input id="sound-icon" type="text" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
            </div>
            <div className="form-group">
                <label htmlFor="sound-url">URL du fichier audio</label>
                <input id="sound-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                <p className="setting-item-description">Assurez-vous que le lien est direct vers un fichier audio (ex: .mp3, .wav).</p>
            </div>
            <div className="wizard-actions">
                <button onClick={onClose} className="button-secondary">Annuler</button>
                <button onClick={handleSave} className="button-primary" disabled={!name.trim() || !url.trim()}><SaveIcon/> Enregistrer</button>
            </div>
        </Modal>
    );
};

type Sound = { name: string; icon: string; src: string; isCustom?: boolean; id?: string; };
const PREDEFINED_SOUNDS: Sound[] = [
    { name: 'Pluie', icon: '🌧️', src: 'https://cdn.pixabay.com/audio/2023/09/21/audio_511c84136a.mp3' },
    { name: 'Forêt', icon: '🌲', src: 'https://cdn.pixabay.com/audio/2022/08/04/audio_a84a682fce.mp3' },
    { name: 'Feu de camp', icon: '🔥', src: 'https://cdn.pixabay.com/audio/2022/02/01/audio_d148e1c62f.mp3' },
    { name: 'Océan', icon: '🌊', src: 'https://cdn.pixabay.com/audio/2022/08/03/audio_5533a1e74f.mp3' },
    { name: 'Vent', icon: '💨', src: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2331593461.mp3'},
    { name: 'Café', icon: '☕', src: 'https://cdn.pixabay.com/audio/2022/07/22/audio_c9372e1281.mp3'},
];

const Soundscapes: React.FC = () => {
    const audioPlayersRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const [activeSounds, setActiveSounds] = useState<{ [key: string]: number }>({});
    const [isGloballyPlaying, setIsGloballyPlaying] = useState(true);
    
    const [customSounds, setCustomSounds] = useStorageState<CustomSound[]>(CUSTOM_SOUNDS_STORAGE_KEY, []);
    const [soundMixes, setSoundMixes] = useStorageState<SoundMix[]>(CUSTOM_SOUND_MIXES_STORAGE_KEY, []);
    
    const [soundToEdit, setSoundToEdit] = useState<CustomSound | null>(null);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [isSaveMixModalOpen, setIsSaveMixModalOpen] = useState(false);
    const [newMixName, setNewMixName] = useState('');
    const { showToast } = useToast();

    const allSounds: Sound[] = useMemo(() => [
        ...PREDEFINED_SOUNDS,
        ...customSounds.map(cs => ({ name: cs.name, icon: cs.icon, src: cs.url, isCustom: true, id: cs.id }))
    ], [customSounds]);

    useEffect(() => {
        const players = audioPlayersRef.current;
        return () => {
            Object.values(players).forEach(player => (player as HTMLAudioElement).pause());
        };
    }, []);

    const toggleSound = useCallback((sound: Sound) => {
        const { src } = sound;
        const currentPlayers = audioPlayersRef.current;
        const newActiveSounds = { ...activeSounds };

        if (currentPlayers[src]) {
            currentPlayers[src].pause();
            delete currentPlayers[src];
            delete newActiveSounds[src];
        } else {
            const player = new Audio(src);
            player.loop = true;
            player.volume = 0.5;
            if (isGloballyPlaying) {
                player.play().catch(e => {
                    console.error("Audio play failed:", e);
                    showToast("Impossible de lire ce son. Vérifiez l'URL.", "destructive");
                });
            }
            currentPlayers[src] = player;
            newActiveSounds[src] = 0.5;
        }
        setActiveSounds(newActiveSounds);
    }, [activeSounds, isGloballyPlaying, showToast]);
    
    const updateVolume = useCallback((src: string, volume: number) => {
        if (audioPlayersRef.current[src]) {
            audioPlayersRef.current[src].volume = volume;
            setActiveSounds(prev => ({ ...prev, [src]: volume }));
        }
    }, []);
    
    const toggleMasterPlay = useCallback(() => {
        const newIsPlaying = !isGloballyPlaying;
        Object.values(audioPlayersRef.current).forEach(player => {
            newIsPlaying ? (player as HTMLAudioElement).play().catch(e => console.error(e)) : (player as HTMLAudioElement).pause();
        });
        setIsGloballyPlaying(newIsPlaying);
    }, [isGloballyPlaying]);
    
    const stopAllSounds = useCallback(() => {
        Object.values(audioPlayersRef.current).forEach(player => (player as HTMLAudioElement).pause());
        audioPlayersRef.current = {};
        setActiveSounds({});
    }, []);

    const handleSaveSound = (soundData: Omit<CustomSound, 'id'> & { id?: string }) => {
        if (soundData.id) {
            setCustomSounds(prev => prev.map(s => s.id === soundData.id ? { ...s, name: soundData.name, url: soundData.url, icon: soundData.icon } : s));
            showToast("Son mis à jour.", "success");
        } else {
            const newSound: CustomSound = { ...soundData, id: Date.now().toString(), name: soundData.name, url: soundData.url, icon: soundData.icon };
            setCustomSounds(prev => [...prev, newSound]);
             showToast("Son ajouté !", "success");
        }
        setIsEditorModalOpen(false);
    };

    const handleDeleteSound = (id: string) => {
        const soundToDelete = customSounds.find(cs => cs.id === id);
        if (soundToDelete && audioPlayersRef.current[soundToDelete.url]) {
            audioPlayersRef.current[soundToDelete.url].pause();
            delete audioPlayersRef.current[soundToDelete.url];
            setActiveSounds(prev => {
                const newActive = {...prev};
                delete newActive[soundToDelete.url];
                return newActive;
            });
        }
        setCustomSounds(prev => prev.filter(s => s.id !== id));
        showToast("Son supprimé.", "info");
    };

    const handleSaveMix = () => {
        if (!newMixName.trim()) return;
        const newMix: SoundMix = {
            id: Date.now().toString(),
            name: newMixName,
            sounds: Object.entries(activeSounds).map(([soundSrc, volume]) => ({ soundSrc, volume: volume as number }))
        };
        setSoundMixes(prev => [...prev, newMix]);
        setNewMixName('');
        setIsSaveMixModalOpen(false);
        showToast("Mix sauvegardé !", "success");
    };

    const handleLoadMix = (mix: SoundMix) => {
        stopAllSounds();
        setTimeout(() => {
            const players: { [key: string]: HTMLAudioElement } = {};
            const newActive: { [key: string]: number } = {};
            mix.sounds.forEach(({ soundSrc, volume }) => {
                const player = new Audio(soundSrc);
                player.loop = true;
                player.volume = volume;
                if (isGloballyPlaying) {
                    player.play().catch(e => console.error(e));
                }
                players[soundSrc] = player;
                newActive[soundSrc] = volume;
            });
            audioPlayersRef.current = players;
            setActiveSounds(newActive);
        }, 100);
    };
    
    const handleDeleteMix = (id: string) => {
        setSoundMixes(prev => prev.filter(mix => mix.id !== id));
        showToast("Mix supprimé.", "info");
    };

    return (
        <div className="calm-tool-container soundscape-view">
            <div className="soundscape-view-interactive">
                {allSounds.map(sound => (
                    <div key={sound.src} className="sound-bubble-wrapper">
                        <div
                            className={`sound-bubble ${activeSounds[sound.src] ? 'active' : ''}`}
                            onClick={() => toggleSound(sound)}
                        >
                            <span className="sound-bubble-icon">{sound.icon}</span>
                            <span className="sound-bubble-name">{sound.name}</span>
                             {sound.isCustom && sound.id && (
                                <div className="card-actions">
                                    <button className="button-icon" onClick={(e) => { e.stopPropagation(); setSoundToEdit(customSounds.find(cs => cs.id === sound.id)!); setIsEditorModalOpen(true); }}><EditIcon /></button>
                                    <button className="button-icon destructive" onClick={(e) => { e.stopPropagation(); handleDeleteSound(sound.id!); }}><DeleteIcon /></button>
                                </div>
                            )}
                        </div>
                        <div className={`sound-bubble-volume-slider ${activeSounds[sound.src] ? 'visible' : ''}`}>
                             <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={activeSounds[sound.src] || 0.5}
                                onChange={e => updateVolume(sound.src, parseFloat(e.target.value))}
                                onClick={e => e.stopPropagation()}
                                aria-label={`Volume for ${sound.name}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="sound-mixer-controls">
                <div className="main-controls">
                    <button onClick={toggleMasterPlay} className="master-play-button" aria-label={isGloballyPlaying ? "Pause all" : "Play all"}>
                        {isGloballyPlaying ? <PauseIcon/> : <PlayIcon/>}
                    </button>
                    <div className="action-button-group">
                        <button className="button-secondary" disabled={Object.keys(activeSounds).length === 0} onClick={() => setIsSaveMixModalOpen(true)}>
                            <SaveIcon/> Sauvegarder le Mix
                        </button>
                        <button onClick={() => { setSoundToEdit(null); setIsEditorModalOpen(true); }} className="button-secondary">
                            <PlusIcon/> Ajouter un Son
                        </button>
                    </div>
                </div>
                 {soundMixes.length > 0 && (
                    <div className="saved-mixes-section">
                        <div className="saved-mixes-list">
                            {soundMixes.map(mix => (
                                <div key={mix.id} className="saved-mix-item">
                                    <span onClick={() => handleLoadMix(mix)}>{mix.name}</span>
                                    <button className="button-icon destructive" onClick={() => handleDeleteMix(mix.id)}><XIcon/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SoundEditorModal 
                isOpen={isEditorModalOpen}
                onClose={() => setIsEditorModalOpen(false)}
                onSave={handleSaveSound}
                soundToEdit={soundToEdit}
            />
             <Modal isOpen={isSaveMixModalOpen} onClose={() => setIsSaveMixModalOpen(false)} title="Sauvegarder le mix">
                 <div className="form-group">
                     <label htmlFor="mix-name">Nom du mix</label>
                     <input id="mix-name" type="text" value={newMixName} onChange={e => setNewMixName(e.target.value)} />
                 </div>
                 <div className="wizard-actions">
                     <button onClick={handleSaveMix} className="button-primary" disabled={!newMixName.trim()}>Sauvegarder</button>
                 </div>
             </Modal>
        </div>
    );
};

const BODY_SCAN_STEPS = [
    { name: "Pieds", prompt: "Portez votre attention sur vos pieds. Ressentez le contact avec le sol, la température, les éventuelles tensions... sans jugement." },
    { name: "Jambes", prompt: "Remontez votre attention le long de vos mollets, genoux et cuisses. Observez les sensations de lourdeur ou de légèreté." },
    { name: "Bassin et Ventre", prompt: "Sentez votre bassin reposer sur votre siège. Observez le mouvement doux de votre respiration dans votre ventre." },
    { name: "Poitrine et Dos", prompt: "Ressentez l'ouverture de votre poitrine à chaque inspiration et le relâchement de votre dos." },
    { name: "Mains et Bras", prompt: "Prenez conscience de vos mains, de vos doigts, puis remontez le long de vos bras jusqu'aux épaules." },
    { name: "Épaules et Nuque", prompt: "Observez les tensions qui pourraient être logées dans votre cou et vos épaules. Laissez-les se détendre." },
    { name: "Visage et Tête", prompt: "Relâchez votre mâchoire, vos sourcils, votre front. Sentez le sommet de votre crâne." },
    { name: "Corps Entier", prompt: "Prenez un instant pour ressentir votre corps dans sa globalité, respirant, simplement présent ici et maintenant." },
];

const BodyScanExercise: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const isCompleted = step >= BODY_SCAN_STEPS.length;
    const currentStepData = BODY_SCAN_STEPS[step];

    if (isCompleted) {
        return (
            <div className="body-scan-view body-scan-complete fade-in">
                <span style={{fontSize: '3rem'}}>🧘‍♀️</span>
                <h2>Scan Corporel Terminé</h2>
                <p>Prenez un instant pour apprécier ce moment de calme avant de continuer votre journée.</p>
                <button onClick={onComplete} className="button-primary">Terminer</button>
            </div>
        );
    }

    return (
        <div className="body-scan-view calm-tool-fullscreen fade-in">
            <div className="body-scan-progress">
                Étape {step + 1} / {BODY_SCAN_STEPS.length}
            </div>
            <div className="body-scan-prompt">
                <h2>{currentStepData.name}</h2>
                <p>{currentStepData.prompt}</p>
            </div>
            <button onClick={() => setStep(s => s + 1)} className="button-primary">
                Suivant
            </button>
        </div>
    );
};

const GuidedMeditation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [status, setStatus] = useState<'setup' | 'running'>('setup');
    const [duration, setDuration] = useState(5 * 60); // default 5 minutes in seconds
    const [timeLeft, setTimeLeft] = useState(duration);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const speechRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { showToast } = useToast();

    const mantra = "Je suis calme et serein.";

    const speakMantra = useCallback(() => {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
                return; // Don't interrupt if already speaking
            }
            const utterance = new SpeechSynthesisUtterance(mantra);
            utterance.lang = 'fr-FR';
            window.speechSynthesis.speak(utterance);
        } else {
            showToast("La synthèse vocale n'est pas supportée par votre navigateur.", "info");
        }
    }, [mantra, showToast]);

    useEffect(() => {
        if (status === 'running') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        if(speechRef.current) clearInterval(speechRef.current!);
                        window.speechSynthesis.cancel();
                        showToast("Méditation terminée. Bravo !", "success");
                        onComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            speakMantra(); // Initial speak
            speechRef.current = setInterval(speakMantra, 15000); // Repeat every 15s

        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (speechRef.current) clearInterval(speechRef.current);
            window.speechSynthesis.cancel();
        };
    }, [status, speakMantra, onComplete, showToast]);

    const handleStart = (minutes: number) => {
        const seconds = minutes * 60;
        setDuration(seconds);
        setTimeLeft(seconds);
        setStatus('running');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (status === 'setup') {
        return (
            <div className="guided-meditation-view fade-in">
                <h2>Méditation Guidée</h2>
                <p>Choisissez une durée et laissez-vous guider par le mantra.</p>
                <div className="duration-selector">
                    <button className="button-secondary" onClick={() => handleStart(3)}>3 Minutes</button>
                    <button className="button-primary" onClick={() => handleStart(5)}>5 Minutes</button>
                    <button className="button-secondary" onClick={() => handleStart(10)}>10 Minutes</button>
                </div>
            </div>
        );
    }

    return (
        <div className="guided-meditation-view calm-tool-fullscreen fade-in">
            <div className="meditation-visualizer">
                <div className="pulsing-circle"></div>
            </div>
            <h2 className="meditation-mantra">"{mantra}"</h2>
            <p className="meditation-timer">{formatTime(timeLeft)}</p>
            <button onClick={onComplete} className="button-secondary" style={{ marginTop: '2rem' }}>Terminer la méditation</button>
        </div>
    );
};

// --- Main View ---

type CalmTool = 'breathing' | 'reframe' | 'senses' | 'pmr' | 'soundscapes' | 'body-scan' | 'guided-meditation';
type TooltipState = { visible: boolean; text: string; x: number; y: number; };

const InteractiveCalmMenu: React.FC<{ onSelect: (tool: CalmTool) => void }> = ({ onSelect }) => {
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });

    const showTooltip = (e: React.MouseEvent<SVGGElement>, text: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ visible: true, text, x: rect.left + rect.width / 2, y: rect.top });
    };

    const hideTooltip = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    const handleKeyDown = (e: React.KeyboardEvent, view: CalmTool) => {
        if (e.key === 'Enter' || e.key === ' ') {
            onSelect(view);
        }
    };
    
    return (
        <div className="calm-space-interactive-menu">
            {tooltip.visible && <div className="calm-menu-tooltip visible" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>}
            <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-label="Menu interactif de l'Espace Calme">
                <rect width="800" height="600" className="background" />
                
                <g className="calm-menu-zone" transform="translate(150, 150)" onClick={() => onSelect('breathing')} onMouseMove={(e) => showTooltip(e, 'Respiration Carrée')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'breathing')} role="button" aria-label="Respiration Carrée" tabIndex={0}>
                    <circle r="40" fill="var(--color-primary)" opacity="0.5" className="calm-pulse-anim" />
                    <circle r="30" fill="var(--color-primary)" opacity="0.8" />
                </g>

                <g className="calm-menu-zone" transform="translate(400, 100)" onClick={() => onSelect('reframe')} onMouseMove={(e) => showTooltip(e, 'Recadrage Rapide')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'reframe')} role="button" aria-label="Recadrage Rapide" tabIndex={0}>
                     <path d="M-15 0 L15 0 L10 10 L-10 10 Z M-5 10 L5 10 L5 20 L-5 20 Z" fill="var(--color-text-muted)" />
                     <path d="M0 -30 A20 20 0 1 1 0 -29.9" fill="var(--color-info)" className="calm-glow-anim" />
                </g>
                
                <g className="calm-menu-zone" transform="translate(650, 180)" onClick={() => onSelect('soundscapes')} onMouseMove={(e) => showTooltip(e, 'Paysages Sonores')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'soundscapes')} role="button" aria-label="Paysages Sonores" tabIndex={0}>
                    <circle r="5" cx="0" cy="0" fill="transparent" stroke="var(--color-secondary)" strokeWidth="2" className="calm-ripple-anim" style={{ animationDelay: '0s' }} />
                    <circle r="5" cx="0" cy="0" fill="transparent" stroke="var(--color-secondary)" strokeWidth="2" className="calm-ripple-anim" style={{ animationDelay: '1s' }}/>
                </g>

                <g className="calm-menu-zone" transform="translate(120, 450)" onClick={() => onSelect('senses')} onMouseMove={(e) => showTooltip(e, 'Les 5 Sens')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'senses')} role="button" aria-label="Les 5 Sens" tabIndex={0}>
                    <path d="M-30 0 C-10 -30, 10 -30, 30 0 C10 30, -10 30, -30 0 Z" fill="var(--color-bg-secondary)" />
                    <circle r="8" fill="var(--color-text-secondary)" className="calm-pulse-anim" />
                </g>

                <g className="calm-menu-zone" transform="translate(300, 500)" onClick={() => onSelect('pmr')} onMouseMove={(e) => showTooltip(e, 'Relaxation Musculaire')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'pmr')} role="button" aria-label="Relaxation Musculaire" tabIndex={0}>
                    <path d="M-40 0 Q-20 -20 0 0 T40 0" stroke="var(--color-destructive)" strokeWidth="4" fill="transparent" className="calm-glow-anim" />
                </g>
                
                <g className="calm-menu-zone" transform="translate(500, 400)" onClick={() => onSelect('body-scan')} onMouseMove={(e) => showTooltip(e, 'Scan Corporel')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'body-scan')} role="button" aria-label="Scan Corporel" tabIndex={0}>
                    <g transform="scale(0.3) translate(-75, -125)" fill="transparent" stroke="var(--color-text-secondary)" strokeWidth="8" className="calm-glow-anim">
                        <BodyIcon />
                    </g>
                </g>
                
                <g className="calm-menu-zone" transform="translate(680, 480)" onClick={() => onSelect('guided-meditation')} onMouseMove={(e) => showTooltip(e, 'Méditation Guidée')} onMouseLeave={hideTooltip} onKeyDown={(e) => handleKeyDown(e, 'guided-meditation')} role="button" aria-label="Méditation Guidée" tabIndex={0}>
                    <path d="M-5 20 L5 20 L5 -5 C5 -15, -5 -15, -5 -5 Z" fill="var(--color-info)" />
                    <path d="M0 -5 Q10 -20 0 -35 Q-10 -20 0 -5 Z" fill="var(--color-secondary)" className="calm-flicker-anim"/>
                </g>
            </svg>
        </div>
    );
};

export const CalmSpaceView: React.FC = () => {
    const [selectedTool, setSelectedTool] = useState<CalmTool | null>(null);

    const tools: { id: CalmTool; name: string; description: string; icon: React.FC<any> | string }[] = [
        { id: 'breathing', name: 'Respiration Carrée', description: 'Calmez votre système nerveux.', icon: '🧘' },
        { id: 'reframe', name: 'Recadrage Rapide', description: "Changez de perspective sur une pensée.", icon: '💡' },
        { id: 'soundscapes', name: 'Paysages Sonores', description: 'Créez votre ambiance sonore.', icon: '🎧' },
        { id: 'senses', name: 'Les 5 Sens', description: "Ancrez-vous dans le moment présent.", icon: '👁️' },
        { id: 'pmr', name: 'Relaxation Musculaire', description: "Relâchez les tensions corporelles.", icon: '💪' },
        { id: 'body-scan', name: 'Scan Corporel', description: 'Reconnectez-vous à vos sensations.', icon: BodyIcon },
        { id: 'guided-meditation', name: 'Méditation Guidée', description: 'Écoutez un mantra apaisant.', icon: '🕯️' },
    ];

    const renderTool = () => {
        switch (selectedTool) {
            case 'breathing': return <BreathingExercise />;
            case 'reframe': return <QuickReframe />;
            case 'senses': return <FiveSensesGrounding />;
            case 'pmr': return <ProgressiveMuscleRelaxation />;
            case 'soundscapes': return <Soundscapes />;
            case 'body-scan': return <BodyScanExercise onComplete={() => setSelectedTool(null)} />;
            case 'guided-meditation': return <GuidedMeditation onComplete={() => setSelectedTool(null)} />;
            default: return null;
        }
    };
    
    const toolName = tools.find(t => t.id === selectedTool)?.name || "Espace Calme";

    return (
        <div className="module-view fade-in">
            <ModuleHeader title={toolName}>
                 {selectedTool && <button onClick={() => setSelectedTool(null)} className="button-secondary">Retour aux outils</button>}
            </ModuleHeader>
            <div className="module-content" style={{ padding: 0, display: 'flex', overflow: 'hidden' }}>
                {selectedTool === null ? (
                    <InteractiveCalmMenu onSelect={setSelectedTool} />
                ) : (
                    <div className="calm-space-tool-content" style={{ padding: 'var(--spacing-lg)', width: '100%', overflowY: 'auto' }}>
                        {renderTool()}
                    </div>
                )}
            </div>
        </div>
    );
};