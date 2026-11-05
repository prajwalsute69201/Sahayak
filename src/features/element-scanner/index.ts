/**
 * Sahayak Element Scanner Feature Module (Slice 10)
 * Barrel export for interactive DOM detection, classification,
 * Shadow DOM badges, and scanner side-panel UI.
 */

export * from './types/element-scanner.types';
export * from './services/element-metadata.service';
export * from './services/element-classifier.service';
export * from './services/element-detector.service';
export * from './services/mutation-observer.service';
export * from './services/element-highlight.service';
export * from './services/scanner-client.service';
export * from './content/scanner-overlay';
export * from './content/scanner-controller';
export * from './hooks/useElementScanner';
export * from './components/ScannerControls';
export * from './components/ScanSummary';
export * from './components/ElementCard';
export * from './components/ElementList';
