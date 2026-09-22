"use client";

import { useState } from "react";

// True from the first render where `ready` was true, and stays true. Lets a
// page gate its FIRST load behind a full-page spinner, then update in place
// (e.g. switching the selected day) without blanking the whole screen again.
export function useOnceReady(ready: boolean): boolean {
  const [seen, setSeen] = useState(false);
  if (ready && !seen) setSeen(true);
  return seen || ready;
}
