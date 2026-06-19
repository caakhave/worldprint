import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fertilityJson from "../../public/data/v1/indicators/fertility-rate.json";
import { MapLegend } from "@/components/MapLegend";
import { IndicatorArtifactSchema } from "@/lib/content/schemas";
import { CHOROPLETH_COLORS } from "@/lib/geo/palette";

const indicator = IndicatorArtifactSchema.parse(fertilityJson);

describe("MapLegend", () => {
  it("renders colored swatches for each map class and missing data", () => {
    const { container } = render(<MapLegend indicator={indicator} />);
    expect(screen.getByText(/Darker means larger/i)).toBeInTheDocument();
    const swatches = Array.from(container.querySelectorAll<HTMLElement>(".legend-swatch:not(.legend-swatch-missing)"));
    expect(swatches).toHaveLength(7);
    expect(swatches[0]).toHaveStyle({ backgroundColor: CHOROPLETH_COLORS[0] });
    expect(container.querySelector(".legend-swatch-missing")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
