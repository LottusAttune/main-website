import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { formatStudioDate } from '@/lib/pipeline';
import type { PortalData } from '@/lib/portal';
import { money, SITE, splitVenueDetails } from '@/lib/site';
import { Countdown } from './Countdown';
import { PortalAddons } from './PortalAddons';
import styles from './portal.module.css';

/** The page itself, separate from the loading so it can be previewed with sample data. */
export function PortalView({ data }: { data: PortalData }) {
  const { token } = data;
  const { booking, invoice, settings, upsells } = data;
  const first = booking.name.split(' ')[0] || booking.name;
  const cancelled = booking.status === 'cancelled';
  const format =
    booking.participants === 1
      ? booking.isPackage
        ? 'Private, package of four sessions'
        : 'Private session'
      : booking.isCorporateIntro
        ? `Corporate introductory experience, ${booking.participants} participants`
        : `${booking.participants} participants`;
  const extras = [booking.teamAddon ? 'Team-building add-on' : null].filter(Boolean);
  const { location, arrival } = splitVenueDetails(settings.business.venueDetails);

  return (
    <>
      <SiteNav />
      <Reveal />
      <main>
        <section className={styles.page} aria-labelledby="portal-heading">
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            Your Booking Page
          </div>
          <h1 id="portal-heading" className={`display ${styles.title}`}>
            {cancelled
              ? 'This booking was cancelled'
              : booking.sessionDate
                ? `See you on ${formatStudioDate(booking.sessionDate)}, ${first}`
                : `Hi ${first}`}
          </h1>
          <p className={styles.intro}>
            {cancelled
              ? `If this is unexpected, write to ${SITE.email} or call ${SITE.phone}.`
              : booking.confirmed
                ? 'Your date is confirmed. Everything for the day is here, and you can add to your experience any time before it.'
                : 'Your date is held once the deposit on your invoice is received. Everything else for the day is here.'}
          </p>

          {!cancelled && data.startsAt && data.endsAt ? <Countdown startsAt={data.startsAt} endsAt={data.endsAt} /> : null}

          <div className={styles.grid}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.panelTitle}>The experience</h2>
              <div className={styles.rows}>
                <span className={styles.rowLabel}>What</span>
                <span className={styles.rowValue}>Immersive Soma Sound Experience, two hours</span>
                <span className={styles.rowLabel}>Format</span>
                <span className={styles.rowValue}>{format}</span>
                <span className={styles.rowLabel}>Date</span>
                <span className={styles.rowValue}>{booking.sessionDate ? formatStudioDate(booking.sessionDate) : 'To be confirmed'}</span>
                <span className={styles.rowLabel}>Time</span>
                <span className={styles.rowValue}>{booking.sessionTime ?? 'To be confirmed'}</span>
                {booking.sessionDate2 ? (
                  <>
                    <span className={styles.rowLabel}>Second session</span>
                    <span className={styles.rowValue}>
                      {formatStudioDate(booking.sessionDate2)}, {booking.sessionTime2}
                    </span>
                  </>
                ) : null}
                <span className={styles.rowLabel}>Venue</span>
                <span className={styles.rowValue}>{data.venue}</span>
                {extras.length ? (
                  <>
                    <span className={styles.rowLabel}>Extras</span>
                    <span className={styles.rowValue}>{extras.join(', ')}</span>
                  </>
                ) : null}
              </div>
              {!cancelled && booking.sessionTime ? (
                <p className={styles.note}>
                  To ensure a smooth experience, please arrive 15 minutes prior to the start of the session to
                  settle in. Allow extra time for parking and rush-hour traffic.
                </p>
              ) : null}
              {data.googleCalendarUrl ? (
                <div className={styles.actions}>
                  <a className="btn btn--outline" href={data.googleCalendarUrl} target="_blank" rel="noopener">
                    Add to Google Calendar
                  </a>
                  <a className="btn btn--outline" href={`/portal/${token}/calendar`}>
                    Apple / Outlook file
                  </a>
                </div>
              ) : null}
            </div>

            <div className={`card ${styles.panel}`}>
              <h2 className={styles.panelTitle}>Payment</h2>
              {invoice ? (
                <>
                  <div className={styles.rows}>
                    <span className={styles.rowLabel}>Invoice</span>
                    <span className={styles.rowValue}>{invoice.number}</span>
                    <span className={styles.rowLabel}>Total</span>
                    <span className={`${styles.rowValue} ${styles.money}`}>{money(invoice.total)}</span>
                    <span className={styles.rowLabel}>Paid</span>
                    <span className={`${styles.rowValue} ${styles.money}`}>{money(data.paid)}</span>
                    <span className={styles.rowLabel}>Balance</span>
                    <span className={`${styles.rowValue} ${styles.money}`}>{money(data.balance)}</span>
                  </div>
                  <p className={styles.note}>
                    {data.balance <= 0
                      ? 'Paid in full - there is nothing further due before your session.'
                      : data.paid > 0
                        ? booking.cardOnFile
                          ? (() => {
                              const fee = Math.round((data.balance * settings.business.cardFeePercent) / 100);
                              const total = data.balance + fee;
                              return `The balance of ${money(total)} is charged to your card on file ${settings.business.balanceDaysBefore} calendar days before the session${data.balanceDay ? `, on ${formatStudioDate(data.balanceDay)}` : ''}.`;
                            })()
                          : `The balance is due ${settings.business.balanceDaysBefore} calendar days before the session${data.balanceDay ? `, by ${formatStudioDate(data.balanceDay)}` : ''}. Pay by card below, or by e-transfer using the details on your invoice.`
                        : `A ${settings.business.depositPercent}% deposit by card confirms your date, or send the full amount by Interac e-transfer using the details on your invoice.`}
                  </p>
                  <div className={styles.actions}>
                    {data.balance > 0 && data.payUrl && !(data.paid > 0 && booking.cardOnFile) ? (
                      <a className="btn btn--dark" href={data.payUrl}>
                        {data.paid > 0 ? 'Pay balance by card' : 'Pay deposit by card'}
                      </a>
                    ) : null}
                    {data.invoiceUrl ? (
                      <a className="btn btn--outline" href={data.invoiceUrl}>
                        View invoice
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className={styles.note}>Your invoice is on its way by email.</p>
              )}
            </div>
          </div>

          {!cancelled && upsells.length ? (
            <div className={styles.section}>
              <h2 className={`display ${styles.sectionTitle}`}>Add to your experience</h2>
              <p className={styles.body}>
                Added to your booking and invoice straight away.{' '}
                {booking.cardOnFile
                  ? 'The extra is charged together with your balance.'
                  : 'The extra joins your balance, payable from your invoice.'}
              </p>
              <PortalAddons token={token} upsells={upsells} cardOnFile={booking.cardOnFile} />
            </div>
          ) : null}

          {!cancelled ? (
            <div className={styles.section}>
              <h2 className={`display ${styles.sectionTitle}`}>Getting there</h2>
              {data.venueCopy.map((p) => (
                <p key={p} className={styles.body}>
                  {p}
                </p>
              ))}
              {booking.confirmed && location ? (
                <p className={styles.body}>
                  <strong>Location:</strong>
                  <br />
                  {location}
                </p>
              ) : !booking.confirmed ? (
                <p className={styles.body}>The exact address and arrival details follow with your booking confirmation.</p>
              ) : null}
              {booking.confirmed && arrival ? (
                <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>
                  <strong>Arrival instructions:</strong>
                  <br />
                  {arrival}
                </p>
              ) : null}
              {booking.confirmed && data.venueDirections ? (
                <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>
                  <strong>Once inside the lobby:</strong>
                  <br />
                  {data.venueDirections}
                </p>
              ) : null}
              {booking.confirmed && settings.business.parking ? (
                <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>
                  <strong>Parking:</strong>
                  <br />
                  {settings.business.parking}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={styles.section}>
            <h2 className={`display ${styles.sectionTitle}`}>Good to know</h2>
            {data.faqs.map((f) => (
              <p key={f.q} className={styles.body}>
                <span className={styles.faqQ}>{f.q}</span>
                <br />
                {f.a}
              </p>
            ))}
          </div>

          {data.cancellationPolicy ? (
            <div className={styles.section}>
              <h2 className={`display ${styles.sectionTitle}`}>Cancellation policy</h2>
              <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>
                {data.cancellationPolicy}
              </p>
            </div>
          ) : null}

          <p className={styles.intro} style={{ marginTop: 8 }}>
            Questions? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phone}.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
