"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type BetaFeedbackCopyProps = {
  template: string;
};

export function BetaFeedbackCopy({ template }: BetaFeedbackCopyProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyTemplate() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(template);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = template;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2400);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="feedback-copy-actions">
      <button className="button" type="button" onClick={copyTemplate}>
        {status === "copied" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {status === "copied" ? "Template copied" : "Copy feedback template"}
      </button>
      <p className="status-live" aria-live="polite">
        {status === "failed" ? "Copy failed. Select the template text and copy it manually." : status === "copied" ? "Ready to paste into your playtest reply." : ""}
      </p>
    </div>
  );
}
