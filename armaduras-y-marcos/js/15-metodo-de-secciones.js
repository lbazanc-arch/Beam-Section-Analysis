// ═══════════════════════════════════════════════════════════
//  MÉTODO DE SECCIONES
// ═══════════════════════════════════════════════════════════

// (definición obsoleta de setMetodo eliminada: no contemplaba el submodo
//  de cortes automático/manual y quedaba oculta por la versión posterior)


// ── Intersección de dos segmentos ──
function cortanSegmentos(ax,ay,bx,by, cx,cy,dx2,dy2){
  const r1 = bx-ax, r2 = by-ay, s1 = dx2-cx, s2 = dy2-cy;
  const den = r1*s2 - r2*s1;
  if(Math.abs(den) < 1e-12) return false;
  const t = ((cx-ax)*s2 - (cy-ay)*s1)/den;
  const u = ((cx-ax)*r2 - (cy-ay)*r1)/den;
  return t > 1e-9 && t < 1-1e-9 && u > -1e-9 && u < 1+1e-9;
}

// ── Barras cortadas y partición de la armadura ──
function analizarCorte(){
  if(!corte) return {valido:false, motivo:'sin-corte'};
  const cortadas = barras.filter(b=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    if(!na||!nb) return false;
    return cortanSegmentos(na.x,na.y,nb.x,nb.y, corte.x1,corte.y1,corte.x2,corte.y2);
  });
  if(!cortadas.length) return {valido:false, motivo:'no-corta', cortadas:[]};

  // Al quitar las barras cortadas la armadura debe quedar en DOS partes
  const ids = cortadas.map(b=>b.id);
  const ady = {};
  nodos.forEach(n=>ady[n.id] = []);
  barras.forEach(b=>{
    if(ids.indexOf(b.id) >= 0) return;
    ady[b.a].push(b.b); ady[b.b].push(b.a);
  });
  const visto = {}, comps = [];
  nodos.forEach(n=>{
    if(visto[n.id]) return;
    const cola = [n.id], comp = [];
    visto[n.id] = true;
    while(cola.length){
      const x = cola.shift(); comp.push(x);
      ady[x].forEach(y=>{ if(!visto[y]){ visto[y] = true; cola.push(y); } });
    }
    comps.push(comp);
  });
  if(comps.length !== 2)
    return {valido:false, motivo:'no-separa', cortadas, partes:comps.length};

  // Las barras ya conocidas (fuerza cero) no cuentan como incógnita. `cero` son
  // solo las de fuerza cero QUE CRUZA EL CORTE (ids): miembrosCero() devuelve las
  // de toda la armadura, y la figura y el texto de la porción las daban por cortadas.
  const ceroTodas = miembrosCero().map(c=>c.barra);
  const incog = cortadas.filter(b=>ceroTodas.indexOf(b.id) < 0);
  const cero = cortadas.filter(b=>ceroTodas.indexOf(b.id) >= 0).map(b=>b.id);
  if(incog.length > 3)
    return {valido:false, motivo:'muchas', cortadas, incog, cero};

  // Lado a analizar: el que tenga menos cargas y reacciones
  const peso = comp => comp.reduce((s,id)=>{
    const n = nodos.find(z=>z.id===id);
    return s + ((!esCero(n.fx)||!esCero(n.fy)) ? 1 : 0) + gradosApoyo(n);
  }, 0);
  const lado = peso(comps[0]) <= peso(comps[1]) ? comps[0] : comps[1];
  const otro = lado === comps[0] ? comps[1] : comps[0];
  return {valido:true, cortadas, incog, cero, lado, otro};
}

// ── Resolución estratégica de la sección ──
// Para cada incógnita se busca el punto donde se cruzan las líneas de acción de
// las OTRAS dos: tomando momentos ahí, esas dos desaparecen y la incógnita queda
// despejada en una sola ecuación. Si las otras dos son paralelas, se proyecta el
// equilibrio en la dirección perpendicular a ellas, con el mismo efecto.
function lineaBarra(b){
  const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
  const dx = nb.x-na.x, dy = nb.y-na.y, L = Math.hypot(dx,dy);
  return {px:na.x, py:na.y, ux:dx/L, uy:dy/L};
}
function corteRectas(r1, r2){
  const den = r1.ux*r2.uy - r1.uy*r2.ux;
  if(Math.abs(den) < 1e-9) return null;         // paralelas
  const t = ((r2.px-r1.px)*r2.uy - (r2.py-r1.py)*r2.ux)/den;
  return {x:r1.px + r1.ux*t, y:r1.py + r1.uy*t};
}

// ── Ecuaciones de un corte, una por incógnita ──
// Solo se usan ΣM respecto de un NUDO y ΣF_x o ΣF_y (revisión del PDF, 2026-09-04):
// nada de sumas en un eje inclinado. Se resuelve primero por momentos: para cada
// incógnita se busca un nudo por cuya posición pasen las líneas de TODAS las demás
// incógnitas todavía pendientes (así desaparecen) y que no esté en la línea de la
// propia barra. Cuando ya no queda otra pendiente, ΣF en el eje donde la barra
// tiene más componente. Las barras halladas antes en este mismo corte entran como
// términos conocidos (con `ref`, para citarlas). Solo si dos incógnitas pendientes
// no se cruzan en ningún nudo se toma el punto O de su cruce, que la figura rotula
// y el pie define. Lo comparten el corte manual y el resolutor automático.
function ecuacionesDeCorte(datos, externas, fallbackVal){
  const EPS = 1e-9;
  const enRecta = (n, r) => Math.abs((n.x-r.px)*r.uy - (n.y-r.py)*r.ux) < 1e-6;
  const rectaDe = d => lineaBarra(d.barra);
  const pendientes = datos.slice(), resueltos = [], items = [];
  const fuerzas = () => externas.concat(resueltos.map(r=>({x:r.d.px, y:r.d.py, fx:r.val*r.d.ux, fy:r.val*r.d.uy, et:'F'+r.d.nombre, ref:r.d.barra.id})));
  const armar = (d, otros, tipo, centro, eje) => {
    const dirN = tipo === 'fuerza' ? (eje === 'y' ? {x:0,y:1} : {x:1,y:0}) : null;
    let coef = 0, indep = 0; const detalle = [], citas = [];
    fuerzas().forEach(e=>{
      const t = tipo === 'momento' ? (e.x-centro.x)*e.fy - (e.y-centro.y)*e.fx : e.fx*dirN.x + e.fy*dirN.y;
      if(Math.abs(t) > EPS){ indep += t; detalle.push({et:e.et, val:t, ref:e.ref, x:e.x, y:e.y, fx:e.fx, fy:e.fy}); if(e.ref && citas.indexOf(e.ref) < 0) citas.push(e.ref); }
    });
    coef = tipo === 'momento' ? (d.px-centro.x)*d.uy - (d.py-centro.y)*d.ux : d.ux*dirN.x + d.uy*dirN.y;
    const val = Math.abs(coef) > EPS ? -indep/coef : (fallbackVal ? fallbackVal(d.barra.id) : NaN);
    return {d, tipo, centro, dirN, eje, coef, indep, detalle, val, citas, otros:otros.map(o=>o.nombre)};
  };
  let guardia = 0;
  while(pendientes.length && guardia++ < 20){
    let hecho = null;
    for(const d of pendientes){
      const otros = pendientes.filter(o=>o!==d);
      if(!otros.length){
        hecho = armar(d, otros, 'fuerza', null, Math.abs(d.uy) >= Math.abs(d.ux) ? 'y' : 'x'); break;
      }
      const rd = rectaDe(d), rs = otros.map(rectaDe);
      const cand = nodos.filter(n => !enRecta(n, rd) && rs.every(r=>enRecta(n, r)));
      if(!cand.length) continue;    // esta todavía no: que otra se resuelva antes
      const c = cand.reduce((m,n)=>Math.hypot(n.x-d.px,n.y-d.py) < Math.hypot(m.x-d.px,m.y-d.py) ? n : m, cand[0]);
      hecho = armar(d, otros, 'momento', {x:c.x, y:c.y, nombre:c.nombre}, null); break;
    }
    if(!hecho){
      // Ninguna pendiente tiene nudo: punto O en el cruce de las líneas de las otras.
      const d = pendientes[0], otros = pendientes.filter(o=>o!==d), rs = otros.map(rectaDe);
      const centro = otros.length === 2 ? corteRectas(rs[0], rs[1]) : null;
      if(centro) hecho = armar(d, otros, 'momento', centro, null);
      else { console.warn('Corte: sin ecuación válida para ' + d.nombre); hecho = armar(d, otros, 'fuerza', null, Math.abs(d.uy) >= Math.abs(d.ux) ? 'y' : 'x'); }
    }
    items.push(hecho); resueltos.push(hecho); pendientes.splice(pendientes.indexOf(hecho.d), 1);
  }
  return items;
}

function resolverSeccion(info){
  const lado = info.lado;
  const enLado = id => lado.indexOf(id) >= 0;

  // Fuerzas conocidas que actúan sobre la porción
  const externas = [];
  lado.forEach(id=>{
    const n = nodos.find(z=>z.id===id);
    if(!esCero(n.fx) || !esCero(n.fy))
      externas.push({x:n.x, y:n.y, fx:n.fx, fy:n.fy, et:'Carga en '+n.nombre});
    const R = resultado.reacciones[id];
    if(R){
      if(R.rx !== undefined && !esCero(R.rx))
        externas.push({x:n.x, y:n.y, fx:R.rx, fy:0, et:'R'+n.nombre+'x'});
      if(R.ry !== undefined && !esCero(R.ry))
        externas.push({x:n.x, y:n.y, fx:0, fy:R.ry, et:'R'+n.nombre+'y'});
    }
  });
  // Barras cortadas ya conocidas (fuerza cero) aportan 0: se citan pero no suman
  const incog = info.incog;

  // Datos geométricos de cada incógnita vista desde la porción
  const datos = incog.map(b=>{
    const dentro = enLado(b.a) ? b.a : b.b;
    const fuera  = enLado(b.a) ? b.b : b.a;
    const nd = nodos.find(z=>z.id===dentro), nf = nodos.find(z=>z.id===fuera);
    const dx = nf.x-nd.x, dy = nf.y-nd.y, L = Math.hypot(dx,dy);
    return {barra:b, nombre:nombreBarra(b), px:nd.x, py:nd.y, ux:dx/L, uy:dy/L,
            nodoDentro:nd, nodoFuera:nf};
  });

  const pasos = ecuacionesDeCorte(datos, externas, null);
  return {pasos, externas, datos};
}

// ── Dibujo de la porción aislada ──
// Mismos criterios que el DCL de nudo en pantalla (dibujarDCL, 09-): las barras
// cortadas que se despejan en este corte van A TRAZOS, en gris neutro, saliendo
// de la porción (tracción supuesta) y rotuladas F_BC; las ya resueltas en un
// corte anterior, SÓLIDAS sobre su barra, en su color y su sentido real y con su
// valor; las de fuerza cero conocidas, en trazo fino gris «F_AB = 0». Reacciones
// (verde) y cargas (acento) llegan al nudo en su sentido real y con su valor; el
// rodillo inclinado es UNA reacción con el arco de su ángulo agudo. Nada se pisa:
// todo va al registro de 12- y los rótulos se colocan al final. Las letras de
// los ángulos siguen el orden de tikzSeccionPorcion (barras cortadas y cargas);
// el arco del rodillo inclinado, que el PDF dibuja por componentes, va el último
// para no cambiarlas. Los valores de los ángulos, en una línea bajo la figura.
function svgPorcion(info, sol){
  const W2 = 620, H2 = 340, M = 70;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dx = Math.max(x1-x0,1e-6), dy = Math.max(y1-y0,1e-6);
  const k = Math.min((W2-2*M)/dx, (H2-2*M)/dy);
  const ox = (W2-dx*k)/2 - x0*k, oy = (H2-dy*k)/2 + y1*k;
  const P = (x,y)=>[x*k+ox, oy-y*k];
  const enLado = id => info.lado.indexOf(id) >= 0;
  const coincide = (n, x, y) => Math.abs(n.x-x) < 1e-6 && Math.abs(n.y-y) < 1e-6;
  const reg = crearRegistro(SVG_ESC);
  const L = 50, g = 6, R = g + L;
  const gen = letrasGriegas(), arcos = [], arcosFin = [], pend = [];
  const ocupPorNudo = {}, ocupDe = n => (ocupPorNudo[n.id] = ocupPorNudo[n.id] || _angulosBarras(n).map(a => -a));
  const valorF = v => ' = ' + dec(Math.abs(v),'f') + ' ' + unitFor;
  let s = '';

  // parte descartada, muy tenue (no se registra: un rótulo puede ir encima)
  barras.forEach(b=>{
    if(enLado(b.a) && enLado(b.b)) return;
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const [ax,ay] = P(na.x,na.y), [bx,by] = P(nb.x,nb.y);
    s += '<line x1="'+ax.toFixed(1)+'" y1="'+ay.toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+by.toFixed(1)
       + '" stroke="#dfe3e8" stroke-width="2" stroke-dasharray="4,4"/>';
  });
  // barras de la porción
  barras.forEach(b=>{
    if(!(enLado(b.a) && enLado(b.b))) return;
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const [ax,ay] = P(na.x,na.y), [bx,by] = P(nb.x,nb.y);
    const f = resultado.fuerzas[b.id];
    const col = esCero(f) ? '#9aa3ad' : (f>0 ? '#1d4ed8' : '#c0392b');
    s += '<line x1="'+ax.toFixed(1)+'" y1="'+ay.toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+by.toFixed(1)
       + '" stroke="'+col+'" stroke-width="3"/>';
    reg.seg(ax, ay, bx, by, 1.5, 'barra', {radialDe:[na.id, nb.id]});
  });
  // línea del corte
  if(corte){
    const [cx1,cy1] = P(corte.x1,corte.y1), [cx2,cy2] = P(corte.x2,corte.y2);
    s += '<line x1="'+cx1.toFixed(1)+'" y1="'+cy1.toFixed(1)+'" x2="'+cx2.toFixed(1)+'" y2="'+cy2.toFixed(1)
       + '" stroke="#c0392b" stroke-width="2" stroke-dasharray="8,5" opacity=".7"/>';
    reg.seg(cx1, cy1, cx2, cy2, 1, 'corte');
  }
  // nudos (se pintan al final, encima de las flechas) y centros de momentos
  let puntos = '';
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    const dentro = enLado(n.id);
    puntos += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(dentro?5:3.5)+'" fill="'
       + (dentro?'#563aa8':'#dfe3e8')+'" stroke="#fff" stroke-width="1.5"/>';
    if(dentro) reg.caja(px, py, 10, 10, 'punto', {nudo:n.id, radialDe:[n.id]});
  });
  sol.pasos.forEach(p=>{
    if(p.tipo !== 'momento' || !p.centro) return;
    const [px,py] = P(p.centro.x, p.centro.y);
    if(px < -60 || px > W2+60 || py < -60 || py > H2+60) return;
    puntos += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="4" fill="none" stroke="#563aa8" stroke-width="1.6" stroke-dasharray="2,2"/>';
    if(!nodos.some(n=>enLado(n.id) && coincide(n, p.centro.x, p.centro.y))) reg.caja(px, py, 10, 10, 'punto', {nudo:'O'});
  });

  // Barras cortadas que se despejan aquí: incógnitas, saliendo de la porción.
  const incogIds = sol.datos.map(d=>d.barra.id);
  sol.datos.forEach(d=>{
    const nd = d.nd || d.nodoDentro;   // 'nd' en modo auto, 'nodoDentro' en modo manual
    const [px,py] = P(d.px, d.py);
    const ux = d.ux, uy = -d.uy;
    s += _svgFlecha(reg, px+ux*g, py+uy*g, px+ux*R, py+uy*R, SVG_COL.incog, {trazos:'5,3', extra:{radialDe:[nd.id]}});
    pend.push({ex:px+ux*R, ey:py+uy*R, dx:ux, dy:uy, r:{v:'F', s:d.nombre}, col:SVG_COL.incog, largo:L});
    arcos.push({ux, uy, col:SVG_COL.incog, radio:24, ox:px, oy:py});
  });
  // Barras cortadas ya conocidas: las resueltas en un corte anterior (en
  // `externas`, con su valor) y las de fuerza cero, sobre su barra.
  const conocida = (b, v) => {
    const dentro = enLado(b.a) ? b.a : b.b;
    const nd = nodos.find(z=>z.id===dentro), nf = nodos.find(z=>z.id === (dentro===b.a ? b.b : b.a));
    const Lb = Math.hypot(nf.x-nd.x, nf.y-nd.y), ux = (nf.x-nd.x)/Lb, uy = -(nf.y-nd.y)/Lb;
    const [px,py] = P(nd.x, nd.y), extra = {radialDe:[nd.id]}, nom = nombreBarra(b);
    let col;
    if(esCero(v)){
      col = SVG_COL.cero;
      s += _svgTrazoCero(reg, px+ux*g, py+uy*g, px+ux*R, py+uy*R, extra);
      pend.push({ex:px+ux*R, ey:py+uy*R, dx:ux, dy:uy, r:{v:'F', s:nom, t:' = 0'}, col, largo:L});
      return;
    }
    col = v > 0 ? SVG_COL.ten : SVG_COL.com;
    s += v > 0 ? _svgFlecha(reg, px+ux*g, py+uy*g, px+ux*R, py+uy*R, col, {extra})
               : _svgFlecha(reg, px+ux*R, py+uy*R, px+ux*g, py+uy*g, col, {extra});
    pend.push({ex:px+ux*R, ey:py+uy*R, dx:ux, dy:uy, col, largo:L,
               r:{v:'F', s:nom, t:' = ' + dec(Math.abs(v),'f') + ' ' + (v > 0 ? 'T' : 'C')}});
  };
  const yaDibujadas = incogIds.slice();
  sol.externas.forEach(e=>{
    if(!e.barra || e.conocida === undefined || yaDibujadas.indexOf(e.barra.id) >= 0) return;
    yaDibujadas.push(e.barra.id);
    conocida(e.barra, e.conocida);
  });
  (info.cero || []).forEach(c=>{
    const b = typeof c === 'object' ? c : barras.find(x=>x.id===c);
    // Solo las que cruza este corte: una barra entera fuera de la porción no actúa sobre ella.
    if(!b || yaDibujadas.indexOf(b.id) >= 0 || !esCero(resultado.fuerzas[b.id] || 0)
       || !(info.cortadas || []).some(x=>x.id===b.id)) return;
    yaDibujadas.push(b.id);
    conocida(b, 0);
  });

  // Fuerzas aplicadas en un nudo de la porción, por el lado que decide ladoCarga.
  const fuerzaNudo = (n, ux, uy, col, rot, lista, eje) => {
    const [px,py] = P(n.x, n.y);
    const c = ladoCarga(n, px, py, ux, uy, {reg, L, hueco:g, ocupados:ocupDe(n).concat(eje || []), lateral:16*Math.sqrt(SVG_ESC)});
    s += _svgFlecha(reg, c.x1, c.y1, c.x2, c.y2, col, {extra: c.lateral === 0 ? {radialDe:[n.id]} : {nudo:n.id}});
    ocupDe(n).push(c.ang);
    pend.push({ex:c.ex, ey:c.ey, dx:c.rx, dy:c.ry, r:rot, col, largo:L});
    lista.push({ux, uy, col, radio:18, ox:c.x1, oy:c.y1});
  };
  // Reacciones: ya conocidas, en su sentido real y con su valor.
  nodos.filter(n=>enLado(n.id)).forEach(n=>{
    const rr = resultado.reacciones[n.id];
    if(!rr) return;
    if(rr.inclinado){
      if(esCero(rr.mag)) return;
      const ar = rr.ang*Math.PI/180, sg = rr.mag > 0 ? 1 : -1;
      fuerzaNudo(n, sg*Math.cos(ar), -sg*Math.sin(ar), SVG_COL.reac, {v:'R', s:n.nombre, t:valorF(rr.mag)}, arcosFin);
    } else {
      if(rr.ry !== undefined && !esCero(rr.ry)) fuerzaNudo(n, 0, rr.ry > 0 ? -1 : 1, SVG_COL.reac, {v:'R', s:'y' + n.nombre, t:valorF(rr.ry)}, []);
      if(rr.rx !== undefined && !esCero(rr.rx)) fuerzaNudo(n, rr.rx > 0 ? 1 : -1, 0, SVG_COL.reac, {v:'R', s:'x' + n.nombre, t:valorF(rr.rx)}, []);
    }
  });
  // Cargas de la porción: con su valor, esquivando barras, reacciones y el eje del apoyo.
  sol.externas.forEach(e=>{
    if(e.barra || e.et.charAt(0) === 'R') return;
    const mag = Math.hypot(e.fx, e.fy);
    if(mag < 1e-9) return;
    const n = nodos.find(z=>coincide(z, e.x, e.y));
    if(!n) return;
    const eje = n.apoyo ? [{ang:180 - anguloDibujoApoyo(n), tol:30}] : [];
    fuerzaNudo(n, e.fx/mag, -e.fy/mag, SVG_COL.carga, {t:dec(mag,'f') + ' ' + unitFor}, arcos, eje);
  });

  const angulos = [];
  arcos.concat(arcosFin).forEach(a=>{
    const ar = _svgArco(reg, a.ox, a.oy, a.ux, a.uy, a.col, gen, a.radio);
    if(ar.svg){ s += ar.svg; angulos.push({letra:ar.letra, valor:ar.valor}); }
  });
  s += puntos;
  nodos.forEach(n=>{
    if(!enLado(n.id)) return;
    const [px,py] = P(n.x,n.y);
    s += _svgNombreNudo(reg, px, py, n.nombre, n.id, 12, null, 5);
  });
  pend.forEach(p=>{ s += _svgRotuloTrasExtremo(reg, p.ex, p.ey, p.dx, p.dy, p.r, p.col, p.largo); });
  const lin = _svgLineaAngulos(angulos);
  return _svgEnvolver(s, reg, {x0:0, y0:0, x1:W2, y1:H2}, 4)
    + (lin ? '<div class="dcl-ang">' + lin + '</div>' : '');
}

// ── Bloque de resultados del método de secciones ──
function renderSeccionCorte(){
  const info = analizarCorte();
  if(!info.valido){
    let t;
    if(info.motivo === 'sin-corte')
      t = 'Elige la herramienta <b>Corte</b> y arrastra una línea que atraviese la armadura.';
    else if(info.motivo === 'no-corta')
      t = 'El trazo no cruza ninguna barra. Arrastra la línea de modo que atraviese la armadura de lado a lado.';
    else if(info.motivo === 'no-separa')
      t = 'Ese corte no separa la armadura en dos partes: quedan ' + info.partes + '. '
        + 'Un corte válido debe dividirla por completo, como si la partieras en dos con una tijera.';
    else if(info.motivo === 'muchas')
      t = 'El corte cruza <b>' + info.incog.length + ' barras con fuerza desconocida</b>. '
        + 'La porción solo dispone de tres ecuaciones de equilibrio, así que como máximo puede tener tres incógnitas. '
        + 'Las barras de fuerza cero no cuentan, porque ya se conocen. Prueba con un corte más corto.';
    else t = 'Corte no válido.';
    return '<div class="verdict"><div class="verdict-t">Traza un corte</div>' + t + '</div>';
  }

  const sol = resolverSeccion(info);
  const uF = unitFor, uL = unitLen;
  const nomLado = info.lado.map(id=>nodos.find(n=>n.id===id).nombre).sort().join(', ');
  let h = '';

  h += '<div class="verdict ok"><div class="verdict-t">Corte válido</div>'
    + 'Cruza <b>' + info.cortadas.length + ' barra(s)</b>'
    + (info.cero.length ? ' (' + info.cero.length + ' de fuerza cero)' : '')
    + ', <b>' + info.incog.length + ' incógnita(s)</b>. Porción analizada: nudos <b>' + nomLado + '</b>.</div>';

  // La leyenda de los trazos va aquí, dentro de #corteBox y justo antes de la
  // figura: solo sale si hay DCL y se rehace con el corte (03- repinta #corteBox).
  h += leyendaDCL();
  h += '<div class="proc-block"><div class="proc-sub">Diagrama de cuerpo libre de la porción</div>'
    + svgPorcion(info, sol)
    + '<div class="hint-sm" style="margin-top:5px">Círculos punteados: centros de momentos.</div></div>';

  sol.pasos.forEach((p, i)=>{
    const d = p.d;
    h += '<div class="joint-card"><div class="joint-h"><div class="joint-n">' + (i+1) + '</div>'
      + 'Barra <b>' + d.nombre + '</b></div>';
    if(p.tipo === 'momento'){
      const cx = dec(p.centro.x,'len'), cy = dec(p.centro.y,'len');
      const nomC = p.centro.nombre || 'O';
      h += '<div class="hint-sm" style="margin-bottom:6px">Momentos respecto de <b>' + nomC + '</b> (' + cx + ' ; ' + cy + ') ' + uL
        + (p.otros.length ? ', por donde pasan <b>' + p.otros.join('</b> y <b>') + '</b>.' : '.') + '</div>';
      h += '<div class="eq-row"><div class="eq-body">'
        + kx('\\sum M_{' + nomC + '} = 0:\\quad ' + fmtNum2(p.coef) + '\\,F_{' + d.nombre + '}'
             + p.detalle.map(x=>(x.val>=0?' + ':' - ')+fmtNum2(Math.abs(x.val))).join('') + ' = 0')
        + '</div></div>';
    } else {
      h += '<div class="hint-sm" style="margin-bottom:6px">Suma de fuerzas en <b>' + p.eje + '</b>'
        + (p.citas && p.citas.length ? ', con las barras ya halladas en este corte sustituidas por su valor' : '') + ':</div>';
      h += '<div class="eq-row"><div class="eq-body">'
        + kx('\\sum F_' + p.eje + ' = 0:\\quad ' + fmtNum2(p.coef) + '\\,F_{' + d.nombre + '}'
             + p.detalle.map(x=>(x.val>=0?' + ':' - ')+fmtNum2(Math.abs(x.val))).join('') + ' = 0')
        + '</div></div>';
    }
    const real = resultado.fuerzas[d.barra.id];
    const tipo = esCero(p.val) ? '\\text{(fuerza cero)}'
               : (p.val > 0 ? '\\text{(tracción)}' : '\\text{(compresión)}');
    h += '<div class="eq-row"><div class="eq-body">'
      + kx('F_{' + d.nombre + '} = ' + dec(Math.abs(p.val),'f') + '\\;\\text{' + uF + '}\\;' + tipo)
      + '</div></div>';
    const coincide = Math.abs(p.val - real) < Math.max(1e-6, Math.abs(real)*1e-6);
    h += '<div class="hint-sm" style="color:' + (coincide ? '#15803d' : '#c0392b') + '">'
      + (coincide ? '✓ Coincide con el valor obtenido por el método de nudos.'
                  : '⚠ Discrepa del método de nudos (' + dec(Math.abs(real),'f') + ').') + '</div>';
    h += '</div>';
  });

  if(info.cero.length){
    const nom = info.cero.map(id=>nombreBarra(barras.find(b=>b.id===id)));
    h += '<div class="hint-sm">El corte también cruza <b>' + nom.join(', ') + '</b>, de fuerza cero: no cuentan como incógnitas.</div>';
  }

  return h;
}

function fmtNum2(v){
  const r = Math.round(v*10000)/10000;
  return (Math.abs(r) < 1e-9 ? 0 : r).toString();
}

// ═══════════════════════════════════════════════════════════
//  RESOLUTOR AUTOMÁTICO POR CORTES
//  Busca la secuencia más corta de cortes que resuelve la armadura.
//  Un corte es utilizable si separa la estructura en dos partes y deja
//  como mucho tres barras con fuerza desconocida en la porción aislada.
