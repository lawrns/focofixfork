import { PerformanceService } from '@/lib/services/performance';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  page: string;
  userAgent: string;
  timestamp: number;
  url: string;
  referrer?: string;
  viewport?: {
    width: number;
    height: number;
  };
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  performanceMetrics?: {
    cls?: number;
    fid?: number;
    lcp?: number;
  };
  customData?: Record<string, any>;
}

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  type: 'javascript' | 'promise' | 'resource' | 'network' | 'react' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: ErrorContext;
  userImpact: 'none' | 'partial' | 'full' | 'data-loss';
  resolved: boolean;
  resolution?: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorEvent[] = [];
  private errorListeners: ((error: ErrorEvent) => void)[] = [];
  private isInitialized = false;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.setupGlobalErrorHandling();
    this.setupUnhandledRejectionHandling();
    this.setupResourceErrorHandling();
    this.setupNetworkErrorHandling();
    this.setupReactErrorHandling();

    console.log('Error tracking initialized');
  }

  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      const errorEvent = this.createErrorEvent({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: 'javascript',
        severity: this.determineSeverity(event.message),
      });

      this.trackError(errorEvent);
    });
  }

  private setupUnhandledRejectionHandling(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      const errorEvent = this.createErrorEvent({
        message,
        stack,
        type: 'promise',
        severity: 'high',
      });

      this.trackError(errorEvent);
    });
  }

  private setupResourceErrorHandling(): void {
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;

      // Check if it's a resource loading error
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const src = (target as any).src || (target as any).href;

        const errorEvent = this.createErrorEvent({
          message: `Failed to load resource: ${src}`,
          filename: src,
          type: 'resource',
          severity: 'medium',
        });

        this.trackError(errorEvent);
      }
    }, true); // Use capture phase
  }

  private setupNetworkErrorHandling(): void {
    // Intercept fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && response.status >= 500) {
          const errorEvent = this.createErrorEvent({
            message: `HTTP ${response.status}: ${response.statusText}`,
            type: 'network',
            severity: 'medium',
          });

          this.trackError(errorEvent);
        }
        return response;
      } catch (error) {
        const errorEvent = this.createErrorEvent({
          message: error instanceof Error ? error.message : 'Network request failed',
          stack: error instanceof Error ? error.stack : undefined,
          type: 'network',
          severity: 'high',
        });

        this.trackError(errorEvent);
        throw error;
      }
    };

    // Intercept XMLHttpRequest errors
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      this.addEventListener('error', () => {
        const errorEvent = ErrorTracker.getInstance().createErrorEvent({
          message: `XMLHttpRequest failed: ${url}`,
          type: 'network',
          severity: 'high',
        });

        ErrorTracker.getInstance().trackError(errorEvent);
      });

      return originalOpen.call(this, method, url, async, username, password);
    };
  }

  private setupReactErrorHandling(): void {
    // This would be set up in the React error boundary
    // For now, we'll provide a method to manually report React errors
  }

  private createErrorEvent(details: Partial<Omit<ErrorEvent, 'context'> & { context?: Partial<ErrorContext> }>): ErrorEvent {
    const defaultContext = this.createErrorContext();
    const context = details.context ? { ...defaultContext, ...details.context } : defaultContext;

    return {
      id: this.generateErrorId(),
      message: details.message || 'Unknown error',
      stack: details.stack,
      filename: details.filename,
      lineno: details.lineno,
      colno: details.colno,
      type: details.type || 'unknown',
      severity: details.severity || 'medium',
      context,
      userImpact: details.userImpact || 'none',
      resolved: false,
      occurrences: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };
  }

  private createErrorContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      networkInfo: this.getNetworkInfo(),
      memoryInfo: this.getMemoryInfo(),
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  private getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        return {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      }
    }
    return undefined;
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return undefined;
  }

  private getPerformanceMetrics() {
    // Get recent performance metrics from PerformanceMonitor
    // This would integrate with the performance monitoring system
    return {};
  }

  private determineSeverity(message: string): ErrorEvent['severity'] {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('chunk') || lowerMessage.includes('loading')) {
      return 'critical'; // App breaking errors
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'high'; // Network issues
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return 'medium'; // Auth issues
    }

    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'low'; // User input issues
    }

    return 'medium'; // Default
  }

  trackError(error: ErrorEvent): void {
    // Check if this is a duplicate error
    const existingError = this.errors.find(e =>
      e.message === error.message &&
      e.filename === error.filename &&
      e.lineno === error.lineno
    );

    if (existingError) {
      existingError.occurrences++;
      existingError.lastSeen = Date.now();
      error = existingError;
    } else {
      this.errors.push(error);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error tracked:', error);
    }

    // Send to error reporting service
    this.reportError(error);

    // Notify listeners
    this.errorListeners.forEach(listener => listener(error));

    // Track in performance service
    // PerformanceService.trackError(new Error(error.message), {
    //   type: error.type,
    //   severity: error.severity,
    //   userImpact: error.userImpact,
    //   context: error.context,
    // });
  }

  trackReactError(error: Error, errorInfo: any): void {
    const errorEvent = this.createErrorEvent({
      message: error.message,
      stack: error.stack,
      type: 'react',
      severity: 'high',
      context: {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        url: window.location.href,
      },
    });

    this.trackError(errorEvent);
  }

  trackCustomError(message: string, context?: Partial<ErrorContext>): void {
    const errorEvent = this.createErrorEvent({
      message,
      type: 'unknown',
      severity: 'medium',
      context: context ? context as ErrorContext : {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        url: window.location.href,
      },
    });

    this.trackError(errorEvent);
  }

  private reportError(error: ErrorEvent): void {
    // In a real implementation, this would send to a service like Sentry, LogRocket, etc.
    // For now, we'll store locally and could send to a backend endpoint

    try {
      // Store in localStorage for persistence
      const storedErrors = JSON.parse(localStorage.getItem('foco_errors') || '[]');
      storedErrors.push(error);

      // Keep only last 100 errors
      if (storedErrors.length > 100) {
        storedErrors.splice(0, storedErrors.length - 100);
      }

      localStorage.setItem('foco_errors', JSON.stringify(storedErrors));

      // In production, send to error reporting service
      if (process.env.NODE_ENV === 'production') {
        // Example: send to backend
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        }).catch(err => console.warn('Failed to report error:', err));
      }
    } catch (storageError) {
      console.warn('Failed to store error locally:', storageError);
    }
  }

  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  getErrorsBySeverity(severity: ErrorEvent['severity']): ErrorEvent[] {
    return this.errors.filter(error => error.severity === severity);
  }

  getErrorsByType(type: ErrorEvent['type']): ErrorEvent[] {
    return this.errors.filter(error => error.type === type);
  }

  markErrorResolved(errorId: string, resolution?: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;
    }
  }

  clearErrors(): void {
    this.errors = [];
    localStorage.removeItem('foco_errors');
  }

  addErrorListener(listener: (error: ErrorEvent) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: ErrorEvent) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export errors for debugging
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byUserImpact: {} as Record<string, number>,
      resolved: this.errors.filter(e => e.resolved).length,
      unresolved: this.errors.filter(e => !e.resolved).length,
    };

    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byUserImpact[error.userImpact] = (stats.byUserImpact[error.userImpact] || 0) + 1;
    });

    return stats;
  }
}
