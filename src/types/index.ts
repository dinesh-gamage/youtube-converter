export interface Item {
    id: string;
    title: string;
    duration?: string;
    thumbnail?: string;
    url: string;
}

export type DownloadStatus = 'pending' | 'selected' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface QueueItem extends Item {
    status: DownloadStatus;
    progress: number;
    eta?: string;
    speed?: string;
    error?: string;
    addedAt: number;
    downloadPath?: string;
}

export interface ProgressEvent {
    id: string;
    status: DownloadStatus;
    progress: number;
    eta?: string;
    speed?: string;
    error?: string;
}

export interface Settings {
    download_folder: string;
    parallel_downloads: number;
}