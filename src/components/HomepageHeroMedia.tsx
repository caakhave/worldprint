"use client";

import { useEffect, useState } from "react";

const HERO_POSTER = "/worldprint/hero-poster.jpg";
const GENERATED_HERO_LOOP_WEBM = "/worldprint/hero-loop.webm";
const GENERATED_HERO_LOOP_MP4 = "/worldprint/hero-loop.mp4";

export function HomepageHeroMedia() {
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setShouldPlayVideo(!mediaQuery.matches);

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  return (
    <div className="landing-hero-media" aria-hidden="true">
      {shouldPlayVideo ? (
        <video
          className="landing-hero-video"
          autoPlay
          muted
          playsInline
          poster={HERO_POSTER}
          preload="metadata"
          data-testid="homepage-hero-video"
          loop
        >
          <source src={GENERATED_HERO_LOOP_WEBM} type="video/webm" />
          <source src={GENERATED_HERO_LOOP_MP4} type="video/mp4" />
        </video>
      ) : (
        <div className="landing-hero-poster" data-testid="homepage-hero-poster" />
      )}
    </div>
  );
}
