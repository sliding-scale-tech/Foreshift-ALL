import styles from "./LoadError.module.css";

// Shown in place of a page whose data failed to load: what happened, and a
// way to try again without reloading the whole app.
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.title}>We couldn&apos;t load this forecast.</p>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
