import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';

export type LegalSection = { title: string; paragraphs: string[] };

/** Plain, readable policy page in the site's own type and spacing. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteNav />
      <Reveal />
      <main>
        <section
          style={{
            padding: 'clamp(20px, 3vw, 28px) var(--space-gutter) clamp(48px, 6vw, 80px)',
            maxWidth: 'var(--width-prose-narrow)',
            margin: '0 auto',
          }}
          aria-labelledby="legal-heading"
        >
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            {eyebrow}
          </div>
          <h1
            id="legal-heading"
            className="display"
            style={{ fontSize: 'clamp(26px, 3.4vw, 44px)', lineHeight: 1.14, margin: '0 0 10px' }}
          >
            {title}
          </h1>
          <p className="lede" style={{ fontSize: 15.5, lineHeight: 1.65, marginBottom: 6 }}>
            {intro}
          </p>
          <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--color-muted)' }}>
            Last updated {updated}
          </p>

          {sections.map((section) => (
            <section key={section.title} style={{ marginBottom: 30 }}>
              <h2
                className="display"
                style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', lineHeight: 1.2, margin: '0 0 10px' }}
              >
                {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="body" style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 10 }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
