"use client";

import { useMemo, useState } from "react";
import type { AmbiguityRisk, EditorialReview, EditorialStatus, IndicatorDifficulty } from "@/lib/content/schemas";

export type InternalReviewRow = {
  id: string;
  providerCode: string;
  shortTitle: string;
  category: string;
  difficulty: IndicatorDifficulty;
  year: number;
  coverage: number;
  sourceReference: string;
  editorialReview: EditorialReview;
  topCorrelated: Array<{
    id: string;
    title: string;
    warningLevel: string;
    spearman: number | null;
    overlapCount: number;
  }>;
};

type InternalReviewClientProps = {
  rows: InternalReviewRow[];
  statusCounts: Record<string, number>;
  contentVersion: string;
};

const statusLabels: Record<EditorialStatus, string> = {
  daily_eligible: "Daily eligible",
  practice_eligible: "Practice only",
  expert_only: "Expert only",
  needs_review: "Needs review",
  retired: "Retired"
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

export function InternalReviewClient({ rows, statusCounts, contentVersion }: InternalReviewClientProps) {
  const [status, setStatus] = useState<EditorialStatus | "">("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<IndicatorDifficulty | "">("");
  const [risk, setRisk] = useState<AmbiguityRisk | "">("");

  const categories = useMemo(() => uniqueSorted(rows.map((row) => row.category)), [rows]);
  const filteredRows = rows.filter((row) => {
    if (status && row.editorialReview.status !== status) return false;
    if (category && row.category !== category) return false;
    if (difficulty && row.difficulty !== difficulty) return false;
    if (risk && row.editorialReview.ambiguityRisk !== risk) return false;
    return true;
  });

  return (
    <section className="internal-review-page page-shell">
      <div className="archive-hero">
        <p className="eyebrow">Internal WORLDPRINT QA</p>
        <h1 className="page-title">Indicator review board.</h1>
        <p className="lead">
          Read-only editorial view for content version {contentVersion}. Retired and needs-review indicators remain visible here, but
          are excluded from generated playable rounds and Daily manifests.
        </p>
      </div>
      <div className="review-counts" aria-label="Editorial status counts">
        {Object.entries(statusCounts).map(([key, count]) => (
          <span key={key}>
            <strong>{count}</strong>
            {statusLabels[key as EditorialStatus] ?? key}
          </span>
        ))}
      </div>
      <div className="review-filters surface" aria-label="Review filters">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as EditorialStatus | "")}>
            <option value="">All statuses</option>
            {(Object.keys(statusLabels) as EditorialStatus[]).map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
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
        <label>
          Map difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as IndicatorDifficulty | "")}>
            <option value="">All difficulties</option>
            <option value="intro">Intro</option>
            <option value="standard">Standard</option>
            <option value="expert">Expert</option>
          </select>
        </label>
        <label>
          Ambiguity risk
          <select value={risk} onChange={(event) => setRisk(event.target.value as AmbiguityRisk | "")}>
            <option value="">All risks</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <p className="review-result-count" aria-live="polite">
        Showing {filteredRows.length} of {rows.length} indicators.
      </p>
      <div className="review-table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Status</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Risk</th>
              <th>Scores</th>
              <th>Eligibility</th>
              <th>Top correlation</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const review = row.editorialReview;
              const top = row.topCorrelated[0];
              return (
                <tr key={row.id} data-status={review.status}>
                  <td>
                    <strong>{row.shortTitle}</strong>
                    <span>{row.providerCode}</span>
                    <a href={row.sourceReference}>source</a>
                  </td>
                  <td>{statusLabels[review.status]}</td>
                  <td>{row.category}</td>
                  <td>{row.difficulty}</td>
                  <td>{review.ambiguityRisk}</td>
                  <td>
                    Q{review.qualityScore} / F{review.funScore} / Fair{review.fairnessScore}
                  </td>
                  <td>
                    {review.dailyEligible ? "Daily " : ""}
                    {review.practiceEligible ? "Practice " : ""}
                    {review.challengeEligible ? "Challenge " : ""}
                    {review.expertOnly ? "Expert-only" : ""}
                    {!review.dailyEligible && !review.practiceEligible && !review.challengeEligible ? "Not playable" : ""}
                  </td>
                  <td>
                    {top ? (
                      <>
                        <strong>{top.title}</strong>
                        <span>
                          {top.warningLevel}, Spearman {top.spearman === null ? "n/a" : top.spearman.toFixed(2)}, overlap {top.overlapCount}
                        </span>
                      </>
                    ) : (
                      "n/a"
                    )}
                  </td>
                  <td>
                    <ul>
                      {review.reviewNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
