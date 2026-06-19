import type { IndicatorArtifact } from "@/lib/content/schemas";
import { legendRanges } from "@/lib/geo/bins";
import { formatValue } from "@/lib/geo/format";
import { valueClassColor } from "@/lib/geo/palette";

type MapLegendProps = {
  indicator: IndicatorArtifact;
};

export function MapLegend({ indicator }: MapLegendProps) {
  return (
    <div className="map-legend" aria-label={`Legend for ${indicator.shortTitle}`}>
      <div className="legend-caption">
        <span>Low</span>
        <strong>Darker means larger</strong>
        <span>High</span>
      </div>
      <ol className="legend-list">
        {legendRanges(indicator.stats.quantileBreaks).map((range) => (
          <li key={range.index}>
            <span
              className="legend-swatch"
              data-value-class={range.index}
              style={{ backgroundColor: valueClassColor(range.index) }}
              aria-hidden="true"
            />
            <span>
              {formatValue(range.min, indicator)} to {formatValue(range.max, indicator)}
            </span>
          </li>
        ))}
        <li>
          <span className="legend-swatch legend-swatch-missing" aria-hidden="true" />
          <span>No data</span>
        </li>
      </ol>
    </div>
  );
}
