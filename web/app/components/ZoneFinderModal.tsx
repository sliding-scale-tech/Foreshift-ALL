"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { AddressInput } from "./AddressInput";
import { IconClose } from "./icons";
import styles from "./Modal.module.css";

// "Need help identifying your zone?" — geocodes the typed address on the
// server, matches it to one of the 13 zone polygons, and fills the Zone field.
export function ZoneFinderModal({
  initialAddress,
  onClose,
  onFound,
}: {
  initialAddress: string;
  onClose: () => void;
  onFound: (zone: string, typedAddress: string) => void;
}) {
  const findMyZone = useAction(api.zones.findMyZone);
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFind() {
    const typed = address.trim();
    if (!typed || loading) return;
    setMessage("");
    setLoading(true);
    try {
      const result = await findMyZone({ address: typed });
      if (result.status === "ok") {
        onFound(result.zone, typed);
        return;
      }
      setMessage(
        result.status === "outside_coverage"
          ? "That address is outside our current coverage area (Detroit). Please choose your zone from the list."
          : "We couldn't find that address. Check the spelling and include the city, e.g. “2001 Woodward Ave, Detroit”.",
      );
    } catch {
      setMessage("Something went wrong finding your zone. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.zoneModal}`}
        role="dialog"
        aria-label="Zone Identification"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.zoneModalHead}>
          <h3 className={styles.zoneModalTitle}>
            Zone Identification <span aria-hidden="true">🔍</span>
          </h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <p className={styles.zoneModalText}>
          Enter your address, and we&apos;ll help you identify your zone
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleFind();
          }}
        >
          <span className={styles.label}>Address</span>
          <div style={{ marginTop: 8 }}>
            <AddressInput
              className={styles.input}
              placeholder="Start typing..."
              value={address}
              autoFocus
              onChange={setAddress}
            />
          </div>
          {message && (
            <p className={styles.zoneMessage} role="alert">
              {message}
            </p>
          )}
          <button
            type="submit"
            className={styles.zoneFindBtn}
            disabled={loading || !address.trim()}
          >
            {loading ? "Finding your zone…" : "Find my zone"}
          </button>
        </form>
      </div>
    </div>
  );
}
