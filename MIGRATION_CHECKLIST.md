# English Frontend Migration Checklist

This repository is the English presentation and deployment fork of the main frontend.

## Rules

- Keep backend API contracts unchanged.
- Do not modify the production frontend in `D:\EDTeach\CI_CD\edtech-frontend`.
- Prefer copy changes over structural rewrites while migration is in progress.
- Keep auth, CSRF, and cookie behavior identical to the current production frontend.

## Migration Phases

- [x] Create a separate frontend workspace without `.git`, `.next`, and `node_modules`.
- [ ] Review environment variables and Vercel settings for the new deployment.
- [x] Translate shared app shell and metadata.
- [x] Translate auth pages.
- [x] Translate student shell.
- [x] Translate student dashboard and roadmap flows.
- [x] Translate lesson flows: part1, part2, extra, report.
- [x] Translate teacher dashboard flows.
- [x] Translate teacher copilot and exercise upload flows.
- [x] Translate shared curriculum labels and helper messages.
- [ ] Review all loading, empty, and error states.
- [ ] Verify direct backend URL usages outside `/api` rewrite.
- [ ] Verify notification and socket behavior for the new frontend domain.
- [ ] Run build locally.
- [ ] Prepare Vercel deployment env checklist.

## Backend Integration Notes

- Frontend uses `/api` rewrite to reach the deployed backend.
- Frontend auth depends on HttpOnly cookies and CSRF cookie/header flow.
- Any feature using Socket.IO, EventSource, or direct backend URLs must be checked separately.

## Current Working Scope

In progress:

- Final review of loading, empty, and error states outside student routes
- Local build verification after installing dependencies
