import React from 'react';
import { Search, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UrlInputProps {
    url: string;
    onUrlChange: (value: string) => void;
    onUrlSubmit: (url: string) => Promise<void>;
    loading: boolean;
    showClear?: boolean;
    onClear?: () => void;
}

const UrlInput: React.FC<UrlInputProps> = ({ url, onUrlChange, onUrlSubmit, loading, showClear, onClear }) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!url.trim()) {
            toast.error('Please enter a YouTube URL');
            return;
        }

        // Basic YouTube URL validation
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/;
        if (!youtubeRegex.test(url)) {
            toast.error('Please enter a valid YouTube URL');
            return;
        }

        try {
            await onUrlSubmit(url.trim());
        } catch (error) {
            toast.error('Failed to fetch playlist');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="flex items-center space-x-4">
                <form onSubmit={handleSubmit} className="flex-1 relative">
                    <div className="relative">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => onUrlChange(e.target.value)}
                            placeholder="Paste YouTube URL (video, playlist, or mix)..."
                            className="w-full px-4 py-3 pr-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !url.trim()}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Search size={20} />
                            )}
                        </button>
                    </div>
                </form>

                {showClear && onClear && (
                    <button
                        onClick={onClear}
                        className="flex items-center space-x-2 px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
                    >
                        <Trash2 size={16} />
                        <span>Clear</span>
                    </button>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>Supports YouTube videos, playlists, and mixes</p>
            </div>
        </div>
    );
};

export default UrlInput;