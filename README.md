# Client (Frontend)

This is the Spotter frontend app.

For a comprehensive overview of the whole system (architecture, setup, endpoints), see the top‑level `../README.md` and `../backend/API_README.md`.

## Dev commands

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Notes
- Requires `VITE_MAPBOX_TOKEN` in `client/.env` for maps and autocomplete.
- Calls the Django backend at http://localhost:8000 under `/api/` (CORS + CSRF handled).
