export {};

/** Shared ambient declaration for the Vimeo Player SDK global - declared once
    here so FilmFrame and HandpanVideo (each of which only needs a subset of
    these methods) don't each redeclare `Window.Vimeo` with a different
    shape, which TypeScript treats as a conflicting global augmentation. */
declare global {
  interface Window {
    Vimeo?: {
      Player: new (el: HTMLIFrameElement) => {
        on: (event: string, handler: () => void) => void;
        play: () => Promise<void>;
        pause: () => Promise<void>;
        setMuted: (muted: boolean) => Promise<boolean>;
        setVolume: (volume: number) => Promise<number>;
        setCurrentTime: (seconds: number) => Promise<number>;
      };
    };
  }
}
