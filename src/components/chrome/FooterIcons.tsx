type IconProps = {
  className?: string;
};

export function MailIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 9.4 9.4 0 0 0 3 .48 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 9.4 9.4 0 0 0 .48 3 1 1 0 0 1-.25 1z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Bold, filled "in" letterforms rather than a thin abstract line mark - the
   previous version matched Instagram's icon in outer SVG size but read as
   much smaller/fainter next to its bold filled camera shape. */
export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="3.8" y="9" width="3.6" height="11.2" rx="0.4" />
      <circle cx="5.6" cy="5.1" r="2.1" />
      <path d="M11.2 9h3.5v1.7c.7-1.2 2.1-2 3.9-2 3.2 0 4.6 2 4.6 5.6v5.9h-3.6v-5.3c0-1.8-.6-3-2.2-3-1.2 0-2 .8-2.3 1.6-.1.3-.1.7-.1 1.1v5.6h-3.6V9z" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14.5 21v-7.5h2.5l.4-3H14.5V8.4c0-.9.2-1.5 1.5-1.5h1.6V4.2C17.3 4.1 16.3 4 15.2 4c-2.3 0-3.9 1.4-3.9 4v2.5H8.8v3h2.5V21h3.2z" />
    </svg>
  );
}
