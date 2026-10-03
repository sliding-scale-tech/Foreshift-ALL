import { redirect } from "next/navigation";
import { TERMS_URL } from "@/app/lib/legalLinks";

// The Terms live on the landing site; old links to this route land there.
export default function TermsPage() {
  redirect(TERMS_URL);
}
