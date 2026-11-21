# Exact Ink

A private proofing tool that compares source copy with text detected in a design
image. It highlights spelling, capitalization, punctuation, additions, and
removals. Built with Next.js, React, TypeScript, and Google Cloud Vision.

## Requirements

- Node.js 22.20 or newer in the Node 22 or 24 release line, and npm.
- Git.
- A Google Cloud project with billing and the Cloud Vision API enabled, if you
  want to run OCR. No credentials are needed to install, test, or build the app.

## Local setup

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Generate a unique random access key locally:

   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. Set `OCR_ACCESS_KEY` in `.env.local` to that value (32?256 characters).
   Enter the same value in the app's **Private access key** field. The browser
   keeps it only in memory and submits it with OCR requests. Never include it
   in a URL, commit it, or give it a `NEXT_PUBLIC_` prefix. An absent or invalid
   server key disables OCR.
5. Configure Google Application Default Credentials outside this repository.
   For local development, you can use `gcloud auth application-default login`
   with an authorized account and configure its quota project. If a credential
   JSON file is necessary, store it outside the project and point
   `GOOGLE_APPLICATION_CREDENTIALS` at its absolute path in `.env.local`.
6. Run `npm run dev` and open http://localhost:9002.

For a production build, run `npm run build`, then `npm start` (port 3000 by
default). Set production secrets in your hosting platform's secret store.

## Privacy and limits

- Source copy and comparison results stay in browser memory.
- Checking sends the masked design image through the server to Google Cloud
  Vision. The server validates PNG/JPEG content, caps it at 5 MB and
  4000 ? 4000 pixels, and re-encodes it to remove embedded metadata.
- The application does not intentionally store uploaded images or OCR text on
  disk or in a database. Google Cloud's service policies still apply.
- Source copy is limited to 300 words and 10,000 characters. Complex tokenized
  documents are rejected to bound browser processing.
- OCR requires the owner's private access key, allows one active request per process,
  and at most ten authorized attempts per process per UTC day, with six seconds
  between attempts. Failed authorized attempts count toward the limit.

The local counter resets on restart and does not coordinate multiple instances.
Before deploying publicly, add durable rate limiting, configure Google Vision
quotas and billing alerts, and use HTTPS and workload identity. Keep the key
private. A shared key is suitable for limited private use; a public product
needs individual user accounts and per-user quotas. See [SECURITY.md](SECURITY.md).

## Checks

- `npm run check`: lint, TypeScript, security regression tests, and a redacted
  secret-pattern scan of files eligible for Git publication.
- `npm audit`: current dependency advisories.
- `npm run build`: production build with TypeScript checking enabled.

GitHub Actions runs these checks for pushes and pull requests. Dependabot checks
npm dependencies and workflow actions weekly. Pattern scanning is a supplement
to manual review, not a guarantee that every kind of secret can be detected.

## Repository preparation

Source repository: [promptsjd/exact-ink](https://github.com/promptsjd/exact-ink).
This folder is its own Git repository with a `main` branch. Environment files,
credential files, dependencies, and build outputs are excluded. Only the empty
`.env.example` configuration template is intended for publication.

The service-account JSON formerly present in the working folder was deleted.
Deleting a file does **not** revoke its cloud key. Revoke/rotate the old key in
Google Cloud before reusing cloud access, especially if it was ever shared.

The repository retains its existing ISC license declaration. Review licensing
before changing it or incorporating third-party content.
