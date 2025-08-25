import React from 'react';
import { Folder, Save, Sun, Moon, Monitor } from 'lucide-react';
import { Settings as SettingsType } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsProps {
    settings: SettingsType;
    onUpdateSettings: (settings: SettingsType) => void;
    onSelectFolder: () => void;
}

const Settings: React.FC<SettingsProps> = ({
    settings,
    onUpdateSettings,
    onSelectFolder
}) => {
    const { theme, setTheme } = useTheme();

    const handleParallelToggle = () => {
        onUpdateSettings({
            ...settings,
            parallel_downloads: settings.parallel_downloads === 1 ? 3 : 1
        });
    };

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Appearance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                    <Sun className="text-blue-600 dark:text-blue-400" size={20} />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Appearance
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Theme
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {themeOptions.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${theme === value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="text-sm font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Folder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                    <Folder className="text-blue-600 dark:text-blue-400" size={20} />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Download Folder
                    </h3>
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border transition-colors">
                        <code className="text-sm text-gray-700 dark:text-gray-300">
                            {settings.download_folder}
                        </code>
                    </div>

                    <button
                        onClick={onSelectFolder}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Folder size={16} />
                        <span>Choose Folder</span>
                    </button>
                </div>
            </div>

            {/* Download Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                    <Save className="text-blue-600 dark:text-blue-400" size={20} />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Download Settings
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Parallel Downloads Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                                Parallel Downloads
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Download multiple files simultaneously (faster but uses more resources)
                            </p>
                        </div>

                        <button
                            onClick={handleParallelToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.parallel_downloads > 1
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.parallel_downloads > 1 ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current: {settings.parallel_downloads === 1 ? 'Sequential' : `${settings.parallel_downloads} parallel downloads`}
                    </div>
                </div>
            </div>

            {/* About */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    About
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p>YouTube to MP3 Converter built with Tauri and React</p>
                    <p>Requires yt-dlp and ffmpeg to be installed on your system</p>
                    <p>Downloads are saved as MP3 files with embedded thumbnails</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;