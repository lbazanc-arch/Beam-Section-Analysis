// ═══════════════════════════════════════════════════════════

function setMetodo(m){
  metodo = m;
  document.getElementById('metNudos').classList.toggle('active', m==='nudos');
  document.getElementById('metSecc').classList.toggle('active', m==='secciones');
  const cb = document.getElementById('cutBox');
  if(cb) cb.style.display = (m==='secciones') ? '' : 'none';
  const h = document.getElementById('metHint');
  if(h) h.textContent = (m==='nudos')
    ? 'Se resuelve nudo por nudo, en orden de resolubilidad.'
    : 'Se resuelve aislando porciones de la armadura mediante cortes.';
  if(m==='secciones' && modoCorte==='manual') setTool('corte');
  if(resultado) resolver();
}
let cortesAuto = [];      // secuencia hallada

function setModoCorte(m){
  modoCorte = m;
  document.getElementById('modoAuto').classList.toggle('active', m==='auto');
  document.getElementById('modoMan').classList.toggle('active', m==='manual');
  const h = document.getElementById('cutHint');
  if(h) h.textContent = (m==='auto')
    ? 'El programa busca por sí mismo la secuencia de cortes más corta y la muestra paso a paso.'
    : 'Traza tú el corte con la herramienta Corte y se resolverá esa sección.';
  if(m==='manual'){ if(corte && corte.barras) corte = null; setTool('corte'); }
  if(resultado && metodo==='secciones') resolver();
}

// ── Enumeración de particiones válidas ──
// Cada corte equivale a partir los nudos en dos grupos, ambos conectados.
// Se generan haciendo crecer subconjuntos conexos desde cada nudo.
function particionesPosibles(){
  const n = nodos.length;
  const idx = {}; nodos.forEach((z,i)=>idx[z.id] = i);
  const ady = nodos.map(()=>[]);
  barras.forEach(b=>{ ady[idx[b.a]].push(idx[b.b]); ady[idx[b.b]].push(idx[b.a]); });

  const vistos = new Set(), out = [];
  const cola = [];
  for(let i=0;i<n;i++){ const m = 1<<i; cola.push(m); vistos.add(m); }
  let guard = 0;
  while(cola.length && out.length < 4000 && guard < 60000){
    guard++;
    const m = cola.shift();
    const bits = []; for(let i=0;i<n;i++) if(m & (1<<i)) bits.push(i);
    if(bits.length < n){
      // ¿el complemento está conectado?
      const comp = []; for(let i=0;i<n;i++) if(!(m & (1<<i))) comp.push(i);
      if(comp.length){
        const vis = new Set([comp[0]]); const q = [comp[0]];
        while(q.length){
          const x = q.shift();
          ady[x].forEach(y=>{ if(!(m & (1<<y)) && !vis.has(y)){ vis.add(y); q.push(y); } });
        }
        if(vis.size === comp.length) out.push(m);
      }
    }
    if(bits.length < n-1){
      bits.forEach(i=>ady[i].forEach(y=>{
        if(m & (1<<y)) return;
        const m2 = m | (1<<y);
        if(vistos.has(m2)) return;
        vistos.add(m2); cola.push(m2);
      }));
    }
  }
  return {mascaras:out, idx, n};
}

function barrasCortadasPorMascara(m, idx){
  return barras.filter(b=>{
    const ia = idx[b.a], ib = idx[b.b];
    const da = (m & (1<<ia)) !== 0, db = (m & (1<<ib)) !== 0;
    return da !== db;
  });
}

// ── Equilibrio de una porción con incógnitas dadas ──
// Devuelve {ok, valores} resolviendo ΣFx, ΣFy y ΣM sobre la porción.
function equilibrioPorcion(ladoIds, cortadas, conocidas){
  const enLado = id => ladoIds.indexOf(id) >= 0;
  const incog = cortadas.filter(b=>conocidas[b.id] === undefined);
  if(!incog.length || incog.length > 3) return {ok:false};

  // punto de referencia para momentos
  const nRef = nodos.find(z=>enLado(z.id));
  const Ox = nRef.x, Oy = nRef.y;

  // término independiente: cargas, reacciones y barras cortadas ya conocidas
  let bx = 0, by = 0, bm = 0;
  ladoIds.forEach(id=>{
    const nd = nodos.find(z=>z.id===id);
    const ext = [];
    if(!esCero(nd.fx) || !esCero(nd.fy)) ext.push({fx:nd.fx, fy:nd.fy});
    const R = resultado.reacciones[id];
    if(R){
      if(R.rx !== undefined) ext.push({fx:R.rx, fy:0});
      if(R.ry !== undefined) ext.push({fx:0, fy:R.ry});
    }
    ext.forEach(e=>{
      bx += e.fx; by += e.fy;
      bm += (nd.x-Ox)*e.fy - (nd.y-Oy)*e.fx;
    });
  });
  cortadas.forEach(b=>{
    const v = conocidas[b.id];
    if(v === undefined) return;
    const dentro = enLado(b.a) ? b.a : b.b;
    const nd = nodos.find(z=>z.id===dentro);
    const nf = nodos.find(z=>z.id === (dentro===b.a ? b.b : b.a));
    const dx = nf.x-nd.x, dy = nf.y-nd.y, L = Math.hypot(dx,dy);
    const fx = v*dx/L, fy = v*dy/L;
    bx += fx; by += fy;
    bm += (nd.x-Ox)*fy - (nd.y-Oy)*fx;
  });

  // matriz de las incógnitas
  const A = [[],[],[]];
  const geo = incog.map(b=>{
    const dentro = enLado(b.a) ? b.a : b.b;
    const nd = nodos.find(z=>z.id===dentro);
    const nf = nodos.find(z=>z.id === (dentro===b.a ? b.b : b.a));
    const dx = nf.x-nd.x, dy = nf.y-nd.y, L = Math.hypot(dx,dy);
    return {barra:b, nd, nf, ux:dx/L, uy:dy/L};
  });
  geo.forEach(g=>{
    A[0].push(g.ux);
    A[1].push(g.uy);
    A[2].push((g.nd.x-Ox)*g.uy - (g.nd.y-Oy)*g.ux);
  });
  const bb = [-bx, -by, -bm];

  // resolución por mínimos cuadrados con comprobación de rango
  const k = incog.length;
  const N = Array.from({length:k}, ()=>new Array(k).fill(0));
  const r = new Array(k).fill(0);
  for(let i=0;i<k;i++){
    for(let j=0;j<k;j++) for(let e=0;e<3;e++) N[i][j] += A[e][i]*A[e][j];
    for(let e=0;e<3;e++) r[i] += A[e][i]*bb[e];
  }
  const x = resolverSistema(N, r);
  if(!x) return {ok:false};
  // el resultado debe satisfacer las tres ecuaciones
  for(let e=0;e<3;e++){
    let acc = 0;
    for(let i=0;i<k;i++) acc += A[e][i]*x[i];
    const esc = Math.max(1, Math.abs(bb[e]));
    if(Math.abs(acc - bb[e])/esc > 1e-6) return {ok:false};
  }
  const valores = {};
  geo.forEach((g,i)=>{ valores[g.barra.id] = x[i]; });
  return {ok:true, valores, incog, geo};
}

// ── Barras pedidas (ventana «Barras a hallar», 19-) ──
// El Set de ids que hay que hallar, o null si se piden todas (o ya no existen).
function objetivoCortes(){
  if(!barrasPedidas || !barrasPedidas.length) return null;
  const ids = barras.map(b=>b.id);
  const obj = barrasPedidas.filter(id=>ids.indexOf(id) >= 0);
  if(!obj.length || obj.length === ids.length) return null;
  return new Set(obj);
}

// ── Cortes dirigidos: los menos posibles para hallar SOLO las barras pedidas ──
// (2026-10-20, petición del profesor.) Codicioso con un paso de anticipación:
// en cada paso se toma el corte resoluble que halla más barras pedidas y, a
// igualdad, el que deja más barras pedidas a un corte de distancia. Un corte que
// no halla ninguna pedida solo vale si toca barras que aparecen en algún corte
// de una pedida (las que hay que conocer antes). Con simetría, una barra hallada
// da su espejo, y una pedida cuyo espejo se halló ya está hallada.
function buscarCortesDirigidos(objetivo){
  const {mascaras, idx} = particionesPosibles();
  const cands = [];
  mascaras.forEach(m=>{ const c = barrasCortadasPorMascara(m, idx); if(c.length) cands.push({m, cortadas:c}); });
  const conocidas = {};
  miembrosCero().forEach(c=>{ conocidas[c.barra] = 0; });
  const sim = simetriaResolucion(resultado);
  const pendientes = () => [...objetivo].filter(id=>conocidas[id] === undefined);
  // Cortes que contienen alguna barra pedida, y las barras que los acompañan.
  const deObjetivo = cands.filter(c=>c.cortadas.some(b=>objetivo.has(b.id)) && c.cortadas.length <= 7);
  const utiles = new Set();
  deObjetivo.forEach(c=>c.cortadas.forEach(b=>utiles.add(b.id)));
  const peso = ids => ids.reduce((s,id)=>{
    const nd = nodos.find(z=>z.id===id);
    return s + ((!esCero(nd.fx)||!esCero(nd.fy))?1:0) + gradosApoyo(nd);
  }, 0);
  const ladoDe = m => {
    const A = nodos.filter(z=>(m & (1<<idx[z.id])) !== 0).map(z=>z.id);
    const B = nodos.filter(z=>(m & (1<<idx[z.id])) === 0).map(z=>z.id);
    return peso(A) <= peso(B) ? A : B;
  };
  const conEspejos = (base, valores) => {
    const k = Object.assign({}, base);
    Object.keys(valores).forEach(id=>{
      k[id] = valores[id];
      const e = sim.tipo ? sim.espejo[id] : null;
      if(e && k[e.otro] === undefined) k[e.otro] = e.sg*valores[id];
    });
    return k;
  };
  // Cuántas pedidas quedarían a un solo corte con lo que ya se sabe. El corte
  // tiene que poder resolverse: tres incógnitas que concurren en un nudo (FG,
  // FI y FH en F) no salen de un corte, y contarlas engañaba al desempate.
  const alAlcance = k => {
    let mejor = 0;
    deObjetivo.forEach(c=>{
      const pend = c.cortadas.filter(b=>k[b.id] === undefined);
      if(!pend.length || pend.length > 3) return;
      const n = pend.filter(b=>objetivo.has(b.id)).length;
      if(n <= mejor) return;
      if(equilibrioPorcion(ladoDe(c.m), c.cortadas, k).ok) mejor = n;
    });
    return mejor;
  };
  const pasos = [];
  let guard = 0;
  while(pendientes().length && guard < 12){
    guard++;
    let mejor = null;
    cands.forEach(c=>{
      const pend = c.cortadas.filter(b=>conocidas[b.id] === undefined);
      if(!pend.length || pend.length > 3) return;
      const nObj = pend.filter(b=>objetivo.has(b.id) || (sim.tipo && sim.espejo[b.id] && objetivo.has(sim.espejo[b.id].otro))).length;
      if(!nObj && !pend.some(b=>utiles.has(b.id))) return;
      const lado = ladoDe(c.m);
      const sol = equilibrioPorcion(lado, c.cortadas, conocidas);
      if(!sol.ok) return;
      const despues = conEspejos(conocidas, sol.valores);
      // Una «porción» de un solo nudo es el método de nudos, no un corte: solo
      // si no queda otra.
      const score = nObj*10000 + alAlcance(despues)*100 - pend.length*5 - peso(lado)*2 - lado.length*0.1
                  - (lado.length === 1 ? 60 : 0);
      if(!mejor || score > mejor.score) mejor = {score, m:c.m, lado, cortadas:c.cortadas, sol, nuevas:pend.length};
    });
    if(!mejor) break;
    Object.keys(mejor.sol.valores).forEach(id=>{ conocidas[id] = mejor.sol.valores[id]; });
    mejor.espejos = [];
    if(sim.tipo) Object.keys(mejor.sol.valores).forEach(id=>{
      const e = sim.espejo[id];
      if(e && conocidas[e.otro] === undefined){
        conocidas[e.otro] = e.sg*mejor.sol.valores[id];
        mejor.espejos.push({barra:e.otro, de:+id, sg:e.sg});
      }
    });
    pasos.push(mejor);
  }
  return pasos;
}

// ── Búsqueda de la secuencia más corta ──
function buscarCortes(){
  if(!resultado) return [];
  const objetivo = objetivoCortes();
  if(objetivo) return buscarCortesDirigidos(objetivo);
  const {mascaras, idx, n} = particionesPosibles();
  const conocidas = {};
  // las barras de fuerza cero se dan por sabidas: no gastan incógnita
  const cero = miembrosCero().map(c=>c.barra);
  cero.forEach(id=>{ conocidas[id] = 0; });

  // Con simetría (2026-10-11), cada barra hallada da también su espejo: los
  // cortes que solo resolverían barras espejo ya no hacen falta.
  const sim = simetriaResolucion(resultado);
  const pasos = [];
  let guard = 0;
  while(Object.keys(conocidas).length < barras.length && guard < 60){
    guard++;
    let mejor = null;
    mascaras.forEach(m=>{
      const cortadas = barrasCortadasPorMascara(m, idx);
      if(!cortadas.length) return;
      const pend = cortadas.filter(b=>conocidas[b.id] === undefined);
      if(!pend.length || pend.length > 3) return;
      // se analiza el lado con menos cargas y reacciones
      const ladoA = nodos.filter(z=>(m & (1<<idx[z.id])) !== 0).map(z=>z.id);
      const ladoB = nodos.filter(z=>(m & (1<<idx[z.id])) === 0).map(z=>z.id);
      const peso = ids => ids.reduce((s,id)=>{
        const nd = nodos.find(z=>z.id===id);
        return s + ((!esCero(nd.fx)||!esCero(nd.fy))?1:0) + gradosApoyo(nd);
      }, 0);
      const lado = peso(ladoA) <= peso(ladoB) ? ladoA : ladoB;
      const sol = equilibrioPorcion(lado, cortadas, conocidas);
      if(!sol.ok) return;
      // criterio: resolver más barras de una vez; a igualdad, porción más simple
      const score = pend.length*1000 - peso(lado)*10 - lado.length;
      if(!mejor || score > mejor.score)
        mejor = {score, m, lado, cortadas, sol, nuevas:pend.length};
    });
    if(!mejor) break;
    Object.keys(mejor.sol.valores).forEach(id=>{
      conocidas[id] = mejor.sol.valores[id];
    });
    mejor.espejos = [];
    if(sim.tipo) Object.keys(mejor.sol.valores).forEach(id=>{
      const e = sim.espejo[id];
      if(e && conocidas[e.otro] === undefined){
        conocidas[e.otro] = e.sg*mejor.sol.valores[id];
        mejor.espejos.push({barra:e.otro, de:+id, sg:e.sg});
      }
    });
    pasos.push(mejor);
  }
  return pasos;
}

// ── Línea de corte dibujable a partir de la partición ──
function lineaDeCorte(paso){
  // punto medio de cada barra cortada; la línea los atraviesa a todos
  const pts = paso.cortadas.map(b=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    return {x:(na.x+nb.x)/2, y:(na.y+nb.y)/2};
  });
  const cx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
  const cy = pts.reduce((s,p)=>s+p.y,0)/pts.length;
  let dx, dy;
  if(pts.length === 1){
    const b = paso.cortadas[0];
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    dx = -(nb.y-na.y); dy = (nb.x-na.x);
  } else {
    // dirección principal de la nube de puntos medios
    let sxx = 0, sxy = 0, syy = 0;
    pts.forEach(p=>{ const a = p.x-cx, b2 = p.y-cy; sxx += a*a; sxy += a*b2; syy += b2*b2; });
    const th = 0.5*Math.atan2(2*sxy, sxx-syy);
    dx = Math.cos(th); dy = Math.sin(th);
  }
  const L = Math.hypot(dx,dy) || 1;
  dx /= L; dy /= L;
  const ext = nodos.reduce((s,n)=>Math.max(s, Math.hypot(n.x-cx, n.y-cy)), 1)*1.35;
  return {x1:cx-dx*ext, y1:cy-dy*ext, x2:cx+dx*ext, y2:cy+dy*ext, barras:paso.cortadas.map(b=>b.id)};
}

// ── Resolución estratégica de un paso (una ecuación por incógnita) ──
function estrategiaPaso(paso, conocidasPrevias){
  const lado = paso.lado;
  const enLado = id => lado.indexOf(id) >= 0;
  const externas = [];
  lado.forEach(id=>{
    const nd = nodos.find(z=>z.id===id);
    if(!esCero(nd.fx) || !esCero(nd.fy))
      externas.push({x:nd.x, y:nd.y, fx:nd.fx, fy:nd.fy, et:'Carga en '+nd.nombre});
    const R = resultado.reacciones[id];
    if(R){
      if(R.rx !== undefined && !esCero(R.rx)) externas.push({x:nd.x, y:nd.y, fx:R.rx, fy:0, et:'R'+nd.nombre+'x'});
      if(R.ry !== undefined && !esCero(R.ry)) externas.push({x:nd.x, y:nd.y, fx:0, fy:R.ry, et:'R'+nd.nombre+'y'});
    }
  });
  paso.cortadas.forEach(b=>{
    const v = conocidasPrevias[b.id];
    if(v === undefined || esCero(v)) return;
    const dentro = enLado(b.a) ? b.a : b.b;
    const nd = nodos.find(z=>z.id===dentro);
    const nf = nodos.find(z=>z.id === (dentro===b.a ? b.b : b.a));
    const dx = nf.x-nd.x, dy = nf.y-nd.y, L = Math.hypot(dx,dy);
    externas.push({x:nd.x, y:nd.y, fx:v*dx/L, fy:v*dy/L, et:'F'+nombreBarra(b)+' (ya conocida)', barra:b, conocida:v});
  });

  const datos = paso.sol.geo.map(g=>({
    barra:g.barra, nombre:nombreBarra(g.barra), px:g.nd.x, py:g.nd.y,
    ux:g.ux, uy:g.uy, nd:g.nd
  }));

  const items = ecuacionesDeCorte(datos, externas, id=>paso.sol.valores[id]);
  return {items, externas, datos};
}

// ── Render de la resolución automática ──
function renderAutoCortes(){
  const pasos = buscarCortes();
  cortesAuto = pasos;
  if(!pasos.length)
    return '<div class="verdict bad"><div class="verdict-t">Sin solución por cortes</div>'
      + 'No se ha encontrado ningún corte que deje tres o menos incógnitas. '
      + 'Esta armadura necesita empezar por el equilibrio de algún nudo.</div>';

  const resueltas = {};
  const cero = miembrosCero().map(c=>c.barra);
  cero.forEach(id=>{ resueltas[id] = 0; });

  let h = '';
  const total = barras.length, porCortes = pasos.reduce((s,p)=>s+p.nuevas, 0);
  const porSim = pasos.reduce((s,p)=>s + (p.espejos ? p.espejos.length : 0), 0);
  const objetivo = objetivoCortes();
  if(objetivo){
    const nom = [...objetivo].map(id=>nombreBarra(barras.find(b=>b.id===id))).join(', ');
    h += '<div class="verdict ok"><div class="verdict-t">Barras pedidas</div>'
      + '<b>' + nom + '</b> con <b>' + pasos.length + ' corte(s)</b>'
      + (porSim ? ', ' + porSim + ' barra(s) por simetría' : '') + '.</div>';
  } else
  h += '<div class="verdict ok"><div class="verdict-t">Secuencia encontrada</div>'
    + '<b>' + porCortes + ' de ' + total + ' barras</b> con <b>' + pasos.length + ' corte(s)</b>'
    + (porSim ? ', ' + porSim + ' por simetría' : '')
    + (cero.length ? ' (más ' + cero.length + ' de fuerza cero por inspección)' : '') + '.</div>';

  // Una tarjeta por corte, como la de un nudo (2026-10-11, directriz del
  // profesor): ecuaciones a la izquierda, dos líneas cada una, y la porción a la
  // derecha con el corte curvo.
  pasos.forEach((paso, i)=>{
    const previas = Object.assign({}, resueltas);
    const est = estrategiaPaso(paso, previas);
    corte = lineaDeCorte(paso);
    const info = {lado:paso.lado, cortadas:paso.cortadas,
                  incog:paso.sol.incog, cero:paso.cortadas.filter(b=>previas[b.id] !== undefined)};
    const nomLado = paso.lado.map(id=>nodos.find(n=>n.id===id).nombre).sort().join(', ');
    h += '<div class="joint-card"><div class="joint-h"><div class="joint-n">' + (i+1) + '</div>Corte ' + (i+1)
      + '<span style="color:var(--muted);font-weight:500;font-size:11px">porción ' + nomLado + '</span></div>'
      + '<div class="joint-body corte-body"><div>' + ecuacionesCorteHtml(est.items, paso.espejos) + '</div>'
      + '<div>' + svgPorcion(info, {datos:est.datos, externas:est.externas,
          pasos:est.items.map(x=>({tipo:x.tipo, centro:x.centro, val:x.val}))}) + '</div></div></div>';
    Object.keys(paso.sol.valores).forEach(id=>{ resueltas[id] = paso.sol.valores[id]; });
    (paso.espejos || []).forEach(e=>{ resueltas[e.barra] = resultado.fuerzas[e.barra]; });
  });

  // Con barras pedidas, solo cuentan las que faltan de esas.
  const faltan = barras.filter(b=>resueltas[b.id] === undefined && (!objetivo || objetivo.has(b.id)));
  if(faltan.length){
    h += '<div class="hint-sm">Sin corte válido para <b>' + faltan.map(b=>nombreBarra(b)).join(', ') + '</b>: salen del equilibrio de un nudo (valores en la tabla final).</div>';
  }
  return h;
}
