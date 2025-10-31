import React, { useState, useCallback } from 'react';
import { generateWordTreeWords } from '../services/generative-ai';
import { useToast } from '../contexts/ToastContext';
import { LoadingIndicator } from './common/LoadingIndicator';
import { SparklesIcon, TreeIcon } from '../icons';

export const WordTreeView: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [inputValue, setInputValue] = useState('Paix');
    const [rootWord, setRootWord] = useState<string | null>(null);
    const [generatedWords, setGeneratedWords] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleGenerate = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return;
        
        setIsLoading(true);
        setGeneratedWords([]);
        setRootWord(inputValue.trim());
        try {
            const words = await generateWordTreeWords(inputValue.trim());
            // Ensure we have an even number for symmetrical layout
            if (words.length > 0 && words.length % 2 !== 0) {
                 words.pop();
            }
            setGeneratedWords(words);
        } catch (error) {
            console.error(error);
            showToast("La génération de l'arbre a échoué. Veuillez réessayer.", "destructive");
            setRootWord(null);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, showToast]);

    const leftBranches = generatedWords.slice(0, generatedWords.length / 2);
    const rightBranches = generatedWords.slice(generatedWords.length / 2);

    return (
        <div className="fade-in">
            <div className="word-tree-view">
                <div className="word-tree-input-area content-card">
                    <p>Entrez un mot pour le voir grandir en arbre. L'IA générera des branches de mots associés pour inspirer votre réflexion.</p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="input-with-button">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Entrez un mot..."
                            maxLength={20}
                            aria-label="Mot pour l'arbre"
                        />
                        <button type="submit" className="button-primary" disabled={isLoading || !inputValue.trim()}>
                           <SparklesIcon className={isLoading ? 'spinning' : ''}/> {isLoading ? '...' : 'Générer'}
                        </button>
                    </form>
                </div>

                <div className="word-tree-visual-container">
                    {isLoading && <LoadingIndicator />}
                    
                    {!isLoading && rootWord && generatedWords.length > 0 && (
                        <>
                            <div className="word-tree-branches">
                                <div className="branch-column left">
                                    {leftBranches.map((word, index) => (
                                        <div key={index} className="tree-branch" style={{ animationDelay: `${index * 0.15}s` }}>
                                            {word}
                                        </div>
                                    ))}
                                </div>
                                <div className="branch-column right">
                                     {rightBranches.map((word, index) => (
                                        <div key={index} className="tree-branch" style={{ animationDelay: `${(index + leftBranches.length) * 0.15}s` }}>
                                            {word}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="word-tree-root">{rootWord}</div>
                        </>
                    )}
                     
                     {!isLoading && !rootWord && (
                        <div className="empty-state">
                            <div className="empty-state-icon"><TreeIcon /></div>
                            <h3>Votre arbre attend sa racine</h3>
                             <p>Entrez un mot et cliquez sur "Générer" pour faire pousser votre arbre d'idées.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};