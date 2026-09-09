import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';

import { checkPassword, createSession, isSignedIn, isStudioConfigured } from '@/lib/auth';
import { asset } from '@/lib/images';
import { SITE } from '@/lib/site';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSignedIn()) redirect('/studio');

  const { error } = await searchParams;
  const configured = isStudioConfigured();
  const mark = asset('logo-circle');

  async function signIn(formData: FormData) {
    'use server';

    const password = String(formData.get('password') ?? '');
    if (!isStudioConfigured() || !checkPassword(password)) {
      redirect('/studio/login?error=1');
    }
    await createSession();
    redirect('/studio');
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <Image
          src={mark.src}
          alt=""
          width={56}
          height={56}
          className={styles.mark}
        />
        <div className={styles.eyebrow}>{SITE.name}</div>
        <h1 className={styles.title}>Studio</h1>
        <div className={styles.rule} aria-hidden="true" />

        {configured ? (
          <form action={signIn} className={styles.form}>
            <label className="visually-hidden" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`field field--dark ${error ? 'field--invalid' : ''}`}
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              aria-invalid={error ? 'true' : undefined}
            />
            <button type="submit" className="btn btn--cream btn--wide">
              Sign in
            </button>
            {error ? (
              <p className={styles.error} role="alert">
                That password is not correct.
              </p>
            ) : null}
          </form>
        ) : (
          <p className={styles.note}>
            The studio is not configured yet. Set <code>STUDIO_PASSWORD</code> and{' '}
            <code>SESSION_SECRET</code> in the Vercel project environment
            variables, then redeploy.
          </p>
        )}
      </div>
    </main>
  );
}
