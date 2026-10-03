"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TIME_OPTIONS, normalizeTime } from "@/app/lib/hours";
import { IconChevronDown } from "@/app/components/icons";
import list from "./Select.module.css";

const compact = (s: string) => s.toLowerCase().replace(/[\s.]/g, "");

// A time field you can type into ("9:30 pm", "21:30") or pick from the
// 15-minute suggestions. Typed text is shown as-is while focused; the value
// reported up is always the canonical "9:30 PM", or "" while it isn't a time.
// The suggestion list is ours (not a <datalist>) so it matches the other
// dropdowns.
export function TimeField({
  value,
  onChange,
  id,
  className,
  wrapClassName,
  label,
  invalid,
  describedBy,
  chevron,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  /** Sizes the box the suggestion list is anchored to. */
  wrapClassName?: string;
  label?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Show a dropdown arrow in the box (the input needs right padding for it). */
  chevron?: boolean;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const text = draft ?? value;
  // Everything while the box shows a finished time; otherwise what the typed text starts.
  const typing = draft !== null && compact(draft) !== compact(value);
  const options = typing ? TIME_OPTIONS.filter((t) => compact(t).startsWith(compact(draft ?? ""))) : TIME_OPTIONS;
  const optionId = (i: number) => `${listId}-${i}`;

  // Open on the saved time (or the first suggestion).
  function show() {
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  }

  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  function pick(t: string) {
    onChange(t);
    setDraft(null);
    setOpen(false);
  }

  return (
    <div className={`${list.wrap} ${wrapClassName ?? ""}`} ref={wrapRef}>
      <input
        id={id}
        className={className}
        value={text}
        placeholder="e.g. 9:00 AM"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onFocus={() => {
          setDraft(value);
          show();
        }}
        onClick={() => !open && show()}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(normalizeTime(e.target.value));
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          // Valid (or empty): show the tidy version. Not a time: keep what was
          // typed visible so it can be fixed — the row shows why.
          if (draft === null || draft.trim() === "" || normalizeTime(draft)) setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) show();
            else setActive((a) => Math.min(options.length - 1, a + 1));
          } else if (e.key === "ArrowUp" && open) {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {chevron && (
        <span className={list.timeChevron} aria-hidden="true">
          <IconChevronDown />
        </span>
      )}
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className={`${list.list} ${list.timeList}`}
          // Keep focus in the input while clicking a suggestion.
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((t, i) => (
            <li
              key={t}
              id={optionId(i)}
              role="option"
              aria-selected={t === value}
              className={`${list.item} ${i === active ? list.active : ""} ${t === value ? list.chosen : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(t)}
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
