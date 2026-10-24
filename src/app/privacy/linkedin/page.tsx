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
    paragraphs: ['Your name, email, company, job title and any answers you give in this form.'],
  },
  {
    title: 'How we use it',
    paragraphs: [
      'Only to reply to your enquiry and to contact you about Lotus Attune. By submitting this form, you agree that Lotus Attune may contact you by email.',
    ],
  },
  {
    title: 'What we don’t do',
    paragraphs: ['We don’t sell your information or share it for advertising.'],
  },
  {
    title: 'Who handles it',
    paragraphs: ['LinkedIn collects the form and handles it under its own privacy policy.'],
  },
  {
    title: 'Your choices',
    paragraphs: [
      `You can ask us to correct or delete your details at any time. Write to ${SITE.email}.`,
    ],
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
