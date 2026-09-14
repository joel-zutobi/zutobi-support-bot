# Gmail MCP setup and rollout

This repository pins the Gmail MCP server as a Git submodule under `vendor/gmail-mcp-server`. The skill export does not embed or start the server.

Install Git, PowerShell 5.1 or later, and a supported Node.js LTS release before starting. The pinned server declares Node.js 14 or later, but a current LTS release is the safer choice.

## 1. Clone and build

After this repository has a remote, clone it with its pinned dependency:

```powershell
git clone --recurse-submodules <repository-url>
Set-Location '.\Zutobi Support'
.\scripts\setup.ps1
```

For an existing checkout, initialize missing submodules and run setup:

```powershell
git submodule update --init --recursive
.\scripts\setup.ps1
```

The setup script runs `npm ci` and `npm run build` inside the pinned server checkout, then removes development packages. It also builds `dist/zutobi-support.skill` and writes `dist/claude-desktop-mcp.json` with the correct absolute server path for that computer.

## 2. Prepare Google OAuth

1. Create or select a Google Cloud project.
2. Enable the Gmail API for that project.
3. Configure the OAuth consent screen for the account that owns `support@zutobi.com`.
4. Create an OAuth client with application type **Desktop app**.
5. Download the client JSON and save it as `%USERPROFILE%\.gmail-mcp\gcp-oauth.keys.json`.

Keep both `gcp-oauth.keys.json` and `credentials.json` out of Git.

## 3. Authorize a read-only dry run

Start with read-only access. This exposes the thread-reading tools but cannot create drafts or send mail.

```powershell
node .\vendor\gmail-mcp-server\dist\index.js auth --scopes=gmail.readonly
```

The command opens a browser for Google sign-in and then exits. A successful flow writes `%USERPROFILE%\.gmail-mcp\credentials.json`.

The repository's `start.bat` uses the server's default scopes when no credentials exist. Those defaults include `gmail.settings.basic`, which this skill does not need. Use the explicit command above instead.

## 4. Register the server in Claude Desktop

Open `dist/claude-desktop-mcp.json`, which contains the absolute server path for this checkout. Then open **Settings**, **Developer**, and **Edit Config** in Claude Desktop. Merge the generated `gmail` entry into `mcpServers` without removing existing entries.

Restart Claude Desktop. Confirm that `list_inbox_threads` and `get_thread` appear. With read-only authorization, `draft_email` should not appear.

## 5. Install the skill

Build `dist/zutobi-support.skill` with `scripts/package.ps1`. Install that export through the skill import UI used by the target Claude account. Confirm that the installed skill description begins with "Classify messages and draft replies".

Importing a `.skill` file is separate from registering the Gmail MCP server. Both must be present in the same client session.

## 6. Run the classification dry run

Ask the skill to classify a small batch of unread support threads without drafting. Review these fields for every thread:

- thread subject and sender
- chosen category and reason
- exact rendered reply it would use
- duplicate-draft decision
- refund approval or human-review flag

Do not continue if the tool reports exactly 50 threads without acknowledging that it may have reached the server result limit. Fix misclassifications in the skill and repeat the dry run.

## 7. Enable draft creation

Reauthorize with the narrowest scope that supports this server's read and draft tools:

```powershell
node .\vendor\gmail-mcp-server\dist\index.js auth --scopes=gmail.modify
```

Restart Claude Desktop and confirm `draft_email` now appears. This scope also enables send and delete tools. Gmail has no draft-only OAuth scope, so the skill instructions remain the enforcement boundary.

Begin with categories 4, 5, and 6. Ask for Gmail drafts explicitly. Check each created draft in Gmail before expanding to other categories. Keep categories 1, 2, 3, and 7 behind per-thread operator approval.

## 8. Optional server hardening

For a stronger boundary, add a server mode that does not register `send_email`, `reply_all`, `delete_email`, or `batch_delete_emails`. Follow the Gmail server repository's `CLAUDE.md` and required pull-request security audit. This is a server change and is not implemented in this repository.

## Updating the pinned server

The submodule currently pins commit `cdc3b9b3b7ab49dfac111024643ffb7b2492a418`. Update it deliberately, review the server's release and security changes, run its tests, and commit the new submodule pointer in this repository. A normal clone should never float to the latest server commit by itself.

On 2026-09-14, `npm audit --omit=dev` reported 13 production dependency advisories at this commit, including five high-severity findings. The critical advisory in the full audit came from the development-only Vitest runner and is removed by the setup script after the build. Treat the remaining production findings as upgrade work before distributing this setup widely.
