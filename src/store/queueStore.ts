import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Item, QueueItem, ProgressEvent, DownloadStatus } from '../types';
import { useSettingsStore } from './settingsStore';
import toast from 'react-hot-toast';

interface QueueStore {
    items: QueueItem[];
    isProcessing: boolean;
    isStopping: boolean;
    saveTimeout?: NodeJS.Timeout;
    addItems: (items: Item[]) => void;
    removeItem: (id: string) => void;
    retryItem: (id: string) => void;
    clearCompleted: () => void;
    updateItemProgress: (event: ProgressEvent) => void;
    startQueue: (selectedIds: string[]) => Promise<void>;
    stopQueue: () => Promise<void>;
    setProcessing: (processing: boolean) => void;
    setStopping: (stopping: boolean) => void;
    loadPersistedQueue: () => void;
    saveQueue: () => void;
    updateItemStatus: (id: string, status: DownloadStatus) => void
}

const STORAGE_KEY = 'youtube-to-mp3-queue';

export const useQueueStore = create<QueueStore>((set, get) => ({
    items: [],
    isProcessing: false,
    isStopping: false,

    loadPersistedQueue: () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.items && Array.isArray(data.items)) {
                    // Reset any processing states on app restart
                    const items = data.items.map((item: QueueItem) => ({
                        ...item,
                        status: ['downloading', 'processing', 'pending'].includes(item.status) ? 'pending' : item.status,
                        progress: ['downloading', 'processing', 'pending'].includes(item.status) ? 0 : item.progress,
                        eta: undefined,
                        speed: undefined,
                    }));
                    set({ items });
                }
            }
        } catch (error) {
            console.error('Failed to load persisted queue:', error);
        }
    },

    saveQueue: () => {
        try {
            const { items } = get();
            const data = {
                items,
                timestamp: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save queue:', error);
        }
    },

    addItems: (items: Item[]) => {
        const currentItems = get().items;
        const newItems = items
            .filter(item => !currentItems.some(existing => existing.id === item.id))
            .map(item => ({
                ...item,
                status: 'pending' as const,
                progress: 0,
                addedAt: Date.now(),
            }));

        set(state => ({
            items: [...state.items, ...newItems]
        }));

        // Save to persistence
        setTimeout(() => get().saveQueue(), 0);
    },

    removeItem: (id: string) => {
        set(state => ({
            items: state.items.filter(item => item.id !== id)
        }));
        setTimeout(() => get().saveQueue(), 0);
    },

    retryItem: (id: string) => {
        set(state => ({
            items: state.items.map(item =>
                item.id === id
                    ? { ...item, status: 'pending', progress: 0, error: undefined, eta: undefined, speed: undefined }
                    : item
            )
        }));
        setTimeout(() => get().saveQueue(), 0);
    },

    clearCompleted: () => {
        set(state => ({
            items: state.items.filter(item => item.status !== 'completed')
        }));
        setTimeout(() => get().saveQueue(), 0);
    },

    updateItemProgress: (event: ProgressEvent) => {
        set(state => {
            const { settings } = useSettingsStore.getState();

            const updatedItems = state.items.map(item => {
                if (item.id === event.id) {
                    let downloadPath = item.downloadPath;

                    // Generate download path when status becomes completed
                    if (event.status === 'completed' && !downloadPath) {
                        const cleanTitle = item.title
                            .replace(/[<>:"/\\|?*]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        downloadPath = `${settings.download_folder}/${cleanTitle}.mp3`;
                    }

                    return {
                        ...item,
                        status: event.status,
                        progress: event.progress,
                        eta: event.eta,
                        speed: event.speed,
                        error: event.error,
                        downloadPath,
                    };
                }
                return item;
            });

            // Immediate save for critical status changes
            if (['completed', 'error', 'cancelled'].includes(event.status)) {
                setTimeout(() => {
                    try {
                        const data = {
                            items: updatedItems,
                            timestamp: Date.now(),
                        };
                        localStorage.setItem('youtube-to-mp3-queue', JSON.stringify(data));
                    } catch (error) {
                        console.error('Failed to save queue:', error);
                    }
                }, 0);
            }

            return { items: updatedItems };
        });

        // Debounced save for progress updates
        const { saveTimeout } = get();
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        const newTimeout = setTimeout(() => {
            get().saveQueue();
        }, 2000); // Save every 2 seconds during active downloads

        set({ saveTimeout: newTimeout });
    },

    setProcessing: (processing: boolean) => {
        set({ isProcessing: processing });
    },

    setStopping: (stopping: boolean) => {
        set({ isStopping: stopping });
    },

    startQueue: async (selectedIds: string[]) => {
        const { items, setProcessing } = get();
        const pendingItems = items.filter(item => selectedIds.includes(item.id));

        if (pendingItems.length === 0) {
            toast.error('No pending items to download');
            return;
        }

        setProcessing(true);

        try {
            const settings = useSettingsStore.getState().settings;

            // Start downloading items
            await invoke('start_downloads', {
                items: pendingItems.map(item => ({
                    id: item.id,
                    url: item.url,
                    title: item.title,
                })),
                settings: {
                    download_folder: settings.download_folder,
                    parallel_downloads: settings.parallel_downloads,
                }
            });

            toast.success(`Started downloading ${pendingItems.length} item(s)`);
        } catch (error) {
            console.error('Error starting downloads:', error);
            toast.error('Failed to start downloads');
            setProcessing(false);
        }
    },

    stopQueue: async () => {
        const { setStopping } = get();

        try {
            setStopping(true);
            await invoke('stop_downloads');
            toast.success('Stopping downloads...');
        } catch (error) {
            console.error('Error stopping downloads:', error);
            toast.error('Failed to stop downloads');
            setStopping(false);
        }
    },
    updateItemStatus: (id: string, status: DownloadStatus) => {
        set((state) => ({
            items: state.items.map(item =>
                item.id === id ? { ...item, status: status as DownloadStatus } : item
            )
        }));
    }
}));