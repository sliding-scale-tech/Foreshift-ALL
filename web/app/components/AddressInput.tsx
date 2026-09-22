"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import styles from "./AddressInput.module.css";

type Suggestion = { placeId: string; text: string; main: string; secondary: string };

// Address field with Google Places autocomplete ("Start typing…" in Bubble).
// Suggestions come from a Convex action, so the Google key stays server-side.
// It's still a plain text field: typing an address nobody suggests works too.
export function AddressInput({
  value,
  onChange,
  onSelect,
  className,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called only when a suggestion is picked (not on plain typing). */
  onSelect?: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const suggest = useAction(api.places.suggestAddress);
  const listId = useId();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNext = useRef(false); // don't re-query right after picking a suggestion
  const requestId = useRef(0);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const input = value.trim();
    if (input.length < 3) return; // the list is hidden below 3 chars (see showList)
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      suggest({ input })
        .then((res) => {
          if (id !== requestId.current) return; // a newer keystroke superseded this
          setItems(res);
          setActive(-1);
        })
        .catch(() => {
          if (id === requestId.current) setItems([]);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, suggest]);

  function pick(s: Suggestion) {
    skipNext.current = true;
    requestId.current++;
    onChange(s.text);
    onSelect?.(s.text);
    setItems([]);
    setOpen(false);
  }

  const showList = open && value.trim().length >= 3 && items.length > 0;

  return (
    <div className={styles.wrap}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault(); // pick the suggestion instead of submitting the form
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {items.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === active}>
              {/* mousedown (not click) so the input's blur doesn't close the list first */}
              <button
                type="button"
                tabIndex={-1}
                className={`${styles.item} ${i === active ? styles.active : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
              >
                <span className={styles.main}>{s.main}</span>
                {s.secondary && <span className={styles.secondary}>{s.secondary}</span>}
              </button>
            </li>
          ))}
          <li className={styles.attribution} aria-hidden="true">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  );
}
