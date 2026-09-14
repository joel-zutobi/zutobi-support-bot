# Behavioral evaluation cases

`cases.json` contains anonymized inputs and expected outcomes for the skill's safety boundaries and all 16 categories.

To forward-test the skill, give a fresh agent the skill folder and one case's `input` object. Do not show the agent the `expected` object. Keep Gmail disconnected or use classify-only mode so the evaluation cannot write to a live inbox.

Compare the result with `expected` after the agent finishes. A case passes only when category, disposition, language, refund gate, and missing-fact decision all match. Review the proposed reply for unsupported facts, privacy leaks, refund language, signature, URLs, and em dashes.

The evaluation is complete when every case passes. Add anonymized cases after real dry runs only when they reveal a distinct failure or boundary.
