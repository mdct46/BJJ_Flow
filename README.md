# BJJ Flow

An installable web app for Brazilian jiu-jitsu: a positional map of how a match moves,
a technique glossary with step-by-step basics, a skill tracker, and (coming next) a
training log.

- The app lives in `app/` and is published to GitHub Pages on every push to `main`.
- All user data stays on the device. Nothing is sent to a server.
- `handoff.md` has the architecture, data model and roadmap.

Run locally: from `app/`, run `python -m http.server 8765` and open http://localhost:8765.
