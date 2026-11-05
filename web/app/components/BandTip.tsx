import { BANDS } from "@/app/lib/bands";
import { InfoTip } from "./InfoTip";
import { SHOW_NUMBERS } from "@/app/lib/display";

// What one demand level means (no score: operators see levels only).
export function BandTip({
  band,
  tone,
  align,
}: {
  band: string;
  tone?: "light" | "dark";
  align?: "center" | "start" | "end";
}) {
  const b = BANDS.find((x) => x.name === band);
  if (!b) return null;
  return (
    <InfoTip label={`${b.label} demand level`} tone={tone} align={align}>
      <strong>{b.label}</strong>
      {SHOW_NUMBERS && ` (${b.min}–${b.max})`}: {b.meaning.toLowerCase()}.
    </InfoTip>
  );
}

// All six levels, low to high, for a legend or a section title.
export function BandLevelsTip({ align }: { align?: "center" | "start" | "end" }) {
  return (
    <InfoTip label="demand levels" align={align}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {BANDS.map((b) => (
          <span key={b.name}>
            <strong>{b.label}</strong>
            {SHOW_NUMBERS && ` ${b.min}–${b.max}`}: {b.meaning.toLowerCase()}
          </span>
        ))}
      </span>
    </InfoTip>
  );
}
