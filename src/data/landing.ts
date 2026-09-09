/**
 * Ad landing page content.
 *
 * The `audience` variant reorders the offer cards and swaps the hero eyebrow,
 * headline and subline, so separate ad sets can point at the same page:
 *   /book-now             → Everyone
 *   /book-now?aud=individuals
 *   /book-now?aud=corporate
 *
 * Reviews, FAQs and the included list are drawn from the same approved text
 * in content.ts (just a curated subset) rather than kept as separate copies
 * here - a separate copy is exactly what let this page's wording drift out
 * of date with the real, current text used everywhere else.
 */
import { FAQS, INCLUDED_SHORT, REVIEWS } from './content';

export type AudienceKey = 'everyone' | 'individuals' | 'corporate';

export type OfferTone = 'one' | 'group' | 'corp';

export const AUDIENCES: Record<
  AudienceKey,
  {
    eyebrow: string;
    title: string;
    sub: string;
    problemEyebrow: string;
    offersTitle: string;
    pains: readonly string[];
    order: readonly OfferTone[];
  }
> = {
  everyone: {
    eyebrow: 'Downtown Toronto · 1 to 24 people',
    title: 'Two hours that give you your calm back',
    sub: 'An immersive wellness experience designed to support relaxation, nervous system regulation and deep inner connection',
    problemEyebrow: 'Sound familiar',
    offersTitle: 'For you, your people, or your team',
    pains: [
      'You are running on empty and rest never quite lands.',
      'Your team is productive but quietly depleted.',
      'You have tried meditation apps and stillness never sticks.',
    ],
    order: ['one', 'group', 'corp'],
  },
  individuals: {
    eyebrow: 'Downtown Toronto · One-on-one & small groups',
    title: 'Two hours that give you your calm back',
    sub: 'A fully guided journey of sound, mindfulness and somatic practice — designed to help you rest deeply and return to yourself',
    problemEyebrow: 'If this is you',
    offersTitle: 'For you, or for the people you love',
    pains: [
      'You are running on empty and rest never quite lands.',
      'Your mind stays busy long after the day ends.',
      'You have tried meditation apps and stillness never sticks.',
    ],
    order: ['one', 'group'],
  },
  corporate: {
    eyebrow: 'Downtown Toronto · Teams of up to 24',
    title: 'A team reset your people will actually remember',
    sub: 'An immersive wellness experience for organizations — designed to reduce stress, restore focus and bring teams back together',
    problemEyebrow: 'The cost of a depleted team',
    offersTitle: 'For your team, department or leadership group',
    pains: [
      'Your team is productive but quietly depleted.',
      'Wellness perks go unused and change nothing.',
      'Team-building days feel forced and are forgotten by Monday.',
    ],
    order: ['corp', 'group', 'one'],
  },
};

export const ASSURANCE_LINE =
  'No experience needed · Everything provided · Free rescheduling 48h ahead';

export const LANDING_STEPS = [
  {
    n: '01',
    title: 'Choose your session',
    body: 'One-on-one, a private group of friends and family, or a corporate team of up to 24.',
  },
  {
    n: '02',
    title: 'Pick a date',
    body: 'Send your preferred date and time. We confirm every booking personally, at least five days ahead.',
  },
  {
    n: '03',
    title: 'Arrive and let go',
    body: 'Mats, pillows, blankets, eye masks and refreshments are all provided. Bring yourself.',
  },
] as const;

export const LANDING_COMPONENTS = [
  {
    icon: 'icon-neuroscience',
    title: 'Neuroscience Education',
    body: 'Begin with a brief, engaging video exploring the science and benefits of sound-based healing practices',
  },
  {
    icon: 'icon-senses',
    title: 'Intention and Sensory Connection',
    body: 'Set a meaningful intention through gratitude, reflection, and an exercise that engages the five senses',
  },
  {
    icon: 'icon-practice',
    title: 'Guided Restorative Practice',
    body: 'An easy-to-follow somatic technique and a mindfulness exercise designed to release tension',
  },
  {
    icon: 'icon-sound',
    title: 'Immersive Sound',
    body: 'A peaceful, layered soundscape of live crystal singing bowls, handpan, African shakers and shamanic drum',
  },
  {
    icon: 'icon-reintegration',
    title: 'Reintegration',
    body: 'A gentle transition back, carrying a renewed sense of calm into the days ahead',
  },
] as const;

export const LANDING_INCLUDED = INCLUDED_SHORT;

export const LANDING_OFFERS = [
  {
    tone: 'one' as OfferTone,
    tag: '1 : 1',
    title: 'Private Sessions',
    body: 'Customizable based on individual preferences',
    price: '$340',
    unit: 'per session',
    note: 'Package of four: $1,200 — save $160',
  },
  {
    tone: 'group' as OfferTone,
    tag: 'Private Group',
    title: 'Friends, Families & Groups',
    body: 'Ideal for gatherings, birthdays, celebrations, and other special occasions',
    price: '$280',
    unit: 'per participant',
    note: '2–24 participants · everything provided',
  },
  {
    tone: 'corp' as OfferTone,
    tag: 'Corporate',
    title: 'Corporate Wellness',
    body: 'Elevate your company culture through a new generation of team building where wellness and connection come together',
    price: '$280',
    unit: 'per participant',
    note: 'Optional team-building add-on: $500 per event',
  },
] as const;

/** A shortened selection of the approved reviews, by name - text always
 *  comes from the live REVIEWS array so an edit there never has to be
 *  repeated here. */
const LANDING_REVIEW_NAMES = ['Serge', 'Zainab', 'Aldo'] as const;
export const LANDING_REVIEWS = LANDING_REVIEW_NAMES.map((name) => {
  const review = REVIEWS.find((r) => r.name === name);
  if (!review) throw new Error(`Landing page review "${name}" not found in REVIEWS`);
  return review;
});

/** Same approach as the reviews above - a curated subset of the live FAQs,
 *  matched by question so the answer text can never drift out of date. */
const LANDING_FAQ_QUESTIONS = [
  'Do I need any prior experience?',
  'How will I feel after the session?',
  'What should I bring?',
  'What should I wear?',
  'Cancellation Policy',
] as const;
export const LANDING_FAQS = LANDING_FAQ_QUESTIONS.map((q) => {
  const faq = FAQS.find((f) => f.q === q);
  if (!faq) throw new Error(`Landing page FAQ "${q}" not found in FAQS`);
  return faq;
});
