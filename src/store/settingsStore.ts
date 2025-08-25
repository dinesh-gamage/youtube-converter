import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { Settings } from '../types';

interface SettingsStore {
    settings: Settings;
    updateSettings: (settings: Settings) => void;
    loadSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
    download_folder: './downloads',
    parallel_downloads: 1,
};

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateSettings: (settings: Settings) => {
                set({ settings });
            },

            loadSettings: async () => {
                try {
                    const backendSettings = await invoke<Settings>('get_settings');
                    set({ settings: { ...defaultSettings, ...backendSettings } });
                } catch (error) {
                    console.error('Error loading settings from backend:', error);
                    // Use default settings if backend fails
                    set({ settings: defaultSettings });
                }
            },
        }),
        {
            name: 'youtube-to-mp3-settings',
            partialize: (state) => ({ settings: state.settings }),
        }
    )
);