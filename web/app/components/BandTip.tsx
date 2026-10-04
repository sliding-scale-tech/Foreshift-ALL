import { BANDS } from "@/app/lib/bands";
import { InfoTip } from "./InfoTip";

// What one demand level means and the score range behind it.
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
    <InfoTip label={`${b.name} demand level`} tone={tone} align={align}>
      <strong>{b.name}</strong> ({b.min}&ndash;{b.max}): {b.meaning.toLowerCase()}.
    </InfoTip>
  );
}

// All six levels with their ranges, for a legend or a section title.
export function BandLevelsTip({ align }: { align?: "center" | "start" | "end" }) {
  return (
    <InfoTip label="demand levels" align={align}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {BANDS.map((b) => (
          <span key={b.name}>
            <strong>{b.name}</strong> {b.min}&ndash;{b.max}: {b.meaning.toLowerCase()}
          </span>
        ))}
      </span>
    </InfoTip>
  );
}
