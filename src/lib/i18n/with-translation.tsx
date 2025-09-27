import React from 'react';
import { useTranslation } from './context';

interface WithTranslationProps {
  t?: (key: string, params?: Record<string, any>) => string;
  formatDate?: (date: Date | string | number, options?: any) => string;
  formatNumber?: (num: number, options?: any) => string;
  formatCurrency?: (amount: number, currency?: string) => string;
  formatRelativeTime?: (date: Date | string | number) => string;
}

/**
 * Higher-order component that injects translation functions into a component
 * @param WrappedComponent - The component to wrap
 * @returns Component with translation props injected
 */
export function withTranslation<P extends WithTranslationProps>(
  WrappedComponent: React.ComponentType<P>
) {
  const TranslatedComponent = (props: Omit<P, keyof WithTranslationProps>) => {
    const translationProps = useTranslation();

    return (
      <WrappedComponent
        {...(props as P)}
        {...translationProps}
      />
    );
  };

  TranslatedComponent.displayName = `withTranslation(${WrappedComponent.displayName || WrappedComponent.name})`;

  return TranslatedComponent;
}

/**
 * Hook for components that need translation utilities
 * @returns Translation utilities
 */
export function useComponentTranslation() {
  const { t, formatDate, formatNumber, formatCurrency, formatRelativeTime } = useTranslation();

  return {
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
  };
}

/**
 * Utility function to create translated components
 * @param componentFactory - Function that returns a component with translation props
 * @returns Translated component
 */
export function createTranslatedComponent<T extends WithTranslationProps>(
  componentFactory: (props: T) => React.ReactElement
) {
  return (props: Omit<T, keyof WithTranslationProps>) => {
    const translationProps = useTranslation();

    return componentFactory({
      ...props,
      ...translationProps,
    } as T);
  };
}

/**
 * Translation key type helper
 * @param key - Translation key
 * @returns The same key (for type safety)
 */
export function tKey(key: string): string {
  return key;
}

/**
 * Translation key with parameters type helper
 * @param key - Translation key
 * @param params - Parameters for interpolation
 * @returns The same key (for type safety)
 */
export function tKeyWithParams(key: string, params: Record<string, any>): string {
  return key;
}
