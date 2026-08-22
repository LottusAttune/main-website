/**
 * Every string in this file came from the client verbatim and was approved in
 * this exact form — including her own spellings and punctuation ("cleared-minded"
 * in the FAQ, the curly quotes around her pull quote).
 *
 * Do not reword any of it.
 */

export const HERO = {
  eyebrow: 'Immersive Soma Sound',
  headline: 'The Lotus Attune Experience',
  positioning:
    'An immersive wellness journey designed to support relaxation, nervous system regulation and deep inner connection',
} as const;

export const TRUST = [
  { figure: '10+ years', label: 'In wellness and restorative practices' },
  { figure: '2 hrs', label: 'Fully guided' },
  { figure: '1–24', label: 'Participants' },
  { figure: 'Toronto', label: 'Premium venue' },
] as const;

export const PROBLEM = {
  statement:
    'Chronic stress, burnout, mental fatigue, workplace disconnection, and the growing need for sustainable well-being support.',
  support:
    'Throughout my career, I witnessed organizations investing heavily in productivity while many employees quietly struggled with anxiety, emotional overload, fatigue, and a lack of meaningful support.',
} as const;

export const GUIDE = {
  quote:
    '”I bridge the gap between performance and restoration, productivity and well-being, and excellence and human connection.”',
  paragraphs: [
    'As a Wellness Facilitator with a strong Human Resources background, I help individuals and organizations across Toronto and the GTA reduce stress, restore balance, and enhance overall well-being through curated, immersive sound-based experiences combined with mindfulness wellness experiences.',
    'Unlike many wellness practitioners, I bring over 15 years of experience in Human Resources across recognized private and public-sector organizations and corporations.',
  ],
} as const;

export const JOURNEY_INTRO = {
  heading: 'A Journey to Reset, Align and Thrive',
  subtitle: 'Everything Curated into One Offering',
  lede: 'Each session brings together five carefully curated components in one seamless offering that supports deep relaxation, nervous system regulation, and sustainable well-being',
  longIntro:
    'More than a traditional sound bath, this all-in-one holistic wellness journey combines restorative and transformational modalities within one cohesive, fully guided experience. Every element is intentionally selected and sequenced to create meaningful impact and a supportive container for self-connection, restore inner balance, and feel renewed and empowered',
} as const;

/**
 * The five components. `body` is the short Home-page phrasing; `bodyLong` is the
 * fuller wording used on the Experience page. Only component 04 differs.
 */
export const COMPONENTS = [
  {
    n: '01',
    icon: 'icon-neuroscience',
    title: 'Neuroscience Education',
    body: 'Begin with a brief, engaging video exploring the science and benefits of sound-based healing practices',
  },
  {
    n: '02',
    icon: 'icon-senses',
    title: 'Intention and Sensory Connection',
    body: 'Set a meaningful intention through gratitude, reflection, and an exercise that engages the five senses and facilitates present-moment awareness',
  },
  {
    n: '03',
    icon: 'icon-practice',
    title: 'Guided Restorative Practices',
    body: 'Move through an easy-to-follow somatic technique and a mindfulness exercise designed to release tension and prepare the body for deeper immersion and connection',
  },
  {
    n: '04',
    icon: 'icon-sound',
    title: 'Immersive Sound',
    body: 'Experience a peaceful, layered soundscape featuring live crystal singing bowls, calming handpan melodies, organic African shakers, grounding shamanic drum rhythms, and other therapeutic instruments',
  },
  {
    n: '05',
    icon: 'icon-reintegration',
    title: 'Reintegration',
    body: 'Close with a gentle transition to reconnect with your surroundings, allow the effects of the practice to settle, and carry a renewed sense of calm into the days ahead',
  },
] as const;

export const PATHS = [
  {
    img: 'for-teams-cropped',
    tag: 'Corporate',
    tone: 'corp',
    eyebrow: 'Organizations & Teams',
    title: 'Corporate Wellness',
    body: 'Elevate your company culture through a new generation of team building where wellness and connection come together',
    price: '$280 per participant',
    subline: 'Two hours · optional team-building add-on',
  },
  {
    img: 'somatic-main',
    tag: 'Private Groups',
    tone: 'group',
    eyebrow: '2–24 Participants',
    title: 'Friends, Families & Groups',
    body: 'Ideal for gatherings, birthdays, celebrations, and other special occasions',
    price: '$280 per participant',
    subline: 'Two hours · everything provided',
  },
  {
    img: 'for-individuals-dof',
    tag: '1 : 1',
    tone: 'one',
    eyebrow: 'One-on-One',
    title: 'Private Sessions',
    body: 'Customizable based on individual preferences',
    price: '$340 per session',
    subline: 'Two hours · package of four saves $160',
  },
] as const;

/** Home-page "What's included" — the condensed eight-line version. */
export const INCLUDED_SHORT = [
  'Premium Signature Venue or Private Wellness Lounge — venue rental is included in the package price',
  'Fully guided somatic and mindfulness practices and a sensory connection exercise',
  'Immersive sound session layered with multiple professional-grade sound healing instruments',
  'Educational video about neuroscience and sound benefits',
  'Comfort items and materials: custom-branded cushioned wellness mats, memory-foam cervical pillows, cozy blankets, and eye masks',
  'Intention-setting cards and reflection cards',
  'Refreshments, including water, other beverages and healthy snacks',
  'End-of-session reintegration',
] as const;

/** Experience-page "What's included" — the full nine-line version. */
export const INCLUDED_FULL = [
  'Premium Signature Venue (for 6-24 participants). Features an ample, high-end space with three private gender-inclusive washrooms and kitchen. Venue rental is included in the package price',
  'Private Wellness Lounge (for up to 6 participants). Intimate space that supports a personalized and warm atmosphere. Venue rental is included in the package price and provides exclusive access to both the Arrival Lounge and the Experience Room',
  'Fully guided somatic and mindfulness practices and a sensory connection exercise',
  'Immersive sound session layered with multiple professional-grade sound healing instruments — all sourced from the most internationally recognized makers known for their craftsmanship and acoustic quality',
  'Educational video about neuroscience and sound benefits',
  'Comfort items and materials: elements are provided for all participants and include custom-branded cushioned wellness mats, memory-foam cervical pillows, cozy blankets, and eye masks',
  'Additional Signature Touches: intention-setting cards and reflection cards',
  'Refreshments, including water, other beverages and healthy snacks',
  'End-of-session reintegration',
] as const;

export const BENEFITS_INDIVIDUAL = {
  items: [
    {
      title: 'Rest & Restore',
      body: 'Reduce stress, tension, and emotional fatigue so you can feel more like yourself',
    },
    {
      title: 'Clear & Balanced Mind',
      body: 'Support clearer thinking and greater emotional balance through guided practices',
    },
    {
      title: 'Meaningful Connection',
      body: 'Make unique and unforgettable memories together with friends, family, and loved ones',
    },
  ],
  note: 'Ideal for birthdays, anniversaries, family gatherings, any meaningful occasions, celebrations, or just to treat yourself',
} as const;

export const BENEFITS_TEAMS = {
  items: [
    {
      title: 'Stronger Together',
      body: 'Promote healthier, more engaged, and resilient workplace cultures. Help teams reset, refocus, and strengthen collaboration',
    },
    {
      title: 'Performance and Clarity',
      body: 'Enhance mental clarity and support sustainable performance',
    },
    {
      title: 'Culture that Lasts',
      body: 'An innovative approach for employee well-being that drives connection, collaboration and retention',
    },
  ],
  note: 'A unique and impactful experience for teams, departmental or leadership meetings, employee appreciation and Health & Wellness events',
} as const;

export const GALLERY = [
  { img: 'venue-signature', label: 'Premium Signature Venue' },
  { img: 'venue-bar', label: 'Premium Venue — bar and lounge' },
  { img: 'lounge-private', label: 'Private Wellness Lounge' },
  { img: 'comfort-items', label: 'Comfort items and materials' },
  { img: 'educational-video', label: 'Educational video — neuroscience of sound' },
  { img: 'crystal-bowls', label: 'Crystal singing bowls' },
  { img: 'handpan-closeup', label: 'Handpan' },
  { img: 'drum', label: 'Shamanic drum' },
  { img: 'rainstick', label: 'Rainstick' },
  { img: 'intention-card', label: 'Intention-setting cards' },
  { img: 'signature-cards', label: 'Reflection cards' },
  { img: 'refreshments', label: 'Refreshments' },
] as const;

/**
 * Reviews. Only Serge has a real photo — the rest use an initial monogram.
 * Never substitute a stock or generated face.
 */
export const REVIEWS = [
  {
    name: 'Serge',
    face: 'review-serge',
    meta: 'Private group session',
    text: 'Great experience. Silvana is very knowledgeable, and the way she explains everything is clear and easy to follow. The design, comfort, branded materials, instruments, and visuals were all thoughtfully prepared and arranged. The aroma and ambience also created a truly beautiful setting. I would rate it 10 out of 10.',
  },
  {
    name: 'Matt',
    face: null,
    meta: 'Private group session',
    text: 'Very welcoming and warm atmosphere from start to finish. I was excited about the idea of a full sensory experience, and I loved how every detail was intentionally designed, creating a deeply immersive journey that touched all five senses. Afterward, I felt more connected to my body and more grounded. I left the session feeling calm, relaxed, and happy.',
  },
  {
    name: 'Aldo',
    face: null,
    meta: 'One-on-one session',
    text: 'I really enjoyed the learning experience and the sound bath. I felt lighter after the session, and the vibrations helped bring my body into harmony. I especially connected with the sound of the handpan, which complemented the experience beautifully. I left feeling calmer and more aligned. I would recommend these sessions to anyone looking to feel more grounded, restored, and connected through sound and sensation.',
  },
  {
    name: 'Maya',
    face: null,
    meta: 'Private group session',
    text: 'I loved that there were two thoughtfully designed spaces: one where people could gather, settle in, connect, and enjoy water and snacks before entering the experience, and another dedicated space for meditation, focus, and relaxation, where the session unfolded.',
  },
  {
    name: 'Victoria',
    face: null,
    meta: 'One-on-one session',
    text: 'I loved the combination of different modalities, and I really enjoyed the somatic and mindfulness exercises, and the sound bath. It was so renewing and relaxing. I recommend this experience to anyone looking for a space to deeply reconnect with themselves.',
  },
  {
    name: 'Zainab',
    face: null,
    meta: 'Private group session',
    text: 'Silvana’s grounded, calm, and confident energy is what stood out the most to me. Also, she walked us through every detail with clarity and care. My body felt tired when I arrived after a busy weekend and after the session, I felt light and renewed. I would 100% highly recommend this experience!',
  },
] as const;

export const FAQS = [
  {
    q: 'Do I need any prior experience?',
    a: 'No meditation background is needed. Sessions are intentionally designed to be welcoming and supportive for all levels. Simply come as you are and allow yourself to relax into the experience.',
  },
  {
    q: 'What to expect?',
    a: 'You will be guided through an easy-to-follow somatic exercise, a mindfulness practice, and an immersive sound journey, supported by gentle cues throughout. Time will be provided at the end for integration before you re-enter your day or evening. It is completely normal to feel emotional, moved, or reflective during or after the experience. Any emotions, sensations, or insights that arise are welcome and are a natural part of the process.',
  },
  {
    q: 'How will I feel after the session?',
    a: 'While every experience is unique, many participants report feeling deeply relaxed, grounded, cleared-minded, emotionally lighter, and energetically renewed — often describing it as a full reset for both the mind and body.',
  },
  {
    q: 'What is included?',
    a: 'Each two-hour session combines immersive live sound, guided mindfulness, a somatic practice, and a relaxing atmosphere curated to support nervous system regulation, deep rest, and restoration. It also includes a brief, engaging educational video exploring the neuroscience of sound and its benefits. This modality offers an effortless way to access calm for both experienced meditators and those who find stillness or traditional meditation challenging.',
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
    a: "Life happens, and plans change. If you are unable to attend, please cancel at least 48 hours before the start of your session. Cancellations made with at least 48 hours' notice may be rescheduled once or transferred as a credit toward a future session, subject to availability. Cancellations made with less than 48 hours' notice, or no-shows, will result in the session credit being forfeited. For groups with more than six participants, cancellations must be made 4 calendar days prior to the scheduled reservation.",
  },
] as const;

export const FOUNDER_BIO = [
  'As a Wellness Facilitator with a strong Human Resources background, I help individuals and organizations across Toronto and the GTA reduce stress, restore balance, and enhance overall well-being through curated, immersive sound-based experiences combined with mindfulness wellness experiences.',
  'Unlike many wellness practitioners, I bring over 15 years of experience in Human Resources across recognized private and public-sector organizations and corporations. This background has given me a deep understanding of the demands of fast-paced, high-performance environments, including chronic stress, burnout, mental fatigue, workplace disconnection, and the growing need for sustainable well-being support.',
  'Throughout my career, I witnessed organizations investing heavily in productivity while many employees quietly struggled with anxiety, emotional overload, fatigue, and a lack of meaningful support. Over time, this became deeply personal to me. Meditation, mindfulness, nervous system regulation, somatic practices, and sound healing became transformational tools in my own life.',
  'Through years of dedicated practice and training, I experienced firsthand how intentional wellness modalities can restore clarity, balance, resilience, and healthier ways of living and working. My own journey inspired a deeper calling to support others on their path to greater balance. With intention and purpose, I created this offering to share the modalities I have studied, practiced and integrated to help others pause, reset and return to themselves.',
  'That personal transformation now sits at the heart of my practice. I genuinely love what I do and pour myself into this offering with real passion and authenticity. My mission is to continue creating and facilitating meaningful restorative programs that positively impact people’s mental well-being and emotional regulation. Rooted in purpose and presence, I believe in intentional living, inner alignment, continuous growth, and the power of human potential.',
] as const;

export const CREDENTIALS = [
  {
    title: 'Education & Professional Credentials',
    items: [
      "Bachelor's Degree in Business Administration, BA – WES",
      'Human Resources Management Certificate (Honours) | George Brown College',
      'HR Management Certificate | George Brown College',
      'Practical Management Strategies Certificate | George Brown College',
      'Certified Human Resources Professional and Leader | CHRP & CHRL - HR Professional Association',
    ],
  },
] as const;

export const TRAINING = [
  {
    title: 'Meditation & Mindfulness',
    items: [
      '12+ years of dedicated meditation practices',
      'Meditation Facilitator | Guided meditation for corporate teams and Sahaja Yoga, Toronto',
      'Mindfulness Training Programs through the Mindfulness Clinic',
      'Insight Meditation Practice and Studies with Satipanna Insight Meditation, Toronto',
    ],
  },
  {
    title: 'Somatic Sound',
    items: [
      'Crystal Singing Bowl Sound Therapy & Sound Healing Certificate - 2025',
      'Shamanic Journey Technique | Rhythm of the Earth - 2025',
      'Somatic Sound Solution Program | Jim Donovan - 2023',
      'Drumming Circle | Drum & Soul - ongoing',
    ],
  },
  {
    title: 'Neuroscience',
    items: [
      'Neurotoned Program - Transform your Nervous System - 2025',
      'Neuroscience MAP Method for Transformation | MAP Coaching Institute - 2023',
      'Unlimited Change from the Inside Out | Joe Dispenza - 2019',
    ],
  },
  {
    title: 'Personal Development & Integrative Healing Arts',
    items: [
      'Inner Growth Identity one-year program - Antonio Laguna, Bali - 2025',
      'Etnikas Integrative Medicine Retreat - Cusco, Peru - 2019',
    ],
  },
  {
    title: 'Movement and Embodiment',
    items: [
      'Dancer and former Latin and aerial dance performer with a strong foundation in body awareness, expressive movement and human connection - 15+ years of experience',
      'Ecstatic Dance Toronto (Movement Meditation) - 2026',
    ],
  },
  {
    title: 'Live Music Performances',
    items: [
      'Toronto Zen School Ensemble – Handpan musician and performer - 2025',
      'BUMI Festival - Handpan Performance - 2026',
      'Drum & Soul in Motion - Inner-child handpan-guided meditation - 2025',
    ],
  },
] as const;

export const FOUNDER_CLIENTS =
  'I bring over 15 years of Human Resources and wellness experience across leading organizations, including Metrolinx, Toronto Hydro, Infrastructure Ontario, Mount Sinai Hospital, George Brown College, Magna International, and Bell Canada. I have also provided services to Scotiabank, the University of Toronto, and other organizations.';

export const VENUE_COPY = [
  'A premium venue situated in downtown Toronto, just a couple of minutes walk from Bloor–Yonge subway station, and with easy access to the Don Valley Parkway (DVP).',
  'Ample access to nearby public parking, including multiple Green P and paid parking facilities within a short walking distance.',
] as const;

export const CORPORATE_ADDON_COPY =
  'Includes a 30-minute extension featuring a facilitated activity focused on recognition, values alignment, mindful communication, and team connection —customized to your team’s objectives. Additional $500 per event.';

/**
 * Vimeo IDs. The client labelled the landscape film "change for final".
 *
 * These are embedded behind a poster: the still shows first and the player
 * only replaces it once Vimeo confirms it is ready. Vimeo's Singapore edge was
 * observed returning 400 for every request — its own homepage and login page
 * included — so a whole region can be unable to reach Vimeo while the videos
 * themselves are perfectly healthy. Without the poster those visitors get the
 * browser's broken-file icon.
 */
export const FILM = {
  landscape: '1218205534',
  portrait: '1218205483',
} as const;

/** Shown until the player reports ready, and left in place if it never does. */
export const FILM_POSTER = 'somatic-main';
