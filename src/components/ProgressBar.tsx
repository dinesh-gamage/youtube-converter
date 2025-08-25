import React from 'react';
import { QueueItem } from '../types';

interface ProgressBarProps {
    item: QueueItem;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ item }) => {
    const getStatusText = () => {
        switch (item.status) {
            case 'pending':
                return 'Waiting to start...';
            case 'downloading':
                return `Downloading... ${Math.round(item.progress)}%`;
            case 'processing':
                return 'Processing audio...';
            case 'completed':
                return 'Download completed';
            case 'error':
                return `Error: ${item.error || 'Unknown error'}`;
            case 'cancelled':
                return 'Download cancelled';
            default:
                return 'Unknown status';
        }
    };

    const getProgressColor = () => {
        switch (item.status) {
            case 'downloading':
            case 'processing':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'cancelled':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-300';
        }
    };

    const getBackgroundColor = () => {
        switch (item.status) {
            case 'error':
                return 'bg-red-100 dark:bg-red-900/20';
            case 'cancelled':
                return 'bg-yellow-100 dark:bg-yellow-900/20';
            case 'completed':
                return 'bg-green-100 dark:bg-green-900/20';
            default:
                return 'bg-gray-200 dark:bg-gray-700';
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                    {getStatusText()}
                </span>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    {item.speed && (
                        <span>{item.speed}</span>
                    )}
                    {item.eta && (
                        <span>ETA {item.eta}</span>
                    )}
                </div>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden ${getBackgroundColor()}`}>
                <div
                    className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
                    style={{
                        width: `${Math.max(0, Math.min(100, item.progress))}%`,
                        transform: item.status === 'downloading' || item.status === 'processing'
                            ? 'scaleX(1)'
                            : 'scaleX(1)',
                        transformOrigin: 'left'
                    }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;