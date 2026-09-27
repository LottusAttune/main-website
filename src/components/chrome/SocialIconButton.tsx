'use client';

import { useState } from 'react';

import type { ReactNode } from 'react';

import styles from './SiteFooter.module.css';

type Props = {
  label: string;
  /** The real handle, once confirmed - renders as an actual link instead of
   *  the "Coming soon" placeholder below. */
  href?: string;
  children: ReactNode;
};

/**
 * Handles not yet confirmed (see CLAUDE.md's "Still open" list) would send
 * someone straight to that platform's own "page not found" if linked for
 * real - a button with a quiet "Coming soon" instead keeps the click
 * on-site and honest about the state, until `href` is supplied.
 *
 * Takes the icon as `children` (already rendered by the server-component
 * caller) rather than a component reference - a function can't cross the
 * server/client boundary as a prop, but rendered JSX can.
 */
export function SocialIconButton({ label, href, children }: Props) {
  const [shown, setShown] = useState(false);

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={styles.socialIcon}>
        {children}
      </a>
    );
  }

  return (
    <span className={styles.socialWrap}>
      <button
        type="button"
        aria-label={`${label} - coming soon`}
        className={styles.socialIcon}
        onClick={() => setShown(true)}
        onBlur={() => setShown(false)}
        onMouseLeave={() => setShown(false)}
      >
        {children}
      </button>
      <span className={styles.socialTooltip} role="status" hidden={!shown}>
        Coming soon
      </span>
    </span>
  );
}
