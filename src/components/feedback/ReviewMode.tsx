'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  REVIEW_PARAM,
  REVIEW_SESSION_KEY,
  REVIEW_STORAGE_KEY,
  contextFor,
  cssPathFor,
  notesToMarkdown,
  type ReviewNote,
} from '@/lib/review-mode';
import styles from './ReviewMode.module.css';

type Pending = {
  selector: string;
  context: string;
  xPercent: number;
  yPercent: number;
  pageX: number;
  pageY: number;
};

/**
 * The topmost page element at a point, ignoring review mode's own chrome.
 *
 * The picking overlay covers the viewport, so a naive elementFromPoint would
 * return the overlay and every note would be attached to it.
 */
function pageElementAt(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  return (
    stack.find(
      (el) => !el.closest('[data-review-ui]') && el !== document.documentElement
    ) ?? null
  );
}

function loadNotes(): ReviewNote[] {
  try {
    const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReviewNote[]) : [];
  } catch {
    return [];
  }
}

/**
 * Review mode.
 *
 * Opened with `/?review=<token>`, it turns the live site into something the
 * client can annotate: click a spot, type what should change, done. No
 * screenshots, no describing where things are.
 *
 * Notes are written to localStorage the moment they are typed and only then
 * sent to the server, so a dropped connection or an unconfigured database can
 * never lose what she wrote — the Copy button is always a way out.
 */
export function ReviewMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState(false);
  const [token, setToken] = useState('');
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [showList, setShowList] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [pins, setPins] = useState<Record<string, { top: number; left: number }>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The token arrives once in the URL, then persists for the session so she can
  // navigate the site normally without carrying the query string around.
  useEffect(() => {
    const fromUrl = searchParams.get(REVIEW_PARAM);
    const stored = sessionStorage.getItem(REVIEW_SESSION_KEY);
    const value = fromUrl ?? stored;
    if (!value) return;
    if (fromUrl) sessionStorage.setItem(REVIEW_SESSION_KEY, fromUrl);
    setToken(value);
    setActive(true);
    setNotes(loadNotes());
  }, [searchParams]);

  const persist = useCallback((next: ReviewNote[]) => {
    setNotes(next);
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing with storage disabled — the notes still live in state
      // for this session and Copy still works.
    }
  }, []);

  // Highlight whatever is under the cursor while picking.
  useEffect(() => {
    if (!picking) {
      setHover(null);
      document.documentElement.removeAttribute('data-review-picking');
      return;
    }
    document.documentElement.setAttribute('data-review-picking', 'true');
    const move = (e: MouseEvent) => {
      const el = pageElementAt(e.clientX, e.clientY);
      if (!el) return;
      setHover(el.getBoundingClientRect());
    };
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mousemove', move);
      document.documentElement.removeAttribute('data-review-picking');
    };
  }, [picking]);

  // Click anywhere to drop a pin.
  useEffect(() => {
    if (!picking) return;

    const click = (e: MouseEvent) => {
      const target = pageElementAt(e.clientX, e.clientY);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = target.getBoundingClientRect();
      setPending({
        selector: cssPathFor(target),
        context: contextFor(target),
        xPercent: rect.width
          ? Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
          : 50,
        yPercent: rect.height
          ? Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
          : 50,
        pageX: e.clientX + window.scrollX,
        pageY: e.clientY + window.scrollY,
      });
      setPicking(false);
      setDraft('');
    };

    document.addEventListener('click', click, true);
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicking(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', escape);
    };
  }, [picking]);

  useEffect(() => {
    if (pending) inputRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    if (!active) return;

    const place = () => {
      const next: Record<string, { top: number; left: number }> = {};
      for (const note of notes) {
        if (note.path !== pathname) continue;
        let el: Element | null = null;
        try {
          el = document.querySelector(note.selector);
        } catch {
          el = null;
        }
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        next[note.localId] = {
          top: rect.top + window.scrollY + (rect.height * note.yPercent) / 100,
          left: rect.left + window.scrollX + (rect.width * note.xPercent) / 100,
        };
      }
      setPins(next);
    };

    place();
    // Images and fonts settle after first paint, so re-measure once things move.
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [active, notes, pathname]);

  const saveNote = () => {
    if (!pending || !draft.trim()) return;
    const note: ReviewNote = {
      localId: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      path: pathname,
      selector: pending.selector,
      context: pending.context,
      xPercent: pending.xPercent,
      yPercent: pending.yPercent,
      viewportW: window.innerWidth,
      note: draft.trim(),
      createdAt: new Date().toISOString(),
      sent: false,
    };
    persist([...notes, note]);
    setPending(null);
    setDraft('');
    setStatus('Saved. Keep going, then press Send when you are done.');
  };

  const send = async () => {
    const unsent = notes.filter((n) => !n.sent);
    if (unsent.length === 0) {
      setStatus('Everything has been sent already.');
      return;
    }
    setStatus('Sending…');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notes: unsent }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'Could not send.');
      }
      const sentIds = new Set(unsent.map((n) => n.localId));
      persist(
        notes.map((n) => (sentIds.has(n.localId) ? { ...n, sent: true } : n))
      );
      setStatus(`Sent ${unsent.length} note${unsent.length === 1 ? '' : 's'}. Thank you.`);
    } catch (error) {
      setStatus(
        `${error instanceof Error ? error.message : 'Could not send.'} Your notes are safe — press Copy and paste them to Nevin.`
      );
    }
  };

  const copy = async () => {
    const markdown = notesToMarkdown(notes);
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus('Copied. Paste it into an email or WhatsApp.');
    } catch {
      setStatus('Could not copy automatically — select the list and copy it.');
    }
  };

  if (!active) return null;

  const unsentCount = notes.filter((n) => !n.sent).length;
  const onThisPage = notes.filter((n) => n.path === pathname);

  return (
    <>
      <div data-review-ui className={`${styles.frame} ${picking ? styles.picking : ''}`} />

      {picking && hover ? (
        <div
          data-review-ui
          className={styles.highlight}
          style={{
            top: hover.top,
            left: hover.left,
            width: hover.width,
            height: hover.height,
          }}
        />
      ) : null}

      {/* Pins for notes left on this page, re-anchored to their element. */}
      {onThisPage.map((note, i) => {
        const at = pins[note.localId];
        if (!at) return null;
        return (
          <button
            key={note.localId}
            type="button"
            data-review-ui
            className={`${styles.pin} ${note.sent ? styles.pinSent : ''}`}
            style={{ top: at.top, left: at.left }}
            title={note.note}
            onClick={() => setShowList(true)}
          >
            <span className={styles.pinNumber}>{i + 1}</span>
          </button>
        );
      })}

      {pending ? (
        <div data-review-ui className={styles.composerWrap} onClick={() => setPending(null)}>
          <div className={styles.composer} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.composerTitle}>What should change here?</h2>
            <p className={styles.composerContext}>
              {pending.context || 'This part of the page'}
            </p>
            <textarea
              ref={inputRef}
              className={styles.composerInput}
              value={draft}
              placeholder="For example: use a different photo here, or make this text shorter."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
                if (e.key === 'Escape') setPending(null);
              }}
            />
            <p className={styles.composerHint}>
              Press ⌘/Ctrl + Enter to save.
            </p>
            <div className={styles.composerActions}>
              <button
                type="button"
                className={styles.barBtn}
                style={{ color: 'var(--color-ink)', borderColor: 'var(--hairline-light-strong)' }}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.barBtn} ${styles.barBtnPrimary}`}
                disabled={!draft.trim()}
                onClick={saveNote}
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showList ? (
        <div data-review-ui className={styles.list}>
          <div className={styles.listTitle}>
            Your notes ({notes.length})
          </div>
          {notes.length === 0 ? (
            <p className={styles.empty}>
              Nothing yet. Press “Add a note”, then click anything on the page.
            </p>
          ) : (
            notes.map((note, i) => (
              <div key={note.localId} className={styles.listItem}>
                {i + 1}. {note.note}
                <span className={styles.listMeta}>
                  {note.path}
                  {note.context ? ` · “${note.context.slice(0, 48)}”` : ''}
                  {note.sent ? ' · sent' : ''}
                </span>
                <button
                  type="button"
                  className={styles.listRemove}
                  onClick={() =>
                    persist(notes.filter((n) => n.localId !== note.localId))
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div data-review-ui className={styles.bar}>
        <span className={styles.barLabel}>Review mode</span>
        <span className={styles.count}>{notes.length}</span>
        <button
          type="button"
          className={`${styles.barBtn} ${picking ? styles.barBtnOn : ''}`}
          onClick={() => setPicking((v) => !v)}
        >
          {picking ? 'Click a spot…' : 'Add a note'}
        </button>
        <button
          type="button"
          className={styles.barBtn}
          onClick={() => setShowList((v) => !v)}
        >
          {showList ? 'Hide list' : 'My notes'}
        </button>
        <button
          type="button"
          className={styles.barBtn}
          disabled={notes.length === 0}
          onClick={copy}
        >
          Copy
        </button>
        <button
          type="button"
          className={`${styles.barBtn} ${styles.barBtnPrimary}`}
          disabled={unsentCount === 0}
          onClick={send}
        >
          Send{unsentCount > 0 ? ` (${unsentCount})` : ''}
        </button>
        {status ? <span className={styles.status}>{status}</span> : null}
      </div>
    </>
  );
}
