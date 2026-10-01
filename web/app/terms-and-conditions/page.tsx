import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Terms and Conditions — ForeShift" };

// Copied from https://foreshift-landing-new.vercel.app/terms-and-conditions.
// The refunds and eligibility pages only exist on the landing site, so those
// links point there.
const LANDING = "https://foreshift-landing-new.vercel.app";

export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions">
      <p>
        These terms govern your use of the ForeShift website at foreshift.ai and the ForeShift product at
        app.foreshift.ai, operated by <strong>[Legal entity name TBD]</strong> (&quot;ForeShift&quot;,
        &quot;we&quot;, &quot;us&quot;). By creating an account or buying a product, you agree to them.
      </p>

      <h2>1. What ForeShift provides</h2>
      <p>
        ForeShift provides forecasts of <strong>zone demand</strong> — the demand for a concept type inside a
        defined city trade area, at a given day and daypart — together with the event and weather signals
        affecting that forecast, and an optional AI Intelligence Pass that answers questions about those
        forecasts in plain English.
      </p>

      <h2>2. What ForeShift is not</h2>
      <p>
        ForeShift is a forecasting and decision-support service. It is <strong>not</strong> a prediction of
        your venue’s sales, covers, or revenue, and it is not financial, legal, or employment advice. Forecasts
        are estimates about a zone, and they can be wrong. Staffing, ordering, hours, and promotional decisions
        remain yours, and you are responsible for them and for complying with the employment and licensing
        laws that apply to your business.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You must give accurate information, including a real venue address, and keep your credentials secure.
        You are responsible for activity under your account. Tell us promptly at{" "}
        <a href="mailto:support@foreshift.ai">support@foreshift.ai</a> if you believe your account has been
        compromised.
      </p>

      <h2>4. Purchases, billing and renewal</h2>
      <p>
        All prices are in <strong>US Dollars (USD)</strong>: Event Intelligence 99 per month, Dynamic
        Scheduling 199 per month, Sales Forecasting 299 per month. Each tier includes the one below it.
      </p>
      <p>ForeShift is sold as a monthly subscription. There is no one-time purchase option.</p>
      <p>
        Subscriptions renew automatically each month at the then-current price until you cancel. You authorize
        us to charge your payment method for each renewal.
      </p>
      <p>You can cancel at any time; cancellation takes effect at the end of the paid period.</p>
      <p>We will give notice before any price change takes effect for an existing subscription.</p>
      <p>
        Delivery, cancellation, and refunds are governed by our{" "}
        <a href={`${LANDING}/refunds-cancellation`} target="_blank" rel="noopener noreferrer">
          fulfillment, refunds &amp; cancellation policy
        </a>
        , which forms part of these terms.
      </p>
      <p>Failed payments may result in suspension of access until the balance is settled.</p>

      <h2>5. Promotions</h2>
      <p>
        ForeShift is not running a promotional offer at this time. If we offer a discount, trial, or
        promotional price, its terms — who is eligible, how long it lasts, what you are charged when it ends,
        and how to cancel — will be displayed on the pricing page and at checkout before you agree to it.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Resell, redistribute, sublicense, or publish ForeShift forecasts or bands outside your own operation.</li>
        <li>Scrape, bulk-extract, or reverse engineer the service, the model, or its outputs.</li>
        <li>Use the service to build or train a competing forecasting product.</li>
        <li>Share account access with people outside your business, or interfere with the service’s security.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The ForeShift model, forecasts, band system, software, and brand are owned by ForeShift and are
        proprietary and patent-pending. Your purchase grants a limited, non-exclusive, non-transferable licence
        to use the forecasts to operate your own venue. You keep ownership of the data you enter, and you grant
        us a licence to use it to operate and improve the service, including in aggregated, de-identified form.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        The service is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent
        permitted by law, ForeShift disclaims all warranties, express or implied, including merchantability,
        fitness for a particular purpose, and non-infringement. We do not warrant that forecasts will be
        accurate for any particular day, daypart, or venue, or that the service will be uninterrupted or
        error-free.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, ForeShift is not liable for indirect, incidental, special,
        consequential, or punitive damages, or for lost profits, lost revenue, wasted labor, or wasted inventory
        arising from your use of or reliance on the service. Our total liability for any claim is limited to
        the amounts you paid ForeShift in the <strong>12 months</strong> before the claim arose.
      </p>

      <h2>10. Suspension and termination</h2>
      <p>
        You may stop using ForeShift and close your account at any time. We may suspend or terminate access
        for breach of these terms, non-payment, or suspected fraud or abuse. Where we terminate without cause,
        we will refund any unused portion of a prepaid subscription period.
      </p>

      <h2>11. Export and sanctions compliance</h2>
      <p>
        You may not use ForeShift in violation of U.S. export control or sanctions laws, and you confirm you are
        not located in a comprehensively sanctioned country or region and are not on a U.S. government
        restricted-party list. See{" "}
        <a href={`${LANDING}/eligibility-restrictions`} target="_blank" rel="noopener noreferrer">
          eligibility &amp; restrictions
        </a>
        .
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these terms. Material changes will be posted here with a new date and, where required,
        notified by email before taking effect. Continuing to use the service after that means you accept the
        updated terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Michigan, United States, without regard to
        conflict of law rules. Venue and dispute resolution: TBD pending legal review.
      </p>

      <h2>14. Contact Us</h2>
      <p>
        Email: <a href="mailto:support@foreshift.ai">support@foreshift.ai</a>
        <br />
        Phone: (888)2345-6789
      </p>
      <p>
        ForeShift
        <br />
        [Street address TBD]
        <br />
        Detroit, MI [ZIP TBD]
        <br />
        United States
      </p>
    </LegalPage>
  );
}
