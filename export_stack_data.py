"""Export the STACK master Excel workbook into the live website's JSON format."""
from pathlib import Path
from datetime import date, datetime
import json
from openpyxl import load_workbook
from refresh_stack_policy import KEYS, WEIGHTS, score_band

ROOT = Path(__file__).resolve().parent
MASTER = ROOT / 'STACK_Policy_Master.xlsx'


def records(sheet):
    values = iter(sheet.values)
    headers = [str(h).strip() if h is not None else '' for h in next(values)]
    return [dict(zip(headers, row)) for row in values if row[0] is not None]


def clean(value):
    return '' if value is None else str(value).strip()


def number(value):
    return None if value is None or value == '' else float(value)


def when(value):
    if isinstance(value, (date, datetime)):
        return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()
    return clean(value)


def write(filename, value):
    (ROOT / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(f'Updated {filename}')


def main():
    wb = load_workbook(MASTER, read_only=True, data_only=True)
    states = []
    for s in records(wb['State Scores']):
        ratings = [float(s[k]) for k in KEYS]
        if any(v < 1 or v > 5 or (v * 2) % 1 for v in ratings):
            raise ValueError(f'Invalid score: {s["State"]}')
        overall = round(20 * sum(w * v for w, v in zip(WEIGHTS, ratings)), 1)
        states.append({
            'state': s['State'], 'abbr': s['Abbr'],
            'scores': dict(zip(('power_energy', 'water', 'policy_regulatory_environment', 'community_sentiment'), ratings)),
            'overall_score': overall, 'score_band': score_band(overall),
            'trend': clean(s.get('Trend')), 'forward_policy_risk': clean(s.get('Forward Policy Risk')).upper(),
            'confidence': clean(s.get('Confidence')),
            'status': clean(s.get('Research Status')),
            'stack_posture': clean(s.get('STACK Posture')),
            'policy_thesis': clean(s.get('Policy Thesis')),
            'source_basis': clean(s.get('Source Basis')),
        })
    if len(states) != 50 or len({s['abbr'] for s in states}) != 50:
        raise ValueError('Expected 50 unique states')

    counties = []
    for c in records(wb['County Local']):
        if not c.get('County'):
            continue
        counties.append({
            'state': c['State'], 'county': c['County'],
            'heatmap_opposition_index': number(c.get('HeatMap Opposition Index')),
            'community_score': number(c.get('Community Score (1-5)')),
            'local_policy_entitlements_score': number(c.get('Local Policy & Entitlements (1-5)')),
            'development_precedent_score': number(c.get('Development Precedent (1-5)')),
            'rounded_county_local_score': number(c.get('Rounded County Local Score')),
            'operating_dc_mw': number(c.get('Operating DC MW')),
            'planned_construction_dc_mw': number(c.get('Planned / Construction DC MW')),
            'contested_dc_projects': number(c.get('Contested DC Projects')),
            'analyst_rationale': clean(c.get('Analyst Rationale')),
            'source': clean(c.get('Source Detail')),
        })

    events = {'changes': [], 'radar': []}
    for e in records(wb['Policy Events']):
        kind = clean(e.get('Event Type')).lower()
        if not e.get('Headline'):
            continue
        target = 'changes' if 'current' in kind else 'radar' if 'forward' in kind else None
        if not target:
            continue
        raw_date = e.get('Event Date') if target == 'changes' else e.get('Target Window')
        event_date = when(raw_date)
        if not event_date or (target == 'radar' and event_date.isdigit()):
            event_date = when(e.get('Event Date'))
        events[target].append({
            'date': event_date, 'state': clean(e.get('State')), 'abbr': clean(e.get('Abbr')),
            'category': clean(e.get('Category')), 'headline': clean(e.get('Headline')),
            'detail': clean(e.get('Detail')),
            'risk': clean(e.get('Forward Risk Impact') or e.get('Severity')).upper(),
            'source': clean(e.get('Source URL') or e.get('Source Locator')),
        })
    events['changes'].sort(key=lambda x: x['date'], reverse=True)

    methodology = {
        'title': 'STACK Policy Score',
        'dimensions': [
            {'name': key, 'key': dimension, 'weight': weight}
            for key, dimension, weight in zip(KEYS, ('power_energy', 'water', 'policy_regulatory_environment', 'community_sentiment'), WEIGHTS)
        ],
        'score_range': [1, 5], 'score_step': 0.5,
        'formula': '20 * weighted sum of four dimensions',
    }
    write('states.json', states)
    write('counties.json', counties)
    write('events.json', events)
    write('methodology.json', methodology)
    print(f'Exported {len(states)} states, {len(counties)} counties, {sum(map(len, events.values()))} events')


if __name__ == '__main__':
    main()
