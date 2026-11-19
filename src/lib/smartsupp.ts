export type SmartsuppFunction = {
  (...args: unknown[]): void;
  _?: unknown[][];
};

declare global {
  interface Window {
    _smartsupp?: {
      key?: string;
      [key: string]: unknown;
    };
    smartsupp?: SmartsuppFunction;
    openSmartsuppChat?: () => void;
  }
}

export function openSmartsuppChat(): void {
  if (typeof window !== 'undefined' && window.smartsupp) {
    try {
      window.smartsupp('chat:open');
    } catch {
      // Ignore if smartsupp is not fully initialized yet
    }
  }
}
