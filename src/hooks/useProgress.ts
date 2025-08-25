import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueueStore } from '../store/queueStore';
import { ProgressEvent } from '../types';

export const useProgress = () => {
    const { updateItemProgress, setProcessing, setStopping, loadPersistedQueue } = useQueueStore();
    const listenersSetup = useRef(false);

    useEffect(() => {
        // Load persisted queue on mount
        if (!listenersSetup.current) {
            loadPersistedQueue();
        }

        // Prevent duplicate listeners
        if (listenersSetup.current) {
            return;
        }

        let progressUnlisten: (() => void) | null = null;
        let stoppedUnlisten: (() => void) | null = null;
        let stoppingUnlisten: (() => void) | null = null;

        const setupListeners = async () => {
            try {
                // Listen for download progress events
                progressUnlisten = await listen<ProgressEvent>('download-progress', (event) => {
                    console.log('Progress event:', event.payload);
                    updateItemProgress(event.payload);
                });

                // Listen for downloads stopped event
                stoppedUnlisten = await listen('downloads-stopped', () => {
                    console.log('Downloads stopped');
                    setProcessing(false);
                    setStopping(false);
                });

                // Listen for downloads stopping event
                stoppingUnlisten = await listen('downloads-stopping', () => {
                    console.log('Downloads stopping...');
                    setStopping(true);
                });

                listenersSetup.current = true;
                console.log('Progress listeners setup complete');
            } catch (error) {
                console.error('Failed to setup progress listeners:', error);
            }
        };

        setupListeners();

        return () => {
            if (progressUnlisten) {
                progressUnlisten();
                progressUnlisten = null;
            }
            if (stoppedUnlisten) {
                stoppedUnlisten();
                stoppedUnlisten = null;
            }
            if (stoppingUnlisten) {
                stoppingUnlisten();
                stoppingUnlisten = null;
            }
            listenersSetup.current = false;
        };
    }, []); // Empty dependency array - only run once

    // Add visibility change handler to ensure we stay connected
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible - progress listeners should still be active');
                // Optionally refresh the queue state when tab becomes visible
                loadPersistedQueue();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadPersistedQueue]);
};