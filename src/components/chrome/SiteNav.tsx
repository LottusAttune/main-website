'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { asset } from '@/lib/images';
import { NAV_LINKS, SITE } from '@/lib/site';
import styles from './SiteNav.module.css';

type Props = {
  /** Prefix for the nav links. The /v1 backup passes "/v1" so it stays inside
   *  itself rather than sending the reader to the live site. */
  basePath?: string;
};

export function SiteNav({ basePath = '' }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the disclosure when the viewport grows past the breakpoint, so it
  // cannot be left open behind the desktop layout.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(min-width: 1080px)');
    const close = () => setOpen(false);
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, [open]);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const logo = asset('logo-circle');

  return (
    <header className={`${styles.wrap} ${basePath ? styles.wrapPlain : ''}`}>
      <div className={`${styles.pill} ${basePath ? styles.pillNoOutline : ''}`}>
        <Link
          href={basePath || '/'}
          className={styles.brand}
          aria-label={`${SITE.name} home`}
        >
          <Image
            src={logo.src}
            alt=""
            width={58}
            height={58}
            className={styles.mark}
            priority
          />
          <span className={styles.lockup}>
            <span className={styles.wordmark}>LOTUS ATTUNE</span>
            <span className={styles.subMark}>Immersive Soma Sound · Toronto</span>
          </span>
        </Link>

        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const href = link.href === '/' ? basePath || '/' : `${basePath}${link.href}`;
            const active = pathname === href;
            return (
              <Link
                key={link.href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`${styles.link} ${active ? styles.linkActive : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <Link href="/book" className={`btn btn--dark ${styles.actionPill}`}>
            Book
          </Link>
          <Link href="/gift" className={`btn btn--outline ${styles.actionPill}`}>
            Gift
          </Link>
          <button
            type="button"
            className={styles.burger}
            aria-label="Menu"
            aria-expanded={open}
            // Only reference the panel while it is actually in the DOM.
            aria-controls={open ? 'nav-panel' : undefined}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open ? (
        <div id="nav-panel" className={styles.panel}>
          <div className={styles.panelList}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href === '/' ? basePath || '/' : `${basePath}${link.href}`}
                className={styles.panelLink}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
