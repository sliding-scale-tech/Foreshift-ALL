"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { operatorLabel } from "@/app/lib/displayName";
import { NAV_SECTIONS } from "./nav";
import { IconLogout } from "./dashboard-icons";
import { IconClose } from "./icons";
import { FeedbackModal } from "./FeedbackModal";
import styles from "./Sidebar.module.css";

// The one sidebar for every signed-in page — rendered by the (app) route
// group's layout, so it stays mounted (and consistent) across navigation.
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { operator } = useMyOperator();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </button>
      {mobileOpen && (
        <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <IconClose />
        </button>
      <div className={styles.brand}>
        Fore<span>Shift</span>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div className={styles.section} key={section.label}>
          <div className={styles.sectionLabel}>{section.label}</div>
          <nav className={styles.nav}>
            {section.items.map(({ label, href, icon: Icon, action }) =>
              action === "feedback" ? (
                <button
                  key={href}
                  type="button"
                  className={styles.item}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setFeedbackOpen(true);
                    setMobileOpen(false);
                  }}
                >
                  <Icon />
                  {label}
                </button>
              ) : (
              <Link
                key={href}
                href={href}
                className={`${styles.item} ${pathname === href ? styles.active : ""}`}
                aria-current={pathname === href ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                {label}
              </Link>
              ),
            )}
          </nav>
        </div>
      ))}

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>{name.charAt(0)}</div>
          <div className={styles.userText}>
            <div className={styles.userName}>{name}</div>
            <div className={styles.userSub}>{operatorLabel(operator)}</div>
          </div>
        </div>
        <button
          type="button"
          className={styles.logout}
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
        >
          Logout
          <IconLogout />
        </button>
      </div>
        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
