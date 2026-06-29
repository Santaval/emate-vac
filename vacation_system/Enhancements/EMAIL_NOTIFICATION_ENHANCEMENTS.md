# Email Notifications - Future Enhancements and Production Readiness

This document outlines recommended improvements and operational considerations for moving the vacation workflow email notifications from a local/testing setup to a real dev, staging, or production implementation.

## Current Behavior

The vacation system already sends email notifications during the approval workflow:

- When a professor submits a vacation request, reviewers with the `Jefe_de_Departamento` role are notified.
- When the department head approves, reviewers with the `Jefe_Administrativo` role are notified.
- When administrative leadership approves, reviewers with the `Director_de_Escuela` role are notified.
- When the director gives final approval, the requesting professor is notified.
- When a request is rejected at any step, the requesting professor is notified.

Recipients are resolved from the `email` field stored for each user. If a user does not have an email address, no notification is sent to that user.

## Current Local Configuration

For local testing, the system can use Mailpit:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
APP_BASE_URL=http://localhost:3002
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="SAC Vacaciones <no-reply@sac.local>"
```

This setup is only for local development. It does not send real emails. Messages are captured in Mailpit:

```txt
http://localhost:8025
```

## How to Test Email Notifications Locally with Mailpit

Use this flow when you want to verify email notifications without sending real emails.

### 1. Configure local environment variables

In the vacation system local `.env` file:

```txt
EMATE_Vacation_System/vacation_system/.env
```

Use:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
APP_BASE_URL=http://localhost:3002
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="SAC Vacaciones <no-reply@sac.local>"
```

Important:

- `EMAIL_NOTIFICATIONS_ENABLED` must be `true` for Mailpit testing.
- `SMTP_HOST=localhost` and `SMTP_PORT=1025` point the app to the local Mailpit SMTP server.
- `SMTP_FROM` is only the visible sender for local testing.
- This setup does not send real emails.

### 2. Start Mailpit

Run Mailpit in a separate terminal and keep it open:

```bash
docker run --rm --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Mailpit should show:

```txt
[smtp] starting on [::]:1025
[http] accessible via http://localhost:8025/
```

Open the inbox:

```txt
http://localhost:8025
```

### 3. Restart the local environment

After changing `.env`, restart the app so Next.js reloads the environment variables:

```bash
./stop-local.sh
./start-local.sh
```

If the vacation system fails to restart because port `3002` is already in use, stop the stale process and start again.



## Production-Ready SMTP Configuration

For a real dev/staging/production environment, the system should use an institutional SMTP account or an approved email delivery service.

Example:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
APP_BASE_URL=https://vacation-system-dev.example.com

SMTP_HOST=smtp.institution.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications-sac@example.com
SMTP_PASS=<secret>
SMTP_FROM="SAC Vacaciones <notifications-sac@example.com>"
```

If the provider requires SSL on port `465`:

```env
SMTP_PORT=465
SMTP_SECURE=true
```

## Recommended Sender Account

The sender should be an official system or service account, not a personal email address.

Recommended examples:

```txt
SAC Vacaciones <notifications-sac@institution.ac.cr>
SAC Vacaciones <no-reply@institution.ac.cr>
SAC Vacaciones <vacaciones@institution.ac.cr>
```

Important notes:

- `SMTP_FROM` should match `SMTP_USER`, or it must be an authorized alias.
- A personal email can be used temporarily for testing, but it should not be committed or kept as the permanent sender.
- The SMTP password must be stored as an environment secret.
- Credentials must never be committed to the repository.

## Future Enhancements

### 1. Environment-Based Notification Modes

Add a clear notification mode per environment:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_MODE=smtp
```

Potential modes:

```txt
disabled
mailpit
smtp
sandbox
```

This would make it easier to distinguish between local testing, QA capture, and real email delivery.

### 2. Email Override for QA

Add an optional override recipient for dev/staging:

```env
EMAIL_OVERRIDE_TO=qa-team@example.com
```

When enabled, all notifications would be redirected to a QA inbox instead of real users.

Benefits:

- Prevents accidental emails to real users.
- Allows QA to test the full workflow safely.
- Keeps production behavior unchanged.

Recommended behavior:

- Only allow this variable outside production.
- Add a visible note in the email body when a message has been redirected.

### 3. Dedicated SMTP Service Account

Request an official SMTP/service account from IT or SAC administrators.

The account should support:

- SMTP authentication.
- Authorized sender alias.
- Production-safe rate limits.
- Monitoring or logs if available.

The final sender should be approved by the institution:

```txt
SAC Vacaciones <notifications-sac@institution.ac.cr>
```

### 4. Delivery Observability

Improve operational visibility by logging structured email events:

- Notification type.
- Request ID.
- Recipient count.
- Recipient role.
- SMTP success/failure.
- Error message when delivery fails.

Avoid logging sensitive credentials or full email bodies.

Example log fields:

```txt
notification_type=pending_review
request_id=123
recipient_role=Jefe_de_Departamento
recipient_count=2
status=sent
```

### 5. Email Delivery Failure Strategy

Currently, an email failure should not block the approval workflow. This is usually the right behavior.

Future improvements could include:

- Retrying failed email sends.
- Storing failed notifications in a table.
- Adding an admin view for failed notifications.
- Allowing manual resend.

Potential table:

```txt
email_notification_log
```

Suggested fields:

```txt
id
request_id
notification_type
recipient_email
status
error_message
created_at
sent_at
retry_count
```

### 6. Templates and Branding

Move email templates into a dedicated template layer.

Future template improvements:

- Institution-approved branding.
- Consistent header/footer.
- Support contact information.
- Clear call-to-action button.
- Plain text fallback.
- Spanish copy review by stakeholders.

### 7. Security and Compliance

Before production rollout:

- Confirm SPF, DKIM, and DMARC alignment with IT.
- Confirm the sender account is authorized.
- Store SMTP credentials as secrets.
- Avoid committing real SMTP values to `.env.example`.
- Avoid exposing sensitive user data in emails.

### 8. Configuration Validation on Startup

Add startup validation or health checks for email configuration.

Example checks:

- `EMAIL_NOTIFICATIONS_ENABLED=true` requires `SMTP_HOST`.
- Real SMTP requires `SMTP_FROM`.
- If `SMTP_USER` is set, `SMTP_PASS` should also be set.
- Warn if `SMTP_HOST=localhost` in non-local environments.


## Recommended Dev/Staging Rollout

1. Deploy the email notification code with notifications disabled:

```env
EMAIL_NOTIFICATIONS_ENABLED=false
```

2. Configure a safe test SMTP option:

- Mailpit in dev, or
- QA override inbox, or
- Institutional test SMTP account.

3. Run the full approval workflow.

4. Validate email contents and links.

5. Confirm real user emails are correct.

6. Enable real SMTP only after stakeholder approval.

## Production Readiness Checklist

- Official sender account approved.
- SMTP credentials stored as secrets.
- `SMTP_FROM` is authorized.
- `APP_BASE_URL` points to the correct public environment.
- User emails are populated from the authoritative source.
- Reviewer roles have active users with valid email addresses.
- Failure logging is available.
- QA has validated approval and rejection flows.
- Stakeholders have approved the email wording.
- Notifications are not accidentally pointing to Mailpit or localhost.

