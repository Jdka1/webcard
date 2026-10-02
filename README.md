# Deploying

1. Vercel project settings should use Framework Preset `Other`, no build command, and output directory `.`.
2. Keep `vercel.json` committed so Vercel serves the repo root instead of `public/`.
3. Deploy by committing changes to `main` and pushing to `origin`: `git push origin main`.
4. After deployment, verify `https://www.staryan.com` returns `200` and `https://staryan.com` redirects to `www`.

# Collection data (for future pages)

The canon and travel routes are currently work-in-progress placeholders. Their data remains version-controlled here, ready for the next implementation pass; only someone who can edit this repository can change it.

- **Canon:** edit `data/canon.json`. The `items` array is displayed from top to bottom, so move a complete item object up or down to reorder it. Set `layout` to `index`, `shelf`, or `notes` to choose the default presentation; visitors may still preview the other two layouts with the on-page controls.
- **Travel:** edit `data/travel.json`. Add a place with `name`, `country`, decimal-degree `latitude` and `longitude`, and an optional `note`. The list order is yours; map pins are positioned from the coordinates. The initial entries are locations already present in the photography work.

After changing either file, commit and push to `main` to publish it. A future password-protected editor is tracked in `TODO.md`.
