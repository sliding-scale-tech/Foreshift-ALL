"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  errorText,
  useAiActions,
  useAiThreads,
  type AiThreadSummary,
} from "@/app/hooks/useAiPass";
import styles from "./AiPassThreads.module.css";

// The chat list nested under "AI Pass" in the sidebar (see the Figma "Collapsible
// Nested Thread Navigation"): New Chat, then past chats newest first. Opening one
// loads its history from the server, so a reload or a pick later shows the same chat.
export function AiPassThreads({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const threads = useAiThreads();
  const { renameThread, deleteThread } = useAiActions();

  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Where the "..." menu opens, in viewport px. The list scrolls (and would clip
  // it), so the menu is drawn on <body> beside the button, outside the sidebar.
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  // Close the "..." menu on an outside click, Escape, scroll or resize (it is
  // fixed in place, so it would otherwise drift away from its button).
  useEffect(() => {
    if (!menuFor) return;
    const away = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !listRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setMenuFor(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuFor(null);
    const close = () => setMenuFor(null);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", close);
    listRef.current?.addEventListener("scroll", close);
    const list = listRef.current;
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", close);
      list?.removeEventListener("scroll", close);
    };
  }, [menuFor]);

  function openMenu(threadId: string, button: HTMLElement) {
    if (menuFor === threadId) return setMenuFor(null);
    const r = button.getBoundingClientRect();
    const width = 140;
    // Beside the sidebar when there's room; under the button otherwise (the mobile drawer).
    setMenuPos(
      r.right + 8 + width <= window.innerWidth
        ? { top: r.top, left: r.right + 8 }
        : { top: r.bottom + 4, left: Math.max(8, r.right - width) },
    );
    setMenuFor(threadId);
  }

  const activeId = pathname.startsWith("/ai-pass/")
    ? pathname.slice("/ai-pass/".length)
    : null;

  // Only four chats show at once, so bring the open one into view.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId, threads?.length]);

  async function save(t: AiThreadSummary, title: string) {
    setRenaming(null);
    const next = title.trim();
    if (!next || next === t.title) return;
    try {
      await renameThread({ threadId: t.threadId, title: next });
    } catch (e) {
      setError(errorText(e, "Couldn't rename that chat."));
    }
  }

  async function remove(t: AiThreadSummary) {
    setConfirming(null);
    try {
      await deleteThread({ threadId: t.threadId });
      if (activeId === t.threadId) router.push("/ai-pass");
    } catch (e) {
      setError(errorText(e, "Couldn't delete that chat."));
    }
  }

  return (
    <div className={styles.wrap}>
      <Link
        href="/ai-pass"
        className={`${styles.link} ${styles.newChat} ${pathname === "/ai-pass" ? styles.active : ""}`}
        onClick={onNavigate}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11.5 4.5H5.5A1.5 1.5 0 0 0 4 6v8.5A1.5 1.5 0 0 0 5.5 16H14a1.5 1.5 0 0 0 1.5-1.5V8.5" />
          <path d="m9 11 .4-2.2 6-6a1.4 1.4 0 0 1 2 2l-6 6L9 11Z" />
        </svg>
        New Chat
      </Link>

      {threads === undefined ? null : threads.length === 0 ? (
        <p className={styles.none}>Your chats will show up here.</p>
      ) : (
        <ul className={styles.list} ref={listRef}>
          {threads.map((t) => (
            <li key={t.threadId} className={styles.row}>
              {renaming === t.threadId ? (
                <input
                  className={styles.rename}
                  defaultValue={t.title}
                  maxLength={80}
                  aria-label="Chat name"
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => save(t, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              ) : confirming === t.threadId ? (
                <div
                  className={styles.confirm}
                  role="alertdialog"
                  aria-label={`Delete ${t.title}?`}
                >
                  <span>Delete this chat?</span>
                  <button type="button" onClick={() => remove(t)}>
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href={`/ai-pass/${t.threadId}`}
                    className={`${styles.link} ${activeId === t.threadId ? styles.active : ""}`}
                    aria-current={activeId === t.threadId ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className={styles.title}>{t.title}</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.more}
                    aria-label={`Options for ${t.title}`}
                    aria-haspopup="menu"
                    aria-expanded={menuFor === t.threadId}
                    onClick={(e) => openMenu(t.threadId, e.currentTarget)}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="4.5" cy="10" r="1.5" />
                      <circle cx="10" cy="10" r="1.5" />
                      <circle cx="15.5" cy="10" r="1.5" />
                    </svg>
                  </button>
                  {menuFor === t.threadId &&
                    createPortal(
                      <div
                        className={styles.menu}
                        role="menu"
                        ref={menuRef}
                        style={menuPos}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuFor(null);
                            setRenaming(t.threadId);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuFor(null);
                            setConfirming(t.threadId);
                          }}
                        >
                          Delete
                        </button>
                      </div>,
                      document.body,
                    )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
