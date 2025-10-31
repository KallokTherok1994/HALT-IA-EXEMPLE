import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../types';

interface ToastContextType {
    toasts: ToastMessage[];
    showToast: (message: string, type?: 'success' | 'destructive' | 'info') => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'destructive' | 'info' = 'info') => {
        const id = Date.now().toString() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

// Hook for components that need to trigger a toast
export const useToast = (): { showToast: (message: string, type?: 'success' | 'destructive' | 'info') => void; } => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return { showToast: context.showToast };
};

// Hook for the ToastContainer to manage the toasts
export const useToastManager = (): { toasts: ToastMessage[]; removeToast: (id: string) => void; } => {
     const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastManager must be used within a ToastProvider');
    }
    return { toasts: context.toasts, removeToast: context.removeToast };
}