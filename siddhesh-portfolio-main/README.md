# Siddhesh Kedari: Cinematic Cloud and DevOps Portfolio

A static site (HTML, CSS, JavaScript, GSAP) deployed on Vercel. There is no build step.

## What changed in this version

Everything **before** the "Ideas into reality." scene is untouched: preloader, hero frame sequence,
video transition, About and Skills sections.

From that point on, the page is one connected 3D world (Three.js) with the camera travelling
as you scroll:

| Scene | What it is |
|-------|-----------|
| Gateway | Camera flies through glowing portal rings into the world |
| Identity | Rotating holographic core beside the academic profile |
| Skill universe | 5 clusters of clickable nodes. Solid = used in projects, hollow = studied |
| Projects | Interactive CI/CD pipeline (Play button), data-analysis layer stack, portfolio layer stack |
| Journey | Glowing path with a marker that follows your scroll |
| Contact | Portal finale with working email, GitHub, LinkedIn and Back to top links |

New files: `world/world.css`, `world/world.js`. Edited file: `index.html` (the Projects → Contact
sections were replaced, plus one stylesheet link and one script tag). `main.js` and `styles.css` are unchanged.

## Run locally

Browsers block some features on `file://`, so serve the folder over HTTP.

```bash
cd siddhesh-portfolio-main
python -m http.server 8000      # then open http://localhost:8000
# or: npx serve
```

In VS Code you can also use the Live Server extension (right-click `index.html` → Open with Live Server).

## How the 3D layer works

- Three.js **r128** is loaded lazily from cdnjs only when the visitor scrolls near the world,
  so the hero loads as fast as before.
- All text stays in HTML. `world.js` reads the skill buttons, pipeline stages, layers and journey list
  and mirrors them in 3D.
- Fallbacks: no WebGL, a blocked CDN, or the "Flat view" button all show the same content as a plain layout.
- `prefers-reduced-motion` turns off ambient motion and camera easing.
- **Offline or CDN-free use:** download `three.min.js` (r128) and save it as `world/vendor/three.min.js`.
  `world.js` tries the CDN first, then this file.

## Deploy safely (keep your current live site until you approve this)

```bash
git checkout -b 3d-world            # new branch, main stays untouched
# copy these files over your repo: index.html, README.md, world/
git add index.html README.md world
git commit -m "Add interactive 3D world from Ideas into reality onward"
git push -u origin 3d-world
```

Vercel builds a **preview URL** for the branch (Vercel dashboard → Deployments). Test it on your laptop
and phone. When you are happy, merge on GitHub (Pull request → Merge) and production updates.
To roll back, revert the merge commit or redeploy the previous deployment in Vercel.

## Credits

Built on an open-source GSAP cinematic template, customized with my own content, sections and 3D world.
