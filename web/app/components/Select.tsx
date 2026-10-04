"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string };

// App-styled replacement for <select>: the browser draws a native dropdown
// list itself and CSS can't restyle it. Same look as the address suggestions
// and the date picker. Full keyboard support (arrows, Home/End, Enter, Escape,
// type-ahead), and it opens upward when there's no room below.
export function Select({
  value,
  onChange,
  options,
  placeholder = "Choose an option…",
  id,
  ariaLabel,
  invalid,
  describedBy,
  variant = "default",
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | SelectOption)[];
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  /** default: onboarding fields · filled: Settings · filter: Events filter bar */
  variant?: "default" | "filled" | "filter";
  /** Small decorative icon before the value. */
  icon?: ReactNode;
}) {
  const items: SelectOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(-1);

  const selected = items.findIndex((o) => o.value === value);
  const optionId = (i: number) => `${listId}-${i}`;

  function show() {
    const rect = wrapRef.current?.getBoundingClientRect();
    // Prefer below; flip up only when below is tight and above has more room.
    setUp(Boolean(rect && window.innerHeight - rect.bottom < 280 && rect.top > window.innerHeight - rect.bottom));
    setActive(selected >= 0 ? selected : 0);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function pick(i: number) {
    onChange(items[i].value);
    close();
  }

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // A tap or click anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const last = items.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0) pick(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        // Type-ahead: letters typed quickly build a prefix to jump to.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
          typed.current.at = now;
          const text = typed.current.text.toLowerCase();
          const hit = items.findIndex((o) => o.label.toLowerCase().startsWith(text));
          if (hit >= 0) setActive(hit);
        }
    }
  }

  const current = selected >= 0 ? items[selected] : null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`${styles.trigger} ${styles[variant]} ${open ? styles.open : ""}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          // Focus moving into the list (it isn't focusable) is not a blur.
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) close();
        }}
      >
        {/* An option with an empty value is the "nothing chosen" row — shown like the placeholder. */}
        <span className={styles.valueWrap}>
          {icon && (
            <span className={styles.leadIcon} aria-hidden="true">
              {icon}
            </span>
          )}
          <span className={current && current.value !== "" ? styles.value : styles.placeholder}>
            {current ? current.label : placeholder}
          </span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
          <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`${styles.list} ${up ? styles.up : ""}`}
          // Keep focus on the button while clicking an option.
          onMouseDown={(e) => e.preventDefault()}
        >
          {items.map((o, i) => (
            <li
              key={o.value || "__empty"}
              id={optionId(i)}
              role="option"
              aria-selected={i === selected}
              className={`${styles.item} ${i === active ? styles.active : ""} ${i === selected ? styles.chosen : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span>{o.label}</span>
              {i === selected && (
                <svg className={styles.check} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3 8.5 3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
