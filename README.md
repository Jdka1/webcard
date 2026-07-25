# Deploying

1. Vercel project settings should use Framework Preset `Other`, no build command, and output directory `.`.
2. Keep `vercel.json` committed so Vercel serves the repo root instead of `public/`.
3. Deploy by committing changes to `main` and pushing to `origin`: `git push origin main`.
4. After deployment, verify `https://www.staryan.com` returns `200` and `https://staryan.com` redirects to `www`.
