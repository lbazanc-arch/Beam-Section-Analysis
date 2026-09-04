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

  // Las barras ya conocidas (fuerza cero) no cuentan como incógnita
  const cero = miembrosCero().map(c=>c.barra);
  const incog = cortadas.filter(b=>cero.indexOf(b.id) < 0);
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
function svgPorcion(info, sol){
  const W2 = 620, H2 = 340, M = 58;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dx = Math.max(x1-x0,1e-6), dy = Math.max(y1-y0,1e-6);
  const k = Math.min((W2-2*M)/dx, (H2-2*M)/dy);
  const ox = (W2-dx*k)/2 - x0*k, oy = (H2-dy*k)/2 + y1*k;
  const P = (x,y)=>[x*k+ox, oy-y*k];
  const enLado = id => info.lado.indexOf(id) >= 0;
  let s = '<svg viewBox="0 0 '+W2+' '+H2+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">';
  s += '<rect x="0" y="0" width="'+W2+'" height="'+H2+'" fill="#fff"/>';

  // parte descartada, muy tenue
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
  });
  // línea del corte
  if(corte){
    const [cx1,cy1] = P(corte.x1,corte.y1), [cx2,cy2] = P(corte.x2,corte.y2);
    s += '<line x1="'+cx1.toFixed(1)+'" y1="'+cy1.toFixed(1)+'" x2="'+cx2.toFixed(1)+'" y2="'+cy2.toFixed(1)
       + '" stroke="#c0392b" stroke-width="2" stroke-dasharray="8,5"/>';
  }
  // fuerzas de las barras cortadas, dibujadas hacia afuera (tracción supuesta)
  sol.datos.forEach((d,i)=>{
    const [px,py] = P(d.px, d.py);
    const ux = d.ux, uy = -d.uy;
    const L = 62;
    const ex = px+ux*L, ey = py+uy*L;
    const val = sol.pasos[i] ? sol.pasos[i].val : null;
    const col = (val!==null && isFinite(val)) ? (val>0 ? '#1d4ed8' : '#c0392b') : '#b45309';
    s += '<line x1="'+px.toFixed(1)+'" y1="'+py.toFixed(1)+'" x2="'+ex.toFixed(1)+'" y2="'+ey.toFixed(1)
       + '" stroke="'+col+'" stroke-width="2.6"/>'
       + '<polygon points="0,0 -10,-4.5 -10,4.5" fill="'+col+'" transform="translate('+ex.toFixed(1)+','+ey.toFixed(1)
       + ') rotate('+(Math.atan2(uy,ux)*180/Math.PI).toFixed(1)+')"/>'
       + '<text x="'+(px+ux*(L+18)).toFixed(1)+'" y="'+(py+uy*(L+18)).toFixed(1)
       + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="'+col
       + '" text-anchor="middle">F' + d.nombre + '</text>';
  });
  // cargas y reacciones de la porción
  sol.externas.forEach(e=>{
    const [px,py] = P(e.x,e.y);
    const mag = Math.hypot(e.fx,e.fy);
    if(mag < 1e-9) return;
    const ux = e.fx/mag, uy = -e.fy/mag;
    const col = e.et.charAt(0)==='R' ? '#15803d' : '#c0392b';
    const sx = px-ux*40, sy = py-uy*40;
    s += '<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(px-ux*9).toFixed(1)+'" y2="'+(py-uy*9).toFixed(1)
       + '" stroke="'+col+'" stroke-width="2.4"/>'
       + '<polygon points="0,0 -9,-4 -9,4" fill="'+col+'" transform="translate('+(px-ux*8).toFixed(1)+','+(py-uy*8).toFixed(1)
       + ') rotate('+(Math.atan2(uy,ux)*180/Math.PI).toFixed(1)+')"/>'
       + '<text x="'+sx.toFixed(1)+'" y="'+(sy-6).toFixed(1)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'
       + col+'" text-anchor="middle">'+e.et+' = '+dec(mag,'f')+'</text>';
  });
  // nudos
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    const dentro = enLado(n.id);
    s += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(dentro?5:3.5)+'" fill="'
       + (dentro?'#7c3a06':'#dfe3e8')+'" stroke="#fff" stroke-width="1.5"/>';
    if(dentro) s += '<text x="'+(px+8).toFixed(1)+'" y="'+(py-8).toFixed(1)
       + '" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+n.nombre+'</text>';
  });
  // centros de momentos usados
  sol.pasos.forEach(p=>{
    if(p.tipo !== 'momento' || !p.centro) return;
    const [px,py] = P(p.centro.x, p.centro.y);
    if(px < -60 || px > W2+60 || py < -60 || py > H2+60) return;
    s += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="4" fill="none" stroke="#7c3a06" stroke-width="1.6" stroke-dasharray="2,2"/>';
  });
  s += '</svg>';
  return s;
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
    + (info.cero.length ? ', de las cuales ' + info.cero.length + ' ya se conocen por ser de fuerza cero' : '')
    + ', con <b>' + info.incog.length + ' incógnita(s)</b>. '
    + 'Se analiza la porción que contiene los nudos <b>' + nomLado + '</b>, por tener menos cargas y reacciones. '
    + 'La otra porción daría exactamente los mismos valores.</div>';

  h += '<div class="proc-block"><div class="proc-sub">Diagrama de cuerpo libre de la porción</div>'
    + svgPorcion(info, sol)
    + '<div class="hint-sm" style="margin-top:5px">Las fuerzas de las barras cortadas se dibujan '
    + '<b>saliendo</b> de la porción: se supone tracción, igual que en el método de nudos. '
    + 'Los círculos punteados marcan los centros de momentos empleados.</div></div>';

  sol.pasos.forEach((p, i)=>{
    const d = p.d;
    h += '<div class="joint-card"><div class="joint-h"><div class="joint-n">' + (i+1) + '</div>'
      + 'Barra <b>' + d.nombre + '</b></div>';
    if(p.tipo === 'momento'){
      const cx = dec(p.centro.x,'len'), cy = dec(p.centro.y,'len');
      const nomC = p.centro.nombre || 'O';
      h += '<div class="hint-sm" style="margin-bottom:6px">Se toman momentos respecto de <b>' + nomC + '</b> (' + cx + ' ; ' + cy + ') ' + uL
        + (p.otros.length ? ', por donde pasan <b>' + p.otros.join('</b> y <b>') + '</b>: al pasar sus líneas de acción por ese punto, no producen momento y desaparecen de la ecuación.' : '.') + '</div>';
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
    h += '<div class="teoria"><div class="teoria-t">Barras cortadas ya conocidas</div>'
      + 'El corte también cruza <b>' + nom.join(', ') + '</b>, identificadas antes como de fuerza cero. '
      + 'Por eso no cuentan como incógnita y el corte sigue siendo resoluble.</div>';
  }

  h += '<div class="teoria"><div class="teoria-t">Por qué conviene este método</div>'
    + 'El método de nudos obliga a recorrer la armadura nudo a nudo hasta llegar a la barra que interesa. '
    + 'Con un corte se obtiene <b>directamente</b> la fuerza de una barra concreta, sin resolver las anteriores. '
    + 'Es la herramienta adecuada cuando el problema pide solo unas pocas barras.</div>';
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
