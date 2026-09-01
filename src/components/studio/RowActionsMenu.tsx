'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './studio.module.css';

export type RowMenuItem = {
  label: string;
  onClick: () => void;
  alert?: boolean;
};

/**
 * A compact "⋮" trigger that opens a small dropdown of actions. Portals the
 * menu to document.body and positions it with fixed coordinates taken from
 * the trigger's own bounding rect, so a scrolling ancestor (e.g. a wide
 * table's horizontal-scroll wrapper) can't clip or bury it.
 */
export function RowActionsMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.bottom + 6, left: rect.right - 140 });
          triggerRef.current = event.currentTarget;
          setOpen(true);
        }}
      >
        ⋮
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className={styles.menu}
              role="menu"
              style={{ position: 'fixed', top: pos.top, left: pos.left }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`${styles.menuItem} ${item.alert ? styles.menuItemAlert : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
