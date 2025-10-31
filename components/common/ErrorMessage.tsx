import React from 'react';

interface ErrorMessageProps {
    message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    return (
        <div className="error-message">
            <p><strong>Erreur:</strong> {message}</p>
        </div>
    );
};