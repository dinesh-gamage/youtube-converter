import { useEffect } from 'react';
import { useQueueStore } from '../store/queueStore';

export const useQueue = () => {
    const store = useQueueStore();

    // Load persisted queue on mount and setup auto-save
    useEffect(() => {
        // Load persisted data
        store.loadPersistedQueue();

        // Auto-save when items change
        const saveQueue = () => {
            store.saveQueue();
        };

        // Debounce saves to avoid too frequent updates
        const timeoutId = setTimeout(saveQueue, 1000);
        return () => clearTimeout(timeoutId);
    }, [store.items]);

    return store;
};