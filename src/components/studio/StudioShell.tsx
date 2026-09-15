'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { asset } from '@/lib/images';
import type { SiteSettings } from '@/lib/settings';
import { SITE } from '@/lib/site';
import { isOverdue, type StudioData } from '@/lib/pipeline';
import { Bookings } from './panels/Bookings';
import { Clients } from './panels/Clients';
import { DiscoveryCalls } from './panels/DiscoveryCalls';
import { GiftCards } from './panels/GiftCards';
import { Invoices } from './panels/Invoices';
import { Leads } from './panels/Leads';
import { Reviews } from './panels/Reviews';
import { Settings } from './panels/Settings';
import { Today } from './panels/Today';
import styles from './studio.module.css';

export type ViewKey =
  | 'today'
  | 'leads'
  | 'bookings'
  | 'invoices'
  | 'gifts'
  | 'calls'
  | 'clients'
  | 'reviews'
  | 'settings';

type Props = {
  data: StudioData;
  settings: SiteSettings;
  databaseReady: boolean;
};

export function StudioShell({ data, settings, databaseReady }: Props) {
  const [view, setView] = useState<ViewKey>('today');
  const mark = asset('logo-circle');

  const openLeads = data.leads.filter(
    (lead) => lead.status === 'new_enquiry' || lead.status === 'contacted'
  ).length;
  const openInvoices = data.documents.filter(
    (d) => d.kind === 'invoice' && (d.status === 'sent' || d.status === 'draft')
  );
  const overdue = openInvoices.filter((d) => isOverdue(d)).length;
  const upcoming = data.bookings.filter(
    (b) => b.status === 'booked' && b.sessionDate && b.sessionDate >= new Date().toISOString().slice(0, 10)
  ).length;
  const giftsToDo = data.giftCards.filter((g) => g.status === 'requested').length;

  const nav: Array<{ key: ViewKey; label: string; count?: number; alert?: boolean }> = [
    { key: 'today', label: 'Today' },
    { key: 'leads', label: 'Leads', count: openLeads },
    { key: 'bookings', label: 'Bookings', count: upcoming },
    { key: 'invoices', label: 'Invoices', count: openInvoices.length, alert: overdue > 0 },
    { key: 'gifts', label: 'Gift cards', count: giftsToDo },
    { key: 'calls', label: 'Discovery calls', count: data.discoveryCalls.filter((c) => c.status !== 'cancelled' && c.callDate >= new Date().toISOString().slice(0, 10)).length },
    { key: 'clients', label: 'Clients', count: data.clients.length },
    { key: 'reviews', label: 'Reviews' },
    { key: 'settings', label: 'Settings' },
  ];

  const HEADINGS: Record<ViewKey, { title: string; context: string }> = {
    today: { title: 'Today', context: 'What needs you' },
    leads: { title: 'Leads', context: `${openLeads} awaiting a reply` },
    bookings: { title: 'Bookings', context: `${upcoming} upcoming` },
    invoices: {
      title: 'Invoices',
      context: overdue > 0 ? `${overdue} overdue` : `${openInvoices.length} open`,
    },
    gifts: { title: 'Gift cards', context: `${giftsToDo} to issue` },
    calls: { title: 'Discovery calls', context: `${data.discoveryCalls.length} booked` },
    clients: { title: 'Clients', context: `${data.clients.length} total` },
    reviews: {
      title: 'Reviews',
      context: `${data.reviews.filter((r) => r.isPublished).length} showing`,
    },
    settings: { title: 'Settings', context: 'Pricing, documents, payments' },
  };

  const navButtons = nav.map((item) => (
    <button
      key={item.key}
      type="button"
      aria-current={view === item.key ? 'page' : undefined}
      className={`${styles.navRow} ${view === item.key ? styles.navRowOn : ''}`}
      onClick={() => {
        setView(item.key);
        window.scrollTo({ top: 0 });
      }}
    >
      <span>{item.label}</span>
      {item.count !== undefined && item.count > 0 ? (
        <span
          className={styles.badge}
          style={item.alert ? { background: 'var(--status-alert-bg)', color: 'var(--status-alert)' } : undefined}
        >
          {item.count}
        </span>
      ) : null}
    </button>
  ));

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Studio sections">
        <div className={styles.brand}>
          <Image src={mark.src} alt="" width={40} height={40} className={styles.brandMark} />
          <span className={styles.brandWord}>
            LOTUS ATTUNE
            <span className={styles.brandSub}>Studio</span>
          </span>
        </div>

        <div className={styles.navList}>{navButtons}</div>

        <div className={styles.sidebarFoot}>
          <Link href="/" className={`btn btn--outline ${styles.footLink}`}>
            View website
          </Link>
          <form action="/api/studio/logout" method="post">
            <button type="submit" className={`btn btn--outline ${styles.footLink}`} style={{ width: '100%' }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <header className={styles.topbar}>
        <div className={styles.topbarRow}>
          <span className={styles.topbarBrand}>
            <Image src={mark.src} alt="" width={30} height={30} className={styles.brandMark} />
            STUDIO
          </span>
          <span className={styles.topbarLinks}>
            <Link href="/" className={styles.topbarLink}>Site</Link>
            <form action="/api/studio/logout" method="post" style={{ display: 'inline' }}>
              <button type="submit" className={styles.topbarLink}>Sign out</button>
            </form>
          </span>
        </div>
        <nav className={styles.tabStrip} aria-label="Studio sections">{navButtons}</nav>
      </header>

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

        {view === 'today' ? <Today data={data} onNavigate={setView} /> : null}
        {view === 'leads' ? (
          <Leads
            leads={data.leads}
            documents={data.documents}
            activity={data.activity}
            integrations={data.integrations}
            business={settings.business}
          />
        ) : null}
        {view === 'bookings' ? (
          <Bookings
            bookings={data.bookings}
            documents={data.documents}
            integrations={data.integrations}
            business={settings.business}
          />
        ) : null}
        {view === 'invoices' ? (
          <Invoices
            documents={data.documents}
            payments={data.payments}
            integrations={data.integrations}
          />
        ) : null}
        {view === 'gifts' ? (
          <GiftCards cards={data.giftCards} documents={data.documents} integrations={data.integrations} />
        ) : null}
        {view === 'calls' ? <DiscoveryCalls calls={data.discoveryCalls} /> : null}
        {view === 'clients' ? <Clients clients={data.clients} /> : null}
        {view === 'reviews' ? <Reviews reviews={data.reviews} /> : null}
        {view === 'settings' ? <Settings settings={settings} integrations={data.integrations} /> : null}
      </main>
    </div>
  );
}
