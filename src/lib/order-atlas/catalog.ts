import roundsJson from "../../../content/order-atlas/rounds.json";
import { OrderAtlasCatalogSchema, type OrderAtlasCatalog, type OrderAtlasRound } from "@/lib/order-atlas/schemas";

export const ORDER_ATLAS_CATALOG: OrderAtlasCatalog = OrderAtlasCatalogSchema.parse(roundsJson);
export const ORDER_ATLAS_ROUNDS: OrderAtlasRound[] = ORDER_ATLAS_CATALOG.rounds;

export function getOrderAtlasRounds(): OrderAtlasRound[] {
  return ORDER_ATLAS_ROUNDS;
}

export function getOrderAtlasRoundById(id: string): OrderAtlasRound | undefined {
  return ORDER_ATLAS_ROUNDS.find((round) => round.id === id);
}

export function getOrderAtlasRoundsByIndicatorId(indicatorId: string): OrderAtlasRound[] {
  return ORDER_ATLAS_ROUNDS.filter((round) => round.indicatorId === indicatorId);
}
