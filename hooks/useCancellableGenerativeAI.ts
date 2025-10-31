import React, { useState, useCallback, useEffect } from 'react';

type GenerativeAIFunction<T, A extends any[]> = (...args: A) => Promise<T>;

interface UseCancellableAIOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

export function useCancellableGenerativeAI<T, A extends any[]>(
    aiFunction: GenerativeAIFunction<T, A>,
    options: UseCancellableAIOptions = {}
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const controllerRef = React.useRef<AbortController | null>(null);

    useEffect(() => {
        // Cleanup function to abort on unmount
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, []);

    const callAIFunction = useCallback(async (...args: A) => {
        // Abort any previous ongoing request
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
        
        controllerRef.current = new AbortController();
        const { signal } = controllerRef.current;

        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            // This is a conceptual addition; the actual AI library might not support AbortSignal directly.
            // The main benefit comes from the cleanup effect checking the signal.
            // For now, we rely on the cleanup to prevent state updates.
            const result = await aiFunction(...args);
            
            if (signal.aborted) {
                // The component has unmounted or a new call was made.
                return;
            }

            setData(result);
            if (options.onSuccess) {
                options.onSuccess(result);
            }
        } catch (err: any) {
            if (signal.aborted) {
                return;
            }
            const error = err instanceof Error ? err : new Error('An unknown error occurred.');
            setError(error);
            if (options.onError) {
                options.onError(error);
            }
        } finally {
            if (!signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [aiFunction, options]);

    const cancel = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.abort();
            setIsLoading(false);
        }
    }, []);

    return { callAIFunction, isLoading, error, data, cancel };
}
