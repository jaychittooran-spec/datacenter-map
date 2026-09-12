import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = ['power_energy','incentives_tax','local','political_regulatory','water_environmental']
VALID_TRENDS = {'↑↑','↑','→','↓','↓↓'}
VALID_RISKS = {'LOW','MODERATE','ELEVATED','HIGH'}
VALID_CONFIDENCE = {'High','Medium','Low'}

def load(name):
    return json.loads((ROOT/'data'/name).read_text())

def band(score):
    if score >= 80: return 'Favorable'
    if score >= 60: return 'Moderate'
    if score >= 40: return 'Challenging'
    return 'Restrictive'

def half(x):
    return math.isclose(x*2, round(x*2), abs_tol=1e-9)

def heatmap_score(index):
    if index <= 20: return 5.0
    if index <= 30: return 4.5
    if index <= 40: return 4.0
    if index <= 50: return 3.5
    if index <= 60: return 3.0
    if index <= 70: return 2.5
    if index <= 80: return 2.0
    if index <= 90: return 1.5
    return 1.0

def test_states_schema_and_scores():
    states = load('states.json')
    assert len(states) == 50
    assert len({s['abbr'] for s in states}) == 50
    for s in states:
        for d in DIMENSIONS:
            val = s['scores'][d]
            assert 1.0 <= val <= 5.0
            assert half(val)
        expected = round(sum(s['scores'][d] for d in DIMENSIONS)/5*20)
        assert s['overall_score'] == expected
        assert s['score_band'] == band(expected)
        assert s['trend'] in VALID_TRENDS
        assert s['forward_policy_risk'] in VALID_RISKS
        assert s['confidence'] in VALID_CONFIDENCE
        assert s['policy_thesis']
        assert s['source_basis']

def test_county_local_formula():
    counties = load('counties.json')
    assert len(counties) >= 1
    for c in counties:
        idx = c['heatmap_opposition_index']
        if idx is None:
            continue
        community = heatmap_score(idx)
        assert c['community_score'] == community
        raw = community*0.4 + c['local_policy_entitlements_score']*0.5 + c['development_precedent_score']*0.1
        assert math.isclose(c['raw_county_local_score'], round(raw,2), abs_tol=1e-9)
        assert c['rounded_county_local_score'] == round(raw*2)/2

def test_methodology_version():
    method = load('methodology.json')
    assert method['version'] == 'v0.5'
    assert 'county_local_formula' in method
