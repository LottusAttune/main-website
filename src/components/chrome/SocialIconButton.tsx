'use client';

import { useState } from 'react';

import type { ReactNode } from 'react';

import styles from './SiteFooter.module.css';

type Props = {
  label: string;
  children: ReactNode;
};

/**
 * The handles behind these icons aren't live yet (see CLAUDE.md's "Still
 * open" list), so a real link here would send someone straight to that
 * platform's own "page not found" - a button with a quiet "Coming soon"
 * instead keeps the click on-site and honest about the state.
 *
 * Takes the icon as `children` (already rendered by the server-component
 * caller) rather than a component reference - a function can't cross the
 * server/client boundary as a prop, but rendered JSX can.
 */
export function SocialIconButton({ label, children }: Props) {
  const [shown, setShown] = useState(false);

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
