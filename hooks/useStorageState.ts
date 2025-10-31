import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

export function useStorageState<T>(key: string, defaultValue: T): [T, (value: T | ((prevState: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        return storage.get(key, defaultValue);
    });

    useEffect(() => {
        storage.set(key, value);
    }, [key, value]);

    const updateValue = useCallback((newValue: T | ((prevState: T) => T)) => {
        setValue(newValue);
    }, []);

    return [value, updateValue];
}
