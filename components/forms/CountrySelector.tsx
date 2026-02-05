'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Globe } from 'lucide-react';
import { COUNTRY_LIST, CountryCode, DEFAULT_COUNTRY } from '@/lib/countries';

interface CountrySelectorProps {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
  disabled?: boolean;
  className?: string;
}

export default function CountrySelector({
  value,
  onChange,
  disabled = false,
  className = ''
}: CountrySelectorProps) {
  const t = useTranslations();
  
  const selectedCountry = COUNTRY_LIST.find(c => c.code === value) || COUNTRY_LIST.find(c => c.code === DEFAULT_COUNTRY);

  return (
    <div className={className}>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
        <Globe className="w-3 h-3" />
        {t('countries.label')}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as CountryCode)}
          disabled={disabled}
          className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {COUNTRY_LIST.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {t(`countries.${country.code}`)}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
          <span className="text-2xl">{selectedCountry?.flag}</span>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </div>
      </div>
      {value !== 'BR' && (
        <p className="text-xs text-amber-600 mt-2 px-1 font-medium">
          {t('countries.internationalNote')}
        </p>
      )}
    </div>
  );
}
