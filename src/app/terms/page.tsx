import type { Metadata } from 'next';

import { FAQS } from '@/data/content';
import { LegalPage } from '@/components/legal/LegalPage';
import { getSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';

// Draft wording awaiting Silvana's sign-off - kept out of search until then.
export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Booking, payment and cancellation terms for Lotus Attune experiences.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const { business } = await getSettings();
  const policy =
    business.cancellationPolicy ||
    FAQS.find((f) => f.q === 'Cancellation Policy')?.a ||
    '';

  const sections = [
    {
      title: 'Bookings',
      paragraphs: [
        'A booking request made through this website is a request, not a confirmed reservation. Silvana reviews every request personally and sends a written proposal. Your date is held once the proposal is accepted and payment (or the deposit, where a card deposit plan is chosen) has been received.',
        'Each experience runs approximately two hours for the number of participants stated in your proposal. Groups larger than twelve are split across two sessions on the same day. Please arrive on time so the session can begin as planned.',
      ],
    },
    {
      title: 'Payment',
      paragraphs: [
        'Interac e-transfer is the primary payment method: full payment at the time of booking, with no processing fee. Payment details are printed on your invoice.',
        `Credit card payment is available through Stripe. With a card you may pay in full, or pay a ${business.depositPercent}% deposit at booking with the remaining balance charged automatically to the same card ${business.balanceDaysBefore} calendar days before the session. A ${business.cardFeePercent}% card processing fee applies to card payments.`,
        `Invoices are due by the date printed on them (${business.invoiceDueDays} days from issue unless stated otherwise). Prices are in Canadian dollars${business.taxRatePercent > 0 ? ` and ${business.taxLabel} of ${business.taxRatePercent}% is added where shown` : ''}.`,
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
        'Sessions take place at the downtown Toronto venue named in your proposal. Please treat the space and other participants with care. Lotus Attune is not responsible for personal belongings brought to the venue.',
      ],
    },
    {
      title: 'Questions',
      paragraphs: [
        `Write to ${SITE.email} or call ${SITE.phone}. These terms are governed by the laws of Ontario, Canada.`,
      ],
    },
  ];

  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms & Conditions"
      intro="The plain-language terms for booking, paying for and attending a Lotus Attune experience."
      updated="September 2026"
      sections={sections}
    />
  );
}
