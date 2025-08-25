import { create } from 'zustand';
import { Item } from '../types';

interface PlaylistState {
    items: Item[];
    loading: boolean;
    currentUrl: string;
    setItems: (items: Item[]) => void;
    setLoading: (loading: boolean) => void;
    setCurrentUrl: (url: string) => void;
    clearPlaylist: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
    items: [],
    loading: false,
    currentUrl: '',
    setItems: (items) => set({ items }),
    setLoading: (loading) => set({ loading }),
    setCurrentUrl: (url) => set({ currentUrl: url }),
    clearPlaylist: () => set({ items: [], currentUrl: '' }),
}));