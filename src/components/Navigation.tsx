import { Link, useLocation } from 'react-router-dom';
import { Home, Download, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/downloads', label: 'Downloads', icon: Download },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            YouTube to MP3
                        </h1>

                        <div className="flex space-x-4">
                            {navItems.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        location.pathname === path
                                            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;