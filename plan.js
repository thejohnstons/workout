/* =====================================================================
   Move well: plan.js
   Programs, exercises, stretches, finishers, the 10 km running plan,
   challenges and the weekly schedule. Shared with the family dashboard
   (it imports todayPlan so today's workout shows in the To do list).
   All programs are original, written for Thea.
   ===================================================================== */

/* ---------- Exercise library ----------
   n: name, v: the trainer clip line, q: YouTube search, w: uses weights,
   side: done each side, low: low-impact swap (used on gentle days) */
export const EX = {
  squat:{n:'Squats',v:'Squats.',q:'bodyweight squat proper form'},
  goblet:{n:'Goblet squats',v:'Goblet squats.',q:'dumbbell goblet squat form',w:1},
  sumo:{n:'Sumo squats',v:'Sumo squats.',q:'dumbbell sumo squat form',w:1},
  pulsesumo:{n:'Pulse sumo squats',v:'Pulse sumo squats.',q:'pulse sumo squat dumbbell',w:1},
  split:{n:'Split squats',v:'Split squats.',q:'dumbbell split squat form',w:1,side:1},
  bulgarian:{n:'Bulgarian split squats',v:'Bulgarian split squats.',q:'dumbbell bulgarian split squat form',w:1,side:1,low:'split'},
  rlunge:{alt:1,n:'Reverse lunges',v:'Reverse lunges.',q:'dumbbell reverse lunge form',w:1},
  wlunge:{alt:1,n:'Walking lunges',v:'Walking lunges.',q:'dumbbell walking lunges form',w:1},
  curtsy:{n:'Curtsy lunges',v:'Curtsy lunges.',q:'curtsy lunge form',w:1},
  rdl:{n:'Romanian deadlifts',v:'Romanian deadlifts.',q:'dumbbell romanian deadlift form',w:1},
  sumodl:{n:'Sumo deadlifts',v:'Sumo deadlifts.',q:'dumbbell sumo deadlift form',w:1},
  sldl:{n:'Single-leg deadlifts',v:'Single-leg deadlifts.',q:'dumbbell single leg deadlift form',w:1,side:1},
  thrust:{n:'Hip thrusts',v:'Hip thrusts.',q:'dumbbell hip thrust form',w:1},
  bridge:{n:'Glute bridges',v:'Glute bridges.',q:'glute bridge proper form'},
  slbridge:{n:'Single-leg glute bridges',v:'Single-leg glute bridges.',q:'single leg glute bridge form',side:1},
  stepup:{n:'Step-ups',v:'Step-ups.',q:'dumbbell step up form',w:1,side:1},
  calf:{n:'Calf raises',v:'Calf raises.',q:'dumbbell calf raises form',w:1},
  bandwalk:{n:'Band side steps',v:'Band side steps.',q:'resistance band side steps glutes'},
  clam:{n:'Clamshells',v:'Clamshells.',q:'clamshell exercise band form',side:1},
  donkey:{n:'Donkey kicks',v:'Donkey kicks.',q:'donkey kicks glutes form',side:1},
  hydrant:{n:'Fire hydrants',v:'Fire hydrants.',q:'fire hydrant exercise form',side:1},
  press:{n:'Shoulder press',v:'Shoulder press.',q:'dumbbell shoulder press form',w:1},
  lateral:{n:'Lateral raises',v:'Lateral raises.',q:'dumbbell lateral raise form',w:1},
  front:{n:'Front raises',v:'Front raises.',q:'dumbbell front raise form',w:1},
  row1:{n:'Single-arm rows',v:'Single-arm rows.',q:'single arm dumbbell row form',w:1,side:1},
  row:{n:'Bent-over rows',v:'Bent-over rows.',q:'dumbbell bent over row form',w:1},
  renegade:{n:'Renegade rows',v:'Renegade rows.',q:'dumbbell renegade row form',w:1,low:'row1'},
  chest:{n:'Chest press',v:'Chest press.',q:'dumbbell chest press floor form',w:1},
  fly:{n:'Chest flys',v:'Chest flys.',q:'dumbbell chest fly form',w:1},
  pushup:{n:'Push-ups',v:'Push-ups.',q:'push up proper form',low:'kpushup'},
  kpushup:{n:'Kneeling push-ups',v:'Kneeling push-ups.',q:'kneeling push up form'},
  curl:{n:'Bicep curls',v:'Bicep curls.',q:'dumbbell bicep curl form',w:1},
  hammer:{n:'Hammer curls',v:'Hammer curls.',q:'dumbbell hammer curl form',w:1},
  kickback:{n:'Tricep kickbacks',v:'Tricep kickbacks.',q:'dumbbell tricep kickback form',w:1},
  dips:{n:'Tricep dips',v:'Tricep dips.',q:'bench tricep dips form'},
  overhead:{n:'Overhead tricep extension',v:'Overhead tricep extension.',q:'dumbbell overhead tricep extension form',w:1},
  pullapart:{n:'Band pull-aparts',v:'Band pull-aparts.',q:'band pull apart form'},
  plank:{n:'Plank',v:'Plank.',q:'forearm plank proper form'},
  sideplank:{n:'Side plank',v:'Side plank.',q:'side plank form',side:1},
  deadbug:{alt:1,n:'Dead bugs',v:'Dead bugs.',q:'dead bug exercise form'},
  birddog:{alt:1,n:'Bird dogs',v:'Bird dogs.',q:'bird dog exercise form'},
  bicycle:{alt:1,n:'Bicycle crunches',v:'Bicycle crunches.',q:'bicycle crunches form'},
  russian:{alt:1,n:'Russian twists',v:'Russian twists.',q:'russian twist form'},
  legraise:{n:'Leg raises',v:'Leg raises.',q:'lying leg raises form'},
  climber:{alt:1,n:'Mountain climbers',v:'Mountain climbers.',q:'mountain climbers form',low:'deadbug'},
  flutter:{alt:1,n:'Flutter kicks',v:'Flutter kicks.',q:'flutter kicks abs form'},
  heeltap:{alt:1,n:'Heel taps',v:'Heel taps.',q:'heel taps abs exercise'},
  jacks:{n:'Jumping jacks',v:'Jumping jacks.',q:'jumping jacks',low:'squat'},
  knees:{alt:1,n:'High knees',v:'High knees.',q:'high knees exercise',low:'calf'},
  squatjump:{n:'Squat jumps',v:'Squat jumps.',q:'squat jumps form',low:'squat'},
  burpee:{n:'Burpees',v:'Burpees.',q:'burpee proper form',low:'climber'},
  modburpee:{n:'Modified burpees',v:'Modified burpees.',q:'low impact modified burpee',low:'squat'},
  skater:{alt:1,n:'Skaters',v:'Skaters.',q:'skater jumps exercise',low:'curtsy'},
  kbswing:{n:'Kettlebell swings',q:'kettlebell swing proper form',w:1,low:'kbdeadlift'},
  kbdeadlift:{n:'Kettlebell deadlifts',q:'kettlebell deadlift form',w:1},
  kbgoblet:{n:'Kettlebell goblet squats',v:'Goblet squats.',q:'kettlebell goblet squat form',w:1},
  halo:{n:'Kettlebell halos',q:'kettlebell halo exercise',w:1},
  kbrow:{n:'Kettlebell single-arm rows',v:'Single-arm rows.',q:'kettlebell single arm row',w:1,side:1},
  kbpress:{n:'Kettlebell single-arm press',v:'Shoulder press.',q:'kettlebell single arm overhead press',w:1,side:1},
  skip:{n:'Skipping',q:'jump rope basics',low:'knees'},
  bandrow:{n:'Band rows',q:'resistance band row',},
  bandkick:{n:'Banded kickbacks',v:'Donkey kicks.',q:'banded glute kickback',side:1},
  bandsquat:{n:'Banded squats',v:'Squats.',q:'banded squat booty band'}
};
/* What you need for each exercise. Anything not listed: "Dumbbells" if it uses weights, else "Bodyweight". */
export const GEAR = {
  goblet:'One dumbbell', sumo:'One dumbbell', pulsesumo:'One dumbbell', split:'Dumbbells', bulgarian:'Dumbbells + bench',
  rlunge:'Dumbbells', wlunge:'Dumbbells', curtsy:'Dumbbells (or bodyweight)', rdl:'Dumbbells', sumodl:'Dumbbells', sldl:'One or two dumbbells',
  thrust:'Dumbbell + bench', bridge:'Bodyweight', slbridge:'Bodyweight', stepup:'Dumbbells + bench', calf:'Dumbbells',
  bandwalk:'Booty band', clam:'Booty band', donkey:'Bodyweight (booty band to make it harder)', hydrant:'Bodyweight (booty band to make it harder)',
  press:'Dumbbells (seated on the bench or standing)', lateral:'Dumbbells', front:'Dumbbells', row1:'Dumbbell + bench', row:'Dumbbells', renegade:'Dumbbells',
  chest:'Dumbbells + bench (or the floor)', fly:'Dumbbells + bench (or the floor)', pushup:'Bodyweight', kpushup:'Bodyweight', curl:'Dumbbells', hammer:'Dumbbells',
  kickback:'Dumbbells', dips:'Bench', overhead:'One dumbbell', pullapart:'Long band',
  kbswing:'8 kg kettlebell', kbdeadlift:'8 kg kettlebell', kbgoblet:'8 kg kettlebell', halo:'8 kg kettlebell', kbrow:'8 kg kettlebell + bench', kbpress:'8 kg kettlebell',
  skip:'Skipping rope', bandrow:'Long band', bandkick:'Booty band', bandsquat:'Booty band'
};
/* How the reps read on screen: "10 per side", "16 total, alternating (8 per side)", "30 s each side". */
export function repsLabel(id, reps){
  const r = String(reps), ex = EX[id] || {}, m = r.match(/(\d+)(?:\s*-\s*(\d+))?/), num = m ? (m[2] ? `${m[1]}–${m[2]}` : m[1]) : r;
  if(/\d\s*s\b/.test(r)) return /each/.test(r) ? `${num} s each side` : `${num} s`;
  if(/each/.test(r)) return `${num} per side${ex.alt ? ', alternating' : ''}`;
  if(ex.alt){ const half = m && !m[2] ? ` (${Math.round(+m[1]/2)} per side)` : ''; return `${num} total, alternating${half}`; }
  if(ex.side) return `${num} per side`;
  return `${num} reps`;
}
export const gear = id => GEAR[id] || (EX[id] && EX[id].w ? 'Dumbbells' : 'Bodyweight');
export const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

/* ---------- Building blocks ---------- */
const E = (id, sets, reps, rest=60) => ({id, sets, reps, rest});         // one exercise
const SS = (...items) => ({ss:items});                                    // superset, back to back
const WARM = {
  lower:[['squat','30 s'],['bridge','30 s'],['hydrant','20 s each'],['bandwalk','30 s']],
  upper:[['pullapart','30 s'],['kpushup','30 s'],['birddog','30 s'],['deadbug','30 s']],
  full:[['jacks','30 s'],['squat','30 s'],['birddog','30 s'],['deadbug','30 s']],
  core:[['birddog','30 s'],['deadbug','30 s'],['bridge','30 s'],['plank','20 s']]
};

/* ---------- Programs ----------
   Each program has three weekly sessions, matched to her schedule slots A, B and C.
   kind is the area for the calendar event title (Upper Body, Lower Body, Full Body…). */
export const PROGRAMS = [
 {id:'foundations', e:'💪', name:'Strong Foundations', weeks:8, level:'All levels', tag:'Upper, lower and full body',
  blurb:'Your main program. Balanced strength with dumbbells and a band, building a little each week.', c:'pink',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ E('goblet',3,'8-10',75), SS(E('split',3,'8-10 each'),E('rlunge',3,'16')), E('rdl',3,'10',75), SS(E('thrust',3,'8'),E('bridge',3,'10')), E('calf',2,'15',45) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ E('row1',3,'8-10 each',60), E('press',3,'10',60), SS(E('curl',3,'10'),E('hammer',3,'10')), SS(E('chest',3,'10'),E('kickback',3,'12')), E('lateral',2,'12',45) ]},
   C:{title:'Full Body & Core', warm:'full', ex:[ SS(E('goblet',3,'10'),E('press',3,'10')), E('renegade',3,'12-15',60), E('sumodl',3,'10-12',60), SS(E('deadbug',3,'10 each'),E('plank',3,'30 s')), E('russian',2,'20',45) ]}
  }},
 {id:'heavy', e:'🏋️‍♀️', name:'Lift Heavy', weeks:6, level:'Intermediate', tag:'Heavier weights, fewer reps',
  blurb:'Fewer reps with heavier dumbbells and longer rests. Strength over sweat.', c:'lilac',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ E('goblet',4,'6-8',120), E('rdl',4,'6-8',120), E('bulgarian',3,'6-8 each',90), E('thrust',3,'8',90), E('calf',3,'12',60) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ E('row',4,'6-8',120), E('press',4,'6-8',120), E('chest',3,'8',90), E('row1',3,'8 each',90), SS(E('curl',3,'8'),E('overhead',3,'10')) ]},
   C:{title:'Full Body', warm:'full', ex:[ E('sumodl',4,'6-8',120), E('split',3,'8 each',90), E('chest',3,'8',90), E('row',3,'8',90), E('plank',3,'40 s',45) ]}
  }},
 {id:'core', e:'🔥', name:'Core Intensive', weeks:5, level:'All levels', tag:'Core and Pilates-style',
  blurb:'Strength sessions with extra core work and slow, controlled Pilates-style moves.', c:'sky',
  days:{
   A:{title:'Lower Body & Core', warm:'core', ex:[ E('goblet',3,'10',60), E('rdl',3,'10',60), SS(E('bridge',3,'12'),E('deadbug',3,'10 each')), SS(E('legraise',3,'12'),E('heeltap',3,'20')), E('sideplank',2,'25 s each',30) ]},
   B:{title:'Upper Body & Core', warm:'core', ex:[ E('row1',3,'10 each',60), E('press',3,'10',60), SS(E('kpushup',3,'10'),E('birddog',3,'10 each')), SS(E('russian',3,'20'),E('flutter',3,'30 s')), E('plank',3,'40 s',30) ]},
   C:{title:'Full Body & Core', warm:'core', ex:[ SS(E('sumo',3,'12'),E('lateral',3,'12')), E('renegade',3,'10',60), SS(E('bicycle',3,'20'),E('legraise',3,'12')), SS(E('deadbug',3,'10 each'),E('sideplank',3,'20 s each')), E('plank',2,'45 s',30) ]}
  }},
 {id:'runstrong', e:'🦵', name:'Run Strong', weeks:4, level:'All levels', tag:'Knee-friendly strength',
  blurb:'Glutes, hips and quads to support your knees on the way to 10 km. Pairs well with the running plan.', c:'lime',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ E('stepup',3,'10 each',60), E('split',3,'10 each',60), SS(E('slbridge',3,'10 each'),E('clam',3,'15 each')), E('sldl',3,'8 each',60), E('calf',3,'15',45) ]},
   B:{title:'Upper Body & Core', warm:'upper', ex:[ E('row1',3,'10 each',60), E('press',3,'10',60), SS(E('chest',3,'10'),E('pullapart',3,'15')), SS(E('deadbug',3,'10 each'),E('sideplank',3,'25 s each')), E('birddog',2,'10 each',30) ]},
   C:{title:'Lower Body & Core', warm:'lower', ex:[ E('goblet',3,'10',60), SS(E('bandwalk',3,'12 each'),E('hydrant',3,'12 each')), E('rdl',3,'10',60), SS(E('slbridge',3,'10 each'),E('plank',3,'30 s')), E('calf',2,'20',45) ]}
  }},
 {id:'sculpt', e:'🌸', name:'Low Impact Sculpt', weeks:6, level:'All levels', tag:'No jumping',
  blurb:'Kind to joints and tired mornings, still building strength and tone.', c:'mint',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ SS(E('sumo',3,'12'),E('pulsesumo',3,'15')), E('rlunge',3,'12 each',45), SS(E('bridge',3,'15'),E('clam',3,'15 each')), E('donkey',3,'12 each',30), E('calf',2,'20',30) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ SS(E('curl',3,'12'),E('kickback',3,'12')), SS(E('lateral',3,'12'),E('front',3,'10')), E('row1',3,'12 each',45), E('kpushup',3,'10',45), E('pullapart',2,'15',30) ]},
   C:{title:'Full Body', warm:'full', ex:[ SS(E('goblet',3,'12'),E('press',3,'10')), SS(E('curtsy',3,'10 each'),E('lateral',3,'12')), E('sumodl',3,'12',45), SS(E('birddog',3,'10 each'),E('deadbug',3,'10 each')), E('sideplank',2,'20 s each',30) ]}
  }},
 {id:'express', e:'⏱️', name:'Express 20', weeks:4, level:'All levels', tag:'20-minute sessions',
  blurb:'For busy or sick-kid weeks. Short supersets, little rest, done in about 20 minutes.', c:'peach',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ SS(E('goblet',3,'12'),E('rlunge',3,'12')), SS(E('rdl',3,'12'),E('bridge',3,'15')), E('calf',2,'20',30) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ SS(E('row1',3,'10 each'),E('press',3,'10')), SS(E('curl',3,'12'),E('kickback',3,'12')), E('kpushup',2,'10',30) ]},
   C:{title:'Full Body', warm:'full', ex:[ SS(E('sumo',3,'12'),E('lateral',3,'12')), SS(E('renegade',3,'10'),E('deadbug',3,'10 each')), E('plank',2,'40 s',30) ]}
  }},
 {id:'glutes', e:'🍑', name:'Glute Focus', weeks:6, level:'Intermediate', tag:'Glute-focused strength', isNew:1,
  blurb:'Two lower days built around hip thrusts, RDLs and split squats, plus one upper day.', c:'pink',
  days:{
   A:{title:'Glutes & Hamstrings', warm:'lower', ex:[ E('thrust',4,'8-10',90), E('rdl',3,'10',75), SS(E('bulgarian',3,'8 each'),E('bandwalk',3,'12 each')), E('sldl',3,'8 each',60), SS(E('slbridge',2,'12 each'),E('clam',2,'15 each')) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ E('row',3,'10',60), E('press',3,'10',60), SS(E('row1',3,'10 each'),E('chest',3,'10')), SS(E('lateral',3,'12'),E('curl',3,'12')), E('plank',2,'40 s',30) ]},
   C:{title:'Glutes & Quads', warm:'lower', ex:[ E('goblet',4,'8-10',90), E('stepup',3,'10 each',60), SS(E('sumo',3,'12'),E('pulsesumo',3,'15')), SS(E('thrust',3,'12'),E('donkey',3,'12 each')), E('hydrant',2,'15 each',30) ]}
  }},
 {id:'pilates', e:'🧘‍♀️', name:'Pilates Strength', weeks:6, level:'All levels', tag:'Mat Pilates with light weights', isNew:1,
  blurb:'Slow, controlled mat work for a strong core and good posture, with light dumbbells.', c:'lilac',
  days:{
   A:{title:'Pilates Lower', warm:'core', ex:[ SS(E('bridge',3,'15'),E('slbridge',3,'10 each')), SS(E('clam',3,'15 each'),E('hydrant',3,'12 each')), SS(E('donkey',3,'12 each'),E('birddog',3,'10 each')), E('sideplank',2,'25 s each',30) ]},
   B:{title:'Pilates Upper & Core', warm:'core', ex:[ SS(E('lateral',3,'12'),E('front',3,'12')), SS(E('pullapart',3,'15'),E('kpushup',3,'10')), SS(E('deadbug',3,'10 each'),E('heeltap',3,'20')), E('plank',3,'40 s',30) ]},
   C:{title:'Pilates Full Body', warm:'core', ex:[ SS(E('curtsy',3,'10 each'),E('curl',3,'12')), SS(E('legraise',3,'12'),E('flutter',3,'30 s')), SS(E('russian',3,'20'),E('bicycle',3,'20')), SS(E('birddog',2,'10 each'),E('sideplank',2,'20 s each')) ]}
  }},
 {id:'barre', e:'🩰', name:'Barre Sculpt', weeks:4, level:'All levels', tag:'Small pulses, big burn', isNew:1,
  blurb:'Barre-inspired: higher reps, small pulses and holds. Use a chair or bench for balance.', c:'sky',
  days:{
   A:{title:'Barre Lower', warm:'lower', ex:[ SS(E('pulsesumo',3,'20'),E('calf',3,'20')), SS(E('curtsy',3,'12 each'),E('donkey',3,'15 each')), SS(E('hydrant',3,'15 each'),E('bridge',3,'20')), E('clam',2,'20 each',20) ]},
   B:{title:'Barre Upper', warm:'upper', ex:[ SS(E('lateral',3,'15'),E('front',3,'15')), SS(E('curl',3,'15'),E('kickback',3,'15')), SS(E('pullapart',3,'20'),E('overhead',3,'15')), E('kpushup',2,'12',30) ]},
   C:{title:'Barre Full Body', warm:'full', ex:[ SS(E('sumo',3,'15'),E('press',3,'12')), SS(E('rlunge',3,'12 each'),E('lateral',3,'15')), SS(E('slbridge',3,'12 each'),E('heeltap',3,'20')), E('plank',2,'45 s',30) ]}
  }},
 {id:'functional', e:'⚡', name:'Functional Fit', weeks:4, level:'Intermediate', tag:'Strength plus conditioning', isNew:1,
  blurb:'Compound lifts mixed with short bursts of cardio for fitness and power.', c:'lime',
  days:{
   A:{title:'Lower Body & Conditioning', warm:'full', ex:[ E('goblet',3,'10',60), SS(E('wlunge',3,'12 each'),E('squatjump',3,'10')), E('rdl',3,'10',60), SS(E('skater',3,'30 s'),E('climber',3,'30 s')) ]},
   B:{title:'Upper Body & Conditioning', warm:'upper', ex:[ SS(E('renegade',3,'10'),E('pushup',3,'10')), SS(E('press',3,'10'),E('row',3,'10')), SS(E('modburpee',3,'10'),E('knees',3,'30 s')), E('plank',2,'45 s',30) ]},
   C:{title:'Full Body', warm:'full', ex:[ SS(E('sumodl',3,'12'),E('press',3,'10')), SS(E('stepup',3,'10 each'),E('jacks',3,'30 s')), SS(E('row1',3,'10 each'),E('bicycle',3,'20')), SS(E('burpee',2,'8'),E('climber',2,'30 s')) ]}
  }},
 {id:'reset', e:'🌿', name:'One-Week Reset', weeks:1, level:'All levels', tag:'A short fresh start', isNew:1,
  blurb:'One gentle week to get back into a rhythm after a break, holiday or busy season.', c:'mint',
  days:{
   A:{title:'Lower Body', warm:'lower', ex:[ E('squat',3,'12',45), E('rlunge',2,'10 each',45), E('bridge',3,'15',30), E('clam',2,'12 each',30) ]},
   B:{title:'Upper Body', warm:'upper', ex:[ E('row1',3,'10 each',45), E('press',2,'10',45), E('kpushup',2,'8',45), E('pullapart',2,'15',30) ]},
   C:{title:'Full Body & Core', warm:'core', ex:[ E('goblet',3,'10',45), E('lateral',2,'12',45), E('deadbug',2,'10 each',30), E('plank',2,'30 s',30) ]}
  }}
];
export const program = id => PROGRAMS.find(p=>p.id===id) || PROGRAMS[0];

/* ---------- Variety ----------
   Each program rotates through 4 different weeks, then repeats with a step up (round 2,
   round 3…). Exercises swap for others that train the same muscles, so no two weeks in a
   cycle are copies, while key lifts come back often enough to see progress. */
export const ALT = {
  goblet:['goblet','kbgoblet','sumo','bandsquat'], sumo:['sumo','pulsesumo','kbgoblet','goblet'], pulsesumo:['pulsesumo','sumo','bandsquat','goblet'],
  squat:['squat','bandsquat','kbgoblet','sumo'], split:['split','rlunge','bulgarian','stepup'], bulgarian:['bulgarian','split','stepup','wlunge'],
  rlunge:['rlunge','curtsy','split','wlunge'], wlunge:['wlunge','rlunge','curtsy','stepup'], curtsy:['curtsy','rlunge','skater','split'], stepup:['stepup','bulgarian','split','rlunge'],
  rdl:['rdl','kbdeadlift','sldl','sumodl'], sldl:['sldl','rdl','kbdeadlift','sumodl'], sumodl:['sumodl','kbdeadlift','rdl','kbswing'], kbswing:['kbswing','sumodl','kbdeadlift','rdl'],
  thrust:['thrust','slbridge','bridge','bandkick'], bridge:['bridge','slbridge','thrust','bandkick'], slbridge:['slbridge','bridge','bandkick','thrust'],
  calf:['calf','skip','calf','knees'], bandwalk:['bandwalk','clam','hydrant','bandkick'], clam:['clam','bandwalk','hydrant','bandkick'],
  donkey:['donkey','bandkick','hydrant','clam'], hydrant:['hydrant','donkey','clam','bandwalk'],
  press:['press','kbpress','front','lateral'], lateral:['lateral','front','halo','press'], front:['front','lateral','halo','press'],
  row1:['row1','kbrow','row','bandrow'], row:['row','row1','bandrow','kbrow'], renegade:['renegade','row1','kbrow','row'], bandrow:['bandrow','row','row1','pullapart'],
  chest:['chest','pushup','fly','kpushup'], fly:['fly','chest','kpushup','pushup'], pushup:['pushup','kpushup','chest','fly'], kpushup:['kpushup','pushup','chest','fly'],
  curl:['curl','hammer','curl','hammer'], hammer:['hammer','curl','hammer','curl'], kickback:['kickback','overhead','dips','kickback'], overhead:['overhead','kickback','dips','overhead'], dips:['dips','kickback','overhead','dips'],
  pullapart:['pullapart','bandrow','halo','pullapart'],
  plank:['plank','sideplank','climber','deadbug'], sideplank:['sideplank','plank','russian','heeltap'], deadbug:['deadbug','birddog','legraise','heeltap'], birddog:['birddog','deadbug','plank','bridge'],
  bicycle:['bicycle','russian','heeltap','flutter'], russian:['russian','bicycle','halo','heeltap'], legraise:['legraise','flutter','deadbug','heeltap'], flutter:['flutter','legraise','bicycle','climber'], heeltap:['heeltap','bicycle','russian','deadbug'],
  climber:['climber','skip','knees','jacks'], jacks:['jacks','skip','knees','climber'], knees:['knees','skip','jacks','climber'], squatjump:['squatjump','kbswing','skater','jacks'],
  burpee:['burpee','modburpee','kbswing','climber'], modburpee:['modburpee','squatjump','kbswing','climber'], skater:['skater','curtsy','squatjump','skip']
};
const shift = (r, dLow, dHigh, dOne, dSecs, floor=5) => {
  r = String(r);
  if(/\d\s*s\b/.test(r)) return r.replace(/(\d+)\s*s/, (m,a) => `${Math.max(15, +a + dSecs)} s`);
  if(/\d+\s*-\s*\d+/.test(r)) return r.replace(/(\d+)\s*-\s*(\d+)/, (m,a,b) => `${Math.max(floor,+a+dLow)}-${Math.max(floor+1,+b+dHigh)}`);
  return r.replace(/^(\d+)/, (m,a) => String(Math.max(floor+1, +a + dOne)));
};
export const WEEK_STYLES = [
  {name:'Foundation week', note:'Steady reps with control.', sets:0, reps:r => r},
  {name:'Strength week', note:'A little heavier, fewer reps, longer rests.', sets:1, reps:r => shift(r,-2,-2,-2,0), rest:1.3},
  {name:'Tempo week', note:'Lower slowly for 3 seconds on every rep.', sets:0, reps:r => r, tempo:true},
  {name:'Pump week', note:'Lighter weights, more reps, shorter rests.', sets:0, reps:r => shift(r,2,3,3,10), rest:0.7}
];
const CARDIO = new Set(['skip','knees','jacks','climber']);
const TIMED_OK = new Set(['plank','sideplank','climber','skip','knees','jacks','skater','flutter']);
// Make the reps suit the exercise that was swapped in.
function fitReps(id, reps, w){
  const ex = EX[id] || {}; let r = String(reps); const timed = /\d\s*s\b/.test(r);
  if(CARDIO.has(id)) return timed ? r.replace(/\s*each.*$/,'') : (w === 3 ? '40 s' : '30 s');
  if(timed && !TIMED_OK.has(id)) return ex.side && !ex.alt ? '12 each' : ex.alt ? '16' : '12';
  if(timed){ r = r.replace(/\s*each.*$/,''); if(id==='sideplank') r += ' each'; if(id==='plank') r = r.replace(/(\d+)/, (m,a)=>String(Math.max(30,+a))); return r; }
  if(/each/.test(r) && !ex.side && !ex.alt) return r.replace(/\s*each.*$/,'');
  return r;
}
function pick(id, w, used){
  const alts = ALT[id] || [id];
  for(let k=0; k<alts.length; k++){ const c = alts[(w + k) % alts.length]; if(!used.has(c)){ used.add(c); return c; } }
  used.add(id); return id;
}
/* The session for a given program week: week 1 is the program as written; weeks 2–4 swap
   in alternatives and change the style; from week 5 the cycle repeats with an extra set. */
export function sessionFor(base, week){
  const w = ((week-1) % 4 + 4) % 4, round = Math.floor((week-1) / 4) + 1, style = WEEK_STYLES[w], used = new Set();
  const conv = it => { const id = w === 0 ? it.id : pick(it.id, w, used); if(w === 0) used.add(it.id);
    const sets = Math.min(5, it.sets + style.sets + (round > 1 ? 1 : 0));
    const reps = fitReps(id, style.reps(String(it.reps)), w);
    return {...it, id, sets, reps, rest: Math.round((it.rest||60) * (style.rest||1) / 5) * 5}; };
  const ex = base.ex.map(b => b.ss ? {ss: b.ss.map(conv)} : conv(b));
  return {...base, ex, week, round, style: style.name, styleNote: style.note + (round > 1 ? ` Round ${round}: one extra set to step it up.` : ''), tempo: !!style.tempo};
}

// A gentler period-week session, used when she chooses "Pause this week"
export const PERIOD_SESSION = {title:'Gentle Movement', warm:'core', gentle:true, ex:[
  E('bridge',2,'12',30), E('birddog',2,'8 each',30), E('clam',2,'12 each',30), E('deadbug',2,'8 each',30), E('sideplank',2,'15 s each',30) ]};

/* ---------- Finishers: timed intervals ---------- */
export const FINISHERS = [
  {id:'abs', e:'🔥', name:'Abs Burner', mins:[10,15], on:40, off:20, moves:['bicycle','legraise','plank','russian','heeltap','flutter','deadbug'], c:'pink'},
  {id:'glutes', e:'🍑', name:'Glute Finisher', mins:[10], on:40, off:20, moves:['donkey','hydrant','bridge','clam','bandwalk','slbridge'], c:'lilac'},
  {id:'arms', e:'💪', name:'Arms & Shoulders', mins:[10], on:40, off:20, moves:['curl','lateral','kickback','press','halo','hammer','front','bandrow'], c:'sky'},
  {id:'hiit', e:'⚡', name:'Quick HIIT', mins:[5,10], on:30, off:15, moves:['skip','kbswing','jacks','squatjump','climber','knees','skater','modburpee'], c:'lime', jumpy:1},
  {id:'mobility', e:'🧘‍♀️', name:'Core & Mobility', mins:[10], on:45, off:15, moves:['birddog','deadbug','sideplank','bridge','plank'], c:'mint'}
];
export const FINISHER_CLIP = {abs:"Let's do your abs burner.", glutes:"Let's do your glute finisher.", arms:"Let's do your arms and shoulders finisher.", hiit:"Let's do a quick HIIT finisher.", mobility:"Let's do your core and mobility finisher."};
// Builds the timed list for a finisher of a given length (each side counts as one interval)
export function finisherIntervals(f, mins){
  const out = []; let t = 0, i = 0; const total = mins*60;
  while(t + f.on <= total){ out.push({id:f.moves[i % f.moves.length], secs:f.on, rest:f.off}); t += f.on + f.off; i++; }
  return out;
}

/* ---------- Stretches ---------- */
export const STRETCH = {
  child:{n:'Child’s pose',q:'childs pose stretch'}, catcow:{n:'Cat-cow',q:'cat cow stretch'}, fig4:{n:'Figure-four stretch',q:'lying figure four stretch',side:1},
  ham:{n:'Lying hamstring stretch',q:'lying hamstring stretch strap',side:1}, twist:{n:'Lying spinal twist',q:'supine spinal twist stretch',side:1},
  wall:{n:'Legs up the wall',q:'legs up the wall pose'}, lowlunge:{n:'Low lunge (hip flexor)',q:'low lunge hip flexor stretch',side:1},
  pigeon:{n:'Pigeon pose',q:'pigeon pose beginner',side:1}, butterfly:{n:'Butterfly stretch',q:'butterfly stretch',},
  fold:{n:'Forward fold',q:'standing forward fold stretch'}, quad:{n:'Standing quad stretch',q:'standing quad stretch',side:1},
  calfs:{n:'Calf stretch',q:'calf stretch wall',side:1}, thread:{n:'Thread the needle',q:'thread the needle stretch',side:1},
  chestst:{n:'Doorway chest stretch',q:'doorway chest stretch'}, neck:{n:'Gentle neck stretch',q:'gentle neck stretch',side:1},
  dog:{n:'Downward dog',q:'downward dog beginner'},
  rollquad:{n:'Foam roll: quads',q:'foam roll quads'}, rollglute:{n:'Foam roll: glutes',q:'foam roll glutes',side:1}, rollback:{n:'Foam roll: upper back',q:'foam roll upper back'},
  rollcalf:{n:'Foam roll: calves',q:'foam roll calves',side:1}, rollit:{n:'Foam roll: outer thighs',q:'foam roll IT band gently',side:1}, neckcloud:{n:'Neck cloud rest',q:'neck cloud cervical traction pillow how to use'}, happy:{n:'Happy baby',q:'happy baby pose'}, sidebend:{n:'Seated side bend',q:'seated side bend stretch',side:1},
  frog:{n:'Frog stretch',q:'frog stretch hips'}, sphinx:{n:'Sphinx pose',q:'sphinx pose stretch'}
};
export const ROUTINES = {
  night:{name:'10-minute wind-down', e:'🌙', mins:10, list:[['child',60],['catcow',45],['fig4',40],['ham',40],['twist',40],['happy',40],['neckcloud',120]]},
  roll:{name:'Foam roller reset', e:'🧽', mins:7, list:[['rollquad',60],['rollglute',45],['rollit',30],['rollcalf',40],['rollback',60]]},
  deep:{name:'Deep full-body stretch', e:'🌿', mins:25, list:[['catcow',60],['child',60],['thread',45],['dog',60],['lowlunge',60],['pigeon',75],['quad',40],['calfs',40],['fold',60],['butterfly',60],['frog',60],['sphinx',60],['ham',50],['fig4',50],['twist',50],['chestst',45],['neck',30],['sidebend',40],['wall',90]]},
  post:{name:'5-minute post-run', e:'🏃‍♀️', mins:5, list:[['quad',40],['calfs',40],['lowlunge',40],['ham',35],['fig4',35]]}
};
/* Warm-ups and cool-downs change every workout: each is picked from a pool using the
   date and session, so the same mix rarely comes round twice in a row. */
export const WARM_POOL = {
  lower:['squat','bridge','hydrant','bandwalk','clam','donkey','birddog','bandsquat'],
  upper:['pullapart','kpushup','birddog','deadbug','bandrow','plank','halo','climber'],
  full:['jacks','squat','birddog','deadbug','skip','knees','bridge','climber'],
  core:['birddog','deadbug','bridge','plank','heeltap','sideplank','flutter']
};
export const COOL_POOL = {
  lower:['quad','ham','fig4','lowlunge','pigeon','butterfly','frog','calfs','fold','twist'],
  upper:['chestst','thread','neck','catcow','sidebend','sphinx','dog','twist','child'],
  full:['ham','quad','chestst','fig4','thread','lowlunge','fold','catcow','dog','sidebend'],
  core:['sphinx','twist','catcow','sidebend','butterfly','dog','frog']
};
const COOL_FINAL = ['child','happy','butterfly','twist','child','sphinx'];
const COOL_SECS = {neck:30, child:45, happy:40, sphinx:40};
// A repeatable shuffle: the same seed always gives the same order, a new seed a new order.
function shuffled(pool, seed){
  let x = (seed * 2654435761) >>> 0; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const a = pool.slice(); for(let i=a.length-1; i>0; i--){ const j = Math.floor(rnd()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
// Pick n from the pool, preferring ones not used last time.
function rotatePick(pool, n, seed, prevSeed){
  const last = prevSeed === undefined ? [] : shuffled(pool, prevSeed).slice(0, n);
  const order = shuffled(pool, seed), fresh = order.filter(id => !last.includes(id)), old = order.filter(id => last.includes(id));
  return [...fresh, ...old].slice(0, n);
}
export const daySeed = (date, slot) => Math.floor(parse(date).getTime()/864e5) * 3 + ({A:0,B:1,C:2}[slot] || 0);
export function warmFor(type, seed){ return rotatePick(WARM_POOL[type] || WARM_POOL.full, 4, seed + 101, seed - 3 + 101).map(id => [id, 30]); }
export function coolFor(type, seed){
  const main = rotatePick(COOL_POOL[type] || COOL_POOL.full, 4, seed + 7, seed - 3 + 7);
  let fin = shuffled(COOL_FINAL, seed + 13)[0]; if(main.includes(fin)) fin = COOL_FINAL.find(f => !main.includes(f)) || 'child';
  return [...main, fin].map(id => [id, COOL_SECS[id] || (STRETCH[id] && STRETCH[id].side ? 35 : 40)]);
}
export function routineSecs(r){ return r.list.reduce((a,[id,s])=>a + s*(STRETCH[id].side ? 2 : 1), 0); }

/* ---------- 10 km running plan: one key run a week, plus an optional easy run ---------- */
export const RUN_PLAN = [4.0,4.5,5.0,4.5,5.5,6.0,6.5,5.5,7.0,7.5,8.0,7.0,9.0,10.0];
export const RUN_NOTES = {3:'Step-back week: a little shorter so your body can catch up.',7:'Step-back week.',11:'Step-back week.',13:'Race week! Your 10 km. 🎉'};

/* ---------- Challenges ---------- */
export const CHALLENGES = [
  {id:'plank30', e:'🧱', name:'30-day plank', days:30, target:d=>`${Math.min(20+d*4,140)} seconds`, blurb:'A plank a day, a little longer each day.'},
  {id:'squat7', e:'🍑', name:'7-day squat challenge', days:7, target:d=>`${50+d*8} squats (spread through the day)`, blurb:'Squats across the day, building to 100.'},
  {id:'stretch14', e:'🌿', name:'14-day stretch streak', days:14, target:()=>'Your 10-minute wind-down', blurb:'Stretch every night for two weeks.'},
  {id:'move30', e:'✨', name:'Move every day for 30 days', days:30, target:()=>'Any movement: workout, walk, stretch', blurb:'Small and consistent beats big and rare.'},
  {id:'run50', e:'🏃‍♀️', name:'50 km this month', days:0, km:50, target:()=>'Log your runs and walks', blurb:'Add up your runs over the month.'}
];

/* ---------- Dates (weeks run Monday to Sunday) ---------- */
const pad = n => String(n).padStart(2,'0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate()+n); return iso(d); };
export const monday = s => { const d = parse(s); const k = (d.getDay()+6)%7; d.setDate(d.getDate()-k); return iso(d); };
export const dow = s => (parse(s).getDay()+6)%7; // 0 = Monday
export const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* ---------- Default schedule ---------- */
export const DEFAULT_SCHEDULE = {A:0, B:2, C:4, run:5, runOpt:1, deep:[3,6]}; // Mon lower, Wed upper, Fri full, Sat key run, Tue optional run, deep stretch Thu + Sun

export function programWeek(state, date){
  if(!state || !state.programStart) return 1;
  return Math.floor((parse(monday(date)) - parse(monday(state.programStart))) / 6048e5) + 1;
}
export function runWeek(state, date){
  if(!state || !state.runStart) return 1;
  return Math.max(1, Math.floor((parse(monday(date)) - parse(monday(state.runStart))) / 6048e5) + 1);
}

/* What's planned on a date: a list of {key, kind, title, session?} */
export function planFor(state, date, opts={}){
  const s = {...DEFAULT_SCHEDULE, ...((state && state.schedule) || {})};
  const d = dow(date), out = [], p = program(state && state.program);
  const wk = programWeek(state, date), inProgram = state && state.program && wk >= 1 && wk <= p.weeks;
  const pw = opts.periodWeek && opts.periodWeek.week === monday(date) ? opts.periodWeek : null;
  ['A','B','C'].forEach(slot => {
    if(s[slot] !== d || !inProgram) return;
    const pausedFrom = pw && pw.mode==='pause' && date >= pw.from;
    if(pausedFrom) out.push({key:'str-'+slot, kind:'strength', slot, title:PERIOD_SESSION.title, session:PERIOD_SESSION, period:true});
    else out.push({key:'str-'+slot, kind:'strength', slot, title:p.days[slot].title, session:sessionFor(p.days[slot], wk), gentle: !!(pw && pw.mode==='gentle' && date >= pw.from), program:p.id, week:wk});
  });
  if(state && state.runStart && s.run === d){ const rw = runWeek(state, date); if(rw <= RUN_PLAN.length) out.push({key:'run', kind:'run', title:'Run', km:RUN_PLAN[rw-1], week:rw}); }
  if(state && state.runStart && s.runOpt === d) out.push({key:'runopt', kind:'run', optional:true, title:'Easy run (optional)', km:3});
  if((s.deep||[]).includes(d)) out.push({key:'deep', kind:'stretch', routine:'deep', title:'Deep Stretch'});
  out.push({key:'night', kind:'stretch', routine:'night', title:'Stretch', night:true});
  return out;
}

/* For the dashboard: the main thing planned today and whether it's done */
export function todayPlan(state, logs, date){
  const items = planFor(state, date).filter(x=>!x.optional && !x.night);
  return items.map(x => ({...x, done: (logs||[]).some(l => l.date===date && l.planKey===x.key)}));
}

/* ---------- Progressive overload ---------- */
export function topReps(reps){ const m = String(reps).match(/(\d+)\s*(?:-\s*(\d+))?/); return m ? +(m[2]||m[1]) : 10; }
export function nextStep(last, reps, gentle){
  // last: [{w, r}] from the most recent session of this exercise
  if(!last || !last.length) return null;
  const w = Math.max(...last.map(s=>+s.w||0)), top = topReps(reps);
  if(gentle) return {w, msg:'Keep the weight the same today. Listen to your body.', clip:'Keep the weight the same today. Focus on good form.'};
  if(String(reps).includes('s')) return null; // timed holds
  const all = last.length && last.every(s => (+s.r||0) >= top);
  if(all && w > 0){ const inc = w < 6 ? 1 : 2; return {w:w+inc, msg:`You hit ${top} on every set last time. Try ${w+inc} kg today 💪`, clip:'Try going up a little in weight today.', up:1}; }
  return {w, msg: w ? `Same weight (${w} kg), try for one more rep.` : 'Try for one more rep than last time.', clip:'Same weight, see if you can get one more rep.'};
}

/* ---------- Calendar event title, in her style ---------- */
export function eventTitle(log){
  if(log.kind==='run') return `Run - ${Math.round(log.mins||0)} min${log.km ? ` (${(+log.km).toString()} km)` : ''}`;
  return log.title;
}

/* ---------- Reading her old calendar events ---------- */
export function classify(summary){
  const s = String(summary||'').toLowerCase();
  const run = s.match(/run[^\d]*(\d+)\s*min(?:[^\d]*([\d.]+)\s*k)?/);
  if(/\brun/.test(s)) return {type:'run', mins: run ? +run[1] : null, km: run && run[2] ? +run[2] : null};
  if(/stretch|yoga|mobility/.test(s)) return {type:'stretch'};
  if(/upper/.test(s)) return {type:'upper'};
  if(/lower|leg|glute/.test(s)) return {type:'lower'};
  if(/full/.test(s)) return {type:'full'};
  if(/core|abs|pilates|barre/.test(s)) return {type:'core'};
  if(/walk|hike/.test(s)) return {type:'walk'};
  if(/hiit|cardio|boxing|spin/.test(s)) return {type:'cardio'};
  return {type:'other'};
}

/* ---------- Cycle ---------- */
export const FLO_HISTORY = [
  {start:'2026-06-13', days:7}, {start:'2026-07-13', days:5}, {start:'2026-08-13', days:5},
  {start:'2026-09-12', days:5}, {start:'2026-10-09', days:5}, {start:'2026-11-07', days:5}
];
export function cycleStats(periods){
  const ps = periods.slice().sort((a,b)=>a.start<b.start?-1:1);
  const gaps = []; for(let i=1;i<ps.length;i++) gaps.push(Math.round((parse(ps[i].start)-parse(ps[i-1].start))/864e5));
  const recent = gaps.slice(-6), avg = recent.length ? Math.round(recent.reduce((a,b)=>a+b,0)/recent.length) : 28;
  const lens = ps.slice(-6).map(p=>p.days||5), plen = Math.round(lens.reduce((a,b)=>a+b,0)/(lens.length||1)) || 5;
  const last = ps[ps.length-1];
  return {avg, plen, last, next: last ? addDays(last.start, avg) : null, gaps};
}
export function cycleDay(stats, date){ if(!stats.last) return null; return Math.round((parse(date)-parse(stats.last.start))/864e5)+1; }
export function phase(stats, day){
  if(!day) return null; const ov = stats.avg - 14;
  if(day <= stats.plen) return {k:'period', n:'Period', note:'Rest when you need it. Gentle movement can ease cramps and backache.'};
  if(day < ov-1) return {k:'follicular', n:'Follicular', note:'Energy often rises now. A good time to lift a little heavier.'};
  if(day <= ov+1) return {k:'ovulation', n:'Ovulation (estimate)', note:'Often a high-energy few days. Warm up well.'};
  if(day >= stats.avg-4) return {k:'late', n:'Late luteal', note:'You’ve often felt tired and had headaches in these last few days. Go easier if you need to.'};
  return {k:'luteal', n:'Luteal', note:'Energy can dip as the cycle goes on. Steady efforts and good sleep help.'};
}
