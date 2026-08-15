import Link from 'next/link';

import { VENUE_COPY } from '@/data/content';
import { NAV_LINKS, SITE, SOCIAL } from '@/lib/site';
import styles from './SiteFooter.module.css';

const SPECS = [
  { label: 'Session length', value: '2 hours' },
  { label: 'Participants', value: '1 – 24' },
  { label: 'Booking notice', value: '5 days' },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} />

      <div className={styles.inner}>
        <div className={styles.lockup}>
          {/* The prototype sets the wordmark in type between two fading gold
              rules rather than using the lockup image, which would repeat the
              same words twice. Following the prototype. */}
          <div className={styles.rule}>
            <span className={styles.ruleWord}>LOTUS ATTUNE</span>
          </div>
          <div className={styles.eyebrow}>{SITE.tagline}</div>
          <div className={styles.motto}>{SITE.motto}</div>
          <div className="btn-row btn-row--center">
            <Link href="/book" className="btn btn--dark">
              Book a session
            </Link>
            <Link href="/gift" className="btn btn--outline">
              Gift a session
            </Link>
          </div>
        </div>

        <div className={styles.cells}>
          <div className={styles.cell}>
            <div className={styles.cellTitle}>Contact</div>
            <div className={styles.stack}>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              <a href={SITE.phoneHref}>{SITE.phone}</a>
              <span className={styles.note}>Phone &amp; WhatsApp</span>
            </div>
            <div className={styles.socialTitle}>Get Social</div>
            <div className={styles.social}>
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className={`btn btn--outline ${styles.socialPill}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.cell}>
            <div className={styles.cellTitle}>Explore</div>
            <div className={styles.stack}>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.cell}>
            <div className={styles.cellTitle}>The Venue</div>
            {VENUE_COPY.map((paragraph) => (
              <p key={paragraph} className={styles.venueCopy}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className={styles.cell}>
            <div className={styles.cellTitle}>Good to Know</div>
            {SPECS.map((spec) => (
              <div key={spec.label} className={styles.spec}>
                <span>{spec.label}</span>
                <span className={styles.specValue}>{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <span className={styles.bottomArea}>{SITE.area}</span>
        </div>
      </div>
    </footer>
  );
}
