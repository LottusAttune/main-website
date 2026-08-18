/**
 * Content for the client's own layout, rebuilt from the Canva deck she sent
 * (LOTUS ATTUNE (MAIN).pdf, 6 pages).
 *
 * Her wording is reproduced exactly, including the typos in the original
 * ("greate", "Meaninful", "Togheter", "tothether", "impactul", "sort walking
 * distance", "cointainer", "know for their craftsmanship", "oferred",
 * "Cancelation"). They are marked below so they can be corrected in one pass
 * once she confirms — but nothing was silently reworded.
 */

export const SILVANA_NAV = [
  { label: 'Home', href: '/silvana' },
  { label: 'Benefits', href: '/silvana/benefits' },
  { label: 'The Experience', href: '/silvana/experience' },
  { label: 'What is Included', href: '/silvana/included' },
  { label: 'Founder', href: '/silvana/founder' },
  { label: 'Offerings', href: '/silvana/offerings' },
] as const;

export const SILVANA_HOME = {
  headline: 'Reset. Align. Thrive',
  sub: 'An immersive wellness experience designed to support relaxation, nervous system regulation and deep inner connection',
  videoCaption: 'The Lotus Attune Experience in 3 minutes',
  videoSub: 'Immersive Soma Sound',
  reviewsHeading: 'Client Reviews',
  faqHeading: 'Frequently Asked Questions',
} as const;

export const SILVANA_BENEFITS = {
  heading: 'BENEFITS',
  intro:
    'Guided by a passion for wellness and sustainable well-being, Lotus Attune supports individuals and organizations through curated restorative experiences that include a journey of sound, mindfulness, somatic practices, and neuroscience-informed education',
  individuals: {
    title: 'For Individuals',
    lede: 'Create space to reset, recharge, and reconnect from within.',
    image: 'for-individuals',
    points: [
      {
        title: 'Rest & Restore',
        body: 'Reduce stress, tension, and emotional fatigue so you can feel more like yourself',
      },
      {
        // sic: "greate" in the original
        title: 'Clear & Balanced Mind',
        body: 'Support clearer thinking and greate emotional balance through guided practices',
      },
      {
        // sic: "Meaninful" in the original
        title: 'Meaninful Connection',
        body: 'Make unique and unforgettable memories together with friends, family, and loved ones',
      },
    ],
    closer:
      'Ideal for birthdays, anniversaries, family gatherings, any meaningful occasions, celebrations, or just to treat yourself',
  },
  teams: {
    title: 'For Teams & Organizations',
    // sic: "tothether" in the original
    lede: 'Elevate your company culture through a new generation of team building where wellness and connection come tothether',
    image: 'for-teams',
    points: [
      {
        // sic: "Togheter" in the original
        title: 'Stronger Togheter',
        body: 'Promote healthier, more engaged, and resilient workplace cultures. Help teams reset, refocus, and strengthen collaboration',
      },
      {
        title: 'Performance and clarity',
        body: 'Enhance mental clarity and support sustainable performance',
      },
      {
        title: 'Culture that last',
        body: 'An innovative approach for employee well-being that drives connection, collaboration and retention',
      },
    ],
    // sic: "impactul" in the original
    closer:
      'A unique and impactul experience for teams, departmental or leadership meetings, employee appreciation and Health & Wellness events',
  },
} as const;

export const SILVANA_EXPERIENCE = {
  heading: 'THE EXPERIENCE',
  intro:
    'Each session brings together five carefully curated components in one seamless offering that supports deep relaxation, nervous system regulation, and sustainable well-being',
  components: [
    {
      icon: 'icon-neuroscience',
      title: 'Neuroscience Education',
      body: 'Begin with a brief, engaging video exploring the science and benefits of sound-based healing practices',
    },
    {
      icon: 'icon-senses',
      title: 'Intention and Sensory Connection',
      body: 'Set a meaningful intention through gratitude, reflection, and an exercise that engages the five senses and facilitates present-moment awareness',
    },
    {
      icon: 'icon-practice',
      title: 'Guided Restorative Practice',
      body: 'Move through an easy-to-follow somatic technique and a mindfulness exercise designed to release tension and prepare the body for deeper immersion and connection',
    },
    {
      icon: 'icon-sound',
      title: 'Immersive Sound',
      body: 'Experience a peaceful, layered soundscape featuring live crystal singing bowls, calming handpan melodies, organic African shakers, grounding shamanic drum rhythms, and other therapeutic instruments — designed to further promote relaxation, stress relief, clarity, and alignment with your authentic self',
    },
    {
      // sic: "settle." mid-sentence in the original
      icon: 'icon-reintegration',
      title: 'Reintegration',
      body: 'Close with a gentle transition to reconnect with your surroundings, allow the effects of the practice to settle. and carry a renewed sense of calm into the days ahead',
    },
  ],
  panelTitle: 'A Journey to Reset, Align and Thrive | Everything Curated into One Offering',
  // sic: "cointainer" in the original
  panelBody:
    'More than a traditional sound bath, this all-in-one holistic wellness journey combines restorative and transformational modalities within one cohesive, fully guided experience. Every element is intentionally selected and sequenced to create meaningful impact and a supportive cointainer for self-connection, restore inner balance, and feel renewed and empowered',
} as const;

export const SILVANA_INCLUDED = {
  heading: 'WHAT IS INCLUDED',
  intro:
    'Two-hour transformative journey included in all offerings (Private sessions, groups and organizations)',
  items: [
    {
      image: 'venue-signature',
      body: 'Premium Signature Venue (for 6-24 participants). Features an ample, high-end space with three private gender-inclusive washrooms and kitchen. Venue rental is included in the package price',
    },
    {
      image: 'lounge-private',
      body: 'Private Wellness Lounge (for up to 6 participants). Intimate space that supports a personalized and warm atmosphere. Venue rental is included in the package price and provides exclusive access to both the Arrival Lounge and the Experience Room',
    },
    {
      image: 'somatic-practice',
      body: 'Fully guided somatic and mindfulness practices and a sensory connection exercise',
    },
    {
      // sic: "know for their craftsmanship" in the original
      image: 'crystal-bowls',
      body: 'Immersive sound session layered with multiple professional-grade sound healing instruments — all sourced from the most internationally recognized makers know for their craftsmanship and acoustic quality',
    },
    {
      image: 'educational-video',
      body: 'Educational video about neuroscience and sound benefits',
    },
    {
      image: 'handpan-closeup',
      body: 'End-of-session reintegration',
    },
    {
      image: 'comfort-items',
      body: 'Comfort items and materials: elements are provided for all participants and include custom-branded cushioned wellness mats, memory-foam cervical pillows, cozy blankets, and eye masks',
    },
    {
      image: 'refreshments',
      body: 'Refreshments, including water, other beverages and healthy snacks',
    },
    {
      image: 'signature-cards',
      body: 'Additional Signature Touches: intention-setting cards and reflection cards',
    },
  ],
} as const;

export const SILVANA_FOUNDER = {
  heading: 'ABOUT THE FOUNDER',
  paragraphs: [
    'As a Wellness Facilitator with a strong Human Resources background, I help individuals and companies across Toronto and the GTA reduce stress, restore balance, and enhance overall well-being through curated, immersive sound-based experiences combined with mindfulness and wellness practices.',
    'Unlike many wellness practitioners, I bring over 15 years of experience in Human Resources across recognized private and public-sector organizations. This background has given me a deep understanding of fast-paced, high-performance environments, including chronic stress, burnout, mental fatigue, workplace disconnection, and the growing need for effective, holistic solutions.',
    'Throughout my career, I witnessed organizations investing heavily in productivity while many employees quietly struggled with anxiety, emotional overload, fatigue, and a lack of sustainable support. Over time, this became deeply personal. Meditation, mindfulness, nervous system regulation, somatic practices, and sound healing became transformational tools in my own life, helping restore clarity, resilience, and healthier ways of living.',
    'My journey inspired a deeper calling to support others. With intention and purpose, I created this offering to share the modalities I have studied, practiced and integrated to help people pause, reset and return to themselves. I genuinely love what I do and bring real passion and authenticity to every experience. My mission is to facilitate meaningful restorative programs that positively impact mental well-being and emotional regulation, grounded in intentional living, inner alignment, and a deep belief in the power of human potential.',
  ],
  quote: [
    'I bridge the gap between performance and restoration,',
    'productivity and well-being, and',
    'excellence and human connection',
  ],
  trainingHeading: 'TRAINING & DEVELOPMENT IN RESTORATIVE WELLNESS PRACTICES',
  credentialsHeading: 'EDUCATION & PROFESSIONAL CREDENTIALS',
  // sic: lowercase "human Resources" in the original
  credentialsBody:
    'I bring over 15 years of human Resources and wellness experience across leading organizations, including Metrolinx, Toronto Hydro, Infrastructure Ontario, Mount Sinai Hospital, George Brown College, Magna International, and Bell Canada. I have also provided services to Scotiabank, the University of Toronto, and other organizations.',
  handpanLink: 'Explore My Handpan Sounds',
} as const;

export const SILVANA_OFFERINGS = {
  heading: 'OFFERINGS',
  intro:
    'For individuals, private gatherings, organizations and teams, all sessions are offered in a two-hour format',
  group: {
    panelTitle: ['GROUP BOOKINGS', '&', 'CORPORATE WELLNESS'],
    panelNote: '2–24 participants per session',
    blocks: [
      {
        title: 'FOR FRIENDS, FAMILIES, COUPLES & GROUPS',
        body: 'Ideal for gatherings, birthdays, celebrations, and other special occasions.',
      },
      {
        // sic: "oferred" in the original
        title: 'FOR ORGANIZATIONS & CORPORATE TEAMS',
        body: 'Whether oferred as a one-time event, or as a monthly or quarterly team reset, it creates unique, meaningful, and memorable experiences that bring people together',
      },
    ],
    addonLabel: 'Optional Corporate Add-on:',
    addonBody:
      'customized mindful team-building activity Includes a 30-minute extension featuring a facilitated activity focused on recognition, values alignment, mindful communication, and team connection—customized to your team’s objectives. Additional $500 per event.',
    price: '$280 per participant',
  },
  private: {
    panelTitle: ['PRIVATE', 'SESSIONS'],
    title: 'One-on-One',
    lines: [
      'Customizable based on individual preferences',
      'Regular participation helps deepen, reinforce, and sustain the benefits over time',
    ],
    price: '$340 per session',
    packageLine: 'Package of four sessions: $1,200 – save $160',
  },
} as const;

export const SILVANA_FOOTER = {
  wordmark: 'LOTUS ATTUNE',
  contactHeading: 'Contact Us',
  email: 'info@LotusAttune.com',
  phone: '416-871-5610',
  locationLabel: 'Location:',
  location:
    'premium venue situated in downtown Toronto, just a couple of minutes walk from Bloor–Yonge subway station, and with easy access to the Don Valley Parkway (DVP).',
  // sic: "a sort walking distance" in the original
  parking:
    'Ample access to nearby public parking, including multiple Green P and paid parking facilities within a sort walking distance.',
  socialHeading: 'Get Social',
} as const;
