'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
    className?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, className = '' }) => {
    return (
        <label className={`flex items-center gap-2 cursor-pointer group ${className}`}>
            <div
                onClick={(e) => {
                    e.preventDefault();
                    onChange(!checked);
                }}
                className={`
                    w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                    ${checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover:border-emerald-200'}
                `}
            >
                {checked && <Check size={14} className="text-white stroke-[4]" />}
            </div>
            {label && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">
                    {label}
                </span>
            )}
        </label>
    );
};

export default Checkbox;
