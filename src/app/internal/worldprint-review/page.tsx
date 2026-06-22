import type { Metadata } from "next";
import editorialReviewJson from "../../../../public/data/v1/editorial-review.json";
import candidateScorecardsJson from "../../../../generated/reports/candidate-scorecards.json";
import distractorReviewJson from "../../../../generated/reports/distractor-review.json";
import { InternalReviewClient, type InternalReviewRow } from "@/features/worldprint/InternalReviewClient";
import { EditorialReviewSchema, type EditorialReview } from "@/lib/content/schemas";
import { paletteForIndicator } from "@/lib/geo/palette";

export const metadata: Metadata = {
  title: "Internal Mystery Map Review"
};

type EditorialRegistry = {
  contentVersion: string;
  statusCounts: Record<string, number>;
  indicators: Array<{
    id: string;
    providerCode: string;
    shortTitle: string;
    category: string;
    difficulty: InternalReviewRow["difficulty"];
    year: number | string;
    coverage: number;
    sourceReference: string;
    approvalStatus: "approved" | "draft";
    dataWarnings: string[];
    dataFailures: string[];
    editorialReview: EditorialReview;
  }>;
};

type DistractorReview = {
  rows: Array<{
    id: string;
    topCorrelatedIndicators: Array<{
      otherIndicatorId: string;
      title: string;
      warningLevel: string;
      spearman: number | null;
      overlapCount: number;
    }>;
  }>;
};

type CandidateScorecards = {
  scorecards: Array<NonNullable<InternalReviewRow["scorecard"]> & { id: string }>;
};

export default function InternalWorldprintReviewPage() {
  const editorial = editorialReviewJson as EditorialRegistry;
  const distractor = distractorReviewJson as DistractorReview;
  const candidateScorecards = candidateScorecardsJson as CandidateScorecards;
  const correlationById = new Map(distractor.rows.map((row) => [row.id, row.topCorrelatedIndicators]));
  const scorecardById = new Map(candidateScorecards.scorecards.map((row) => [row.id, row]));
  const rows: InternalReviewRow[] = editorial.indicators.map((indicator) => ({
    ...indicator,
    editorialReview: EditorialReviewSchema.parse(indicator.editorialReview),
    paletteLabel: paletteForIndicator(indicator).label,
    scorecard: scorecardById.get(indicator.id),
    topCorrelated: (correlationById.get(indicator.id) ?? []).slice(0, 3).map((entry) => ({
      id: entry.otherIndicatorId,
      title: entry.title,
      warningLevel: entry.warningLevel,
      spearman: entry.spearman,
      overlapCount: entry.overlapCount
    }))
  }));
  return <InternalReviewClient rows={rows} statusCounts={editorial.statusCounts} contentVersion={editorial.contentVersion} />;
}
