import type { ReactNode } from "react";
import styles from "./AuthShell.module.css";
import { IconTrendUp, IconCheck } from "./icons";

type AuthShellProps = {
  title: string;
  subtitle: string;
  headline: string;
  blurb: string;
  features?: string[];
  children: ReactNode;
};

export function AuthShell({ title, subtitle, headline, blurb, features, children }: AuthShellProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.panelLeft}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <IconTrendUp />
            </div>
            <div className={styles.logoText}>
              Fore<span>Shift</span>
            </div>
          </div>

          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.blurb}>{blurb}</p>

          {features && features.length > 0 && (
            <ul className={styles.features}>
              {features.map((f) => (
                <li key={f}>
                  <span className={styles.featureIcon}>
                    <IconCheck />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.status}>
            <span className={styles.statusIcon}>
              <IconCheck />
            </span>
            <div>
              <div className={styles.statusTitle}>System Status</div>
              <div className={styles.statusSub}>All predictive models operational</div>
            </div>
          </div>
        </div>

        <div className={styles.panelRight}>
          <div className={styles.formHead}>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
