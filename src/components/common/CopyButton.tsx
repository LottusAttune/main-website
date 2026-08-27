'use client';

import { useState } from 'react';

type Props = {
  value: string;
  label: string;
  className?: string;
};

/**
 * A `mailto:` link leaves visitors without a default mail app stuck picking
 * one from an OS chooser dialog - copying the address to the clipboard works
 * everywhere without that detour.
 */
export function CopyButton({ value, label, className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable - nothing more to do.
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {copied ? 'Copied!' : label}
    </button>
  );
}
