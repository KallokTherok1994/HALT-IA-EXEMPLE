import React from 'react';
import { Connection } from '../../types';
import { LinkIcon } from '../../icons';
import { useAppContext } from '../../contexts/AppContext';

interface ConnectionsDisplayProps {
    connections: Connection[] | undefined;
}

export const ConnectionsDisplay: React.FC<ConnectionsDisplayProps> = ({ connections }) => {
    const { navigateTo } = useAppContext();

    if (!connections || connections.length === 0) {
        return null;
    }

    const handleConnectionClick = (connection: Connection) => {
        navigateTo(connection.moduleId, connection.entryId);
    };

    return (
        <div className="connections-display-section">
            <div className="connections-header">
                <LinkIcon />
                <h4>Connexions</h4>
            </div>
            <ul className="connections-list">
                {connections.map((conn, index) => (
                    <li key={index} className="connection-item" onClick={() => handleConnectionClick(conn)}>
                        <span className="connection-title">{conn.entryTitle}</span>
                        <span className="connection-module">{conn.moduleId}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};