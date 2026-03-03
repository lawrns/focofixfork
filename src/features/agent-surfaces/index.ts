/**
 * Agent Multi-Surface Execution Feature
 * Module 8: Agent Multi-Surface Execution
 *
 * Extends agent orchestration with typed execution surfaces.
 * Browser surface uses Puppeteer. API surface validates via egress-filter.
 */

export * from './types';
export * from './services/surface-registry';
export * from './services/browser-surface';
export * from './services/api-surface';
export * from './services/surface-dispatcher';
