"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderAtlasDifficulty, OrderAtlasEligibility, OrderAtlasOrder } from "@/lib/order-atlas/schemas";

export type OrderAtlasReviewCountry = {
  iso3: string;
  name: string;
  value: number;
  formattedValue: string;
};

export type OrderAtlasReviewIssue = {
  path: string;
  message: string;
};

export type OrderAtlasReviewRow = {
  id: string;
  indicatorId: string;
  category: string;
  difficulty: OrderAtlasDifficulty;
  eligibility: OrderAtlasEligibility;
  prompt: string;
  highlightText: string;
  explanation: string;
  selectedCountries: OrderAtlasReviewCountry[];
  trueOrder: OrderAtlasReviewCountry[];
  order: OrderAtlasOrder;
  unit: string;
  year: number;
  dateVintage: string;
  sourceLabel: string;
  sourceUrl: string;
  scopeNote?: string;
  validationIssues: OrderAtlasReviewIssue[];
  warnings: string[];
  placementPoints: number;
};

type InternalOrderAtlasReviewClientProps = {
  rows: OrderAtlasReviewRow[];
  contentVersion: string;
};

const difficultyLabels: Record<OrderAtlasDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
};

const eligibilityLabels: Record<OrderAtlasEligibility, string> = {
  sample: "Sample",
  daily: "Daily",
  practice: "Practice",
  "expert-only": "Expert-only"
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

export function InternalOrderAtlasReviewClient({ rows, contentVersion }: InternalOrderAtlasReviewClientProps) {
  const searchParams = useSearchParams();
  const roundId = searchParams.get("roundId") ?? "";
  const [difficulty, setDifficulty] = useState<OrderAtlasDifficulty | "">("");
  const [eligibility, setEligibility] = useState<OrderAtlasEligibility | "">("");
  const [category, setCategory] = useState("");

  const categories = useMemo(() => uniqueSorted(rows.map((row) => row.category)), [rows]);
  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === roundId)
  );
  const selected = rows[selectedIndex] ?? rows[0];
  const invalidRoundId = roundId && !rows.some((row) => row.id === roundId);
  const previous = rows[(selectedIndex - 1 + rows.length) % rows.length];
  const next = rows[(selectedIndex + 1) % rows.length];

  const filteredRows = rows.filter((row) => {
    if (difficulty && row.difficulty !== difficulty) return false;
    if (eligibility && row.eligibility !== eligibility) return false;
    if (category && row.category !== category) return false;
    return true;
  });

  const validationStatus = selected.validationIssues.length === 0 ? "Pass" : "Needs review";

  return (
    <section className="internal-review-page order-atlas-review-page page-shell">
      <div className="archive-hero">
        <p className="eyebrow">Internal Order Atlas QA</p>
        <h1 className="page-title">Order Atlas round review.</h1>
        <p className="lead">
          Read-only internal catalog review for content version {contentVersion}. This is not player-facing gameplay and is not linked from
          public navigation, the homepage, the play hub, or the sitemap.
        </p>
      </div>

      <div className="review-counts order-atlas-review-counts" aria-label="Order Atlas catalog counts">
        <span>
          <strong>{rows.length}</strong>
          total rounds
        </span>
        {(["sample", "daily", "practice", "expert-only"] as OrderAtlasEligibility[]).map((value) => (
          <span key={value}>
            <strong>{rows.filter((row) => row.eligibility === value).length}</strong>
            {eligibilityLabels[value]}
          </span>
        ))}
      </div>

      <div className="review-filters surface" aria-label="Order Atlas review filters">
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as OrderAtlasDifficulty | "")}>
            <option value="">All difficulties</option>
            <option value="intro">Intro</option>
            <option value="standard">Standard</option>
            <option value="expert">Expert</option>
          </select>
        </label>
        <label>
          Eligibility
          <select value={eligibility} onChange={(event) => setEligibility(event.target.value as OrderAtlasEligibility | "")}>
            <option value="">All eligibilities</option>
            <option value="sample">Sample</option>
            <option value="daily">Daily</option>
            <option value="practice">Practice</option>
            <option value="expert-only">Expert-only</option>
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="order-atlas-review-quick-links" aria-label="Quick eligibility filters">
          {(["sample", "daily", "practice", "expert-only"] as OrderAtlasEligibility[]).map((value) => (
            <button key={value} type="button" className="secondary-button" onClick={() => setEligibility(value)}>
              {eligibilityLabels[value]}
            </button>
          ))}
        </div>
      </div>

      <p className="review-result-count" aria-live="polite">
        Showing {filteredRows.length} of {rows.length} rounds. Deep-link with <code>?roundId=&lt;id&gt;</code>.
      </p>

      {invalidRoundId ? (
        <p className="order-atlas-review-warning" role="status">
          No Order Atlas round matched <code>{roundId}</code>. Showing the first catalog round instead.
        </p>
      ) : null}

      <section className="order-atlas-review-detail surface" aria-labelledby="selected-order-atlas-round">
        <div className="order-atlas-review-detail-header">
          <div>
            <p className="eyebrow">Selected round</p>
            <h2 id="selected-order-atlas-round">{selected.id}</h2>
            <p>
              {selected.prompt} Order: <strong>{selected.order === "asc" ? "ascending" : "descending"}</strong>.
            </p>
          </div>
          <div className="order-atlas-review-nav" aria-label="Round navigation">
            <a className="secondary-button" href={`/internal/order-atlas-review/?roundId=${previous.id}`}>
              Previous
            </a>
            <a className="secondary-button" href={`/internal/order-atlas-review/?roundId=${next.id}`}>
              Next
            </a>
          </div>
        </div>

        <div className="order-atlas-review-meta" aria-label="Selected round metadata">
          <span>
            <strong>Indicator</strong>
            {selected.indicatorId}
          </span>
          <span>
            <strong>Category</strong>
            {selected.category}
          </span>
          <span>
            <strong>Difficulty</strong>
            {difficultyLabels[selected.difficulty]}
          </span>
          <span>
            <strong>Eligibility</strong>
            {eligibilityLabels[selected.eligibility]}
          </span>
          <span>
            <strong>Highlight text</strong>
            {selected.highlightText}
          </span>
          <span>
            <strong>Exact placement scoring</strong>
            {selected.selectedCountries.length} cards, {selected.placementPoints.toLocaleString()} points each
          </span>
          <span>
            <strong>Validation</strong>
            {validationStatus}
          </span>
        </div>

        <div className="order-atlas-review-columns">
          <article>
            <h3>Future player card preview</h3>
            <p>Hidden values, current catalog country order.</p>
            <ol className="order-atlas-card-preview">
              {selected.selectedCountries.map((country) => (
                <li key={country.iso3}>
                  <strong>{country.name}</strong>
                  <span>{country.iso3}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="order-atlas-true-order-card">
            <h3>Derived true order and values</h3>
            <ol className="order-atlas-true-order">
              {selected.trueOrder.map((country, index) => (
                <li key={country.iso3}>
                  <span>{index + 1}</span>
                  <strong>{country.name}</strong>
                  <code>{country.iso3}</code>
                  <b>{country.formattedValue}</b>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="order-atlas-review-source-grid">
          <span>
            <strong>Unit</strong>
            {selected.unit}
          </span>
          <span>
            <strong>Year / vintage</strong>
            {selected.dateVintage}
          </span>
          <span>
            <strong>Source label</strong>
            {selected.sourceLabel}
          </span>
          <span>
            <strong>Source URL</strong>
            <a href={selected.sourceUrl}>{selected.sourceUrl}</a>
          </span>
        </div>

        <div className="order-atlas-review-notes">
          <article>
            <h3>Explanation</h3>
            <p>{selected.explanation}</p>
          </article>
          {selected.scopeNote ? (
            <article>
              <h3>Scope note</h3>
              <p>{selected.scopeNote}</p>
            </article>
          ) : null}
          <article>
            <h3>Validation status and warnings</h3>
            {selected.validationIssues.length === 0 && selected.warnings.length === 0 ? <p>Pass. No validation issues or close-value warnings.</p> : null}
            {selected.validationIssues.length > 0 ? (
              <ul>
                {selected.validationIssues.map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <strong>{issue.path}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {selected.warnings.length > 0 ? (
              <ul>
                {selected.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </article>
        </div>
      </section>

      <div className="review-table-wrap">
        <table className="review-table order-atlas-review-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Indicator</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Eligibility</th>
              <th>Order</th>
              <th>Countries</th>
              <th>Validation</th>
              <th>Review link</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} data-status={row.eligibility === "expert-only" ? "expert_only" : row.eligibility === "daily" ? "daily_eligible" : row.eligibility}>
                <td>
                  <strong>{row.id}</strong>
                  <span>{row.prompt}</span>
                </td>
                <td>{row.indicatorId}</td>
                <td>{row.category}</td>
                <td>{difficultyLabels[row.difficulty]}</td>
                <td>{eligibilityLabels[row.eligibility]}</td>
                <td>{row.order === "asc" ? "Ascending" : "Descending"}</td>
                <td>{row.selectedCountries.map((country) => country.iso3).join(", ")}</td>
                <td>{row.validationIssues.length === 0 ? "Pass" : `${row.validationIssues.length} issue(s)`}</td>
                <td>
                  <a href={`/internal/order-atlas-review/?roundId=${row.id}`}>Open round</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
