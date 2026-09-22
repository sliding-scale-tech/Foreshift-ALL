import { IconMoon, IconSunFilled, IconSunLine, IconUtensils } from "./dashboard-icons";
import styles from "./DaypartIcon.module.css";

import type { DaypartKey } from "@/app/lib/dayparts";

const ICONS: Record<DaypartKey, React.ComponentType> = {
  morning: IconSunLine,
  midday: IconSunFilled,
  dinner: IconUtensils,
  late: IconMoon,
};

// The colored round icon at the head of each daypart card.
export function DaypartIcon({ daypart }: { daypart: DaypartKey }) {
  const Icon = ICONS[daypart];
  return (
    <div className={`${styles.circle} ${styles[daypart]}`}>
      <Icon />
    </div>
  );
}
