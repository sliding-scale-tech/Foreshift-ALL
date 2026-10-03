import { redirect } from "next/navigation";
import { PRIVACY_URL } from "@/app/lib/legalLinks";

// The Privacy Policy lives on the landing site; old links to this route land there.
export default function PrivacyPage() {
  redirect(PRIVACY_URL);
}
