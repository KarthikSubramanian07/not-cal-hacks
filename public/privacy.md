---
title: not-cal-hacks — Privacy
description: How not-cal-hacks handles account and application data.
canonical: https://not-cal-hacks.pages.dev/privacy
last-updated: 2026-10-08
---

# Privacy policy for not-cal-hacks

This policy describes how the not-cal-hacks hackathon application portal collects and uses data when you create an account, file an application, or review applications as an organizer.

## What we collect

- **Account data:** email address, display name, password hash (or Google account identifiers when Sign in with Google is enabled), and role (applicant or organizer).
- **Application data:** answers you submit for hacker or judge tracks, including school, project essays, links you choose to share, and status history.
- **Review data:** rubric scores, optional comments, and decision events written by organizers.
- **Session data:** a session cookie used to keep you signed in. Tokens are hashed at rest.
- **Operational logs:** request metadata needed to operate rate limits and diagnose outages. Logs are not used for advertising.

## How we use it

Account and application data exist so you can apply, track status, and so organizers can review and decide. Blind review strips identifying fields on the server before an application is sent to a reviewer unless that reviewer explicitly reveals identity. We do not sell personal data. We do not use application essays to train third-party models.

## Sharing

Data is stored in Cloudflare D1 for the deployed project. It is shared with organizers of the event instance you applied to, and with infrastructure operators required to host the site. Public demo accounts on the live site contain synthetic seed data and should not be used for real personal information.

## Retention and deletion

You may request deletion of your account and applications by contacting the maintainers through the [contact page](https://not-cal-hacks.pages.dev/contact). Demo seed data may be reset at any time. Security logs are retained only as long as needed for abuse prevention.

## Agents and crawlers

Public documentation, OpenAPI, llms.txt, and machine-readable discovery files contain no applicant PII. Authenticated API routes require a session. Agents must not scrape or store private application answers from authenticated surfaces.

## Changes

Material changes to this policy will be reflected on this page with an updated date. Continued use of the portal after a change constitutes acceptance of the revised policy.
