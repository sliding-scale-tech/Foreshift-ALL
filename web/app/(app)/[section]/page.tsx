import { notFound } from "next/navigation";
import { NAV_ITEMS } from "@/app/components/nav";

// Placeholder for every sidebar destination that hasn't been built yet
// (Weekly Outlook, Settings, …) so the sidebar never links to a 404. Static
// routes win over this dynamic one, so building a real page later (e.g.
// app/(app)/weekly-outlook/page.tsx) replaces it automatically.
export default async function SectionPlaceholder(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  const item = NAV_ITEMS.find((i) => i.href === `/${section}` && !i.action);
  if (!item) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>{item.label}</h1>
      <p style={{ marginTop: 12, color: "var(--color-gray-70)" }}>Coming soon.</p>
    </div>
  );
}
