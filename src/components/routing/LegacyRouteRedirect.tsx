"use client";

import Link from "next/link";
import { useEffect } from "react";

type LegacyRouteRedirectProps = {
  destination: string;
  title?: string;
  message?: string;
};

export function LegacyRouteRedirect({
  destination,
  title = "This page has moved.",
  message = "Taking you to the current Can You Geo? page."
}: LegacyRouteRedirectProps) {
  useEffect(() => {
    const nextUrl = `${destination}${window.location.search}${window.location.hash}`;
    window.location.replace(nextUrl);
  }, [destination]);

  return (
    <section className="page-shell legacy-redirect-page" aria-labelledby="legacy-route-title">
      <div className="empty-state surface">
        <p className="eyebrow">Can You Geo?</p>
        <h1 id="legacy-route-title">{title}</h1>
        <p>{message}</p>
        <Link className="button" href={destination}>
          Continue
        </Link>
      </div>
    </section>
  );
}
