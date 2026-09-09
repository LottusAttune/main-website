'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { money } from '@/lib/site';
import { formatStudioDate, STAGES, type Lead, type StageKey } from '@/lib/pipeline';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const LABELS = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

const COLUMNS = [
  { header: 'Received', value: (l: Lead) => l.createdAt.slice(0, 10) },
  { header: 'Name', value: (l: Lead) => l.name },
  { header: 'Email', value: (l: Lead) => l.email },
  { header: 'Phone', value: (l: Lead) => l.phone ?? '' },
  { header: 'Company', value: (l: Lead) => l.company ?? '' },
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
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const move = (id: string, status: StageKey) => {
    void run({ action: 'moveLead', id, status });
  };

  const openLead = leads.find((lead) => lead.id === openLeadId) ?? null;

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
                        role="button"
                        tabIndex={0}
                        aria-label={`Open details for ${lead.name}`}
                        className={`${styles.leadCard} ${draggingId === lead.id ? styles.leadCardDragging : ''}`}
                        onClick={() => setOpenLeadId(lead.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenLeadId(lead.id);
                          }
                        }}
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
                        {lead.company || lead.phone ? (
                          <div className={styles.leadMeta}>
                            {[lead.company, lead.phone]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        ) : null}
                        <div className={styles.leadFoot}>
                          <a
                            className={styles.leadEmail}
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                move(lead.id, STAGES[stageIndex - 1].key);
                              }}
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className={styles.stepBtn}
                              aria-label={`Move ${lead.name} forward a stage`}
                              disabled={stageIndex === STAGES.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                move(lead.id, STAGES[stageIndex + 1].key);
                              }}
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

      {openLead ? (
        <LeadDetailModal
          lead={openLead}
          stageIndex={STAGES.findIndex((s) => s.key === openLead.status)}
          onMove={move}
          onClose={() => setOpenLeadId(null)}
        />
      ) : null}
    </>
  );
}

function DetailRow({
  label,
  emphasize,
  children,
}: {
  label: string;
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span
        className={`${styles.detailValue} ${emphasize ? styles.detailValueLarge : ''}`}
      >
        {children}
      </span>
    </div>
  );
}

function LeadDetailModal({
  lead,
  stageIndex,
  onMove,
  onClose,
}: {
  lead: Lead;
  stageIndex: number;
  onMove: (id: string, status: StageKey) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const inPipeline = stageIndex >= 0;

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`${lead.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{lead.name}</div>
            <div className={styles.modalSubtitle}>
              {LABELS[lead.status] ?? lead.status}
            </div>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <DetailRow label="Email">
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
          </DetailRow>
          {lead.phone ? (
            <DetailRow label="Phone">
              <a href={`tel:${lead.phone}`}>{lead.phone}</a>
            </DetailRow>
          ) : null}
          {lead.company ? (
            <DetailRow label="Company">{lead.company}</DetailRow>
          ) : null}
          <DetailRow label="Type">{lead.type}</DetailRow>
          <DetailRow label="Participants">
            {lead.participants === 1
              ? 'One-on-one'
              : `${lead.participants} participants`}
          </DetailRow>
          {lead.sessionDate ? (
            <DetailRow label="Session date">
              {formatStudioDate(lead.sessionDate)}
            </DetailRow>
          ) : null}
          {lead.sessionTime ? (
            <DetailRow label="Session time">
              {lead.sessionTime}
              {lead.sessionTime2 ? ` + ${lead.sessionTime2}` : ''}
            </DetailRow>
          ) : null}
          {lead.teamAddon ? (
            <DetailRow label="Add-on">Team-building</DetailRow>
          ) : null}
          {lead.gratuity > 0 ? (
            <DetailRow label="Gratuity">{money(lead.gratuity)}</DetailRow>
          ) : null}
          <DetailRow label="Value" emphasize>
            {money(lead.total)}
          </DetailRow>
          <DetailRow label="Received">
            {formatStudioDate(lead.createdAt.slice(0, 10))}
          </DetailRow>
        </div>

        {inPipeline ? (
          <div className={styles.modalFoot}>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={stageIndex === 0}
              onClick={() => onMove(lead.id, STAGES[stageIndex - 1].key)}
            >
              ‹ Back a stage
            </button>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={stageIndex === STAGES.length - 1}
              onClick={() => onMove(lead.id, STAGES[stageIndex + 1].key)}
            >
              Forward a stage ›
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
