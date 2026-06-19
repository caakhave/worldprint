"use client";

import type { Tier } from "@/lib/content/schemas";
import { TIER_CONFIGS } from "@/lib/game/scoring";

type TierSelectorProps = {
  value: Tier;
  onChange: (tier: Tier) => void;
};

export function TierSelector({ value, onChange }: TierSelectorProps) {
  return (
    <fieldset className="tier-selector">
      <legend>Choose a skill tier</legend>
      {(Object.keys(TIER_CONFIGS) as Tier[]).map((tier) => {
        const config = TIER_CONFIGS[tier];
        return (
          <label key={tier} className="tier-option" data-selected={value === tier ? "true" : "false"}>
            <input type="radio" name="tier" value={tier} checked={value === tier} onChange={() => onChange(tier)} />
            <span>
              <strong>
                {config.label}
                {config.badge ? <em>{config.badge}</em> : null}
              </strong>
              <small>{config.description}</small>
              <small>{config.highlights.join(" · ")}</small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
