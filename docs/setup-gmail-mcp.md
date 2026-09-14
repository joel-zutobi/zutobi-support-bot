# Gmail MCP setup and rollout

This project uses Google's hosted Gmail MCP server at `https://gmailmcp.googleapis.com/mcp/v1`. The skill export contains support policy and templates. It does not contain credentials or Gmail server code.

Google currently marks the Gmail MCP server as Developer Preview. Check Google's current documentation before enabling it for another account.

## 1. Build the skill

Clone the repository and run the local setup:

```powershell
git clone <repository-url>
Set-Location '.\Zutobi Support'
.\scripts\setup.ps1
```

For this existing checkout, run only:

```powershell
.\scripts\setup.ps1
```

This validates the skill and writes `dist/zutobi-support.skill`. It does not contact Google or Claude.

## 2. Prepare the Google Cloud project

Use a Google Cloud project owned by Zutobi. Do not place OAuth client secrets in this repository.

1. Join the Google Workspace Developer Preview if the account or organization is not already enrolled.
2. Create or select the Google Cloud project that will own the integration.
3. Enable both required services for that project:
   - Gmail API, service name `gmail.googleapis.com`
   - Gmail MCP API, service name `gmailmcp.googleapis.com`
4. Open **Google Auth Platform** and configure Branding and Audience.
5. Under Data Access, add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
6. If the app uses External testing, add the Gmail account that will authorize access as a test user.

Use Internal audience when the Cloud project belongs to the Zutobi Google Workspace organization and only Zutobi users need the connector. Otherwise follow Google's verification and testing requirements.

## 3. Create the OAuth client

Create an OAuth 2.0 client in **Google Auth Platform**, **Clients**:

1. Choose **Web application**. The official remote MCP does not use a Desktop app client.
2. Name it `Claude Gmail MCP`.
3. Add this exact authorized redirect URI:

   `https://claude.ai/api/mcp/auth_callback`

4. Create the client and copy its Client ID and Client Secret to a password manager.

Creating the client generates persistent access credentials. Review the project, audience, and redirect URI before pressing **Create**.

## 4. Add the remote connector to Claude

Claude Pro, Max, Team, or Enterprise is required for a custom connector.

1. In Claude or Claude Desktop, open **Settings**, then **Connectors**.
2. Choose **Add custom connector**.
3. Use `Zutobi Gmail` as the server name.
4. Use `https://gmailmcp.googleapis.com/mcp/v1` as the remote MCP server URL.
5. Open Advanced settings and enter the OAuth Client ID and Client Secret.
6. Add the connector, then authenticate the `support@zutobi.com` Gmail account.

The connector must expose `search_threads`, `get_thread`, `list_drafts`, and `create_draft`. Google's documented Gmail MCP tool set has no send-email tool.

## 5. Install the skill

In Claude, open **Customize**, then **Skills**. Upload `dist/zutobi-support.skill` and enable it. Importing the skill is separate from adding the Gmail connector. Both must be available in the same Claude conversation.

## 6. Run the classification dry run

Start with this prompt:

```text
Use the zutobi-support skill in classify-only mode.

Review the unread support inbox threads, up to the configured limit of 50. Do not create drafts and do not make any Gmail changes.

For every thread, report the subject, category, classification reason, missing verified facts, whether it would be drafted, skipped, or sent for human review, and the exact reply it would use. Summarize the category counts at the end.
```

Review every proposed reply. If the result contains exactly 50 threads, confirm that Claude reports the possible result limit. Correct classification mistakes before creating any drafts.

## 7. Test draft creation

Begin with one unambiguous cancellation thread in category 4, 5, or 6. Ask Claude to create a draft for that named thread. Open Gmail and check the recipient, thread association, wording, signature, and links. Keep categories 1, 2, 3, and 7 behind per-thread refund approval.

The official MCP creates a reply draft by passing the latest customer message ID as `replyToMessageId`. The skill also checks `list_drafts` and the thread's `DRAFT` labels before writing.

## Portability

Another operator needs the repository, the packaged skill, access to the configured Claude connector, and permission to authenticate the intended Gmail account. Google hosts the MCP server, so the other computer needs no Node installation or server build.

Official references:

- [Configure Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers)
- [Gmail MCP server guide](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server)
