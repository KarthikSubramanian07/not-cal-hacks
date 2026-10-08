# not-cal-hacks CLI

Command-line client for the [not-cal-hacks](https://not-cal-hacks.pages.dev) hackathon application portal.

## Install

```bash
npx not-cal-hacks meta
# or
npm install -g not-cal-hacks
```

## Commands

| Command    | Endpoint                        |
| ---------- | ------------------------------- |
| `health`   | `GET /api/health`               |
| `meta`     | `GET /api/v1/meta`              |
| `types`    | `GET /api/v1/application-types` |
| `statuses` | `GET /api/v1/statuses`          |
| `tracks`   | `GET /api/v1/tracks`            |
| `rubric`   | `GET /api/v1/rubric`            |
| `openapi`  | `GET /openapi.json`             |
| `root`     | `GET /api/v1`                   |

```bash
not-cal-hacks --base https://not-cal-hacks.pages.dev meta
```

Docs: https://not-cal-hacks.pages.dev/developers
