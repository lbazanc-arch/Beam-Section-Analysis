// ═══════════════════════════════════════════════════════════
//  ESQUEMAS ACOTADOS DE LA RESOLUCIÓN (2026-10-04, petición del profesor)
//  Un mismo dibujo en la pantalla (SVG) y en el informe (TikZ):
//    · esquemaCaraRecta: el bloque de presiones de una cara recta —un tramo
//      recto de la compuerta o una cara de la presa— partido en rectángulo (□)
//      y triángulo (△) por capa, la fuerza de cada parte en su centroide, el
//      centro de presión P y las cotas L, p y s;
//    · esquemaCaraCurva: una placa curva —la proyección vertical con su
//      diagrama y F_h, el bloque de líquido con F_v y la resultante por el
//      centro del arco—;
//    · esquemaResultante: todo el cuerpo con cada fuerza y la resultante única
//      R, acotada donde actúa.
//  Cada esquema se arma en coordenadas del MUNDO (primitivas: polígonos,
//  polilíneas, flechas, textos, puntos, cotas y arcos de ángulo), la
//  disposición (_disposicionEsquema) decide la escala, el carril de cada cota y
//  dónde va cada valor, y los dos dibujantes solo pintan. Así la pantalla y el
//  papel no pueden decir cosas distintas, y ningún valor pisa a otro: el valor
//  de una cota en carril va SOBRE su línea, derecho y con fondo blanco, en el
//  primer punto de ella que no pisa a los ya escritos.
// ═══════════════════════════════════════════════════════════
function _esqNuevo(){ return {polys:[], polis:[], flechas:[], textos:[], puntos:[], cotas:[], arcos:[]}; }

// ── Cara recta: de T (el extremo menos profundo, ya en la superficie si la cara
//    asoma) a D, con la normal w hacia el líquido. `o`: {cuerpo (franja del
//    lado seco, la presa), nomT, nomD} ──
function esquemaCaraRecta(d, w, o){
  o = o || {};
  const L = d.L, u = d.u;
  const P = (s, n) => ({x:d.T.x + u.x*s + w.x*n, y:d.T.y + u.y*s + w.y*n});
  let pMax = 0; d.bandas.forEach(bd=>{ pMax = Math.max(pMax, bd.p0, bd.p1); });
  const K = pMax > 1e-12 ? 0.5*L/pMax : 0;         // el diagrama más alto mide L/2
  const e = 0.07*L;
  const g = _esqNuevo();
  if(o.cuerpo) g.polys.push({pts:[P(0,0), P(L,0), P(L,-e), P(0,-e)], est:'cuerpo'});
  const varias = d.bandas.length > 1, comps = [];
  let hTop = 0;
  d.bandas.forEach((bd, i)=>{
    const s0 = bd.s0, s1 = bd.s1, l = s1 - s0, h0 = bd.p0*K, h1 = bd.p1*K, hm = Math.min(h0, h1), dh = Math.abs(h1-h0);
    const crece = h1 >= h0, sub = varias ? String(i + 1) : '';
    hTop = Math.max(hTop, h0, h1);
    // las marcas □ y △ lejos de la línea de su fuerza, que pasa por su centroide
    if(bd.Fr > 1e-12){
      g.polys.push({pts:[P(s0,0), P(s1,0), P(s1,hm), P(s0,hm)], est:'rect'});
      g.textos.push({p:P(s0 + (crece ? 0.2 : 0.8)*l, hm/2), txt:'□' + sub, tex:'\\square' + (sub ? '_{' + sub + '}' : ''), tipo:'region', tam:[0.3*l, hm]});
      comps.push({s:s0 + bd.sR, F:bd.Fr, txt:'F□' + sub, tex:'F_{\\square' + (sub ? ',' + sub : '') + '}'});
    }
    if(bd.Ft > 1e-12){
      g.polys.push({pts: crece ? [P(s0,hm), P(s1,hm), P(s1,h1)] : [P(s0,h0), P(s0,hm), P(s1,hm)], est:'tri'});
      const t = crece ? 0.88 : 0.12, alto = dh*(crece ? t : 1 - t);
      g.textos.push({p:P(s0 + t*l, hm + 0.4*alto), txt:'△' + sub, tex:'\\triangle' + (sub ? '_{' + sub + '}' : ''), tipo:'region', tam:[0.2*l, 0.8*alto]});
      comps.push({s:s0 + bd.sT, F:bd.Ft, txt:'F△' + sub, tex:'F_{\\triangle' + (sub ? ',' + sub : '') + '}'});
    }
    if(bd.Fr > 1e-12 && bd.Ft > 1e-12) g.polis.push({pts:[P(s0,hm), P(s1,hm)], est:'division'});
    // la presión de cada extremo, acotada más allá de la cara
    if(i === 0 && bd.p0 > 1e-12) g.cotas.push({a:P(s0,0), b:P(s0,h0), w:{x:-u.x, y:-u.y}, dist:0.12*L, txt:'p = ' + dec(bd.p0,'f'), tex:'p = ' + dec(bd.p0,'f')});
    if(i === d.bandas.length - 1) g.cotas.push({a:P(s1,0), b:P(s1,h1), w:{x:u.x, y:u.y}, dist:0.12*L, txt:'p = ' + dec(bd.p1,'f'), tex:'p = ' + dec(bd.p1,'f')});
    else g.textos.push({p:P(s1, h1 + 0.08*L), txt:'p = ' + dec(bd.p1,'f'), tex:'p = ' + dec(bd.p1,'f'), tipo:'valor'});
  });
  g.polis.push({pts:[P(0,0), P(L,0)], est: o.cuerpo ? 'cara' : 'compuerta'});
  const nCola = hTop + 0.32*L;
  comps.forEach(q=>{
    g.flechas.push({cola:P(q.s, nCola), punta:P(q.s, 0), est:'parte'});
    g.textos.push({p:P(q.s, nCola), txt:q.txt + ' = ' + dec(q.F,'f'), tex:q.tex + ' = ' + dec(q.F,'f'), tipo:'fuerza', dir:w, est:'parte'});
  });
  g.puntos.push({p:P(d.sP, 0), est:'P', txt:'P', dir:{x:-w.x, y:-w.y}});
  if(o.nomT) g.puntos.push({p:P(0,0), est:'nudo', txt:o.nomT, dir:{x:-u.x - w.x, y:-u.y - w.y}});
  if(o.nomD) g.puntos.push({p:P(L,0), est:'nudo', txt:o.nomD, dir:{x:u.x - w.x, y:u.y - w.y}});
  // del lado seco, en carriles: L y la s de cada fuerza y de P, desde T
  const lado = {x:-w.x, y:-w.y};
  let nivel = 0;
  const cota = (s, txt, tex) => g.cotas.push({a:P(0,0), b:P(s,0), w:lado, base:e, nivel:nivel++, txt, tex});
  cota(L, 'L = ' + dec(L,'len'), 'L = ' + dec(L,'len'));
  comps.forEach(q=>cota(q.s, 's = ' + dec(q.s,'len'), 's = ' + dec(q.s,'len')));
  if(comps.length > 1) cota(d.sP, 'sP = ' + dec(d.sP,'len'), 's_P = ' + dec(d.sP,'len'));
  return g;
}

// ── Placa curva: la proyección vertical de la parte mojada, a un lado, con su
//    diagrama (rectángulo + triángulo por capa) y F_h; el bloque de líquido
//    entre el arco y la superficie con F_v en su centroide; y la resultante por
//    el centro del arco, en P. Se acotan la altura de la proyección, las
//    presiones de sus extremos, x̄ del bloque desde el extremo del arco y z_P. ──
function esquemaCaraCurva(c, d){
  const g = _esqNuevo();
  const pts = d.pts, niv = c.niv;
  const xs = pts.map(p=>p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const hP = d.yTop - d.yBot, ancho = Math.max(x1 - x0, 1e-9), esc = Math.max(hP, ancho);
  // bloque de líquido (real o imaginario) sobre el arco
  g.polys.push({pts: pts.concat([{x:d.D.x, y:niv}, {x:d.T.x, y:niv}]), est:'bloque'});
  g.polis.push({pts:[{x:x0 - 0.15*esc, y:niv}, {x:x1 + 0.15*esc, y:niv}], est:'superficie'});
  g.polis.push({pts, est:'compuerta'});
  // proyección vertical, del lado del que viene F_h
  const sh = d.Fh >= 0 ? 1 : -1;
  const xp = sh > 0 ? x0 - 0.45*esc : x1 + 0.45*esc;
  let pMax = 0; d.bandasH.forEach(bd=>{ pMax = Math.max(pMax, bd.p0, bd.p1); });
  const K = pMax > 1e-12 ? 0.4*esc/pMax : 0;
  const hacia = -sh;                                   // el diagrama crece alejándose del arco
  g.polis.push({pts:[{x:xp, y:d.yTop}, {x:xp, y:d.yBot}], est:'proyeccion'});
  g.polis.push({pts:[{x:xp, y:d.yTop}, {x:d.T.x, y:d.yTop}], est:'guia'});
  g.polis.push({pts:[{x:xp, y:d.yBot}, {x:(d.T.y <= d.D.y ? d.T : d.D).x, y:d.yBot}], est:'guia'});
  const varias = d.bandasH.length > 1;
  d.bandasH.forEach((bd, i)=>{
    const ya = bd.y0, yb = bd.y1, ha = bd.p0*K, hb = bd.p1*K, hm = Math.min(ha, hb), sub = varias ? String(i + 1) : '';
    if(bd.Fr > 1e-12){
      g.polys.push({pts:[{x:xp, y:ya}, {x:xp, y:yb}, {x:xp + hacia*hm, y:yb}, {x:xp + hacia*hm, y:ya}], est:'rect'});
      g.textos.push({p:{x:xp + hacia*hm/2, y:ya - 0.2*(ya-yb)}, txt:'□' + sub, tex:'\\square' + (sub ? '_{' + sub + '}' : ''), tipo:'region', tam:[hm, 0.3*(ya-yb)]});
    }
    if(bd.Ft > 1e-12){
      g.polys.push({pts:[{x:xp + hacia*hm, y:ya}, {x:xp + hacia*hm, y:yb}, {x:xp + hacia*hb, y:yb}], est:'tri'});
      g.textos.push({p:{x:xp + hacia*(hm + 0.3*(hb-hm)), y:yb + 0.15*(ya-yb)}, txt:'△' + sub, tex:'\\triangle' + (sub ? '_{' + sub + '}' : ''), tipo:'region', tam:[0.4*(hb-hm), 0.25*(ya-yb)]});
    }
    if(bd.Fr > 1e-12 && bd.Ft > 1e-12) g.polis.push({pts:[{x:xp + hacia*hm, y:ya}, {x:xp + hacia*hm, y:yb}], est:'division'});
    if(i > 0) g.textos.push({p:{x:xp + hacia*(ha + 0.06*esc), y:ya}, txt:'p = ' + dec(bd.p0,'f'), tex:'p = ' + dec(bd.p0,'f'), tipo:'valor'});
  });
  const b0 = d.bandasH[0], bN = d.bandasH[d.bandasH.length-1];
  if(b0 && b0.p0 > 1e-12) g.cotas.push({a:{x:xp, y:b0.y0}, b:{x:xp + hacia*b0.p0*K, y:b0.y0}, w:{x:0, y:1}, dist:0.08*esc, txt:'p = ' + dec(b0.p0,'f'), tex:'p = ' + dec(b0.p0,'f')});
  if(bN) g.cotas.push({a:{x:xp, y:bN.y1}, b:{x:xp + hacia*bN.p1*K, y:bN.y1}, w:{x:0, y:-1}, dist:0.08*esc, txt:'p = ' + dec(bN.p1,'f'), tex:'p = ' + dec(bN.p1,'f')});
  // altura de la proyección, del lado de fuera
  g.cotas.push({a:{x:xp + hacia*pMax*K, y:d.yTop}, b:{x:xp + hacia*pMax*K, y:d.yBot}, w:{x:hacia, y:0}, dist:0.1*esc, txt:'h = ' + dec(hP,'len'), tex:'h = ' + dec(hP,'len')});
  // F_h en la proyección
  const lf = 0.32*esc;
  const colaH = {x:xp + hacia*(pMax*K + lf), y:d.yFh};
  g.flechas.push({cola:colaH, punta:{x:xp, y:d.yFh}, est:'comp'});
  g.textos.push({p:colaH, txt:'Fh = ' + dec(Math.abs(d.Fh),'f'), tex:'F_h = ' + dec(Math.abs(d.Fh),'f'), tipo:'fuerza', dir:{x:hacia, y:0}, est:'comp'});
  // F_v en el centroide del bloque
  const sv = d.Fv >= 0 ? 1 : -1;
  const yv0 = sv > 0 ? Math.min(...pts.map(p=>p.y)) : niv;
  g.flechas.push({cola:{x:d.xFv, y:yv0 - sv*lf}, punta:{x:d.xFv, y:yv0}, est:'comp'});
  g.textos.push({p:{x:d.xFv, y:yv0 - sv*lf}, txt:'Fv = ' + dec(Math.abs(d.Fv),'f'), tex:'F_v = ' + dec(Math.abs(d.Fv),'f'), tipo:'fuerza', dir:{x:0, y:-sv}, est:'comp'});
  // x̄ del bloque, desde el extremo del arco más cercano a la proyección
  const xRef = sh > 0 ? x0 : x1;
  if(Math.abs(d.xFv - xRef) > 1e-6*esc)
    g.cotas.push({a:{x:xRef, y:niv}, b:{x:d.xFv, y:niv}, w:{x:0, y:1}, dist:0.1*esc, txt:'x̄ = ' + dec(Math.abs(d.xFv - xRef),'len'), tex:'\\bar x = ' + dec(Math.abs(d.xFv - xRef),'len')});
  // la resultante, por el centro del arco
  g.polis.push({pts:[{x:d.arc.cx, y:d.arc.cy}, c.P], est:'guia'});
  g.puntos.push({p:{x:d.arc.cx, y:d.arc.cy}, est:'centro', txt:'Oc', tex:'O_c', dir:{x:0.7, y:0.7}});
  g.flechas.push({cola:{x:c.P.x - d.dir.x*0.38*esc, y:c.P.y - d.dir.y*0.38*esc}, punta:c.P, est:'parte'});
  g.textos.push({p:{x:c.P.x - d.dir.x*0.38*esc, y:c.P.y - d.dir.y*0.38*esc}, txt:c.nombre.replace(/[_{}]/g,'') + ' = ' + dec(c.F,'f'), tex:c.nombre + ' = ' + dec(c.F,'f'), tipo:'fuerza', dir:{x:-d.dir.x, y:-d.dir.y}, est:'parte'});
  g.puntos.push({p:c.P, est:'P', txt:'P', dir:{x:d.dir.x, y:d.dir.y}});
  // z_P, de la superficie a P, del lado contrario a la proyección
  g.cotas.push({a:{x:c.P.x, y:niv}, b:c.P, w:{x:sh, y:0}, fuera:'zP', txt:'zP = ' + dec(c.zP,'len'), tex:'z_P = ' + dec(c.zP,'len')});
  if(d.T.nombre) g.puntos.push({p:d.T, est:'nudo', txt:d.T.nombre, dir:{x:0.5, y:0.8}});
  if(d.D.nombre) g.puntos.push({p:d.D, est:'nudo', txt:d.D.nombre, dir:{x:0.5, y:-0.8}});
  return g;
}

// ── Resultante única: el cuerpo (los tramos de la compuerta o el contorno de la
//    presa), las superficies libres, cada fuerza en su punto y R en P_R, con su
//    línea de acción y su ángulo. Se acota dónde actúa R: z_R desde la
//    superficie (y, en la presa, y_R desde la base en la misma cadena, y x_R
//    desde O); en un tramo recto de la compuerta, además, s desde su nudo N. ──
function esquemaResultante(ru, o){
  const g = _esqNuevo();
  const todos = [];
  if(o.presa){
    const gp = o.presa.g;
    g.polys.push({pts:gp.verts, est:'cuerpoPresa'});
    gp.verts.forEach(p=>todos.push(p));
  } else {
    tramos.forEach(t=>{
      const pts = puntosTramo(t, arcoDeTramo(t) ? 40 : 1);
      if(pts.length < 2) return;
      g.polis.push({pts, est:'compuerta'});
      pts.forEach(p=>todos.push(p));
    });
    nodos.forEach(n=>g.puntos.push({p:n, est:'nudo', txt:n.nombre, dir:{x:0.7, y:0.7}}));
  }
  o.cargas.forEach(c=>todos.push(c.P));
  todos.push(ru.P);
  const xs = todos.map(p=>p.x), ys = todos.map(p=>p.y);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs);
  const esc = Math.max(bx1 - bx0, Math.max(...ys) - Math.min(...ys), 1e-9);
  // superficies libres de las zonas con fuerzas
  [1,2].forEach(z=>{
    if(!o.cargas.some(c=>c.z === z)) return;
    const nv = nivelZona(z); if(!isFinite(nv)) return;
    g.polis.push({pts:[{x:bx0 - 0.25*esc, y:nv}, {x:bx1 + 0.25*esc, y:nv}], est:'superficie'});
  });
  if(o.presa){
    const gp = o.presa.g;
    g.polis.push({pts:[{x:gp.base.x0 - 0.25*esc, y:gp.base.y}, {x:gp.base.x1 + 0.25*esc, y:gp.base.y}], est:'terreno'});
    g.puntos.push({p:o.presa.O, est:'nudo', txt:'O', dir:{x:-0.8, y:0.6}});
  }
  // cada fuerza, fina, con su nombre
  o.cargas.forEach(c=>{
    const L = 0.22*esc;
    g.flechas.push({cola:{x:c.P.x - c.dir.x*L, y:c.P.y - c.dir.y*L}, punta:c.P, est:'fuerza'});
    g.textos.push({p:{x:c.P.x - c.dir.x*L, y:c.P.y - c.dir.y*L}, txt:c.txt, tex:c.tex, tipo:'fuerza', dir:{x:-c.dir.x, y:-c.dir.y}, est:'fuerza'});
  });
  // R, con su línea de acción y su ángulo
  const d = ru.dir, Lr = 0.38*esc;
  const cola = {x:ru.P.x - d.x*Lr, y:ru.P.y - d.y*Lr};
  g.polis.push({pts:[cola, {x:ru.P.x + d.x*0.18*esc, y:ru.P.y + d.y*0.18*esc}], est:'accion'});
  g.flechas.push({cola, punta:ru.P, est:'res'});
  // el ángulo va en el rótulo de R (en pantalla) y como letra sobre su arco (en el PDF)
  const conAng = ru.ag && ru.ag.grados >= 1e-6;
  g.textos.push({p:cola, txt:'R = ' + dec(ru.F,'f') + (conAng ? ' · θ = ' + dec(ru.ag.grados,'ang') + '°' : ''), tex:'R = ' + dec(ru.F,'f'), tipo:'fuerza', dir:{x:-d.x, y:-d.y}, est:'res'});
  // P_R a un lado de la línea de acción (por encima), no sobre ella
  const nPR = {x:-d.y, y:d.x};
  g.puntos.push({p:ru.P, est:'PR', txt:'PR', tex:'P_R', dir: nPR.y >= 0 ? nPR : {x:-nPR.x, y:-nPR.y}});
  if(ru.ag && ru.ag.grados >= 1e-6) g.arcos.push({p:cola, dir:d, letra:o.letraR || '\\theta_R', valor:dec(ru.ag.grados,'ang') + '°'});
  // dónde actúa R: z_R (y la cadena con y_R en la presa), del lado de la cola
  const lado = cola.x >= ru.P.x ? 1 : -1;
  if(ru.zR !== null && ru.zR > 1e-9)
    g.cotas.push({a:{x:ru.P.x, y:ru.niv}, b:ru.P, w:{x:lado, y:0}, fuera:'R', txt:'zR = ' + dec(ru.zR,'len'), tex:'z_R = ' + dec(ru.zR,'len')});
  if(o.presa){
    const O = o.presa.O, yR = ru.P.y - O.y, xR = ru.P.x - O.x;
    if(yR > 1e-9) g.cotas.push({a:ru.P, b:{x:ru.P.x, y:O.y}, w:{x:lado, y:0}, fuera:'R', txt:'yR = ' + dec(yR,'len'), tex:'y_R = ' + dec(yR,'len')});
    if(Math.abs(xR) > 1e-9) g.cotas.push({a:O, b:{x:ru.P.x, y:O.y}, w:{x:0, y:-1}, dist:0.12*esc, txt:'xR = ' + dec(xR,'len'), tex:'x_R = ' + dec(xR,'len')});
  } else if(ru.corta && ru.recto && ru.s > 1e-9){
    // s sobre el tramo, de N a P_R, del lado contrario a la cola
    const L = Math.hypot(ru.P.x-ru.N.x, ru.P.y-ru.N.y) || 1;
    let nx = -(ru.P.y-ru.N.y)/L, ny = (ru.P.x-ru.N.x)/L;
    if(nx*d.x + ny*d.y < 0){ nx = -nx; ny = -ny; }
    g.cotas.push({a:ru.N, b:ru.P, w:{x:nx, y:ny}, dist:0.1*esc, txt:'s = ' + dec(ru.s,'len'), tex:'s = ' + dec(ru.s,'len')});
  }
  return g;
}

// ── Disposición, en unidades de salida (px o cm) ──
// `o`: {ancho, alto, margen, medir(txt, tex) → [w, h], gap, sep, carril}
function _disposicionEsquema(g, o){
  const nucleo = [];
  g.polys.forEach(q=>q.pts.forEach(p=>nucleo.push(p)));
  g.polis.forEach(q=>q.pts.forEach(p=>nucleo.push(p)));
  g.flechas.forEach(f=>{ nucleo.push(f.cola, f.punta); });
  g.puntos.forEach(q=>nucleo.push(q.p));
  const caja = pts => ({x0:Math.min(...pts.map(p=>p.x)), x1:Math.max(...pts.map(p=>p.x)), y0:Math.min(...pts.map(p=>p.y)), y1:Math.max(...pts.map(p=>p.y))});
  const escala = b => Math.min((o.ancho - 2*o.margen)/Math.max(b.x1-b.x0,1e-9), (o.alto - 2*o.margen)/Math.max(b.y1-b.y0,1e-9));
  let k = escala(caja(nucleo)), dist = [], frac = [], b;
  const enCarril = g.cotas.filter(q=>q.nivel !== undefined);
  for(let it=0; it<6; it++){            // los textos no escalan: unas pasadas hasta que el encaje se asienta
    // los carriles empiezan pasada su base y medio texto: el valor va centrado en su línea
    const medio = Math.max(0, ...enCarril.map(q=>{ const m = o.medir(q.txt, q.tex); return Math.abs(q.w.x)*m[0]/2 + Math.abs(q.w.y)*m[1]/2; }));
    dist = g.cotas.map(q=>q.nivel !== undefined ? q.base*k + o.gap + medio + q.nivel*o.carril : (q.fuera ? 0 : q.dist*k));
    // carril «fuera»: más allá de todo lo dibujado y de los rótulos, en la dirección w;
    // las cotas del mismo grupo (una cadena) comparten carril
    const grupos = {};
    g.cotas.forEach(q=>{
      if(!q.fuera) return;
      const ext = [];
      nucleo.forEach(p=>ext.push(p));
      g.textos.concat(g.puntos.map(t=>({p:t.p, txt:t.txt, tex:t.tex, tipo:'fuerza', dir:t.dir}))).forEach(t=>{
        const m = o.medir(t.txt, t.tex);
        let cx = t.p.x, cy = t.p.y;
        if(t.tipo === 'fuerza'){ const n = Math.hypot(t.dir.x, t.dir.y) || 1; cx += t.dir.x/n*(m[0]/2 + o.sep)/k; cy += t.dir.y/n*(m[1]/2 + o.sep)/k; }
        ext.push({x:cx - m[0]/2/k, y:cy - m[1]/2/k}, {x:cx + m[0]/2/k, y:cy + m[1]/2/k}, {x:cx - m[0]/2/k, y:cy + m[1]/2/k}, {x:cx + m[0]/2/k, y:cy - m[1]/2/k});
      });
      const lejos = Math.max(0, ...ext.map(p=>(p.x - q.a.x)*q.w.x + (p.y - q.a.y)*q.w.y));
      grupos[q.fuera] = Math.max(grupos[q.fuera] || 0, lejos*k + o.gap);
    });
    // una cadena comparte la MISMA línea: la distancia se mide desde su propio punto a
    g.cotas.forEach((q,i)=>{
      if(!q.fuera) return;
      const ref = g.cotas.find(r=>r.fuera === q.fuera);
      dist[i] = grupos[q.fuera] + ((ref.a.x - q.a.x)*q.w.x + (ref.a.y - q.a.y)*q.w.y)*k;
    });
    frac = g.cotas.map(()=>null);
    const pts = nucleo.slice(), puestas = [];
    const pisa = c => puestas.some(q=>c.x0 < q.x1 && c.x1 > q.x0 && c.y0 < q.y1 && c.y1 > q.y0);
    g.cotas.forEach((q,i)=>{
      const dw = dist[i]/k, m = o.medir(q.txt, q.tex), hw = m[0]/2/k, hh = m[1]/2/k;
      const A = {x:q.a.x + q.w.x*dw, y:q.a.y + q.w.y*dw}, B = {x:q.b.x + q.w.x*dw, y:q.b.y + q.w.y*dw};
      pts.push(A, B);
      let c;
      if(q.nivel === undefined){
        const sep = (o.sep + Math.abs(q.w.x)*m[0]/2 + Math.abs(q.w.y)*m[1]/2)/k;
        const cx = (A.x + B.x)/2 + q.w.x*sep, cy = (A.y + B.y)/2 + q.w.y*sep;
        c = {x0:cx-hw, x1:cx+hw, y0:cy-hh, y1:cy+hh};
      } else {
        for(const f of [0.5, 0.3, 0.7, 0.18, 0.82, 0.4, 0.6]){
          const cx = A.x + (B.x-A.x)*f, cy = A.y + (B.y-A.y)*f;
          c = {x0:cx-hw, x1:cx+hw, y0:cy-hh, y1:cy+hh};
          frac[i] = f;
          if(!pisa(c)) break;
        }
      }
      puestas.push(c);
      pts.push({x:c.x0, y:c.y0}, {x:c.x1, y:c.y1});
    });
    g.textos.concat(g.puntos.map(q=>({p:q.p, txt:q.txt, tex:q.tex, tipo:'fuerza', dir:q.dir}))).forEach(t=>{
      const m = o.medir(t.txt, t.tex);
      let cx = t.p.x, cy = t.p.y;
      if(t.tipo === 'fuerza'){
        const n = Math.hypot(t.dir.x, t.dir.y) || 1;
        cx += t.dir.x/n*(m[0]/2 + o.sep)/k; cy += t.dir.y/n*(m[1]/2 + o.sep)/k;
      }
      pts.push({x:cx - m[0]/2/k, y:cy - m[1]/2/k}, {x:cx + m[0]/2/k, y:cy + m[1]/2/k});
    });
    g.arcos.forEach(a=>{ const r = o.carril*2.4/k; pts.push({x:a.p.x - r, y:a.p.y - r}, {x:a.p.x + r, y:a.p.y + r}); });
    b = caja(pts);
    k = escala(b);
  }
  return {k, dist, frac, b};
}

// ── Dibujante SVG (pantalla) ──
const _ESQ_SVG = {
  poly:{cuerpo:'fill="rgba(150,142,128,.45)" stroke="none"', cuerpoPresa:'fill="rgba(150,142,128,.38)" stroke="#6b6457" stroke-width="2"',
        rect:'fill="rgba(192,57,43,.12)" stroke="#c0392b" stroke-width="1"', tri:'fill="rgba(192,57,43,.30)" stroke="#c0392b" stroke-width="1"',
        bloque:'fill="rgba(47,127,181,.14)" stroke="#2f7fb5" stroke-width=".8" stroke-dasharray="4,3"'},
  poli:{cara:'stroke="#6b6457" stroke-width="3.2" stroke-linecap="round"', compuerta:'stroke="#1b1f24" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"',
        division:'stroke="#c0392b" stroke-width=".9" stroke-dasharray="4,3"', superficie:'stroke="#2f7fb5" stroke-width="1.4"',
        terreno:'stroke="#6b5a3e" stroke-width="2"', guia:'stroke="#6b7280" stroke-width=".8" stroke-dasharray="3,3"',
        proyeccion:'stroke="#1b1f24" stroke-width="1.6" stroke-dasharray="6,3"', accion:'stroke="#6d28d9" stroke-width="1" stroke-dasharray="6,4" opacity=".7"'},
  flecha:{parte:['#8f1d12', 1.6], fuerza:['#c0392b', 1.3], res:['#6d28d9', 2.4], comp:['#0f5c56', 1.6]},
  texto:{parte:'#8f1d12', fuerza:'#c0392b', res:'#6d28d9', comp:'#0f5c56'},
  punto:{P:'#8f1d12', PR:'#6d28d9', nudo:'#0b3f3a', centro:'#6b7280'}
};
function esquemaSVG(g, o){
  o = o || {};
  const Wv = o.ancho || 300, Hv = o.alto || 230, m = 8;
  const medir = txt => [String(txt).length*5.9 + 4, 12];
  const lay = _disposicionEsquema(g, {ancho:Wv, alto:Hv, margen:m, medir, gap:16, sep:4, carril:15});
  const k = lay.k, bb = lay.b;
  const X = x => m + (x-bb.x0)*k + ((Wv-2*m) - (bb.x1-bb.x0)*k)/2, Y = y => Hv - m - (y-bb.y0)*k - ((Hv-2*m) - (bb.y1-bb.y0)*k)/2;
  const F = v => v.toFixed(1);
  const S = _ESQ_SVG;
  let s = '<svg class="croq-svg" viewBox="0 0 ' + Wv + ' ' + Hv + '" xmlns="http://www.w3.org/2000/svg">';
  g.polys.forEach(q=>{ s += '<polygon points="' + q.pts.map(p=>F(X(p.x)) + ',' + F(Y(p.y))).join(' ') + '" ' + S.poly[q.est] + '/>'; });
  g.polis.forEach(q=>{ s += '<polyline points="' + q.pts.map(p=>F(X(p.x)) + ',' + F(Y(p.y))).join(' ') + '" fill="none" ' + S.poli[q.est] + '/>'; });
  const flecha = (a, b, col, w) => {
    const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx, dy) || 1, ux = dx/L, uy = dy/L, c = 5 + 2.4*w, h = 1.8 + 1.1*w;
    return '<line x1="' + F(a[0]) + '" y1="' + F(a[1]) + '" x2="' + F(b[0] - ux*c*0.8) + '" y2="' + F(b[1] - uy*c*0.8) + '" stroke="' + col + '" stroke-width="' + w + '"/>'
      + '<polygon points="' + F(b[0]) + ',' + F(b[1]) + ' ' + F(b[0] - ux*c - uy*h) + ',' + F(b[1] - uy*c + ux*h) + ' ' + F(b[0] - ux*c + uy*h) + ',' + F(b[1] - uy*c - ux*h) + '" fill="' + col + '"/>';
  };
  g.flechas.forEach(f=>{ const st = S.flecha[f.est]; s += flecha([X(f.cola.x), Y(f.cola.y)], [X(f.punta.x), Y(f.punta.y)], st[0], st[1]); });
  // arcos de ángulo: desde el eje más cercano, en la cola de la fuerza
  g.arcos.forEach(a=>{
    const ag = bsaAnguloAgudoEje(a.dir.x, a.dir.y);
    const ray = ag.desdeV ? (a.dir.y >= 0 ? 90 : -90) : (a.dir.x >= 0 ? 0 : 180);
    let a1 = Math.atan2(a.dir.y, a.dir.x)*180/Math.PI;
    while(a1 - ray > 180) a1 -= 360; while(a1 - ray < -180) a1 += 360;
    const cx = X(a.p.x), cy = Y(a.p.y), r = 20;
    const pt = (deg, rr) => [cx + rr*Math.cos(deg*Math.PI/180), cy - rr*Math.sin(deg*Math.PI/180)];
    const ref = pt(ray, 32);
    s += '<line x1="' + F(cx) + '" y1="' + F(cy) + '" x2="' + F(ref[0]) + '" y2="' + F(ref[1]) + '" stroke="#6b7280" stroke-width=".8" stroke-dasharray="3,3"/>';
    let dpath = '';
    for(let i=0;i<=12;i++){ const q = pt(ray + (a1-ray)*i/12, r); dpath += (i ? ' L ' : 'M ') + F(q[0]) + ' ' + F(q[1]); }
    s += '<path d="' + dpath + '" fill="none" stroke="#6d28d9" stroke-width="1"/>';
  });
  const punta = (x, y, vx, vy) => '<polygon points="' + F(x) + ',' + F(y) + ' ' + F(x - vx*6 - vy*2.2) + ',' + F(y - vy*6 + vx*2.2) + ' ' + F(x - vx*6 + vy*2.2) + ',' + F(y - vy*6 - vx*2.2) + '" fill="#374151"/>';
  g.cotas.forEach((q,i)=>{
    const A = [X(q.a.x), Y(q.a.y)], B = [X(q.b.x), Y(q.b.y)];
    const wx = q.w.x, wy = -q.w.y, dp = lay.dist[i];
    const D1 = [A[0] + wx*dp, A[1] + wy*dp], D2 = [B[0] + wx*dp, B[1] + wy*dp];
    [[A, D1], [B, D2]].forEach(par=>{ if(Math.hypot(par[1][0]-par[0][0], par[1][1]-par[0][1]) > 3) s += '<line x1="' + F(par[0][0]) + '" y1="' + F(par[0][1]) + '" x2="' + F(par[1][0] + wx*4) + '" y2="' + F(par[1][1] + wy*4) + '" stroke="#374151" stroke-width=".7" stroke-dasharray="3,2.5" opacity=".55"/>'; });
    const Ld = Math.hypot(D2[0]-D1[0], D2[1]-D1[1]);
    if(Ld < 2) return;
    const ux = (D2[0]-D1[0])/Ld, uy = (D2[1]-D1[1])/Ld;
    s += '<line x1="' + F(D1[0]) + '" y1="' + F(D1[1]) + '" x2="' + F(D2[0]) + '" y2="' + F(D2[1]) + '" stroke="#374151" stroke-width=".9"/>';
    if(Ld >= 14) s += punta(D1[0], D1[1], -ux, -uy) + punta(D2[0], D2[1], ux, uy);
    const mm = medir(q.txt);
    let tx, ty;
    if(lay.frac[i] !== null){ tx = D1[0] + (D2[0]-D1[0])*lay.frac[i]; ty = D1[1] + (D2[1]-D1[1])*lay.frac[i]; }
    else { const sep = 4 + Math.abs(wx)*mm[0]/2 + Math.abs(wy)*mm[1]/2; tx = (D1[0]+D2[0])/2 + wx*sep; ty = (D1[1]+D2[1])/2 + wy*sep; }
    s += '<text x="' + F(tx) + '" y="' + F(ty) + '" font-size="9.5" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="#1b1f24" stroke="#fff" stroke-width="4" paint-order="stroke">' + q.txt + '</text>';
  });
  g.textos.forEach(t=>{
    if(t.tipo === 'region'){
      if(Math.min(t.tam[0], t.tam[1])*k < 10) return;          // demasiado pequeña para su marca
      s += '<text x="' + F(X(t.p.x)) + '" y="' + F(Y(t.p.y)) + '" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#8f1d12">' + t.txt + '</text>';
    } else if(t.tipo === 'fuerza'){
      const n = Math.hypot(t.dir.x, t.dir.y) || 1, ax = t.dir.x/n, ay = -t.dir.y/n, mm = medir(t.txt);
      const cx = X(t.p.x) + ax*(mm[0]/2 + 4), cy = Y(t.p.y) + ay*(mm[1]/2 + 4);
      s += '<text x="' + F(cx) + '" y="' + F(cy) + '" font-size="9.5" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="' + (S.texto[t.est] || '#8f1d12') + '" stroke="#fff" stroke-width="3" paint-order="stroke">' + t.txt + '</text>';
    } else {
      s += '<text x="' + F(X(t.p.x)) + '" y="' + F(Y(t.p.y)) + '" font-size="9" text-anchor="middle" dominant-baseline="middle" fill="#c0392b" stroke="#fff" stroke-width="3" paint-order="stroke">' + t.txt + '</text>';
    }
  });
  g.puntos.forEach(q=>{
    const px = X(q.p.x), py = Y(q.p.y), col = S.punto[q.est];
    if(q.est === 'P' || q.est === 'PR') s += '<circle cx="' + F(px) + '" cy="' + F(py) + '" r="3.4" fill="#fff" stroke="' + col + '" stroke-width="1.6"/>';
    else s += '<circle cx="' + F(px) + '" cy="' + F(py) + '" r="2.6" fill="' + col + '"/>';
    const n = Math.hypot(q.dir.x, q.dir.y) || 1, mm = medir(q.txt);
    const cx = px + q.dir.x/n*(mm[0]/2 + 5), cy = py - q.dir.y/n*(mm[1]/2 + 5);
    s += '<text x="' + F(cx) + '" y="' + F(cy) + '" font-size="9.5" font-weight="700"' + (q.est === 'P' || q.est === 'PR' ? ' font-style="italic"' : '') + ' text-anchor="middle" dominant-baseline="middle" fill="' + col + '" stroke="#fff" stroke-width="3" paint-order="stroke">' + q.txt + '</text>';
  });
  return s + '</svg>';
}

// ── Dibujante TikZ (informe) ──
const _ESQ_TIKZ = {
  poly:{cuerpo:'fill=gray!30, draw=none', cuerpoPresa:'fill=gray!28, draw=bsaPresa, line width=1.1pt', rect:'fill=bsaPres!10, draw=bsaPres, line width=.5pt',
        tri:'fill=bsaPres!28, draw=bsaPres, line width=.5pt', bloque:'fill=bsaAgua!15, draw=bsaAgua!70!black, dashed, line width=.4pt'},
  poli:{cara:'bsaPresa, line width=1.8pt', compuerta:'bsaAcc2, line width=1.8pt, line join=round', division:'bsaPres, dashed, line width=.45pt',
        superficie:'bsaAgua, line width=1pt', terreno:'bsaTierra, line width=1pt', guia:'bsaMuted, dashed, line width=.4pt',
        proyeccion:'black!80, dash pattern=on 3pt off 1.5pt, line width=.9pt', accion:'bsaRes!70, dashed, line width=.5pt'},
  flecha:{parte:'bsaPres!80!black, line width=1pt', fuerza:'bsaPres, line width=.8pt', res:'bsaRes, line width=1.5pt', comp:'bsaAcc, line width=1pt'},
  texto:{parte:'bsaPres!80!black', fuerza:'bsaPres', res:'bsaRes', comp:'bsaAcc'},
  punto:{P:'bsaPres!80!black', PR:'bsaRes', nudo:'bsaAcc2', centro:'bsaMuted'}
};
function esquemaTikZ(g, o){
  o = o || {};
  const medir = (txt, tex) => [tkpAncho('$' + (tex || txt) + '$', 'font=\\tiny'), tkpAlto('tiny')];
  const lay = _disposicionEsquema(g, {ancho:o.ancho || 8.6, alto:o.alto || 6.4, margen:0.1, medir, gap:0.42, sep:0.08, carril:0.34});
  const k = lay.k, bb = lay.b;
  const X = x => (x-bb.x0)*k, Y = y => (y-bb.y0)*k;
  const F = v => v.toFixed(3);
  const P = p => '(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')';
  const T = _ESQ_TIKZ;
  let out = '';
  g.polys.forEach(q=>{ out += '\\path[' + T.poly[q.est] + '] ' + q.pts.map(P).join(' -- ') + ' -- cycle;\n'; });
  g.polis.forEach(q=>{ out += '\\draw[' + T.poli[q.est] + '] ' + q.pts.map(P).join(' -- ') + ';\n'; });
  g.flechas.forEach(f=>{ out += '\\draw[-{Latex[length=' + (f.est === 'res' ? '2.6' : '2') + 'mm]}, ' + T.flecha[f.est] + '] ' + P(f.cola) + ' -- ' + P(f.punta) + ';\n'; });
  g.arcos.forEach(a=>{ out += tkpArcoAngulo(X(a.p.x), Y(a.p.y), a.dir, a.letra); });
  const flecha = '{Latex[length=1.4mm,width=1mm]}-{Latex[length=1.4mm,width=1mm]}';
  g.cotas.forEach((q,i)=>{
    const wx = q.w.x, wy = q.w.y, dd = lay.dist[i];
    const A = [X(q.a.x), Y(q.a.y)], B = [X(q.b.x), Y(q.b.y)];
    const D1 = [A[0] + wx*dd, A[1] + wy*dd], D2 = [B[0] + wx*dd, B[1] + wy*dd];
    [[A, D1], [B, D2]].forEach(par=>{ if(Math.hypot(par[1][0]-par[0][0], par[1][1]-par[0][1]) > 0.06) out += '\\draw[bsaMuted!75, line width=.3pt, dash pattern=on 1.2pt off 1.2pt] (' + F(par[0][0]) + ',' + F(par[0][1]) + ') -- (' + F(par[1][0] + wx*0.08) + ',' + F(par[1][1] + wy*0.08) + ');\n'; });
    if(Math.hypot(D2[0]-D1[0], D2[1]-D1[1]) < 0.05) return;
    out += '\\draw[' + flecha + ', bsaMuted, line width=.4pt] (' + F(D1[0]) + ',' + F(D1[1]) + ') -- (' + F(D2[0]) + ',' + F(D2[1]) + ');\n';
    const mm = medir(q.txt, q.tex);
    let tx, ty;
    if(lay.frac[i] !== null){ tx = D1[0] + (D2[0]-D1[0])*lay.frac[i]; ty = D1[1] + (D2[1]-D1[1])*lay.frac[i]; }
    else { const sep = 0.08 + Math.abs(wx)*mm[0]/2 + Math.abs(wy)*mm[1]/2; tx = (D1[0]+D2[0])/2 + wx*sep; ty = (D1[1]+D2[1])/2 + wy*sep; }
    out += '\\node[font=\\tiny, fill=white, inner sep=.8pt] at (' + F(tx) + ',' + F(ty) + ') {$' + q.tex + '$};\n';
  });
  g.textos.forEach(t=>{
    if(t.tipo === 'region'){
      if(Math.min(t.tam[0], t.tam[1])*k < 0.28) return;
      out += '\\node[font=\\scriptsize, text=bsaPres!80!black] at ' + P(t.p) + ' {$' + t.tex + '$};\n';
    } else if(t.tipo === 'fuerza'){
      const n = Math.hypot(t.dir.x, t.dir.y) || 1, mm = medir(t.txt, t.tex);
      const cx = X(t.p.x) + t.dir.x/n*(mm[0]/2 + 0.08), cy = Y(t.p.y) + t.dir.y/n*(mm[1]/2 + 0.08);
      out += '\\node[font=\\tiny, text=' + (T.texto[t.est] || 'bsaPres') + ', fill=white, inner sep=.8pt] at (' + F(cx) + ',' + F(cy) + ') {$' + t.tex + '$};\n';
    } else {
      out += '\\node[font=\\tiny, text=bsaPres, fill=white, inner sep=.8pt] at ' + P(t.p) + ' {$' + (t.tex || t.txt) + '$};\n';
    }
  });
  g.puntos.forEach(q=>{
    const col = T.punto[q.est];
    out += (q.est === 'P' || q.est === 'PR') ? '\\filldraw[fill=white, draw=' + col + ', line width=.7pt] ' + P(q.p) + ' circle (0.06);\n'
                                             : '\\filldraw[' + col + '] ' + P(q.p) + ' circle (0.045);\n';
    const n = Math.hypot(q.dir.x, q.dir.y) || 1, mm = medir(q.txt, q.tex);
    const cx = X(q.p.x) + q.dir.x/n*(mm[0]/2 + 0.1), cy = Y(q.p.y) + q.dir.y/n*(mm[1]/2 + 0.1);
    const txt = q.est === 'nudo' ? '\\textbf{' + escLatex(q.txt) + '}' : '$' + (q.tex || q.txt) + '$';
    out += '\\node[font=\\scriptsize, text=' + col + ', fill=white, inner sep=.6pt] at (' + F(cx) + ',' + F(cy) + ') {' + txt + '};\n';
  });
  return out;
}

// ── Puertas de entrada ──
// Normal de una carga de la compuerta hacia su líquido (en la presa, c.nOut).
function _normalCarga(c){
  if(c.nOut) return c.nOut;
  const pts = puntosTramo(c.t, 1);
  return normalHaciaZona(c.t, 0, pts, c.z);
}
// El esquema de una fuerza del líquido: cara recta o placa curva.
function _geomCarga(c, d, presa){
  if(d.tipo === 'curvo') return esquemaCaraCurva(c, d);
  return esquemaCaraRecta(d, _normalCarga(c), {cuerpo:!!presa, nomT:d.T && d.T.nombre, nomD:d.D && d.D.nombre});
}
function esquemaCargaSVG(c, d, presa){ return esquemaSVG(_geomCarga(c, d, presa)); }
function esquemaCargaTikZ(c, d, presa){ return esquemaTikZ(_geomCarga(c, d, presa)); }
// La resultante única: de la compuerta (r = R) o de una presa (r = un RP[i]).
function _geomResultante(r, presa, letraR){
  const ru = presa ? r.res : r.resultante;
  const cargas = presa ? r.agua.map(c=>({P:c.P, dir:c.dir, z:c.z, txt:'E' + c.k, tex:'E_{' + c.k + '}'}))
                       : r.cargas.map(c=>({P:c.P, dir:c.dir, z:c.z, txt:c.nombre.replace(/[_{}]/g,''), tex:c.nombre}));
  return esquemaResultante(ru, {cargas, presa: presa ? r : null, letraR});
}
function esquemaResultanteSVG(r, presa){ return esquemaSVG(_geomResultante(r, presa), {ancho:360, alto:250}); }
function esquemaResultanteTikZ(r, presa, letraR){ return esquemaTikZ(_geomResultante(r, presa, letraR), {ancho:9.5, alto:6.8}); }
