'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { asset } from '@/lib/images';
import { NAV_LINKS, NAV_SECTIONS, SITE } from '@/lib/site';
import styles from './SiteNav.module.css';

type Props = {
  /** Prefix for the nav links. The /v1 backup passes "/v1" so it stays inside
   *  itself rather than sending the reader to the live site. */
  basePath?: string;
};

export function SiteNav({ basePath = '' }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click or Escape - the panel now opens at every
  // breakpoint (it used to be a mobile-only fallback for the plain links),
  // so it needs the same click-away behaviour a menu that size implies.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const logo = asset('logo-circle');

  return (
    <header ref={wrapRef} className={styles.wrap}>
      <div className={styles.pill}>
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
          <Link
            href="/book"
            className={`btn btn--dark ${styles.actionPill} ${styles.actionPillDark}`}
          >
            Book
          </Link>
          <Link
            href="/gift"
            className={`btn btn--outline ${styles.actionPill} ${styles.actionPillNeutral}`}
          >
            Gift
          </Link>
          <button
            type="button"
            className={styles.burger}
            aria-label="Browse sections"
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
          <div className={styles.panelGroups}>
            {NAV_SECTIONS.map((group) => {
              const groupHref =
                group.href === '/' ? basePath || '/' : `${basePath}${group.href}`;
              return (
                <div key={group.href} className={styles.panelGroup}>
                  <Link href={groupHref} className={styles.panelGroupTitle}>
                    {group.label}
                  </Link>
                  {group.sections.map((section) => (
                    <Link
                      key={section.hash}
                      href={`${groupHref}${section.hash}`}
                      className={styles.panelSectionLink}
                    >
                      {section.label}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
