'use client';

import { useState } from 'react';

import type { FeedbackNote } from '@/lib/pipeline';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';

/**
 * The client's review notes, grouped by page.
 *
 * The Copy button produces a single markdown brief — that is the artefact you
 * hand straight to Claude to make the changes.
 */
export function Feedback({ notes }: { notes: FeedbackNote[] }) {
  const { run, error } = useStudioAction();
  const [copied, setCopied] = useState('');
  const [showDone, setShowDone] = useState(false);

  const visible = showDone ? notes : notes.filter((n) => n.status === 'open');

  const byPath = new Map<string, FeedbackNote[]>();
  for (const note of visible) {
    const list = byPath.get(note.path) ?? [];
    list.push(note);
    byPath.set(note.path, list);
  }

  const copyBrief = async () => {
    const lines = ['# Lotus Attune — client feedback', ''];
    for (const [path, list] of byPath) {
      lines.push(`## ${path}`, '');
      list.forEach((n, i) => {
        lines.push(`${i + 1}. ${n.note}`);
        if (n.section) lines.push(`   - section: ${n.section}`);
        if (n.context) lines.push(`   - on screen: "${n.context}"`);
        lines.push(`   - element: \`${n.selector}\``);
        lines.push('');
      });
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(`Copied ${visible.length} notes.`);
    } catch {
      setCopied('Could not copy automatically.');
    }
  };

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      {notes.length === 0 ? (
        <div className={styles.empty}>
          No feedback yet. Send the client her review link and her notes land
          here.
        </div>
      ) : (
        <>
          <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
            <button type="button" className="btn btn--dark" onClick={copyBrief}>
              Copy as brief
            </button>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              onClick={() => setShowDone((v) => !v)}
            >
              {showDone ? 'Hide done' : 'Show done'}
            </button>
            {copied ? <span className={styles.savedNote}>{copied}</span> : null}
          </div>

          {[...byPath.entries()].map(([path, list]) => (
            <section key={path}>
              <h3 className={styles.sectionTitle}>{path}</h3>
              <div className={styles.reviewGrid}>
                {list.map((note) => (
                  <div key={note.id} className={`card ${styles.reviewCard}`}>
                    <div className={styles.reviewHead}>
                      <span
                        className={`${styles.pill} ${
                          note.status === 'open'
                            ? styles.pillPending
                            : styles.pillSuccess
                        }`}
                      >
                        {note.status}
                      </span>
                      <span className={styles.reviewName}>
                        {new Date(note.createdAt).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className={styles.reviewBody}>{note.note}</p>
                    {note.section ? (
                      <p className={styles.priceNote} style={{ marginBottom: 4 }}>
                        Section: {note.section}
                      </p>
                    ) : null}
                    {note.context ? (
                      <p className={styles.priceNote} style={{ marginBottom: 8 }}>
                        On screen: “{note.context}”
                      </p>
                    ) : null}
                    <code className={styles.codeName} style={{ fontSize: 11.5 }}>
                      {note.selector}
                    </code>
                    <div className={styles.reviewActions}>
                      <button
                        type="button"
                        className={`btn btn--outline ${styles.smallBtn}`}
                        onClick={() =>
                          void run({
                            action: 'setFeedbackStatus',
                            id: note.id,
                            status: note.status === 'open' ? 'done' : 'open',
                          })
                        }
                      >
                        {note.status === 'open' ? 'Mark done' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
