import React from 'react';

interface EmptyStateProps {
    Icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
    message: string;
    action?: {
        text: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ Icon, title, message, action }) => {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <Icon />
            </div>
            <h3>{title}</h3>
            <p>{message}</p>
            {action && (
                <button onClick={action.onClick} className="button-primary">
                    {action.text}
                </button>
            )}
        </div>
    );
};
