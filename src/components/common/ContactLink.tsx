'use client';

import { useState, type ReactNode } from 'react';

type Props = {
  /** What a tap opens on a phone: a `mailto:` or WhatsApp link. */
  href: string;
  /** What a click copies on a computer. */
  value: string;
  children: ReactNode;
  /** Open `href` in a new tab (WhatsApp), not in place (mail). */
  external?: boolean;
};

/**
 * One link that suits both kinds of device. On a phone, tapping follows the
 * link (mail app or WhatsApp). On a computer, where a `mailto:` or WhatsApp
 * link often opens nothing useful, clicking copies the address or number to
 * the clipboard and says so - the same idea as the home page's "Email us".
 */
export function ContactLink({ href, value, children, external = false }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Phones and tablets: let the link do its normal job.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: fall back to opening the link.
      window.open(href, external ? '_blank' : '_self');
    }
  };

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
      {copied ? <span role="status"> (copied)</span> : null}
    </>
  );
}
