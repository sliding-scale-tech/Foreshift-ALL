"use client";

import { useId, useState } from "react";
import shared from "../shared.module.css";
import { FAQS } from "./faq-content";
import styles from "./faqs.module.css";

// FAQS — independent accordion (several can be open at once, as in Bubble)
// with a small open/close animation.
export default function FaqsPage() {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const baseId = useId();

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <h1 className={shared.title}>FAQ</h1>
      <p className={shared.subtitle}>Find answers to the most common questions about Foreshift.</p>

      <div className={styles.list}>
        {FAQS.map((f, i) => {
          const isOpen = open.has(i);
          return (
            <div key={f.q} className={`${styles.item} ${isOpen ? styles.open : ""}`}>
              <button
                type="button"
                className={styles.question}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${i}`}
                onClick={() => toggle(i)}
              >
                {f.q}
                <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m4 7.500 6 6 6-6" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className={styles.panel} id={`${baseId}-${i}`} role="region" aria-hidden={!isOpen}>
                <div className={styles.panelInner}>
                  <p className={styles.answer}>{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
