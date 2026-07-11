"use client";

import { useEffect, useState } from "react";
import {
  MARKETING_CONSENT_STORAGE_KEY,
  analyticsConfigFromEnv,
  normalizeMarketingConsentChoice,
  pushMarketingConsentChoice,
  type MarketingConsentChoice
} from "@/lib/site/analytics";

export function MarketingConsentManager() {
  const [enabled, setEnabled] = useState(false);
  const [choice, setChoice] = useState<MarketingConsentChoice | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const config = analyticsConfigFromEnv();
    setEnabled(config.enabled);
    if (!config.enabled) return;

    const storedChoice = readStoredChoice();
    setChoice(storedChoice);
    setOpen(storedChoice === null);
  }, []);

  if (!enabled) return null;

  function saveChoice(nextChoice: MarketingConsentChoice) {
    try {
      window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, nextChoice);
    } catch {
      // A blocked storage write should not prevent the consent update for this page.
    }
    setChoice(nextChoice);
    setOpen(false);
    pushMarketingConsentChoice(nextChoice);
  }

  return (
    <>
      <button className="cookie-settings-button" type="button" onClick={() => setOpen(true)}>
        Cookie settings
      </button>
      {open ? (
        <aside className="marketing-consent-banner surface" role="dialog" aria-labelledby="marketing-consent-title" aria-live="polite">
          <div>
            <p className="eyebrow">Privacy choices</p>
            <h2 id="marketing-consent-title">Marketing cookies</h2>
            <p>
              Can You Geo can use advertising and measurement pixels through Google Tag Manager to understand campaign performance.
              These pixels stay off unless you accept marketing cookies.
            </p>
          </div>
          <div className="marketing-consent-actions">
            <button className="button" type="button" onClick={() => saveChoice("granted")}>
              Accept marketing cookies
            </button>
            <button className="button-secondary" type="button" onClick={() => saveChoice("denied")}>
              {choice === "granted" ? "Turn off marketing cookies" : "Continue without marketing cookies"}
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}

function readStoredChoice(): MarketingConsentChoice | null {
  try {
    return normalizeMarketingConsentChoice(window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}
