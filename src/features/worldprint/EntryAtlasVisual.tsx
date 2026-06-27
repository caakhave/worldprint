"use client";

import Image from "next/image";
import { useCallback, useState, type KeyboardEvent } from "react";

const PREVIEW_MAPS = [
  { map: 1, score: "+1000" },
  { map: 2, score: "+920" },
  { map: 3, score: "+760" },
  { map: 4, score: "+840" },
  { map: 5, score: "+980" }
];

export function EntryAtlasVisual() {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const activePreview = PREVIEW_MAPS[activePreviewIndex];
  const selectRelativePreview = useCallback((step: number) => {
    setActivePreviewIndex((current) => (current + step + PREVIEW_MAPS.length) % PREVIEW_MAPS.length);
  }, []);

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectRelativePreview(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectRelativePreview(1);
    }
  }

  return (
    <figure className="entry-atlas-visual" data-preview-map={activePreview.map} data-testid="entry-atlas-visual">
      <video className="entry-atlas-video" autoPlay muted loop playsInline preload="metadata" poster="/worldprint/hero-poster.jpg" aria-hidden="true">
        <source src="/worldprint/hero-loop.webm" type="video/webm" />
        <source src="/worldprint/hero-atlas-loop.webm" type="video/webm" />
        <source src="/worldprint/hero-loop.mp4" type="video/mp4" />
        <source src="/worldprint/hero-atlas-loop.mp4" type="video/mp4" />
      </video>
      <Image
        className="entry-atlas-image"
        src="/worldprint/hero-poster.jpg"
        alt="Cinematic atlas map glowing with mystery data patterns"
        fill
        priority
        sizes="(max-width: 720px) calc(100vw - 2rem), 43rem"
      />
      <div className="entry-atlas-preview" aria-hidden="true">
        <span className="entry-preview-scan" />
        <span className="entry-preview-node entry-preview-node-a" />
        <span className="entry-preview-node entry-preview-node-b" />
        <span className="entry-preview-node entry-preview-node-c" />
        <span className="entry-preview-chip entry-preview-chip-a" data-testid="entry-preview-map-index">
          Map {activePreview.map}/5
        </span>
        <span className="entry-preview-chip entry-preview-chip-b">{activePreview.score}</span>
        <span className="entry-preview-chip entry-preview-chip-c">-100 clue</span>
        <span className="entry-preview-route entry-preview-route-a" />
        <span className="entry-preview-route entry-preview-route-b" />
      </div>
      <div className="entry-preview-carousel" aria-label="Lobby map preview carousel" onKeyDown={handlePreviewKeyDown}>
        <button className="entry-preview-arrow" type="button" aria-label="Previous preview map" onClick={() => selectRelativePreview(-1)}>
          ‹
        </button>
        <div className="entry-preview-dots" role="group" aria-label="Preview map slides">
          {PREVIEW_MAPS.map((preview, index) => (
            <button
              key={preview.map}
              className="entry-preview-dot"
              type="button"
              aria-label={`Show preview map ${preview.map}`}
              aria-pressed={index === activePreviewIndex}
              data-active={index === activePreviewIndex ? "true" : "false"}
              onClick={() => setActivePreviewIndex(index)}
            >
              <span className="visually-hidden">Map {preview.map} of 5</span>
            </button>
          ))}
        </div>
        <button className="entry-preview-arrow" type="button" aria-label="Next preview map" onClick={() => selectRelativePreview(1)}>
          ›
        </button>
      </div>
    </figure>
  );
}
