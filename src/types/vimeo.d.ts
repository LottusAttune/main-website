export {};

/** Minimal shape of the bits of the Vimeo Player SDK the site uses, shared
 *  by every component that attaches a player to one of its own iframes. */
declare global {
  interface Window {
    Vimeo?: {
      Player: new (el: HTMLIFrameElement) => VimeoPlayer;
    };
  }

  interface VimeoPlayer {
    setMuted: (muted: boolean) => Promise<boolean>;
    setVolume: (volume: number) => Promise<number>;
    setCurrentTime: (seconds: number) => Promise<number>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    on?: (event: string, handler: () => void) => void;
  }
}
