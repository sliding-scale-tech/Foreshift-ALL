import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./LegalPage.module.css";

// Shell for the public legal pages (Terms, Privacy). The text itself is copied
// from the ForeShift landing site and must be kept in sync with it.
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Image src="/icons/webclip-180.png" alt="" width={36} height={36} priority />
          <span>
            Fore<span className={styles.logoAccent}>Shift</span>
          </span>
        </Link>
      </header>
      <article className={styles.article}>
        <h1>{title}</h1>
        {children}
      </article>
    </div>
  );
}
