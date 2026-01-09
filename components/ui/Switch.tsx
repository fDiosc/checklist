'use client';

import React from 'react';

interface SwitchProps {
    className?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className = '' }) => {
    return (
        <label className={`flex items-center gap-4 cursor-pointer group ${className}`}>
            <div
                className={`
                    relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out
                    ${checked ? 'bg-primary' : 'bg-slate-200'}
                `}
                onClick={() => onChange(!checked)}
            >
                <div
                    className={`
                        absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm
                        ${checked ? 'translate-x-6' : 'translate-x-0'}
                    `}
                />
            </div>
            {label && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">
                    {label}
                </span>
            )}
        </label>
    );
};

export default Switch;
