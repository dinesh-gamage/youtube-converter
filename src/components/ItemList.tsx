import React, { useState } from 'react';
import { Play, Clock, Plus } from 'lucide-react';
import { Item } from '../types';

interface ItemListProps {
    items: Item[];
    onAddToQueue: (items: Item[]) => void;
}

const ItemList: React.FC<ItemListProps> = ({ items, onAddToQueue }) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(new Set(items.map(item => item.id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleItemSelect = (itemId: string, checked: boolean) => {
        const newSelection = new Set(selectedItems);
        if (checked) {
            newSelection.add(itemId);
        } else {
            newSelection.delete(itemId);
        }
        setSelectedItems(newSelection);
    };

    const handleRowClick = (itemId: string) => {
        handleItemSelect(itemId, !selectedItems.has(itemId));
    };

    const handleAddSelected = () => {
        const selected = items.filter(item => selectedItems.has(item.id));
        if (selected.length > 0) {
            onAddToQueue(selected);
            setSelectedItems(new Set());
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === items.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    Select All ({items.length})
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={handleAddSelected}
                            disabled={selectedItems.size === 0}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={16} />
                            <span>Add To Downloads ({selectedItems.size})</span>
                        </button>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                            onClick={() => handleRowClick(item.id)}
                        >
                            <div className="flex items-center space-x-4">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => { }} // Controlled by row click
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                                />

                                <div className="text-sm text-gray-500 dark:text-gray-400 w-8">
                                    {index + 1}
                                </div>

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
                                    <div className="relative group">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate text-left"
                                            title={item.title}>
                                            {item.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1">
                                        {item.duration && (
                                            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock size={12} />
                                                <span>{item.duration || 'Unknown'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ItemList;