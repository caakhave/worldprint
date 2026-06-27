"use client";

import { useMemo, useState } from "react";
import type { AuthShellStatus } from "@/lib/account/authConfig";
import type { AmbiguityRisk, EditorialReview, EditorialStatus, IndicatorDifficulty } from "@/lib/content/schemas";

export type InternalReviewRow = {
  id: string;
  providerCode: string;
  shortTitle: string;
  category: string;
  paletteLabel?: string;
  difficulty: IndicatorDifficulty;
  year: number | string;
  coverage: number;
  sourceReference: string;
  approvalStatus: "approved" | "draft";
  dataWarnings: string[];
  dataFailures: string[];
  editorialReview: EditorialReview;
  scorecard?: {
    dataGate: {
      status: string;
      reasons: string[];
    };
    scores: {
      coverage: number;
      freshness: number;
      unitClarity: number;
      mapInterest: number;
      ambiguityCorrelation: number;
      overall: number;
    };
    statusRecommendation: {
      recommendedAction: string;
      recommendedEditorialStatus: string;
      reason: string[];
    };
  };
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
  opsStatus?: AuthShellStatus;
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

export function InternalReviewClient({ rows, statusCounts, contentVersion, opsStatus }: InternalReviewClientProps) {
  const [status, setStatus] = useState<EditorialStatus | "">("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<IndicatorDifficulty | "">("");
  const [risk, setRisk] = useState<AmbiguityRisk | "">("");

  const categories = useMemo(() => uniqueSorted(rows.map((row) => row.category)), [rows]);
  const approvedCount = rows.filter((row) => row.approvalStatus === "approved").length;
  const draftCount = rows.length - approvedCount;
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
        <p className="eyebrow">Internal Mystery Map QA</p>
        <h1 className="page-title">Indicator review board.</h1>
        <p className="lead">
          Read-only editorial view for content version {contentVersion}. Draft-held, retired, and needs-review indicators remain visible here,
          but are excluded from generated playable rounds and Mystery Map Daily manifests.
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
      {opsStatus ? (
        <section className="review-ops-check surface" aria-labelledby="ops-readiness-heading">
          <div>
            <p className="eyebrow">Ops readiness</p>
            <h2 id="ops-readiness-heading">Non-secret production checklist.</h2>
            <p>
              Internal-only status for deployment plumbing. This section lists variable names and readiness only; secret values and key
              contents never render here.
            </p>
          </div>
          <div className="review-ops-grid">
            <article>
              <span>Public Supabase env</span>
              <strong>{opsStatus.supabaseConfigured ? "Present" : "Missing"}</strong>
              <small>{opsStatus.supabaseConfigured ? "Browser auth can initialize." : "Browser auth will stay disabled."}</small>
            </article>
            <article>
              <span>Public site env</span>
              <strong>{opsStatus.missingPublicEnv.length === 0 ? "Ready" : "Needs review"}</strong>
              <small>
                {opsStatus.missingPublicEnv.length === 0
                  ? "All public production names are present."
                  : `Missing: ${opsStatus.missingPublicEnv.join(", ")}`}
              </small>
            </article>
          </div>
          <details className="review-ops-details">
            <summary>Required deployment variable names</summary>
            <div>
              <h3>Cloudflare Pages public env</h3>
              <ul>
                {opsStatus.futurePublicEnv.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <h3>Supabase Edge Function env/secrets</h3>
              <ul>
                {opsStatus.futureServerEnv.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          </details>
        </section>
      ) : null}
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
        Showing {filteredRows.length} of {rows.length} candidates. Source-valid: {approvedCount}. Draft-held by data gate: {draftCount}.
      </p>
      <div className="review-table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Status</th>
              <th>Data gate</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Risk</th>
              <th>Scorecard</th>
              <th>Eligibility</th>
              <th>Top correlation</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const review = row.editorialReview;
              const top = row.topCorrelated[0];
              const scorecard = row.scorecard;
              return (
                <tr key={row.id} data-status={review.status}>
                  <td>
                    <strong>{row.shortTitle}</strong>
                    <span>{row.providerCode}</span>
                    {row.sourceReference === "unavailable" ? <span>source unavailable</span> : <a href={row.sourceReference}>source</a>}
                  </td>
                  <td>{statusLabels[review.status]}</td>
                  <td>
                    <strong>{row.approvalStatus === "approved" ? "Source-valid" : "Draft-held"}</strong>
                    <span>
                      {row.coverage} countries, {row.year}
                    </span>
                    {row.dataFailures.length > 0 ? <span>{row.dataFailures[0]}</span> : null}
                    {row.dataFailures.length === 0 && row.dataWarnings.length > 0 ? <span>{row.dataWarnings[0]}</span> : null}
                  </td>
                  <td>
                    <strong>{row.category}</strong>
                    {row.paletteLabel ? <span>{row.paletteLabel} palette</span> : null}
                  </td>
                  <td>{row.difficulty}</td>
                  <td>{review.ambiguityRisk}</td>
                  <td>
                    {scorecard ? (
                      <>
                        <strong>Overall {scorecard.scores.overall}/5</strong>
                        <span>
                          {`C${scorecard.scores.coverage} Fresh${scorecard.scores.freshness} Unit${scorecard.scores.unitClarity} Map${scorecard.scores.mapInterest} Amb${scorecard.scores.ambiguityCorrelation}`}
                        </span>
                        <span>{scorecard.statusRecommendation.recommendedAction.replaceAll("_", " ")}</span>
                      </>
                    ) : null}
                    <span>
                      Editorial Q{review.qualityScore} / Fun{review.funScore} / Fair{review.fairnessScore}
                    </span>
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
