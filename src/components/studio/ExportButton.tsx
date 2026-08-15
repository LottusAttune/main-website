'use client';

import { downloadCsv, type CsvColumn } from '@/lib/csv';
import styles from './studio.module.css';

type Props<T> = {
  filename: string;
  rows: readonly T[];
  columns: CsvColumn<T>[];
  label?: string;
};

/** Downloads the current table as a spreadsheet. Opens straight in Excel. */
export function ExportButton<T>({ filename, rows, columns, label }: Props<T>) {
  return (
    <button
      type="button"
      className={`btn btn--outline ${styles.smallBtn}`}
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows, columns)}
    >
      {label ?? 'Export to Excel'}
    </button>
  );
}
