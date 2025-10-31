import React from 'react';
import { ChevronRightIcon } from '../../icons';

interface BreadcrumbsProps {
    moduleName: string | null;
    onBack: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ moduleName, onBack }) => {
    if (!moduleName) {
        return null; // Don't show breadcrumbs on the dashboard
    }

    const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        onBack();
    };

    return (
        <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
                <li>
                    <a href="#" onClick={handleBackClick}>
                        Tableau de bord
                    </a>
                </li>
                {moduleName && (
                    <li>
                        <ChevronRightIcon />
                        <span aria-current="page">{moduleName}</span>
                    </li>
                )}
            </ol>
        </nav>
    );
};
