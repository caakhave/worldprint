import type { Metadata } from "next";
import editorialReviewJson from "../../../../public/data/v1/editorial-review.json";
import distractorReviewJson from "../../../../generated/reports/distractor-review.json";
import { InternalReviewClient, type InternalReviewRow } from "@/features/worldprint/InternalReviewClient";
import { EditorialReviewSchema, type EditorialReview } from "@/lib/content/schemas";

export const metadata: Metadata = {
  title: "Internal Worldprint Review"
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
    year: number;
    coverage: number;
    sourceReference: string;
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

export default function InternalWorldprintReviewPage() {
  const editorial = editorialReviewJson as EditorialRegistry;
  const distractor = distractorReviewJson as DistractorReview;
  const correlationById = new Map(distractor.rows.map((row) => [row.id, row.topCorrelatedIndicators]));
  const rows: InternalReviewRow[] = editorial.indicators.map((indicator) => ({
    ...indicator,
    editorialReview: EditorialReviewSchema.parse(indicator.editorialReview),
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
