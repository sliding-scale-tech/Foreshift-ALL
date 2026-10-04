import type { ReactNode } from "react";
import styles from "./StaleNotice.module.css";

// Shown above data that may be out of date or missing. By default: a forecast we
// could not refresh (the numbers are the last ones we had), with Try again. Pass
// `title` and `children` for another message, and leave `onRetry` out for no button.
export function StaleNotice({
  onRetry,
  title = "This forecast may be out of date.",
  children = " We couldn't refresh it just now, so you're seeing the last one we had.",
}: {
  onRetry?: () => void;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.text}>
        <strong>{title}</strong>
        {children}
      </p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
