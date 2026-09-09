import Image from 'next/image';

import { SITE } from '@/lib/site';
import { asset } from '@/lib/images';
import styles from './CertificatePreview.module.css';

type Props = {
  recipientName: string;
  fromName?: string;
  description: string;
  valueLabel: string;
  /** The real redemption code, only known once the request has actually
   *  been submitted - undefined while this is still a live preview. */
  code?: string;
  /** True when this renders inline in a fixed-width column (the post-
   *  submit confirmation) rather than a centered full-viewport modal - the
   *  modal's exact 7:4.5 print-proportion box assumes the generous width
   *  a modal has to work with, and forcing that same ratio into a much
   *  narrower column leaves too little height for the real content, which
   *  then overlaps the redemption band below it. Compact drops the fixed
   *  ratio in favour of a height that simply fits its content. */
  compact?: boolean;
};

/** The certificate itself - locked to 7 x 4.5 in, the real size of a
 *  redeemable gift card, not a letter-page certificate of completion
 *  (except in `compact` mode - see above). */
export function CertificatePreview({
  recipientName,
  fromName,
  description,
  valueLabel,
  code,
  compact = false,
}: Props) {
  const logo = asset('logo-circle');

  return (
    <div className={`${styles.cert} ${compact ? styles.certCompact : ''}`}>
      <div className={styles.certFrame}>
        <div className={styles.certInner}>
          <div className={styles.certContent}>
            <Image
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              className={styles.certSeal}
              unoptimized
            />
            <div className={styles.certEyebrow}>Gift Certificate</div>
            <div className={styles.certEntitles}>For</div>
            <div className={styles.certName}>{recipientName || 'Recipient Name'}</div>
            {fromName?.trim() ? (
              <div className={styles.certFrom}>
                From <strong>{fromName.trim()}</strong>
              </div>
            ) : null}
            <div className={styles.certRule} />
            <p className={styles.certDesc}>{description}</p>
            <div className={styles.certValue}>{valueLabel}</div>
          </div>
          <div className={styles.certRedeem}>
            <div className={styles.certRedeemText}>
              <span className={styles.certRedeemLabel}>How to redeem</span>
              Book at lotusattune.com/book and enter your code at checkout.
              {code ? (
                <span className={styles.certCode}>{code}</span>
              ) : (
                <span className={styles.certCodePending}>
                  Code generated after checkout
                </span>
              )}
              <span style={{ display: 'block', marginTop: 4 }}>
                Questions? {SITE.email} · WhatsApp {SITE.phone}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
