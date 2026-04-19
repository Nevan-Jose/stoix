# STOIX // Red Pill — agent & developer notes

## After every change that affects the running app

1. **Restart all local services** from the **repo root** (kills Python on **8787** and Vite on **5173**, then starts both):

   ```bash
   npm install
   npm run stoix:restart
   ```

2. Open **http://127.0.0.1:5173** for the Vite UI (API proxied to Python). Use **Ctrl+C** in that terminal to stop **both** processes.

3. If you only serve the **built** UI via Python: `npm run stoix:kill`, then `npm run build`, then `npm run server`, and open **http://127.0.0.1:8787**.

## Ports

| Port  | Service        |
|-------|----------------|
| 8787  | `server.py`    |
| 5173  | Vite dev (typ.)|
