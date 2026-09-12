import { DIMENSIONS, overallPolicyScore, scoreBand } from './scoring.js';

const stateGrid = [
  ['AK','','','','','','','','','','ME'],
  ['','WA','ID','MT','ND','MN','WI','MI','','VT','NH'],
  ['','OR','NV','WY','SD','IA','IL','IN','OH','PA','NY'],
  ['','CA','UT','CO','NE','MO','KY','WV','VA','MD','NJ'],
  ['','AZ','NM','KS','AR','TN','NC','SC','DE','',''],
  ['','HI','','OK','LA','MS','AL','GA','','',''],
  ['','','','TX','','','','FL','','','']
];

const bandClass = (band) => ({
  Favorable: 'favorable',
  Moderate: 'moderate',
  Challenging: 'challenging',
  Restrictive: 'restrictive',
}[band] || 'unknown');

function displayScore(value) {
  return Number(value).toFixed(value % 1 === 0 ? 0 : 1);
}

async function loadData() {
  const [states, counties, methodology] = await Promise.all([
    fetch('./data/states.json').then(r => r.json()),
    fetch('./data/counties.json').then(r => r.json()),
    fetch('./data/methodology.json').then(r => r.json()),
  ]);
  return { states, counties, methodology };
}

function renderMetrics(states) {
  const metrics = document.getElementById('metrics');
  const fav = states.filter(s => s.overall_score >= 80).length;
  const mod = states.filter(s => s.overall_score >= 60 && s.overall_score < 80).length;
  const chal = states.filter(s => s.overall_score >= 40 && s.overall_score < 60).length;
  const highRisk = states.filter(s => s.forward_policy_risk === 'HIGH').length;
  metrics.innerHTML = `
    <div><b>${states.length}</b><span>States tracked</span></div>
    <div><b>${fav}</b><span>Favorable</span></div>
    <div><b>${mod}</b><span>Moderate</span></div>
    <div><b>${chal}</b><span>Challenging</span></div>
    <div><b>${highRisk}</b><span>High forward risk</span></div>`;
}

function renderMap(states, selectedAbbr, onSelect, layerKey = 'overall') {
  const byAbbr = Object.fromEntries(states.map(s => [s.abbr, s]));
  const el = document.getElementById('stateMap');
  el.innerHTML = '';
  stateGrid.flat().forEach(abbr => {
    const tile = document.createElement('button');
    tile.className = 'tile';
    if (!abbr) {
      tile.classList.add('empty');
      el.appendChild(tile);
      return;
    }
    const st = byAbbr[abbr];
    let score = st.overall_score;
    let band = st.score_band;
    if (layerKey !== 'overall') {
      score = Math.round(st.scores[layerKey] * 20);
      band = scoreBand(score);
    }
    tile.classList.add(bandClass(band));
    if (abbr === selectedAbbr) tile.classList.add('selected');
    tile.innerHTML = `<span>${abbr}</span><small>${score}</small>`;
    tile.title = `${st.state}: ${score} (${band})`;
    tile.addEventListener('click', () => onSelect(st.abbr));
    el.appendChild(tile);
  });
}

function renderTable(states, onSelect) {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const risk = document.getElementById('riskFilter').value;
  const band = document.getElementById('bandFilter').value;
  const filtered = states
    .filter(s => !q || s.state.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q))
    .filter(s => !risk || s.forward_policy_risk === risk)
    .filter(s => !band || s.score_band === band)
    .sort((a,b) => b.overall_score - a.overall_score);
  const rows = filtered.map(s => `
    <tr data-abbr="${s.abbr}">
      <td><button class="linkish" data-abbr="${s.abbr}">${s.state}</button></td>
      <td>${s.overall_score}</td>
      <td><span class="pill ${bandClass(s.score_band)}">${s.score_band}</span></td>
      <td>${s.trend}</td>
      <td>${s.forward_policy_risk}</td>
      <td>${s.confidence}</td>
      <td>${s.stack_posture}</td>
    </tr>`).join('');
  document.getElementById('stateRows').innerHTML = rows;
  document.querySelectorAll('button.linkish').forEach(btn => btn.addEventListener('click', () => onSelect(btn.dataset.abbr)));
}

function renderStateCard(state, counties) {
  const linkedCounties = counties.filter(c => c.state === state.state);
  const dimRows = DIMENSIONS.map(d => {
    const v = state.scores[d.key];
    return `<div class="dim"><span>${d.label}</span><b>${displayScore(v)}</b><meter min="1" max="5" value="${v}"></meter></div>`;
  }).join('');
  const countyRows = linkedCounties.map(c => `
    <tr><td>${c.county}</td><td>${c.heatmap_opposition_index ?? ''}</td><td>${displayScore(c.community_score ?? 0)}</td><td>${displayScore(c.rounded_county_local_score ?? 0)}</td><td>${c.confidence ?? ''}</td></tr>`).join('');
  document.getElementById('stateCard').innerHTML = `
    <div class="card-head"><div><h2>${state.state}</h2><p>${state.abbr} · ${state.status}</p></div><div class="score ${bandClass(state.score_band)}">${state.overall_score}</div></div>
    <div class="badges"><span>${state.score_band}</span><span>Trend ${state.trend}</span><span>${state.forward_policy_risk} forward risk</span><span>${state.confidence} confidence</span></div>
    <p class="thesis">${state.policy_thesis}</p>
    <h3>Five-dimension score</h3>${dimRows}
    <h3>STACK posture</h3><p><b>${state.stack_posture}</b></p>
    <h3>County Local layer</h3>
    ${linkedCounties.length ? `<table class="mini"><thead><tr><th>County</th><th>HeatMap Index</th><th>Community</th><th>County Local</th><th>Confidence</th></tr></thead><tbody>${countyRows}</tbody></table>` : '<p class="muted">No county records loaded yet.</p>'}
    <h3>Source basis</h3><p class="source">${state.source_basis}</p>`;
}

function renderMethodology(methodology) {
  document.getElementById('methodology').innerHTML = `
    <h2>Methodology</h2>
    <p><b>State score:</b> ${methodology.state_score_formula}</p>
    <p><b>County Local:</b> ${methodology.county_local_formula}</p>
    <ul>${methodology.county_local_components.map(c => `<li><b>${c.label}</b> — ${(c.weight*100).toFixed(0)}% · ${c.source}</li>`).join('')}</ul>`;
}

loadData().then(({ states, counties, methodology }) => {
  let selected = 'TX';
  let layerKey = 'overall';
  const selectState = abbr => {
    selected = abbr;
    renderMap(states, selected, selectState, layerKey);
    renderStateCard(states.find(s => s.abbr === selected), counties);
  };
  renderMetrics(states);
  renderMap(states, selected, selectState, layerKey);
  renderTable(states, selectState);
  renderStateCard(states.find(s => s.abbr === selected), counties);
  renderMethodology(methodology);
  document.getElementById('layer').addEventListener('change', e => {
    layerKey = e.target.value;
    renderMap(states, selected, selectState, layerKey);
  });
  ['search','riskFilter','bandFilter'].forEach(id => document.getElementById(id).addEventListener('input', () => renderTable(states, selectState)));
  console.log('STACK Policy Intelligence loaded', { states, counties });
});
