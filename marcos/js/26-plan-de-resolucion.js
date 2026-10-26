// ═══════════════════════════════════════════════════════════
//  MARCOS — CÓMO SE ESCRIBE LA RESOLUCIÓN (2026-10-25)
//  El motor (24-) resuelve todo de una vez; aquí se ordena como en clase, un
//  DCL detrás de otro y cada uno con SUS ecuaciones (`planMarco`).
// ═══════════════════════════════════════════════════════════
const EPS_PLAN = 1e-9;

// Rango de las columnas `cols` de las filas `filas` (cada fila: array de coeficientes).
function _rango(filas, cols){
  const M = filas.map(f=>cols.map(j=>f[j]));
  let r = 0;
  const nc = cols.length;
  for(let c=0;c<nc && r<M.length;c++){
    let piv = r;
    for(let i=r+1;i<M.length;i++) if(Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i;
    const esc = Math.max(1, ...M.map(f=>Math.abs(f[c])));
    if(Math.abs(M[piv][c]) < 1e-9*esc) continue;
    [M[r], M[piv]] = [M[piv], M[r]];
    for(let i=0;i<M.length;i++){
      if(i === r) continue;
      const k = M[i][c]/M[r][c];
      for(let j=c;j<nc;j++) M[i][j] -= k*M[r][j];
    }
    r++;
  }
  return r;
}

// Una ecuación sobre el conjunto `dentro(dest)`: componente 'x', 'y', 'm'
// (momento respecto de P) o 't' (a lo largo de `dir`). Devuelve los
// coeficientes de cada incógnita y el término de las cargas.
function _ecuacionSobre(r, dentro, e, P, dir){
  const nU = r.unk.length, coef = new Array(nU).fill(0);
  const aporte = (a, fx, fy, m)=>{
    if(e === 'x') return fx;
    if(e === 'y') return fy;
    if(e === 't') return fx*dir.x + fy*dir.y;
    return (a.x - P.x)*fy - (a.y - P.y)*fx + (m || 0);
  };
  r.unk.forEach((q, j)=>q.apl.forEach(a=>{ if(a.dest && dentro(a.dest)) coef[j] += aporte(a, a.fx, a.fy, a.m); }));
  let cte = 0;
  r.acc.forEach(a=>{ const d = r.destinoAccion(a); if(d && dentro(d)) cte += aporte(a, a.fx, a.fy, a.m); });
  const esc = Math.max(1, ...coef.map(Math.abs));
  coef.forEach((v, j)=>{ if(Math.abs(v) < 1e-12*esc) coef[j] = 0; });
  return {coef, cte, e, P, dir};
}
// ── El plan, DCL por DCL (2026-10-25, corrección del profesor: «si analizas el
// DCL general empleas solo sus ecuaciones; después, cada miembro con las
// suyas»). Antes el paso del marco entero mezclaba ecuaciones de un lado de un
// pasador, que son en realidad las de otro DCL.
// Primero el marco entero (ΣFx, ΣFy, ΣM respecto del apoyo con más
// reacciones). Después, uno a uno, los miembros (y los pasadores generales,
// que son su propio DCL): en cada vuelta el que más incógnitas deja resueltas,
// con su ΣM respecto del punto que más ayuda. Cada ecuación lleva su número, y
// tras cada DCL se despeja lo que ya se puede con TODO lo escrito hasta ahí,
// en grupos de una, dos o tres ecuaciones («De (3) y (5): …»). Lo que no sale
// así se resuelve al final como sistema (raro).
function planMarco(r){
  const nU = r.unk.length, pool = [], pasos = [];
  const sabidas = new Set();
  let num = 0;
  const incDe = (eq, S)=>{ const u = []; eq.coef.forEach((v, j)=>{ if(Math.abs(v) > EPS_PLAN && !S.has(j)) u.push(j); }); return u; };
  // Despeja con las ecuaciones `eqs` lo que se pueda, en grupos de 1 a 3.
  const despejar = (eqs, S)=>{
    const grupos = [];
    for(let vuelta = 0; vuelta < 200; vuelta++){
      let hallado = null;
      for(let k = 1; k <= 3 && !hallado; k++){
        const vivas = eqs.filter(eq=>{ const n = incDe(eq, S).length; return n >= 1 && n <= k; });
        const idx = [];
        const prueba = ini=>{
          if(hallado) return;
          if(idx.length === k){
            const g = idx.map(i=>vivas[i]), U = [...new Set([].concat(...g.map(eq=>incDe(eq, S))))];
            if(U.length === k && _rango(g.map(eq=>eq.coef), U) === k) hallado = {eqs:g, U};
            return;
          }
          for(let i = ini; i < vivas.length && !hallado; i++){ idx.push(i); prueba(i + 1); idx.pop(); }
        };
        prueba(0);
      }
      if(!hallado) break;
      hallado.U.forEach(j=>S.add(j));
      grupos.push({refs:hallado.eqs.map(eq=>eq.num), U:hallado.U});
    }
    return grupos;
  };
  const conNumeros = eqs=>eqs.map(eq=>Object.assign(eq, {num:++num}));
  // 1 · El marco entero
  const cuenta = {};
  r.inc.forEach(u=>{ if(u.tipo === 'V' || (u.tipo === 'M' && u.ang === undefined)) return; cuenta[u.n.id] = (cuenta[u.n.id] || 0) + 1; });
  let O = null, mx = 0;
  nodos.forEach(n=>{ if((cuenta[n.id] || 0) > mx){ mx = cuenta[n.id]; O = n; } });
  if(!O) O = {x:0, y:0, nombre:'O', id:null};
  const todo = ()=>true;
  const eqG = conNumeros([
    _ecuacionSobre(r, todo, 'x'), _ecuacionSobre(r, todo, 'y'),
    Object.assign(_ecuacionSobre(r, todo, 'm', O), {punto:O})
  ]);
  eqG.forEach(eq=>pool.push(eq));
  pasos.push({grupo:{tipo:'global', nombre:'marco completo'}, eqs:eqG, punto:O, sabidasAntes:new Set(sabidas),
              despejes:despejar(pool, sabidas)});
  // 2 · Los miembros y los pasadores generales
  const grupos = r.cuerpos.map(c=>({tipo:'cuerpo', k:c.k, nombre:c.nombre}))
    .concat(r.pines.filter(p=>p.general).map(p=>({tipo:'pin', p, nombre:p.n.nombre})));
  const dentroDe = g=>g.tipo === 'cuerpo' ? (d=>d.cuerpo === g.k) : (d=>d.pin === g.p.i);
  // Las ecuaciones de un grupo, con su ΣM respecto de P (un cuerpo) o sin ella (un pasador).
  const ecuacionesDe = (g, P)=>{
    const dentro = dentroDe(g);
    const fx = _ecuacionSobre(r, dentro, 'x'), fy = _ecuacionSobre(r, dentro, 'y');
    if(g.tipo !== 'cuerpo') return [fx, fy];
    return [Object.assign(_ecuacionSobre(r, dentro, 'm', P), {punto:P}), fx, fy];
  };
  const hechos = new Set();
  for(let vuelta = 0; vuelta < grupos.length && sabidas.size < nU; vuelta++){
    let mejor = null;
    grupos.forEach((g, gi)=>{
      if(hechos.has(gi)) return;
      const dentro = dentroDe(g);
      // Incógnitas del grupo aún sin despejar, y por qué nudo pasa cada una.
      const porNudo = {}, U = new Set();
      r.unk.forEach((q, j)=>{
        if(sabidas.has(j)) return;
        q.apl.forEach(a=>{ if(a.dest && dentro(a.dest)){ U.add(j); porNudo[a.n.id] = (porNudo[a.n.id] || 0) + 1; } });
      });
      if(!U.size){ hechos.add(gi); return; }
      const puntos = g.tipo === 'cuerpo' ? r.cuerpos[g.k].nudos.map(id=>nodo(id)) : [null];
      puntos.forEach(P=>{
        const eqs = ecuacionesDe(g, P), S = new Set(sabidas);
        const n = despejar(pool.concat(eqs), S).reduce((s, d)=>s + d.U.length, 0);
        const pasan = P ? (porNudo[P.id] || 0) : 0;
        const mejora = !mejor || n > mejor.n
          || (n === mejor.n && (U.size < mejor.u || (U.size === mejor.u && mejor.gi === gi && pasan > mejor.pasan)));
        if(mejora) mejor = {g, gi, P, n, u:U.size, pasan};
      });
    });
    if(!mejor) break;
    hechos.add(mejor.gi);
    const antes = new Set(sabidas);
    const eqs = conNumeros(ecuacionesDe(mejor.g, mejor.P));
    eqs.forEach(eq=>pool.push(eq));
    pasos.push({grupo:mejor.g, eqs, punto:mejor.P, sabidasAntes:antes, despejes:despejar(pool, sabidas)});
  }
  const resto = [];
  for(let j = 0; j < nU; j++) if(!sabidas.has(j)) resto.push(j);
  const refsResto = resto.length ? pool.filter(eq=>incDe(eq, sabidas).length).map(eq=>eq.num) : [];
  return {pasos, resto, refsResto, punto:O};
}
// «(3)», «(3) y (5)», «(1), (2) y (3)»
function refsEcuaciones(ns){
  const t = ns.map(n=>'(' + n + ')');
  return t.length > 1 ? t.slice(0, -1).join(', ') + ' y ' + t[t.length - 1] : (t[0] || '');
}
// ¿Esta ecuación ya no tiene incógnitas? Entonces es una comprobación.
function ecuacionSinIncognitas(eq, conocidas){ return !eq.coef.some((v, j)=>Math.abs(v) > EPS_PLAN && !conocidas.has(j)); }

// ── Escritura de una ecuación: incógnitas con su coeficiente, lo ya conocido
// y las cargas como números. `conocidas`: Set de índices ya resueltos. ──
function _numCoefF(c){
  const a = Math.abs(c);
  if(Math.abs(a - Math.round(a)) < 1e-9) return Math.round(a) === 1 ? '' : String(Math.round(a));
  return a.toFixed(4);
}
function terminosEcuacion(r, eq, conocidas){
  const esM = (eq.e === 'm');
  const ts = [];
  let cteConocida = 0;
  eq.coef.forEach((v, j)=>{
    if(Math.abs(v) < EPS_PLAN) return;
    const q = r.unk[j];
    if(conocidas && conocidas.has(j)){ cteConocida += v*q.valor; return; }
    const num = esM ? (Math.abs(Math.abs(v) - 1) < 1e-9 ? '' : dec(Math.abs(v),'len')) : _numCoefF(v);
    ts.push({neg:v < 0, tex:(num ? num + '\\,' : '') + simboloIncognita(q), j});
  });
  const cte = eq.cte + cteConocida;
  return {ts, cte, esM};
}
function simboloIncognita(q){ return q.tipo === 'reac' ? simbReaccion(q.u) : q.nombre; }
// Un nombre TeX en texto plano para un rótulo SVG: C_{x,ABC} → Cx,ABC.
function nomPlanoTex(tex){ return String(tex).replace(/\\[a-zA-Z]+\s*/g, '').replace(/[_{}]/g, ''); }
function ecuacionTex(r, eq, conocidas){
  const {ts, cte, esM} = terminosEcuacion(r, eq, conocidas);
  let s = '';
  ts.forEach((t, i)=>{ s += (i ? (t.neg ? ' - ' : ' + ') : (t.neg ? '-' : '')) + t.tex; });
  if(Math.abs(cte) > 5e-10*Math.max(1, Math.abs(cte)))
    s += (s ? (cte < 0 ? ' - ' : ' + ') : (cte < 0 ? '-' : '')) + dec(Math.abs(cte), esM ? 'momento' : 'fuerza');
  return (s || '0') + ' = 0';
}
// Encabezado de una ecuación: ΣFx, ΣFy, ΣM_P o ΣF a lo largo de un tramo.
function cabeceraEcuacion(eq){
  if(eq.e === 'x') return '\\xrightarrow{+}\\ \\sum F_x = 0';
  if(eq.e === 'y') return '+\\!\\uparrow\\ \\sum F_y = 0';
  if(eq.e === 't') return '\\sum F_{\\parallel ' + (eq.dirNombre || '') + '} = 0';
  return '\\circlearrowleft\\!+\\ \\sum M_{' + ((eq.punto && eq.punto.nombre) || 'O') + '} = 0';
}
