'use client';

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useI18n } from '@/lib/i18n/context';
import { LanguageCode } from '@/lib/i18n/config';

export function LanguageSelector() {
  const { language, setLanguage, availableLanguages } = useI18n();

  const handleLanguageChange = async (langCode: LanguageCode) => {
    try {
      await setLanguage(langCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguage = availableLanguages[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label={`Current language: ${currentLanguage.name}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="start"
        aria-label="Select language"
      >
        {Object.entries(availableLanguages).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as LanguageCode)}
            className="flex items-center gap-2 cursor-pointer"
            aria-label={`Select ${lang.name} language`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="flex-1">{lang.name}</span>
            {code === language && (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for smaller spaces
export function LanguageSelectorCompact() {
  const { language, setLanguage, availableLanguages } = useI18n();

  const handleLanguageChange = async (langCode: LanguageCode) => {
    try {
      await setLanguage(langCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguage = availableLanguages[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Current language: ${currentLanguage.name}`}
        >
          <span className="text-lg">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        align="end"
        aria-label="Select language"
      >
        {Object.entries(availableLanguages).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as LanguageCode)}
            className="flex items-center gap-2 cursor-pointer"
            aria-label={`Select ${lang.name} language`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="flex-1 text-sm">{lang.name}</span>
            {code === language && (
              <Check className="h-3 w-3" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
