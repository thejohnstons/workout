/* =====================================================================
   Move well: the workout app. Private to each person (private/{email}).
   ===================================================================== */
import * as F from '/family.js';
import * as P from './plan.js';
import * as M from './muscles.js';
import { IMPORTED_WORKS } from './imported.js';
Object.assign(M.WORKS, IMPORTED_WORKS);

const $ = s => document.querySelector(s);
const esc = F.esc;
const TODAY = () => P.iso(new Date());
const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); };
const local = { get(k,d){ try{ const v = localStorage.getItem('mw-'+k); return v===null ? d : JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem('mw-'+k, JSON.stringify(v)); }catch(e){} } };

let user = null, S = {}, IMP = null, logs = [], periods = [], symptoms = {}, pweeks = {}, view = 'today';
let loaded = {meta:0, logs:0, cycle:0};

/* ---------- Voice: the recorded trainer phrases live in one file (voice.mp3),
   with voice.json giving each phrase's start and length in seconds ---------- */
let VOICE = {}; fetch('voice.json').then(r=>r.json()).then(j=>{ VOICE = j; }).catch(()=>{});
const voiceOn = () => local.get('voice', true);
const vAudio = new Audio(); vAudio.preload = 'auto'; let vQueue = [], vBusy = false, vStop = null;
try{ if(navigator.audioSession) navigator.audioSession.type = 'transient'; }catch(e){}
function say(...lines){
  if(!voiceOn()) return;
  lines.flat().forEach(l => { if(l && VOICE[l]) vQueue.push(VOICE[l]); });
  if(!vBusy) nextClip();
}
function nextClip(){
  clearTimeout(vStop); const seg = vQueue.shift(); if(!seg){ vBusy = false; try{ vAudio.pause(); }catch(e){} return; }
  vBusy = true; if(!vAudio.src) vAudio.src = 'voice.mp3';
  const [start, len] = seg, end = start + len + 0.08;
  // iPhones don't always jump to the exact spot, so each phrase has silence around it,
  // and it stops by watching where the audio actually is (not with a timer).
  const go = () => { try{ vAudio.currentTime = Math.max(0, start - 0.06); }catch(e){}
    const safety = Date.now() + (len + 2.5)*1000;
    vAudio.play().then(() => { const watch = () => { if(vAudio.paused || vAudio.currentTime >= end || Date.now() > safety){ try{ vAudio.pause(); }catch(e){} nextClip(); } else vStop = setTimeout(watch, 30); }; watch(); })
      .catch(() => { vQueue = []; vBusy = false; }); };
  if(vAudio.readyState >= 1) go(); else vAudio.addEventListener('loadedmetadata', go, {once:true});
}
function quiet(){ vQueue = []; clearTimeout(vStop); vBusy = false; try{ vAudio.pause(); }catch(e){} }

/* ---------- Look and features (Nathan: dark lime, no cycle) ---------- */
let famLook = null; // from the family apps' saved style: Classic green → dark
const look = () => S.look || famLook || 'light';
const cycleOn = () => S.cycle !== undefined ? !!S.cycle : look() !== 'dark';
const MAPCOLS = () => look()==='dark' ? ['#2B2F2A','#5E7A2A','#C8F35C'] : ['#E4E1EE','#AFC0FF','#3A5BF0'];
function applyLook(){
  document.documentElement.dataset.look = look();
  const tb = document.querySelector('#tabs [data-go="cycle"]'); if(tb) tb.hidden = !cycleOn();
  document.querySelector('#tabs .in').style.gridTemplateColumns = `repeat(${cycleOn()?6:5},1fr)`;
  const mt = document.querySelector('meta[name="theme-color"]'); if(mt) mt.content = look()==='dark' ? '#0E0F0E' : '#F2F1F7';
}
function muscleBlock(ids, size=150, withLabel=true){
  const w = M.worked(ids); if(!w.main.length) return '';
  return `<div class="mm">${M.bodyMap(w.main, w.sup, MAPCOLS(), size)}${withLabel ? `<p class="mm-l"><b>${esc(M.label(w.main))}</b>${w.sup.length?`<br><span>also ${esc(M.label(w.sup))}</span>`:''}</p>` : ''}</div>`;
}
const sessionIds = sess => (sess.ex||[]).flatMap(b => (b.ss||[b]).map(i=>i.id));

/* ---------- Data ---------- */
const metaSave = patch => F.patch('~move_meta', 'state', patch);
const isDone = (date, key) => logs.find(l => l.date===date && l.planKey===key);
const thisWeek = () => P.monday(TODAY());
const periodWeek = (date=TODAY()) => cycleOn() ? (pweeks[P.monday(date)] || null) : null;
function lastSets(exId){
  const ls = logs.filter(l => l.sets && l.sets[exId] && l.sets[exId].length).sort((a,b)=> (b.at||0)-(a.at||0));
  return ls.length ? ls[0].sets[exId] : null;
}
function pb(exId){ let m = 0; logs.forEach(l => (l.sets && l.sets[exId] || []).forEach(s => { if(+s.w > m) m = +s.w; })); return m; }

// Saves straight away on the phone (Firestore keeps it locally and syncs in the background),
// so the screen never waits on a slow connection. Empty fields are removed first, because
// the database rejects them.
function saveLog(log){
  const item = JSON.parse(JSON.stringify({id:F.uid('l'), at:Date.now(), date:TODAY(), ...log, pendingCal:true}));
  F.put('~move_logs', item).then(() => addToCalendar(item).catch(()=>{})).catch(e => toast('Saved on this phone. It will sync when you’re back online.'));
  return item;
}
async function removeLog(log){
  await F.remove('~move_logs', log.id);
  if(log.calId) removeFromCalendar(log).catch(()=>{});
}

/* ---------- Google Calendar (her Exercise calendar) ---------- */
const CALAPI = 'https://www.googleapis.com/calendar/v3';
const tok = () => { const t = F.savedToken(F.EVENTS_SCOPE); return t && t.token; };
function connect(then){ F.connectGoogle((t, err) => { if(t){ then && then(t); render(); } else toast(err==='notSetUp' ? 'Google isn’t set up yet.' : err==='loading' ? 'Google is still loading, try again in a moment.' : 'Google connection was cancelled.'); }, user && user.email, F.EVENTS_SCOPE); }
async function addToCalendar(log){
  const t = tok(); if(!t || !S.calendarId || log.calId) return;
  const desc = log.sets ? Object.entries(log.sets).map(([id, ss]) => (P.EX[id] ? P.EX[id].n : id) + ': ' + ss.map(s => (s.w ? s.w+' kg × ' : '') + (s.r||'')).join(', ')).join('\n') : (log.note || '');
  const ev = await F.gfetch(`${CALAPI}/calendars/${encodeURIComponent(S.calendarId)}/events`, t, {method:'POST', body: JSON.stringify({summary:P.eventTitle(log), description: desc + (log.link ? '\n'+log.link : '') + '\n\nAdded by Move well', start:{date:log.date}, end:{date:P.addDays(log.date,1)}, transparency:'transparent'})});
  await F.patch('~move_logs', log.id, {calId: ev.id, pendingCal:false});
}
async function removeFromCalendar(log){ const t = tok(); if(!t || !S.calendarId || !log.calId) return; await F.gfetch(`${CALAPI}/calendars/${encodeURIComponent(S.calendarId)}/events/${encodeURIComponent(log.calId)}`, t, {method:'DELETE'}).catch(()=>{}); }
async function syncPending(){ for(const l of logs.filter(l => l.pendingCal && !l.calId)){ try{ await addToCalendar(l); }catch(e){ if(e.code===401) break; } } }
async function importHistory(btn){
  const t = tok(); if(!t || !S.calendarId){ toast('Connect Google and choose your Exercise calendar first.'); return; }
  btn.disabled = true; btn.textContent = 'Reading your calendar…';
  const until = (S.appStart || TODAY()) + 'T00:00:00Z', dates = [], runs = [], types = {};
  let page = '', n = 0;
  try{
    do{
      const j = await F.gfetch(`${CALAPI}/calendars/${encodeURIComponent(S.calendarId)}/events?singleEvents=true&maxResults=2500&timeMin=2000-01-01T00:00:00Z&timeMax=${until}${page ? '&pageToken='+page : ''}`, t);
      (j.items||[]).forEach(ev => { if(!ev.start || !ev.start.date || ev.status==='cancelled') return; const c = P.classify(ev.summary); dates.push(ev.start.date); types[c.type] = (types[c.type]||0)+1; if(c.type==='run') runs.push({date:ev.start.date, mins:c.mins, km:c.km}); n++; });
      page = j.nextPageToken || '';
    } while(page);
    dates.sort();
    await F.put('~move_meta', {id:'import', at:Date.now(), total:n, dates, runs, types, first: dates[0] || null});
    toast(`Imported ${n} past workouts from your calendar 🎉`);
  }catch(e){ toast(e.code===401 ? 'Google needs reconnecting. Tap Connect, then try again.' : 'Couldn’t read the calendar. Please try again.'); }
  btn.disabled = false; btn.textContent = 'Import past workouts again';
}

/* ---------- Toast ---------- */
let toastT = null;
function toast(msg){ let t = $('#toast'); if(!t){ t = document.createElement('div'); t.id='toast'; t.setAttribute('role','status'); t.style.cssText='pointer-events:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--tabh) + 20px + env(safe-area-inset-bottom,0px));background:var(--btn);color:var(--btnInk);padding:10px 16px;border-radius:999px;font-weight:700;z-index:99;max-width:90vw;text-align:center;font-size:14px'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(()=>{ t.hidden = true; }, 3200); }

/* ---------- Sheets ---------- */
let sheetReturn = null;
function openSheet(title, html, onReady){ sheetReturn = document.activeElement; $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; onReady && onReady($('#sheetBody')); setTimeout(()=>$('#sheet [data-close]').focus(), 30); }
function closeSheet(){ $('#sheet').hidden = true; if(sheetReturn && sheetReturn.focus) sheetReturn.focus(); }
$('#sheet').addEventListener('click', e => { if(e.target.id==='sheet' || e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ if(!$('#player').hidden) confirmClosePlayer(); else if(!$('#sheet').hidden) closeSheet(); } });

/* ---------- Navigation ---------- */
const VIEWS = ['today','programs','run','stretch','cycle','progress'];
function go(v){ if(!VIEWS.includes(v)) v = 'today'; view = v; if(location.hash !== '#'+v) history.replaceState(null,'','#'+v); render(); window.scrollTo(0,0); }
window.addEventListener('hashchange', () => go(location.hash.slice(1)));
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if(g){ e.preventDefault(); go(g.dataset.go); } });

function render(){
  if(!user) return;
  applyLook(); if(view==='cycle' && !cycleOn()) view = 'today';
  VIEWS.forEach(v => { $('#v-'+v).hidden = v!==view; });
  document.querySelectorAll('#tabs [data-go]').forEach(b => b.setAttribute('aria-current', b.dataset.go===view ? 'page' : 'false'));
  ({today:renderToday, programs:renderPrograms, run:renderRun, stretch:renderStretch, cycle:renderCycle, progress:renderProgress})[view]();
}

/* =====================================================================
   TODAY
   ===================================================================== */
function estMins(sess){ let n = 0; (sess.ex||[]).forEach(b => (b.ss||[b]).forEach(x => { n += x.sets; })); return Math.round(3 + n*1.6 + 5); }
function cycleChip(){
  if(!cycleOn() || !periods.length) return '';
  const st = P.cycleStats(periods), day = P.cycleDay(st, TODAY()), ph = P.phase(st, day);
  return ph ? `<button class="chip" data-go="cycle" type="button" style="border:0">🌸 Cycle day ${day} · ${esc(ph.n)}</button>` : '';
}
function renderToday(){
  const date = TODAY(), pw = periodWeek(date), plan = P.planFor(S, date, {periodWeek:pw}), p = P.program(S.program);
  const h = new Date().getHours(), first = (user.displayName||'').split(' ')[0];
  const wk = P.programWeek(S, date), rw = S.runStart ? P.runWeek(S, date) : 0;
  const pending = logs.filter(l => l.pendingCal && !l.calId).length;
  let html = '';
  if(pending && S.calendarId) html += `<div class="banner"><span>📅 ${pending} workout${pending>1?'s':''} waiting to go in your Exercise calendar.</span><button class="btn" id="syncNow" type="button">Add now</button></div>`;
  html += `<h1>${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}${first?', '+esc(first):''}! 👋</h1>
    <p class="sub">${S.program && wk>=1 && wk<=p.weeks ? `Week ${wk} of ${esc(p.name)}` : 'No program running'}${rw && rw<=P.RUN_PLAN.length ? ` · run week ${rw} of ${P.RUN_PLAN.length}` : ''}</p>
    <div class="row" style="margin-bottom:12px">${cycleChip()}${pw && pw.mode!=='none' ? `<button class="chip" id="pwChange" type="button" style="border:0">${pw.mode==='pause'?'🛋️ Paused':'🌸 Gentle'} this week · change</button>` : ''}</div>`;
  // week strip
  const mon = P.monday(date);
  html += `<div class="card"><div class="week">${P.DAY_NAMES.map((dn,i) => { const d = P.addDays(mon,i), pl = P.planFor(S, d, {periodWeek:periodWeek(d)}).filter(x=>!x.night && !x.optional);
      const done = logs.some(l => l.date===d && l.kind!=='stretch-night' && !(l.planKey==='night'));
      const run = pl.some(x=>x.kind==='run'), cls = done ? 'done' : d===date ? 'today' : run ? 'run' : pl.length ? 'plan' : '';
      return `<div><div class="d">${dn}</div><div class="n ${cls}${isPeriodDay(d)?' flow':''}">${done?'✓':P.parse(d).getDate()}</div></div>`; }).join('')}</div>
    <p class="note" style="margin:10px 0 0">● done · ○ planned · <span style="color:#7A9A1E">●</span> run${cycleOn()?' · 🌸 period':''}</p></div>`;
  // today's sessions
  const main = plan.filter(x => !x.night && !x.optional);
  if(!S.program) html += `<div class="tint c-pink" style="margin-top:12px"><p class="kicker">Get started</p><p class="big">Choose a program</p><p class="muted">Pick from 11 programs. Weeks run Monday to Sunday.</p><button class="btn" data-go="programs" type="button">See programs</button></div>`;
  main.forEach(x => {
    const d = isDone(date, x.key);
    if(x.kind==='strength'){
      const c = x.period ? 'c-peach' : 'c-'+(P.program(S.program).c||'pink');
      html += `<div class="tint ${c} hero" style="margin-top:12px"><div class="mm-float">${muscleBlock(sessionIds(x.session), 104, false)}</div><p class="kicker">${x.period?'Period week':'Today'}</p><p class="big">${esc(x.title)}</p>
        <p class="muted" style="margin:0 0 10px">${esc((x.session.ex||[]).map(b => (b.ss||[b]).map(i=>P.EX[i.id].n).join(' + ')).slice(0,3).join(' · '))}${x.session.ex.length>3?' and more':''}</p>
        <div class="row" style="margin-bottom:12px">${x.session.style?`<span class="chip">✨ ${esc(x.session.style)}</span>`:''}<span class="chip">⏱ about ${estMins(x.session)} min</span>${x.gentle?'<span class="chip">🌸 Gentler version</span>':''}${x.week?`<span class="chip">Week ${x.week}</span>`:''}</div>
        ${d ? `<div class="row"><span class="chip" style="background:var(--btn);color:var(--btnInk)">✓ Done</span><button class="btn soft" type="button" data-undo="${d.id}">Undo</button><button class="btn soft" type="button" data-fin="1">➕ Add a finisher</button></div>`
            : `<div class="row"><button class="btn" type="button" data-start="${x.key}">▶ Start workout</button><button class="btn soft" type="button" data-quick="${x.key}">Mark done</button></div>`}</div>`;
    } else if(x.kind==='run'){
      const next = nextRunKm(), note = P.RUN_NOTES[(x.week||1)-1];
      html += `<div class="tint c-lime" style="margin-top:12px"><p class="kicker">Run · week ${x.week}</p><p class="big">${next.km} km easy</p><p class="muted" style="margin:0 0 10px">${esc(next.why || note || 'Chatty pace. Walk breaks are welcome.')}</p>
        ${d ? `<div class="row"><span class="chip" style="background:var(--btn);color:var(--btnInk)">✓ ${esc(P.eventTitle(d))}</span><button class="btn soft" type="button" data-undo="${d.id}">Undo</button></div>`
            : `<div class="row"><button class="btn" type="button" data-run="${x.key}">▶ Start run</button><button class="btn soft" type="button" data-logrun="${x.key}">Log a run</button></div>`}</div>`;
    } else if(x.kind==='stretch'){
      html += `<div class="tint c-sky" style="margin-top:12px"><p class="kicker">Deep stretch · ${deepThisWeek()} of 2 this week</p><p class="big">${esc(P.ROUTINES.deep.name)}</p><p class="muted" style="margin:0 0 10px">About 25 minutes, all over.</p>
        ${d ? `<div class="row"><span class="chip" style="background:var(--btn);color:var(--btnInk)">✓ Done</span><button class="btn soft" type="button" data-undo="${d.id}">Undo</button></div>` : `<div class="row"><button class="btn" type="button" data-stretch="deep" data-key="deep">▶ Start</button><button class="btn soft" type="button" data-quick="deep">Mark done</button></div>`}</div>`;
    }
  });
  if(S.program && !main.some(x=>x.kind==='strength')) html += `<div class="card" style="margin-top:12px"><p class="kicker muted">Rest day</p><p style="margin:4px 0 0">No strength session today. Enjoy it! 🌿 Feel like moving anyway? Try a finisher or log something below.</p></div>`;
  html += `<button class="btn line wide" id="logOwn" type="button" style="margin-top:14px;padding:14px">➕ Log my own workout</button>`;
  // tonight
  const nd = isDone(date,'night');
  html += `<div class="tint c-lilac" style="margin-top:12px"><p class="kicker">Tonight 🌙</p><p class="big" style="font-size:22px">10-minute wind-down stretch</p>
    ${nd ? `<div class="row"><span class="chip" style="background:var(--btn);color:var(--btnInk)">✓ Done</span><button class="btn soft" type="button" data-undo="${nd.id}">Undo</button></div>` : `<div class="row"><button class="btn" type="button" data-stretch="night" data-key="night">▶ Start</button><button class="btn soft" type="button" data-quick="night">Mark done</button></div>`}</div>`;
  const opt = plan.find(x=>x.optional);
  if(opt && !isDone(date, opt.key)) html += `<div class="card" style="margin-top:12px"><div class="item" style="padding:0;border:0"><span class="ic c-lime">🏃‍♀️</span><span><b>Optional easy run</b><span class="s">About 3 km, only if you feel like it</span></span><button class="btn soft" type="button" data-run="runopt">Start</button></div></div>`;
  // finishers
  html += `<h2>Finishers <small>tack one on the end</small></h2><div class="grid3">${P.FINISHERS.map(f=>`<button class="tile c-${f.c}" type="button" data-finisher="${f.id}"><span class="e">${f.e}</span><b>${esc(f.name)}</b><span>${f.mins.join(' or ')} min</span></button>`).join('')}<button class="tile" style="background:var(--card);box-shadow:inset 0 0 0 1.5px var(--line)" type="button" data-finisher="surprise"><span class="e">🎲</span><b>Surprise me</b><span>fits your time</span></button></div>`;
  // challenges
  const act = Object.entries(S.challenges||{}).filter(([id,c]) => c && !c.done);
  html += `<h2>Challenges <small><button class="link" style="border:0;background:none;padding:0" id="browseCh" type="button">Browse</button></small></h2>`;
  html += act.length ? `<div class="card">${act.map(([id,c]) => challengeRow(id,c)).join('')}</div>` : `<p class="empty">No challenge running. Sprinkle one in whenever you like.</p>`;
  $('#v-today').innerHTML = html;
}
function isPeriodDay(d){ return cycleOn() && periods.some(p => d >= p.start && d < P.addDays(p.start, p.days||5)); }
function deepThisWeek(){ const m = thisWeek(); return logs.filter(l => l.planKey==='deep' && P.monday(l.date)===m).length; }
function nextRunKm(){
  const rw = Math.min(P.runWeek(S, TODAY()), P.RUN_PLAN.length), planned = P.RUN_PLAN[rw-1];
  const runs = logs.filter(l => l.kind==='run' && l.planKey==='run').sort((a,b)=>(b.at||0)-(a.at||0));
  const last = runs[0];
  if(last && last.knee && last.knee!=='good' && last.km && planned > last.km) return {km:+last.km, why:`Your knee was ${last.knee==='sore'?'sore':'a bit niggly'} last run, so this one stays at ${last.km} km. 💛`};
  return {km:planned};
}
function challengeRow(id, c){
  const ch = P.CHALLENGES.find(x=>x.id===id); if(!ch) return '';
  if(ch.km){ const m = TODAY().slice(0,7), km = logs.filter(l => (l.kind==='run' || l.type==='walk') && l.date.slice(0,7)===m).reduce((a,l)=>a+(+l.km||0),0);
    return `<div class="item"><span class="ic c-lime">${ch.e}</span><span><b>${esc(ch.name)}</b><span class="s">${km.toFixed(1)} of ${ch.km} km</span><div class="prog" style="margin-top:6px"><i style="width:${Math.min(100,km/ch.km*100)}%"></i></div></span><button class="btn soft" type="button" data-chquit="${id}">Stop</button></div>`; }
  const dayN = Math.floor((P.parse(TODAY()) - P.parse(c.start))/864e5), ticked = (c.ticks||[]).includes(TODAY()), doneN = (c.ticks||[]).length;
  if(dayN >= ch.days) return `<div class="item"><span class="ic c-peach">${ch.e}</span><span><b>${esc(ch.name)}</b><span class="s">Finished: ${doneN} of ${ch.days} days 🎉</span></span><button class="btn soft" type="button" data-chquit="${id}">Clear</button></div>`;
  return `<div class="item"><span class="ic c-peach">${ch.e}</span><span><b>${esc(ch.name)} · day ${dayN+1}</b><span class="s">Today: ${esc(ch.target(dayN))}</span><div class="prog" style="margin-top:6px"><i style="width:${doneN/ch.days*100}%"></i></div></span><button class="tick" type="button" aria-pressed="${ticked}" aria-label="Done today" data-chtick="${id}">${ticked?'✓':''}</button></div>`;
}

/* clicks on Today and elsewhere */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a'); if(!t) return;
  const d = t.dataset;
  if(t.id==='syncNow'){ if(tok()) { await syncPending(); toast('Added to your calendar 📅'); } else connect(()=>syncPending()); return; }
  if(t.id==='logOwn') return manualSheet();
  if(t.id==='browseCh') return challengesSheet();
  if(t.id==='pwChange') return feelingSheet(periodWeek().from || TODAY());
  if(t.id==='openSettings') return settingsSheet();
  if(d.undo){ const l = logs.find(x=>x.id===d.undo); if(l) await removeLog(l); return; }
  if(d.quick){ const x = P.planFor(S, TODAY(), {periodWeek:periodWeek()}).find(i=>i.key===d.quick); if(x) saveLog({kind:x.kind, title:x.title, planKey:x.key, quick:true, program:x.program, week:x.week}); toast('Nice work! ✓'); return; }
  if(d.start){ const x = P.planFor(S, TODAY(), {periodWeek:periodWeek()}).find(i=>i.key===d.start); if(x) startStrength(x); return; }
  if(d.run){ return startRun(d.run); }
  if(d.logrun){ return runLogSheet(d.logrun, null); }
  if(d.stretch){ return startStretch(d.stretch, d.key || null); }
  if(d.finisher){ return finisherSheet(d.finisher); }
  if(d.fin){ return finisherSheet('pick'); }
  if(d.chtick){ const c = {...(S.challenges||{})[d.chtick]}; const tk = new Set(c.ticks||[]); tk.has(TODAY()) ? tk.delete(TODAY()) : tk.add(TODAY()); c.ticks = [...tk]; await metaSave({challenges:{...(S.challenges||{}), [d.chtick]:c}}); return; }
  if(d.chquit){ const all = {...(S.challenges||{})}; delete all[d.chquit]; await F.put('~move_meta', {...S, id:'state', challenges:all}); return; }
  if(d.chjoin){ await metaSave({challenges:{...(S.challenges||{}), [d.chjoin]:{start:TODAY(), ticks:[]}}}); closeSheet(); toast('Challenge started! 🏆'); return; }
  if(d.prog){ return programSheet(d.prog); }
  if(d.editcycle){ return editCycleSheet(d.editcycle); }
});

/* =====================================================================
   PLAYER (strength, finishers, stretches, runs)
   ===================================================================== */
let PL = null, plTimer = null, wake = null;
async function keepAwake(on){ try{ if(on && 'wakeLock' in navigator) wake = await navigator.wakeLock.request('screen'); else if(!on && wake){ await wake.release(); wake = null; } }catch(e){} }
function openPlayer(){ $('#player').hidden = false; document.body.style.overflow='hidden'; keepAwake(true); }
function closePlayer(){ clearInterval(plTimer); plTimer = null; quiet(); PL = null; $('#player').hidden = true; document.body.style.overflow=''; keepAwake(false); render(); }
function confirmClosePlayer(){ if(!PL || PL.finished || confirm('Leave this workout? Anything not saved will be lost.')) closePlayer(); }
$('#player').addEventListener('click', e => { if(e.target.closest('[data-pclose]')) confirmClosePlayer(); else if(e.target.closest('[data-pback]')) goBack(); });
function goBack(){
  if(!PL || !canGoBack()) return;
  clearInterval(plTimer); quiet();
  if(PL.kind==='strength'){
    const prev = PL.hist.pop(), st = PL.steps[prev];
    if(PL.logged && PL.logged[prev]){ const arr = PL.sets[st.id] || []; arr.pop(); if(!arr.length) delete PL.sets[st.id]; delete PL.logged[prev]; }
    PL.i = prev; drawStep(); toast('Back to '+nameOf(st.id)+(st.type==='set' ? `, set ${st.round}` : ''));
  } else if(PL.kind==='finisher'){ PL.i = Math.max(0, PL.i-1); drawInterval(false); }
  else if(PL.kind==='stretch'){ PL.i = Math.max(0, PL.i-1); drawStretch(); }
  else if(PL.kind==='run'){ PL.p = Math.max(0, PL.p-1); PL.phaseStart = Date.now(); drawRun(); }
}

function swap(id, gentle){ return gentle && P.EX[id] && P.EX[id].low ? P.EX[id].low : id; }
function perSide(reps){ return /each/.test(String(reps)); }
const gearChip = id => `<span class="chip" style="background:var(--soft)">🏋️ ${esc(P.gear(id))}</span>`;
/* A countdown that runs off the real clock, so it stays right while the phone is in
   another app; when you come back it catches up (and moves on if time is up). */
function countdown(secs, onTick, onDone){
  let end = Date.now() + secs*1000, held = null, last = null;
  const step = () => { if(held !== null) return; const left = Math.max(0, Math.ceil((end - Date.now())/1000));
    if(left !== last){ last = left; onTick(left); } if(left <= 0){ clearInterval(plTimer); onDone(); } };
  clearInterval(plTimer); plTimer = setInterval(step, 250); step();
  return { pause(){ if(held === null) held = end - Date.now(); }, resume(){ if(held !== null){ end = Date.now() + held; held = null; } }, add(s){ end += s*1000; last = null; step(); }, get paused(){ return held !== null; } };
}
document.addEventListener('visibilitychange', () => { if(!document.hidden && PL) { /* timers catch up on their next tick */ } });
// A short "get ready" countdown before a timer starts. Calls done() when finished.
function leadIn(el, label, clip, done, secs=3){
  say(clip);
  return countdown(secs, n => { if(n > 0) el.innerHTML = `<span style="display:block;font-size:15px;font-weight:700;opacity:.75">${esc(label)}</span>${n}`; }, done);
}
function isTimed(reps){ return /\d\s*s\b/.test(String(reps)); }
function secsOf(reps){ const m = String(reps).match(/(\d+)\s*s/); return m ? +m[1] : 30; }

function startStrength(x){
  const sess = x.session, gentle = x.gentle || x.period, steps = [];
  const seed = P.daySeed(TODAY(), x.slot), warm = P.warmFor(sess.warm||'full', seed).map(([id, secs]) => [id, P.EX[id] && P.EX[id].side ? 20 : secs]);
  if(sess.warmItems) sess.warmItems.forEach(it => steps.push({type:'timed', warm:true, id:it.id, secs:it.secs, sides:it.sides, note:it.note, rest:10}));
  else warm.forEach(([id,s]) => { const sid = swap(id,gentle); steps.push({type:'timed', warm:true, id:sid, secs:s, sides: !!(P.EX[sid] && P.EX[sid].side), rest:10}); });
  sess.ex.forEach((b, bi) => {
    const items = (b.ss || [b]).map(i => ({...i, id:swap(i.id, gentle), sets: gentle ? Math.max(2, i.sets-1) : i.sets}));
    const rounds = Math.max(...items.map(i=>i.sets));
    for(let r=1; r<=rounds; r++) items.forEach((it, k) => { if(r > it.sets) return; const lastInRound = k===items.length-1;
      steps.push({type: isTimed(it.reps) ? 'hold' : 'set', note:it.note, label:it.label, id:it.id, round:r, sets:it.sets, reps:it.reps, secs: isTimed(it.reps) ? secsOf(it.reps) : 0, sides: isTimed(it.reps) && perSide(it.reps), rest: lastInRound ? (it.rest||60) : 0, ss: items.length>1, block:bi}); });
  });
  if(sess.coolItems) sess.coolItems.forEach((it, k) => steps.push({type:'timed', cool:true, first:k===0, auto:k>0, id:it.id, secs:it.secs, sides:it.sides, note:it.note, rest:0}));
  else P.coolFor(sess.warm||'full', seed).forEach(([id, secs], k) => steps.push({type:'timed', cool:true, first:k===0, auto:k>0, id, secs, sides: !!(P.STRETCH[id] && P.STRETCH[id].side), rest:0}));
  PL = {kind:'strength', x, gentle, steps, i:0, sets:{}, started:Date.now()};
  if(sess.style) toast(`${sess.style}: ${sess.styleNote}`);
  openPlayer(); say(new Date().getHours()<11 ? "Good morning! Let's get moving." : null, "Let's start with a quick warm-up."); drawStep();
}
function canGoBack(){ return PL && (PL.kind==='strength' ? (PL.hist||[]).length > 0 : PL.kind==='run' ? PL.p > 0 : PL.i > 0); }
function header(title){ const n = PL.steps.length, i = Math.min(PL.i, n); return `<div class="bar"><button class="x" type="button" data-pclose>✕ Close</button><b style="text-align:center">${esc(title)}</b><span class="note">${i}/${n}</span></div>
  <div class="row" style="justify-content:space-between;margin-top:8px"><button class="x" type="button" data-pback ${canGoBack()?'':'disabled style="opacity:.4"'} aria-label="Go back to the previous ${PL.kind==='strength'?'set or exercise':'step'}">← Back</button></div><div class="pbar"><i style="width:${i/n*100}%"></i></div>`; }
function watchLink(id){ const ex = P.EX[id] || P.STRETCH[id]; return ex ? `<a class="chip link" href="${P.yt(ex.q)}" target="_blank" rel="noopener">▶ Watch how</a>` : ''; }
function nameOf(id){ return (P.EX[id] || P.STRETCH[id] || {n:id}).n; }
function nameOfStep(s){ return (s && s.cool ? (P.STRETCH[s.id] || P.EX[s.id]) : (P.EX[s.id] || P.STRETCH[s.id]) || {n:s.id}).n; }
function upNext(from, count=3){ return PL.steps.slice(from, from+count).map(s => `<div class="item" style="padding:8px 0"><span class="ic" style="width:32px;height:32px;font-size:15px;background:var(--line)">${s.type==='set'?'🏋️':s.warm?'🔥':'⏱'}</span><span><b style="font-size:14.5px">${esc(s.label||nameOf(s.id))}</b><span class="s">${s.type==='set'?`Set ${s.round} of ${s.sets} · ${esc(P.repsLabel(s.id, s.reps))}`: (s.secs||'')+' s'+(s.sides?' each side':'')} · ${esc(P.gear(s.id))}</span></span><span></span></div>`).join(''); }

function drawStep(){
  clearInterval(plTimer);
  const s = PL.steps[PL.i]; const title = PL.x.title || 'Workout';
  if(!s) return finishStrength();
  if(PL.i>0 && PL.steps[PL.i-1].warm && !s.warm) say("Warm-up done. Let's get into it.");
  if(s.type==='timed' || s.type==='hold'){
    // Phases: one timer, or left side, a 3-second switch, then right side
    const phases = s.sides ? [{label:'Left side', secs:s.secs}, {label:'Switch sides', secs:3, gap:true}, {label:'Right side', secs:s.secs}] : [{label:'', secs:s.secs}];
    let pi = 0, left = phases[0].secs, running = false, started = false;
    $('#player').innerHTML = `<div class="in">${header(title)}<div class="now ${s.warm?'c-peach':s.cool?'c-mint':''}"><div class="row" style="justify-content:space-between"><span class="kicker">${s.warm?'Warm-up':s.cool?'Cool-down':`Set ${s.round} of ${s.sets}`}</span>${watchLink(s.id)}</div><p class="name">${esc(s.label||nameOf(s.id))}</p>
      <div class="row" style="margin-top:4px">${gearChip(s.id)}${s.sides?`<span class="chip" style="background:var(--soft)">${s.secs} s each side</span>`:''}</div>${s.note?`<p class="note" style="margin:6px 0 0;color:var(--ink)">📝 ${esc(s.note)}</p>`:''}
      ${s.warm||s.cool?'':muscleBlock([s.id], 132)}<p class="kicker" id="side" style="text-align:center;margin:10px 0 0">${s.sides?'Left side first':''}</p><div class="clock" id="clk">${fmt(left)}</div>
      <div class="row" style="justify-content:center"><button class="btn" id="go" type="button">▶ Start</button><button class="btn soft" id="skip" type="button">Skip</button></div>${s.cool?'<div class="row" style="justify-content:center;margin-top:10px"><button class="btn soft" id="skipCool" type="button">Skip cool-down</button></div>':''}</div><h2>Up next</h2><div class="card">${upNext(PL.i+1)}</div></div>`;
    const clk = $('#clk'), sideEl = $('#side'); let cd = null;
    const runPhase = () => { const ph = phases[pi]; sideEl.textContent = ph.label;
      cd = countdown(ph.secs, n => { clk.textContent = fmt(n); if(!ph.gap && n===10 && ph.secs>=30) say('Ten seconds left.'); }, () => {
        pi++;
        if(pi < phases.length){ say(phases[pi].gap ? (s.cool ? 'Gently switch sides.' : 'Switch sides.') : (s.cool ? null : 'Three. Two. One. Go!')); runPhase(); return; }
        if(s.type==='hold'){ (PL.sets[s.id] = PL.sets[s.id] || []).push({r:s.secs+' s'+(s.sides?' each side':'')}); (PL.logged = PL.logged || {})[PL.i] = true; }
        advance(s); }); };
    $('#go').onclick = () => {
      if(!started){ started = true; running = true; $('#go').textContent='⏸ Pause'; if(s.cool) leadIn(clk, s.first ? 'Get into position' : 'Next stretch', s.first ? null : 'Hold this stretch.', runPhase, s.first ? 5 : 4); else leadIn(clk, 'Get ready', [P.EX[s.id] ? P.EX[s.id].v : null, 'Three. Two. One. Go!'], runPhase, 3); return; }
      if(!cd) return;
      if(running){ cd.pause(); running = false; $('#go').textContent='▶ Resume'; } else { cd.resume(); running = true; $('#go').textContent='⏸ Pause'; } };
    $('#skip').onclick = () => { clearInterval(plTimer); advance(s); };
    const sc = $('#skipCool'); if(sc) sc.onclick = () => { clearInterval(plTimer); quiet(); PL.i = PL.steps.length; finishStrength(); };
    if(s.cool && s.first) say("Let's stretch.");
    if(s.auto) $('#go').click();   // cool-down stretches flow into each other
    return;
  }
  // a set with weights or reps
  const last = lastSets(s.id), lastStr = last ? last.map(x => (x.w ? x.w+' kg × ' : '') + x.r).join(', ') : null;
  const sug = s.round===1 ? P.nextStep(last, s.reps, PL.gentle) : null;
  const done = PL.sets[s.id] || [], prev = done[done.length-1];
  const w0 = prev ? prev.w : sug ? sug.w : (last ? Math.max(...last.map(x=>+x.w||0)) : ''), r0 = prev ? prev.r : P.topReps(s.reps);
  const ex = P.EX[s.id] || {};
  $('#player').innerHTML = `<div class="in">${header(title)}<div class="now"><div class="row" style="justify-content:space-between"><span class="kicker">Set ${s.round} of ${s.sets}${s.ss?' · superset':''}</span>${watchLink(s.id)}</div>
    <p class="name">${esc(s.label||ex.n||s.id)}</p><div class="row" style="margin:4px 0 6px">${gearChip(s.id)}</div><p class="muted" style="margin:0;font-weight:700;color:var(--ink)">${esc(P.repsLabel(s.id, s.reps))}${PL.gentle?' · gentler version':''}</p>${PL.x.session && PL.x.session.tempo ? '<p class="note" style="margin:4px 0 0">🐢 Tempo week: lower slowly for 3 seconds</p>' : ''}${s.note?`<p class="note" style="margin:4px 0 0;color:var(--ink)">📝 ${esc(s.note)}</p>`:''}
    ${muscleBlock([s.id], 132)}
    ${lastStr ? `<p class="note" style="margin:8px 0 0">Last time: ${esc(lastStr)}</p>` : ''}
    ${sug ? `<div class="suggest">${sug.up?'📈':'💡'} ${esc(sug.msg)}</div>` : ''}
    <div class="setrow">${ex.w ? `<span></span><label><input id="w" inputmode="decimal" value="${w0}" aria-label="Weight in kg"><small>kg</small></label>` : '<span></span><span></span>'}<label><input id="r" inputmode="numeric" value="${r0}" aria-label="Reps"><small>${/each/.test(String(s.reps)) || (ex.side && !ex.alt) ? 'reps per side' : ex.alt ? 'total reps' : 'reps'}</small></label></div>
    <button class="btn wide" id="setDone" type="button" style="margin-top:14px;padding:15px">✓ Done set</button></div>
    <h2>Up next</h2><div class="card">${upNext(PL.i+1)}</div></div>`;
  const prevStep = PL.steps[PL.i-1], changed = !(prevStep && prevStep.id===s.id && prevStep.type!=='timed');
  if(changed) say(PL.i>0 ? 'Next up...' : null, ex.v, sug ? sug.clip : null);
  if(s.round===s.sets && s.sets>1 && (changed || !s.ss)) say('Last set!');
  $('#setDone').onclick = () => { const w = ex.w ? +String($('#w').value).replace(',','.') || 0 : 0, r = +$('#r').value || 0;
    (PL.sets[s.id] = PL.sets[s.id] || []).push({w, r}); (PL.logged = PL.logged || {})[PL.i] = true;
    if(ex.w && w > pb(s.id) && pb(s.id) > 0){ say('New personal best! Well done.'); toast('New personal best! 🎉'); }
    advance(s); };
}
function advance(s){
  (PL.hist = PL.hist || []).push(PL.i);
  PL.i++;
  const next = PL.steps[PL.i];
  if(!next) return drawStep();
  if(s.rest > 0 && !s.warm) return restScreen(s.rest, next);
  drawStep();
}
function restScreen(secs, next){
  let left = secs; const title = PL.x.title || 'Workout';
  const restClip = secs<=20 ? 'Rest for fifteen seconds.' : secs<=35 ? 'Rest for thirty seconds.' : secs<=50 ? 'Rest for forty-five seconds.' : secs<=70 ? 'Rest for one minute.' : 'Rest for ninety seconds.';
  say(restClip);
  $('#player').innerHTML = `<div class="in">${header(title)}<div class="rest"><p class="kicker" style="opacity:.8">Rest</p><div class="clock" id="clk">${fmt(left)}</div><p style="margin:0 0 14px">Next: <b>${esc(nameOf(next.id))}</b>${next.type==='set'?` · set ${next.round} of ${next.sets}`:''}</p>
    <div class="row" style="justify-content:center"><button class="btn soft" id="plus" type="button" style="color:inherit">+15 s</button><button class="btn soft" id="skip" type="button" style="color:inherit">Skip rest</button></div></div>
    <p class="note" style="text-align:center;margin-top:12px">Take a sip of water 💧</p></div>`;
  const cd = countdown(secs, n => { $('#clk').textContent = fmt(n); if(n===3) say('Three. Two. One. Go!'); }, () => drawStep());
  $('#plus').onclick = () => cd.add(15);
  $('#skip').onclick = () => { clearInterval(plTimer); drawStep(); };
}
async function finishStrength(){
  PL.finished = true; say(PL.steps.some(x=>x.cool) ? 'Slowly come out of the stretch.' : null, 'Workout complete! Amazing work.');
  const mins = Math.round((Date.now()-PL.started)/60000), x = PL.x;
  const list = Object.entries(PL.sets).filter(([id,ss]) => P.EX[id] && P.EX[id].w && ss.some(x=>x.w)).map(([id,ss]) => `<div class="item" style="padding:8px 0"><span class="ic c-pink" style="width:32px;height:32px;font-size:15px">🏋️</span><span><b style="font-size:14.5px">${esc(P.EX[id].n)}</b><span class="s">${ss.map(s=>(s.w?s.w+' kg × ':'')+s.r+(s.w?'':' reps')).join(', ')}</span></span><span></span></div>`).join('');
  $('#player').innerHTML = `<div class="in"><div class="bar"><span></span><b>All done!</b><span></span></div><div class="tint c-lime" style="margin-top:14px;text-align:center"><p style="font-size:44px;margin:0">🎉</p><p class="big">${esc(x.title)} complete</p><p class="muted">About ${mins} minutes. Proud of you for showing up today.</p></div>
    ${list ? `<h2>Your weights</h2><div class="card">${list}</div>` : ''}
    <div class="stack" style="margin-top:16px"><button class="btn wide" id="saveW" type="button" style="padding:15px">Save workout</button><button class="btn line wide" id="saveFin" type="button">Save and add a finisher</button></div></div>`;
  let saved = false;
  const save = btn => { if(saved) return true; saved = true; ['#saveW','#saveFin'].forEach(sel => { const b = $(sel); if(b){ b.disabled = true; } }); btn.textContent = 'Saving…';
    try{ saveLog({kind:'strength', title:x.title, planKey:x.key, program:x.program, week:x.week, gentle:!!PL.gentle, sets:PL.sets, mins}); toast('Saved! 💪'); return true; }
    catch(e){ saved = false; ['#saveW','#saveFin'].forEach(sel => { const b = $(sel); if(b) b.disabled = false; }); btn.textContent = 'Try again'; toast('Couldn’t save. Please try again.'); return false; } };
  $('#saveW').onclick = e => { if(save(e.currentTarget)) closePlayer(); };
  $('#saveFin').onclick = e => { if(save(e.currentTarget)){ closePlayer(); finisherSheet('pick'); } };
}

/* ---------- Finishers ---------- */
function finisherSheet(id){
  const list = id==='pick' || id==='surprise' ? P.FINISHERS : [P.FINISHERS.find(f=>f.id===id)];
  if(id==='surprise'){ const gentle = periodWeek() && periodWeek().mode!=='none'; const pool = P.FINISHERS.filter(f=>!(gentle && f.jumpy)); const f = pool[Math.floor(Math.random()*pool.length)]; return startFinisher(f, f.mins[0]); }
  openSheet(id==='pick' ? 'Add a finisher' : list[0].name, `<div class="stack">${list.map(f => `<div class="tint c-${f.c}"><p class="big" style="font-size:20px">${f.e} ${esc(f.name)}</p><p class="muted" style="margin:0 0 10px">${f.on} s on, ${f.off} s off · ${f.moves.map(m=>P.EX[m].n).slice(0,4).join(', ')}…</p><div class="row">${f.mins.map(m=>`<button class="btn" type="button" data-fstart="${f.id}" data-m="${m}">▶ ${m} min</button>`).join('')}</div></div>`).join('')}</div>`, body => {
    body.onclick = e => { const b = e.target.closest('[data-fstart]'); if(!b) return; closeSheet(); startFinisher(P.FINISHERS.find(f=>f.id===b.dataset.fstart), +b.dataset.m); };
  });
}
function startFinisher(f, mins){
  const gentle = periodWeek() && periodWeek().mode!=='none';
  const ints = P.finisherIntervals(f, mins).map(s => ({...s, id: swap(s.id, gentle)}));
  PL = {kind:'finisher', f, mins, steps: ints, i:0, x:{title:f.name}};
  openPlayer(); say(P.FINISHER_CLIP[f.id]); PL.leadIn = true; drawInterval(false);
}
function drawInterval(resting){
  clearInterval(plTimer);
  const s = PL.steps[PL.i]; if(!s){ PL.finished = true; say('Finisher done! Great job.'); return finishSimple('finisher', PL.f.name, PL.mins); }
  let left = resting ? s.rest : s.secs; const nx = resting ? PL.steps[PL.i+1] : null;
  if(resting && !nx){ PL.i++; return drawInterval(false); }
  const show = resting ? nx : s;
  $('#player').innerHTML = `<div class="in">${header(PL.f.name)}<div class="${resting?'rest':'now c-'+PL.f.c}"><div class="row" style="justify-content:space-between"><span class="kicker">${resting?'Rest · next up':'Go!'}</span>${resting?'':watchLink(s.id)}</div><p class="name">${esc(nameOf(show.id))}</p><div class="row" style="margin:4px 0">${gearChip(show.id)}</div>${resting?'':muscleBlock([s.id], 120)}<div class="clock" id="clk">${fmt(left)}</div>
    <div class="row" style="justify-content:center"><button class="btn soft" id="pause" type="button" style="color:inherit">⏸ Pause</button><button class="btn soft" id="skip" type="button" style="color:inherit">Skip</button></div></div></div>`;
  let cd = null;
  const run = () => cd = countdown(left, n => { $('#clk').textContent = fmt(n); if(!resting && n===10) say('Ten seconds left.'); }, () => { if(resting){ PL.i++; drawInterval(false); } else { say('Three. Two. One. And rest.'); drawInterval(true); } });
  $('#pause').onclick = () => { if(!cd) return; if(cd.paused){ cd.resume(); $('#pause').textContent = '⏸ Pause'; } else { cd.pause(); $('#pause').textContent = '▶ Resume'; } };
  $('#skip').onclick = () => { clearInterval(plTimer); if(resting){ PL.i++; drawInterval(false); } else drawInterval(true); };
  if(resting){ say('Next up...', P.EX[nx.id].v); run(); }
  else if(PL.leadIn){ PL.leadIn = false; leadIn($('#clk'), 'Get ready', [P.EX[s.id].v, 'Three. Two. One. Go!'], () => { $('#clk').textContent = fmt(left); run(); }, 4); }
  else { say(P.EX[s.id].v, 'Three. Two. One. Go!'); run(); }
}
function finishSimple(kind, title, mins, planKey){
  $('#player').innerHTML = `<div class="in"><div class="tint c-lime" style="margin-top:30px;text-align:center"><p style="font-size:44px;margin:0">✨</p><p class="big">${esc(title)} done</p><p class="muted">${mins} minutes. Great job!</p></div><button class="btn wide" id="saveS" type="button" style="margin-top:16px;padding:15px">Save</button><button class="btn line wide" type="button" data-pclose style="margin-top:10px">Close without saving</button></div>`;
  $('#saveS').onclick = () => { saveLog({kind, title, mins, planKey: planKey||null}); toast('Saved! ✨'); closePlayer(); };
}

/* ---------- Stretches ---------- */
function startStretch(rid, key){
  const r = P.ROUTINES[rid], steps = [];
  r.list.forEach(([id, s]) => { if(P.STRETCH[id].side){ steps.push({id, secs:s, side:'Left side'}); steps.push({id, secs:s, side:'Right side', switch:1}); } else steps.push({id, secs:s}); });
  PL = {kind:'stretch', r, rid, key, steps, i:0, x:{title:r.name}};
  openPlayer(); say("Let's stretch."); PL.leadIn = true; drawStretch();
}
function drawStretch(){
  clearInterval(plTimer);
  const s = PL.steps[PL.i];
  if(!s){ PL.finished = true; say(PL.rid==='night' ? 'Stretch complete. Sleep well.' : 'Slowly come out of the stretch.'); return finishSimple('stretch', PL.rid==='deep' ? 'Deep Stretch' : 'Stretch', PL.r.mins, PL.key); }
  let left = s.secs, paused = false;
  $('#player').innerHTML = `<div class="in">${header(PL.r.name)}<div class="now c-${PL.rid==='night'?'lilac':'sky'}"><div class="row" style="justify-content:space-between"><span class="kicker">${s.side||'Hold'}</span>${watchLink(s.id)}</div><p class="name">${esc(P.STRETCH[s.id].n)}</p><div class="clock" id="clk">${fmt(left)}</div>
    <div class="row" style="justify-content:center"><button class="btn soft" id="pause" type="button">⏸ Pause</button><button class="btn soft" id="skip" type="button">Next</button></div></div><h2>Up next</h2><div class="card">${PL.steps.slice(PL.i+1,PL.i+4).map(n=>`<div class="item" style="padding:8px 0"><span class="ic" style="width:32px;height:32px;font-size:15px;background:var(--line)">🌿</span><span><b style="font-size:14.5px">${esc(P.STRETCH[n.id].n)}</b><span class="s">${n.side||''} ${n.secs} s</span></span><span></span></div>`).join('')}</div></div>`;
  let cd = null;
  const run = () => cd = countdown(left, n => { $('#clk').textContent = fmt(n); if(n===Math.floor(s.secs/2) && s.secs>=50) say('Relax a little deeper.'); }, () => { PL.i++; drawStretch(); });
  $('#pause').onclick = () => { if(!cd) return; if(cd.paused){ cd.resume(); $('#pause').textContent = '⏸ Pause'; } else { cd.pause(); $('#pause').textContent = '▶ Resume'; } };
  $('#skip').onclick = () => { clearInterval(plTimer); PL.i++; drawStretch(); };
  const clk = $('#clk'), go = () => { clk.textContent = fmt(left); run(); };
  if(PL.leadIn){ PL.leadIn = false; leadIn(clk, 'Get into position', null, go, 5); }
  else if(s.switch){ leadIn(clk, 'Switch sides', 'Gently switch sides.', go, 3); }
  else { say(PL.i%3===0 ? 'Breathe into it.' : 'Hold this stretch.'); go(); }
}

/* ---------- Runs ---------- */
function startRun(key){
  const opt = key==='runopt', km = opt ? 3 : nextRunKm().km, pace = local.get('pace', 8); // minutes per km
  const runMins = Math.round(km*pace);
  const phases = [{n:'Warm-up walk', secs:300, clip:"Let's start with a five-minute warm-up walk."}, {n:'Run', secs:runMins*60, clip:'Start running. Nice and easy.', run:1}, {n:'Cool-down walk', secs:300, clip:'Time for your cool-down walk.'}];
  PL = {kind:'run', key, km, phases, p:0, started:Date.now(), phaseStart:Date.now(), runSecs:0, x:{title:'Run'}, steps:phases, i:0, said:{}};
  openPlayer(); say(phases[0].clip); drawRun();
}
function drawRun(){
  clearInterval(plTimer);
  const ph = PL.phases[PL.p]; if(!ph){ PL.finished = true; say('Run complete. How did your knee feel today?'); return runLogSheet(PL.key, Math.round(PL.runSecs/60)); }
  PL.i = PL.p;
  $('#player').innerHTML = `<div class="in">${header(`Run · ${PL.km} km`)}<div class="now c-lime"><span class="kicker">${esc(ph.n)}</span><p class="name">${ph.run ? `${PL.km} km easy` : esc(ph.n)}</p><div class="clock" id="clk">0:00</div><p class="muted" style="text-align:center;margin:0" id="sub"></p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="next" type="button">${ph.run?'I’ve finished running':'Skip'}</button></div></div>
    <p class="note" style="margin-top:12px">Keep the screen on for voice cues. With the phone locked in a pocket, cues may not play, but the time is still counted when you come back.</p></div>`;
  const tick = () => {
    const el = (Date.now()-PL.phaseStart)/1000, left = ph.secs-el;
    $('#clk').textContent = fmt(ph.run ? el : Math.max(0,left));
    if(ph.run){ PL.runSecs = el; $('#sub').textContent = `Planned about ${Math.round(ph.secs/60)} min · chatty pace`;
      const frac = el/ph.secs; if(frac>=.5 && !PL.said.half){ PL.said.half=1; say("Halfway. You're doing so well."); } if(frac>=.9 && !PL.said.near){ PL.said.near=1; say('Nearly there. Keep going.'); }
      if(el>=ph.secs && !PL.said.end){ PL.said.end=1; toast('That’s your planned distance! Tap when you’ve finished.'); } }
    else { $('#sub').textContent = 'left'; if(left<=0) nextPhase(); }
  };
  plTimer = setInterval(tick, 1000); tick();
  $('#next').onclick = nextPhase;
}
function nextPhase(){ PL.p++; PL.phaseStart = Date.now(); const ph = PL.phases[PL.p]; if(ph) say(ph.clip); drawRun(); }
function runLogSheet(key, mins){
  const planned = key==='runopt' ? 3 : key==='run' ? nextRunKm().km : '';
  const html = `<label class="l" for="rk">Distance (km)</label><input class="f" id="rk" inputmode="decimal" value="${planned}">
    <label class="l" for="rm">Running time (minutes)</label><input class="f" id="rm" inputmode="numeric" value="${mins||''}">
    <label class="l" id="kl">How did your knee feel?</label><div class="chips" role="group" aria-labelledby="kl"><button class="chip" type="button" data-knee="good" aria-pressed="true">😊 Fine</button><button class="chip" type="button" data-knee="niggly" aria-pressed="false">😐 A bit niggly</button><button class="chip" type="button" data-knee="sore" aria-pressed="false">😣 Sore</button></div>
    <p class="note" id="kneeNote" style="margin-top:8px">Next run grows a little. 🎉</p>
    <button class="btn wide" id="saveRun" type="button" style="margin-top:16px;padding:15px">Save run</button>`;
  const doIt = body => { let knee = 'good';
    body.querySelectorAll('[data-knee]').forEach(b => b.onclick = () => { knee = b.dataset.knee; body.querySelectorAll('[data-knee]').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); body.querySelector('#kneeNote').textContent = knee==='good' ? 'Next run grows a little. 🎉' : knee==='niggly' ? 'Next run stays the same distance. 💛' : 'Next run stays the same. If it keeps hurting, see a physio or GP.'; });
    body.querySelector('#saveRun').onclick = async () => { const km = +String(body.querySelector('#rk').value).replace(',','.') || 0, m = +body.querySelector('#rm').value || 0;
      saveLog({kind:'run', title:'Run', km, mins:m, knee, planKey:key||null}); if(km && m) local.set('pace', Math.max(5, Math.min(12, m/km)));
      toast('Run saved! 🏃‍♀️'); if(!$('#player').hidden) closePlayer(); else closeSheet(); };
  };
  if(!$('#player').hidden){ $('#player').innerHTML = `<div class="in"><div class="bar"><span></span><b>Run complete 🎉</b><span></span></div><div class="card" style="margin-top:14px">${html}</div><button class="btn line wide" type="button" data-pclose style="margin-top:10px">Close without saving</button></div>`; doIt($('#player')); }
  else openSheet('Log a run', html, doIt);
}

/* =====================================================================
   MANUAL LOG ("Log my own workout")
   ===================================================================== */
const OWN_TYPES = [['Upper Body','💪'],['Lower Body','🍑'],['Full Body','🏋️‍♀️'],['Core','🔥'],['Pilates','🧘‍♀️'],['Yoga','🌿'],['Stretch','🌙'],['HIIT','⚡'],['Run','🏃‍♀️'],['Walk','🚶‍♀️'],['YouTube follow-along','▶️'],['Other','✨']];
function manualSheet(){
  const today = P.planFor(S, TODAY(), {periodWeek:periodWeek()}).filter(x => !isDone(TODAY(), x.key));
  openSheet('Log my own workout', `
    <label class="l" id="tl">What did you do?</label><div class="chips" role="group" aria-labelledby="tl">${OWN_TYPES.map(([t,e],i)=>`<button class="chip" type="button" data-type="${esc(t)}" aria-pressed="${i===0}">${e} ${esc(t)}</button>`).join('')}</div>
    <label class="l" for="mt">Name (this is what goes in your Exercise calendar)</label><input class="f" id="mt" value="Upper Body">
    <div class="grid2"><div><label class="l" for="md">Date</label><input class="f" id="md" type="date" value="${TODAY()}" max="${TODAY()}"></div><div><label class="l" for="mm">Minutes</label><input class="f" id="mm" inputmode="numeric" placeholder="e.g. 30"></div></div>
    <div id="kmWrap" hidden><label class="l" for="mk">Distance (km)</label><input class="f" id="mk" inputmode="decimal" placeholder="e.g. 4"></div>
    <label class="l" for="ml">Link (optional, e.g. the YouTube video)</label><input class="f" id="ml" type="url" placeholder="https://…">
    <label class="l" for="mp">Does it count as one of this week’s planned sessions?</label>
    <select class="f" id="mp"><option value="">No, it’s an extra</option>${today.map(x=>`<option value="${x.key}">Yes: replaces today’s ${esc(x.title)}</option>`).join('')}</select>
    <p class="note" style="margin-top:6px">Choose “replaces” and today’s planned session is ticked off, so it counts towards your week.</p>
    <button class="btn wide" id="ownSave" type="button" style="margin-top:16px;padding:15px">Save</button>`, body => {
    let type = 'Upper Body';
    body.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { type = b.dataset.type; body.querySelectorAll('[data-type]').forEach(x=>x.setAttribute('aria-pressed', String(x===b)));
      body.querySelector('#mt').value = type==='YouTube follow-along' ? 'Follow-along workout' : type; body.querySelector('#kmWrap').hidden = !(type==='Run' || type==='Walk'); });
    body.querySelector('#ownSave').onclick = async () => {
      const title = body.querySelector('#mt').value.trim() || type, date = body.querySelector('#md').value || TODAY(), mins = +body.querySelector('#mm').value || 0, km = +String(body.querySelector('#mk').value).replace(',','.') || 0, link = body.querySelector('#ml').value.trim(), pk = body.querySelector('#mp').value;
      const kind = type==='Run' ? 'run' : 'manual';
      saveLog({kind, title: kind==='run' ? 'Run' : title, type: type.toLowerCase(), date, mins, km: km||null, link: link||null, planKey: date===TODAY() ? (pk||null) : null, manual:true});
      closeSheet(); toast('Logged! It counts towards your week ✨');
    };
  });
}

/* =====================================================================
   PROGRAMS
   ===================================================================== */
function renderPrograms(){
  const cur = S.program ? P.program(S.program) : null, wk = P.programWeek(S, TODAY());
  let html = `<h1>Programs</h1><p class="sub">Tap one to see it. Switch any time; weeks run Monday to Sunday.</p>`;
  if(cur){ const sessions = logs.filter(l => l.program===cur.id && l.kind==='strength' && l.date >= S.programStart).length, total = cur.weeks*3;
    html += `<div class="tint c-${cur.c}"><p class="kicker">Current program</p><p class="big">${cur.e} ${esc(cur.name)}</p><p class="muted" style="margin:0 0 10px">${wk>cur.weeks ? 'Finished! 🎉 Pick your next one below.' : `Week ${Math.max(1,wk)} of ${cur.weeks} · ${sessions} of ${total} sessions done`}</p><div class="prog"><i style="width:${Math.min(100,sessions/total*100)}%"></i></div><div class="row" style="margin-top:12px"><button class="btn soft" type="button" data-prog="${cur.id}">View</button></div></div>`; }
  const tile = p => `<button class="tile c-${p.c}" type="button" data-prog="${p.id}">${p.isNew?'<span class="badge">New</span>':''}<span class="e">${p.e}</span><b>${esc(p.name)}</b><span>${p.weeks} week${p.weeks>1?'s':''} · ${esc(p.tag)}</span></button>`;
  const owners = [...new Set(P.PROGRAMS.filter(p=>p.owner).map(p=>p.owner))];
  owners.forEach(o => { html += `<h2>${esc(o)}’s programs</h2><div class="grid2">${P.PROGRAMS.filter(p=>p.owner===o).map(tile).join('')}</div>`; });
  html += `<h2>All programs</h2><div class="grid2">${P.PROGRAMS.filter(p=>!p.owner).map(p => `<button class="tile c-${p.c}" type="button" data-prog="${p.id}">${p.isNew?'<span class="badge">New</span>':''}<span class="e">${p.e}</span><b>${esc(p.name)}</b><span>${p.weeks} week${p.weeks>1?'s':''} · ${esc(p.tag)}</span></button>`).join('')}</div>`;
  const hist = (S.history||[]).slice().reverse();
  if(hist.length) html += `<h2>Past programs</h2><div class="card">${hist.map(h => { const p = P.program(h.id); return `<div class="item"><span class="ic c-${p.c}">${p.e}</span><span><b>${esc(p.name)}</b><span class="s">${esc(h.start)} to ${esc(h.end)}</span></span><span></span></div>`; }).join('')}</div>`;
  $('#v-programs').innerHTML = html;
}
function programSheet(id){
  const p = P.program(id), mon = thisWeek(), nextMon = P.addDays(mon, 7), sch = {...P.DEFAULT_SCHEDULE, ...(S.schedule||{})};
  const dayHTML = slot => { const d = p.days[slot]; return `<div class="card" style="margin-top:10px"><p class="kicker muted">${P.DAY_NAMES[sch[slot]]}</p><p style="font-weight:800;font-size:17px;margin:2px 0 6px">${esc(d.title)}</p>${muscleBlock(sessionIds(d), 120)}${d.ex.map(b => (b.ss||[b]).map((x,k) => `<div class="item" style="padding:7px 0"><span class="ic" style="width:30px;height:30px;font-size:13px;background:var(--line)">${b.ss?(k?'↳':'SS'):'•'}</span><span><b style="font-size:14.5px">${esc(x.label||P.EX[x.id].n)}</b><span class="s">${x.sets} sets · ${esc(P.repsLabel(x.id, x.reps))} · ${esc(P.gear(x.id))}</span></span><a class="link" style="font-size:13px" href="${P.yt(P.EX[x.id].q)}" target="_blank" rel="noopener">Watch</a></div>`).join('')).join('')}</div>`; };
  const isCur = S.program===id;
  openSheet(`${p.e} ${p.name}`, `<p class="muted" style="margin-top:0">${esc(p.blurb)}</p><div class="row"><span class="chip" style="background:var(--card)">${p.weeks} week${p.weeks>1?'s':''}</span><span class="chip" style="background:var(--card)">${esc(p.level)}</span><span class="chip" style="background:var(--card)">3 sessions a week</span></div>
    ${['A','B','C'].map(dayHTML).join('')}
    ${p.weeksData ? `<div class="card" style="margin-top:12px"><b>How the 4 weeks work</b>${[1,2,3,4].map(w=>`<p class="note" style="margin:6px 0 0;color:var(--ink)"><b>Week ${w}: ${esc((p.weeksData[String(w)]||{}).phase||'')}.</b> ${esc((p.progression||{})['week_'+w]||'')}</p>`).join('')}${(p.progression||{}).after_cycle?`<p class="note" style="margin:6px 0 0">After week 4: ${esc(p.progression.after_cycle)}</p>`:''}</div>
      <p class="note" style="margin-top:8px">Shown above: week 1. Weeks 2–4 bring different exercises, as set out in the program.</p>
      ${p.nutrition && p.nutrition.protein ? `<details class="card" style="margin-top:10px"><summary style="font-weight:800;cursor:pointer">Recovery notes from the program</summary>${Object.entries(p.nutrition).map(([k,v])=>`<p class="note" style="margin:6px 0 0;color:var(--ink)"><b>${esc(k.replace('_',' '))}:</b> ${esc(v)}</p>`).join('')}</details>` : ''}`
      : `<p class="note" style="margin-top:12px">Sets build gently from week to week through your weights: the app suggests when to go up.</p>`}
    ${isCur ? '<p class="chip" style="margin-top:10px">This is your current program</p>' : `<div class="stack" style="margin-top:14px"><button class="btn wide" type="button" data-pstart="${mon}">Start this week (Monday ${P.parse(mon).getDate()} ${F.MONTHS[P.parse(mon).getMonth()].slice(0,3)})</button><button class="btn line wide" type="button" data-pstart="${nextMon}">Start next Monday (${P.parse(nextMon).getDate()} ${F.MONTHS[P.parse(nextMon).getMonth()].slice(0,3)})</button></div>`}`,
    body => { body.onclick = async e => { const b = e.target.closest('[data-pstart]'); if(!b) return;
      const hist = (S.history||[]).slice(); if(S.program) hist.push({id:S.program, start:S.programStart, end:P.addDays(b.dataset.pstart,-1)});
      await metaSave({program:id, programStart:b.dataset.pstart, history:hist}); closeSheet(); toast(`${p.name} is set! 🎉`); go('today'); }; });
}

/* =====================================================================
   RUN
   ===================================================================== */
function renderRun(){
  let html = `<h1>Road to 10 km 🏃‍♀️</h1><p class="sub">One key run a week, building gently, plus an optional easy run. Your knee check decides whether the next run grows.</p>`;
  if(!S.runStart){ html += `<div class="tint c-lime"><p class="big">Start the running plan</p><p class="muted">14 weeks from about 4 km to 10 km, with step-back weeks so your body can catch up.</p><button class="btn" id="runGo" type="button">Start this week</button></div>`; }
  else {
    const rw = P.runWeek(S, TODAY()), runs = logs.filter(l => l.kind==='run');
    const best = Math.max(0, ...runs.map(r=>+r.km||0), ...((IMP&&IMP.runs)||[]).map(r=>+r.km||0));
    html += `<div class="tint c-lime"><p class="kicker">Week ${Math.min(rw,14)} of 14</p><p class="big">Next: ${nextRunKm().km} km</p><div class="prog" style="margin:8px 0"><i style="width:${Math.min(100,best/10*100)}%"></i></div><p class="muted" style="margin:0 0 10px">Longest run: ${best||0} km · ${Math.round(Math.min(100,best/10*100))}% of the way</p><div class="row"><button class="btn" type="button" data-run="run">▶ Start run</button><button class="btn soft" type="button" data-logrun="run">Log a run</button></div></div>`;
    html += `<h2>The plan</h2><div class="card">${P.RUN_PLAN.map((km,i) => { const wkMon = P.addDays(P.monday(S.runStart), i*7), done = runs.find(r => r.planKey==='run' && P.monday(r.date)===wkMon);
      return `<div class="item"><span class="ic ${done?'c-lime':''}" style="${done?'':'background:var(--line)'}">${done?'✓':i+1}</span><span><b>Week ${i+1}: ${km} km${i===13?' 🎉':''}</b><span class="s">${done ? esc(P.eventTitle(done)) : esc(P.RUN_NOTES[i]||'Easy, chatty pace')}</span></span><span class="note">${P.parse(wkMon).getDate()} ${F.MONTHS[P.parse(wkMon).getMonth()].slice(0,3)}</span></div>`; }).join('')}</div>`;
  }
  const recent = logs.filter(l=>l.kind==='run').sort((a,b)=>a.date<b.date?1:-1).slice(0,8);
  html += `<h2>Recent runs</h2>${recent.length ? `<div class="card">${recent.map(r=>`<div class="item"><span class="ic c-lime">🏃‍♀️</span><span><b>${esc(P.eventTitle(r))}</b><span class="s">${esc(r.date)} · knee ${r.knee==='good'?'😊':r.knee==='niggly'?'😐':r.knee==='sore'?'😣':'–'}</span></span><button class="btn soft" type="button" data-undo="${r.id}">Remove</button></div>`).join('')}</div>` : '<p class="empty">No runs logged yet.</p>'}`;
  html += `<div class="card" style="margin-top:12px"><div class="item" style="padding:0;border:0"><span class="ic c-sky">🌿</span><span><b>5-minute post-run stretch</b><span class="s">Quads, calves, hips</span></span><button class="btn soft" type="button" data-stretch="post">Start</button></div></div>`;
  $('#v-run').innerHTML = html;
  const g = $('#runGo'); if(g) g.onclick = async () => { await metaSave({runStart: thisWeek()}); toast('Running plan started! 🏃‍♀️'); };
}

/* =====================================================================
   STRETCH
   ===================================================================== */
function renderStretch(){
  const r = P.ROUTINES, card = (k, c, extra) => `<div class="tint c-${c}" style="margin-top:12px"><p class="kicker">${extra}</p><p class="big">${r[k].e} ${esc(r[k].name)}</p><p class="muted" style="margin:0 0 10px">${r[k].list.map(([id])=>P.STRETCH[id].n).slice(0,5).join(' · ')}…</p><button class="btn" type="button" data-stretch="${k}" data-key="${k==='night'?'night':k==='deep'?'deep':''}">▶ Start · ${r[k].mins} min</button></div>`;
  $('#v-stretch').innerHTML = `<h1>Stretch 🌿</h1><p class="sub">Every night before bed, plus a deep stretch twice a week.</p>
    ${card('night','lilac', isDone(TODAY(),'night') ? 'Tonight · done ✓' : 'Tonight')}${card('deep','sky', `${deepThisWeek()} of 2 this week`)}${card('post','mint','After a run')}${card('roll','peach','Before your deep stretch, or any time')}
    <h2>All stretches</h2><div class="card">${Object.entries(P.STRETCH).map(([id,s])=>`<div class="item" style="padding:8px 0"><span class="ic" style="width:32px;height:32px;font-size:14px;background:var(--line)">🌿</span><span><b style="font-size:14.5px">${esc(s.n)}</b>${s.side?'<span class="s">each side</span>':''}</span><a class="link" style="font-size:13px" href="${P.yt(s.q)}" target="_blank" rel="noopener">Watch how</a></div>`).join('')}</div>`;
}

/* =====================================================================
   CYCLE (private)
   ===================================================================== */
const SYMPTOMS = ['Cramps','Backache','Headache','Bloating','Tired','Low mood','Great energy'];
function renderCycle(){
  const st = P.cycleStats(periods), date = TODAY(), day = P.cycleDay(st, date), ph = P.phase(st, day), open = periods.find(p => !p.ended && date >= p.start);
  const petal = (k) => `<svg width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true" style="transform:rotate(${k%2?45:0}deg)"><ellipse rx="3" ry="9" fill="${k%2?'var(--u-rose)':'var(--u-green)'}"/><ellipse rx="9" ry="3" fill="${k%2?'var(--u-rose)':'var(--u-green)'}"/><circle r="2.2" fill="var(--bg)"/></svg>`;
  let html = `<div class="petals">${Array.from({length:12},(_,k)=>petal(k)).join('')}</div><div class="cyc"><span class="mark" aria-hidden="true">cy<br>cle</span><p style="margin:0;font-weight:600">${esc((user.displayName||'').split(' ')[0] || 'Hi')}, today is</p>
    <p style="font-size:clamp(24px,7vw,30px);font-weight:500;margin:4px 0 6px;max-width:72%;line-height:1.15">${day ? `Day ${day} · <b>${esc(ph.n)}</b>` : 'No cycle logged yet'}</p><p style="margin:0 0 14px;max-width:80%">${ph ? esc(ph.note) : ''}</p>
    <div class="row">${open ? `<button class="cbtn" id="pEnd" type="button">Period ended</button>` : `<button class="cbtn" id="pStart" type="button">🩸 Period started</button>`}<button class="chip" id="symBtn" type="button" style="border:0;background:rgba(255,255,255,.6);color:var(--u-green)">📝 Log how I feel</button></div>
    <div class="row" style="margin-top:14px">${st.next ? `<span class="chip" style="background:rgba(255,255,255,.6)">Next period about ${P.parse(st.next).getDate()} ${F.MONTHS[P.parse(st.next).getMonth()].slice(0,3)}</span>` : ''}<span class="chip" style="background:rgba(255,255,255,.6)">Average cycle ${st.avg} days</span><span class="chip" style="background:rgba(255,255,255,.6)">Period ${st.plen} days</span></div></div>`;
  // calendar
  const now = P.parse(date), y = now.getFullYear(), m = now.getMonth(), first = new Date(y, m, 1), startOff = (first.getDay()+6)%7, dim = new Date(y, m+1, 0).getDate();
  const predicted = st.next ? Array.from({length:st.plen},(_,k)=>P.addDays(st.next,k)) : [];
  const ovu = st.next ? P.addDays(st.next, -14) : null, fert = ovu ? Array.from({length:7},(_,k)=>P.addDays(ovu,k-5)) : [];
  let cells = ['M','T','W','T','F','S','S'].map(d=>`<span class="h">${d}</span>`).join('') + '<span></span>'.repeat(startOff);
  for(let d=1; d<=dim; d++){ const ds = P.iso(new Date(y,m,d)); const cls = isPeriodDay(ds) ? 'p' : predicted.includes(ds) ? 'pr' : fert.includes(ds) ? 'fw' : ''; cells += `<span class="c ${cls} ${ds===date?'t':''}">${d}</span>`; }
  html += `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b>${F.MONTHS[m]}</b><span class="note">estimates, not medical advice</span></div><div class="cal" style="margin-top:10px">${cells}</div><p class="note" style="margin:10px 0 0"><span style="color:var(--u-rose)">●</span> period · ○ predicted · <span style="color:var(--u-green)">●</span> fertile window (estimate, not for contraception)</p></div>`;
  // today's symptoms
  const todayS = (symptoms[date] && symptoms[date].list) || [];
  if(todayS.length) html += `<p class="note" style="margin-top:10px">Today: ${todayS.map(esc).join(', ')}</p>`;
  // recent cycles
  const ps = periods.slice().sort((a,b)=>a.start<b.start?1:-1).slice(0,6);
  html += `<h2>Recent cycles</h2><div class="card">${ps.map((p,i) => { const nxt = ps[i-1], len = nxt ? Math.round((P.parse(nxt.start)-P.parse(p.start))/864e5) : null; return `<button type="button" class="item" data-editcycle="${esc(p.id)}" style="grid-template-columns:90px 1fr auto;padding:9px 0;width:100%;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;color:inherit" aria-label="Edit the period that started ${esc(p.start)}"><span class="note" style="font-weight:700;color:var(--ink)">${P.parse(p.start).getDate()} ${F.MONTHS[P.parse(p.start).getMonth()].slice(0,3)}</span><span style="height:10px;border-radius:999px;background:linear-gradient(90deg,var(--u-rose) 0 ${Math.round((p.days||5)/31*100)}%,var(--u-cream) 0)"></span><span class="note">${p.days||5} days${p.assumed?' (assumed)':''} · ${len ? len+'-day cycle' : 'current'} ›</span></button>`; }).join('') || '<p class="empty">No cycles yet.</p>'}</div>`;
  html += `<p class="note" style="margin-top:6px">Tap a cycle to change its dates or length.</p><div class="card" style="margin-top:12px;background:var(--u-cream)"><b>Your patterns</b><p class="note" style="margin:6px 0 0;color:var(--ink)">From your Flo history: cramps and backache in the first couple of days, and tiredness and headaches in the last few days before a period. The app keeps those days a bit gentler when you ask it to.</p></div>
    <p class="note" style="margin-top:12px">🔒 Only you can see this. Predictions are estimates from your past cycles, not medical advice.</p>`;
  if(!periods.length) html += `<div class="card" style="margin-top:12px"><b>Bring in your Flo history?</b><p class="note" style="margin:6px 0 10px;color:var(--ink)">Adds the 6 cycles from your Flo report (June to November 2026), so predictions work straight away.</p><button class="cbtn" id="floGo" type="button">Add my Flo history</button></div>`;
  $('#v-cycle').innerHTML = html;
  const fg = $('#floGo'); if(fg) fg.onclick = async () => { for(const p of P.FLO_HISTORY) await F.put('~move_cycle', {id:'p'+p.start, start:p.start, days:p.days, ended:true, from:'Flo'}); toast('Flo history added 🌸'); };
  const sB = $('#pStart'); if(sB) sB.onclick = () => openSheet('Period started', `<label class="l" for="pd">When did it start?</label><input class="f" id="pd" type="date" value="${date}" max="${date}"><button class="btn wide" id="pOk" type="button" style="margin-top:14px">Save</button>`, body => {
    body.querySelector('#pOk').onclick = async () => { const d = body.querySelector('#pd').value || date; await F.put('~move_cycle', {id:'p'+d, start:d, days:st.plen}); closeSheet(); if(P.monday(d)===thisWeek()) feelingSheet(d); else toast('Saved 🌸'); }; });
  const eB = $('#pEnd'); if(eB) eB.onclick = async () => { const days = Math.round((P.parse(date)-P.parse(open.start))/864e5)+1; await F.patch('~move_cycle', open.id, {days, ended:true, assumed:false}); toast('Saved 🌸'); };
  $('#symBtn').onclick = () => openSheet('How are you feeling today?', `<div class="chips">${SYMPTOMS.map(s=>`<button class="chip" type="button" data-sym="${esc(s)}" aria-pressed="${todayS.includes(s)}">${esc(s)}</button>`).join('')}</div><button class="btn wide" id="symOk" type="button" style="margin-top:16px">Save</button>`, body => {
    body.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed')!=='true')));
    body.querySelector('#symOk').onclick = async () => { const list = [...body.querySelectorAll('[data-sym][aria-pressed="true"]')].map(b=>b.dataset.sym); await F.put('~move_symptoms', {id:date, list}); closeSheet(); toast('Saved 🌸'); }; });
}
// If "Period ended" wasn't tapped, assume it finished after the usual length (from past cycles).
function autoEndPeriods(){
  const st = P.cycleStats(periods.filter(p => p.ended)), usual = st.plen || 5, today = TODAY();
  periods.filter(p => !p.ended && P.addDays(p.start, usual) <= today).forEach(p => {
    p.ended = true; p.days = usual; p.assumed = true;
    F.patch('~move_cycle', p.id, {ended:true, days:usual, assumed:true}).catch(()=>{});
  });
}
function editCycleSheet(id){
  const p = periods.find(x => x.id===id); if(!p) return;
  openSheet('Edit this period', `<label class="l" for="ec-s">Started on</label><input class="f" id="ec-s" type="date" value="${p.start}" max="${TODAY()}">
    <label class="l" for="ec-d">How many days did it last?</label><input class="f" id="ec-d" inputmode="numeric" value="${p.days||5}">
    ${p.assumed ? '<p class="note" style="margin-top:8px">This length was assumed from your usual cycle, because “Period ended” wasn’t tapped.</p>' : ''}
    <div class="stack" style="margin-top:16px"><button class="btn wide" id="ec-ok" type="button">Save</button><button class="btn line wide" id="ec-del" type="button">Delete this period</button></div>`, body => {
    body.querySelector('#ec-ok').onclick = async () => {
      const start = body.querySelector('#ec-s').value || p.start, days = Math.max(1, Math.min(15, +body.querySelector('#ec-d').value || 5));
      if(start !== p.start){ await F.remove('~move_cycle', p.id); await F.put('~move_cycle', {id:'p'+start, start, days, ended:true}); }
      else await F.put('~move_cycle', {id:p.id, start, days, ended:true});
      closeSheet(); toast('Saved 🌸'); };
    body.querySelector('#ec-del').onclick = async () => { if(confirm('Delete this period?')){ await F.remove('~move_cycle', p.id); closeSheet(); toast('Deleted'); } };
  });
}
function feelingSheet(from){
  openSheet('How are you feeling today?', `<p class="muted" style="margin-top:0">Your choice only changes the rest of this week. Next Monday carries on with the next week of your program, with no catch-up.</p>
    <div class="stack">${[['none','💪','Keep going','Stay on your program as normal'],['gentle','🌸','Gentler version','Same program, lighter: fewer sets and no jumping'],['pause','🛋️','Pause this week','Gentle movement sessions replace the rest of this week']].map(([k,e,t,s])=>`<button class="card" type="button" data-mode="${k}" style="border:0;text-align:left;display:flex;gap:12px;align-items:center"><span style="font-size:26px">${e}</span><span><b style="display:block;font-size:16px">${t}</b><span class="note">${s}</span></span></button>`).join('')}</div>`, body => {
    body.onclick = async e => { const b = e.target.closest('[data-mode]'); if(!b) return; const wk = P.monday(from);
      await F.put('~move_periodweek', {id:wk, week:wk, mode:b.dataset.mode, from}); closeSheet(); toast(b.dataset.mode==='none' ? 'Keep going! 💪' : b.dataset.mode==='gentle' ? 'Gentler week set 🌸' : 'This week is paused. Rest well 🛋️'); };
  });
}

/* =====================================================================
   PROGRESS
   ===================================================================== */
function renderProgress(){
  const y = String(new Date().getFullYear()), impDates = (IMP && IMP.dates) || [];
  const allDates = [...logs.filter(l=>l.planKey!=='night').map(l=>l.date), ...impDates];
  const thisYear = allDates.filter(d=>d.startsWith(y)).length;
  // weekly streak
  const weeks = new Set(allDates.map(d=>P.monday(d))); let streak = 0, w = thisWeek(); if(!weeks.has(w)) w = P.addDays(w,-7); while(weeks.has(w)){ streak++; w = P.addDays(w,-7); }
  const runs = [...logs.filter(l=>l.kind==='run'), ...((IMP&&IMP.runs)||[])], longest = Math.max(0, ...runs.map(r=>+r.km||0));
  // last 6 months
  const months = []; const d0 = new Date(); for(let i=5;i>=0;i--){ const d = new Date(d0.getFullYear(), d0.getMonth()-i, 1); months.push(P.iso(d).slice(0,7)); }
  const counts = months.map(m => allDates.filter(d=>d.startsWith(m)).length), max = Math.max(1, ...counts), cols = ['pink','lilac','sky','lime','mint','peach'];
  // personal bests
  const pbs = Object.keys(P.EX).map(id => [id, pb(id)]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const recent = logs.slice().sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,10);
  $('#v-progress').innerHTML = `<h1>Progress 📈</h1><p class="sub">${IMP ? `Includes ${IMP.total} past workouts from your Exercise calendar.` : 'Connect your Exercise calendar in Settings ⚙︎ to bring in your past workouts.'}</p>
    <div class="grid2">${[['pink','Sessions this year',thisYear],['lime','Longest run',longest+' km'],['lilac','Weekly streak',streak+' week'+(streak===1?'':'s')],['sky','All time',allDates.length]].map(([c,a,b])=>`<div class="tint c-${c}"><span class="note" style="color:var(--ink);font-weight:700">${a}</span><p class="big" style="margin:4px 0 0">${b}</p></div>`).join('')}</div>
    <h2>Sessions per month</h2><div class="card"><div class="bars">${months.map((m,i)=>`<div><b style="color:var(--ink)">${counts[i]}</b><i class="c-${cols[i]}" style="height:${Math.max(6,counts[i]/max*100)}px"></i>${F.MONTHS[+m.slice(5)-1].slice(0,3)}</div>`).join('')}</div></div>
    <h2>Personal bests 🎉</h2>${pbs.length ? `<div class="card">${pbs.map(([id,v])=>`<div class="item" style="padding:9px 0"><span class="ic c-pink" style="width:32px;height:32px;font-size:15px">🏋️</span><span><b style="font-size:15px">${esc(P.EX[id].n)}</b></span><b>${v} kg</b></div>`).join('')}</div>` : '<p class="empty">Log your weights in a workout and your bests show up here.</p>'}
    <h2>Recent</h2>${recent.length ? `<div class="card">${recent.map(l=>`<div class="item"><span class="ic ${l.kind==='run'?'c-lime':l.kind==='stretch'?'c-lilac':l.kind==='finisher'?'c-peach':'c-pink'}">${l.kind==='run'?'🏃‍♀️':l.kind==='stretch'?'🌿':l.kind==='finisher'?'🔥':l.manual?'✨':'💪'}</span><span><b>${esc(P.eventTitle(l))}</b><span class="s">${esc(l.date)} · ${l.calId?'📅 in your calendar':l.pendingCal?'waiting for calendar':''}</span></span><button class="btn soft" type="button" data-undo="${l.id}">Remove</button></div>`).join('')}</div>` : '<p class="empty">Nothing logged yet.</p>'}
    ${(S.history||[]).length ? `<h2>Programs finished</h2><div class="card">${S.history.map(h=>{ const p=P.program(h.id); return `<div class="item"><span class="ic c-${p.c}">${p.e}</span><span><b>${esc(p.name)}</b><span class="s">${esc(h.start)} to ${esc(h.end)}</span></span><span></span></div>`; }).join('')}</div>` : ''}`;
}

/* =====================================================================
   SETTINGS + CHALLENGES
   ===================================================================== */
function settingsSheet(){
  const sch = {...P.DEFAULT_SCHEDULE, ...(S.schedule||{})}, t = tok();
  const sel = (k, label) => `<label class="l" for="s-${k}">${label}</label><select class="f" id="s-${k}">${P.DAY_NAMES.map((d,i)=>`<option value="${i}" ${sch[k]===i?'selected':''}>${d}</option>`).join('')}${k==='runOpt'?`<option value="-1" ${sch[k]===-1?'selected':''}>None</option>`:''}</select>`;
  const p = P.program(S.program);
  openSheet('Settings', `<h2 style="margin-top:0">Your week</h2>
    <div class="grid2">${sel('A', 'Session 1 ('+p.days.A.title+')')}${sel('B','Session 2 ('+p.days.B.title+')')}${sel('C','Session 3 ('+p.days.C.title+')')}${sel('run','Key run')}${sel('runOpt','Optional run')}</div>
    <label class="l" id="dsl">Deep stretch days</label><div class="chips" role="group" aria-labelledby="dsl">${P.DAY_NAMES.map((d,i)=>`<button class="chip" type="button" data-deep="${i}" aria-pressed="${(sch.deep||[]).includes(i)}">${d}</button>`).join('')}</div>
    <button class="btn wide" id="schSave" type="button" style="margin-top:14px">Save my week</button>
    <h2>Exercise calendar 📅</h2>
    ${!F.CAL_CLIENT_ID ? '<p class="note">Google isn’t set up yet.</p>' : !t ? `<p class="note">Connect Google so finished workouts go into your Exercise calendar as all-day events.</p><button class="btn" id="gConnect" type="button">Connect Google</button>`
      : `<p class="note">${S.calendarId ? `Adding workouts to <b>${esc(S.calendarName||'your calendar')}</b>.` : 'Choose your Exercise calendar:'}</p><div id="calPick" class="stack"><p class="note">Loading your calendars…</p></div>
         <button class="btn line wide" id="impBtn" type="button" style="margin-top:12px">${IMP ? 'Import past workouts again' : 'Import past workouts from this calendar'}</button>${IMP ? `<p class="note">Last import: ${IMP.total} workouts${IMP.first ? ', back to '+esc(IMP.first) : ''}.</p>` : ''}`}
    <h2>Look and features</h2>
    <div class="chips" role="group" aria-label="Look"><button class="chip" type="button" data-look="light" aria-pressed="${look()==='light'}">🌸 Pastel</button><button class="chip" type="button" data-look="dark" aria-pressed="${look()==='dark'}">🖤 Dark and lime</button></div>
    <div class="chips" style="margin-top:10px"><button class="chip" type="button" id="cycTog" aria-pressed="${cycleOn()}">🌸 Cycle tracking ${cycleOn()?'on':'off'}</button></div>
    <p class="note">Only changes your own app. Cycle data is always private to you.</p>
    <h2>Sound</h2><div class="chips"><button class="chip" type="button" id="vOn" aria-pressed="${voiceOn()}">🔊 Trainer voice ${voiceOn()?'on':'off'}</button></div>
    <p class="note">Plays over your music. On newer iPhones your music should dip for each prompt.</p>
    <details class="card" style="margin-top:10px"><summary style="font-weight:800;cursor:pointer">🎧 Check the trainer voice</summary>
      <p class="note">Tap a phrase to hear it. If any say something different from the words shown, tell Claude which ones.</p>
      <div class="stack" style="gap:6px;margin-top:8px">${Object.keys(VOICE).map((l,i)=>`<button type="button" class="chip" data-vcheck="${i}" style="justify-content:flex-start;text-align:left;border:0">▶ ${esc(l)}</button>`).join('')}</div></details>
    <h2>Account</h2><p class="note">Signed in as ${esc(user.email)}. 🔒 Your workouts and cycle are private to you.</p><button class="btn line" id="out" type="button">Sign out</button>`, async body => {
    body.querySelectorAll('[data-deep]').forEach(b => b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed')!=='true')));
    body.querySelector('#schSave').onclick = async () => { const g = k => +body.querySelector('#s-'+k).value;
      await metaSave({schedule:{A:g('A'),B:g('B'),C:g('C'),run:g('run'),runOpt:g('runOpt'),deep:[...body.querySelectorAll('[data-deep][aria-pressed="true"]')].map(b=>+b.dataset.deep)}}); toast('Your week is saved ✓'); closeSheet(); };
    body.querySelector('#vOn').onclick = e => { local.set('voice', !voiceOn()); e.target.setAttribute('aria-pressed', String(voiceOn())); e.target.textContent = '🔊 Trainer voice '+(voiceOn()?'on':'off'); if(voiceOn()) say('Ready? Let\'s go.'); };
    body.querySelector('#out').onclick = () => F.logOut();
    body.querySelectorAll('[data-vcheck]').forEach(b => b.onclick = () => { const l = Object.keys(VOICE)[+b.dataset.vcheck]; quiet(); const was = voiceOn(); local.set('voice', true); say(l); local.set('voice', was); });
    body.querySelectorAll('[data-look]').forEach(b => b.onclick = async () => { await metaSave({look:b.dataset.look}); settingsSheet(); });
    body.querySelector('#cycTog').onclick = async () => { await metaSave({cycle: !cycleOn()}); settingsSheet(); };
    const gc = body.querySelector('#gConnect'); if(gc) gc.onclick = () => connect(() => settingsSheet());
    const ib = body.querySelector('#impBtn'); if(ib) ib.onclick = () => importHistory(ib);
    const cp = body.querySelector('#calPick');
    if(cp){ try{ const j = await F.gfetch(CALAPI+'/users/me/calendarList?minAccessRole=writer', tok());
        const items = (j.items||[]).sort((a,b) => (/exercise|workout|fitness/i.test(b.summary)?1:0)-(/exercise|workout|fitness/i.test(a.summary)?1:0));
        cp.innerHTML = `<div class="chips">${items.map(c=>`<button class="chip" type="button" data-cal="${esc(c.id)}" data-name="${esc(c.summary)}" aria-pressed="${c.id===S.calendarId}">${c.id===S.calendarId?'✓ ':''}${esc(c.summary)}</button>`).join('')}</div>`;
        cp.onclick = async e => { const b = e.target.closest('[data-cal]'); if(!b) return; await metaSave({calendarId:b.dataset.cal, calendarName:b.dataset.name}); toast('Exercise calendar chosen 📅'); settingsSheet(); syncPending(); };
      }catch(e){ cp.innerHTML = '<p class="note">Couldn’t load your calendars. Tap Connect again.</p>'; } }
  });
}
function challengesSheet(){
  openSheet('Challenges 🏆', `<p class="muted" style="margin-top:0">Sprinkle one in alongside your program.</p><div class="stack">${P.CHALLENGES.map(c => { const on = (S.challenges||{})[c.id]; return `<div class="card"><div class="item" style="padding:0;border:0"><span class="ic c-peach">${c.e}</span><span><b>${esc(c.name)}</b><span class="s">${esc(c.blurb)}</span></span>${on ? '<span class="chip">Running</span>' : `<button class="btn" type="button" data-chjoin="${c.id}">Start</button>`}</div></div>`; }).join('')}</div>`);
}

/* =====================================================================
   START-UP
   ===================================================================== */
$('#signin').onclick = () => F.signIn().catch(() => { $('#gatemsg').textContent = 'Sign-in didn’t work. Please try again.'; });
F.watchUser(u => {
  user = u;
  if(!u){ $('#gate').hidden = false; $('#tabs').hidden = true; VIEWS.forEach(v => $('#v-'+v).hidden = true); return; }
  F.setOwner(u.email); $('#gate').hidden = true; $('#tabs').hidden = false;
  F.listen('~move_meta', rows => { S = rows.find(r=>r.id==='state') || {}; IMP = rows.find(r=>r.id==='import') || null; loaded.meta = 1;
    if(!S.appStart) metaSave({appStart: TODAY()}); render(); }, () => {});
  F.listen('~move_logs', rows => { logs = rows; loaded.logs = 1; render(); }, () => {});
  F.listen('~move_cycle', rows => { periods = rows; loaded.cycle = 1; autoEndPeriods(); render(); }, () => {});
  F.listen('~move_periodweek', rows => { pweeks = {}; rows.forEach(r => pweeks[r.id] = r); render(); }, () => {});
  F.listen('~move_symptoms', rows => { symptoms = {}; rows.forEach(r => symptoms[r.id] = r); }, () => {});
  F.loadStyle(u.email).then(st => { famLook = st==='green' ? 'dark' : 'light'; render(); }).catch(()=>{});
  go(location.hash.slice(1) || 'today');
  setTimeout(() => { if(tok()) syncPending(); }, 2500);
});
