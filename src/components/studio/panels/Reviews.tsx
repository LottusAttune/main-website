'use client';

import type { ReviewRow } from '@/lib/pipeline';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';

export function Reviews({ reviews }: { reviews: ReviewRow[] }) {
  const { run, error } = useStudioAction();
  const live = reviews.filter((review) => review.isPublished).length;

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      {reviews.length === 0 ? (
        <div className={styles.empty}>
          No reviews stored yet. The six approved reviews currently ship with the
          site itself — add them here to manage them from the studio.
        </div>
      ) : (
        <>
          <div className={styles.reviewCount}>
            {live} of {reviews.length} reviews are showing on the website.
          </div>

          <div className={styles.reviewGrid}>
            {reviews.map((review) => (
              <div key={review.id} className={`card ${styles.reviewCard}`}>
                <div className={styles.reviewHead}>
                  <span className={styles.reviewName}>{review.name}</span>
                  <span className={`${styles.pill} ${styles.pillNeutral}`}>
                    {review.meta}
                  </span>
                  <span
                    className={`${styles.pill} ${review.isPublished ? styles.pillSuccess : styles.pillAlert}`}
                  >
                    {review.isPublished ? 'Showing' : 'Hidden'}
                  </span>
                </div>
                <p className={styles.reviewBody}>{review.body}</p>
                <div className={styles.reviewActions}>
                  <button
                    type="button"
                    className={`btn btn--outline ${styles.smallBtn}`}
                    onClick={() =>
                      void run({
                        action: 'setReviewPublished',
                        id: review.id,
                        isPublished: !review.isPublished,
                      })
                    }
                  >
                    {review.isPublished ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className={`btn btn--outline ${styles.smallBtn}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove ${review.name}'s review permanently? This cannot be undone.`
                        )
                      ) {
                        void run({ action: 'removeReview', id: review.id });
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
