# Mobile Deployment

The GitHub Pages frontend is available at:

https://hariz-ger.github.io/Chatbot_AI_ML/

GitHub Pages can only host the static Next.js frontend. For chat, login, admin, and database features to work from a phone, deploy the Express server and PostgreSQL database to a backend host such as Render or Railway.

## Render Setup

This repo already includes `render.yaml`.

1. Go to Render and create a new Blueprint from this GitHub repo.
2. Add these environment variables to the `chatbot-server` service:
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `FRONTEND_URL=https://hariz-ger.github.io`
3. Let Render create the PostgreSQL database from `render.yaml`.
4. Copy the deployed server URL, for example `https://chatbot-server.onrender.com`.
5. In GitHub, go to `Settings > Secrets and variables > Actions > Variables`.
6. Add `NEXT_PUBLIC_API_URL` with your deployed server URL.
7. Re-run the `Deploy Frontend to GitHub Pages` workflow.

After that, open the GitHub Pages URL on your phone.
