"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_POSTER = "/images/homepage/can-you-geo-cinematic-hero.png";
const HERO_VIDEO = "/images/homepage/can-you-geo-cinematic-hero-720p.mp4";

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
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <Image
          className="landing-hero-poster"
          src={HERO_POSTER}
          alt=""
          fill
          priority
          sizes="100vw"
          data-testid="homepage-hero-poster"
        />
      )}
    </div>
  );
}
