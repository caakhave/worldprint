import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import indicatorJson from "../../public/data/v1/indicators/fertility-rate.json";
import { WorldMap } from "@/components/WorldMap";
import { IndicatorArtifactSchema, type MapFeatureCollection } from "@/lib/content/schemas";

const indicator = IndicatorArtifactSchema.parse(indicatorJson);
const map = JSON.parse(readFileSync(path.join(process.cwd(), "public/maps/world-110m.v1.geojson"), "utf8")) as MapFeatureCollection;

describe("WorldMap", () => {
  it("renders zoom controls and resets zoom state", async () => {
    const user = userEvent.setup();
    render(<WorldMap map={map} indicator={indicator} labelledBy="map-title" />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const reset = screen.getByRole("button", { name: "Reset map view" });
    expect(reset).toBeDisabled();
    await user.click(zoomIn);
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(reset).toBeDisabled();
  });

  it("still lets countries be investigated after zoom state changes", async () => {
    const user = userEvent.setup();
    const onCountryClick = vi.fn();
    const { container } = render(<WorldMap map={map} indicator={indicator} onCountryClick={onCountryClick} labelledBy="map-title" />);
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    const country = container.querySelector<SVGPathElement>(".country-path[data-has-data='true']");
    expect(country).not.toBeNull();
    await user.click(country!);
    expect(onCountryClick).toHaveBeenCalled();
  });
});
