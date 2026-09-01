import Image from 'next/image';

import { VENUE_COPY } from '@/data/content';
import { asset } from '@/lib/images';
import { SITE, SOCIAL } from '@/lib/site';
import { ExpandableNote } from './ExpandableNote';
import { FacebookIcon, InstagramIcon, LinkedInIcon, MailIcon, PhoneIcon } from './FooterIcons';
import styles from './SiteFooter.module.css';

const SPECS = [
  { label: 'Session length', value: '2 hours' },
  { label: 'Participants', value: '1 – 24' },
  { label: 'Booking notice', value: '5 days' },
];

const SOCIAL_ICONS = {
  LinkedIn: LinkedInIcon,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
};

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} />

      <div className={styles.lockup}>
        <div className={styles.lockupPhoto}>
          <Image
            src={asset('footer-lockup-combo').src}
            alt={SITE.name}
            width={asset('footer-lockup-combo').width}
            height={asset('footer-lockup-combo').height}
            sizes="(max-width: 900px) 100vw, 720px"
            unoptimized
          />
        </div>

        <div className={styles.lockupContent}>
          <div className={styles.mottoGroup}>
            <div className={styles.readyEyebrow}>Ready When You Are</div>
            <div className={styles.motto}>{SITE.motto}</div>
          </div>
          <p className={styles.body}>
            Create space to recharge, renew and reconnect from within
          </p>
        </div>
      </div>

      <div className={styles.inner}>
        <div className={styles.cellsGrid}>
          <div className={styles.cell}>
            <div className={styles.cellTitle}>Contact</div>
            <div className={styles.stack}>
              <a href={`mailto:${SITE.email}`} className={styles.iconRow}>
                <MailIcon className={styles.rowIcon} />
                {SITE.email}
              </a>
              <a href={SITE.phoneHref} className={styles.iconRow}>
                <PhoneIcon className={styles.rowIcon} />
                {SITE.phone}
              </a>
              <span className={styles.note}>Phone &amp; WhatsApp</span>
            </div>
            <div className={styles.socialTitle}>Get Social</div>
            <div className={styles.social}>
              {SOCIAL.filter((s) => s.label in SOCIAL_ICONS).map((s) => {
                const Icon = SOCIAL_ICONS[s.label as keyof typeof SOCIAL_ICONS];
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className={styles.socialIcon}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>

          <div className={styles.cell}>
            <div className={styles.cellTitle}>Location</div>
            <ExpandableNote label="Bloor–Yonge, Toronto" labelClassName={styles.locationLead}>
              <p className={styles.venueCopy}>{VENUE_COPY[0]}</p>
            </ExpandableNote>
            <ExpandableNote label="Parking">
              <p className={styles.venueCopy}>{VENUE_COPY[1]}</p>
            </ExpandableNote>
          </div>

          <div className={styles.cell}>
            <div className={styles.goodToKnowInner}>
              <div className={styles.cellTitle}>Good to Know</div>
              {SPECS.map((spec) => (
                <div key={spec.label} className={styles.spec}>
                  <span>{spec.label}</span>
                  <span className={styles.specValue}>{spec.value}</span>
                </div>
              ))}
            </div>
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
