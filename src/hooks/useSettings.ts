import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export const useSettings = () => {
    const store = useSettingsStore();

    // Load settings from backend on mount
    useEffect(() => {
        store.loadSettings().catch(console.error);
    }, []);

    return store;
};