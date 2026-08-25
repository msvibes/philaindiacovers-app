// Master Disclaimer Text, verbatim from docs/legal/DISCLAIMER-and-Developer-Details.md
// §1 (last updated 2026-08-24). Hardcoded, not fetched remotely — this app
// is offline-first, and legal text shouldn't depend on network access to
// display (same reasoning the source doc itself calls out). Imported by
// both the signup checkbox's linked view (US-01/FR-23/FR-57) and T-27's
// future Settings screen placement, so there's exactly one copy in the
// codebase, not two that can drift apart.
export default function DisclaimerContent(): React.JSX.Element {
  return (
    <div className="space-y-4 text-sm text-ink">
      <h2 className="font-display text-lg font-semibold">
        Data Accuracy &amp; Independence Disclaimer
      </h2>

      <p>
        PhilaIndiaCovers is an independent, community-run catalogue of India&apos;s Geographical
        Indication (GI) Tag Special Covers, created and maintained by philately enthusiasts.
      </p>

      <p>
        <strong>Not an official source.</strong> PhilaIndiaCovers is not affiliated with, endorsed
        by, sponsored by, or officially connected to India Post, the Geographical Indications
        Registry of India, the Government of India, or any of their subsidiaries or affiliates.
        Names, marks, and references to Geographical Indications, India Post, and related government
        bodies are used solely for identification and descriptive purposes.
      </p>

      <p>
        <strong>Best-effort accuracy.</strong> Cover information in this catalogue — including but
        not limited to issue dates, postal circles, product categories, and item descriptions — is
        compiled and reviewed on a best-effort basis by a volunteer subject-matter expert in
        philately. While care is taken to verify each entry, PhilaIndiaCovers makes no warranty,
        express or implied, as to the completeness, accuracy, or currency of any information
        presented. A &quot;Verified&quot; status indicates the entry has been reviewed by our
        philately SME against best-available sources — it is not a certification of authenticity,
        value, or official recognition.
      </p>

      <p>
        <strong>No liability.</strong> This catalogue is provided &quot;as is,&quot; for
        informational and hobbyist reference purposes only. It should not be relied upon as the sole
        basis for purchasing, valuation, authentication, or any other decision involving real value.
        PhilaIndiaCovers and its contributors accept no liability for any loss or damage arising
        from reliance on information provided through this app.
      </p>

      <p>
        <strong>Intellectual property.</strong> Geographical Indication names and related marks
        referenced in this catalogue remain the property of their respective registered proprietors.
        Cover images are used for cataloguing and identification purposes only.
      </p>

      <p className="text-xs text-ink-soft">Last updated: 2026-08-24</p>
    </div>
  )
}
