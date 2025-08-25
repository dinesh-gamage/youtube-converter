import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import Queue from '../components/Queue';
import { useQueueStore } from '../store/queueStore';
import { useProgress } from '../hooks/useProgress';

const Downloads = () => {
    const {
        items,
        removeItem,
        clearCompleted,
        startQueue,
        stopQueue,
        updateItemStatus,
        isProcessing,
        isStopping
    } = useQueueStore();

    useProgress();

    const handleClearPending = () => {
        // Remove only pending, error, and cancelled items
        const itemsToRemove = items.filter(item =>
            ['pending', 'error', 'cancelled'].includes(item.status)
        );
        itemsToRemove.forEach(item => removeItem(item.id));
    };

    const handleStartSelected = (selectedIds: string[]) => {
        // Reset selected items to pending status before starting
        selectedIds.forEach(id => {
            const item = items.find(item => item.id === id);
            if (item && ['error', 'cancelled'].includes(item.status)) {
                updateItemStatus(id, 'pending' as any);
            }
        });

        // Start the queue
        startQueue(selectedIds);
    };

    const handleOpenFile = async (path: string) => {
        try {
            await invoke('open_file', { path });
        } catch (error) {
            console.error('Failed to open file:', error);
            toast.error('Failed to open file: ' + (error as string));
        }
    };

    const handleOpenFolder = async (path: string) => {
        try {
            await invoke('open_folder', { path });
        } catch (error) {
            console.error('Failed to open folder:', error);
            toast.error('Failed to open folder: ' + (error as string));
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Download Queue
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Monitor your download progress and manage the queue
                </p>
            </div>

            <Queue
                items={items}
                onRemoveItem={removeItem}
                onRetryItem={() => { }} // No longer used
                onClearCompleted={clearCompleted}
                onClearPending={handleClearPending}
                onStartQueue={startQueue}
                onStopQueue={stopQueue}
                onStartSelected={handleStartSelected}
                onOpenFile={handleOpenFile}
                onOpenFolder={handleOpenFolder}
                isProcessing={isProcessing}
                isStopping={isStopping}
            />
        </div>
    );
};

export default Downloads;