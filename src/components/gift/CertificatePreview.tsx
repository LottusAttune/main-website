import Image from 'next/image';

import { SITE } from '@/lib/site';
import { asset } from '@/lib/images';
import styles from './CertificatePreview.module.css';

type Props = {
  recipientName: string;
  fromName?: string;
  description: string;
  valueLabel: string;
};

/** The certificate itself - locked to 7 x 4.5 in, the real size of a
 *  redeemable gift card, not a letter-page certificate of completion. */
export function CertificatePreview({
  recipientName,
  fromName,
  description,
  valueLabel,
}: Props) {
  const logo = asset('logo-circle');

  return (
    <div className={styles.cert}>
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
            <div className={styles.certFrom}>
              From <strong>{fromName?.trim() || 'a friend'}</strong>
            </div>
            <div className={styles.certRule} />
            <p className={styles.certDesc}>{description}</p>
            <div className={styles.certValue}>{valueLabel}</div>
          </div>
          <div className={styles.certRedeem}>
            <div className={styles.certRedeemText}>
              <span className={styles.certRedeemLabel}>How to redeem</span>
              Book at lotusattune.com/book — enter this code at checkout.
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
