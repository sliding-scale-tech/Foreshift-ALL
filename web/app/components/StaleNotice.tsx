import styles from "./StaleNotice.module.css";

// Shown above a forecast we could not refresh: the numbers on the page are the
// last ones we had and may be out of date.
export function StaleNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.text}>
        <strong>This forecast may be out of date.</strong> We couldn&apos;t refresh it just now, so you&apos;re
        seeing the last one we had.
      </p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
