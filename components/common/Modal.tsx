import React, { useEffect, useRef } from 'react';
import { XIcon } from '../../icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            modalRef.current?.focus(); // Focus the modal content for screen readers
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    // Basic focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTabKey = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };
            
            const currentModal = modalRef.current;
            currentModal.addEventListener('keydown', handleTabKey);

            return () => {
                currentModal?.removeEventListener('keydown', handleTabKey);
            };
        }
    }, [isOpen]);


    return (
        <div 
            className="modal-backdrop" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-title"
        >
            <div 
                className="modal-content content-card" 
                onClick={(e) => e.stopPropagation()} 
                ref={modalRef}
                tabIndex={-1}
                style={{outline: 'none'}}
            >
                <button type="button" onClick={onClose} className="button-icon" style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)' }} aria-label="Fermer">
                    <XIcon />
                </button>
                <h3 id="modal-title">{title}</h3>
                {children}
            </div>
        </div>
    );
};