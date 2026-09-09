// Excludes visually ambiguous characters (0/O, 1/I/L) so a code read off a
// printed certificate is never mistaken for a different one.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateGiftCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `LA-${suffix}`;
}
