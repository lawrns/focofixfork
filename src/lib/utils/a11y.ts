/**
 * Accessibility Utilities
 * Helper functions for keyboard navigation, focus management, and ARIA attributes
 */

/**
 * Check if an element is currently visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false;

  // Check if element is hidden
  if (element.offsetParent === null) return false;

  // Check computed style
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  return true;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (!isElementVisible(element)) return false;

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return element.matches(focusableSelectors);
}

/**
 * Announce a message to screen readers using aria-live
 */
export function announceToScreenReader(
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get the accessible name of an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check for explicit label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label') || '';
  }

  // Check for aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      return labelElement.textContent || '';
    }
  }

  // Check for associated label (for form elements)
  if (element.id && element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent || '';
    }
  }

  // Check for text content
  if (element.textContent) {
    return element.textContent.trim();
  }

  // Check for title attribute
  if (element.getAttribute('title')) {
    return element.getAttribute('title') || '';
  }

  // Check for alt attribute (for images)
  if (element instanceof HTMLImageElement && element.alt) {
    return element.alt;
  }

  return '';
}

/**
 * Trap focus within a container
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  if (focusableElements.length === 0) {
    return () => {};
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check keyboard modifier keys
 */
export function getKeyModifiers(e: KeyboardEvent) {
  return {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };
}

/**
 * Check if a key combination matches (e.g., Ctrl+K, Cmd+K)
 */
export function isKeyCombination(
  e: KeyboardEvent,
  key: string,
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  }
): boolean {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

  return (
    e.key.toLowerCase() === key.toLowerCase() &&
    (modifiers.ctrl !== undefined ? ctrlOrCmd === modifiers.ctrl : true) &&
    (modifiers.shift !== undefined ? e.shiftKey === modifiers.shift : true) &&
    (modifiers.alt !== undefined ? e.altKey === modifiers.alt : true) &&
    (modifiers.meta !== undefined ? e.metaKey === modifiers.meta : true)
  );
}

/**
 * Navigate to next focusable element
 */
export function focusNextElement(
  currentElement: HTMLElement,
  container?: HTMLElement
): HTMLElement | null {
  const searchContainer = container || document.body;
  const focusableElements = Array.from(
    searchContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(currentElement);
  if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
    const nextElement = focusableElements[currentIndex + 1];
    nextElement.focus();
    return nextElement;
  }

  return null;
}

/**
 * Navigate to previous focusable element
 */
export function focusPreviousElement(
  currentElement: HTMLElement,
  container?: HTMLElement
): HTMLElement | null {
  const searchContainer = container || document.body;
  const focusableElements = Array.from(
    searchContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(currentElement);
  if (currentIndex > 0) {
    const prevElement = focusableElements[currentIndex - 1];
    prevElement.focus();
    return prevElement;
  }

  return null;
}

/**
 * Get visible text content from an element (useful for screen reader testing)
 */
export function getVisibleText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove hidden elements
  clone.querySelectorAll('[hidden], .sr-only, [aria-hidden="true"]').forEach((el) => {
    el.remove();
  });

  return clone.textContent?.trim() || '';
}

/**
 * Test if an element is a valid link
 */
export function isValidLink(element: HTMLElement): boolean {
  if (!(element instanceof HTMLAnchorElement)) return false;

  const href = element.getAttribute('href');
  return href !== null && href !== '' && href !== '#';
}

/**
 * Test if an element is a valid button
 */
export function isValidButton(element: HTMLElement): boolean {
  if (element instanceof HTMLButtonElement) {
    return !element.disabled;
  }

  if (element.hasAttribute('role') && element.getAttribute('role') === 'button') {
    return element.getAttribute('aria-disabled') !== 'true';
  }

  return false;
}
