import { InfoTip } from "@/app/components/InfoTip";
import shared from "@/app/(app)/shared.module.css";

const TIME_ZONE = "America/Detroit";

// "Last updated Oct 3, 3:15 PM EDT" with the exact moment in the tooltip. Shown
// when the forecast was generated (a cached result keeps its own timestamp);
// nothing before the first one exists.
export function LastUpdated({ generatedAt }: { generatedAt: number | null }) {
  if (generatedAt === null) return null;
  const at = new Date(generatedAt);
  const short = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  }).format(at);
  const exact = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: TIME_ZONE,
  }).format(at);

  return (
    <p className={shared.updated}>
      Last updated {short}
      <InfoTip label="when this forecast was last updated" align="start">
        {exact} (Detroit time). It refreshes on its own when new event or weather data comes in.
      </InfoTip>
    </p>
  );
}
