import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import UrlInput from '../components/UrlInput';
import ItemList from '../components/ItemList';
import { useQueueStore } from '../store/queueStore';
import { usePlaylistStore } from '../store/playlistStore';
import { Item } from '../types';

const Home = () => {
    const {
        items,
        loading,
        setItems,
        setLoading,
        setCurrentUrl,
        clearPlaylist
    } = usePlaylistStore();

    const { addItems } = useQueueStore();
    const [url, setUrl] = useState('');

    const handleUrlSubmit = async (submittedUrl: string) => {
        setItems([]); // Clear the list before fetching new items
        setLoading(true);
        setCurrentUrl(submittedUrl);

        try {
            const fetchedItems = await invoke<Item[]>('fetch_playlist', { url: submittedUrl });
            setItems(fetchedItems);

            if (fetchedItems.length === 0) {
                toast.error('No items found in the playlist');
            } else if (fetchedItems.length === 1) {
                toast.success('Video loaded successfully');
            } else {
                toast.success(`${fetchedItems.length} items loaded from playlist`);
            }
        } catch (error) {
            console.error('Error fetching playlist:', error);
            toast.error('Failed to fetch playlist. Please check the URL and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToQueue = (selectedItems: Item[]) => {
        addItems(selectedItems);
        toast.success(`${selectedItems.length} item(s) added to queue`);
    };

    const handleClearAll = () => {
        clearPlaylist();
        setUrl('');
        setCurrentUrl('');
        toast.success('Cleared all');
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    YouTube to MP3 Converter
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Convert YouTube videos, playlists, and mixes to MP3 format
                </p>
            </div>

            <UrlInput
                url={url}
                onUrlChange={setUrl}
                onUrlSubmit={handleUrlSubmit}
                loading={loading}
                showClear={items.length > 0}
                onClear={handleClearAll}
            />

            {loading && (
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Fetching playlist items...</span>
                    </div>
                </div>
            )}

            <ItemList items={items} onAddToQueue={handleAddToQueue} />
        </div>
    );
};

export default Home;