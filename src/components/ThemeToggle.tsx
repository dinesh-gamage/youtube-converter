import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
    const { theme, resolvedTheme, setTheme } = useTheme();

    const handleToggle = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun size={18} />;
            case 'dark':
                return <Moon size={18} />;
            case 'system':
                return <Monitor size={18} />;
            default:
                return <Sun size={18} />;
        }
    };

    const getTooltipText = () => {
        switch (theme) {
            case 'light':
                return 'Switch to dark mode';
            case 'dark':
                return 'Switch to system theme';
            case 'system':
                return `Switch to light mode (currently ${resolvedTheme})`;
            default:
                return 'Toggle theme';
        }
    };

    return (
        <button
            onClick={handleToggle}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={getTooltipText()}
            aria-label={getTooltipText()}
        >
            {getIcon()}
        </button>
    );
};

export default ThemeToggle;