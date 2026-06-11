import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all p-6 relative`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pr-6">{title}</h3>

                <div className="text-gray-600 dark:text-gray-300">
                    {children}
                </div>

                {footer && (
                    <div className="mt-6 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
