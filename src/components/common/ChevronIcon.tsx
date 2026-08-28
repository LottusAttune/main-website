type Props = {
  className?: string;
};

/** A wide, soft-stroke chevron - used wherever clicking a text label reveals
    more copy (footer venue details, Benefits panel items), as opposed to the
    plus/minus "sign" used for the FAQ-style accordions. */
export function ChevronIcon({ className }: Props) {
  return (
    <svg
      width="11"
      height="7"
      viewBox="0 0 11 7"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 1L5.5 5.5L10 1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
