'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './BackToLanding.module.css';

/**
 * Shown at the top of the Book, Gift and Discovery call pages only when the
 * visitor arrived from an ad page. Steps back in history when the previous
 * page really is that ad page (so it reopens where they were reading);
 * otherwise it simply opens the ad page.
 */
export function BackToLanding({ href }: { href: string }) {
  const router = useRouter();

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('la-return') ?? 'null');
      if (stored?.href === href && stored?.target === window.location.pathname && window.history.length > 1) {
        event.preventDefault();
        router.back();
      }
    } catch {
      // Fall through to the plain link.
    }
  };

  return (
    <div className={styles.wrap}>
      <Link href={href} onClick={onClick} className={styles.link}>
        <span aria-hidden="true">←</span> Back
      </Link>
    </div>
  );
}
