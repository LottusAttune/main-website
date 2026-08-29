type Props = {
  className?: string;
};

/** A small signature-like flourish next to a name, in place of a photo
    circle or initial that wouldn't add real information. */
export function Wave({ className }: Props) {
  return (
    <svg
      className={className}
      width="13"
      height="8"
      viewBox="0 0 13 8"
      aria-hidden="true"
    >
      <path
        d="M1 5 C5 1 8 7 12 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
