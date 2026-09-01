'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { asset } from '@/lib/images';
import type { SiteSettings } from '@/lib/settings';
import { SITE } from '@/lib/site';
import type { StudioData } from '@/lib/pipeline';
import { Bookings } from './panels/Bookings';
import { Clients } from './panels/Clients';
import { DiscoveryCalls } from './panels/DiscoveryCalls';
import { GiftCards } from './panels/GiftCards';
import { Leads } from './panels/Leads';
import { Overview } from './panels/Overview';
import { PricingAvailability } from './panels/PricingAvailability';
import { Reviews } from './panels/Reviews';
import styles from './studio.module.css';

type ViewKey =
  | 'overview'
  | 'leads'
  | 'bookings'
  | 'pricing'
  | 'gifts'
  | 'calls'
  | 'reviews'
  | 'clients';

type Props = {
  data: StudioData;
  settings: SiteSettings;
  databaseReady: boolean;
};

export function StudioShell({ data, settings, databaseReady }: Props) {
  const [view, setView] = useState<ViewKey>('overview');
  const mark = asset('logo-circle');

  const openLeads = data.leads.filter(
    (lead) => lead.status === 'new_enquiry' || lead.status === 'contacted'
  ).length;

  const nav: Array<{ key: ViewKey; label: string; count?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'leads', label: 'Leads', count: data.leads.length },
    { key: 'bookings', label: 'Bookings', count: data.bookings.length },
    { key: 'pricing', label: 'Pricing & availability' },
    { key: 'gifts', label: 'Gift cards', count: data.giftCards.length },
    { key: 'calls', label: 'Discovery calls', count: data.discoveryCalls.length },
    { key: 'reviews', label: 'Reviews', count: data.reviews.length },
    { key: 'clients', label: 'Clients', count: data.clients.length },
  ];

  const HEADINGS: Record<ViewKey, { title: string; context: string }> = {
    overview: { title: 'Overview', context: 'Today at a glance' },
    leads: {
      title: 'Leads',
      context: `${openLeads} awaiting a reply`,
    },
    bookings: {
      title: 'Bookings',
      context: `${data.bookings.length} confirmed`,
    },
    pricing: {
      title: 'Pricing & availability',
      context: 'Publishes to the website',
    },
    gifts: { title: 'Gift cards', context: `${data.giftCards.length} issued` },
    calls: {
      title: 'Discovery calls',
      context: `${data.discoveryCalls.length} booked`,
    },
    reviews: {
      title: 'Reviews',
      context: `${data.reviews.filter((r) => r.isPublished).length} showing`,
    },
    clients: { title: 'Clients', context: `${data.clients.length} total` },
  };

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Studio sections">
        <div className={styles.brand}>
          <Image
            src={mark.src}
            alt=""
            width={40}
            height={40}
            className={styles.brandMark}
          />
          <span className={styles.brandWord}>
            LOTUS ATTUNE
            <span className={styles.brandSub}>Studio</span>
          </span>
        </div>

        <div className={styles.navList}>
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={view === item.key ? 'page' : undefined}
              className={`${styles.navRow} ${view === item.key ? styles.navRowOn : ''}`}
              onClick={() => setView(item.key)}
            >
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 ? (
                <span className={styles.badge}>{item.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFoot}>
          <Link href="/v1" className={`btn btn--outline ${styles.footLink}`}>
            View website
          </Link>
          <form action="/api/studio/logout" method="post">
            <button
              type="submit"
              className={`btn btn--outline ${styles.footLink}`}
              style={{ width: '100%' }}
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <div className={styles.headerEyebrow}>{SITE.name}</div>
            <h1 className={styles.headerTitle}>{HEADINGS[view].title}</h1>
            <span className={styles.contextPill}>{HEADINGS[view].context}</span>
          </div>
        </header>

        {!databaseReady ? (
          <div className={styles.notice}>
            No Postgres store is linked yet, so the studio has nothing to read
            and booking requests are being refused rather than lost. Add a
            Postgres store to this project in the Vercel dashboard, run{' '}
            <code>db/schema.sql</code>, and redeploy.
          </div>
        ) : null}

        {view === 'overview' ? <Overview data={data} /> : null}
        {view === 'leads' ? <Leads leads={data.leads} /> : null}
        {view === 'bookings' ? <Bookings bookings={data.bookings} /> : null}
        {view === 'pricing' ? (
          <PricingAvailability settings={settings} />
        ) : null}
        {view === 'gifts' ? <GiftCards cards={data.giftCards} /> : null}
        {view === 'calls' ? (
          <DiscoveryCalls calls={data.discoveryCalls} />
        ) : null}
        {view === 'reviews' ? <Reviews reviews={data.reviews} /> : null}
        {view === 'clients' ? <Clients clients={data.clients} /> : null}
      </main>
    </div>
  );
}
