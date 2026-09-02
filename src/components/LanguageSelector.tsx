import React, { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check, Globe } from 'lucide-react';
import { useTranslation, SupportedLanguage } from '../context/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, languages, currentLanguageOption, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      {/* Translate Header Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-[#18264A] border-[#FF9933] text-white shadow-[#FF9933]/20'
            : 'bg-[#0F1E3D] hover:bg-[#1A2D52] border-[#1E325C] hover:border-[#FF9933]/50 text-slate-200'
        }`}
        title="Translate Application Language (भाषा बदलें)"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <Languages size={15} className="text-[#FF9933]" />
          <span className="text-xs font-bold font-sans">
            {currentLanguageOption.nativeName}
          </span>
          {currentLanguage !== 'en' && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({currentLanguageOption.name})
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF9933]' : ''
          }`}
        />
      </button>

      {/* Language Selection Dropdown Menu - Highly visible, elevated solid overlay */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-76 bg-[#081022] border-2 border-[#1E325C] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
          aria-label="Select application language"
          style={{ isolation: 'isolate' }}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#060B18] border-b border-[#142344] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-[#FF9933]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 font-mono">
                {t('app.selectLanguage', 'Select Language')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono font-bold bg-[#0F1E3D] px-2 py-0.5 rounded border border-[#1A2D52]">12 Languages</span>
          </div>

          {/* Language Options List */}
          <div className="max-h-80 overflow-y-auto p-1.5 space-y-1 bg-[#081022] scrollbar-thin scrollbar-thumb-[#1E325C]">
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code as SupportedLanguage);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-[#122452] text-[#FF9933] font-bold border border-[#FF9933]/50 shadow-md'
                      : 'hover:bg-[#0E1A38] text-slate-300 hover:text-white border border-transparent'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{lang.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold tracking-tight">
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          • {lang.name}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">
                        {lang.region}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#FF9933]/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#FF9933]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-[#060B18] border-t border-[#142344] text-center">
            <p className="text-[10px] text-slate-400 font-mono">
              🇮🇳 National Multilingual Disaster Interface
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
