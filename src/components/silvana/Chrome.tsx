'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SILVANA_FOOTER, SILVANA_NAV } from '@/data/silvana';
import { asset } from '@/lib/images';
import { SITE } from '@/lib/site';
import { SocialIcons } from './SocialIcons';
import styles from './silvana.module.css';

export function SilvanaNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation, and if the viewport grows past the breakpoint, so the
  // panel can never be left hanging open behind the desktop layout.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(min-width: 861px)');
    const close = () => setOpen(false);
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, [open]);

  const mark = asset('logo-circle');

  return (
    <header className={styles.navWrap}>
      <div className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label={`${SITE.name} home`}>
          <Image
            src={mark.src}
            alt=""
            width={44}
            height={44}
            className={styles.brandMark}
            priority
          />
          <span className={styles.brandWord}>LOTUS ATTUNE</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Main navigation">
          {SILVANA_NAV.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`${styles.navLink} ${active ? styles.navLinkOn : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={styles.burger}
          aria-label={open ? 'Close menu' : 'Menu'}
          aria-expanded={open}
          aria-controls={open ? 'silvana-menu' : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={open ? styles.burgerBarTop : ''} />
          <span className={open ? styles.burgerBarMid : ''} />
          <span className={open ? styles.burgerBarBot : ''} />
        </button>
      </div>

      {open ? (
        <div id="silvana-menu" className={styles.menu}>
          {SILVANA_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`${styles.menuLink} ${
                pathname === link.href ? styles.menuLinkOn : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.menuActions}>
            <Link href="/book" className={styles.btn}>
              BOOK
            </Link>
            <Link href="/gift" className={styles.btn}>
              GIFT
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** BOOK / GIFT, the pair that closes almost every page in her deck. */
export function BookGift({ className }: { className?: string }) {
  return (
    <div className={`${styles.btnRow} ${className ?? ''}`}>
      <Link href="/book" className={styles.btn}>
        BOOK
      </Link>
      <Link href="/gift" className={styles.btn}>
        GIFT
      </Link>
    </div>
  );
}

export function SilvanaFooter() {
  const portrait = asset('silvana-hero');
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBody}>
        <div className={styles.footerWordmark}>{SILVANA_FOOTER.wordmark}</div>

        <h2 className={styles.footerHeading}>{SILVANA_FOOTER.contactHeading}</h2>

        <p className={styles.footerLine}>
          <strong>Email:</strong>{' '}
          <a href={`mailto:${SILVANA_FOOTER.email}`}>{SILVANA_FOOTER.email}</a>
        </p>
        <p className={styles.footerLine}>
          <strong>Phone | WhatsApp:</strong>{' '}
          <a href={SITE.phoneHref}>{SILVANA_FOOTER.phone}</a>
        </p>

        <p className={styles.footerBlock}>
          <strong>{SILVANA_FOOTER.locationLabel}</strong> {SILVANA_FOOTER.location}
        </p>
        <p className={styles.footerBlock}>{SILVANA_FOOTER.parking}</p>

        <div className={styles.footerBottom}>
          <div>
            <h2 className={styles.footerHeading} style={{ marginBottom: 12 }}>
              {SILVANA_FOOTER.socialHeading}
            </h2>
            <SocialIcons />
          </div>

          <div className={styles.btnRow} style={{ marginTop: 0 }}>
            <Link href="/book" className={styles.btn}>
              BOOK
            </Link>
            <Link href="/gift" className={styles.btn}>
              GIFT
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerPhoto}>
        <Image
          src={portrait.src}
          alt="Silvana playing the handpan"
          width={portrait.width}
          height={portrait.height}
          sizes="(max-width: 760px) 100vw, 340px"
        />
      </div>
    </footer>
  );
}
