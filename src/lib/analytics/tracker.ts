import { PerformanceService } from '@/lib/services/performance';

export interface UserEvent {
  id: string;
  type: string;
  category: 'user_action' | 'navigation' | 'engagement' | 'conversion' | 'error' | 'performance';
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  page: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  userId?: string;
  userAgent: string;
  referrer?: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  screenSize: {
    width: number;
    height: number;
  };
  timezone: string;
  language: string;
  events: UserEvent[];
  performanceMetrics?: {
    averageLoadTime: number;
    averageInteractionTime: number;
    errorCount: number;
    conversionRate: number;
  };
}

export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of users to track
  anonymizeIp: boolean;
  trackPerformance: boolean;
  trackErrors: boolean;
  trackUserInteractions: boolean;
  trackPageViews: boolean;
  storageKey: string;
  maxStoredEvents: number;
  flushInterval: number; // milliseconds
}

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private config: AnalyticsConfig;
  private currentSession: SessionData | null = null;
  private eventQueue: UserEvent[] = [];
  private isInitialized = false;
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      enabled: true,
      sampleRate: 1.0, // Track all users by default
      anonymizeIp: true,
      trackPerformance: true,
      trackErrors: true,
      trackUserInteractions: true,
      trackPageViews: true,
      storageKey: 'foco_analytics',
      maxStoredEvents: 1000,
      flushInterval: 30000, // 30 seconds
    };
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  initialize(config?: Partial<AnalyticsConfig>): void {
    if (this.isInitialized) return;

    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Check if user should be tracked (sampling)
    if (!this.shouldTrackUser()) {
      console.log('Analytics tracking disabled for this user (sampling)');
      return;
    }

    this.isInitialized = true;

    // Start new session
    this.startSession();

    // Set up automatic flushing
    this.setupAutoFlush();

    // Load any queued events from storage
    this.loadQueuedEvents();

    // Set up tracking
    this.setupPageViewTracking();
    this.setupUserInteractionTracking();
    this.setupPerformanceTracking();
    this.setupErrorTracking();

    console.log('Analytics tracking initialized');
  }

  private shouldTrackUser(): boolean {
    if (!this.config.enabled) return false;

    // Check for do-not-track
    if (navigator.doNotTrack === '1') return false;

    // Apply sampling rate
    const userHash = this.getUserHash();
    return userHash <= this.config.sampleRate;
  }

  private getUserHash(): number {
    // Simple hash function for sampling
    const userId = localStorage.getItem('user_id') || 'anonymous';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private startSession(): void {
    const sessionId = this.generateSessionId();

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      pageViews: 0,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      deviceType: this.getDeviceType(),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      events: [],
    };

    // Track session start
    this.trackEvent('session_start', 'navigation', 'session', undefined);
  }

  endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    // Calculate performance metrics
    this.currentSession.performanceMetrics = this.calculateSessionMetrics();

    // Track session end
    this.trackEvent('session_end', 'navigation', 'end', undefined, this.currentSession.duration);

    // Save session data
    this.saveSessionData();

    this.currentSession = null;
  }

  private calculateSessionMetrics() {
    if (!this.currentSession) return undefined;

    const sessionEvents = this.currentSession.events;

    const loadTimes = sessionEvents
      .filter(e => e.type === 'performance' && e.action === 'page_load')
      .map(e => e.value || 0);

    const interactionTimes = sessionEvents
      .filter(e => e.category === 'user_action')
      .map(e => e.duration || 0);

    const errorCount = sessionEvents.filter(e => e.category === 'error').length;

    const conversions = sessionEvents.filter(e => e.category === 'conversion').length;
    const totalActions = sessionEvents.filter(e => e.category === 'user_action').length;
    const conversionRate = totalActions > 0 ? conversions / totalActions : 0;

    return {
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b) / loadTimes.length : 0,
      averageInteractionTime: interactionTimes.length > 0 ? interactionTimes.reduce((a, b) => a + b) / interactionTimes.length : 0,
      errorCount,
      conversionRate,
    };
  }

  private setupPageViewTracking(): void {
    if (!this.config.trackPageViews) return;

    // Track initial page view
    this.trackPageView(window.location.pathname);

    // Track navigation changes
    const handleNavigation = () => {
      this.trackPageView(window.location.pathname);
    };

    // Listen for navigation events (simplified)
    window.addEventListener('popstate', handleNavigation);

    // For SPA navigation, this would need to be integrated with the router
  }

  private setupUserInteractionTracking(): void {
    if (!this.config.trackUserInteractions) return;

    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementInfo = this.getElementInfo(target);

      this.trackEvent('click', 'user_action', elementInfo.tagName, undefined, undefined, {
        text: elementInfo.text,
        element: elementInfo,
        position: { x: event.clientX, y: event.clientY },
      });
    });

    // Track form interactions
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.trackEvent('form_focus', 'user_action', target.tagName, undefined, undefined, { id: target.id || (target as HTMLInputElement).name });
      }
    });

    // Track scrolling
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollDepth = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        this.trackEvent('scroll', 'engagement', 'page_scroll', scrollDepth);
      }, 100);
    });
  }

  private setupPerformanceTracking(): void {
    if (!this.config.trackPerformance) return;

    // Track performance metrics
    PerformanceService.trackPagePerformance(window.location.pathname);

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackEvent('lcp', 'performance', 'largest_contentful_paint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidValue = (entry as any).processingStart - entry.startTime;
          this.trackEvent('fid', 'performance', 'first_input_delay', fidValue);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.trackEvent('cls', 'performance', 'cumulative_layout_shift', (entry as any).value);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  private setupErrorTracking(): void {
    if (!this.config.trackErrors) return;

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', 'error', event.message, undefined, undefined, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', 'error', String(event.reason));
    });
  }

  private setupAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private getElementInfo(element: HTMLElement) {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim().substring(0, 50) || '';
    const id = element.id || '';
    const className = element.className || '';
    const role = element.getAttribute('role') || '';
    const ariaLabel = element.getAttribute('aria-label') || '';

    return {
      tagName,
      text,
      id,
      className,
      role,
      ariaLabel,
    };
  }

  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  trackEvent(
    action: string,
    category: UserEvent['category'],
    label?: string,
    value?: number,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isInitialized || !this.currentSession) return;

    const event: UserEvent = {
      id: this.generateEventId(),
      type: action,
      category,
      action,
      label,
      value,
      sessionId: this.currentSession.id,
      page: window.location.pathname,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    // Add to session
    this.currentSession.events.push(event);

    // Add to queue for flushing
    this.eventQueue.push(event);

    // Immediate flush for critical events
    if (category === 'error' || category === 'conversion') {
      this.flushEvents();
    }
  }

  trackPageView(page: string): void {
    if (!this.currentSession) return;

    this.currentSession.pageViews++;
    this.trackEvent('page_view', 'navigation', 'page_view', undefined, undefined, {
      page,
      title: document.title,
    });
  }

  trackUserAction(action: string, label?: string, value?: number, metadata?: Record<string, any>): void {
    this.trackEvent(action, 'user_action', label, value, undefined, metadata);
  }

  trackConversion(action: string, value?: number, metadata?: Record<string, any>): void {
    this.trackEvent(action, 'conversion', action, value, undefined, metadata);
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent('error', 'error', error.message, undefined, undefined, {
      stack: error.stack,
      ...context,
    });
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    // In a real implementation, this would send to analytics service
    console.log('Flushing analytics events:', eventsToFlush.length);

    // Store locally for now
    this.storeEventsLocally(eventsToFlush);

    // Send to backend (in production)
    if (process.env.NODE_ENV === 'production') {
      this.sendEventsToBackend(eventsToFlush);
    }
  }

  private storeEventsLocally(events: UserEvent[]): void {
    try {
      const stored = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
      const combined = [...stored, ...events];

      // Keep only recent events
      const recentEvents = combined.slice(-this.config.maxStoredEvents);

      localStorage.setItem(this.config.storageKey, JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to store analytics events locally:', error);
    }
  }

  private async sendEventsToBackend(events: UserEvent[]): Promise<void> {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.warn('Failed to send analytics events to backend:', error);
      // Re-queue events for next flush
      this.eventQueue.unshift(...events);
    }
  }

  private loadQueuedEvents(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
      this.eventQueue.push(...stored);
    } catch (error) {
      console.warn('Failed to load queued analytics events:', error);
    }
  }

  private saveSessionData(): void {
    if (!this.currentSession) return;

    try {
      const sessions = JSON.parse(localStorage.getItem('foco_sessions') || '[]');
      sessions.push(this.currentSession);

      // Keep only last 50 sessions
      if (sessions.length > 50) {
        sessions.splice(0, sessions.length - 50);
      }

      localStorage.setItem('foco_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save session data:', error);
    }
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  getAnalyticsData(): { sessions: SessionData[]; events: UserEvent[] } {
    try {
      const sessions = JSON.parse(localStorage.getItem('foco_sessions') || '[]');
      const events = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');

      return { sessions, events };
    } catch (error) {
      console.warn('Failed to get analytics data:', error);
      return { sessions: [], events: [] };
    }
  }

  clearAnalyticsData(): void {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem('foco_sessions');
    this.eventQueue = [];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.endSession();
    this.flushEvents();
  }
}

// Global error handler integration
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    AnalyticsTracker.getInstance().endSession();
  });
}
