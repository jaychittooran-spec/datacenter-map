# STACK Policy Intelligence v0.6.1

Interactive U.S. data-center policy intelligence prototype.

## Core model
Five equal-weight dimensions:
- Power & Energy
- Incentives & Tax
- Local
- Political & Regulatory
- Water & Environmental

Current policy score is separate from **Trend** and **Forward Policy Risk**.

## Local layer
County Local = 40% HeatMap Community Opposition + 50% Local Policy & Entitlements + 10% Development Precedent.

## Files for GitHub Pages
This release is intentionally **flat/root-level** for easy browser upload:
- `index.html`
- `app.js`
- `scoring.js`
- `style.css`
- `states.json`
- `counties.json`
- `methodology.json`
- `events.json`

## v0.6.1 additions
- Geographic U.S. map using `us-atlas` + D3/TopoJSON from jsDelivr
- Preserved 50-state comparison tile view
- Richer State Intelligence Card
- What's Changed feed
- Policy Movers
- Forward Radar
- County Local worked layer (Los Angeles County loaded)
- Provisional / low-confidence visual treatment

## Deployment
GitHub Pages can publish directly from the root of the `policy-v1` branch. Upload all root files and commit to that branch; Pages should republish automatically.


## v0.6.1 hotfix
- Removes external D3 dependency for the U.S. map.
- Uses the repository's existing `src/states-albers-10m.json` and `src/topojson-client.min.js`.
- Hardens executive intelligence rendering and tightens the top layout.
