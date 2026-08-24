# PhilaIndiaCovers — Disclaimer & Developer Details
### Master source. Not for direct distribution — derivative versions below are what actually ship.

---

## Publisher details — confirmed 2026-08-24

**Publisher:** Krutim Logic, Bangalore, India
**Developer:** Manjunath Shanmugam

This is what Windows shows in the UAC/installer security prompt ("Do you want to allow this app from **Krutim Logic** to make changes to your device?"), so it's worth having gotten this confirmed deliberately before it ships, rather than defaulted.

---

## 1. Master Disclaimer Text (full version)

> ### Data Accuracy & Independence Disclaimer
>
> PhilaIndiaCovers is an independent, community-run catalogue of India's Geographical Indication (GI) Tag Special Covers, created and maintained by philately enthusiasts.
>
> **Not an official source.** PhilaIndiaCovers is not affiliated with, endorsed by, sponsored by, or officially connected to India Post, the Geographical Indications Registry of India, the Government of India, or any of their subsidiaries or affiliates. Names, marks, and references to Geographical Indications, India Post, and related government bodies are used solely for identification and descriptive purposes.
>
> **Best-effort accuracy.** Cover information in this catalogue — including but not limited to issue dates, postal circles, product categories, and item descriptions — is compiled and reviewed on a best-effort basis by a volunteer subject-matter expert in philately. While care is taken to verify each entry, PhilaIndiaCovers makes no warranty, express or implied, as to the completeness, accuracy, or currency of any information presented. A "Verified" status indicates the entry has been reviewed by our philately SME against best-available sources — it is not a certification of authenticity, value, or official recognition.
>
> **No liability.** This catalogue is provided "as is," for informational and hobbyist reference purposes only. It should not be relied upon as the sole basis for purchasing, valuation, authentication, or any other decision involving real value. PhilaIndiaCovers and its contributors accept no liability for any loss or damage arising from reliance on information provided through this app.
>
> **Intellectual property.** Geographical Indication names and related marks referenced in this catalogue remain the property of their respective registered proprietors. Cover images are used for cataloguing and identification purposes only.
>
> *Last updated: 2026-08-24*

---

## 2. Placement A — In-App Terms/Disclaimer Screen

**Where it's shown:** once at signup (as the terms-acknowledgment checkbox already scoped in FR-23 — this is what that checkbox should actually link to, not a placeholder), plus always reachable from Settings.

**Screen content:** the full Master Disclaimer Text above, verbatim. No shortening — this is the one placement where completeness matters more than brevity, since it's the actual acknowledgment a user is agreeing to.

**Signup checkbox copy:**
> ☐ I have read and understand the [Disclaimer](#) — including that this catalogue is independently maintained and not an official government source.

**Implementation note for Claude Code:** hardcode this text as a static component (e.g. `DisclaimerContent.tsx`) rather than fetching it remotely — Electron apps should bundle legal text, not depend on network access to display it, consistent with this app's own offline-first requirements. Import the same component into both the signup checkbox's linked view and the Settings screen, so there's exactly one copy in the codebase, not two that can drift apart.

---

## 3. Placement B — README.md Section

Paste this section into `philaindiacovers-app`'s (and ideally `philaindiacovers-admin`'s) `README.md`:

```markdown
## Disclaimer

PhilaIndiaCovers is an independent, community-run catalogue of India's
Geographical Indication (GI) Tag Special Covers. It is **not affiliated
with, endorsed by, or officially connected to India Post, the
Geographical Indications Registry of India, or any government body.**

Cover information is compiled on a best-effort basis by a volunteer
philately subject-matter expert. While reviewed for accuracy, no
warranty is made as to completeness or correctness. This project is
provided for hobbyist and informational use — not as an authoritative
or official source.

See the full disclaimer in-app (Settings → Disclaimer) or at
[docs/legal/DISCLAIMER.md](docs/legal/DISCLAIMER.md).
```

---

## 4. Placement C — Installer EULA

Electron-builder (NSIS, for Windows) supports a license/EULA page shown during installation, before the user can proceed. Save this as `LEGAL/EULA.txt` in the repo, referenced from the build config:

```json
"build": {
  "nsis": {
    "license": "LEGAL/EULA.txt"
  }
}
```

**`LEGAL/EULA.txt` content:**

```
PHILAINDIACOVERS — LICENSE & DISCLAIMER AGREEMENT

By installing this application, you acknowledge and agree to the
following:

1. INDEPENDENCE. PhilaIndiaCovers is an independent, community-run
   catalogue of India's Geographical Indication (GI) Tag Special
   Covers. It is not affiliated with, endorsed by, sponsored by, or
   officially connected to India Post, the Geographical Indications
   Registry of India, the Government of India, or any of their
   subsidiaries or affiliates.

2. DATA ACCURACY. Information in this catalogue is compiled and
   reviewed on a best-effort basis by a volunteer subject-matter
   expert in philately. No warranty, express or implied, is made as
   to the completeness, accuracy, or currency of any information
   presented.

3. NO LIABILITY. This application and its content are provided "as
   is," for informational and hobbyist reference purposes only. The
   developer accepts no liability for any loss or damage arising
   from reliance on information provided through this application.

4. INTELLECTUAL PROPERTY. Geographical Indication names and related
   marks referenced in this catalogue remain the property of their
   respective registered proprietors.

Developer: Manjunath Shanmugam (Krutim Logic, Bangalore, India)
Contact: krutimlogic@gmail.com

By clicking "I Agree," you confirm you have read and understood this
agreement.
```

---

## 5. Developer Details

### 5a. User-facing (Settings/About screen)

```
About PhilaIndiaCovers

Version: 1.0.0
Developer: Manjunath Shanmugam
Published by: Krutim Logic, Bangalore, India
Contact: krutimlogic@gmail.com
Source code: github.com/msvibes/philaindiacovers-app
Catalogue verification: Reviewed by a volunteer philately SME

[View Disclaimer]   [Report an Issue]   [View Source on GitHub]
```

### 5b. Technical (package.json)

```json
{
  "author": {
    "name": "Manjunath Shanmugam",
    "email": "krutimlogic@gmail.com"
  }
}
```

### 5c. Technical (electron-builder config)

```json
{
  "build": {
    "publisherName": "Krutim Logic",
    "nsis": {
      "license": "LEGAL/EULA.txt"
    }
  }
}
```

**Note on the Windows code-signing gap:** publisher name in the UAC prompt is cosmetic unless the installer is also code-signed — without a code-signing certificate, Windows SmartScreen will likely still show an "Unknown Publisher" warning regardless of what `publisherName` says. Code signing is a separate, real cost (a certificate, typically an annual fee) and isn't in scope for a friends/family trial — but worth knowing this disclaimer work doesn't fully resolve the "does this look trustworthy on install" question by itself. Flagging as a known limitation, not silently assumed solved.
