/* =====================================================================
   Move well: muscles.js
   Which muscles each exercise works (main, then supporting), and a simple
   front-and-back body drawing that highlights them.
   ===================================================================== */

export const NAMES = {
  chest:'Chest', shoulders:'Shoulders', reardelts:'Rear shoulders', biceps:'Biceps', triceps:'Triceps', forearms:'Forearms',
  abs:'Abs', obliques:'Obliques', traps:'Upper back', lats:'Lats', lowerback:'Lower back',
  glutes:'Glutes', quads:'Quads', hamstrings:'Hamstrings', adductors:'Inner thighs', calves:'Calves'
};

// [main muscles], [supporting muscles]
export const WORKS = {
  squat:[['quads','glutes'],['adductors','abs']], goblet:[['quads','glutes'],['abs','adductors']],
  sumo:[['adductors','glutes'],['quads']], pulsesumo:[['adductors','glutes'],['quads']],
  split:[['quads','glutes'],['hamstrings']], bulgarian:[['quads','glutes'],['hamstrings']],
  rlunge:[['glutes','quads'],['hamstrings']], wlunge:[['quads','glutes'],['hamstrings','calves']], curtsy:[['glutes','quads'],['adductors']],
  rdl:[['hamstrings','glutes'],['lowerback']], sldl:[['hamstrings','glutes'],['lowerback','abs']], sumodl:[['glutes','adductors'],['hamstrings','quads','lowerback']],
  thrust:[['glutes'],['hamstrings']], bridge:[['glutes'],['hamstrings']], slbridge:[['glutes'],['hamstrings','abs']],
  stepup:[['quads','glutes'],['calves']], calf:[['calves'],[]],
  bandwalk:[['glutes'],[]], clam:[['glutes'],[]], donkey:[['glutes'],['hamstrings']], hydrant:[['glutes'],['obliques']],
  press:[['shoulders','triceps'],['traps']], lateral:[['shoulders'],['traps']], front:[['shoulders'],['chest']],
  row1:[['lats','traps'],['biceps','reardelts']], row:[['lats','traps'],['biceps','reardelts','lowerback']], renegade:[['lats','abs'],['shoulders','triceps']],
  chest:[['chest'],['shoulders','triceps']], fly:[['chest'],['shoulders']],
  pushup:[['chest','triceps'],['shoulders','abs']], kpushup:[['chest','triceps'],['shoulders']],
  curl:[['biceps'],['forearms']], hammer:[['biceps','forearms'],[]],
  kickback:[['triceps'],['reardelts']], dips:[['triceps'],['chest','shoulders']], overhead:[['triceps'],['shoulders']],
  pullapart:[['reardelts','traps'],[]],
  plank:[['abs'],['shoulders','obliques']], sideplank:[['obliques'],['abs','shoulders','glutes']],
  deadbug:[['abs'],['obliques']], birddog:[['lowerback','glutes'],['abs','shoulders']],
  bicycle:[['obliques','abs'],[]], russian:[['obliques'],['abs']], legraise:[['abs'],['obliques']], flutter:[['abs'],['quads']], heeltap:[['obliques'],['abs']],
  climber:[['abs','shoulders'],['quads']], jacks:[['calves','shoulders'],['quads','glutes']], knees:[['quads','abs'],['calves']],
  squatjump:[['quads','glutes'],['calves']], burpee:[['quads','chest'],['shoulders','abs','glutes']], modburpee:[['quads','glutes'],['chest','abs']],
  skater:[['glutes','quads'],['adductors','calves']],
  copenhagen:[['adductors','obliques'],['abs']], slcalf:[['calves'],[]], tibraise:[['calves'],[]], latlunge:[['adductors','glutes'],['quads']], cossack:[['adductors','glutes'],['quads','hamstrings']],
  stepdown:[['quads','glutes'],[]], airplane:[['glutes'],['obliques','hamstrings']], suitcase:[['obliques','forearms'],['traps','abs']], pallof:[['obliques','abs'],['shoulders']],
  bearplank:[['abs','shoulders'],['quads']], hollow:[['abs'],['obliques']], getup:[['shoulders','abs'],['glutes','obliques']], windmill:[['obliques','shoulders'],['hamstrings','glutes']],
  zpress:[['shoulders','triceps'],['abs']], cuban:[['reardelts','shoulders'],[]], frogpump:[['glutes'],['adductors']], sideabd:[['glutes'],[]], bridgemarch:[['glutes','hamstrings'],['abs']],
  kbswing:[['glutes','hamstrings'],['lowerback','shoulders']], kbdeadlift:[['hamstrings','glutes'],['lowerback']], kbgoblet:[['quads','glutes'],['abs']], halo:[['shoulders'],['abs']],
  kbrow:[['lats','traps'],['biceps']], kbpress:[['shoulders','triceps'],['abs']], skip:[['calves'],['shoulders','quads']], bandrow:[['lats','traps'],['biceps']], bandkick:[['glutes'],['hamstrings']], bandsquat:[['quads','glutes'],['adductors']]
};

export function worked(ids){
  const main = new Set(), sup = new Set();
  ids.forEach(id => { const w = WORKS[id]; if(!w) return; w[0].forEach(m=>main.add(m)); w[1].forEach(m=>sup.add(m)); });
  main.forEach(m => sup.delete(m));
  return {main:[...main], sup:[...sup]};
}
export const label = ms => ms.map(m=>NAMES[m]).join(' · ');

/* ---------- Drawing: two figures, 100 × 210 each ---------- */
const E = (cx,cy,rx,ry,rot=0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot?` transform="rotate(${rot} ${cx} ${cy})"`:''}/>`;
const SIL = `<circle cx="50" cy="14" r="10"/><rect x="45" y="22" width="10" height="9" rx="3"/>
  <path d="M30 34 Q50 28 70 34 L72 60 Q70 80 66 96 L34 96 Q30 80 28 60 Z"/>
  <path d="M34 94 L66 94 L64 108 Q50 114 36 108 Z"/>
  ${E(24,58,6,15,8)}${E(76,58,6,15,-8)}${E(20,86,5,14,6)}${E(80,86,5,14,-6)}${E(18,104,4,5)}${E(82,104,4,5)}
  ${E(41,128,9,24)}${E(59,128,9,24)}${E(40,172,6,20)}${E(60,172,6,20)}${E(39,198,6,4)}${E(61,198,6,4)}`;
const FRONT = {
  shoulders: E(31,40,7,7)+E(69,40,7,7),
  chest: `<path d="M36 40 Q43 37 49 40 L49 55 Q42 58 36 54 Z"/><path d="M64 40 Q57 37 51 40 L51 55 Q58 58 64 54 Z"/>`,
  biceps: E(25,60,4.5,10,8)+E(75,60,4.5,10,-8),
  forearms: E(20,86,3.8,11,6)+E(80,86,3.8,11,-6),
  abs: `<rect x="44" y="59" width="12" height="32" rx="4"/>`,
  obliques: E(39,76,3.5,12,-6)+E(61,76,3.5,12,6),
  quads: E(41,128,7,20)+E(59,128,7,20),
  adductors: E(47,118,2.6,12)+E(53,118,2.6,12),
  calves: E(40,170,4,15)+E(60,170,4,15)
};
const BACK = {
  traps: `<path d="M50 30 L62 36 L56 50 L50 56 L44 50 L38 36 Z"/>`,
  shoulders: E(31,40,7,7)+E(69,40,7,7), reardelts: E(31,41,6.5,6.5)+E(69,41,6.5,6.5),
  triceps: E(25,60,4.5,10,8)+E(75,60,4.5,10,-8),
  forearms: E(20,86,3.8,11,6)+E(80,86,3.8,11,-6),
  lats: `<path d="M35 46 Q42 52 48 60 L46 82 Q39 76 35 66 Z"/><path d="M65 46 Q58 52 52 60 L54 82 Q61 76 65 66 Z"/>`,
  lowerback: `<rect x="45" y="72" width="10" height="20" rx="4"/>`,
  glutes: E(43,103,8,9)+E(57,103,8,9),
  hamstrings: E(41,132,6.5,18)+E(59,132,6.5,18),
  calves: E(40,168,5,14)+E(60,168,5,14)
};
function layer(set, ms){ return ms.map(m => set[m] || '').join(''); }
// colours: [body, supporting, main]
export function bodyMap(main=[], sup=[], cols=['#E4E1EE','#AFC0FF','#3A5BF0'], size=150){
  const [base, s, m] = cols;
  const fig = (set, x) => `<g transform="translate(${x} 0)"><g fill="${base}">${SIL}</g><g fill="${s}">${layer(set, sup)}</g><g fill="${m}">${layer(set, main)}</g></g>`;
  const name = main.length ? 'Works: ' + label(main) : 'Muscle map';
  return `<svg viewBox="0 0 210 210" width="${size}" height="${Math.round(size)}" role="img" aria-label="${name}">${fig(FRONT,0)}${fig(BACK,110)}</svg>`;
}
