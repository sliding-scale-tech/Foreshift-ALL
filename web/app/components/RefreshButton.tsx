import styles from "./RefreshButton.module.css";

// "Refresh": rebuild the forecast now. The new numbers arrive through the live
// query, so the page updates by itself; this only shows that it is working and
// says so if it fails.
export function RefreshButton({
  onRefresh,
  refreshing,
  error,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  error: string | null;
}) {
  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.btn} onClick={onRefresh} disabled={refreshing} aria-busy={refreshing}>
        <svg viewBox="0 0 24 24" className={refreshing ? styles.spin : undefined} aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 4v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
