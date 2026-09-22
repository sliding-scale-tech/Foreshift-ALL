import styles from "./PageLoading.module.css";

// Shown instead of a page's content until ALL of its data is ready, so a
// screen never renders placeholders or half-loaded numbers.
export function PageLoading({ label = "Preparing your forecast…" }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.spinner} />
      {label}
    </div>
  );
}
