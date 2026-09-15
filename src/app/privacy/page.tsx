import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Lotus Attune collects, uses and protects your information.',
};

const sections = [
  {
    title: 'What we collect',
    paragraphs: [
      'When you request a booking, a discovery call or a gift certificate we collect the details you enter: your name, email address, phone number, company (if given), the date, time and size of the session you want, any message you write, and the recipient details for a gift certificate.',
      'If you pay by card, the payment is handled by Stripe. Lotus Attune never sees or stores your full card number; Stripe gives us a reference so we can match the payment to your invoice and, if you chose a deposit plan, charge the remaining balance to the same card.',
    ],
  },
  {
    title: 'How we use it',
    paragraphs: [
      'To respond to your request, prepare your proposal and invoice, confirm and remind you about your session, issue receipts and gift certificates, and to reach you about your booking. We do not sell your information or use it for advertising.',
    ],
  },
  {
    title: 'Who helps us handle it',
    paragraphs: [
      'The website runs on Vercel and stores bookings in a Supabase database. Emails are sent through Resend. Proposals, invoices and certificates are rendered to PDF by PDFShift. Card payments are processed by Stripe. Sessions may be added to a private Google Calendar. Each of these providers processes data only to provide that service.',
    ],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'Booking and invoice records are kept for as long as needed to run the business and meet accounting obligations. You may ask us to correct or delete your information at any time by emailing us; we will do so unless a legal or accounting requirement means a record must be retained.',
    ],
  },
  {
    title: 'Cookies',
    paragraphs: [
      'The public website does not use advertising or tracking cookies. The owner’s dashboard uses a single session cookie to keep the owner signed in; it is not set for visitors.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      `Questions about your information? Write to ${SITE.email} or call ${SITE.phone}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="What Lotus Attune collects when you book, why, and how it is looked after."
      updated="September 2026"
      sections={sections}
    />
  );
}
