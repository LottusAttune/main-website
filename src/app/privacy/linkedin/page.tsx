import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { SITE } from '@/lib/site';

// Linked from the LinkedIn lead form only - not meant to be found through search.
export const metadata: Metadata = {
  title: 'Privacy Notice: LinkedIn Form',
  description: 'How Lotus Attune looks after the details you share through its LinkedIn form.',
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: 'What we collect',
    paragraphs: [
      'The details you share in this form, such as your name, email, company, job title and any answers you give.',
    ],
  },
  {
    title: 'How we use it',
    paragraphs: [
      'Only to reply to your enquiry and to contact you about Lotus Attune team sessions. By submitting this form, you agree that Silvana may contact you by email for this purpose.',
    ],
  },
  {
    title: 'What we don’t do',
    paragraphs: ['We don’t sell your information or share it for advertising.'],
  },
  {
    title: 'Who handles it',
    paragraphs: [
      'LinkedIn collects the form on our behalf and handles it under its own privacy policy. We keep your details in a private account and spreadsheet.',
    ],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'As long as needed to follow up with you. You can ask us to correct or delete your details at any time.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [`Questions about your information? Write to ${SITE.email}.`],
  },
];

export default function LinkedInPrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Notice: LinkedIn Form"
      intro="What Lotus Attune collects when you submit the LinkedIn form, and how it is looked after."
      updated="October 2026"
      sections={sections}
    />
  );
}
