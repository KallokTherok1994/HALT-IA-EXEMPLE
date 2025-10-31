import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UnsentLetter, UNSENT_LETTER_STORAGE_KEY, UnsentLetterAnalysis, Connection } from '../types';
import { analyzeUnsentLetter } from '../services/generative-ai';
import { useStorageState } from '../hooks/useStorageState';
import { ModuleHeader } from './common/ModuleHeader';
import { EmptyState } from './common/EmptyState';
import { AIInteraction } from './common/AIInteraction';
import { ErrorMessage } from './common/ErrorMessage';
import { PlusIcon, DeleteIcon, SaveIcon, AnalyzeIcon, MailIcon, SmileIcon, LightbulbIcon, HelpCircleIcon, LinkIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { ConnectionsDisplay } from './common/ConnectionsDisplay';
import { ConnectionManagerModal } from './common/ConnectionManager';
import { useSettings } from '../contexts/SettingsContext';


type ViewMode = 'list' | 'editor' | 'viewer';

const LetterEditor: React.FC<{
    letter: Partial<UnsentLetter> | null;
    onSave: (recipient: string, subject: string, content: string) => void;
    onBack: () => void;
}> = ({ letter, onSave, onBack }) => {
    const [recipient, setRecipient] = useState(letter?.recipient || '');
    const [subject, setSubject] = useState(letter?.subject || '');
    const [content, setContent] = useState(letter?.content || '');
    const { showToast } = useToast();
    
    const handleSave = () => {
        if (!recipient.trim() || !subject.trim() || !content.trim()) {
            showToast("Tous les champs sont requis.", "destructive");
            return;
        }
        onSave(recipient, subject, content);
    };

    return (
        <div className="unsent-letter-editor fade-in">
            <div className="letter-editor-disclaimer">
                Cet espace est privé. Cette lettre ne sera pas envoyée.
            </div>
            <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="Destinataire (Ex: Mon anxiété, Mon ancien moi...)"
                className="letter-editor-recipient"
                aria-label="Destinataire"
            />
            <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Sujet"
                className="letter-editor-subject"
                aria-label="Sujet"
            />
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Écrivez librement..."
                className="letter-editor-content"
                aria-label="Contenu de la lettre"
            />
            <div className="wizard-actions" style={{marginTop: 'auto', paddingTop: 'var(--spacing-md)'}}>
                <button onClick={onBack} className="button-secondary">Annuler</button>
                <button onClick={handleSave} className="button-primary"><SaveIcon /> Sceller la lettre</button>
            </div>
        </div>
    );
};

const LetterViewer: React.FC<{
    letter: UnsentLetter;
    onAnalyze: (id: string) => void;
    onUpdateConnections: (id: string, connections: Connection[]) => void;
}> = ({ letter, onAnalyze, onUpdateConnections }) => {
    const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
    
    const handleSaveConnections = (newConnections: Connection[]) => {
        onUpdateConnections(letter.id, newConnections);
        setIsConnectionManagerOpen(false);
    };

    return (
        <div className="unsent-letter-viewer fade-in">
            <div className="letter-view-container">
                <header className="letter-view-header">
                    <p className="recipient">À: {letter.recipient}</p>
                    <h2 className="subject">{letter.subject}</h2>
                    <p className="date">Écrit le {new Date(letter.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </header>
                <div className="letter-view-body">
                    {letter.content}
                </div>
                 <ConnectionsDisplay connections={letter.connections} />
                 <button className="button-secondary" onClick={() => setIsConnectionManagerOpen(true)} style={{marginTop: 'var(--spacing-sm)'}}>
                    <LinkIcon /> Gérer les connexions
                </button>
                {isConnectionManagerOpen && (
                    <ConnectionManagerModal
                        isOpen={isConnectionManagerOpen}
                        onClose={() => setIsConnectionManagerOpen(false)}
                        currentConnections={letter.connections || []}
                        onSave={handleSaveConnections}
                        currentEntryIdentifier={{ moduleId: 'unsent-letters', id: letter.id }}
                    />
                )}
                <footer className="letter-view-footer">
                    {letter.isAnalyzing && <AIInteraction messages={["Lecture de votre lettre avec empathie...", "Identification des émotions clés..."]} />}
                    {letter.analysisError && <ErrorMessage message="L'analyse a échoué." />}
                    {letter.analysis ? (
                         <div className="journal-analysis-section">
                            <div className="analysis-item">
                                <div className="icon"><SmileIcon /></div>
                                <div className="analysis-item-content">
                                    <strong>Émotions Clés</strong>
                                    <div className="analysis-pills">
                                        {letter.analysis.keyEmotions.map(e => <span key={e} className="analysis-pill">{e}</span>)}
                                    </div>
                                </div>
                            </div>
                             <div className="analysis-item">
                                <div className="icon"><LightbulbIcon /></div>
                                <div className="analysis-item-content">
                                    <strong>Besoins Révélés</strong>
                                    <div className="analysis-pills">
                                        {letter.analysis.unmetNeeds.map(n => <span key={n} className="analysis-pill">{n}</span>)}
                                    </div>
                                </div>
                            </div>
                             <div className="analysis-item">
                                <div className="icon"><HelpCircleIcon /></div>
                                <div className="analysis-item-content">
                                    <strong>Piste de Réflexion</strong>
                                    <p className="reflection-question">"{letter.analysis.reflectionPrompt}"</p>
                                </div>
                            </div>
                         </div>
                    ) : (
                        !letter.isAnalyzing && (
                            <button onClick={() => onAnalyze(letter.id)} className="button-primary" style={{marginTop: 'var(--spacing-md)'}}>
                                <AnalyzeIcon /> Analyser la lettre
                            </button>
                        )
                    )}
                </footer>
            </div>
        </div>
    );
};

export const UnsentLettersView: React.FC = () => {
    const [letters, setLetters] = useStorageState<UnsentLetter[]>(UNSENT_LETTER_STORAGE_KEY, []);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedLetter, setSelectedLetter] = useState<UnsentLetter | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    const sortedLetters = React.useMemo(() =>
        [...letters].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [letters]);

    const handleNew = () => {
        setSelectedLetter(null);
        setView('editor');
    };

    const handleSelect = (letter: UnsentLetter) => {
        setSelectedLetter(letter);
        setView('viewer');
    };

    const handleBackToList = () => {
        setSelectedLetter(null);
        setView('list');
    };

    const handleSave = (recipient: string, subject: string, content: string) => {
        if (selectedLetter) { // Editing existing
            const updatedLetter = { ...selectedLetter, recipient, subject, content, analysis: undefined };
            setLetters(prev => prev.map(l => l.id === selectedLetter.id ? updatedLetter : l));
            setSelectedLetter(updatedLetter); // Update selected to reflect change
            showToast("Lettre mise à jour.", "success");
        } else { // New letter
            const newLetter: UnsentLetter = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                recipient, subject, content
            };
            setLetters(prev => [newLetter, ...prev]);
             showToast("Lettre scellée.", "success");
        }
        setView('list');
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette lettre ?")) {
            setLetters(prev => prev.filter(l => l.id !== id));
            handleBackToList();
        }
    };
    
    const handleUpdateConnections = (letterId: string, connections: Connection[]) => {
        setLetters(prev => prev.map(l => l.id === letterId ? { ...l, connections, analysis: undefined } : l));
        if (selectedLetter?.id === letterId) {
            setSelectedLetter(prev => prev ? { ...prev, connections, analysis: undefined } : null);
        }
        showToast("Connexions mises à jour. L'analyse a été réinitialisée.", "success");
    };
    
    const handleAnalyze = async (id: string) => {
        const letterToAnalyze = letters.find(l => l.id === id);
        if (!letterToAnalyze) return;

        setLetters(prev => prev.map(l => l.id === id ? { ...l, isAnalyzing: true, analysisError: false } : l));
        setSelectedLetter(prev => prev && prev.id === id ? { ...prev, isAnalyzing: true, analysisError: false } : prev);

        try {
            const analysis = await analyzeUnsentLetter(
                letterToAnalyze.recipient, 
                letterToAnalyze.content,
                settings,
                letterToAnalyze.connections
            );
            setLetters(prev => prev.map(l => l.id === id ? { ...l, analysis, isAnalyzing: false } : l));
            setSelectedLetter(prev => prev && prev.id === id ? { ...prev, analysis, isAnalyzing: false } : prev);

        } catch (error) {
            console.error("Letter analysis failed", error);
            setLetters(prev => prev.map(l => l.id === id ? { ...l, isAnalyzing: false, analysisError: true } : l));
            setSelectedLetter(prev => prev && prev.id === id ? { ...prev, isAnalyzing: false, analysisError: true } : prev);
            showToast("L'analyse de la lettre a échoué. Veuillez réessayer.", "destructive");
        }
    };

    const renderContent = () => {
        switch (view) {
            case 'editor':
                return <LetterEditor letter={selectedLetter} onSave={handleSave} onBack={handleBackToList} />;
            case 'viewer':
                return selectedLetter && <LetterViewer letter={selectedLetter} onAnalyze={handleAnalyze} onUpdateConnections={handleUpdateConnections} />;
            case 'list':
            default:
                return (
                    sortedLetters.length === 0 ? (
                        <EmptyState
                            Icon={MailIcon}
                            title="Un espace pour vos mots non-dits"
                            message="Écrivez des lettres pour exprimer vos émotions sans filtre. Personne d'autre que vous ne les lira."
                            action={{ text: 'Écrire ma première lettre', onClick: handleNew }}
                        />
                    ) : (
                        <div className="unsent-letter-list stagger-fade-in">
                            {sortedLetters.map((letter, index) => (
                                <div 
                                    key={letter.id} 
                                    className="unsent-letter-card content-card" 
                                    onClick={() => handleSelect(letter)}
                                    style={{ '--stagger-index': index } as React.CSSProperties}
                                >
                                    <div className="letter-card-header">
                                        <h3>{letter.subject}</h3>
                                        <time>{new Date(letter.date).toLocaleDateString('fr-FR')}</time>
                                    </div>
                                    <p className="letter-card-recipient">À: {letter.recipient}</p>
                                    <p className="letter-card-content">"{letter.content.substring(0, 100)}..."</p>
                                </div>
                            ))}
                        </div>
                    )
                );
        }
    };
    
    return (
        <div className="module-view fade-in">
             <ModuleHeader 
                title={view === 'list' ? "Lettres non envoyées" : (selectedLetter?.subject || 'Nouvelle Lettre')}
            >
                {view === 'list' && <button onClick={handleNew} className="button-primary"><PlusIcon/> Nouvelle Lettre</button>}
                {view !== 'list' && <button onClick={handleBackToList} className="button-secondary">Retour à la liste</button>}
                {view === 'viewer' && selectedLetter && <button onClick={() => handleDelete(selectedLetter.id)} className="button-icon destructive"><DeleteIcon/></button>}
            </ModuleHeader>
            <div className="module-content">
                {renderContent()}
            </div>
        </div>
    );
};
