// ═══════════════════════════════════════════════════════════
//  MARCOS — CÓMO SE ESCRIBE LA RESOLUCIÓN (2026-10-25)
//  El motor (24-) resuelve todo de una vez; aquí se ordena como en clase:
//  1. Reacciones con el marco entero: ΣFx, ΣFy y ΣM respecto del apoyo con más
//     incógnitas. Si hay más reacciones que tres, se añaden ecuaciones de UN
//     LADO de un pasador: ΣM respecto del pasador de lo que queda a un lado (sus
//     fuerzas no dan momento), y en un deslizante también ΣF a lo largo del
//     tramo por el que corre. Solo entran las que de verdad aportan (rango).
//  2. Desmembrado: se van resolviendo los cuerpos (tres ecuaciones) y los
//     pasadores generales (dos) que en cada momento tienen tantas incógnitas
//     como ecuaciones independientes, empezando por el de menos incógnitas; en
//     un cuerpo, ΣM respecto del punto por el que pasan más incógnitas.
//  Si algo no sale así (raro), lo que queda se resuelve como sistema.
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
// Cuerpos que quedan a un lado del pasador p, partiendo del cuerpo k (sin cruzar p).
function _ladoDelPasador(r, p, k){
  const lado = new Set([k]), cola = [k];
  while(cola.length){
    const c = cola.shift();
    r.pines.forEach(q=>{
      if(q === p || q.cuerpos.indexOf(c) < 0) return;
      q.cuerpos.forEach(o=>{ if(!lado.has(o)){ lado.add(o); cola.push(o); } });
    });
  }
  return lado;
}

// ── 1. Reacciones ──
function planReaccionesMarco(r){
  const nR = r.inc.length, colsR = r.inc.map((u, j)=>j);
  const todo = ()=>true;
  // Punto de momentos: el nudo donde se juntan más reacciones de fuerza.
  const cuenta = {};
  r.inc.forEach(u=>{ if(u.tipo === 'M' && u.ang === undefined) return; if(u.tipo === 'V') return; cuenta[u.n.id] = (cuenta[u.n.id] || 0) + 1; });
  let O = null, mx = -1;
  nodos.forEach(n=>{ if((cuenta[n.id] || 0) > mx){ mx = cuenta[n.id] || 0; O = n; } });
  if(!O || mx <= 0) O = {x:0, y:0, nombre:'O', id:null};
  const filas = [
    Object.assign(_ecuacionSobre(r, todo, 'x'), {titulo:'marco', cuerpos:null}),
    Object.assign(_ecuacionSobre(r, todo, 'y'), {titulo:'marco', cuerpos:null}),
    Object.assign(_ecuacionSobre(r, todo, 'm', O), {titulo:'marco', cuerpos:null, punto:O})
  ];
  // Candidatas de un lado de cada pasador.
  const cand = [];
  r.pines.forEach(p=>{
    p.cuerpos.forEach(k=>{
      const lado = _ladoDelPasador(r, p, k);
      if(lado.size === r.cuerpos.length) return;
      const dentroPin = new Set(r.pines.filter(q=>q !== p && q.cuerpos.every(c=>lado.has(c))).map(q=>q.i));
      const dentro = d=>(d.cuerpo !== undefined) ? lado.has(d.cuerpo) : dentroPin.has(d.pin);
      const nom = [...lado].map(c=>r.cuerpos[c].nombre).join(', ');
      const eqs = [Object.assign(_ecuacionSobre(r, dentro, 'm', p.n), {punto:p.n})];
      if(p.desl){
        const t = tangenteEnNudo(p.desl.tramo, p.n.id);
        eqs.push(Object.assign(_ecuacionSobre(r, dentro, 't', null, t), {dirNombre:nomTramo(p.desl.tramo)}));
      }
      eqs.forEach(eq=>{
        // Solo vale si no le entra ninguna fuerza de pasador.
        if(eq.coef.some((v, j)=>j >= nR && Math.abs(v) > EPS_PLAN)) return;
        if(!eq.coef.some((v, j)=>j < nR && Math.abs(v) > EPS_PLAN)) return;
        cand.push(Object.assign(eq, {titulo:'lado', cuerpos:[...lado], nombreLado:nom, pin:p}));
      });
    });
  });
  const usadas = filas.slice();
  let rg = _rango(usadas.map(f=>f.coef), colsR);
  cand.forEach(c=>{
    if(rg >= nR) return;
    const nr = _rango(usadas.concat([c]).map(f=>f.coef), colsR);
    if(nr > rg){ usadas.push(c); rg = nr; }
  });
  return {filas:usadas, completo: rg >= nR, punto:O};
}

// ── 2. Desmembrado: el orden de los cuerpos y pasadores ──
function planPasadoresMarco(r, conocidas){
  const sabidas = new Set(conocidas || []);
  const nU = r.unk.length;
  const grupos = [];
  r.cuerpos.forEach(c=>grupos.push({tipo:'cuerpo', k:c.k, nombre:c.nombre}));
  r.pines.forEach(p=>{ if(p.general) grupos.push({tipo:'pin', p, nombre:p.n.nombre}); });
  const dentroDe = g => g.tipo === 'cuerpo' ? (d=>d.cuerpo === g.k) : (d=>d.pin === g.p.i);
  const incogDe = (g, eqs)=>{
    const s = new Set();
    eqs.forEach(eq=>eq.coef.forEach((v, j)=>{ if(Math.abs(v) > EPS_PLAN && !sabidas.has(j)) s.add(j); }));
    return [...s];
  };
  const pasos = [], hechos = new Set();
  let guard = 0;
  while(sabidas.size < nU && guard++ < 200){
    let mejor = null;
    grupos.forEach((g, gi)=>{
      if(hechos.has(gi)) return;
      const dentro = dentroDe(g);
      // Ecuaciones provisionales para contar incógnitas
      const base = g.tipo === 'cuerpo'
        ? [_ecuacionSobre(r, dentro, 'x'), _ecuacionSobre(r, dentro, 'y'), _ecuacionSobre(r, dentro, 'm', {x:0, y:0})]
        : [_ecuacionSobre(r, dentro, 'x'), _ecuacionSobre(r, dentro, 'y')];
      const U = incogDe(g, base);
      if(!U.length){ hechos.add(gi); return; }
      if(U.length > base.length) return;
      if(_rango(base.map(e=>e.coef), U) < U.length) return;
      if(!mejor || U.length < mejor.U.length) mejor = {g, gi, U, dentro};
    });
    if(!mejor) break;
    const g = mejor.g;
    let eqs;
    if(g.tipo === 'cuerpo'){
      // ΣM respecto del nudo del cuerpo por el que pasan más incógnitas.
      const porNudo = {};
      mejor.U.forEach(j=>r.unk[j].apl.forEach(a=>{
        if(a.dest && mejor.dentro(a.dest)) porNudo[a.n.id] = (porNudo[a.n.id] || 0) + 1;
      }));
      let P = null, m = -1;
      Object.keys(porNudo).forEach(id=>{ if(porNudo[id] > m){ m = porNudo[id]; P = nodo(+id); } });
      eqs = [Object.assign(_ecuacionSobre(r, mejor.dentro, 'm', P || {x:0, y:0}), {punto:P}),
             _ecuacionSobre(r, mejor.dentro, 'x'), _ecuacionSobre(r, mejor.dentro, 'y')];
    } else eqs = [_ecuacionSobre(r, mejor.dentro, 'x'), _ecuacionSobre(r, mejor.dentro, 'y')];
    pasos.push({grupo:g, eqs, U:mejor.U, sabidasAntes:new Set(sabidas)});
    mejor.U.forEach(j=>sabidas.add(j));
    hechos.add(mejor.gi);
  }
  const resto = [];
  for(let j=0;j<nU;j++) if(!sabidas.has(j)) resto.push(j);
  return {pasos, resto};
}

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
