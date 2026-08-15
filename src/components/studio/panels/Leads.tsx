'use client';

import { useState } from 'react';

import { money } from '@/lib/site';
import { STAGES, type Lead, type StageKey } from '@/lib/pipeline';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const LABELS = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

const COLUMNS = [
  { header: 'Received', value: (l: Lead) => l.createdAt.slice(0, 10) },
  { header: 'Name', value: (l: Lead) => l.name },
  { header: 'Email', value: (l: Lead) => l.email },
  { header: 'Phone', value: (l: Lead) => l.phone ?? '' },
  { header: 'Type', value: (l: Lead) => l.type },
  { header: 'Participants', value: (l: Lead) => l.participants },
  { header: 'Session date', value: (l: Lead) => l.sessionDate ?? '' },
  { header: 'Session time', value: (l: Lead) => l.sessionTime ?? '' },
  { header: 'Value', value: (l: Lead) => l.total },
  { header: 'Stage', value: (l: Lead) => LABELS[l.status] ?? l.status },
];

export function Leads({ leads }: { leads: Lead[] }) {
  const { run, error } = useStudioAction();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageKey | null>(null);

  const move = (id: string, status: StageKey) => {
    void run({ action: 'moveLead', id, status });
  };

  const pipelineValue = leads
    .filter((lead) => lead.status !== 'complete')
    .reduce((total, lead) => total + lead.total, 0);

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
        <ExportButton filename="lotus-leads" rows={leads} columns={COLUMNS} />
      </div>

      <div className={styles.pipelineTotal}>
        <strong>{money(pipelineValue)}</strong> in pipeline across{' '}
        {leads.filter((l) => l.status !== 'complete').length} enquiries
      </div>

      {leads.length === 0 ? (
        <div className={styles.empty}>
          No enquiries yet. Booking requests from the website land here.
        </div>
      ) : (
        <div className={styles.board}>
          {STAGES.map((stage, stageIndex) => {
            const inStage = leads.filter((lead) => lead.status === stage.key);
            const value = inStage.reduce((total, lead) => total + lead.total, 0);

            return (
              <div
                key={stage.key}
                className={`${styles.column} ${overStage === stage.key ? styles.columnOver : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.key);
                }}
                onDragLeave={() => setOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverStage(null);
                  const id =
                    e.dataTransfer.getData('text/plain') || draggingId;
                  if (id) move(id, stage.key);
                  setDraggingId(null);
                }}
              >
                <div className={styles.columnHead}>
                  <span className={styles.columnTitle}>{stage.label}</span>
                  <span className={styles.columnMeta}>
                    {inStage.length}
                    {value > 0 ? ` · ${money(value)}` : ''}
                  </span>
                </div>

                <div className={styles.columnList}>
                  {inStage.length === 0 ? (
                    <div className={styles.dropHint}>Drop here</div>
                  ) : (
                    inStage.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        className={`${styles.leadCard} ${draggingId === lead.id ? styles.leadCardDragging : ''}`}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingId(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverStage(null);
                        }}
                      >
                        <div className={styles.leadTop}>
                          <span className={styles.grip} aria-hidden="true">
                            ⠿
                          </span>
                          <span className={styles.leadName}>{lead.name}</span>
                          <span className={styles.leadValue}>
                            {money(lead.total)}
                          </span>
                        </div>
                        <div className={styles.leadMeta}>
                          {lead.type} ·{' '}
                          {lead.participants === 1
                            ? 'one-on-one'
                            : `${lead.participants} participants`}
                          {lead.sessionDate ? ` · ${lead.sessionDate}` : ''}
                        </div>
                        <div className={styles.leadFoot}>
                          <a
                            className={styles.leadEmail}
                            href={`mailto:${lead.email}`}
                          >
                            {lead.email}
                          </a>
                          {/* Arrow buttons keep the board usable without drag
                              and drop — touch, keyboard, screen readers. */}
                          <span className={styles.stepButtons}>
                            <button
                              type="button"
                              className={styles.stepBtn}
                              aria-label={`Move ${lead.name} back a stage`}
                              disabled={stageIndex === 0}
                              onClick={() =>
                                move(lead.id, STAGES[stageIndex - 1].key)
                              }
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className={styles.stepBtn}
                              aria-label={`Move ${lead.name} forward a stage`}
                              disabled={stageIndex === STAGES.length - 1}
                              onClick={() =>
                                move(lead.id, STAGES[stageIndex + 1].key)
                              }
                            >
                              ›
                            </button>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
