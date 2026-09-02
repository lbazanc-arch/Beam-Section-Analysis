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
  if(m==='manual') setTool('corte');
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

// ── Búsqueda de la secuencia más corta ──
function buscarCortes(){
  if(!resultado) return [];
  const {mascaras, idx, n} = particionesPosibles();
  const conocidas = {};
  // las barras de fuerza cero se dan por sabidas: no gastan incógnita
  const cero = miembrosCero().map(c=>c.barra);
  cero.forEach(id=>{ conocidas[id] = 0; });

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
  return {x1:cx-dx*ext, y1:cy-dy*ext, x2:cx+dx*ext, y2:cy+dy*ext};
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
    externas.push({x:nd.x, y:nd.y, fx:v*dx/L, fy:v*dy/L, et:'F'+nombreBarra(b)+' (ya conocida)'});
  });

  const datos = paso.sol.geo.map(g=>({
    barra:g.barra, nombre:nombreBarra(g.barra), px:g.nd.x, py:g.nd.y,
    ux:g.ux, uy:g.uy, nd:g.nd
  }));

  const items = [];
  datos.forEach((d,i)=>{
    const otros = datos.filter((_,k)=>k!==i);
    let tipo, centro = null, dirN = null;
    if(otros.length === 2){
      centro = corteRectas(lineaBarra(otros[0].barra), lineaBarra(otros[1].barra));
      if(centro) tipo = 'momento';
      else { dirN = {x:-otros[0].uy, y:otros[0].ux}; tipo = 'fuerza'; }
    } else if(otros.length === 1){
      centro = {x:otros[0].px, y:otros[0].py}; tipo = 'momento';
    } else {
      tipo = 'fuerza';
      dirN = Math.abs(d.uy) > Math.abs(d.ux) ? {x:0,y:1} : {x:1,y:0};
    }
    let coef = 0, indep = 0;
    const detalle = [];
    if(tipo === 'momento'){
      coef = (d.px-centro.x)*d.uy - (d.py-centro.y)*d.ux;
      externas.forEach(e=>{
        const m = (e.x-centro.x)*e.fy - (e.y-centro.y)*e.fx;
        if(Math.abs(m) > 1e-9){ indep += m; detalle.push({et:e.et, val:m}); }
      });
    } else {
      coef = d.ux*dirN.x + d.uy*dirN.y;
      externas.forEach(e=>{
        const pr = e.fx*dirN.x + e.fy*dirN.y;
        if(Math.abs(pr) > 1e-9){ indep += pr; detalle.push({et:e.et, val:pr}); }
      });
    }
    const val = Math.abs(coef) > 1e-9 ? -indep/coef : paso.sol.valores[d.barra.id];
    items.push({d, tipo, centro, dirN, coef, indep, detalle, val,
                otros:otros.map(o=>o.nombre)});
  });
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
  h += '<div class="verdict ok"><div class="verdict-t">Secuencia encontrada</div>'
    + 'El programa ha resuelto <b>' + porCortes + ' de ' + total + ' barras</b> con solo '
    + '<b>' + pasos.length + ' corte(s)</b>'
    + (cero.length ? ', además de las ' + cero.length + ' de fuerza cero identificadas por inspección' : '')
    + '. En cada paso se elige el corte que resuelve más barras de una vez.</div>';

  pasos.forEach((paso, i)=>{
    const previas = Object.assign({}, resueltas);
    const est = estrategiaPaso(paso, previas);
    corte = lineaDeCorte(paso);
    const info = {lado:paso.lado, cortadas:paso.cortadas,
                  incog:paso.sol.incog, cero:paso.cortadas.filter(b=>previas[b.id] !== undefined)};
    const nomLado = paso.lado.map(id=>nodos.find(n=>n.id===id).nombre).sort().join(', ');
    const nomInc = paso.sol.incog.map(b=>nombreBarra(b)).join(', ');

    h += '<div class="joint-card"><div class="joint-h"><div class="joint-n">' + (i+1) + '</div>'
      + 'Corte ' + (i+1) + ' — resuelve <b>' + nomInc + '</b>'
      + '<span style="color:var(--muted);font-weight:500;font-size:11px">porción ' + nomLado + '</span></div>';
    h += '<div style="margin-bottom:8px">' + svgPorcion(info, {datos:est.datos, externas:est.externas,
          pasos:est.items.map(x=>({tipo:x.tipo, centro:x.centro, val:x.val}))}) + '</div>';

    est.items.forEach(p=>{
      const d = p.d;
      if(p.tipo === 'momento'){
        h += '<div class="hint-sm" style="margin:6px 0 2px">Momentos en (' + dec(p.centro.x,'len')
          + ' ; ' + dec(p.centro.y,'len') + ') ' + unitLen
          + (p.otros.length ? ', donde se cruzan ' + p.otros.join(' y ') + ', que así desaparecen' : '') + ':</div>'
          + '<div class="eq-row"><div class="eq-body">'
          + kx('\\sum M_{O} = 0:\\quad ' + fmtNum2(p.coef) + '\\,F_{' + d.nombre + '}'
               + p.detalle.map(x=>(x.val>=0?' + ':' - ')+fmtNum2(Math.abs(x.val))).join('') + ' = 0')
          + '</div></div>';
      } else {
        h += '<div class="hint-sm" style="margin:6px 0 2px">Proyección perpendicular a las otras barras cortadas:</div>'
          + '<div class="eq-row"><div class="eq-body">'
          + kx('\\sum F_{\\perp} = 0:\\quad ' + fmtNum2(p.coef) + '\\,F_{' + d.nombre + '}'
               + p.detalle.map(x=>(x.val>=0?' + ':' - ')+fmtNum2(Math.abs(x.val))).join('') + ' = 0')
          + '</div></div>';
      }
      const real = resultado.fuerzas[d.barra.id];
      const tipo = esCero(p.val) ? '\\text{(fuerza cero)}'
                 : (p.val > 0 ? '\\text{(tracción)}' : '\\text{(compresión)}');
      h += '<div class="eq-row"><div class="eq-body">'
        + kx('F_{' + d.nombre + '} = ' + dec(Math.abs(p.val),'f') + '\\;\\text{' + unitFor + '}\\;' + tipo)
        + '</div></div>';
      const bien = Math.abs(p.val - real) < Math.max(1e-6, Math.abs(real)*1e-6);
      h += '<div class="hint-sm" style="color:' + (bien?'#15803d':'#c0392b') + '">'
        + (bien ? '✓ Verificado contra la solución global.'
                : '⚠ Discrepa de la solución global (' + dec(Math.abs(real),'f') + ').') + '</div>';
    });
    h += '</div>';
    Object.keys(paso.sol.valores).forEach(id=>{ resueltas[id] = paso.sol.valores[id]; });
  });

  const faltan = barras.filter(b=>resueltas[b.id] === undefined);
  if(faltan.length){
    h += '<div class="teoria"><div class="teoria-t">Barras no alcanzadas por los cortes</div>'
      + 'Quedan <b>' + faltan.map(b=>nombreBarra(b)).join(', ') + '</b>. '
      + 'Ningún corte válido las deja con tres o menos incógnitas: se obtienen con el equilibrio de un nudo. '
      + 'Sus valores aparecen igualmente en la tabla final.</div>';
  }
  h += '<div class="teoria"><div class="teoria-t">Cómo elige el programa</div>'
    + 'Entre todos los cortes que separan la armadura en dos partes, se descartan los que dejan más de tres '
    + 'incógnitas, porque una porción solo aporta tres ecuaciones de equilibrio. De los válidos se toma el que '
    + 'resuelve más barras a la vez y, a igualdad, el de la porción con menos cargas y reacciones: '
    + 'ecuaciones más cortas y menos ocasiones de equivocarse.</div>';
  return h;
}
