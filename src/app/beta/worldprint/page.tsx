import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Clock, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react";
import betaPacksJson from "../../../../generated/reports/external-beta-test-packs.json";
import { BetaFeedbackCopy } from "@/features/worldprint/BetaFeedbackCopy";
import { EXTERNAL_BETA_FEEDBACK_QUESTIONS, EXTERNAL_BETA_FEEDBACK_TEMPLATE } from "@/lib/beta/feedback";

export const metadata: Metadata = {
  title: "Can You Geo? Beta"
};

type BetaPack = {
  id: string;
  name: string;
  purpose: string;
  estimatedMinutes: string;
  tier: string;
  audience: string;
  mapCount: number;
  challengeCount: number;
  watchFor: string[];
  challenges: Array<{
    id: string;
    label: string;
    path: string;
    roundIds: string[];
  }>;
};

const betaPacks = betaPacksJson as {
  contentVersion: string;
  contentCounts: {
    candidateCount: number;
    sourceValidCount: number;
    draftHeldCount: number;
    playableCount: number;
    dailyReadyCount: number;
  };
  challengeLinkNotes: string[];
  packs: BetaPack[];
};

function tierLabel(tier: string) {
  if (tier === "atlasMaster") return "Atlas Master";
  return tier[0]?.toUpperCase() + tier.slice(1);
}

export default function WorldprintBetaPage() {
  return (
    <>
      <section className="beta-hero page-shell">
        <div>
          <p className="eyebrow">Unlisted external beta</p>
          <h1 className="page-title">Test whether the maps read cleanly.</h1>
          <p className="lead">
            Can You Geo? is open for controlled Mystery Map beta play with no account required. The goal is to learn whether players
            can read the maps, trust the choices, enjoy the reveal, and imagine coming back tomorrow.
          </p>
          <div className="trust-row">
            <span>
              <LockKeyhole size={16} aria-hidden="true" />
              No login
            </span>
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              No payment
            </span>
            <span>
              <MapPinned size={16} aria-hidden="true" />
              Exact test packs
            </span>
          </div>
        </div>
        <aside className="beta-status-panel surface" aria-label="Current beta catalog status">
          <p className="eyebrow">Current build</p>
          <dl>
            <div>
              <dt>Playable maps</dt>
              <dd>{betaPacks.contentCounts.playableCount}</dd>
            </div>
            <div>
              <dt>Daily-ready maps</dt>
              <dd>{betaPacks.contentCounts.dailyReadyCount}</dd>
            </div>
            <div>
              <dt>Candidate maps under review</dt>
              <dd>{betaPacks.contentCounts.candidateCount}</dd>
            </div>
          </dl>
          <p>
            This is an open beta, not paid launch readiness. Accounts, billing, payment, and access enforcement are not implemented
            in this build.
          </p>
        </aside>
      </section>

      <section className="section-band">
        <div className="page-shell beta-instructions">
          <div>
            <p className="eyebrow">How to test</p>
            <h2>Play normally, then tell us where the spell breaks.</h2>
          </div>
          <ol>
            <li>Open one pack below and play without looking up answers.</li>
            <li>Use country investigations when you genuinely want evidence.</li>
            <li>After each reveal, note what was fun, confusing, unfair, or memorable.</li>
            <li>Paste the feedback template into the thread, doc, or email where you were invited.</li>
          </ol>
        </div>
      </section>

      <section className="section-band">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Beta packs</p>
            <h2>Four packs, each asking a different question.</h2>
          </div>
          <div className="beta-pack-grid">
            {betaPacks.packs.map((pack) => (
              <article className="beta-pack-card" key={pack.id}>
                <div className="beta-pack-card-header">
                  <div>
                    <h3>{pack.name}</h3>
                    <p>{pack.purpose}</p>
                  </div>
                  <span>{pack.mapCount} maps</span>
                </div>
                <div className="beta-pack-meta">
                  <span>
                    <Clock size={16} aria-hidden="true" />
                    {pack.estimatedMinutes}
                  </span>
                  <span>{tierLabel(pack.tier)}</span>
                  <span>{pack.audience}</span>
                </div>
                <div className="beta-watch-list">
                  <strong>Watch for</strong>
                  <ul>
                    {pack.watchFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="beta-pack-actions" aria-label={`${pack.name} challenge links`}>
                  {pack.challenges.map((challenge) => (
                    <Link className="button" href={challenge.path} key={challenge.id}>
                      {challenge.label}
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <p className="beta-link-note">
            Challenge links are content-version locked and preserve the exact selected rounds. After deployment, replace the
            localhost origin in the generated report with the deployed site origin; the encoded path stays the same.
          </p>
        </div>
      </section>

      <section className="section-band">
        <div className="page-shell beta-feedback-layout">
          <div>
            <p className="eyebrow">Feedback template</p>
            <h2>Short answers are enough. Specific confusion is gold.</h2>
            <p>
              There is no feedback backend in this static build. Copy the template, then send it wherever you received the beta
              invitation.
            </p>
            <BetaFeedbackCopy template={EXTERNAL_BETA_FEEDBACK_TEMPLATE} />
          </div>
          <div className="feedback-template surface">
            <div className="feedback-template-heading">
              <ClipboardList size={20} aria-hidden="true" />
              <h3>Questions</h3>
            </div>
            <ol>
              {EXTERNAL_BETA_FEEDBACK_QUESTIONS.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <pre>{EXTERNAL_BETA_FEEDBACK_TEMPLATE}</pre>
          </div>
        </div>
      </section>
    </>
  );
}
