import React, { useState, useMemo } from 'react';
import { Connection, ModuleId, ConnectableItem } from '../../types';
import { useConnections } from '../../hooks/useConnections';
import { Modal } from './Modal';
import { SearchIcon, LinkIcon, PlusIcon, XIcon, JournalIcon, ThoughtCourtIcon, GoalsIcon, UnsentLettersIcon, FearSettingIcon, BodyIcon, OracleIcon, DreamJournalIcon } from '../../icons';

interface ConnectionManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConnections: Connection[];
    onSave: (newConnections: Connection[]) => void;
    currentEntryIdentifier: { moduleId: ModuleId; id: string };
}

const getModuleIcon = (moduleId: ModuleId) => {
    const icons: { [key in ModuleId]?: React.FC<any> } = {
        'journal': JournalIcon,
        'thought-court': ThoughtCourtIcon,
        'goals': GoalsIcon,
        'unsent-letters': UnsentLettersIcon,
        'fear-setting': FearSettingIcon,
        'body-map': BodyIcon,
        'oracle': OracleIcon,
        'dream-journal': DreamJournalIcon,
    };
    return icons[moduleId] || LinkIcon;
};


export const ConnectionManagerModal: React.FC<ConnectionManagerModalProps> = ({
    isOpen,
    onClose,
    currentConnections,
    onSave,
    currentEntryIdentifier
}) => {
    const [connections, setConnections] = useState(currentConnections);
    const [searchTerm, setSearchTerm] = useState('');
    const { searchConnectableItems } = useConnections();
    
    const searchResults = useMemo(() => 
        searchConnectableItems(searchTerm, currentEntryIdentifier),
    [searchTerm, searchConnectableItems, currentEntryIdentifier]);

    const addConnection = (item: ConnectableItem) => {
        const newConnection: Connection = {
            moduleId: item.moduleId,
            entryId: item.id,
            entryTitle: item.title
        };
        if (!connections.some(c => c.entryId === newConnection.entryId)) {
            setConnections(prev => [...prev, newConnection]);
        }
    };

    const removeConnection = (entryId: string) => {
        setConnections(prev => prev.filter(c => c.entryId !== entryId));
    };
    
    const handleSave = () => {
        onSave(connections);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gérer les Connexions">
            <div className="connection-manager-modal">
                <div className="connection-search">
                    <SearchIcon />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Rechercher une entrée à lier..."
                    />
                </div>

                {searchTerm && (
                    <ul className="search-results-list">
                        {searchResults.length > 0 ? (
                            searchResults.map(item => {
                                const Icon = getModuleIcon(item.moduleId);
                                return (
                                    <li key={`${item.moduleId}-${item.id}`} className="connection-result-item" onClick={() => addConnection(item)}>
                                        <div className="connection-result-icon"><Icon /></div>
                                        <div className="connection-result-info">
                                            <strong>{item.title}</strong>
                                            <span>{item.snippet}</span>
                                        </div>
                                        <button className="button-icon"><PlusIcon /></button>
                                    </li>
                                );
                            })
                        ) : <li className="no-results">Aucun résultat trouvé.</li>}
                    </ul>
                )}
                
                <div className="current-connections-section">
                    <h4>Connexions Actuelles</h4>
                    {connections.length > 0 ? (
                         <ul className="current-connections-list">
                            {connections.map(conn => {
                                const Icon = getModuleIcon(conn.moduleId);
                                return (
                                    <li key={conn.entryId} className="current-connection-item">
                                        <div className="connection-result-icon"><Icon /></div>
                                        <div className="connection-result-info">
                                            <strong>{conn.entryTitle}</strong>
                                            <span>{conn.moduleId}</span>
                                        </div>
                                        <button className="button-icon destructive" onClick={() => removeConnection(conn.entryId)}><XIcon /></button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p>Aucune connexion pour le moment.</p>}
                </div>

                <div className="wizard-actions">
                    <button onClick={onClose} className="button-secondary">Annuler</button>
                    <button onClick={handleSave} className="button-primary">Enregistrer les connexions</button>
                </div>
            </div>
        </Modal>
    );
};