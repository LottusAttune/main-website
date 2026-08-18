'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SILVANA_FOOTER, SILVANA_NAV } from '@/data/silvana';
import { asset } from '@/lib/images';
import { SITE } from '@/lib/site';
import { SocialIcons } from './SocialIcons';
import styles from './silvana.module.css';

export function SilvanaNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main navigation">
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
