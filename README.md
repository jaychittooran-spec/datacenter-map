# STACK Policy Intelligence — GitHub App v0.5

This package converts the STACK Policy Intelligence workbook into a GitHub Pages-ready interactive app.

## What this adds

- Five-factor state policy model:
  - Power & Energy
  - Incentives & Tax
  - Local
  - Political & Regulatory
  - Water & Environmental
- County-level Local intelligence layer built for HeatMap data
- Worked Los Angeles County example
- Trend, Forward Policy Risk, Confidence, STACK Posture and source basis fields
- Static web UI for GitHub Pages
- JSON source-of-truth files and validation tests

## Data model

```text
data/states.json       50-state policy scores
data/counties.json     county HeatMap / Local layer
data/methodology.json  scoring rules and labels
```

## Local score method

County Local Score =

```text
40% Community Opposition + 50% Local Policy & Entitlements + 10% Development Precedent
```

The HeatMap Opposition Intensity Index is converted to a 1.0–5.0 Community Score, where higher HeatMap opposition means a lower Community Score.

## Refresh from Excel

Place the latest workbook at:

```text
source/STACK_Policy_Intelligence_50_State_Data_v0.4.xlsx
```

Then run:

```bash
python scripts/excel_to_json.py source/STACK_Policy_Intelligence_50_State_Data_v0.4.xlsx --out data
python -m pytest
python build.py
```

Open `dist/index.html` locally with a static server, or publish the root files through GitHub Pages.

## GitHub Pages

Simplest deployment:

1. Copy this package into the existing `datacenter-map` repo.
2. Commit the files.
3. Ensure GitHub Pages serves from the repository root or `/docs`/`dist` depending on your current settings.
4. If your existing repo already has `index.html`, either replace it or move this app into `/policy/`.

## Suggested repo structure

```text
/
  index.html
  build.py
  data/
    states.json
    counties.json
    methodology.json
  src/
    app.js
    scoring.js
    style.css
  scripts/
    excel_to_json.py
  tests/
    test_policy_data.py
  source/
    STACK_Policy_Intelligence_50_State_Data_v0.4.xlsx
```

## Governance rule

The website should not become a separate scoring source. Update the Excel/JSON source data first, then regenerate the app and PPT from the same model.
