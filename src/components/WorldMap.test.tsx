import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import indicatorJson from "../../public/data/v1/indicators/fertility-rate.json";
import healthIndicatorJson from "../../public/data/v1/indicators/life-expectancy.json";
import { MapLegend } from "@/components/MapLegend";
import { WorldMap } from "@/components/WorldMap";
import { IndicatorArtifactSchema, type MapFeatureCollection } from "@/lib/content/schemas";
import { MISSING_DATA_FILL, paletteForIndicator, valueClassColor } from "@/lib/geo/palette";

const indicator = IndicatorArtifactSchema.parse(indicatorJson);
const healthIndicator = IndicatorArtifactSchema.parse(healthIndicatorJson);
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

  it("shows the actual country name on hover", () => {
    const { container } = render(<WorldMap map={map} indicator={indicator} labelledBy="map-title" />);
    const country = container.querySelector<SVGPathElement>(".country-path[data-country-name='Mexico']");
    expect(country).not.toBeNull();
    fireEvent.pointerMove(country!, { clientX: 30, clientY: 40 });
    expect(screen.getByText("Mexico")).toBeInTheDocument();
    expect(screen.queryByText(/^Country$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Unlabeled country")).not.toBeInTheDocument();
  });

  it("shows the actual country name on focus and supports keyboard selection", () => {
    const onCountryClick = vi.fn();
    const { container } = render(<WorldMap map={map} indicator={indicator} onCountryClick={onCountryClick} labelledBy="map-title" />);
    const country = container.querySelector<SVGPathElement>(".country-path[data-country-name='Mexico']");
    expect(country).not.toBeNull();
    fireEvent.focus(country!);
    expect(screen.getByText("Mexico")).toBeInTheDocument();
    expect(screen.queryByText(/^Country$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Unlabeled country")).not.toBeInTheDocument();
    fireEvent.keyDown(country!, { key: "Enter" });
    expect(onCountryClick).toHaveBeenCalledWith({ iso3: "MEX", name: "Mexico" });
  });

  it("uses the same active palette for map fills and legend swatches", () => {
    const { container } = render(
      <>
        <WorldMap map={map} indicator={healthIndicator} labelledBy="map-title" />
        <MapLegend indicator={healthIndicator} />
      </>
    );
    expect(container.querySelector(".map-frame")).toHaveAttribute("data-palette", paletteForIndicator(healthIndicator).name);
    const country = container.querySelector<SVGPathElement>(".country-path[data-has-data='true']");
    expect(country).not.toBeNull();
    const valueClass = Number(country!.getAttribute("data-value-class"));
    const expectedColor = valueClassColor(valueClass, healthIndicator);
    expect(country).toHaveStyle({ fill: expectedColor });
    expect(container.querySelector(`.legend-swatch[data-value-class='${valueClass}']`)).toHaveStyle({ backgroundColor: expectedColor });
  });

  it("keeps missing-data countries on the hatch instead of a topic fill", () => {
    const { container } = render(<WorldMap map={map} indicator={indicator} labelledBy="map-title" />);
    const missing = container.querySelector<SVGPathElement>(".country-path[data-value-class='missing']");
    expect(missing).not.toBeNull();
    expect(missing!.getAttribute("style") ?? "").not.toContain("fill");
    expect(container.querySelector("#missing-hatch rect")).toHaveAttribute("fill", MISSING_DATA_FILL);
  });
});
