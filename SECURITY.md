# Security

Never post credentials, private documents, or exploit details in public issues.
Use the repository's private vulnerability reporting feature if enabled, or
contact the maintainer privately before sharing details.

OCR requires a private access key and Google Application Default Credentials.
Keep both outside Git. The application rejects OCR requests when the access key
is absent or shorter than 32 characters. Uploaded images are validated and
re-encoded on the server before being sent to Google Cloud Vision.

The built-in OCR budget is **process-local**, allows one active request, at most
one attempt every six seconds, and ten attempts per UTC day. Failed authorized
attempts also count. This budget resets on process restart and is independent
for each process. It is a safety net, not a durable billing limit.

Before any public deployment, configure persistent rate limiting at your
gateway or application layer, Google Cloud Vision quotas, and billing alerts.
Use HTTPS, workload identity, and a dedicated service account with only the
permissions needed for Vision. A billing alert does not impose a spending cap.
For a public multi-user product, replace the shared access key with individual
user authentication and durable per-user quotas.

Run `npm run check` and `npm audit` before releases. Review lockfile and
dependency updates, and keep Next.js on a supported patched release.

A service-account key was removed from the local project during preparation.
Deleting that file does not revoke the key in Google Cloud. The owner must
revoke the old key if it has been shared or exposed; rotation is recommended
before deploying this application with cloud access.
