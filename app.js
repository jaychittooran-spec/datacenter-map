import { DIMENSIONS, scoreBand } from './scoring.js';

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
  Favorable: 'favorable', Moderate: 'moderate', Challenging: 'challenging', Restrictive: 'restrictive'
}[band] || 'unknown');

const riskRank = {HIGH:4, ELEVATED:3, MODERATE:2, LOW:1};
const trendRank = {'↓↓':3,'↓':2,'→':1,'↑':0,'↑↑':0};

function displayScore(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

function stageFor(state) {
  if (String(state.status || '').toLowerCase().includes('calibration')) return 'Calibrated';
  if (state.confidence === 'High') return 'Researched';
  return 'Provisional';
}

function scoreForLayer(state, layerKey) {
  if (layerKey === 'overall') return state.overall_score;
  return Math.round(Number(state.scores[layerKey]) * 20);
}

function colorForScore(score) {
  if (score >= 80) return '#2f9e44';
  if (score >= 60) return '#f2b705';
  if (score >= 40) return '#f97316';
  return '#d92d20';
}

async function loadData() {
  const [states, counties, methodology, events] = await Promise.all([
    fetch('./states.json').then(r => r.json()),
    fetch('./counties.json').then(r => r.json()),
    fetch('./methodology.json').then(r => r.json()),
    fetch('./events.json').then(r => r.json()),
  ]);
  return { states, counties, methodology, events };
}

function renderMetrics(states) {
  const fav = states.filter(s => s.overall_score >= 80).length;
  const mod = states.filter(s => s.overall_score >= 60 && s.overall_score < 80).length;
  const chal = states.filter(s => s.overall_score >= 40 && s.overall_score < 60).length;
  const highRisk = states.filter(s => s.forward_policy_risk === 'HIGH').length;
  const researched = states.filter(s => stateStageIsResearch(s)).length;
  document.getElementById('metrics').innerHTML = `
    <div class="metric"><b>${states.length}</b><span>States tracked</span></div>
    <div class="metric"><b>${fav}</b><span>Favorable today</span></div>
    <div class="metric"><b>${mod}</b><span>Moderate today</span></div>
    <div class="metric"><b>${chal}</b><span>Challenging today</span></div>
    <div class="metric"><b>${highRisk}</b><span>High forward risk</span></div>
    <div class="metric"><b>${researched}</b><span>High-confidence states</span></div>`;
}

function stateStageIsResearch(s){ return s.confidence === 'High'; }

function renderTileMap(states, selectedAbbr, onSelect, layerKey='overall') {
  const byAbbr = Object.fromEntries(states.map(s => [s.abbr, s]));
  const el = document.getElementById('stateMap');
  el.innerHTML = '';
  stateGrid.flat().forEach(abbr => {
    const tile = document.createElement('button');
    tile.className = 'tile';
    if (!abbr) { tile.classList.add('empty'); el.appendChild(tile); return; }
    const st = byAbbr[abbr];
    const score = scoreForLayer(st, layerKey);
    const band = scoreBand(score);
    tile.classList.add(bandClass(band));
    if (st.confidence === 'Low') tile.classList.add('low-confidence');
    if (abbr === selectedAbbr) tile.classList.add('selected');
    tile.innerHTML = `<span>${abbr}</span><small>${score}</small>`;
    tile.title = `${st.state}: ${score} · ${band} · ${st.confidence} confidence`;
    tile.addEventListener('click', () => onSelect(st.abbr));
    el.appendChild(tile);
  });
}

let geoCache = null;
function geoPathFromGeometry(geometry) {
  const ringPath = ring => ring.map((pt,i) => `${i ? 'L' : 'M'}${pt[0]},${pt[1]}`).join(' ') + ' Z';
  if (!geometry) return '';
  if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join(' ');
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(poly => poly.map(ringPath)).join(' ');
  return '';
}
async function renderGeoMap(states, selectedAbbr, onSelect, layerKey='overall') {
  const el = document.getElementById('geoMap');
  const tooltip = document.getElementById('mapTooltip');
  const byName = Object.fromEntries(states.map(s => [s.state, s]));
  try {
    if (!window.topojson) throw new Error('TopoJSON helper unavailable');
    if (!geoCache) geoCache = await fetch('./src/states-albers-10m.json').then(r => { if(!r.ok) throw new Error(`Map geometry ${r.status}`); return r.json(); });
    const features = window.topojson.feature(geoCache, geoCache.objects.states).features;
    el.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 975 610'); svg.setAttribute('role','img'); svg.setAttribute('aria-label','U.S. state policy map');
    features.forEach(f => {
      const st = byName[f.properties.name];
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', geoPathFromGeometry(f.geometry));
      path.setAttribute('class', `state-shape ${!st ? 'no-data' : ''} ${st?.confidence === 'Low' ? 'low-confidence' : ''} ${st?.abbr === selectedAbbr ? 'selected' : ''}`);
      path.setAttribute('fill', st ? colorForScore(scoreForLayer(st, layerKey)) : '#dbe3ec');
      if (st) {
        path.addEventListener('mousemove', event => {
          const score = scoreForLayer(st, layerKey); tooltip.hidden=false;
          tooltip.innerHTML=`<b>${st.state}</b><span>${score} · ${scoreBand(score)}</span><small>${st.confidence} confidence · Trend ${st.trend} · ${st.forward_policy_risk} forward risk</small>`;
          const rect=el.getBoundingClientRect(); tooltip.style.left=`${Math.min(event.clientX-rect.left+14, rect.width-230)}px`; tooltip.style.top=`${Math.max(event.clientY-rect.top-20,8)}px`;
        });
        path.addEventListener('mouseleave',()=>{tooltip.hidden=true;});
        path.addEventListener('click',()=>onSelect(st.abbr));
      }
      svg.appendChild(path);
    });
    el.appendChild(svg);
  } catch (err) {
    console.error('Geographic map failed; falling back to comparison tiles.', err);
    document.getElementById('geoWrap').hidden = true;
    document.getElementById('tileWrap').hidden = false;
    document.getElementById('viewMode').value = 'tiles';
  }
}

function renderTable(states, onSelect) {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const risk = document.getElementById('riskFilter').value;
  const band = document.getElementById('bandFilter').value;
  const confidence = document.getElementById('confidenceFilter').value;
  const filtered = states
    .filter(s => !q || s.state.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q))
    .filter(s => !risk || s.forward_policy_risk === risk)
    .filter(s => !band || s.score_band === band)
    .filter(s => !confidence || s.confidence === confidence)
    .sort((a,b) => b.overall_score - a.overall_score);
  document.getElementById('stateRows').innerHTML = filtered.map(s => `
    <tr class="${s.confidence === 'Low' ? 'row-provisional' : ''}">
      <td><button class="linkish" data-abbr="${s.abbr}">${s.state}</button><small class="stage-small">${stageFor(s)}</small></td>
      <td><b>${s.overall_score}</b></td>
      <td><span class="pill ${bandClass(s.score_band)}">${s.score_band}</span></td>
      <td class="trend ${s.trend.includes('↓') ? 'down' : s.trend.includes('↑') ? 'up' : ''}">${s.trend}</td>
      <td><span class="risk ${s.forward_policy_risk.toLowerCase()}">${s.forward_policy_risk}</span></td>
      <td>${s.confidence}</td><td>${s.stack_posture}</td>
    </tr>`).join('');
  document.querySelectorAll('button.linkish').forEach(btn => btn.addEventListener('click', () => onSelect(btn.dataset.abbr)));
}

function renderStateCard(state, counties, events) {
  const linkedCounties = counties.filter(c => c.state === state.state);
  const stateEvents = events.changes.filter(e => e.abbr === state.abbr).slice(0,3);
  const dims = DIMENSIONS.map(d => {
    const v = Number(state.scores[d.key]);
    return `<div class="dim-row"><div class="dim-label"><span>${d.label}</span><b>${displayScore(v)}</b></div><div class="bar"><i style="width:${v/5*100}%"></i></div></div>`;
  }).join('');
  const eventHtml = stateEvents.length ? stateEvents.map(e => `<div class="mini-event"><span>${formatDate(e.date)}</span><b>${e.headline}</b><small>${e.category}</small></div>`).join('') : '<p class="muted">No recent material event loaded in the current feed.</p>';
  const countyHtml = linkedCounties.length ? linkedCounties.map(c => `<div class="county-chip"><b>${c.county}</b><span>HeatMap ${c.heatmap_opposition_index} · Local ${displayScore(c.rounded_county_local_score)}/5</span></div>`).join('') : '<p class="muted">County-level HeatMap records not loaded yet.</p>';
  document.getElementById('stateCard').innerHTML = `
    <div class="card-head">
      <div><p class="kicker">State intelligence</p><h2>${state.state}</h2><p>${state.abbr} · ${stageFor(state)}</p></div>
      <div class="score-orb ${bandClass(state.score_band)}">${state.overall_score}</div>
    </div>
    <div class="status-grid">
      <div><span>Current</span><b>${state.score_band}</b></div>
      <div><span>Trend</span><b class="trend ${state.trend.includes('↓')?'down':state.trend.includes('↑')?'up':''}">${state.trend}</b></div>
      <div><span>Forward risk</span><b>${state.forward_policy_risk}</b></div>
      <div><span>Confidence</span><b>${state.confidence}</b></div>
    </div>
    <div class="thesis-block"><span>Policy thesis</span><p>${state.policy_thesis}</p></div>
    <h3>Five-dimension score</h3>${dims}
    <div class="posture"><span>STACK posture</span><b>${state.stack_posture}</b></div>
    <h3>Key developments</h3><div class="mini-events">${eventHtml}</div>
    <h3>County Local intelligence</h3><div class="county-chips">${countyHtml}</div>
    <h3>Evidence basis</h3><p class="source">${state.source_basis}</p>`;
}

function renderCountyPanel(state, counties) {
  const records = counties.filter(c => c.state === state.state);
  const panel = document.getElementById('countyPanel');
  if (!records.length) {
    panel.innerHTML = `<div class="section-head"><div><p class="kicker">County Local layer</p><h2>${state.state}: county coverage expanding</h2><p>HeatMap opposition, local policy/entitlements and development precedent will roll up to the state Local score as county records are added.</p></div><div class="formula">40% Opposition + 50% Policy + 10% Precedent</div></div>`;
    return;
  }
  panel.innerHTML = `<div class="section-head"><div><p class="kicker">County Local layer</p><h2>${state.state}: worked county intelligence</h2><p>County scores are evidence inputs to the statewide Local dimension, not substitutes for the state score.</p></div><div class="formula">40% Opposition + 50% Policy + 10% Precedent</div></div>
  <div class="county-grid">${records.map(c => `
    <article class="county-card"><div class="county-card-head"><div><h3>${c.county}</h3><p>${c.source}</p></div><div class="county-score">${displayScore(c.rounded_county_local_score)}</div></div>
      <div class="county-metrics"><div><span>HeatMap opposition</span><b>${c.heatmap_opposition_index}</b></div><div><span>Community</span><b>${displayScore(c.community_score)}</b></div><div><span>Policy / entitlements</span><b>${displayScore(c.local_policy_entitlements_score)}</b></div><div><span>Precedent</span><b>${displayScore(c.development_precedent_score)}</b></div></div>
      <p>${c.analyst_rationale}</p><div class="county-foot"><span>${c.operating_dc_mw}+ MW operating</span><span>${c.planned_construction_dc_mw}+ MW planned / construction</span><span>${c.contested_dc_projects} contested projects</span></div>
    </article>`).join('')}</div>`;
}

function renderExecutiveIntel(states, events) {
  const changes = Array.isArray(events?.changes) ? events.changes : [];
  const radar = Array.isArray(events?.radar) ? events.radar : [];
  document.getElementById('changePreview').innerHTML = changes.slice(0,3).map(e => intelRow(e.date,e.abbr,e.headline,e.category)).join('') || '<p class="muted">No recent changes loaded.</p>';
  document.getElementById('radarPreview').innerHTML = radar.slice(0,3).map(e => intelRow(e.date,e.abbr,e.headline,e.risk)).join('') || '<p class="muted">No forward catalysts loaded.</p>';
  const movers = states.filter(s => String(s.trend||'').includes('↓')).sort((a,b) => (trendRank[b.trend]||0)-(trendRank[a.trend]||0) || (riskRank[b.forward_policy_risk]||0)-(riskRank[a.forward_policy_risk]||0) || a.overall_score-b.overall_score).slice(0,5);
  document.getElementById('moversPreview').innerHTML = movers.map(s => `<button class="mover" data-abbr="${s.abbr}"><span>${s.abbr}</span><b>${s.overall_score}</b><em>${s.trend}</em><small>${s.forward_policy_risk}</small></button>`).join('') || '<p class="muted">No deteriorating states loaded.</p>';
  document.getElementById('changesFeed').innerHTML = changes.map(e => feedCard(e,'change')).join('');
  document.getElementById('radarFeed').innerHTML = radar.map(e => feedCard(e,'radar')).join('');
}

function intelRow(date,abbr,headline,tag){ return `<div class="intel-row"><div><span>${formatDate(date)} · ${abbr}</span><b>${headline}</b></div><small>${tag}</small></div>`; }
function feedCard(e,kind){ return `<article class="feed-card"><div class="feed-meta"><span>${formatDate(e.date)}</span><span>${e.state}</span><span>${kind==='change'?e.category:e.risk}</span></div><h3>${e.headline}</h3><p>${e.detail}</p>${e.source?`<small>${e.source}</small>`:''}</article>`; }
function formatDate(date){ if (date.includes('session')) return date.replace('-',' '); const d=new Date(date+'T12:00:00'); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

function renderMethodology(methodology) {
  document.getElementById('methodology').innerHTML = `<div class="section-head"><div><p class="kicker">Scoring standard</p><h2>Methodology</h2><p>Five equal dimensions measure current conditions; Trend and Forward Policy Risk remain outside the current score.</p></div></div>
    <div class="method-grid"><div><h3>State score</h3><p>${methodology.state_score_formula}</p></div><div><h3>County Local</h3><p>${methodology.county_local_formula}</p></div><div><h3>Evidence discipline</h3><p>Current scores prioritize enacted law, active tariffs/orders and operative local conditions. Pending policy is weighted more heavily in Trend and Forward Policy Risk.</p></div></div>
    <div class="component-grid">${methodology.county_local_components.map(c => `<div><b>${c.label}</b><strong>${(c.weight*100).toFixed(0)}%</strong><span>${c.source}</span></div>`).join('')}</div>`;
}

loadData().then(async ({states,counties,methodology,events}) => {
  let selected = 'TX';
  let layerKey = 'overall';
  let viewMode = 'geo';
  const selectState = async abbr => {
    selected = abbr;
    const state = states.find(s => s.abbr === selected);
    if (viewMode === 'geo') await renderGeoMap(states, selected, selectState, layerKey); else renderTileMap(states, selected, selectState, layerKey);
    renderStateCard(state, counties, events);
    renderCountyPanel(state, counties);
  };

  renderMetrics(states);
  renderExecutiveIntel(states,events);
  renderTable(states,selectState);
  renderStateCard(states.find(s=>s.abbr===selected),counties,events);
  renderCountyPanel(states.find(s=>s.abbr===selected),counties);
  renderMethodology(methodology);
  await renderGeoMap(states,selected,selectState,layerKey);
  renderTileMap(states,selected,selectState,layerKey);

  document.getElementById('layer').addEventListener('change', async e => { layerKey=e.target.value; if(viewMode==='geo') await renderGeoMap(states,selected,selectState,layerKey); else renderTileMap(states,selected,selectState,layerKey); });
  document.getElementById('viewMode').addEventListener('change', async e => { viewMode=e.target.value; const geo=viewMode==='geo'; document.getElementById('geoWrap').hidden=!geo; document.getElementById('tileWrap').hidden=geo; if(geo) await renderGeoMap(states,selected,selectState,layerKey); else renderTileMap(states,selected,selectState,layerKey); });
  ['search','riskFilter','bandFilter','confidenceFilter'].forEach(id => document.getElementById(id).addEventListener('input',()=>renderTable(states,selectState)));
  document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.scroll).scrollIntoView({behavior:'smooth'})));
  document.querySelectorAll('.mover').forEach(b=>b.addEventListener('click',()=>{selectState(b.dataset.abbr); document.querySelector('.workspace').scrollIntoView({behavior:'smooth'});}));
  console.log('STACK Policy Intelligence v0.6 loaded',{states,counties,events});
}).catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend',`<div class="fatal">Unable to load policy data. ${err.message}</div>`);
});
