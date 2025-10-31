import React, { useRef, useState, useEffect } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { storage } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { AppSettings, ModuleId } from '../types';
import { modules } from '../data';
import { PlusIcon, DeleteIcon } from '../icons';

const sharableModules = modules
    .filter(m => ['journal', 'gratitude', 'thought-court', 'ritual', 'values', 'goals', 'assessment', 'wounds', 'rhythm', 'relational-ecosystem', 'body-map', 'unsent-letters', 'fear-setting', 'oracle', 'dream-journal'].includes(m.id));

export const SettingsView: React.FC<{}> = () => {
    const { settings, updateSetting } = useSettings();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [prompts, setPrompts] = useState(settings.customCoachPrompts);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const fetchVoices = () => {
            if ('speechSynthesis' in window) {
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    setAvailableVoices(voices.filter(v => v.lang.startsWith('fr')));
                }
            }
        };

        fetchVoices();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = fetchVoices;
        }

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const handleClearData = () => {
        if (window.confirm("Êtes-vous absolument sûr ? Cette action est irréversible et supprimera toutes vos données (entrées de journal, rituels, etc.).")) {
            storage.clearAllAppData();
            alert("Toutes les données de l'application ont été effacées. L'application va se recharger.");
            window.location.reload();
        }
    };

    const handleExportData = () => {
        try {
            const jsonData = storage.exportAllAppData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const today = new Date().toISOString().split('T')[0];
            a.download = `halte_ia_backup_${today}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Données exportées avec succès.", "success");
        } catch (error) {
            console.error("Export failed", error);
            showToast("L'exportation des données a échoué.", "destructive");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("Êtes-vous sûr de vouloir importer ces données ?\n\nATTENTION : Cette action remplacera toutes vos données actuelles de manière irréversible.")) {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                storage.importAllAppData(jsonString);
                showToast("Données importées avec succès. L'application va se recharger.", "success");
                setTimeout(() => window.location.reload(), 1500);
            } catch (error: any) {
                console.error("Import failed", error);
                showToast(error.message || "L'importation a échoué. Le fichier est peut-être corrompu.", "destructive");
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.onerror = () => {
             showToast("Erreur lors de la lecture du fichier.", "destructive");
        };
        reader.readAsText(file);
    };

    const handleWidgetToggle = (widget: keyof AppSettings['dashboardWidgets']) => {
        const currentWidgets = settings.dashboardWidgets;
        updateSetting('dashboardWidgets', {
            ...currentWidgets,
            [widget]: !currentWidgets[widget],
        });
    };
    
    const handleContextShareToggle = (moduleId: ModuleId) => {
        const currentPermissions = settings.shareContextWithAI;
        updateSetting('shareContextWithAI', {
            ...currentPermissions,
            [moduleId]: !currentPermissions[moduleId],
        });
    };

    const handleShareAll = (share: boolean) => {
        const newPermissions = { ...settings.shareContextWithAI };
        sharableModules.forEach(m => {
            newPermissions[m.id] = share;
        });
        updateSetting('shareContextWithAI', newPermissions);
    };
    
    const handlePromptChange = (index: number, value: string) => {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    };
    const handleAddPrompt = () => setPrompts([...prompts, '']);
    const handleRemovePrompt = (index: number) => setPrompts(prompts.filter((_, i) => i !== index));
    const handleSavePrompts = () => {
        updateSetting('customCoachPrompts', prompts.filter(p => p.trim() !== ''));
        showToast("Amorces de conversation sauvegardées.", "success");
    };

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Paramètres" />
            <div className="module-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                 <div className="settings-section">
                    <h3>Profil</h3>
                    <div className="setting-item-row">
                        <label htmlFor="user-name">Votre nom</label>
                        <input
                            id="user-name"
                            type="text"
                            value={settings.userName}
                            onChange={(e) => updateSetting('userName', e.target.value)}
                            placeholder="Comment Hal doit-il vous appeler ?"
                        />
                         <p className='setting-item-description'>Utilisé pour personnaliser les salutations.</p>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Apparence</h3>
                     <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Thème</label>
                            <p>Choisissez l'apparence de l'application.</p>
                        </div>
                        <div className="setting-item-control">
                            <div className="radio-group">
                                <button
                                    className={`radio-button ${settings.theme === 'light' ? 'active' : ''}`}
                                    onClick={() => updateSetting('theme', 'light')}
                                >
                                    Clair
                                </button>
                                <button
                                    className={`radio-button ${settings.theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => updateSetting('theme', 'dark')}
                                >
                                    Sombre
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                 <div className="settings-section">
                    <h3>Personnalisation du Coach Hal</h3>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Personnalité</label>
                            <p>Choisissez le style de coaching principal de Hal.</p>
                        </div>
                        <div className="setting-item-control">
                            <div className="radio-group">
                                <button
                                    className={`radio-button ${settings.coachSettings.personality === 'Bienveillant' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, personality: 'Bienveillant' })}
                                >
                                    Bienveillant
                                </button>
                                <button
                                    className={`radio-button ${settings.coachSettings.personality === 'Direct' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, personality: 'Direct' })}
                                >
                                    Direct
                                </button>
                                 <button
                                    className={`radio-button ${settings.coachSettings.personality === 'Philosophe' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, personality: 'Philosophe' })}
                                >
                                    Philosophe
                                </button>
                            </div>
                        </div>
                    </div>
                     <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Ton</label>
                            <p>Choisissez le ton général des interactions de Hal.</p>
                        </div>
                        <div className="setting-item-control">
                            <div className="radio-group">
                                <button
                                    className={`radio-button ${settings.coachSettings.tone === 'Encourageant' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, tone: 'Encourageant' })}
                                >
                                    Encourageant
                                </button>
                                <button
                                    className={`radio-button ${settings.coachSettings.tone === 'Neutre' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, tone: 'Neutre' })}
                                >
                                    Neutre
                                </button>
                                 <button
                                    className={`radio-button ${settings.coachSettings.tone === 'Stimulant' ? 'active' : ''}`}
                                    onClick={() => updateSetting('coachSettings', { ...settings.coachSettings, tone: 'Stimulant' })}
                                >
                                    Stimulant
                                </button>
                            </div>
                        </div>
                    </div>
                     <div className="setting-item-row">
                        <label>Amorces de conversation personnalisées</label>
                         <p className="setting-item-description">Personnalisez les suggestions de questions dans la fenêtre de chat avec Hal.</p>
                         <div className="task-list-editor" style={{marginTop: 'var(--spacing-md)'}}>
                            {prompts.map((prompt, index) => (
                                <div key={index} className="editor-task-item">
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={e => handlePromptChange(index, e.target.value)}
                                    />
                                    <button onClick={() => handleRemovePrompt(index)} className="button-icon destructive"><DeleteIcon/></button>
                                </div>
                            ))}
                         </div>
                         <div className="action-button-group" style={{marginTop: 'var(--spacing-sm)'}}>
                            <button onClick={handleAddPrompt} className="button-secondary"><PlusIcon/> Ajouter</button>
                            <button onClick={handleSavePrompts} className="button-primary">Enregistrer les amorces</button>
                         </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Paramètres de la Voix de Hal</h3>
                    <div className="setting-item-row">
                        <label htmlFor="voice-select">Voix</label>
                        <select
                            id="voice-select"
                            value={settings.coachSettings.voiceURI || ''}
                            onChange={(e) => updateSetting('coachSettings', { ...settings.coachSettings, voiceURI: e.target.value || null })}
                            disabled={availableVoices.length === 0}
                        >
                            <option value="">Automatique (Recommandé)</option>
                            {availableVoices.map(voice => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                        <p className="setting-item-description">
                            Choix de la voix pour les lectures audio. La disponibilité dépend de votre navigateur et système d'exploitation.
                            {availableVoices.length === 0 && " Chargement des voix..."}
                        </p>
                    </div>
                    <div className="setting-item-row">
                        <label htmlFor="voice-rate">Vitesse de parole : {settings.coachSettings.voiceRate.toFixed(1)}x</label>
                        <input
                            id="voice-rate"
                            type="range"
                            min="0.8"
                            max="1.5"
                            step="0.1"
                            value={settings.coachSettings.voiceRate}
                            onChange={(e) => updateSetting('coachSettings', { ...settings.coachSettings, voiceRate: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="setting-item-row">
                        <label htmlFor="voice-pitch">Hauteur de la voix : {settings.coachSettings.voicePitch.toFixed(1)}</label>
                        <input
                            id="voice-pitch"
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={settings.coachSettings.voicePitch}
                            onChange={(e) => updateSetting('coachSettings', { ...settings.coachSettings, voicePitch: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
                
                 <div className="settings-section">
                    <h3>Confidentialité</h3>
                     <div className="setting-item-row">
                        <label>Partager le contexte avec l'IA</label>
                        <p className="setting-item-description">Autorisez Hal à utiliser vos données de modules spécifiques pour personnaliser ses analyses. Vos données restent sur votre appareil et ne sont envoyées que pour l'analyse ponctuelle.</p>
                        <div className="action-button-group" style={{margin: 'var(--spacing-md) 0'}}>
                            <button className="button-secondary" onClick={() => handleShareAll(true)}>Tout autoriser</button>
                            <button className="button-secondary" onClick={() => handleShareAll(false)}>Tout refuser</button>
                        </div>
                        <div className="context-sharing-grid">
                            {sharableModules.map(module => (
                                <div key={module.id} className="context-sharing-item">
                                    <label htmlFor={`share-${module.id}`}>{module.name}</label>
                                    <input
                                        type="checkbox"
                                        id={`share-${module.id}`}
                                        checked={!!settings.shareContextWithAI[module.id]}
                                        onChange={() => handleContextShareToggle(module.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                 <div className="settings-section">
                    <h3>Notifications</h3>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Célébrer la complétion des rituels</label>
                             <p>Affiche un message de félicitations lorsque tous les rituels du jour sont terminés.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.celebrateRitualCompletion ? 'active' : ''}`} onClick={() => updateSetting('celebrateRitualCompletion', true)}>Oui</button>
                                <button className={`radio-button ${!settings.celebrateRitualCompletion ? 'active' : ''}`} onClick={() => updateSetting('celebrateRitualCompletion', false)}>Non</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="settings-section">
                    <h3>Tableau de Bord</h3>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher le "Prompt du Jour"</label>
                             <p>Suggère une question d'écriture chaque jour.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.dailyPrompt ? 'active' : ''}`} onClick={() => handleWidgetToggle('dailyPrompt')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.dailyPrompt ? 'active' : ''}`} onClick={() => handleWidgetToggle('dailyPrompt')}>Non</button>
                            </div>
                        </div>
                    </div>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher la carte "Flashback"</label>
                             <p>Affiche un souvenir de vos anciennes entrées de journal.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.flashback ? 'active' : ''}`} onClick={() => handleWidgetToggle('flashback')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.flashback ? 'active' : ''}`} onClick={() => handleWidgetToggle('flashback')}>Non</button>
                            </div>
                        </div>
                    </div>
                     <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher la carte "Votre Rythme"</label>
                             <p>Affiche un conseil quotidien basé sur votre chronotype.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.rhythm ? 'active' : ''}`} onClick={() => handleWidgetToggle('rhythm')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.rhythm ? 'active' : ''}`} onClick={() => handleWidgetToggle('rhythm')}>Non</button>
                            </div>
                        </div>
                    </div>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher le suivi d'humeur</label>
                             <p>Affiche un graphique de vos humeurs des 7 derniers jours.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.moodTracker ? 'active' : ''}`} onClick={() => handleWidgetToggle('moodTracker')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.moodTracker ? 'active' : ''}`} onClick={() => handleWidgetToggle('moodTracker')}>Non</button>
                            </div>
                        </div>
                    </div>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher le Nuage d'Émotions</label>
                             <p>Affiche les émotions les plus fréquentes de vos analyses de journal.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.emotionCloud ? 'active' : ''}`} onClick={() => handleWidgetToggle('emotionCloud')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.emotionCloud ? 'active' : ''}`} onClick={() => handleWidgetToggle('emotionCloud')}>Non</button>
                            </div>
                        </div>
                    </div>
                    <div className="setting-item">
                        <div className="setting-item-content">
                            <label>Afficher la Note de Gratitude</label>
                            <p>Ajoutez rapidement des gratitudes depuis le tableau de bord.</p>
                        </div>
                        <div className="setting-item-control">
                             <div className="radio-group">
                                <button className={`radio-button ${settings.dashboardWidgets.quickGratitude ? 'active' : ''}`} onClick={() => handleWidgetToggle('quickGratitude')}>Oui</button>
                                <button className={`radio-button ${!settings.dashboardWidgets.quickGratitude ? 'active' : ''}`} onClick={() => handleWidgetToggle('quickGratitude')}>Non</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Gestion des données</h3>
                     <p>Sauvegardez vos données sur votre appareil ou restaurez une sauvegarde précédente. L'importation remplacera toutes les données existantes.</p>
                     <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                         <button onClick={handleExportData} className="button-secondary">
                            Exporter les Données
                        </button>
                        <button onClick={handleImportClick} className="button-secondary">
                            Importer les Données
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <hr style={{border: 'none', borderBottom: '1px solid var(--color-border)', margin: '2rem 0'}} />
                    <p>
                        Supprimez toutes les données stockées par l'application dans votre navigateur. 
                        Cette action ne peut pas être annulée.
                    </p>
                    <button onClick={handleClearData} className="button-destructive">
                        Effacer toutes mes données
                    </button>
                </div>
            </div>
        </div>
    );
};