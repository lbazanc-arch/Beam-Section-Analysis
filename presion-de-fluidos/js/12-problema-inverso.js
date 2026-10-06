// ═══════════════════════════════════════════════════════════
//  12 · PROBLEMA INVERSO (2026-10-05, petición del profesor)
//  El nivel del líquido de una zona pasa a ser la incógnita. El alumno da una
//  condición sobre un resultado —el tope deja de empujar, una reacción llega a
//  un valor, la presa está a punto de volcar o de levantarse— y la app busca
//  los niveles que la cumplen.
//
//  No hay física nueva: cada nivel de prueba se resuelve con el motor de siempre
//  (analizar, 01-; analizarPresa, 10-), que lee el nivel con nivelZona. Cada
//  condición se escribe como un MARGEN m(h) que vale ≥ 0 cuando se cumple; sus
//  raíces se acotan con un barrido y se afinan por bisección. Por encima de la
//  compuerta las fuerzas del líquido son AFINES en h (la presión crece igual en
//  todos los puntos), así que ahí la raíz se obtiene exacta con dos evaluaciones.
//  Con dos raíces o más, se enseñan todas y cada una con su lectura, para que el
//  alumno elija la que pide su enunciado (decisión del profesor).
// ═══════════════════════════════════════════════════════════

let invVentana = null;      // estado de la ventana: {z, clave, valor, res}
let inversoActivo = null;   // el nivel elegido, para la pantalla de resultados

// La capa de arriba de la zona (la que tiene la superficie libre): su nivel es
// la incógnita. Las capas de debajo no se mueven.
function _capaSuperiorInv(z){
  let m = null;
  zonas[z].forEach(l=>{ if(isFinite(l.niv) && isFinite(l.g) && (!m || l.niv > m.niv)) m = l; });
  return m;
}
// Evalúa fn() con el nivel de la zona z puesto en h y lo deja como estaba.
function _conNivelInv(z, h, fn){
  const c = _capaSuperiorInv(z);
  if(!c) return null;
  const v0 = c.niv;
  c.niv = h;
  try{ return fn(); }
  catch(e){ return null; }
  finally{ c.niv = v0; }
}

// ── Las condiciones que admite el modelo que hay en el lienzo ──
function condicionesInverso(){
  const out = [];
  const inc = tramos.length ? listaIncognitas() : [];
  const nEq = 3 + nodos.filter(n=>n.rotula).length;
  if(tramos.length && inc.length === nEq){
    inc.filter(u=>u.tipo === 'T').forEach(u=>{
      out.push({clave:'tope:' + u.n.id, tipo:'tope', nid:u.n.id, tinc:'T', grupo:'Compuerta',
        nomHtml:simbIncognitaHtml(u), nomTex:simbIncognita(u),
        tit:'El tope en ' + u.n.nombre + ' deja de empujar',
        sub:'Su fuerza ' + simbIncognitaHtml(u) + ' llega a cero: la compuerta está a punto de abrirse.'});
    });
    inc.forEach(u=>{
      out.push({clave:'reac:' + u.n.id + ':' + u.tipo, tipo:'reac', nid:u.n.id, tinc:u.tipo, grupo:'Compuerta',
        nomHtml:simbIncognitaHtml(u), nomTex:simbIncognita(u),
        tit:'La ' + (u.tipo === 'T' ? 'fuerza del tope ' : 'reacción ') + simbIncognitaHtml(u) + ' llega a un valor',
        sub:u.tipo === 'T' ? 'El tope empuja con la fuerza límite que escribas.'
                           : 'Su magnitud alcanza el valor límite que escribas (p. ej., la tracción máxima).'});
    });
  }
  presas.forEach(p=>{
    const g = geomPresa(p);
    if(g.error) return;
    const nom = nombrePresa(p);
    out.push({clave:'vuelco:' + p.id, tipo:'vuelco', pid:p.id, grupo:nom,
      tit:nom + ' a punto de volcar',
      sub:'La normal N de la base llega a la arista de aguas abajo.'});
    out.push({clave:'levanta:' + p.id, tipo:'levanta', pid:p.id, grupo:nom,
      tit:nom + ' a punto de levantarse',
      sub:'La normal N de la base llega a cero: el empuje vertical iguala al peso.'});
  });
  return out;
}

// ── Lo que vale la condición con el nivel h ──
// Devuelve {q, m, v?}: q, la magnitud que se dibuja en la gráfica; m, el margen
// (≥ 0 = se cumple); v, el valor con signo de la incógnita (para extrapolar).
function evaluarInverso(c, z, h){
  return _conNivelInv(z, h, ()=>{
    if(c.tipo === 'tope' || c.tipo === 'reac'){
      const r = analizar();
      if(r.error) return null;
      const j = r.inc.findIndex(u=>u.n.id === c.nid && u.tipo === c.tinc);
      if(j < 0) return null;
      const v = r.val[j];
      if(c.tipo === 'tope') return {q:v, m:v, v};
      // Un tope solo empuja: su fuerza cuenta con signo (negativa = compuerta abierta).
      if(c.tinc === 'T') return {q:v, m:c.valor - v, v, u:r.inc[j]};
      return {q:Math.abs(v), m:c.valor - Math.abs(v), v, u:r.inc[j]};
    }
    const p = presa(c.pid);
    if(!p) return null;
    const rp = analizarPresa(p);
    if(rp.error) return null;
    if(c.tipo === 'levanta') return {q:rp.N, m:rp.N};
    if(!(rp.N > 1e-12)) return null;                // levantada: el vuelco ya no tiene sentido
    // Vuelca por la arista hacia la que empuja el líquido (la de aguas abajo).
    const derecha = rp.SFx >= 0;
    return {q:rp.d, m:derecha ? rp.B - rp.d : rp.d, B:rp.B, derecha};
  });
}

// ── Rango de niveles que tiene sentido probar ──
// Compuerta: del punto más bajo al más alto (por encima, la condición es afín y se
// extrapola). Presa: de la base a la corona (el agua no rebasa la presa). Con varias
// capas, la superficie libre no puede bajar de la capa siguiente.
function rangoInverso(c, z){
  const capas = capasOrdenadas(z);
  const piso = capas.length > 1 ? capas[1].niv : -Infinity;
  let lo, hi, ref, refNom, abierto;
  if(c.tipo === 'tope' || c.tipo === 'reac'){
    let bajo = nodos[0];
    nodos.forEach(n=>{ if(n.y < bajo.y) bajo = n; });
    lo = bajo.y; hi = Math.max(...nodos.map(n=>n.y));
    ref = bajo.y; refNom = 'sobre ' + bajo.nombre + ', el punto más bajo de la compuerta';
    abierto = true;
  } else {
    const g = geomPresa(presa(c.pid));
    lo = g.base.y; hi = Math.max(...g.verts.map(q=>q.y));
    ref = lo; refNom = 'sobre la base de la presa';
    abierto = false;
  }
  const tol = 1e-9*Math.max(1, Math.abs(hi - lo));
  if(isFinite(piso)) lo = Math.max(lo, piso + tol);
  if(hi < lo) hi = lo;
  return {lo, hi, ref, refNom, abierto, piso};
}

// ── La búsqueda ──
function resolverInverso(c, z){
  const rg = rangoInverso(c, z);
  const span = Math.max(rg.hi - rg.lo, 1e-9);
  const N = 160;
  const muestras = [];
  for(let i=0;i<=N;i++){
    const h = rg.lo + span*i/N;
    const e = evaluarInverso(c, z, h);
    muestras.push({h, e: (e && isFinite(e.m)) ? e : null});
  }
  const raices = [];
  const mDe = h => { const e = evaluarInverso(c, z, h); return (e && isFinite(e.m)) ? e.m : NaN; };
  const meter = h => {
    if(raices.some(r=>Math.abs(r - h) < 1e-6*Math.max(1, span))) return;
    raices.push(h);
  };
  for(let i=0;i<N;i++){
    const a = muestras[i], b = muestras[i+1];
    if(!a.e || !b.e) continue;
    if(a.e.m === 0){ meter(a.h); continue; }
    if(a.e.m*b.e.m > 0) continue;
    if(b.e.m === 0){ meter(b.h); continue; }
    // bisección
    let x0 = a.h, x1 = b.h, m0 = a.e.m;
    for(let k=0;k<60;k++){
      const xm = (x0 + x1)/2, mm = mDe(xm);
      if(!isFinite(mm)) break;
      if(mm === 0){ x0 = x1 = xm; break; }
      if(m0*mm < 0) x1 = xm; else { x0 = xm; m0 = mm; }
    }
    meter((x0 + x1)/2);
  }
  // Por encima de la compuerta el valor con signo es afín en h: v = v1 + s(h − hi).
  let extra = null;
  if(rg.abierto){
    const d = Math.max(span, 1);
    const e1 = evaluarInverso(c, z, rg.hi), e2 = evaluarInverso(c, z, rg.hi + d), e3 = evaluarInverso(c, z, rg.hi + 2*d);
    if(e1 && e2 && e3 && isFinite(e1.v) && isFinite(e2.v) && isFinite(e3.v)){
      const s = (e2.v - e1.v)/d;
      const afin = Math.abs((e3.v - e1.v) - 2*(e2.v - e1.v)) <= 1e-6*Math.max(1, Math.abs(e1.v), Math.abs(e3.v));
      extra = {v1:e1.v, s, afin};
      if(afin && Math.abs(s) > 1e-12){
        const objetivos = c.tipo === 'tope' ? [0] : (c.tinc === 'T' ? [c.valor] : [c.valor, -c.valor]);
        objetivos.forEach(t=>{
          const h = rg.hi + (t - e1.v)/s;
          if(h > rg.hi + 1e-9*Math.max(1, span)) meter(h);
        });
      }
    }
  }
  raices.sort((a,b)=>a - b);
  // Lectura de cada raíz: de qué lado se cumple la condición.
  const sol = raices.map(h=>{
    const dlt = 2e-3*span;
    const ab = mDe(h - dlt), ar = mDe(h + dlt);
    const e = evaluarInverso(c, z, h);
    return {h, abajo: Math.sign(ab), arriba: Math.sign(ar), e};
  });
  // Curva: del piso del rango a un poco más allá de la última raíz.
  let hiPlot = rg.hi;
  if(rg.abierto && sol.length) hiPlot = Math.max(rg.hi, sol[sol.length-1].h);
  if(rg.abierto) hiPlot += 0.25*Math.max(hiPlot - rg.lo, 1e-9);
  const curva = [];
  const NC = 140;
  for(let i=0;i<=NC;i++){
    const h = rg.lo + (hiPlot - rg.lo)*i/NC;
    const e = evaluarInverso(c, z, h);
    if(e && isFinite(e.q)) curva.push({h, q:e.q, m:e.m});
  }
  // Signo del margen en todo el rango, para explicar por qué no hay solución.
  const ms = muestras.filter(s=>s.e).map(s=>s.e.m);
  const siempre = !ms.length ? 0 : (ms.every(m=>m > 0) ? 1 : (ms.every(m=>m < 0) ? -1 : 0));
  return {c, z, rg, sol, curva, siempre, extra, hiPlot};
}

// ── Textos ──
function _hInv(res, h){ return dec(h - res.rg.ref, 'len') + ' ' + unitLen; }
function _cotaInv(h){ return dec(h, 'len') + ' ' + unitLen; }
function _nomCondInv(c){
  if(c.tipo === 'tope') return 'la fuerza del tope';
  if(c.tipo === 'reac') return '|' + c.nomHtml + '|';
  if(c.tipo === 'vuelco') return 'la posición de N';
  return 'la normal N';
}
// Lectura de una raíz: qué pasa por debajo y por encima de ella (≥ 0 = se cumple).
function lecturaRaizInv(res, s){
  const c = res.c;
  let V = dec(c.valor, 'f') + ' ' + unitFor;
  const sube = s.abajo > 0 && s.arriba < 0, baja = s.abajo < 0 && s.arriba > 0;
  if(c.tipo === 'tope'){
    if(sube) return {etq:'Nivel máximo', txt:'Hasta este nivel el tope empuja y la compuerta sigue cerrada; si el líquido sube más, la fuerza del tope saldría negativa y <b>la compuerta se abre</b>.'};
    if(baja) return {etq:'Nivel mínimo', txt:'Por debajo de este nivel la compuerta se abre; desde aquí el líquido la mantiene contra el tope. Es lo mínimo que hace falta para que <b>siga cerrada</b>.'};
    return {etq:'Toca cero', txt:'La fuerza del tope llega a cero justo en este nivel y vuelve a empujar: la compuerta queda a punto de abrirse, sin llegar a hacerlo.'};
  }
  if(c.tipo === 'reac'){
    if(c.tinc !== 'T' && s.e && s.e.u){
      const sr = sentidoRealIncognita(s.e.u, s.e.v);
      V = V + ' (' + iconoSentidoHtml(sr.x, sr.y) + ')';
    }
    if(sube) return {etq:'Nivel máximo', txt:'Por debajo de este nivel ' + c.nomHtml + ' no llega a ' + V + '; si el líquido sube más, <b>la supera</b>.'};
    if(baja) return {etq:'Nivel mínimo', txt:'Por debajo de este nivel ' + c.nomHtml + ' pasa de ' + V + '; por encima queda por debajo del límite.'};
    return {etq:'Toca el límite', txt:c.nomHtml + ' alcanza ' + V + ' justo en este nivel y vuelve a bajar.'};
  }
  if(c.tipo === 'vuelco'){
    if(sube) return {etq:'Nivel máximo', txt:'Hasta este nivel la normal N cae dentro de la base; si el agua sube más, N saldría por la arista de aguas abajo y <b>la presa vuelca</b>.'};
    if(baja) return {etq:'Nivel mínimo', txt:'Por debajo de este nivel N sale de la base y la presa vuelca; desde aquí el líquido la mantiene en pie.'};
    return {etq:'Toca la arista', txt:'N llega a la arista justo en este nivel y vuelve a entrar en la base.'};
  }
  if(sube) return {etq:'Nivel máximo', txt:'Hasta este nivel la base sigue comprimida (N > 0); si el agua sube más, el empuje vertical supera al peso y <b>la presa se levanta</b>.'};
  if(baja) return {etq:'Nivel mínimo', txt:'Por debajo de este nivel la presa se levanta; desde aquí la base queda comprimida.'};
  return {etq:'Toca cero', txt:'N llega a cero justo en este nivel y vuelve a ser positiva.'};
}
// Sin raíz: por qué.
function sinSolucionInv(res){
  const c = res.c, rg = res.rg;
  const tope = rg.abierto ? 'a ninguna altura' : 'ni con el agua en la corona';
  if(res.siempre === 0) return 'No se pudo evaluar la condición en el rango de niveles: revisa que el modelo se resuelva con «Calcular».';
  if(c.tipo === 'tope') return res.siempre > 0
    ? 'El tope empuja con cualquier nivel: <b>la compuerta no se abre ' + tope + '</b>.'
    : 'La fuerza del tope sale negativa con cualquier nivel: la compuerta está siempre abierta. Revisa de qué lado está el tope.';
  if(c.tipo === 'reac') return res.siempre > 0
    ? '|' + c.nomHtml + '| no llega a ' + dec(c.valor,'f') + ' ' + unitFor + ' con ningún nivel.'
    : '|' + c.nomHtml + '| supera ' + dec(c.valor,'f') + ' ' + unitFor + ' con cualquier nivel.';
  if(c.tipo === 'vuelco') return res.siempre > 0
    ? 'Aun con el agua a la altura de la corona, N cae dentro de la base: <b>la presa no vuelca</b>.'
    : 'Con cualquier nivel N sale de la base: la presa no se sostiene.';
  return res.siempre > 0
    ? 'Aun con el agua a la altura de la corona, N sigue siendo positiva: <b>la presa no se levanta</b>.'
    : 'Con cualquier nivel N sale negativa: la presa no se sostiene.';
}

// ── La gráfica: la magnitud frente a h, con el límite y las soluciones ──
function curvaInversoSVG(res, elegida){
  const W = 560, H = 240, M = {l:58, r:84, t:16, b:40};
  const pts = res.curva;
  if(pts.length < 2) return '';
  const c = res.c, ref = res.rg.ref;
  const lims = [];
  if(c.tipo === 'tope' || c.tipo === 'levanta') lims.push({q:0, t:'cero'});
  if(c.tipo === 'reac') lims.push({q:c.valor, t:'límite ' + dec(c.valor,'f')});
  let B = null;
  if(c.tipo === 'vuelco'){
    const g = geomPresa(presa(c.pid)); B = g.base.x1 - g.base.x0;
    lims.push({q:0, t:'d = 0'}); lims.push({q:B, t:'d = B'});
  }
  let qmin = Math.min(...pts.map(p=>p.q), ...lims.map(l=>l.q));
  let qmax = Math.max(...pts.map(p=>p.q), ...lims.map(l=>l.q));
  if(qmax - qmin < 1e-9){ qmax += 1; qmin -= 1; }
  const pad = 0.08*(qmax - qmin); qmin -= pad; qmax += pad;
  const hmin = pts[0].h - ref, hmax = pts[pts.length-1].h - ref;
  const X = h => M.l + (h - ref - hmin)/(hmax - hmin)*(W - M.l - M.r);
  const Y = q => H - M.b - (q - qmin)/(qmax - qmin)*(H - M.t - M.b);
  let s = '<svg class="inv-curva" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">';
  // marcas de los ejes
  const marcas = (a, b, n) => { const paso = Math.pow(10, Math.floor(Math.log10((b - a)/n))); const k = [1,2,5,10].find(f=>(b - a)/(paso*f) <= n) || 10; const st = paso*k; const out = []; for(let v = Math.ceil(a/st)*st; v <= b + 1e-9*st; v += st) out.push(v); return out; };
  marcas(qmin, qmax, 5).forEach(v=>{
    s += '<line x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#eef1f4"/>'
       + '<text x="' + (M.l - 6) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" font-size="10" text-anchor="end" fill="#6b7280">' + (+v.toFixed(6)) + '</text>';
  });
  marcas(hmin, hmax, 6).forEach(v=>{
    s += '<line x1="' + X(v + ref).toFixed(1) + '" x2="' + X(v + ref).toFixed(1) + '" y1="' + M.t + '" y2="' + (H - M.b) + '" stroke="#eef1f4"/>'
       + '<text x="' + X(v + ref).toFixed(1) + '" y="' + (H - M.b + 14) + '" font-size="10" text-anchor="middle" fill="#6b7280">' + (+v.toFixed(6)) + '</text>';
  });
  s += '<rect x="' + M.l + '" y="' + M.t + '" width="' + (W - M.l - M.r) + '" height="' + (H - M.t - M.b) + '" fill="none" stroke="#c9d1d9"/>';
  // franja de la base (vuelco)
  if(c.tipo === 'vuelco' && B !== null)
    s += '<rect x="' + M.l + '" y="' + Y(B).toFixed(1) + '" width="' + (W - M.l - M.r) + '" height="' + (Y(0) - Y(B)).toFixed(1) + '" fill="#0f5c56" opacity=".06"/>';
  lims.forEach(l=>{
    s += '<line x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(l.q).toFixed(1) + '" y2="' + Y(l.q).toFixed(1) + '" stroke="#6b7280" stroke-dasharray="5 4"/>'
       + '<text x="' + (W - M.r + 5) + '" y="' + (Y(l.q) + 3.5).toFixed(1) + '" font-size="9.5" fill="#6b7280">' + l.t + '</text>';
  });
  // la curva, en el acento donde se cumple y en rojo donde no
  for(let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1];
    const ok = (a.m + b.m)/2 >= 0;
    s += '<line x1="' + X(a.h).toFixed(1) + '" y1="' + Y(a.q).toFixed(1) + '" x2="' + X(b.h).toFixed(1) + '" y2="' + Y(b.q).toFixed(1)
       + '" stroke="' + (ok ? '#0f5c56' : '#c0392b') + '" stroke-width="2.4" stroke-linecap="round"/>';
  }
  // las soluciones
  res.sol.forEach((so, i)=>{
    const e = so.e; if(!e || !isFinite(e.q)) return;
    const x = X(so.h), y = Y(e.q), sel = (elegida === i);
    s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" y2="' + (H - M.b) + '" stroke="#0b3f3a" stroke-dasharray="2 3"/>'
       + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (sel ? 6 : 4.5) + '" fill="' + (sel ? '#0b3f3a' : '#fff') + '" stroke="#0b3f3a" stroke-width="2"/>'
       // a la derecha de su línea, o a la izquierda si queda cerca del borde
       + '<text x="' + (x + (x > W - M.r - 70 ? -5 : 5)).toFixed(1) + '" y="' + (H - M.b - 7) + '"' + (x > W - M.r - 70 ? ' text-anchor="end"' : '')
       + ' font-size="11" font-weight="700" fill="#0b3f3a" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">h'
       + (res.sol.length > 1 ? '<tspan font-size="8" dy="3">' + (i+1) + '</tspan><tspan dy="-3">' : '<tspan>') + ' = ' + dec(so.h - ref, 'len') + '</tspan></text>';
  });
  const nomTxt = c.nomHtml ? c.nomHtml.replace(/<sub>(.*?)<\/sub>/g, '<tspan font-size="8" dy="3">$1</tspan><tspan dy="-3"> </tspan>') : '';
  const yl = c.tipo === 'vuelco' ? 'd, posición de N desde O (' + unitLen + ')'
           : (c.tipo === 'reac' && c.tinc !== 'T' ? '|' + nomTxt + '| (' + unitFor + ')'
           : (c.tipo === 'levanta' ? 'N (' + unitFor + ')' : nomTxt + ' (' + unitFor + ')'));
  s += '<text x="' + ((M.l + W - M.r)/2) + '" y="' + (H - 6) + '" font-size="11" text-anchor="middle" fill="#374151">h, altura del líquido ' + (c.tipo === 'vuelco' || c.tipo === 'levanta' ? 'sobre la base' : 'sobre el punto más bajo') + ' (' + unitLen + ')</text>'
     + '<text transform="translate(13 ' + ((M.t + H - M.b)/2) + ') rotate(-90)" font-size="11" text-anchor="middle" fill="#374151">' + yl + '</text>';
  s += '</svg>';
  return s;
}

// ═══ La ventana ═══
function abrirInverso(){
  const zs = [1, 2].filter(z=>_capaSuperiorInv(z));
  if(!zs.length){ aviso('Añade líquido en una zona (panel Líquidos): su nivel será la incógnita.'); return; }
  const conds = condicionesInverso();
  if(!conds.length){ aviso('No hay nada que condicionar: arma una compuerta que se pueda resolver, o una presa.'); return; }
  const prev = invVentana || {};
  invVentana = {
    z: zs.indexOf(prev.z) >= 0 ? prev.z : zs[0],
    clave: conds.some(c=>c.clave === prev.clave) ? prev.clave : conds[0].clave,
    valor: isFinite(prev.valor) ? prev.valor : NaN,
    res: null, elegida: null
  };
  pintarInverso();
  document.getElementById('invModal').classList.add('show');
}
function cerrarInverso(){ document.getElementById('invModal').classList.remove('show'); }
function setZonaInverso(z){ invVentana.z = z; invVentana.res = null; pintarInverso(); }
function setCondInverso(clave){ _leerValorInverso(); invVentana.clave = clave; invVentana.res = null; pintarInverso(); }
function _leerValorInverso(){
  const e = document.getElementById('invValor');
  if(e){ const v = parseFloat(e.value); invVentana.valor = isFinite(v) ? Math.abs(v) : NaN; }
}
function pintarInverso(){
  const el = document.getElementById('invCuerpo');
  if(!el || !invVentana) return;
  const conds = condicionesInverso();
  const c = conds.find(q=>q.clave === invVentana.clave) || conds[0];
  invVentana.clave = c.clave;
  let h = '<div class="inv-lbl">Nivel que se busca</div><div class="inv-zonas">';
  [1, 2].forEach(z=>{
    const hay = !!_capaSuperiorInv(z);
    h += '<button class="modo-btn' + (invVentana.z === z ? ' active' : '') + '"' + (hay ? '' : ' disabled title="Esta zona no tiene líquido"')
       + ' onclick="setZonaInverso(' + z + ')">Zona ' + z + (z === 1 ? ' (izquierda)' : ' (derecha)') + '</button>';
  });
  h += '</div>';
  if(capasOrdenadas(invVentana.z).length > 1)
    h += '<div class="hint-sm">Se busca la superficie libre (la capa de arriba); las de debajo no se mueven.</div>';
  h += '<div class="inv-lbl">Condición</div><div class="inv-conds">';
  let grupo = null;
  conds.forEach(q=>{
    if(q.grupo !== grupo){ grupo = q.grupo; h += '<div class="inv-grupo">' + grupo + '</div>'; }
    h += '<button class="tpl-btn inv-cond' + (q.clave === c.clave ? ' active' : '') + '" onclick="setCondInverso(\'' + q.clave + '\')">'
       + '<b>' + q.tit + '</b><span>' + q.sub + '</span></button>';
    if(q.clave === c.clave && q.tipo === 'reac')
      h += '<div class="modal-field inv-valor"><label>Valor límite</label><input type="number" id="invValor" step="any" min="0" value="'
         + (isFinite(invVentana.valor) ? invVentana.valor : '') + '" placeholder="magnitud" onkeydown="if(event.key===\'Enter\')buscarInversoVentana()"><span style="font-size:11px">' + unitFor + '</span></div>';
  });
  h += '</div>';
  el.innerHTML = h;
  pintarResultadoInverso();
}
function buscarInversoVentana(){
  _leerValorInverso();
  const c = condicionesInverso().find(q=>q.clave === invVentana.clave);
  if(!c) return;
  if(c.tipo === 'reac'){
    if(!(invVentana.valor > 0)){ aviso('Escribe el valor límite de ' + c.nomHtml.replace(/<[^>]+>/g, '') + ' (mayor que cero).'); return; }
    c.valor = invVentana.valor;
  }
  invVentana.res = resolverInverso(c, invVentana.z);
  invVentana.elegida = null;
  pintarResultadoInverso();
}
function pintarResultadoInverso(){
  const el = document.getElementById('invRes');
  if(!el) return;
  const res = invVentana && invVentana.res;
  if(!res){ el.innerHTML = ''; return; }
  let h = '<div class="inv-res">';
  if(!res.sol.length){
    h += '<div class="verdict bad"><div class="verdict-t">Sin solución</div>' + sinSolucionInv(res) + '</div>';
  } else {
    h += '<div class="inv-lbl">' + (res.sol.length === 1 ? 'Solución' : res.sol.length + ' soluciones: elige la que pide tu enunciado') + '</div>';
    res.sol.forEach((s, i)=>{
      const l = lecturaRaizInv(res, s);
      h += '<div class="inv-sol">'
         + '<div class="inv-sol-cab"><span class="inv-h">h' + (res.sol.length > 1 ? '<sub>' + (i+1) + '</sub>' : '') + ' = ' + _hInv(res, s.h) + '</span>'
         + '<span class="inv-etq">' + l.etq + '</span></div>'
         + '<div class="inv-sol-sub">' + res.rg.refNom + ' · superficie libre en la cota y = ' + _cotaInv(s.h) + '</div>'
         + '<div class="inv-sol-txt">' + l.txt + '</div>'
         + '<button class="mbtn inv-usar" onclick="usarNivelInverso(' + i + ')">Usar este nivel y resolver</button>'
         + '</div>';
    });
  }
  h += curvaInversoSVG(res, invVentana.elegida);
  h += '<div class="hint-sm"><span style="color:#0f5c56;font-weight:700">━</span> se cumple · <span style="color:#c0392b;font-weight:700">━</span> no se cumple</div>';
  h += '</div>';
  el.innerHTML = h;
}

// ── Elegir una solución: el nivel pasa al modelo y se resuelve como siempre ──
function _huellaInverso(){
  return JSON.stringify({nodos, tramos, zonas, presas, pesos, b:anchoB(), u:[unitLen, unitFor]});
}
function usarNivelInverso(i){
  const res = invVentana.res, s = res.sol[i];
  const capa = _capaSuperiorInv(res.z);
  if(!capa) return;
  registrarCambio();
  capa.niv = Math.round(s.h*1e6)/1e6;
  invalidarResultados();
  refrescar();
  invVentana.elegida = i;
  const l = lecturaRaizInv(res, s);
  inversoActivo = {res, i, lectura:l, curva:curvaInversoSVG(res, i), huella:_huellaInverso(),
                   proceso:(typeof procesoInverso === 'function') ? procesoInverso(res, i) : null};
  cerrarInverso();
  calcular();
}
// ── Guardar y abrir (2026-10-05, decisión del profesor: el problema inverso va
// en el archivo del ejercicio) ──
// Se guarda la PREGUNTA (zona, condición, valor) y el nivel elegido; al abrir,
// se vuelve a resolver con el motor y se elige la solución de ese nivel.
function inversoGuardable(){
  const a = inversoActivo;
  if(!a || a.huella !== _huellaInverso()) return null;
  const c = a.res.c;
  return {z:a.res.z, clave:c.clave, valor:isFinite(c.valor) ? c.valor : null, h:a.res.sol[a.i].h};
}
function restaurarInverso(g){
  inversoActivo = null;
  if(!g || !g.clave) return;
  const c = condicionesInverso().find(q=>q.clave === g.clave);
  if(!c || !_capaSuperiorInv(g.z)) return;
  if(c.tipo === 'reac'){ if(!(g.valor > 0)) return; c.valor = g.valor; }
  const res = resolverInverso(c, g.z);
  if(!res.sol.length) return;
  let i = 0;
  res.sol.forEach((s, k)=>{ if(Math.abs(s.h - g.h) < Math.abs(res.sol[i].h - g.h)) i = k; });
  invVentana = {z:g.z, clave:g.clave, valor:c.valor, res, elegida:i};
  inversoActivo = {res, i, lectura:lecturaRaizInv(res, res.sol[i]), curva:curvaInversoSVG(res, i),
                   huella:_huellaInverso(), proceso:(typeof procesoInverso === 'function') ? procesoInverso(res, i) : null};
}
// La sección de la pantalla de resultados. Solo si el modelo sigue siendo el
// mismo con el que se eligió el nivel: cualquier cambio la retira.
function inversoHtml(){
  const a = inversoActivo;
  if(!a) return '';
  if(a.huella !== _huellaInverso()){ inversoActivo = null; return ''; }
  const res = a.res, s = res.sol[a.i];
  const c = res.c;
  let cond = c.tit;
  if(c.tipo === 'reac') cond += ': ' + dec(c.valor, 'f') + ' ' + unitFor;
  let h = '<div class="res-section"><div class="res-title"><div class="num">h</div>Problema inverso: el nivel del líquido</div>'
    + '<div class="verdict ok"><div class="verdict-t">Condición · zona ' + res.z + '</div>' + cond + '</div>'
    + '<div class="summary-grid">'
    + '<div class="summary-box hl"><div class="s-lbl">Altura del líquido h</div><div class="s-val">' + dec(s.h - res.rg.ref, 'len') + ' <span class="s-unit">' + unitLen + '</span></div></div>'
    + '<div class="summary-box"><div class="s-lbl">Cota de la superficie libre</div><div class="s-val">' + dec(s.h, 'len') + ' <span class="s-unit">' + unitLen + '</span></div></div>'
    + '</div>'
    + '<div class="hint-sm" style="margin:-4px 0 8px">h medida ' + res.rg.refNom + '.</div>'
    + '<div class="proc-block"><div class="proc-sub">' + a.lectura.etq + '</div><div style="font-size:12px;line-height:1.5">' + a.lectura.txt + '</div>';
  if(res.sol.length > 1)
    h += '<div class="hint-sm">Otras soluciones: ' + res.sol.map((o, k)=>k === a.i ? null : 'h<sub>' + (k+1) + '</sub> = ' + _hInv(res, o.h) + ' (' + lecturaRaizInv(res, o).etq.toLowerCase() + ')').filter(Boolean).join(' · ') + '.</div>';
  h += '</div>' + (typeof procesoInversoHtml === 'function' ? procesoInversoHtml(a.proceso) : '') + a.curva
    + '<div class="hint-sm"><span style="color:#0f5c56;font-weight:700">━</span> se cumple · <span style="color:#c0392b;font-weight:700">━</span> no se cumple. Debajo, la resolución con este nivel.</div>'
    + '</div>';
  return h;
}
