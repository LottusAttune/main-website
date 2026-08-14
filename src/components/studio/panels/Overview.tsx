'use client';

import Image from 'next/image';

import { asset } from '@/lib/images';
import { money } from '@/lib/site';
import type { StudioData } from '@/lib/pipeline';
import styles from '../studio.module.css';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDay(iso: string | null): string {
  if (!iso) return 'date to confirm';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export function Overview({ data }: { data: StudioData }) {
  const now = new Date();
  const mark = asset('logo-circle');

  const openLeads = data.leads.filter(
    (lead) => lead.status === 'new_enquiry' || lead.status === 'contacted'
  );
  const booked = data.leads.filter(
    (lead) => lead.status === 'booked' || lead.status === 'complete'
  );
  const bookedValue = booked.reduce((total, lead) => total + lead.total, 0);
  const liveGiftValue = data.giftCards
    .filter((card) => card.status !== 'redeemed' && card.status !== 'archived')
    .reduce((total, card) => total + card.total, 0);

  const upcoming = data.bookings
    .filter((b) => !b.sessionDate || b.sessionDate >= now.toISOString().slice(0, 10))
    .slice(0, 6);
  const nextSession = upcoming[0];

  const stats = [
    {
      label: 'Open leads',
      value: String(openLeads.length),
      note: 'Awaiting your reply',
    },
    {
      label: 'Sessions booked',
      value: String(booked.length),
      note: 'Confirmed and pending',
    },
    { label: 'Booked value', value: money(bookedValue), note: 'All time' },
    {
      label: 'Gift cards live',
      value: money(liveGiftValue),
      note: 'Unredeemed balance',
    },
  ];

  return (
    <>
      <div className={styles.welcome}>
        <Image
          src={mark.src}
          alt=""
          width={64}
          height={64}
          className={styles.welcomeMark}
        />
        <div style={{ minWidth: 0 }}>
          <div className={styles.welcomeDate}>
            {now.toLocaleDateString('en-CA', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h2 className={styles.welcomeGreeting}>
            {greeting(now.getHours())}, Silvana
          </h2>
          <p className={styles.welcomeLine}>
            {openLeads.length === 0
              ? 'No enquiries are waiting on a reply.'
              : `${openLeads.length} ${openLeads.length === 1 ? 'enquiry needs' : 'enquiries need'} a reply.`}{' '}
            {nextSession
              ? `Next session: ${nextSession.name} on ${formatDay(nextSession.sessionDate)}.`
              : 'No sessions are booked yet.'}
          </p>
        </div>
      </div>

      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={`card ${styles.stat}`}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statNote}>{stat.note}</div>
          </div>
        ))}
      </div>

      <h3 className={styles.sectionTitle}>Upcoming sessions</h3>
      {upcoming.length === 0 ? (
        <div className={styles.empty}>No sessions booked yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date &amp; time</th>
                <th>Client</th>
                <th>Format</th>
                <th>Venue</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    {formatDay(booking.sessionDate)}
                    {booking.sessionTime ? ` · ${booking.sessionTime}` : ''}
                  </td>
                  <td>{booking.name}</td>
                  <td>
                    {booking.participants === 1
                      ? 'One-on-one'
                      : `${booking.participants} participants`}
                  </td>
                  <td>{booking.venue}</td>
                  <td className={styles.numeric}>{money(booking.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className={styles.sectionTitle}>New enquiries</h3>
      {openLeads.length === 0 ? (
        <div className={styles.empty}>Nothing waiting on a reply.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Type</th>
                <th>Participants</th>
                <th>Value</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {openLeads.slice(0, 8).map((lead) => (
                <tr key={lead.id}>
                  <td>
                    {new Date(lead.createdAt).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td>{lead.name}</td>
                  <td>{lead.type}</td>
                  <td>{lead.participants}</td>
                  <td className={styles.numeric}>{money(lead.total)}</td>
                  <td>
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
