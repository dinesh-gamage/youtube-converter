import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import toast from 'react-hot-toast';
import Settings from '../components/Settings';
import { useSettingsStore } from '../store/settingsStore';

const SettingsPage = () => {
    const { settings, updateSettings } = useSettingsStore();
    const handleSelectFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected && typeof selected === 'string') {
                const updatedSettings = { ...settings, download_folder: selected };
                updateSettings(updatedSettings);

                // Save to backend
                await invoke('set_download_folder', { path: selected });
                toast.success('Download folder updated');
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            toast.error('Failed to select folder');
        }
    };

    const handleUpdateSettings = async (newSettings: typeof settings) => {
        updateSettings(newSettings);

        try {
            // Save settings to backend
            await invoke('save_settings', { settings: newSettings });
            toast.success('Settings saved');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Configure your download preferences and folder location
                </p>
            </div>

            <Settings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onSelectFolder={handleSelectFolder}
            />
        </div>
    );
};

export default SettingsPage;