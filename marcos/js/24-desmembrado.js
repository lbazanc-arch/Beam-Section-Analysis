// ═══════════════════════════════════════════════════════════
//  MARCOS — DESMEMBRADO (2026-10-25, tema nuevo a petición del profesor)
//  Un MIEMBRO es lo que se dibuja de un tirón (`t.miembro`): sus tramos están
//  soldados entre sí. Donde se tocan miembros distintos hay un PASADOR, que
//  transmite fuerza y no momento. La ventana del nudo cambia la unión
//  (`n.union`): 'rigida' suelda todo lo que llega al nudo; 'pasador' articula
//  todo, también dentro de un miembro (es la rótula de fuerzas internas,
//  `n.rotula`); 'deslizante' es un pasador que corre a lo largo de un tramo
//  elegido (`n.desliza`) y solo transmite la fuerza perpendicular a él. Un
//  empotramiento suelda al suelo todo lo que llega a su nudo.
//  CUERPO: tramos soldados (una componente). PASADOR: nudo donde se tocan dos o
//  más cuerpos. Incógnitas: las reacciones (y cuerdas, bielas, topes) y las
//  fuerzas de cada pasador sobre cada cuerpo. Ecuaciones: tres por cuerpo y dos
//  por pasador GENERAL (con carga, apoyo o vínculo, o con tres o más cuerpos).
//  Un pasador que une solo dos cuerpos y no lleva nada más da fuerzas iguales y
//  opuestas (B_x, B_y en uno; −B_x, −B_y en el otro) sin ecuación propia.
// ═══════════════════════════════════════════════════════════
const COL_PIN = '#0f766e';     // fuerzas de pasador en los DCL de pantalla

function tramosDeNudo(id){ return tramos.filter(t=>t.a===id || t.b===id); }
function miembroDeTramo(t){ return (t.miembro === undefined || t.miembro === null) ? 'T' + t.id : t.miembro; }

// Tramos soldados → cuerpos, en el orden de su primer tramo.
function cuerposDelMarco(){
  const padre = {};
  tramos.forEach(t=>{ padre[t.id] = t.id; });
  const raiz = id=>{ while(padre[id] !== id){ padre[id] = padre[padre[id]]; id = padre[id]; } return id; };
  const unir = (a, b)=>{ const ra = raiz(a), rb = raiz(b); if(ra !== rb) padre[ra] = rb; };
  nodos.forEach(n=>{
    const ts = tramosDeNudo(n.id);
    if(ts.length < 2) return;
    if(n.apoyo === 'empotrado' || n.union === 'rigida'){ ts.forEach(t=>unir(ts[0].id, t.id)); return; }
    if(n.rotula || n.union === 'pasador') return;
    for(let i=0;i<ts.length;i++) for(let j=i+1;j<ts.length;j++)
      if(miembroDeTramo(ts[i]) === miembroDeTramo(ts[j])) unir(ts[i].id, ts[j].id);
  });
  const grupos = new Map();
  tramos.forEach(t=>{ const r = raiz(t.id); if(!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(t); });
  return [...grupos.values()].map((ts, k)=>{
    const nds = [];
    ts.forEach(t=>[t.a, t.b].forEach(id=>{ if(nds.indexOf(id) < 0) nds.push(id); }));
    const c = {k, tramos:ts, ids:new Set(ts.map(t=>t.id)), nudos:nds};
    c.nombre = _nombreCuerpo(c);
    return c;
  });
}
// El nombre de un cuerpo: sus nudos en el orden en que se recorren, desde un
// extremo (ABC; en un cuerpo ramificado, el recorrido en profundidad).
function _nombreCuerpo(c){
  const grado = id => c.tramos.filter(t=>t.a===id || t.b===id).length;
  const ini = c.nudos.find(id=>grado(id) === 1) || c.nudos[0];
  const vistos = new Set(), orden = [];
  const ir = id=>{
    if(vistos.has(id)) return;
    vistos.add(id); orden.push(id);
    c.tramos.filter(t=>t.a===id || t.b===id).forEach(t=>ir(t.a === id ? t.b : t.a));
  };
  ir(ini);
  return orden.map(id=>(nodo(id) || {}).nombre || '?').join('');
}
// Tangente unitaria de un tramo en uno de sus nudos (recto o curvo).
function tangenteEnNudo(t, idNudo){
  const g = geoTramo(t);
  const Q = puntoEnTramo(g, idNudo === t.a ? 0 : g.L);
  return {x:Q.ux, y:Q.uy};
}
// Normal de deslizamiento en un pasador deslizante: perpendicular al tramo.
function normalDeslizante(p){
  const u = tangenteEnNudo(p.desl.tramo, p.n.id);
  return {x:-u.y, y:u.x};
}

// Los pasadores (nudos con dos o más cuerpos) y en qué cuerpos cae cada nudo.
function pasadoresDelMarco(cuerpos){
  const deTramo = {};
  cuerpos.forEach(c=>c.tramos.forEach(t=>{ deTramo[t.id] = c.k; }));
  const pines = [], cuerposEnNudo = {};
  nodos.forEach(n=>{
    const ks = [];
    tramosDeNudo(n.id).forEach(t=>{ if(ks.indexOf(deTramo[t.id]) < 0) ks.push(deTramo[t.id]); });
    cuerposEnNudo[n.id] = ks;
    if(ks.length < 2) return;
    let desl = null;
    if(n.union === 'deslizante'){
      const ts = tramos.find(t=>t.id === n.desliza && (t.a === n.id || t.b === n.id));
      if(ts) desl = {k:deTramo[ts.id], tramo:ts};
    }
    pines.push({n, cuerpos:ks, desl, i:pines.length});
  });
  return {pines, cuerposEnNudo, deTramo};
}

// Qué dibujar en cada nudo (08-): pasador hueco, collarín de un deslizante y
// cuadrado lleno de una unión rígida entre miembros.
function unionesParaDibujo(){
  const out = {};
  if(!tramos.length) return out;
  const P = pasadoresDelMarco(cuerposDelMarco());
  P.pines.forEach(p=>{ out[p.n.id] = {pin:true, desl:p.desl ? p.desl.tramo : null}; });
  nodos.forEach(n=>{
    if(n.union !== 'rigida') return;
    if(new Set(tramosDeNudo(n.id).map(miembroDeTramo)).size >= 2) out[n.id] = {rigida:true};
  });
  return out;
}

// ── Dibujo por miembros (09-): lo que se dibuja de un tirón es un miembro ──
// `cadenaMiembro` recuerda el miembro de la cadena en curso y su último nudo:
// un tramo nuevo sigue en ese miembro solo si sale de ese nudo; si no, empieza
// otro. Así no importa quién vacíe `primerNodo` (Esc, cambiar de herramienta).
let cadenaMiembro = null, miembroSeq = 0;
function miembroParaTramoNuevo(desdeId){
  if(!cadenaMiembro || cadenaMiembro.ultimo !== desdeId) cadenaMiembro = {miembro:++miembroSeq, ultimo:desdeId};
  return cadenaMiembro.miembro;
}
// Un toque en el medio de un tramo lo parte ahí: el nudo nuevo queda sobre su
// eje y los dos trozos siguen siendo del mismo miembro (soldados). Con cargas
// en el tramo no se parte (habría que repartirlas): se avisa.
function tramoConCargas(t){ return cargas.some(c=>c.tramo === t.id); }
function partirTramo(t, wx, wy){
  const g = geoTramo(t); if(!g) return null;
  const sx = snap(wx), sy = snap(wy);
  let s;
  if(g.arco){
    const A = g.arco, sg = A.d >= 0 ? 1 : -1;
    let phi = sg*(Math.atan2(sy - A.cy, sx - A.cx) - A.t1);
    phi = ((phi % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    s = A.R*phi;
  } else s = (sx - g.a.x)*g.ux + (sy - g.a.y)*g.uy;
  if(!(s > 1e-6*g.L && s < g.L*(1 - 1e-6))) return null;
  const Q = puntoEnTramo(g, s);
  const nn = {id:++nodoSeq, x:+Q.x.toFixed(10), y:+Q.y.toFixed(10), nombre:'', apoyo:'libre', rotula:false};
  nodos.push(nn);
  const t2 = {id:++tramoSeq, a:nn.id, b:t.b, miembro:t.miembro};
  if(t.pesoId !== undefined) t2.pesoId = t.pesoId;
  if(g.arco){
    // Cada trozo es un arco del mismo radio que pasa por donde pasaba el original.
    const A = g.arco, mitad = (u0, u1)=>puntoEnTramo(g, (u0 + u1)/2);
    const fSub = (P0, P1, u0, u1)=>{
      const c = Math.hypot(P1.x - P0.x, P1.y - P0.y), mayor = (u1 - u0)/A.R > Math.PI, M = mitad(u0, u1);
      let mejor = null, dm = Infinity;
      [1, -1].forEach(lado=>{
        const f = flechaDesdeRadio(c, A.R, lado, mayor), ar = arcoEntre(P0, P1, f);
        if(!ar) return;
        const th = ar.t1 + ar.d/2, d = Math.hypot(ar.cx + ar.R*Math.cos(th) - M.x, ar.cy + ar.R*Math.sin(th) - M.y);
        if(d < dm){ dm = d; mejor = f; }
      });
      return mejor;
    };
    const fa = fSub(g.a, nn, 0, s), fb = fSub(nn, g.b, s, g.L);
    t.flecha = fa; t2.flecha = fb;
  }
  t.b = nn.id;
  tramos.splice(tramos.indexOf(t) + 1, 0, t2);
  reNombrar();
  return nn;
}

// ── El análisis completo: reacciones y fuerzas de pasador de una vez ──
function analizarMarco(){
  if(tramos.length < 1) return {error:'sin-viga'};
  if(cargas.some(c=>(c.tipo==='U'||c.tipo==='T') && esArco(tramos.find(t=>t.id===c.tramo))
     && ((c.tipo==='T' && Math.abs((c.mag2||0) - c.mag) > 1e-12) || dirDeCarga(c) === 'axial')))
    return {error:'arco-carga'};
  const cuerpos = cuerposDelMarco();
  // Un cuerpo soldado con un anillo cerrado es hiperestático por dentro.
  const anillo = cuerpos.find(c=>c.tramos.length !== c.nudos.length - 1);
  if(anillo) return {error:'anillo', cuerpo:anillo};
  const P = pasadoresDelMarco(cuerpos);
  // Una sola estructura: los cuerpos, unidos por pasadores o por vínculos entre nudos.
  {
    const pad = cuerpos.map(c=>c.k);
    const r = k=>{ while(pad[k] !== k) k = pad[k] = pad[pad[k]]; return k; };
    const une = (a, b)=>{ pad[r(a)] = r(b); };
    P.pines.forEach(p=>p.cuerpos.forEach(k=>une(p.cuerpos[0], k)));
    vinculos.forEach(v=>{
      if(v.b === null || v.b === undefined) return;
      const ka = (P.cuerposEnNudo[v.a] || [])[0], kb = (P.cuerposEnNudo[v.b] || [])[0];
      if(ka !== undefined && kb !== undefined) une(ka, kb);
    });
    if(new Set(cuerpos.map(c=>r(c.k))).size > 1) return {error:'no-conexa'};
  }
  const pinDeNudo = {};
  P.pines.forEach(p=>{ pinDeNudo[p.n.id] = p.i; });
  const destinoNudo = id => (pinDeNudo[id] !== undefined) ? {pin:pinDeNudo[id]}
    : ((P.cuerposEnNudo[id] || []).length ? {cuerpo:P.cuerposEnNudo[id][0]} : null);
  const acc = todasLasAcciones();
  const destinoAccion = a=>{
    const c = a.carga;
    if(c && c.destino === 'nudo') return destinoNudo(c.nudo);
    if(c && c.tramo !== null && c.tramo !== undefined && P.deTramo[c.tramo] !== undefined) return {cuerpo:P.deTramo[c.tramo]};
    return null;
  };
  // Un par aplicado en un pasador no tiene a qué cuerpo ir (el pasador no lo resiste).
  if(acc.some(a=>{ const d = destinoAccion(a); return d && d.pin !== undefined && Math.abs(a.m || 0) > 1e-12; }))
    return {error:'par-en-pasador'};

  // Incógnitas de reacción, como en fuerzas internas (03-), y vínculos (22-).
  const inc = [];
  nodos.forEach(n=>{
    if(!(P.cuerposEnNudo[n.id] || []).length) return;
    const g = GRADOS[n.apoyo||'libre'];
    if(n.apoyo === 'movil'){ inc.push({n, tipo:'Ry', ang:angReaccion(n)}); return; }
    if(g >= 1) inc.push({n, tipo:'Ry'});
    if(g >= 2) inc.push({n, tipo:'Rx'});
    if(g >= 3) inc.push({n, tipo:'M'});
  });
  incognitasDeVinculos().forEach(u=>inc.push(u));

  // ¿Lleva algo más el pasador? Entonces es general (con su propia ecuación).
  const algoEnNudo = id => (nodo(id).apoyo && nodo(id).apoyo !== 'libre')
    || acc.some(a=>a.carga && a.carga.destino === 'nudo' && a.carga.nudo === id)
    || vinculos.some(v=>v.a === id || v.b === id);
  // Todas las incógnitas, con dónde actúa cada una a valor unidad.
  const unk = [];
  inc.forEach(u=>{
    unk.push({tipo:'reac', u, apl:fuerzasUnitarias(u).map(f=>({dest:destinoNudo(f.n.id), fx:f.fx, fy:f.fy,
      m:f.m || 0, x:f.n.x, y:f.n.y, n:f.n}))});
  });
  P.pines.forEach(p=>{
    const n = p.n, nom = n.nombre;
    p.general = p.cuerpos.length > 2 || algoEnNudo(n.id);
    const nr = p.desl ? normalDeslizante(p) : null;
    const pt = {x:n.x, y:n.y, n};
    if(!p.general){
      // Dos cuerpos: iguales y opuestas. El primero es el deslizante, si lo hay.
      const k1 = p.desl ? p.desl.k : p.cuerpos[0];
      const k2 = p.cuerpos.find(k=>k !== k1);
      p.par = [k1, k2];
      if(p.desl){
        unk.push({tipo:'pin', p, comp:'n', nombre:'N_{' + nom + '}', plano:'N' + nom, dir:nr,
          apl:[Object.assign({dest:{cuerpo:k1}, fx:nr.x, fy:nr.y, m:0}, pt), Object.assign({dest:{cuerpo:k2}, fx:-nr.x, fy:-nr.y, m:0}, pt)]});
      } else {
        unk.push({tipo:'pin', p, comp:'x', nombre:nom + '_x', plano:nom + 'x', dir:{x:1, y:0},
          apl:[Object.assign({dest:{cuerpo:k1}, fx:1, fy:0, m:0}, pt), Object.assign({dest:{cuerpo:k2}, fx:-1, fy:0, m:0}, pt)]});
        unk.push({tipo:'pin', p, comp:'y', nombre:nom + '_y', plano:nom + 'y', dir:{x:0, y:1},
          apl:[Object.assign({dest:{cuerpo:k1}, fx:0, fy:1, m:0}, pt), Object.assign({dest:{cuerpo:k2}, fx:0, fy:-1, m:0}, pt)]});
      }
      return;
    }
    // General: una pareja de incógnitas por cuerpo (una sola, la normal, en el
    // que desliza) y el pasador recibe lo contrario.
    p.cuerpos.forEach(k=>{
      const nc = cuerpos[k].nombre;
      if(p.desl && p.desl.k === k){
        unk.push({tipo:'pin', p, cuerpo:k, comp:'n', nombre:'N_{' + nom + ',' + nc + '}', plano:'N' + nom + '(' + nc + ')', dir:nr,
          apl:[Object.assign({dest:{cuerpo:k}, fx:nr.x, fy:nr.y, m:0}, pt), Object.assign({dest:{pin:p.i}, fx:-nr.x, fy:-nr.y, m:0}, pt)]});
        return;
      }
      unk.push({tipo:'pin', p, cuerpo:k, comp:'x', nombre:nom + '_{x,' + nc + '}', plano:nom + 'x(' + nc + ')', dir:{x:1, y:0},
        apl:[Object.assign({dest:{cuerpo:k}, fx:1, fy:0, m:0}, pt), Object.assign({dest:{pin:p.i}, fx:-1, fy:0, m:0}, pt)]});
      unk.push({tipo:'pin', p, cuerpo:k, comp:'y', nombre:nom + '_{y,' + nc + '}', plano:nom + 'y(' + nc + ')', dir:{x:0, y:1},
        apl:[Object.assign({dest:{cuerpo:k}, fx:0, fy:1, m:0}, pt), Object.assign({dest:{pin:p.i}, fx:0, fy:-1, m:0}, pt)]});
    });
  });
  // Filas: tres por cuerpo (ΣFx, ΣFy, ΣM respecto del origen) y dos por pasador general.
  const filas = [];
  cuerpos.forEach(c=>{ ['x','y','m'].forEach(e=>filas.push({cuerpo:c.k, e})); });
  P.pines.forEach(p=>{ if(p.general) ['x','y'].forEach(e=>filas.push({pin:p.i, e})); });
  const filaDe = (dest, e)=>filas.findIndex(f=>(dest.cuerpo !== undefined ? f.cuerpo === dest.cuerpo : f.pin === dest.pin) && f.e === e);
  const diag = {inc:unk.length, eq:filas.length, reac:inc.length, cuerpos:cuerpos.length,
                pines:P.pines.length, generales:P.pines.filter(p=>p.general).length,
                vin:inc.filter(u=>u.tipo === 'V').length};
  if(unk.length !== filas.length) return {error:'determinacion', diag, cuerpos, pines:P.pines};
  const A = filas.map(()=>new Array(unk.length).fill(0)), b = new Array(filas.length).fill(0);
  const sumar = (dest, fx, fy, m, x, y, j, sg)=>{
    if(!dest) return;
    const ix = filaDe(dest, 'x'), iy = filaDe(dest, 'y');
    if(j === null){ b[ix] -= fx; b[iy] -= fy; } else { A[ix][j] += fx; A[iy][j] += fy; }
    if(dest.cuerpo !== undefined){
      const im = filaDe(dest, 'm'), mo = x*fy - y*fx + m;
      if(j === null) b[im] -= mo; else A[im][j] += mo;
    }
  };
  unk.forEach((q, j)=>q.apl.forEach(a=>sumar(a.dest, a.fx, a.fy, a.m, a.x, a.y, j)));
  acc.forEach(a=>sumar(destinoAccion(a), a.fx, a.fy, a.m || 0, a.x, a.y, null));
  const x = resolverSistema(A, b);
  if(!x) return {error:'singular', diag, cuerpos, pines:P.pines};
  unk.forEach((q, j)=>{ q.valor = x[j]; });
  const val = {};
  inc.forEach((u, j)=>{ val[j] = x[j]; });
  // Lo que actúa sobre cada cuerpo, ya con su valor: lo necesitan las fuerzas
  // internas, los DCL finales y la comprobación.
  const fuerzasEnCuerpo = cuerpos.map(()=>[]);
  unk.forEach(q=>q.apl.forEach(a=>{
    if(!a.dest || a.dest.cuerpo === undefined) return;
    // `ua`: la fuerza a valor unidad (su sentido supuesto), para dibujarla como incógnita.
    const f = {x:a.x, y:a.y, fx:q.valor*a.fx, fy:q.valor*a.fy, m:q.valor*(a.m || 0), nodo:a.n, unk:q, signo:1,
               ua:{x:a.fx, y:a.fy, m:a.m || 0}};
    if(q.tipo === 'reac'){ f.reac = true; f.inc = q.u; }
    else {
      // signo: +1 si en este cuerpo actúa la incógnita tal cual; −1 si la opuesta
      f.signo = (a.fx*(q.dir ? q.dir.x : 0) + a.fy*(q.dir ? q.dir.y : 0)) >= 0 ? 1 : -1;
      f.pin = {nombre:q.nombre, plano:q.plano, nodo:a.n, comp:q.comp, signo:f.signo, unk:q};
    }
    fuerzasEnCuerpo[a.dest.cuerpo].push(f);
  }));
  const res = {acc, inc, val, diag, cuerpos, pines:P.pines, unk, x, A, b, filas,
               destinoAccion, destinoNudo, fuerzasEnCuerpo, marco:true};
  res.avisosVin = avisosDeVinculos(res);
  // Comprobación: cada cuerpo, con sus cargas y lo que recibe, en equilibrio.
  cuerpos.forEach(c=>{
    let sx = 0, sy = 0, sm = 0;
    fuerzasEnCuerpo[c.k].forEach(f=>{ sx += f.fx; sy += f.fy; sm += f.x*f.fy - f.y*f.fx + f.m; });
    acc.forEach(a=>{ const d = destinoAccion(a); if(!d || d.cuerpo !== c.k) return; sx += a.fx; sy += a.fy; sm += a.x*a.fy - a.y*a.fx + (a.m || 0); });
    const esc = Math.max(1, ...res.x.map(Math.abs));
    if(Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sm)) > 1e-7*esc)
      console.warn('Marcos: el cuerpo ' + c.nombre + ' no queda en equilibrio', {sx, sy, sm});
  });
  return res;
}

// ── N, V y M de cada cuerpo: el motor de cadenas de siempre (03-) sobre los
// tramos del cuerpo, con lo que actúa sobre él ya conocido ──
function fuerzasInternasMarco(res){
  const N = 80, salida = [], todas = [];
  const guarda = tramos;
  try{
    res.cuerpos.forEach(c=>{
      tramos = c.tramos;
      const est = descomponerEnCadenas();
      if(est.error || !est.cadenas.length) return;
      const punt = [];
      res.acc.forEach(a=>{
        if(a.carga && (a.carga.tipo === 'U' || a.carga.tipo === 'T')) return;
        const d = res.destinoAccion(a);
        if(d && d.cuerpo === c.k) punt.push(a);
      });
      res.fuerzasEnCuerpo[c.k].forEach(f=>punt.push(f));
      // Cada acción a la cadena del cuerpo donde está (como `fuerzasInternas`).
      const cadDeTramo = {}, cadDeNudo = {};
      est.cadenas.forEach(cc=>{
        cc.cad.forEach(e=>{ cadDeTramo[e.t.id] = cc.id; });
        [cc.cad[0].desde].concat(cc.cad.map(e=>e.hasta)).forEach(n=>{
          if(cc.union && n.id === cc.union.id) return;
          if(cadDeNudo[n.id] === undefined) cadDeNudo[n.id] = cc.id;
        });
      });
      const cadDeAccion = a=>{
        if(a.reac || a.pin) return cadDeNudo[a.nodo.id];
        const cg = a.carga;
        if(!cg) return 0;
        return (cg.destino === 'nudo') ? cadDeNudo[cg.nudo] : cadDeTramo[cg.tramo];
      };
      const porCadena = est.cadenas.map(()=>[]);
      punt.forEach(a=>{ const k = cadDeAccion(a); porCadena[k === undefined ? 0 : k].push(a); });
      const repartidasDe = k=>res.acc.filter(a=>a.carga && (a.carga.tipo === 'U' || a.carga.tipo === 'T')
                                         && cadDeTramo[a.carga.tramo] === k);
      const resultados = new Array(est.cadenas.length);
      for(let k = est.cadenas.length - 1; k >= 0; k--){
        const cc = est.cadenas[k];
        const lista = porCadena[k].slice();
        est.cadenas.forEach(h=>{ if(h.padre === k) lista.push(resultados[h.id].equivalente); });
        const r = _internasDeCadena(res, cc, lista, N);
        r.id = cc.id; r.cad = cc.cad; r.padre = cc.padre; r.union = cc.union;
        if(cc.union){
          const X = cc.union;
          let fx = 0, fy = 0, m = 0;
          lista.concat(repartidasDe(k)).forEach(a=>{
            fx += a.fx; fy += a.fy; m += (a.x - X.x)*a.fy - (a.y - X.y)*a.fx + (a.m || 0);
          });
          const eU = cc.cad[cc.cad.length - 1];
          r.equivalente = {x:X.x, y:X.y, fx, fy, m,
                           rama:{cadena:k, union:X, tramo:eU.t, nombre:eU.desde.nombre + eU.hasta.nombre}};
        }
        resultados[k] = r;
      }
      // Índices de cadena globales: el resto del tema busca la cadena de un
      // tramo por `seg.cadena` en `R.internas.cadenas`.
      const off = todas.length;
      resultados.forEach(r=>{
        r.id += off; if(r.padre !== null) r.padre += off; r.cuerpo = c.k;
        r.forEach(s=>{ s.cadena = (s.cadena || 0) + off; s.cuerpo = c.k; });
        if(r.equivalente) r.equivalente.rama.cadena += off;
      });
      for(let k = resultados.length - 1; k >= 0; k--) resultados[k].forEach(s=>salida.push(s));
      resultados.forEach(r=>todas.push(r));
    });
  } finally { tramos = guarda; }
  salida.puntuales = todas.length ? todas[0].puntuales : [];
  salida.cadenas = todas;
  return salida;
}

// ── Grado de indeterminación estática con la fórmula de clase (2026-10-25,
// petición del profesor): GIE = 3·b − (v_i + v_e). b: miembros, más cada biela
// (o cuerda) entre dos nudos, que es una barra más. v_i: en cada pasador al que
// llegan n barras, 2(n − 1); uno deslizante transmite una fuerza menos. v_e: las
// reacciones de cada apoyo y un vínculo por cada cuerda, biela o tope anclado.
// GIE = 0, isostático; < 0, hiperestático; > 0, inestable. Es el mismo recuento
// que el del motor (ecuaciones − incógnitas), contado de otra manera. ──
function gieMarco(){
  const cuerpos = cuerposDelMarco(), P = pasadoresDelMarco(cuerpos);
  const validos = vinculos.filter(vinculoValido);
  const bielas = validos.filter(v=>v.b !== null && v.b !== undefined);
  const b = cuerpos.length + bielas.length;
  const vi = [], ve = [];
  nodos.forEach(n=>{
    const nc = (P.cuerposEnNudo[n.id] || []).length;
    const nb = nc + bielas.filter(v=>v.a === n.id || v.b === n.id).length;
    if(nc && nb >= 2){
      const pin = P.pines.find(p=>p.n.id === n.id), desl = !!(pin && pin.desl);
      vi.push({nombre:n.nombre, n:nb, v:2*(nb - 1) - (desl ? 1 : 0), desl});
    }
    const g = GRADOS[n.apoyo || 'libre'];
    if(nc && g > 0) ve.push({nombre:n.nombre, tipo:NOMBRE_APOYO[n.apoyo].split(' /')[0], v:g});
  });
  validos.filter(v=>v.b === null || v.b === undefined)
    .forEach(v=>ve.push({nombre:(nodo(v.a) || {}).nombre || '?', tipo:VIN_TIPOS[v.tipo].nom, v:1}));
  const sVi = vi.reduce((s, q)=>s + q.v, 0), sVe = ve.reduce((s, q)=>s + q.v, 0);
  const gie = 3*b - (sVi + sVe);
  return {b, miembros:cuerpos.length, bielas:bielas.length, nombres:cuerpos.map(c=>c.nombre), vi, ve, sVi, sVe, gie,
          lectura: gie === 0 ? 'isostático' : (gie < 0 ? 'hiperestático de grado ' + (-gie) : 'inestable: le falta' + (gie > 1 ? 'n ' + gie + ' vínculos' : ' 1 vínculo'))};
}
