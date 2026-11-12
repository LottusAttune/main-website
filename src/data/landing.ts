/**
 * Ad landing page content.
 *
 * The `audience` variant reorders the offer cards and swaps the hero eyebrow,
 * headline and subline, so separate ad sets can point at the same page:
 *   /book-now             → Everyone
 *   /book-now?aud=individuals
 *   /book-now?aud=corporate (also at /book-corporate, the link used in LinkedIn ads)
 *
 * Reviews, FAQs and the included list are drawn from the same approved text
 * in content.ts (just a curated subset) rather than kept as separate copies
 * here - a separate copy is exactly what let this page's wording drift out
 * of date with the real, current text used everywhere else.
 */
import { FAQS, INCLUDED_SHORT, REVIEWS, TRUST } from './content';

export type AudienceKey = 'everyone' | 'individuals' | 'corporate';

export type OfferTone = 'one' | 'group' | 'corp';

export const AUDIENCES: Record<
  AudienceKey,
  {
    eyebrow: string;
    title: string;
    sub: string;
    problemEyebrow: string;
    /** Heading over the three cards in the "Sound familiar" section. */
    problemTitle: string;
    /** Optional: where that heading breaks onto a second line on wider
     *  screens (the text is the same as problemTitle, split in two). */
    problemTitleLines?: readonly [string, string];
    /** Body of step 01, "Choose your session". */
    stepOne: string;
    offersTitle: string;
    pains: readonly string[];
    order: readonly OfferTone[];
  }
> = {
  everyone: {
    eyebrow: 'Downtown Toronto · 1 to 25 people',
    title: 'Two hours that give you your calm back',
    sub: 'An immersive wellness experience designed to support relaxation, nervous system regulation and deep inner connection',
    problemEyebrow: 'Sound familiar',
    problemTitle: 'Your nervous system is asking for a break',
    stepOne: 'One-on-one, a private group of friends and family, or a corporate team of up to 25',
    offersTitle: 'For you, your people, or your team',
    pains: [
      'Tension you carry from one day into the next',
      'You know you need to slow down, but you do not know how to switch off',
      'You have tried meditation apps and breathing exercises, and stillness never sticks',
    ],
    order: ['one', 'group'],
  },
  individuals: {
    eyebrow: 'Downtown Toronto · One-on-one & small groups',
    title: 'Two hours that give you your calm back',
    sub: 'A fully guided journey of sound, mindfulness and somatic practice — designed to help you rest deeply and return to yourself',
    problemEyebrow: 'If this is you',
    problemTitle: 'Your nervous system is asking for a break',
    stepOne: 'One-on-one, a private group of friends and family, or a corporate team of up to 25',
    offersTitle: 'For you, or for the people you love',
    pains: [
      'Tension you carry from one day into the next',
      'You know you need to slow down, but you do not know how to switch off',
      'You have tried meditation apps and breathing exercises, and stillness never sticks',
    ],
    order: ['one', 'group'],
  },
  corporate: {
    eyebrow: 'Downtown Toronto · Teams of up to 25',
    title: 'A team reset your people will actually remember',
    sub: 'An immersive wellness experience for organizations — designed to reduce stress, restore focus and bring teams back together',
    problemEyebrow: 'The hidden cost of stress',
    problemTitle: 'The most productive thing your team can do is pause',
    problemTitleLines: ['The most productive thing your team', 'can do is pause'],
    stepOne: 'Your team, department or leadership group, from 4 to 25 people',
    offersTitle: 'For your team, department or leadership group',
    pains: [
      'Your team is productive but quietly depleted',
      'You want a meaningful team experience, not another forgettable team outing',
      'Burnout shows up as sick days, turnover and disengagement',
    ],
    order: ['corp'],
  },
};

export const ASSURANCE_LINE =
  'No experience needed · Everything provided · Fully guided';

export const LANDING_STEPS = [
  {
    n: '01',
    title: 'Choose your session',
    // Each audience has its own wording - see `stepOne` above.
    body: '{stepOne}',
  },
  {
    n: '02',
    title: 'Pick a date',
    // {lead} is the booking lead time set in the studio.
    body: 'Send your preferred date and time. We confirm every booking personally, at least {lead}\u00a0days ahead',
  },
  {
    n: '03',
    title: 'Arrive and let go',
    body: 'Mats, pillows, blankets, eye masks and refreshments are all provided. Bring yourself',
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
    body: 'A gentle transition back with mindful stretching, carrying a renewed sense of calm into the days ahead',
  },
] as const;

export const LANDING_INCLUDED = INCLUDED_SHORT;

/** The at-a-glance strip under the hero. Same as the home page, except the
 *  venue cell reads "Downtown Toronto · Premium venue" here. */
export const LANDING_TRUST = TRUST.map((item) =>
  item.figure === 'Toronto' ? { ...item, figure: 'Downtown Toronto' } : item,
);

export const LANDING_OFFERS = [
  {
    tone: 'one' as OfferTone,
    tag: '1 : 1',
    title: 'Private Sessions',
    body: 'Customizable based on individual preferences',
    price: '$250',
    unit: 'per session',
    note: 'Package of four: $900 — save $100',
  },
  {
    tone: 'group' as OfferTone,
    tag: 'Groups & Teams',
    title: 'Friends, Families & Groups',
    body: 'Ideal for gatherings, birthdays, celebrations, and other special occasions',
    price: '$450 – $2,900',
    unit: 'per group',
    note: 'Price scales with group size, up to 25 participants · optional team-building add-on for corporate teams: $400 per event',
  },
  {
    tone: 'corp' as OfferTone,
    tag: 'Corporate',
    title: 'Corporate Wellness',
    body: 'Elevate your company culture through a new generation of team building where wellness and connection come together',
    price: '$950 – $2,900',
    unit: 'per group',
    note: 'Price scales with team size, teams of 4 to 25 · optional team-building add-on: $400 per event',
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
  'Cancellation & Rescheduling Policy',
] as const;
export const LANDING_FAQS = LANDING_FAQ_QUESTIONS.map((q) => {
  const faq = FAQS.find((f) => f.q === q);
  if (!faq) throw new Error(`Landing page FAQ "${q}" not found in FAQS`);
  return faq;
});

/** Where each ad page lives, so the Book, Gift and Discovery call pages can
 *  offer a way back to the exact version the visitor came from. The ad
 *  pages add `?from=<audience>` to every link that leaves them. */
export const LANDING_PATHS: Record<AudienceKey, string> = {
  everyone: '/book-now',
  individuals: '/book-now?aud=individuals',
  corporate: '/book-corporate',
};

export function landingReturnHref(from: string | undefined): string | null {
  return from && from in LANDING_PATHS ? LANDING_PATHS[from as AudienceKey] : null;
}
