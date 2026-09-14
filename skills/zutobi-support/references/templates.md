# Ordinary reply templates

Read this file only after classifying a thread. Use the template matching the category. The safety rules and verified-fact requirements in `SKILL.md` take priority over every template.

Replace `{name}` with a reliable first name. If none appears, use `Hi` without a comma. Keep the original signature and URLs.

## 1. Refund first ask

This template does not offer a refund.

```text
Hi {name},

The subscription renews automatically unless it's canceled, which is why the payment was processed.

To avoid any further charges, please make sure the subscription is canceled. Depending on how you subscribed, through the app or on the website, the steps differ slightly. This article walks through them:
https://zutobi.com/us/faq/managing-my-subscription-trial-and-billing

Best regards,
Joel
```

## 2. Refund pushback

Use this ordinary template only when the operator chooses to hold the existing decision.

```text
Hi {name},

I understand this isn't the answer you were hoping for, but we aren't able to issue a refund in this case. Please make sure the subscription is canceled so no further charges are made if it isn't already.

Best regards,
Joel
```

## 3. Claimed prior cancellation

```text
Hi {name},

If the subscription was canceled before this charge, could you send a copy of the cancellation confirmation or a screenshot of the most recent receipt? That will help us locate the subscription and look into what happened.

Best regards,
Joel
```

## 4. Generic cancellation

```text
Hi {name},

The cancellation steps depend on whether you subscribed through the app or on the website. This article explains each option:
https://zutobi.com/us/faq/managing-my-subscription-trial-and-billing

If you have any questions, please let me know.

Best regards,
Joel
```

## 5. iOS cancellation

```text
Hi {name},

You cancel the subscription in your Apple account settings. Apple provides step-by-step instructions here:
https://support.apple.com/en-us/HT202039

If you have any questions, please let me know.

Best regards,
Joel
```

## 6. Android cancellation

```text
Hi {name},

You cancel the subscription in your Google Play account. Google provides step-by-step instructions here:
https://support.google.com/googleplay/answer/7205930

If you have any questions, please let me know.

Best regards,
Joel
```

## 7. Unauthorized charge

This template asks for evidence and does not offer a refund.

```text
Hi {name},

We aren't able to charge a card without authorization. We don't have direct access to card details, so an account would have been created and the payment authorized by you or someone in your household.

To help us locate the account, could you send a copy of your digital receipt or a screenshot of the bank statement showing the exact charge descriptor? Once we find the account, we can look into what happened and determine the right next step.

Best regards,
Joel
```

## 8. Account not found

Fact requirement: Joel or a trusted system message must verify that no account matches the customer's email address.

```text
Hi {name},

I checked, but I couldn't find an account linked to the email address you're writing from. Could you let me know if you may have used another email to sign up? A screenshot of your most recent receipt would also help us locate the account.

If you subscribed through the mobile app, you will need to cancel through the App Store or Google Play:
https://zutobi.com/us/faq/managing-my-subscription-trial-and-billing

Best regards,
Joel
```

## 9. Account email mismatch

Fact requirement: Joel must verify that the customer controls both addresses and that the active subscription belongs to the other address. Do not name the other address unless the customer already named it.

```text
Hi {name},

I found that the active subscription is linked to a different email address from the one you're writing from. Could you check which other email you may have used when signing up? A screenshot of your receipt would help us confirm the account without exposing its details.

Best regards,
Joel
```

## 10. Cancellation completed by Zutobi

Fact requirement: Joel must verify the customer's account, confirm that it is a website subscription, and state that cancellation has been completed.

```text
Hi {name},

I can confirm that your subscription has been canceled. You will not be charged again.

Best regards,
Joel
```

For an App Store or Google Play subscription, use category 5 or 6 instead.

## 11. Technical issue

```text
Hi {name},

Thank you for your email. I'm sorry to hear about the trouble.

In the meantime, please fully close and reopen the app. If that does not help, uninstall and reinstall it. If the issue continues, please send the app version and your device model so we can investigate further.

Best regards,
Joel
```

Content-accuracy complaints require human review and do not use this template.

## 12. Password reset follow-up

Fact requirement: Joel or a trusted system message must verify that the reset code was sent to the customer.

```text
Hi {name},

A password reset code was sent to you. Please make sure you are using the exact email address where you received that code.

If you originally signed up with Google, Apple, or Facebook, log in through that provider instead of entering a password.

Best regards,
Joel
```

## 13. State-approved question

```text
Hi {name},

Zutobi is not a state-approved drivers-ed course. It is a study aid for the written permit or DMV test and does not replace a state-approved course.

I'm sorry this was not clear.

Best regards,
Joel
```
