import { FAQS } from '@/data/content';
import type { LegalSection } from '@/components/legal/LegalPage';
import type { BusinessSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';

/**
 * The Terms & Conditions, built from the live business settings so the
 * figures (deposit, fee, balance date) never drift from the invoices.
 * Shown on /terms and in the pop-up on the booking form.
 */
export function termsSections(business: BusinessSettings): LegalSection[] {
  const policy =
    business.cancellationPolicy ||
    FAQS.find((f) => f.q === 'Cancellation Policy')?.a ||
    '';
  const deposit = business.depositPercent > 0 && business.depositPercent < 100;

  return [
    {
      title: 'Bookings',
      paragraphs: [
        deposit
          ? `A booking made through this website is confirmed once the ${business.depositPercent}% deposit shown on your invoice has been received. Until then the date is not held.`
          : 'A booking made through this website is confirmed once the invoice has been paid. Until then the date is not held.',
        'Each experience runs approximately two hours for the number of participants stated on your invoice. Groups larger than twelve are split across two sessions on the same day. Please arrive on time so the session can begin as planned.',
      ],
    },
    {
      title: 'Payment',
      paragraphs: [
        deposit
          ? `By card, you may pay a ${business.depositPercent}% deposit at the time of booking, with the remaining ${100 - business.depositPercent}% charged automatically to the same card ${business.balanceDaysBefore} calendar days before the session, or pay in full. By Interac e-transfer, the full amount is paid at the time of booking using the details on your invoice.`
          : 'Payment is made in full at the time of booking, by credit card or by Interac e-transfer using the details on your invoice.',
        `A ${business.cardFeePercent}% processing fee applies to card payments. E-transfers carry no fee.`,
        `Prices are in Canadian dollars${business.taxRatePercent > 0 ? ` and ${business.taxLabel} of ${business.taxRatePercent}% is added where shown` : ''}.`,
      ],
    },
    {
      title: 'Cancellations and no-shows',
      paragraphs: [
        policy,
        business.cancellationFee > 0
          ? `Where a card is on file, a cancellation fee of ${money(business.cancellationFee)} is charged for cancellations made within ${business.cancellationHours} hours of the session start, or for a no-show.`
          : 'Where a card is on file, any applicable cancellation fee is charged to that card.',
        'If Lotus Attune must cancel a session, you will be offered a new date or a full refund of any amount paid.',
      ],
    },
    {
      title: 'Gift certificates',
      paragraphs: [
        'Gift certificates are issued for the experience and value stated on the certificate and are redeemed by entering the certificate code when booking. They are transferable but not redeemable for cash, and are subject to availability and the booking terms above.',
      ],
    },
    {
      title: 'Your wellbeing',
      paragraphs: [
        'The Lotus Attune experience is a relaxation and wellness practice. It is not medical or psychological treatment and does not replace advice from a qualified health professional. If you are pregnant, have a pacemaker, epilepsy, or a condition affected by sound or lying still for extended periods, please tell us before booking so the session can be adapted or, where appropriate, declined.',
        'Participation is voluntary and you may pause or step out at any time. All comfort items (mats, pillows, blankets, eye masks and water) are provided.',
      ],
    },
    {
      title: 'Venue',
      paragraphs: [
        'Sessions take place at the downtown Toronto venue named on your invoice. Please treat the space and other participants with care. Lotus Attune is not responsible for personal belongings brought to the venue.',
      ],
    },
    {
      title: 'Questions',
      paragraphs: [
        `Write to ${SITE.email} or call ${SITE.phone}. These terms are governed by the laws of Ontario, Canada.`,
      ],
    },
  ];
}
