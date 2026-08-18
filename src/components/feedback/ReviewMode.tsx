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
  sectionFor,
  type ReviewNote,
} from '@/lib/review-mode';
import styles from './ReviewMode.module.css';

type Pending = {
  selector: string;
  context: string;
  section: string;
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
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
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

    // A fresh tab, browser or device has no local history, but the notes are
    // already safe in the database — pull them in so pins reappear anywhere.
    fetch(`/api/feedback?token=${encodeURIComponent(value)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ notes?: ReviewNote[] }>) : null))
      .then((data) => {
        if (!data?.notes?.length) return;
        setNotes((current) => {
          const byId = new Map(current.map((n) => [n.localId, n] as const));
          for (const serverNote of data.notes!) {
            byId.set(serverNote.localId, { ...byId.get(serverNote.localId), ...serverNote });
          }
          const merged = Array.from(byId.values());
          try {
            localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // Private browsing with storage disabled — merged state still works this session.
          }
          return merged;
        });
      })
      .catch(() => {
        // Offline or unreachable — whatever was already local still works.
      });
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
        section: sectionFor(target),
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

  /**
   * Pins follow their element.
   *
   * The first version measured once and recalculated only on resize, so any
   * movement the page made on its own — the hero parallax, the reviews
   * carousel, an accordion opening — left the pin behind while its element
   * moved away. Now each pin is measured against its element every frame that
   * something could have shifted, and hidden while its element is off screen.
   */
  useEffect(() => {
    if (!active) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
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
        // Nothing to point at while the element is collapsed or scrolled away.
        if (rect.width === 0 && rect.height === 0) continue;
        const top = rect.top + (rect.height * note.yPercent) / 100;
        const left = rect.left + (rect.width * note.xPercent) / 100;
        if (top < -40 || top > window.innerHeight + 40) continue;

        next[note.localId] = { top, left };
      }

      setPins(next);
    };

    const schedule = () => {
      // requestAnimationFrame is paused while the document is hidden, so fall
      // back to measuring inline — otherwise a pin left in a background tab
      // would still be sitting at a stale position when the tab is reopened.
      if (document.visibilityState !== 'visible') {
        measure();
        return;
      }
      if (frame !== null) return;
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    // Catches movement the page makes on its own — the carousel advancing, an
    // accordion opening, an image finishing loading. Calls measure directly
    // rather than through requestAnimationFrame, which is paused while the
    // document is hidden and would otherwise leave pins unplaced in a
    // background tab.
    const ticker = window.setInterval(measure, 500);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      window.clearInterval(ticker);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active, notes, pathname]);

  const saveNote = () => {
    if (!pending || !draft.trim()) return;
    const note: ReviewNote = {
      localId: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      path: pathname,
      selector: pending.selector,
      context: pending.context,
      section: pending.section,
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
    setStatus('Note saved.');
  };

  /**
   * Notes sync themselves.
   *
   * There is no Send button: the client leaves a note and moves on. Anything
   * that has not reached the server is retried on the next note and on every
   * page load, quietly, with no state for her to manage or misread. Failures
   * are invisible to her — the note is already safe in localStorage and will
   * go up on a later attempt.
   */
  const syncing = useRef(false);

  const flush = useCallback(
    async (current: ReviewNote[], activeToken: string) => {
      if (syncing.current || !activeToken) return;
      const unsent = current.filter((n) => !n.sent);
      if (unsent.length === 0) return;

      syncing.current = true;
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: activeToken, notes: unsent }),
        });
        if (!response.ok) return;
        const sentIds = new Set(unsent.map((n) => n.localId));
        persist(
          current.map((n) => (sentIds.has(n.localId) ? { ...n, sent: true } : n))
        );
      } catch {
        // Offline or unreachable. The next note or the next page load retries.
      } finally {
        syncing.current = false;
      }
    },
    [persist]
  );

  useEffect(() => {
    if (!active || !token) return;
    void flush(notes, token);
  }, [active, token, notes, flush]);

  const startEdit = (note: ReviewNote) => {
    setEditing(note.localId);
    setEditDraft(note.note);
    setShowList(true);
  };

  /** Editing marks the note unsent, so the change syncs over the old one. */
  const commitEdit = () => {
    if (!editing || !editDraft.trim()) return;
    persist(
      notes.map((n) =>
        n.localId === editing
          ? { ...n, note: editDraft.trim(), sent: false }
          : n
      )
    );
    setEditing(null);
    setEditDraft('');
    setStatus('Note updated.');
  };

  /**
   * Removes a note here and on the server.
   *
   * Deleting locally alone was wrong: the note would vanish from her screen
   * but still be sitting in the studio waiting to be actioned.
   */
  const removeNote = async (note: ReviewNote) => {
    persist(notes.filter((n) => n.localId !== note.localId));
    if (editing === note.localId) setEditing(null);
    setStatus('Note removed.');

    if (!note.sent || !token) return;
    try {
      await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, localId: note.localId }),
      });
    } catch {
      // It is gone from her side either way; the studio shows a stale note at
      // worst, which is recoverable. Never surface this to her.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(notesToMarkdown(notes));
      setStatus('Copied. Paste it into an email or WhatsApp.');
    } catch {
      setStatus('Open “My notes” below and copy the list from there.');
    }
  };

  if (!active) return null;

  const onThisPage = notes.filter((n) => n.path === pathname);

  // Grouped by section rather than page — most of a note's context comes from
  // where in the page it sits, and one site has far more sections than pages.
  const grouped: [string, ReviewNote[]][] = [];
  const groupIndex = new Map<string, number>();
  for (const note of notes) {
    const key = note.section || 'General';
    if (!groupIndex.has(key)) {
      groupIndex.set(key, grouped.length);
      grouped.push([key, []]);
    }
    grouped[groupIndex.get(key)!][1].push(note);
  }

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
            onClick={() => startEdit(note)}
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
            Notes ({notes.length})
          </div>
          {notes.length > 0 ? (
            <button
              type="button"
              className={styles.listRemove}
              style={{ color: 'var(--color-gold-text)', marginBottom: 10 }}
              onClick={copy}
            >
              Copy all notes
            </button>
          ) : null}
          {notes.length === 0 ? (
            <p className={styles.empty}>
              Nothing yet. Press “Add a note”, then click anything on the page.
            </p>
          ) : (
            grouped.map(([section, group]) => (
              <div key={section}>
                <div className={styles.listSection}>{section}</div>
                {group.map((note, i) => (
                  <div key={note.localId} className={styles.listItem}>
                    {editing === note.localId ? (
                      <>
                        <textarea
                          className={styles.editInput}
                          value={editDraft}
                          autoFocus
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitEdit();
                            if (e.key === 'Escape') setEditing(null);
                          }}
                        />
                        <div className={styles.listActions}>
                          <button
                            type="button"
                            className={styles.listAction}
                            disabled={!editDraft.trim()}
                            onClick={commitEdit}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.listAction}
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {i + 1}. {note.note}
                        <span className={styles.listMeta}>
                          {note.path}
                          {note.context ? ` · “${note.context.slice(0, 44)}”` : ''}
                        </span>
                        <span className={note.sent ? styles.savedTag : styles.pendingTag}>
                          {note.sent ? 'Saved' : 'Saving…'}
                        </span>
                        <div className={styles.listActions}>
                          <button
                            type="button"
                            className={styles.listAction}
                            onClick={() => startEdit(note)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.listRemove}
                            onClick={() => void removeNote(note)}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
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
        {status ? <span className={styles.status}>{status}</span> : null}
      </div>
    </>
  );
}
