// Global type declarations for Rekapu extension

declare global {
  interface Window {
    rekapuSubmit: () => void;
    rekapuSkip: () => void;
  }
}

export {}; 