"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { WorldMap } from "@/components/WorldMap";
import type { IndicatorArtifact, MapFeatureCollection } from "@/lib/content/schemas";

type EntryAtlasVisualProps = {
  map: MapFeatureCollection;
  indicator?: IndicatorArtifact;
  countryNames: Map<string, string>;
};

type PreviewStep = {
  id: string;
  title: string;
  body: string;
  points: string;
  investigatedIso3: string[];
  selectedIso3: string | null;
  panel: "map" | "legend" | "evidence" | "answers" | "result";
  colorway: "violet" | "teal" | "gold" | "green" | "coral";
};

const PREVIEW_STEPS: PreviewStep[] = [
  {
    id: "read-map",
    title: "Read the unlabeled map",
    body: "Start with the color-map pattern. Where are the highs, lows, and missing countries?",
    points: "1,000 points available",
    investigatedIso3: [],
    selectedIso3: null,
    panel: "map",
    colorway: "violet"
  },
  {
    id: "notice-legend",
    title: "Notice the legend",
    body: "Darker countries mean higher values. The legend helps you compare regions before spending points.",
    points: "1,000 points available",
    investigatedIso3: [],
    selectedIso3: null,
    panel: "legend",
    colorway: "teal"
  },
  {
    id: "investigate",
    title: "Investigate countries",
    body: "Reveal a few values when the pattern gets slippery. Clues spend points, so choose carefully.",
    points: "-200 points for clues",
    investigatedIso3: ["JPN", "BRA"],
    selectedIso3: "JPN",
    panel: "evidence",
    colorway: "gold"
  },
  {
    id: "choose-answer",
    title: "Choose the hidden indicator",
    body: "Use the map shape and evidence to pick the statistic the world is hiding.",
    points: "800 points possible",
    investigatedIso3: ["JPN", "BRA"],
    selectedIso3: "BRA",
    panel: "answers",
    colorway: "green"
  },
  {
    id: "reveal-result",
    title: "See the reveal",
    body: "Lock the answer, bank the remaining points, and learn why the map looked that way.",
    points: "+800 points banked",
    investigatedIso3: ["JPN", "BRA", "NGA"],
    selectedIso3: "NGA",
    panel: "result",
    colorway: "coral"
  }
];

export function EntryAtlasVisual({ map, indicator, countryNames }: EntryAtlasVisualProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = PREVIEW_STEPS[activeStepIndex];
  const selectRelativeStep = useCallback((step: number) => {
    setActiveStepIndex((current) => (current + step + PREVIEW_STEPS.length) % PREVIEW_STEPS.length);
  }, []);

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectRelativeStep(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectRelativeStep(1);
    }
  }

  return (
    <figure
      className="entry-atlas-visual"
      data-preview-step={activeStepIndex + 1}
      data-preview-tone={activeStep.colorway}
      data-testid="entry-atlas-visual"
    >
      <div className="entry-preview-stage" aria-hidden="true">
        {indicator ? (
          <WorldMap
            map={map}
            indicator={indicator}
            countryNames={countryNames}
            investigatedIso3={activeStep.investigatedIso3}
            selectedIso3={activeStep.selectedIso3}
            fit="cover"
            interactive={false}
            zoomable={false}
            labelledBy="entry-preview-title"
          />
        ) : (
          <div className="map-frame map-loading" />
        )}
        <div className="entry-preview-overlay">
          <span className="entry-preview-chip entry-preview-chip-a" data-testid="entry-preview-step-index">
            Step {activeStepIndex + 1}/5
          </span>
          <span className="entry-preview-chip entry-preview-chip-b">{activeStep.points}</span>
          <PreviewStepPanel step={activeStep} />
        </div>
      </div>

      <figcaption className="entry-preview-lesson" aria-live="polite">
        <div className="entry-preview-copy">
          <p className="setup-kicker">Gameplay preview</p>
          <h2 id="entry-preview-title">{activeStep.title}</h2>
          <p>{activeStep.body}</p>
        </div>
        <div className="entry-preview-carousel" aria-label="Gameplay preview steps" onKeyDown={handlePreviewKeyDown}>
          <button className="entry-preview-arrow" type="button" aria-label="Previous preview step" onClick={() => selectRelativeStep(-1)}>
            ‹
          </button>
          <div className="entry-preview-dots" role="group" aria-label="Preview steps">
            {PREVIEW_STEPS.map((step, index) => (
              <button
                key={step.id}
                className="entry-preview-dot"
                type="button"
                aria-label={`Show step ${index + 1}: ${step.title}`}
                aria-pressed={index === activeStepIndex}
                data-active={index === activeStepIndex ? "true" : "false"}
                onClick={() => setActiveStepIndex(index)}
              >
                <span aria-hidden="true">{index + 1}</span>
                <span className="visually-hidden">
                  Step {index + 1} of 5: {step.title}
                </span>
              </button>
            ))}
          </div>
          <button className="entry-preview-arrow" type="button" aria-label="Next preview step" onClick={() => selectRelativeStep(1)}>
            ›
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function PreviewStepPanel({ step }: { step: PreviewStep }) {
  return (
    <div className="entry-preview-panel" data-panel={step.panel}>
      {step.panel === "map" ? (
        <>
          <span className="entry-preview-panel-label">Unlabeled map</span>
          <strong>Find the shape first</strong>
        </>
      ) : null}

      {step.panel === "legend" ? (
        <>
          <span className="entry-preview-panel-label">Legend</span>
          <div className="entry-preview-legend" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <i key={index} data-value-class={index} />
            ))}
          </div>
          <strong>Darker = higher value</strong>
        </>
      ) : null}

      {step.panel === "evidence" ? (
        <>
          <span className="entry-preview-panel-label">Evidence</span>
          <PreviewValue country="Japan" value="92%" />
          <PreviewValue country="Brazil" value="84%" />
        </>
      ) : null}

      {step.panel === "answers" ? (
        <>
          <span className="entry-preview-panel-label">Answer choices</span>
          <div className="entry-preview-answers" aria-hidden="true">
            <span data-selected="true">Internet access</span>
            <span>Median age</span>
            <span>Forest area</span>
            <span>Wheat production</span>
          </div>
        </>
      ) : null}

      {step.panel === "result" ? (
        <>
          <span className="entry-preview-panel-label">Reveal</span>
          <strong>Correct</strong>
          <span className="entry-preview-result-strip" aria-hidden="true">
            <i data-result="correct" />
            <i data-result="correct" />
            <i data-result="miss" />
            <i data-result="correct" />
            <i data-result="recovered" />
          </span>
        </>
      ) : null}
    </div>
  );
}

function PreviewValue({ country, value }: { country: string; value: string }) {
  return (
    <div className="entry-preview-value">
      <span>{country}</span>
      <strong>{value}</strong>
    </div>
  );
}
