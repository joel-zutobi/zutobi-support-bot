# Zutobi Support

This repository maintains the `zutobi-support` skill. It classifies messages in the `support@zutobi.com` Gmail inbox and can create reply drafts in Zutobi's support voice.

The original April 2026 export is preserved in the first commit. The maintained skill starts at [skills/zutobi-support/SKILL.md](skills/zutobi-support/SKILL.md), with canonical replies under `skills/zutobi-support/references/`.

The repository also contains a local, read-only TypeScript MCP server for verified Zutobi account and subscription lookup. It calls the fixed Zutobi admin user endpoint by exact email or numeric user ID. See [docs/setup-zutobi-user-lookup-mcp.md](docs/setup-zutobi-user-lookup-mcp.md).

## Safety model

The skill creates drafts only. It uses both `list_drafts` and the `DRAFT` message label to skip threads that already have a draft. Refund language requires an explicit operator decision for each thread.

The project targets Google's official remote Gmail MCP server. Its documented tool set can search and read threads, list drafts, and create drafts. It does not expose a send-email tool. Google still marks the server as Developer Preview, so review the setup before rolling it out to more accounts.

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

The skill and Gmail connection remain separate at runtime. Google hosts the Gmail MCP server, so this repository does not bundle server code or Node dependencies.

After cloning this repository, run:

```powershell
git clone https://github.com/joel-zutobi/zutobi-support-bot.git 'Zutobi Support'
Set-Location '.\Zutobi Support'
.\scripts\setup.ps1
```

The setup script validates the source and builds `dist/zutobi-support.skill`. The account owner must separately connect Google's remote Gmail MCP server to Claude and authorize Gmail access. Follow the runbook linked below. An agent working in this repository should read `AGENTS.md` and the runbook before changing or installing the integration. Claude Code reads `CLAUDE.md`, which points to the shared agent guidance.

The setup script also installs, builds, and tests the local user lookup MCP when Node.js is available. Its authentication token remains a separately provisioned secret.

## Set up Gmail

Follow [docs/setup-gmail-mcp.md](docs/setup-gmail-mcp.md). Start with the read-only dry run before authorizing draft creation.

## Set up billing lookups

Follow [docs/setup-billing-integrations.md](docs/setup-billing-integrations.md). It pins the reviewed package versions and links to each official source repository.

## Repository layout

```text
skills/zutobi-support/SKILL.md  Maintained skill source
skills/zutobi-support/references/  Ordinary and operator-approved templates
scripts/package.ps1            Deterministic packager and safety checks
scripts/validate.ps1           Structural checks for behavioral cases
scripts/setup.ps1              Validate and package the skill
docs/setup-gmail-mcp.md        Official Gmail MCP setup and rollout runbook
docs/setup-billing-integrations.md  Billing MCP and CLI choices
docs/setup-zutobi-user-lookup-mcp.md  Internal account lookup setup
mcp/zutobi-user-lookup/        Read-only TypeScript MCP server
tests/                          Anonymized forward-testing inputs and expectations
dist/                           Generated exports, ignored by Git
```
