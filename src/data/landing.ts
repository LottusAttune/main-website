/**
 * Ad landing page content.
 *
 * The `audience` variant reorders the offer cards and swaps the hero eyebrow,
 * headline and subline, so separate ad sets can point at the same page:
 *   /lp             → Everyone
 *   /lp?aud=individuals
 *   /lp?aud=corporate
 */

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

export const LANDING_INCLUDED = [
  'Premium Signature Venue or Private Wellness Lounge — venue rental included',
  'Fully guided somatic and mindfulness practices and a sensory connection exercise',
  'Immersive sound session with professional-grade instruments',
  'Educational video about neuroscience and sound benefits',
  'Custom-branded wellness mats, memory-foam cervical pillows, cozy blankets, and eye masks',
  'Intention-setting cards and reflection cards',
  'Refreshments, including water, other beverages and healthy snacks',
  'End-of-session reintegration',
] as const;

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

/** A shortened selection of the approved reviews. */
export const LANDING_REVIEWS = [
  {
    name: 'Serge',
    face: 'review-serge',
    meta: 'Private group session',
    text: 'Silvana is very knowledgeable, and the way she explains everything is clear and easy to follow. The design, comfort, branded materials, instruments, and visuals were all thoughtfully prepared. I would rate it 10 out of 10.',
  },
  {
    name: 'Zainab',
    face: null,
    meta: 'Private group session',
    text: 'My body felt tired when I arrived after a busy weekend and after the session, I felt light and renewed. I would 100% highly recommend this experience!',
  },
  {
    name: 'Aldo',
    face: null,
    meta: 'One-on-one session',
    text: 'I felt lighter after the session, and the vibrations helped bring my body into harmony. I left feeling calmer and more aligned.',
  },
] as const;

export const LANDING_FAQS = [
  {
    q: 'Do I need any prior experience?',
    a: 'No meditation background is needed. Sessions are intentionally designed to be welcoming and supportive for all levels. Simply come as you are and allow yourself to relax into the experience.',
  },
  {
    q: 'How will I feel after the session?',
    a: 'While every experience is unique, many participants report feeling deeply relaxed, grounded, cleared-minded, emotionally lighter, and energetically renewed — often describing it as a full reset for both the mind and body.',
  },
  {
    q: 'What should I bring?',
    a: 'All wellness and comfort elements are thoughtfully provided, including mats, pillows, blankets, eye masks, and water. Simply bring yourself and arrive with an open mind and heart.',
  },
  {
    q: 'What should I wear?',
    a: 'Comfortable clothing, including socks to keep your feet warm, is recommended to help you fully relax and enjoy the session. Cozy layers are encouraged for added comfort.',
  },
  {
    q: 'Cancellation Policy',
    a: "Life happens, and plans change. If you are unable to attend, please cancel at least 48 hours before the start of your session. Cancellations made with at least 48 hours' notice may be rescheduled once or transferred as a credit toward a future session, subject to availability.",
  },
] as const;
