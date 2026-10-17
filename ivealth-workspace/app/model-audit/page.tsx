"use client";

import ModelAuditView from "../ModelAuditView";

export default function ModelAuditPage() {
  return (
    <main className="main-content model-audit-route">
      <a href="/" className="model-audit-back-link">← Back to Research Studio</a>
      <ModelAuditView />
    </main>
  );
}
