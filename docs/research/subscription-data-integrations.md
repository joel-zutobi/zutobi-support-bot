# Subscription data integration research

Research date: 2026-09-14

This report asks one practical question: given the email address on a support message, how can an agent find the customer's account and current subscription state without gaining the ability to change billing data?

Only first-party documentation and vendor-owned repositories support factual claims below. A product not listed as having an official MCP may still have community projects. I did not treat those as a safe basis for a live support inbox.

## Recommendation

Build one small, Zutobi-owned, read-only `support_lookup` MCP. It should query Zutobi's account service first, resolve the email to a stable internal user ID, and use provider identifiers already attached to that account. Provider APIs should sit behind this service. The support agent should not receive broad Stripe, PayPal, Paddle, Apple, Google, or Solidgate tools directly.

This matters more than which MCP package is easiest to install. Stripe, PayPal, Paddle, and RevenueCat have official MCP servers, but several also expose write operations. Apple and Google do not provide a general API that starts from an email address. The reliable join belongs in Zutobi's account database.

For mobile subscriptions, RevenueCat is the best candidate for a single Apple and Google subscription view if Zutobi already uses it or is willing to integrate and migrate purchase data. RevenueCat is a product integration, not a drop-in lookup proxy. It needs stable App User IDs, store credentials, server notifications, and purchase or receipt ingestion.

## Capability summary

| Service | Official MCP | Official CLI | Email to customer | Current subscription state | Practical verdict |
| --- | --- | --- | --- | --- | --- |
| Stripe | Yes, hosted at `https://mcp.stripe.com` | Yes | Exact email filter on customers | List subscriptions by customer ID | Good direct API adapter. Use a restricted read-only key. |
| Solidgate | No official account-data MCP found | No first-party general CLI found | Hub can search email. Documented Billing 1.0 API lookup starts with `customer_account_id`. | List subscriptions by customer ID, or get by subscription ID | Store Solidgate IDs on the Zutobi user. Do not depend on email search at runtime. |
| PayPal | Yes, hosted and local | No standalone account-query CLI documented | No direct email-to-subscription operation in the current MCP or Subscriptions REST API | Get subscription by subscription ID | Keep the PayPal subscription ID in Zutobi. Transaction scanning is only a fallback. |
| Paddle Billing | Yes, hosted at `https://mcp.paddle.com/mcp` | No separate CLI needed for this use case | Exact email filter on customers | List subscriptions by customer ID | Strong fit. Prefer the API behind the Zutobi wrapper with a read-only key. |
| Google Play | No vendor MCP for Android Publisher account data found | No dedicated vendor CLI for this lookup | Play Console UI can search full email. The Developer API cannot start from email. | `purchases.subscriptionsv2.get` by purchase token | Keep purchase tokens and internal account identifiers. Use the API, not UI automation. |
| Apple | No vendor MCP for customer transaction lookup found | Transporter exists for uploads, not customer subscription lookup | No email lookup | App Store Server API by transaction ID or order ID | Keep transaction IDs and an `appAccountToken` mapping. App Store Connect API is not the status API. |
| RevenueCat | Yes, hosted at `https://mcp.revenuecat.ai/mcp` | Yes, the official `rc` CLI | API v2 can search exact `$email` when that attribute has been supplied | Customer response includes active entitlements and subscription data | Best mobile-store unifier. Still anchor identity in Zutobi's user ID. |

## Findings by provider

### Stripe

Stripe has an official hosted MCP server. Its current interface includes `stripe_api_read`, which can call supported GET methods, and `stripe_api_write`, which can call write methods. Supported read methods include listing customers and subscriptions. Stripe explicitly recommends confirmation for MCP tools and warns about prompt injection when combining servers. [Stripe MCP documentation](https://docs.stripe.com/mcp)

The direct API supports the needed join. `GET /v1/customers` accepts a case-sensitive exact `email` filter. Stripe may return more than one Customer object because email is not a unique customer key. Once the integration has a customer ID, `GET /v1/subscriptions` accepts that customer ID and returns subscription records and statuses. [List customers](https://docs.stripe.com/api/customers/list), [list subscriptions](https://docs.stripe.com/api/subscriptions/list)

Stripe also maintains an official CLI that can call API resources, but it is mainly a developer and operations tool. It is useful for testing the adapter, not as the production interface for the support skill. [Stripe CLI repository](https://github.com/stripe/stripe-cli)

For production, create a restricted API key with `Read` access only to the minimum resources. Stripe documents per-resource `None`, `Read`, and `Write` permissions and recommends restricted keys over full secret keys. [Stripe API key documentation](https://docs.stripe.com/keys), [key security guidance](https://docs.stripe.com/keys-best-practices)

Verdict: use the direct API behind `support_lookup`. The official MCP is excellent for supervised investigation, but its generic write tool is broader than this bot needs.

### Solidgate

I found official SDK repositories and official Agent Skills, but no vendor-run account-data MCP or general Solidgate CLI. This is a gap, not a blocker. Solidgate has direct APIs for the data needed by support. [Solidgate GitHub organization](https://github.com/solidgate-tech)

The exact route depends on which Solidgate Billing generation Zutobi uses. Billing 1.0 documents `POST https://subscriptions.solidgate.com/api/v1/subscription/list`, starting with `customer_account_id`, and returns each subscription's status and billing dates. Subscription details also include the customer account ID and email. [Retrieve subscription data](https://docs.solidgate.com/billing/subscriptions/subscriptions-1.0/manage-subscription/retrieve-subscription-data/)

Billing 2.0 has customer records with an email and optional `merchant_customer_id`. The Hub can filter customers by email, but the public guide only clearly documents API retrieval by customer ID. Do not assume that the Hub's email filter is also an API filter without confirming the current OpenAPI operation available to Zutobi's account. [Solidgate customers](https://docs.solidgate.com/billing/manage-customers/customers/)

Solidgate API v2 uses scoped Bearer keys and can bind a key to selected channels and permissions. API v1 uses channel keys and HMAC signing. This makes v2 preferable where the required Billing endpoints are available. [Solidgate API access](https://docs.solidgate.com/payments/integrate/access-to-api/)

Verdict: add a direct adapter. Resolve email in Zutobi first, then call Solidgate with the stored `customer_account_id`, customer ID, or subscription ID. Confirm whether the live integration uses Billing 1.0 or 2.0 before implementing.

### PayPal

PayPal has an official remote MCP service at `https://mcp.paypal.com` and a sandbox service at `https://mcp.sandbox.paypal.com`. PayPal also owns the local `@paypal/mcp` package. [PayPal MCP setup](https://developer.paypal.com/ai-tools/mcp-server), [PayPal MCP repository](https://github.com/paypal/paypal-mcp-server)

The official MCP does not provide the email lookup workflow we need. Its subscription tool retrieves details from a `subscription_id`. The underlying REST endpoint also requires the subscription ID and returns status plus subscriber data, including email. [PayPal agent tool reference](https://github.com/paypal/agent-toolkit/blob/main/PROMPTS.md), [show subscription details](https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/)

PayPal's Transaction Search response can include the payer email and a PayPal reference whose type is `SUB`, which may point to a subscription. That makes a bounded transaction scan a possible recovery path. It is a poor primary index because it searches transaction history rather than a customer subscription directory. [Transaction Search response schema](https://developer.paypal.com/api/transaction-search/v1/definitions/transaction_detail_list/)

The older NVP and SOAP `TransactionSearch` operation accepts a payer email filter. It is a legacy API family, so I would not make it the foundation of a new support integration. [SOAP TransactionSearch](https://developer.paypal.com/api/nvp-soap/transaction-search-soap/)

Verdict: persist PayPal subscription IDs and payer IDs when checkout completes or when webhooks arrive. The lookup adapter should start from those stored IDs. The official MCP can inspect a known subscription, but attaching it directly would also expose payment, refund, invoice, and subscription mutation tools.

### Paddle Billing

Paddle has a first-party remote MCP for live and sandbox accounts. The live URL is `https://mcp.paddle.com/mcp`; the sandbox URL is `https://sandbox-mcp.paddle.com/mcp`. It exposes a codemode interface that can search and execute Paddle API methods. The remote server does not filter operations itself. Paddle says to restrict access through the API key's permissions or the OAuth user's access. [Paddle MCP documentation](https://developer.paddle.com/sdks/ai/paddle-mcp/), [remote MCP announcement](https://developer.paddle.com/changelog/2026/remote-paddle-mcp-server/)

The direct API has a clean two-step lookup. `GET /customers?email=...` performs precise email matching and requires `customer.read`. Then list subscriptions with the returned `customer_id`. Paddle documents `customer_id` filtering for both subscriptions and transactions. [List customers](https://developer.paddle.com/api-reference/customers/list-customers/), [provisioning and subscription state](https://developer.paddle.com/build/subscriptions/provision-access-webhooks/)

The older local MCP package can expose only read-only tools, but Paddle says the hosted MCP supersedes it and the local package will not receive new API operations. [Paddle MCP repository](https://github.com/PaddleHQ/paddle-mcp-server)

Verdict: Paddle is almost as straightforward as Stripe. Use its API behind `support_lookup`, with a key limited to customer, subscription, and transaction reads. The official remote MCP is useful for supervised diagnostics, but the wrapper gives Zutobi a narrower contract.

### Google Play

There are two different capabilities to keep straight. The Play Console website can manually search Order management by order ID or the user's full email address. This is useful for a human fallback. [Play Console order management](https://support.google.com/googleplay/android-developer/answer/2741495)

The Google Play Developer API does not offer the same email search. `purchases.subscriptionsv2.get` requires a package name and purchase token. It returns current state, expiry, renewal information, cancellation context, and external account identifiers. Google calls this endpoint the source of truth for subscription state. [Subscriptions v2 get](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get), [subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)

Standard Play Billing purchases do not expose the buyer's Google email as the lookup key. The response can contain `obfuscatedExternalAccountId` and `obfuscatedExternalProfileId` when the app set them during the purchase flow. The `subscribeWithGoogleInfo.emailAddress` field is specific to Subscribe with Google and should not be treated as a general Play Billing email field. [SubscriptionPurchaseV2 schema](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2)

Google recommends sending every purchase token to the app backend, retaining it, verifying it through the Developer API, and checking the configured obfuscated account mapping. [Play Billing security guidance](https://developer.android.com/google/play/billing/security)

I found community MCP projects for Android Publisher, but no Google-owned MCP or dedicated Google CLI for this customer lookup. Google publishes API client libraries, including the Android Publisher Java client. [Google Android Publisher Java client](https://github.com/googleapis/google-api-java-client-services/tree/main/clients/google-api-services-androidpublisher/v3)

Verdict: the internal account service must map a user to purchase tokens or store order identifiers. Keep Play Console email search as a manual exception path, never as browser automation for the agent.

### Apple App Store

Apple splits catalog administration from customer purchase status. The App Store Connect API manages app records, product metadata, pricing, TestFlight, reports, and related configuration. It is not the API for looking up a customer's live subscription. [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/)

The App Store Server API returns customer transaction and subscription status. `Get All Subscription Statuses` requires any transaction ID belonging to that customer and app. `Look Up Order ID` starts from the order ID on the customer's App Store receipt. Neither endpoint accepts an email address. [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi), [Get All Subscription Statuses](https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses), [order ID](https://developer.apple.com/documentation/appstoreserverapi/orderid)

The clean identity join is `appAccountToken`. Zutobi generates this UUID and sends it when the customer buys. Apple returns the same UUID in transaction and renewal information, which lets Zutobi associate the Apple transaction with its own user. [Apple `appAccountToken`](https://developer.apple.com/documentation/appstoreserverapi/appaccounttoken)

Apple publishes official server libraries for Swift, Node.js, Python, and Java. These handle JWT authorization and signed transaction verification. I found no Apple-owned MCP for individual customer transactions and no Apple CLI for this lookup. Transporter is for build uploads, not subscription support. [Apple App Store Server library](https://github.com/apple/app-store-server-library-swift)

Verdict: store original transaction IDs and the `appAccountToken` link in Zutobi. Query App Store Server API by transaction ID. If those identifiers are missing, ask the customer for the order ID from their receipt or use the app's restore-purchases flow.

### RevenueCat as the mobile-store layer

RevenueCat has an official hosted MCP at `https://mcp.revenuecat.ai/mcp`, with OAuth or an API v2 key. It covers project and customer data as well as configuration changes, so permissions still matter. [RevenueCat MCP](https://www.revenuecat.com/docs/tools/mcp), [MCP setup](https://www.revenuecat.com/docs/tools/mcp/setup)

RevenueCat also maintains the official `rc` CLI. It supports customer list and show commands and a generic API command, which makes it useful for supervised diagnostics and integration development. It should not be the long-running interface exposed to the support agent. [RevenueCat CLI repository](https://github.com/RevenueCat/cli), [CLI command reference](https://www.revenuecat.com/docs/tools/cli/commands)

RevenueCat API v2 can search customers by an exact `$email` attribute, App User ID, store transaction identifier, or Apple order ID. Its customer response includes active entitlements. The search endpoint can use the narrow `customer_information:customers:read` permission. [RevenueCat customer API v2](https://www.revenuecat.com/docs/api-v2/customer)

Email lookup works only if Zutobi supplies `$email`. RevenueCat recommends a stable, non-guessable App User ID and specifically advises against using an email address as that ID. The same App User ID across platforms lets RevenueCat present one entitlement state for iOS and Android. [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers), [customer attributes](https://www.revenuecat.com/docs/customers/customer-attributes)

Adopting RevenueCat requires integration work. Existing purchases need receipts or purchase tokens imported, and new purchases need the SDK or server-side ingestion plus store notifications. RevenueCat documents migration paths for Apple and Google and describes itself as a subscription-status source of truth across platforms. [RevenueCat migration paths](https://www.revenuecat.com/docs/migrating-to-revenuecat/migration-paths), [receipt imports](https://www.revenuecat.com/docs/migrating-to-revenuecat/migrating-existing-subscriptions/receipt-imports)

Verdict: use RevenueCat to normalize Apple and Google if Zutobi wants to own less store-specific lifecycle code. Do not adopt it solely to add an MCP. The value is the normalized subscription system behind the MCP.

## Zutobi identity boundary

The email sender in Gmail is conversation evidence. It is not enough to prove ownership of a Zutobi account or a billing record.

The first tool call should be a Zutobi-owned lookup with a narrow input:

```text
lookup_customer(email)
```

The account service should perform these steps without giving the model raw database access:

1. Normalize casing and Unicode safely, then check exact verified email addresses and recorded verified aliases. Do not strip dots or plus tags globally because providers treat those forms differently.
2. Return zero, one, or many account matches. Never silently choose between multiple accounts.
3. For one match, return the stable Zutobi user ID and provider references already bound to that user.
4. Query providers by those references. Use provider email search only as a diagnostic fallback.
5. If the sender email differs from the account's verified email, return `identity_mismatch` and require human review. Do not return the other account's details to the customer.

Suggested provider references:

```json
{
  "zutobi_user_id": "usr_...",
  "stripe_customer_ids": ["cus_..."],
  "solidgate_customer_account_ids": ["..."],
  "paypal_subscription_ids": ["I-..."],
  "paddle_customer_ids": ["ctm_..."],
  "google_play_purchase_tokens": ["..."],
  "apple_original_transaction_ids": ["..."],
  "apple_app_account_token": "uuid",
  "revenuecat_app_user_id": "opaque-stable-id"
}
```

Do not return secrets, full payment method data, billing addresses, raw receipts, or purchase tokens to the language model. The adapter can use those values internally and return a normalized result.

## Proposed read-only contract

Expose one tool at first:

```text
lookup_customer_subscription(email)
```

Return only facts needed to draft support replies:

```json
{
  "match": "exact_verified | alias_verified | none | ambiguous | identity_mismatch",
  "zutobi_user_id": "usr_...",
  "retrieved_at": "2026-09-14T12:00:00Z",
  "subscriptions": [
    {
      "provider": "stripe | solidgate | paypal | paddle | google_play | app_store | revenuecat",
      "provider_record_id": "redacted-or-safe-id",
      "product": "premium_annual",
      "status": "active | trialing | grace_period | past_due | paused | canceled | expired | unknown",
      "auto_renews": true,
      "access_until": "2026-10-14T00:00:00Z",
      "scheduled_cancellation_at": null,
      "last_payment_status": "paid",
      "source": "provider_api",
      "source_retrieved_at": "2026-09-14T11:59:58Z"
    }
  ],
  "warnings": []
}
```

The wrapper should have no generic SQL, arbitrary URL, arbitrary provider method, or write tool. Enforce GET-only or explicit read-operation allowlists in code. Provider credentials should have read-only scopes or resource permissions as well. Both layers matter.

Log the operator, customer lookup key hash, providers queried, request IDs, result count, and timestamp. Do not log email bodies, raw credentials, full payment details, or provider payloads.

## Facts and inference

### Verified facts

- Stripe, PayPal, Paddle, and RevenueCat operate official MCP servers.
- Stripe and Paddle APIs support a direct email-to-customer lookup followed by subscription lookup.
- Solidgate documents customer-ID and subscription-ID retrieval. Its Hub supports customer email search.
- PayPal's current subscription detail operation requires a subscription ID.
- Google Play's subscription status API requires a purchase token. The Play Console website, separately, supports manual full-email order search.
- Apple's subscription status API requires a transaction ID. Its order lookup requires an order ID. Neither documents email as an input.
- RevenueCat can search an exact `$email` attribute and return active entitlement data.

### Recommendations and inferences

- A Zutobi-owned aggregation MCP is safer than connecting every vendor MCP directly to the support agent.
- Zutobi's account database should be the identity authority because provider emails can differ, change, duplicate, or be unavailable.
- Stripe and Paddle are the best first adapters because their documented email joins are direct.
- Solidgate and PayPal should follow after Zutobi confirms which identifiers are already stored.
- RevenueCat is the most practical way to unify Apple and Google status, but only if the migration and ongoing store integration are worthwhile beyond this support bot.

## Suggested delivery order

1. Audit the Zutobi user schema and checkout/webhook code. Record which provider IDs already exist and which billing generation Solidgate uses.
2. Build `support_lookup` with internal account matching and synthetic fixtures. Return `none` or `ambiguous` safely before any provider access.
3. Add Stripe and Paddle read-only adapters.
4. Add Solidgate and PayPal adapters using stored IDs. Backfill missing IDs from historical webhook or transaction data in a separate controlled job.
5. For mobile, choose between the existing Zutobi purchase-token store and RevenueCat. Do not attempt email-based Apple or Google API lookup.
6. Run classify-only support tests. Show the operator the normalized facts and proposed category before the skill may create a Gmail draft.
