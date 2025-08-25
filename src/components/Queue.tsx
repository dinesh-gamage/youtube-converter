import React, { useState } from 'react';
import { Trash2, Play, Square, CheckCircle, XCircle, Clock, AlertCircle, FolderOpen, Download } from 'lucide-react';
import { QueueItem } from '../types';
import ProgressBar from './ProgressBar';

interface QueueProps {
    items: QueueItem[];
    onRemoveItem: (id: string) => void;
    onRetryItem: (id: string) => void;
    onClearCompleted: () => void;
    onClearPending: () => void;
    onStartQueue: (selectedIds: string[]) => void;
    onStopQueue: () => void;
    onStartSelected: (selectedIds: string[]) => void;
    onOpenFile: (path: string) => void;
    onOpenFolder: (path: string) => void;
    isProcessing: boolean;
    isStopping: boolean;
}

const Queue: React.FC<QueueProps> = ({
    items,
    onRemoveItem,
    onClearCompleted,
    onClearPending,
    onStopQueue,
    onStartSelected,
    onOpenFile,
    onOpenFolder,
    isProcessing,
    isStopping
}) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Separate items into pending and completed
    const pendingItems = items.filter(item =>
        ['pending', 'downloading', 'processing', 'error', 'cancelled'].includes(item.status)
    );
    const completedItems = items.filter(item => item.status === 'completed');

    const errorItems = pendingItems.filter(item => ['error', 'cancelled'].includes(item.status)).length;
    const activelyDownloading = pendingItems.filter(item =>
        ['downloading', 'processing'].includes(item.status)
    ).length;
    const trulyPending = pendingItems.filter(item => item.status === 'pending').length;

    const canShowActions = !isProcessing && !isStopping;
    const selectableItems = pendingItems.filter(item =>
        ['pending', 'error', 'cancelled'].includes(item.status)
    );

    const handleSelectAll = () => {
        if (selectedItems.size === selectableItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(selectableItems.map(item => item.id)));
        }
    };

    const handleItemSelect = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleStartSelected = () => {
        onStartSelected(Array.from(selectedItems));
        setSelectedItems(new Set());
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Play size={48} className="mx-auto mb-4 opacity-50" />
                <p>No items in queue</p>
                <p className="text-sm mt-2">Add some videos from the Home page</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'error':
                return <XCircle size={16} className="text-red-500" />;
            case 'cancelled':
                return <AlertCircle size={16} className="text-yellow-500" />;
            case 'downloading':
            case 'processing':
                return <Clock size={16} className="text-blue-500 animate-pulse" />;
            default:
                return <Clock size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Queue Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total: </span>
                            <span className="font-medium text-gray-900 dark:text-white">{items.length}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Pending: </span>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{trulyPending}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Downloading: </span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{activelyDownloading}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Completed: </span>
                            <span className="font-medium text-green-600 dark:text-green-400">{completedItems.length}</span>
                        </div>
                        {errorItems > 0 && (
                            <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Failed: </span>
                                <span className="font-medium text-red-600 dark:text-red-400">{errorItems}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {isProcessing && !isStopping && (
                            <button
                                onClick={onStopQueue}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <Square size={16} />
                                <span>Stop Downloads</span>
                            </button>
                        )}

                        {isStopping && (
                            <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium">
                                <Clock size={16} className="animate-pulse" />
                                <span>Stopping...</span>
                            </div>
                        )}

                        {!isProcessing && !isStopping && selectedItems.size > 0 && (
                            <button
                                onClick={handleStartSelected}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <Download size={16} />
                                <span>Download Selected ({selectedItems.size})</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Pending Items */}
            {pendingItems.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <Clock size={20} className="mr-2" />
                            Pending Downloads ({pendingItems.length})
                        </h2>
                        <div className="flex items-center space-x-2">
                            {canShowActions && selectableItems.length > 0 && (
                                <>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                    >
                                        {selectedItems.size === selectableItems.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button
                                        onClick={onClearPending}
                                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        <span>Clear Pending</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {pendingItems.map((item) => (
                            <QueueItemCard
                                key={`pending-${item.id}`}
                                item={item}
                                onRemoveItem={onRemoveItem}
                                onOpenFile={onOpenFile}
                                onOpenFolder={onOpenFolder}
                                canShowActions={canShowActions}
                                getStatusIcon={getStatusIcon}
                                isSelectable={['pending', 'error', 'cancelled'].includes(item.status)}
                                isSelected={selectedItems.has(item.id)}
                                onSelect={() => handleItemSelect(item.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <CheckCircle size={20} className="mr-2 text-green-500" />
                            Completed Downloads ({completedItems.length})
                        </h2>
                        {canShowActions && (
                            <button
                                onClick={onClearCompleted}
                                className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                            >
                                <Trash2 size={14} />
                                <span>Clear Completed</span>
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {completedItems.map((item) => (
                            <QueueItemCard
                                key={`completed-${item.id}`}
                                item={item}
                                onRemoveItem={onRemoveItem}
                                onOpenFile={onOpenFile}
                                onOpenFolder={onOpenFolder}
                                canShowActions={canShowActions}
                                getStatusIcon={getStatusIcon}
                                isSelectable={false}
                                isSelected={false}
                                onSelect={() => { }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface QueueItemCardProps {
    item: QueueItem;
    onRemoveItem: (id: string) => void;
    onOpenFile: (path: string) => void;
    onOpenFolder: (path: string) => void;
    canShowActions: boolean;
    getStatusIcon: (status: string) => React.ReactNode;
    isSelectable: boolean;
    isSelected: boolean;
    onSelect: () => void;
}

const QueueItemCard: React.FC<QueueItemCardProps> = ({
    item,
    onRemoveItem,
    onOpenFile,
    onOpenFolder,
    canShowActions,
    getStatusIcon,
    isSelectable,
    isSelected,
    onSelect
}) => {
    const handleCardClick = (e: React.MouseEvent) => {
        // Only handle selection if the item is selectable and the click wasn't on an action button
        if (isSelectable && !(e.target as HTMLElement).closest('button')) {
            onSelect();
        }
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${isSelectable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''
                }`}
            onClick={handleCardClick}
        >
            <div className="flex items-start space-x-4">
                {isSelectable && canShowActions && (
                    <div className="flex-shrink-0 mt-1">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }} // Controlled by row click
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                )}

                <div className="flex-shrink-0">
                    {item.thumbnail ? (
                        <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-16 h-12 object-cover rounded"
                        />
                    ) : (
                        <div className="w-16 h-12 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                            <Play size={16} className="text-gray-400" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(item.status)}
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.title}
                        </h3>
                    </div>
                    <ProgressBar item={item} />
                </div>

                <div className="flex items-center space-x-2">
                    {/* Play and Open Folder buttons for completed items */}
                    {item.status === 'completed' && item.downloadPath && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFile(item.downloadPath!);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                title="Play file"
                            >
                                <Play size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFolder(item.downloadPath!);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Open folder"
                            >
                                <FolderOpen size={16} />
                            </button>
                        </>
                    )}

                    {(item.status === 'completed' || canShowActions) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveItem(item.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove from queue"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Queue;