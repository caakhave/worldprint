import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found-page page-shell info-page-shell" aria-labelledby="not-found-title">
      <div className="not-found-panel surface map-texture-panel">
        <div className="not-found-copy">
          <p className="eyebrow">Lost coordinates</p>
          <h1 id="not-found-title" className="page-title">
            Lost?
          </h1>
          <p className="lead">This route does not exist. The atlas has no record of these coordinates.</p>
          <p className="not-found-note">Head back to the game library or return to safer ground.</p>
          <div className="button-row" aria-label="404 navigation">
            <Link className="button" href="/play">
              Open game library
            </Link>
            <Link className="button-secondary" href="/">
              Go home
            </Link>
            <Link className="button-secondary" href="/account">
              View account
            </Link>
          </div>
        </div>
        <div className="not-found-atlas" aria-hidden="true">
          <span className="not-found-coordinate">404</span>
          <span className="not-found-route" />
          <span className="not-found-marker" />
          <span className="not-found-marker not-found-marker-alt" />
        </div>
      </div>
    </section>
  );
}
