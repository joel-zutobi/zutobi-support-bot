# Zutobi Support

This repository maintains the `zutobi-support` skill. It classifies messages in the `support@zutobi.com` Gmail inbox and can create reply drafts in Zutobi's support voice.

The original April 2026 export is preserved in the first commit. The maintained skill starts at [skills/zutobi-support/SKILL.md](skills/zutobi-support/SKILL.md), with canonical replies under `skills/zutobi-support/references/`.

## Safety model

The skill creates drafts only. It skips any Gmail thread that already contains a message with the `DRAFT` label. Refund language requires an explicit operator decision for each thread.

Gmail does not offer an OAuth scope that permits drafts while forbidding sends. Use `gmail.readonly` for classification dry runs. Draft creation requires `gmail.modify` or `gmail.compose`, both of which also permit sending. The skill therefore treats `send_email` and `reply_all` as out of scope.

## Build the export

Run this from PowerShell at the repository root:

```powershell
.\scripts\package.ps1
```

The script validates key safety rules and writes `dist/zutobi-support.skill`. It uses fixed ZIP timestamps and sorted paths, so unchanged source produces the same archive hash.

Run the full local validation after changing the skill:

```powershell
.\scripts\validate.ps1
```

This packages the skill, checks its fixed safety rules, validates the anonymized behavior case set, and confirms coverage for all 16 categories. The cases are inputs for fresh-agent forward testing. They do not claim that classification behavior is correct until those runs pass.

## Install on another computer

The skill and Gmail server remain separate at runtime, but this repository pins the server as a Git submodule at `vendor/gmail-mcp-server`. Do not commit `node_modules`, built server output, OAuth keys, or Gmail credentials.

After cloning this repository with its submodules, run:

```powershell
.\scripts\setup.ps1
```

The setup script installs the pinned server dependencies, builds the server, packages the skill, and writes a machine-specific MCP config snippet to `dist/claude-desktop-mcp.json`. OAuth still requires the Gmail account owner to create a Desktop OAuth client and approve access in a browser.

The pinned April server revision builds and its 97 tests pass. An audit on 2026-09-14 found 13 production dependency advisories, including five high-severity findings. Review and update that dependency before a broad rollout. The setup script removes development packages after the build, which excludes the vulnerable test runner from the runtime install.

## Set up Gmail

Follow [docs/setup-gmail-mcp.md](docs/setup-gmail-mcp.md). Start with the read-only dry run before authorizing draft creation.

## Repository layout

```text
skills/zutobi-support/SKILL.md  Maintained skill source
skills/zutobi-support/references/  Ordinary and operator-approved templates
scripts/package.ps1            Deterministic packager and safety checks
scripts/validate.ps1           Structural checks for behavioral cases
scripts/setup.ps1              Build the pinned Gmail server and local artifacts
docs/setup-gmail-mcp.md        OAuth, server registration, and rollout runbook
tests/                          Anonymized forward-testing inputs and expectations
vendor/gmail-mcp-server/        Pinned Git submodule, source only
dist/                           Generated exports, ignored by Git
```
