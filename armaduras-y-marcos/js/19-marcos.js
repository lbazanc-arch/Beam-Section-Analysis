// ═══════════════════════════════════════════════════════════
//  MARCOS (bastidores) · elementos de varias fuerzas (Hibbeler §6.6)
// ═══════════════════════════════════════════════════════════
// Una barra pasa a ser un ELEMENTO de varias fuerzas cuando lleva cargas entre
// sus extremos o cuando algún extremo va unido rígidamente (transmite momento).
// La armadura es el caso particular en que ninguna barra lo es: entonces
// `resolver` sigue por el motor de nudos de siempre (06-) y solo cuando
// esMarco() es cierto se pasa por aquí. El método es DESMEMBRAR (§6.6):
//   · incógnitas: las componentes de la fuerza de cada pasador sobre cada
//     pieza (y el momento, si la unión es rígida) más las reacciones;
//   · ecuaciones: tres por pieza (ΣFx, ΣFy, ΣM respecto de su extremo a) y
//     las del equilibrio de cada nudo (dos, o tres si es rígido), que son la
//     tercera ley de Newton escrita para el pasador.
// Convenio: la fuerza de extremo es la que el NUDO ejerce SOBRE la pieza, con
// componentes positivas hacia +x y +y; los momentos son positivos antihorarios.
// Datos nuevos del modelo (todo lo demás sigue igual que en la armadura):
//   barra.cargas = [{tipo:'P', s, fx, fy} | {tipo:'M', s, m} |
//                   {tipo:'U'|'T', s1, s2, dir, mag, mag2}]        s desde el extremo a
//                   la puntual lleva SUS DOS COMPONENTES: {marco:'plano', magY, magX}
//                   o, referida al eje de la pieza, {marco:'eje', magP, magA}
//   barra.artA / barra.artB = true si ese extremo va articulado aunque el nudo sea rígido
//   nodo.union = 'pasador' | 'rigido'          nodo.apoyo = 'empotrado' (Rx, Ry, M)
// Los esfuerzos internos de cada elemento (N, V, M a lo largo de s) salen del
// equilibrio del trozo [0, s] con las fuerzas de su extremo a y las cargas que
// caen antes del corte, con el mismo convenio de signos que fuerzas-internas:
// N positivo a tracción, V positivo hacia −n en la cara del corte, M positivo
// antihorario en esa cara (el que curva el elemento hacia +n).

// ══ Modelo ═════════════════════════════════════════════════════════════════
function cargasDeBarra(b){ return (b && Array.isArray(b.cargas)) ? b.cargas : []; }
// El tipo lo elige el usuario al dibujar (herramientas Barra y Viga / marco) o
// en Editar barra. 'barra' = barra de armadura, dos fuerzas, siempre articulada
// (solo N); 'viga' = elemento rígido con N, V y M, que recibe cargas entre sus
// extremos y puede ir unido rígidamente. Sin `tipo` (archivos anteriores al
// 2026-09-09) se deduce en normalizarTiposBarra.
function tipoBarra(b){ return (b && b.tipo === 'viga') ? 'viga' : 'barra'; }
function esViga(b){ return tipoBarra(b) === 'viga'; }
function normalizarTiposBarra(){
  barras.forEach(b=>{
    if(b.tipo === 'viga' || b.tipo === 'barra') return;
    const na = nodos.find(z=>z.id===b.a), nb = nodos.find(z=>z.id===b.b);
    const rig = (na && na.union === 'rigido' && !b.artA) || (nb && nb.union === 'rigido' && !b.artB);
    b.tipo = (cargasDeBarra(b).length || rig) ? 'viga' : 'barra';
  });
}
function esRigidoExtremo(b, ext){
  if(!esViga(b)) return false;                 // una barra de armadura siempre va articulada
  const n = nodos.find(z=>z.id === (ext === 'a' ? b.a : b.b));
  if(!n || n.union !== 'rigido') return false;
  return ext === 'a' ? !b.artA : !b.artB;
}
function esElemento(b){ return esViga(b); }
function esMarco(){ return barras.some(esViga) || nodos.some(n=>n.apoyo === 'empotrado'); }
// Donde dos vigas se encuentran, la unión queda rígida (una viga continua o la
// esquina de un pórtico); el usuario la vuelve pasador en Editar nudo si hace
// falta. Solo se aplica al dibujar a mano: los ejemplos y los archivos ya traen
// la unión de cada nudo.
function unirVigasEnNudo(nid, nueva){
  const n = nodos.find(z=>z.id===nid); if(!n || n.union === 'rigido') return;
  if(!barras.some(b=>b !== nueva && esViga(b) && (b.a===nid || b.b===nid))) return;
  n.union = 'rigido';
  aviso('Nudo ' + n.nombre + ': dos vigas se encuentran y la unión queda rígida (cuadrado). Si ahí va un pasador, cámbialo en Editar nudo.');
}
// Herramienta Carga sobre una pieza: solo las vigas reciben cargas entre sus extremos.
function cargarSobreBarra(id){
  const b = barras.find(z=>z.id===id); if(!b) return;
  if(esViga(b)){ abrirCargaBarra(id); return; }
  aviso('La barra ' + nombreBarra(b) + ' es de armadura (dos fuerzas) y solo recibe cargas en sus nudos. Para cargarla entre sus extremos, dibújala con Viga / marco o cambia su tipo en Editar barra.', 'error');
}
// Tipo de la pieza desde Editar barra.
function setTipoBarra(t){
  const b = barras.find(z=>z.id===edBarraId); if(!b || tipoBarra(b) === t) return;
  if(t === 'barra' && cargasDeBarra(b).length){ aviso('Quita primero las cargas de la viga: una barra de armadura solo recibe cargas en sus nudos.', 'error'); return; }
  registrarCambio(); b.tipo = t;
  if(t === 'barra'){ b.artA = false; b.artB = false; }
  else { unirVigasEnNudo(b.a, b); unirVigasEnNudo(b.b, b); }
  resultado = null; pintarTipoBarra(b); refrescar();
}
function pintarTipoBarra(b){
  const viga = esViga(b);
  const bb = document.getElementById('edBtipoBarra'), bv = document.getElementById('edBtipoViga');
  if(bb) bb.classList.toggle('active', !viga); if(bv) bv.classList.toggle('active', viga);
  const caja = document.getElementById('edBVigaBox'); if(caja) caja.style.display = viga ? '' : 'none';
  const h = document.getElementById('edBtipoHint');
  if(h) h.textContent = viga
    ? 'Viga o marco: elemento rígido con N, V y M. Recibe cargas entre sus extremos y, en un nudo de unión rígida, transmite momento.'
    : 'Barra de armadura: dos fuerzas, siempre articulada en sus extremos; solo trabaja a tracción o compresión y sus cargas van en los nudos.';
  const nc = document.getElementById('edBCargasResumen');
  if(nc) nc.textContent = viga ? (cargasDeBarra(b).length ? cargasDeBarra(b).map(descCarga).join(' · ') : 'Sin cargas entre sus extremos.') : '';
}
function geomBarra(b){
  const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
  const dx = nb.x-na.x, dy = nb.y-na.y, L = Math.hypot(dx,dy) || 1e-12;
  return {na, nb, L, ux:dx/L, uy:dy/L, nx:-dy/L, ny:dx/L};
}
// ══ Cargas: el convenio de fuerzas-internas ═════════════════════════════════
// Una carga se declara con MAGNITUD y DIRECCION, nunca por componentes, y el
// signo positivo significa lo mismo que en fuerzas-internas:
//   'y'      vertical del plano, positiva HACIA ABAJO
//   'x'      horizontal del plano, positiva hacia la derecha
//   'perp'   perpendicular al eje de la pieza, positiva «contra» ella
//   'axial'  paralela al eje de la pieza, en su sentido de avance
// Un par es positivo antihorario. Las componentes (fx, fy) siguen siendo lo que
// consume el motor, con +y hacia arriba, pero ya no las escribe el usuario.
const DIR_CARGA_ARM = {
  y:     {nom:'Vertical (Y)',   ico:'\u2193', ayuda:'Vertical del plano, positiva hacia abajo.'},
  x:     {nom:'Horizontal (X)', ico:'\u2192', ayuda:'Horizontal del plano, positiva hacia la derecha.'},
  perp:  {nom:'Perpendicular',  ico:'\u21e3', ayuda:'Perpendicular al eje de la pieza, positiva «contra» ella.'},
  axial: {nom:'Axial',          ico:'\u21e2', ayuda:'Paralela al eje de la pieza, en su sentido de avance.'}
};
// Vector unitario en el que actúa una magnitud POSITIVA.
function vectorCarga(dir, g){
  if(dir === 'x') return {x:1, y:0};
  if(dir === 'axial') return g ? {x:g.ux, y:g.uy} : {x:1, y:0};
  if(dir === 'perp'){
    if(!g) return {x:0, y:-1};
    // «Contra» la pieza: en una horizontal coincide con la vertical hacia
    // abajo, así cambiar de modo no altera el resultado en piezas rectas.
    const nx = -g.uy, ny = g.ux, sg = (ny > 0) ? -1 : 1;
    return {x:nx*sg, y:ny*sg};
  }
  return {x:0, y:-1};                  // 'y': hacia abajo
}
// Magnitud al principio y al final de una repartida ('U' es de valor único).
function wIni(c){ return +c.mag || 0; }
function wFin(c){ return c.tipo === 'U' ? (+c.mag || 0) : (+c.mag2 || 0); }
function esRepartida(c){ return c.tipo === 'U' || c.tipo === 'T'; }
// ── Una puntual lleva sus DOS componentes en el mismo registro ──
// Una carga inclinada es una sola carga, no dos fuerzas que haya que sumar a
// mano. En el marco 'plano' se dan la vertical (positiva hacia abajo) y la
// horizontal (positiva a la derecha); en el marco 'eje', la perpendicular a la
// pieza y la axial. Las repartidas conservan una única dirección.
function compCargaPuntual(c, g){
  if(c.marco === 'eje'){
    const vp = vectorCarga('perp', g), va = vectorCarga('axial', g);
    const mp = +c.magP || 0, ma = +c.magA || 0;
    return {fx: mp*vp.x + ma*va.x, fy: mp*vp.y + ma*va.y};
  }
  return {fx: +c.magX || 0, fy: -(+c.magY || 0)};      // vertical positiva hacia abajo
}
// Una carga de nudo es una puntual del plano: no hay eje de pieza al que referirla.
function compCargaNudo(c){ return {fx: +c.magX || 0, fy: -(+c.magY || 0)}; }
// Las dos componentes con su nombre y su flecha, para los rótulos.
function partesPuntual(c){
  return c.marco === 'eje'
    ? [{k:'magP', v:+c.magP || 0, ico:'\u21e3', nom:'perpendicular'}, {k:'magA', v:+c.magA || 0, ico:'\u21e2', nom:'axial'}]
    : [{k:'magY', v:+c.magY || 0, ico:'\u2193', nom:'vertical'},      {k:'magX', v:+c.magX || 0, ico:'\u2192', nom:'horizontal'}];
}
function descComponentes(c){
  const hay = partesPuntual(c).filter(q=>Math.abs(q.v) > 1e-12);
  if(!hay.length) return '0';
  return hay.map(q=>q.ico + ' ' + dec(q.v,'f')).join('  ');
}
// La resultante del nudo es lo que lee el motor de equilibrio (06-).
function recomponerCargaNudo(n){
  let fx = 0, fy = 0;
  (n.cargas || []).forEach(c=>{ const q = compCargaNudo(c); fx += q.fx; fy += q.fy; });
  n.fx = fx; n.fy = fy;
  return n;
}
// Deja en el nudo una única fuerza con sus dos componentes. La usan los ejemplos.
function ponerCargaNudo(n, magY, magX){
  n.cargas = (Math.abs(magY) > 1e-12 || Math.abs(magX) > 1e-12) ? [{magY:magY || 0, magX:magX || 0}] : [];
  return recomponerCargaNudo(n);
}
// ── Lectura de los archivos anteriores al convenio único (2026-09-09) ──
// Antes una carga se guardaba por COMPONENTES (fx, fy con +y hacia arriba) y
// una repartida con w1/w2 firmadas sobre el eje de su dirección. Se convierte al
// abrir; al guardar de nuevo, el archivo ya sale en el modelo nuevo.
function _cargasNudoDeComponentes(fx, fy){
  return (Math.abs(fx) > 1e-12 || Math.abs(fy) > 1e-12) ? [{magY:-fy, magX:fx}] : [];
}
function normalizarCargasNodo(n){
  const out = [];
  (n.cargas || []).forEach(c=>{
    if(!c) return;
    if(c.magY !== undefined || c.magX !== undefined){ out.push({magY:+c.magY || 0, magX:+c.magX || 0}); return; }
    // formato de la primera entrega del convenio: una dirección por fuerza
    if(c.dir && c.mag !== undefined){
      out.push(c.dir === 'x' ? {magY:0, magX:+c.mag || 0} : {magY:+c.mag || 0, magX:0});
      return;
    }
    _cargasNudoDeComponentes(+c.fx || 0, +c.fy || 0).forEach(q=>out.push(q));
  });
  if(!out.length && (Math.abs(n.fx || 0) > 1e-12 || Math.abs(n.fy || 0) > 1e-12))
    _cargasNudoDeComponentes(n.fx || 0, n.fy || 0).forEach(q=>out.push(q));
  n.cargas = out;
  return recomponerCargaNudo(n);
}
function normalizarCargasBarra(b){
  const na = nodos.find(z=>z.id === b.a), nb = nodos.find(z=>z.id === b.b);
  const g = (na && nb) ? geomBarra(b) : null;
  b.cargas = cargasDeBarra(b).map(c=>{
    if(c.tipo === 'M') return {tipo:'M', s:+c.s || 0, mag:+(c.mag !== undefined ? c.mag : c.m) || 0};
    if(c.tipo === 'P'){
      if(c.magY !== undefined || c.magX !== undefined || c.magP !== undefined || c.magA !== undefined)
        return Object.assign({tipo:'P', s:+c.s || 0, marco:c.marco || 'plano'}, c, {tipo:'P'});
      if(c.mag !== undefined){         // una dirección por carga (primera entrega del convenio)
        const m = +c.mag || 0;
        return (c.dir === 'perp' || c.dir === 'axial')
          ? {tipo:'P', s:+c.s || 0, marco:'eje',   magP:(c.dir === 'perp' ? m : 0), magA:(c.dir === 'axial' ? m : 0)}
          : {tipo:'P', s:+c.s || 0, marco:'plano', magY:(c.dir === 'x' ? 0 : m),    magX:(c.dir === 'x' ? m : 0)};
      }
      return {tipo:'P', s:+c.s || 0, marco:'plano', magY:-(+c.fy || 0), magX:+c.fx || 0};
    }
    if(c.mag !== undefined && esRepartida(c)) return c;
    // repartida antigua ('w'): w1/w2 firmadas sobre el eje de la dirección vieja
    const dir = c.dir === 'n' ? 'perp' : (c.dir === 'x' ? 'x' : 'y');
    const vNuevo = vectorCarga(dir, g);
    const vViejo = c.dir === 'x' ? {x:1, y:0}
                 : c.dir === 'n' ? {x:(g ? g.nx : 0), y:(g ? g.ny : 1)}
                 : {x:0, y:1};
    const sg = (vNuevo.x*vViejo.x + vNuevo.y*vViejo.y) >= 0 ? 1 : -1;
    const w1 = sg*(+c.w1 || 0), w2 = sg*(+c.w2 || 0);
    return Math.abs(w1 - w2) < 1e-12
      ? {tipo:'U', s1:+c.s1 || 0, s2:+c.s2 || 0, dir, mag:w1}
      : {tipo:'T', s1:+c.s1 || 0, s2:+c.s2 || 0, dir, mag:w1, mag2:w2};
  });
  return b;
}
// Deja TODO el modelo en el convenio vigente. Se llama al abrir un archivo, al
// deshacer y al cargar un ejemplo.
function normalizarCargasArm(){
  nodos.forEach(normalizarCargasNodo);
  barras.forEach(normalizarCargasBarra);
}
// Integrales de una carga repartida lineal desde s1 hasta e (≤ s2): ∫w ds y ∫s·w ds.
function _intW(c, e){
  const w1 = wIni(c), Lw = Math.max(c.s2 - c.s1, 1e-12), k = (wFin(c) - w1)/Lw;
  const I0 = w1*(e - c.s1) + k*(e - c.s1)*(e - c.s1)/2;
  const I1 = w1*(e*e - c.s1*c.s1)/2 + k*((e*e*e - c.s1*c.s1*c.s1)/3 - c.s1*(e*e - c.s1*c.s1)/2);
  return {I0, I1};
}
// Resultante (Fx, Fy) y momento respecto del extremo a de las cargas de la barra;
// con `hastaS` solo las que caen en [0, hastaS] (las repartidas, recortadas).
function resultanteCargas(b, hastaS){
  const g = geomBarra(b);
  let Fx = 0, Fy = 0, Ma = 0;
  cargasDeBarra(b).forEach(c=>{
    if(c.tipo === 'P'){
      if(hastaS !== undefined && c.s > hastaS) return;
      const q = compCargaPuntual(c, g);
      Fx += q.fx; Fy += q.fy; Ma += c.s*(g.ux*q.fy - g.uy*q.fx);
    }
    else if(c.tipo === 'M'){ if(hastaS !== undefined && c.s > hastaS) return; Ma += c.mag; }
    else if(esRepartida(c)){
      const e = hastaS === undefined ? c.s2 : Math.min(hastaS, c.s2);
      if(e <= c.s1) return;
      const d = vectorCarga(c.dir, g), I = _intW(c, e);
      Fx += I.I0*d.x; Fy += I.I0*d.y; Ma += (g.ux*d.y - g.uy*d.x)*I.I1;
    }
  });
  return {Fx, Fy, Ma};
}
function nomDir(dir){ return (DIR_CARGA_ARM[dir] || DIR_CARGA_ARM.y).nom.toLowerCase(); }
function descCarga(c){
  if(c.tipo === 'P') return 'Puntual ' + descComponentes(c) + ' ' + unitFor + ' en ' + dec(c.s,'len') + ' ' + unitLen;
  if(c.tipo === 'M') return 'Par ' + dec(c.mag,'f') + ' ' + unitFor + '·' + unitLen + ' (antihorario +) en s = ' + dec(c.s,'len') + ' ' + unitLen;
  const val = c.tipo === 'U' ? dec(wIni(c),'f') : dec(wIni(c),'f') + ' → ' + dec(wFin(c),'f');
  return 'Repartida ' + val + ' ' + unitFor + '/' + unitLen + ' ' + nomDir(c.dir) + ' de s = ' + dec(c.s1,'len') + ' a ' + dec(c.s2,'len') + ' ' + unitLen;
}
// Descripción de una carga de nudo, en el mismo convenio.
function descCargaNudo(c){
  return descComponentes(c) + ' ' + unitFor;
}
// Cuántas incógnitas aporta un apoyo (amplía gradosApoyo de 06-).
function gradosApoyoMarco(n){ return n.apoyo === 'empotrado' ? 3 : gradosApoyo(n); }

// ══ Motor: desmembrado ═══════════════════════════════════════════════════════
function analizarMarco(){
  const j = nodos.length, m = barras.length;
  const inc = [], idx = {};
  const clave = (tipo, id, ext, comp) => tipo + ':' + id + ':' + ext + ':' + comp;
  barras.forEach(b=>{
    ['a','b'].forEach(ext=>{
      const nid = ext === 'a' ? b.a : b.b;
      ['x','y'].forEach(comp=>{ idx[clave('F',b.id,ext,comp)] = inc.length; inc.push({tipo:'F', barra:b, ext, comp, nodo:nid}); });
      if(esRigidoExtremo(b, ext)){ idx[clave('F',b.id,ext,'m')] = inc.length; inc.push({tipo:'F', barra:b, ext, comp:'m', nodo:nid}); }
    });
  });
  nodos.forEach(n=>{
    const comps = n.apoyo === 'fijo' ? ['x','y'] : n.apoyo === 'movil' ? [n.apAng === 0 ? 'x' : 'y'] : n.apoyo === 'empotrado' ? ['x','y','m'] : [];
    comps.forEach(comp=>{ idx[clave('R',n.id,'',comp)] = inc.length; inc.push({tipo:'R', nodo:n.id, comp}); });
  });
  const r = inc.filter(u=>u.tipo==='R').length;
  const U = inc.length;
  const A = [], bb = [], filas = [];
  const fila = info => { A.push(new Array(U).fill(0)); bb.push(0); filas.push(info); return A.length-1; };
  const set = (fi, k, v) => { if(k !== undefined) A[fi][k] += v; };
  barras.forEach(b=>{
    const g = geomBarra(b), rc = resultanteCargas(b);
    const fx = fila({tipo:'pieza', barra:b, ec:'x'});
    set(fx, idx[clave('F',b.id,'a','x')], 1); set(fx, idx[clave('F',b.id,'b','x')], 1); bb[fx] = -rc.Fx;
    const fy = fila({tipo:'pieza', barra:b, ec:'y'});
    set(fy, idx[clave('F',b.id,'a','y')], 1); set(fy, idx[clave('F',b.id,'b','y')], 1); bb[fy] = -rc.Fy;
    const fm = fila({tipo:'pieza', barra:b, ec:'m'});
    set(fm, idx[clave('F',b.id,'a','m')], 1); set(fm, idx[clave('F',b.id,'b','m')], 1);
    set(fm, idx[clave('F',b.id,'b','y')], g.nb.x - g.na.x); set(fm, idx[clave('F',b.id,'b','x')], -(g.nb.y - g.na.y));
    bb[fm] = -rc.Ma;
  });
  let nudosRigidos = 0;
  nodos.forEach(n=>{
    const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
    ['x','y'].forEach(comp=>{
      const fi = fila({tipo:'nudo', nodo:n, ec:comp});
      conec.forEach(b=>{ const ext = b.a===n.id ? 'a' : 'b'; set(fi, idx[clave('F',b.id,ext,comp)], 1); });
      set(fi, idx[clave('R',n.id,'',comp)], -1);
      bb[fi] = comp === 'x' ? (n.fx||0) : (n.fy||0);
    });
    if(n.union === 'rigido'){
      nudosRigidos++;
      const fi = fila({tipo:'nudo', nodo:n, ec:'m'});
      conec.forEach(b=>{ const ext = b.a===n.id ? 'a' : 'b'; set(fi, idx[clave('F',b.id,ext,'m')], 1); });
      set(fi, idx[clave('R',n.id,'','m')], -1);
      bb[fi] = 0;
    }
  });
  const E = A.length;
  const extArt = inc.filter(u=>u.tipo==='F' && u.comp==='x').length, extRig = inc.filter(u=>u.tipo==='F' && u.comp==='m').length;
  const diag = {j, m, r, U, E, extArt, extRig, nudosRigidos, suma:U, req:E};
  if(j < 2 || m < 1) return {error:'Hace falta al menos dos nudos y una barra.', diag, marco:true};
  if(U < E) return {error:'inestable', diag, marco:true};
  if(U > E) return {error:'hiperestatica', diag, marco:true};
  const x = resolverSistema(A, bb);
  if(!x) return {error:'singular', diag, marco:true};

  const extremos = {}, reacciones = {}, fuerzas = {}, dosFuerzas = {};
  barras.forEach(b=>{
    const val = (ext, comp) => { const k = idx[clave('F',b.id,ext,comp)]; return k === undefined ? 0 : x[k]; };
    extremos[b.id] = {a:{fx:val('a','x'), fy:val('a','y'), m:val('a','m')}, b:{fx:val('b','x'), fy:val('b','y'), m:val('b','m')}};
    dosFuerzas[b.id] = !esElemento(b);
    const g = geomBarra(b);
    // Fuerza axial (tracción positiva): en un elemento de dos fuerzas es toda la fuerza.
    if(dosFuerzas[b.id]) fuerzas[b.id] = -(extremos[b.id].a.fx*g.ux + extremos[b.id].a.fy*g.uy);
  });
  nodos.forEach(n=>{
    const kx_ = idx[clave('R',n.id,'','x')], ky_ = idx[clave('R',n.id,'','y')], km_ = idx[clave('R',n.id,'','m')];
    if(kx_ === undefined && ky_ === undefined && km_ === undefined) return;
    reacciones[n.id] = {};
    if(kx_ !== undefined) reacciones[n.id].rx = x[kx_];
    if(ky_ !== undefined) reacciones[n.id].ry = x[ky_];
    if(km_ !== undefined) reacciones[n.id].m = x[km_];
  });
  const esfuerzos = {};
  barras.forEach(b=>{ esfuerzos[b.id] = esfuerzosElemento(b, extremos[b.id]); });
  return {marco:true, fuerzas, reacciones, extremos, dosFuerzas, esfuerzos, diag, inc, idx, x, idxReac:[]};
}

// ══ Esfuerzos internos a lo largo de un elemento ═══════════════════════════
function esfuerzosElemento(b, ex){
  const g = geomBarra(b), L = g.L, Fa = ex.a, Ma = ex.a.m || 0;
  const puntos = new Set([0, L]);
  const NM = 60; for(let i=1;i<NM;i++) puntos.add(L*i/NM);
  const eps = 1e-6*Math.max(L, 1);
  cargasDeBarra(b).forEach(c=>{
    if(esRepartida(c)){ puntos.add(c.s1); puntos.add(c.s2); }
    else { puntos.add(Math.max(0, c.s - eps)); puntos.add(Math.min(L, c.s + eps)); }
  });
  const ss = [...puntos].filter(s=>s >= 0 && s <= L).sort((p,q)=>p-q);
  const pts = ss.map(s=>{
    const rc = resultanteCargas(b, s);
    const Fx = Fa.fx + rc.Fx, Fy = Fa.fy + rc.Fy;
    const N = -(Fx*g.ux + Fy*g.uy), V = Fx*g.nx + Fy*g.ny;
    let M = Ma - s*(g.ux*Fa.fy - g.uy*Fa.fx);
    cargasDeBarra(b).forEach(c=>{
      if(c.tipo === 'P'){ if(c.s <= s){ const q = compCargaPuntual(c, g); M += (c.s - s)*(g.ux*q.fy - g.uy*q.fx); } }
      else if(c.tipo === 'M'){ if(c.s <= s) M += c.mag; }
      else if(esRepartida(c)){ const e = Math.min(s, c.s2); if(e > c.s1){ const d = vectorCarga(c.dir, g), I = _intW(c, e); M += (g.ux*d.y - g.uy*d.x)*(I.I1 - s*I.I0); } }
    });
    return {s, N, V, M:-M};
  });
  const ext = k => pts.reduce((m,p)=>Math.abs(p[k]) > Math.abs(m[k]) ? p : m, pts[0]);
  return {puntos:pts, L, maxN:ext('N'), maxV:ext('V'), maxM:ext('M')};
}

// ══ Cargas sobre una barra: ventana ═════════════════════════════════════════
let cargaBarraId = null, cargaBarraFilas = [], cargaBarraAbierta = 0;
function abrirCargaBarra(id){
  const b = barras.find(z=>z.id===id); if(!b) return;
  cargaBarraId = id;
  const g = geomBarra(b);
  document.getElementById('cargaBarraNom').textContent = nombreBarra(b);
  document.getElementById('cargaBarraA').textContent = g.na.nombre;
  cargaBarraFilas = cargasDeBarra(b).map(c=>Object.assign({}, c));
  if(!cargaBarraFilas.length) cargaBarraFilas.push(cargaBarraPorDefecto('P', g.L));
  cargaBarraAbierta = 0;
  renderCargaBarraLista();
  document.getElementById('cargaBarraModal').classList.add('show');
}
function closeCargaBarra(){ document.getElementById('cargaBarraModal').classList.remove('show'); cargaBarraId = null; }
function _campoCB(idx, campo, valor, etiqueta, unidad){
  return '<div class="carga-campo"><label class="carga-campo-lbl">' + etiqueta + '</label>'
    + '<div class="carga-input-wrap"><input type="number" step="any" value="' + valor + '" oninput="actualizarCampoCargaBarra(' + idx + ',&quot;' + campo + '&quot;,this.value)">'
    + '<span class="carga-campo-unit">' + unidad + '</span></div></div>';
}
// Celda de la matriz de doble entrada (posición y magnitud), como en fuerzas internas.
function _celdaCB(idx, campo, valor, colspan){
  return '<td' + (colspan ? ' colspan="' + colspan + '"' : '') + '>'
    + '<input type="number" step="any" value="' + valor + '" oninput="actualizarCampoCargaBarra(' + idx + ',&quot;' + campo + '&quot;,this.value)"></td>';
}
// Valores de partida de cada tipo, ya en el convenio (positivo hacia abajo).
function cargaBarraPorDefecto(tipo, L){
  const s = +(L/2).toFixed(4), fin = +L.toFixed(4);
  return tipo === 'P' ? {tipo:'P', s, marco:'plano', magY:10, magX:0}
       : tipo === 'M' ? {tipo:'M', s, mag:10}
       : tipo === 'T' ? {tipo:'T', s1:0, s2:fin, dir:'y', mag:0, mag2:5}
       :                {tipo:'U', s1:0, s2:fin, dir:'y', mag:5};
}
function renderCargaBarraLista(){
  const b = barras.find(z=>z.id===cargaBarraId); if(!b) return;
  const g = geomBarra(b), uw = unitFor + '/' + unitLen, um = unitFor + '·' + unitLen;
  const lista = document.getElementById('cargaBarraLista');
  lista.innerHTML = cargaBarraFilas.map((c, i)=>{
    if(i !== cargaBarraAbierta)
      return '<div class="carga-mini" onclick="cargaBarraAbierta=' + i + ';renderCargaBarraLista()"><span class="carga-mini-nom">Carga ' + (i+1) + '</span>'
        + '<span class="carga-mini-val">' + descCarga(c) + '</span>'
        + '<button class="carga-del" title="Quitar" onclick="event.stopPropagation();quitarCargaBarra(' + i + ')">\u00d7</button></div>';
    const rep2 = esRepartida(c), esPar = (c.tipo === 'M');
    // Tipo: los mismos cuatro de fuerzas internas, en botones marcados.
    const tipos = [['P','Puntual'], ['U','Uniforme'], ['T','Triangular'], ['M','Par']]
      .map(([v,t])=>segCargaArm(c.tipo===v, v, t, 'Carga ' + t.toLowerCase(),
          'cambiarTipoCargaBarra(' + i + ',&quot;' + v + '&quot;)')).join('');
    let h = '<div class="carga-card"><div class="carga-card-head"><span class="carga-card-title">Carga ' + (i+1) + '</span>'
      + '<button class="carga-del" title="Quitar" onclick="quitarCargaBarra(' + i + ')">\u00d7</button></div>'
      + '<div class="cg-grupo"><div class="cg-cap">Tipo</div><div class="cg-seg">' + tipos + '</div></div>';
    // Matriz de doble entrada. En la puntual las dos columnas son sus DOS
    // componentes, que van juntas en la misma carga: una inclinada es una sola.
    const uMag = esPar ? um : (rep2 ? uw : unitFor);
    const pp = partesPuntual(c);
    const cab = (c.tipo === 'P') ? [pp[0].ico + ' ' + pp[0].nom.slice(0,1).toUpperCase() + pp[0].nom.slice(1),
                                    pp[1].ico + ' ' + pp[1].nom.slice(0,1).toUpperCase() + pp[1].nom.slice(1)]
              : rep2 ? ['Inicio', 'Final'] : ['Valor', ''];
    h += '<table class="cg-tabla"><thead><tr><th></th><th>' + cab[0] + '</th>'
       + ((rep2 || c.tipo === 'P') ? '<th>' + cab[1] + '</th>' : '') + '</tr></thead><tbody>'
       + '<tr><th>Posici\u00f3n (' + unitLen + ')</th>'
       + (rep2 ? _celdaCB(i,'s1',c.s1) + _celdaCB(i,'s2',c.s2) : _celdaCB(i,'s',c.s, c.tipo === 'P' ? 2 : 0))
       + '</tr><tr><th>' + (esPar ? 'Momento' : 'Magnitud') + ' (' + uMag + ')</th>'
       + (c.tipo === 'P' ? _celdaCB(i,pp[0].k,pp[0].v) + _celdaCB(i,pp[1].k,pp[1].v)
        : c.tipo === 'T' ? _celdaCB(i,'mag',c.mag) + _celdaCB(i,'mag2',c.mag2)
                         : _celdaCB(i,'mag',c.mag, rep2 ? 2 : 0))
       + '</tr></tbody></table>';
    if(esPar){
      h += '<div class="hint-sm">Positivo antihorario.</div>';
    } else if(c.tipo === 'P'){
      // El marco decide a qué se refieren las dos componentes.
      const marco = c.marco || 'plano';
      const bm = [['plano','Plano X, Y'], ['eje','Eje de la pieza']]
        .map(([v,t])=>segCargaArm(marco===v, v, t,
            v === 'plano' ? 'Vertical positiva hacia abajo y horizontal hacia la derecha'
                          : 'Perpendicular «contra» la pieza y axial en su sentido de avance',
            'actualizarCampoCargaBarra(' + i + ',&quot;marco&quot;,&quot;' + v + '&quot;)')).join('');
      h += '<div class="cg-grupo"><div class="cg-cap">Componentes referidas a</div><div class="cg-seg">' + bm + '</div>'
        + '<div class="hint-sm">Las dos van en la misma carga: una carga inclinada es una sola.</div></div>';
    } else {
      const dir = c.dir || 'y';
      const bot = [['y','\u2193 Vert.'], ['x','\u2192 Horiz.'], ['perp','\u21e3 Perp.'], ['axial','\u21e2 Axial']]
        .map(([v,t])=>segCargaArm(dir===v, v, t, DIR_CARGA_ARM[v].ayuda,
            'actualizarCampoCargaBarra(' + i + ',&quot;dir&quot;,&quot;' + v + '&quot;)')).join('');
      h += '<div class="cg-grupo"><div class="cg-cap">Direcci\u00f3n</div><div class="cg-seg">' + bot + '</div>'
        + '<div class="hint-sm">' + DIR_CARGA_ARM[dir].ayuda + '</div></div>';
    }
    return h + '</div>';
  }).join('');
  const res = document.getElementById('cargaBarraResumen');
  if(res) res.innerHTML = 'Viga <b>' + nombreBarra(b) + '</b> de ' + dec(g.L,'len') + ' ' + unitLen + ' (s de 0 a ' + dec(g.L,'len') + '). '
    + cargaBarraFilas.length + ' carga(s): la pieza se resuelve como elemento de varias fuerzas.';
  dibujarCroquisBarra();
}

// ── Croquis acotado de la pieza, con la carga abierta marcada ──
// El mismo papel que el croquis del tramo en fuerzas internas: enseña dónde cae
// la carga que se está escribiendo y hacia dónde empuja.
function dibujarCroquisBarra(){
  const cont = document.getElementById('cargaBarraCroquis'); if(!cont) return;
  const b = barras.find(z=>z.id===cargaBarraId);
  if(!b){ cont.innerHTML = '<div style="font-size:10.5px;color:#66727e;padding:14px 6px">Sin pieza.</div>'; return; }
  const g = geomBarra(b);
  const W2 = 220, M = 30, H2max = 200;
  const dx = g.nb.x - g.na.x, dy = g.nb.y - g.na.y;
  const k = Math.min((W2-2*M)/Math.max(Math.abs(dx),1e-6), (H2max-2*M-26)/Math.max(Math.abs(dy),1e-6), 90);
  const H2 = Math.max(110, Math.min(H2max, Math.abs(dy)*k + 2*M + 26));
  const cx = W2/2, cy = H2/2 - 4;
  const ax = cx - dx*k/2, ay = cy + dy*k/2, bx = cx + dx*k/2, by = cy - dy*k/2;
  let s = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;height:auto;display:block">'
        + '<rect width="' + W2 + '" height="' + H2 + '" fill="#fff"/>';
  s += '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="#7c3a06" stroke-width="5" stroke-linecap="round"/>'
     + '<circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="4" fill="#7c3a06"/>'
     + '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="4" fill="#7c3a06"/>'
     + '<text x="' + (ax-9).toFixed(1) + '" y="' + (ay+4).toFixed(1) + '" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">' + g.na.nombre + '</text>'
     + '<text x="' + (bx+5).toFixed(1) + '" y="' + (by+4).toFixed(1) + '" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">' + g.nb.nombre + '</text>';
  // cota de la longitud, por el lado opuesto a la carga
  const ox = -(by-ay), oy = (bx-ax), on = Math.hypot(ox,oy) || 1;
  const px = ox/on*24, py = oy/on*24;      // holgado, para no chocar con el rotulo de la posicion
  s += '<line x1="' + (ax+px).toFixed(1) + '" y1="' + (ay+py).toFixed(1) + '" x2="' + (bx+px).toFixed(1) + '" y2="' + (by+py).toFixed(1) + '" stroke="#1b1f24" stroke-width="1"/>';
  let am = Math.atan2((by)-(ay), (bx)-(ax));
  if(am > Math.PI/2 || am < -Math.PI/2) am += Math.PI;
  s += '<g transform="translate(' + ((ax+bx)/2+px).toFixed(1) + ',' + ((ay+by)/2+py).toFixed(1) + ') rotate(' + (am*180/Math.PI).toFixed(1) + ')">'
     + '<text y="-4" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#1b1f24" text-anchor="middle">L = ' + dec(g.L,'len') + ' ' + unitLen + '</text></g>';
  // la carga abierta
  const c = cargaBarraFilas[cargaBarraAbierta];
  if(c){
    const F = s0 => Math.max(0, Math.min(1, s0/(g.L || 1)));
    const Pt = f => [ax + (bx-ax)*f, ay + (by-ay)*f];
    if(esRepartida(c)){
      const f1 = F(c.s1), f2 = F(c.s2);
      const [q1x,q1y] = Pt(f1), [q2x,q2y] = Pt(f2);
      if(Math.abs(f2-f1) > 1e-6){
        s += '<line x1="' + q1x.toFixed(1) + '" y1="' + q1y.toFixed(1) + '" x2="' + q2x.toFixed(1) + '" y2="' + q2y.toFixed(1) + '" stroke="#c0392b" stroke-width="7" stroke-linecap="round" opacity=".55"/>'
           + '<text x="' + ((q1x+q2x)/2-px).toFixed(1) + '" y="' + ((q1y+q2y)/2-py).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">cargado ' + dec(Math.abs(c.s2-c.s1),'len') + '</text>';
      }
    } else {
      const f1 = F(c.s), [qx,qy] = Pt(f1);
      // El rótulo de la posición va al lado CONTRARIO de la flecha; si no, la
      // punta de la carga se le monta encima.
      const qF = (c.tipo === 'P') ? compCargaPuntual(c, g) : null;
      const mF = qF ? Math.hypot(qF.fx, qF.fy) : 0;
      const dx0 = mF > 1e-12 ? qF.fx/mF*15 : 0;
      const dy0 = mF > 1e-12 ? -qF.fy/mF*15 : -11;
      s += '<circle cx="' + qx.toFixed(1) + '" cy="' + qy.toFixed(1) + '" r="5" fill="#c0392b"/>'
         + '<text x="' + (qx+dx0).toFixed(1) + '" y="' + (qy+dy0+3).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">' + dec(c.s,'len') + '</text>';
    }
    // sentido en el que empuja la magnitud escrita
    const qC = (c.tipo === 'P') ? compCargaPuntual(c, g) : null;
    const magC = qC ? Math.hypot(qC.fx, qC.fy) : Math.abs(c.mag);
    if(c.tipo !== 'M' && magC > 1e-12){
      let ux, uy;
      if(qC){ ux = qC.fx/magC; uy = -qC.fy/magC; }
      else { const v = vectorCarga(c.dir, g), sg = c.mag >= 0 ? 1 : -1; ux = v.x*sg; uy = -v.y*sg; }
      const f0 = esRepartida(c) ? (F(c.s1)+F(c.s2))/2 : F(c.s);
      const [mx0,my0] = Pt(f0);
      s += '<line x1="' + (mx0-ux*30).toFixed(1) + '" y1="' + (my0-uy*30).toFixed(1) + '" x2="' + (mx0-ux*8).toFixed(1) + '" y2="' + (my0-uy*8).toFixed(1) + '" stroke="#c0392b" stroke-width="2"/>'
         + '<polygon points="0,0 -8,-3.6 -8,3.6" fill="#c0392b" transform="translate(' + (mx0-ux*7).toFixed(1) + ',' + (my0-uy*7).toFixed(1) + ') rotate(' + (Math.atan2(uy,ux)*180/Math.PI).toFixed(1) + ')"/>';
    }
  }
  cont.innerHTML = s + '</svg>';
}
function actualizarCampoCargaBarra(i, campo, valor){
  const c = cargaBarraFilas[i]; if(!c) return;
  if(campo === 'dir' || campo === 'marco'){
    if(campo === 'marco' && c.marco !== valor){
      // al cambiar de marco las componentes anteriores dejan de tener sentido
      c.marco = valor;
      if(valor === 'eje'){ c.magP = 0; c.magA = 0; delete c.magY; delete c.magX; }
      else { c.magY = 0; c.magX = 0; delete c.magP; delete c.magA; }
    } else c[campo] = valor;
    renderCargaBarraLista();
  } else { c[campo] = parseFloat(valor) || 0; dibujarCroquisBarra(); }
}
function cambiarTipoCargaBarra(i, tipo){
  const b = barras.find(z=>z.id===cargaBarraId); const L = b ? geomBarra(b).L : 1;
  const c = cargaBarraFilas[i]; if(!c || c.tipo === tipo) return;
  const nuevo = cargaBarraPorDefecto(tipo, L);
  // se conserva lo que tenga sentido: la posición y la dirección elegidas
  if(c.dir && nuevo.dir) nuevo.dir = c.dir;
  if(esRepartida(nuevo) && esRepartida(c)){ nuevo.s1 = c.s1; nuevo.s2 = c.s2; nuevo.mag = c.mag; }
  else if(!esRepartida(nuevo) && c.s !== undefined) nuevo.s = c.s;
  cargaBarraFilas[i] = nuevo;
  renderCargaBarraLista();
}
function agregarCargaBarra(){
  const b = barras.find(z=>z.id===cargaBarraId); const L = b ? geomBarra(b).L : 1;
  cargaBarraFilas.push(cargaBarraPorDefecto('P', L));
  cargaBarraAbierta = cargaBarraFilas.length - 1;
  renderCargaBarraLista();
}
function quitarCargaBarra(i){
  cargaBarraFilas.splice(i, 1);
  cargaBarraAbierta = Math.max(0, Math.min(cargaBarraAbierta, cargaBarraFilas.length - 1));
  renderCargaBarraLista();
}
function applyCargaBarra(){
  const b = barras.find(z=>z.id===cargaBarraId);
  if(b){
    registrarCambio();
    const L = geomBarra(b).L;
    b.cargas = cargaBarraFilas.map(c=>{
      const q = Object.assign({}, c);
      if(esRepartida(q)){ q.s1 = Math.max(0, Math.min(L, q.s1)); q.s2 = Math.max(q.s1, Math.min(L, q.s2)); if(!q.dir) q.dir = 'y'; }
      else { q.s = Math.max(0, Math.min(L, q.s)); if(q.tipo === 'P' && !q.marco) q.marco = 'plano'; }
      return q;
    }).filter(c=>esRepartida(c) ? (c.s2 > c.s1 && (Math.abs(wIni(c)) > 1e-12 || Math.abs(wFin(c)) > 1e-12))
             : (c.tipo === 'M' ? Math.abs(c.mag) > 1e-12
                               : partesPuntual(c).some(q=>Math.abs(q.v) > 1e-12)));
    resultado = null;
  }
  closeCargaBarra(); refrescar();
}
function quitarCargasBarra(id){
  const b = barras.find(z=>z.id===id); if(!b) return;
  registrarCambio(); b.cargas = []; resultado = null; refrescar();
}
// Unión del nudo (pasador / rígida) y extremos articulados de una barra.
function setUnionNodo(u){
  const n = nodos.find(z=>z.id===edNodoId); if(!n) return;
  if(n.apoyo === 'empotrado' && u !== 'rigido'){ aviso('Un empotramiento fija el nudo: la unión es rígida.'); return; }
  registrarCambio(); n.union = u; resultado = null;
  pintarUnionNodo(n); refrescar();
}
function pintarUnionNodo(n){
  const a = document.getElementById('unPas'), r = document.getElementById('unRig');
  if(a) a.classList.toggle('active', (n.union||'pasador') !== 'rigido');
  if(r) r.classList.toggle('active', n.union === 'rigido');
}
function setArticulado(ext, si){
  const b = barras.find(z=>z.id===edBarraId); if(!b) return;
  registrarCambio(); if(ext === 'a') b.artA = !!si; else b.artB = !!si;
  resultado = null; refrescar();
}

// ══ Dibujo en el lienzo ═════════════════════════════════════════════════════
function dibujarCargasBarras(){
  barras.forEach(b=>{
    const cargas = cargasDeBarra(b); if(!cargas.length) return;
    const g = geomBarra(b);
    const P = s => aPantalla(g.na.x + g.ux*s, g.na.y + g.uy*s);
    cargas.forEach(c=>{
      ctx.save(); ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 2.2;
      ctx.font = '600 10.5px Inter, sans-serif'; ctx.textAlign = 'center';
      if(c.tipo === 'P'){
        const [px,py] = P(c.s), q = compCargaPuntual(c, g), mag = Math.hypot(q.fx, q.fy);
        if(mag < 1e-12){ ctx.restore(); return; }
        const ux = q.fx/mag, uy = q.fy/mag, L = 42;
        const sx = px - ux*L, sy = py + uy*L;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px - ux*9, py + uy*9); ctx.stroke();
        ctx.save(); ctx.translate(px - ux*8, py + uy*8); ctx.rotate(Math.atan2(-uy, ux));
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10,-4.5); ctx.lineTo(-10,4.5); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillText(dec(mag,'f') + ' ' + unitFor, sx - ux*8, sy + uy*8 - 6);
      } else if(c.tipo === 'M'){
        const [px,py] = P(c.s), R = 14, ccw = c.mag > 0;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, R, ccw ? -0.2 : Math.PI+0.2, ccw ? -Math.PI*1.3 : -Math.PI*0.3, true); ctx.stroke();
        const ae = ccw ? -Math.PI*1.3 : -Math.PI*0.3;
        const ex = px + R*Math.cos(ae), ey = py + R*Math.sin(ae);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ae + (ccw ? -Math.PI/2 : Math.PI/2));
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,-4); ctx.lineTo(-9,4); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillText(dec(Math.abs(c.mag),'f') + ' ' + unitFor + '·' + unitLen, px, py - R - 6);
      } else {
        const d = vectorCarga(c.dir, g), n = 6, Lmax = 34;
        const wmax = Math.max(Math.abs(wIni(c)), Math.abs(wFin(c)), 1e-12);
        const puntas = [];
        for(let i=0;i<=n;i++){
          const s = c.s1 + (c.s2 - c.s1)*i/n, w = wIni(c) + (wFin(c) - wIni(c))*i/n;
          const [px,py] = P(s), len = Lmax*Math.abs(w)/wmax;
          const sg = w >= 0 ? 1 : -1;              // el vector w·d apunta hacia donde empuja
          const ux = d.x*sg, uy = d.y*sg;           // la flecha llega a la barra con ese sentido
          const sx = px - ux*len, sy = py + uy*len;
          puntas.push([sx, sy]);
          if(len < 2) continue;
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px - ux*6, py + uy*6); ctx.stroke();
          ctx.save(); ctx.translate(px - ux*5, py + uy*5); ctx.rotate(Math.atan2(-uy, ux));
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-7,-3.2); ctx.lineTo(-7,3.2); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.lineWidth = 1.6; ctx.beginPath(); puntas.forEach((p,i)=>{ if(i) ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]); }); ctx.stroke();
        const txt = (Math.abs(wIni(c) - wFin(c)) < 1e-9 ? dec(Math.abs(wIni(c)),'f') : dec(Math.abs(wIni(c)),'f') + ' → ' + dec(Math.abs(wFin(c)),'f')) + ' ' + unitFor + '/' + unitLen;
        const pm = puntas[Math.floor(n/2)];
        ctx.fillText(txt, pm[0], pm[1] - 7);
      }
      ctx.restore();
    });
  });
}
function dibujarApoyoEmpotrado(n){
  const [px,py] = aPantalla(n.x, n.y);
  // El muro va del lado contrario a las piezas que llegan al nudo, como en
  // fuerzas-internas: se promedian las direcciones EN PANTALLA (y invertida)
  // y el símbolo gira con ellas, sin redondear a 90°. Antes se promediaba en
  // coordenadas del modelo y el muro de una columna salía encima del nudo.
  let sx = 0, sy = 0;
  barras.filter(b=>b.a===n.id||b.b===n.id).forEach(b=>{
    const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a)); if(!o) return;
    const [ox,oy] = aPantalla(o.x, o.y), L = Math.hypot(ox-px, oy-py) || 1;
    sx += (ox-px)/L; sy += (oy-py)/L;
  });
  const Lm = Math.hypot(sx, sy);
  const mx = Lm < 1e-6 ? 0 : -sx/Lm, my = Lm < 1e-6 ? 1 : -sy/Lm;   // sin piezas: muro debajo
  ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(my, mx));   // +x local mira al muro
  ctx.strokeStyle = '#7c3a06'; ctx.fillStyle = '#7c3a06'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(6, 18); ctx.stroke();
  for(let i=-3;i<=3;i++){ ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(6, i*6); ctx.lineTo(13, i*6+6); ctx.stroke(); }
  ctx.restore();
}
function dibujarNudoRigido(n){
  const [px,py] = aPantalla(n.x, n.y);
  ctx.fillStyle = '#7c3a06'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(px-6.5, py-6.5, 13, 13); ctx.fill(); ctx.stroke();
}

// ══ Resolver y presentar ════════════════════════════════════════════════════
function resolverMarco(){
  const res = analizarMarco();
  const rp = document.getElementById('resultsPanel'), ra = document.getElementById('resultsArea'), hint = document.getElementById('noResultsHint');
  if(!rp || !ra) return;
  ra.style.display = 'block'; if(hint) hint.style.display = 'none'; rp.style.display = 'block';
  if(res.error){
    resultado = null;
    rp.innerHTML = renderErrorMarco(res);
    try{ renderKatex(rp); }catch(e){}
    dibujar();
    setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} }, 120);
    return;
  }
  resultado = res;
  rp.innerHTML = renderResultadosMarco(res);
  try{ renderKatex(rp); }catch(e){ console.warn('KaTeX:', e); }
  dibujar();
  setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} }, 120);
}
function renderErrorMarco(res){
  const d = res.diag;
  let titulo, cuerpo;
  if(res.error === 'inestable'){ titulo = 'Bastidor inestable (mecanismo)'; cuerpo = 'Hay menos incógnitas que ecuaciones: falta alguna unión rígida, barra o apoyo.'; }
  else if(res.error === 'hiperestatica'){ titulo = 'Bastidor estáticamente indeterminado'; cuerpo = 'Hay más incógnitas que ecuaciones de equilibrio: la estática sola no basta (Análisis Estructural).'; }
  else if(res.error === 'singular'){ titulo = 'Configuración inestable'; cuerpo = 'Las incógnitas igualan a las ecuaciones, pero la disposición no es estable (piezas alineadas o pasadores que permiten un giro).'; }
  else { titulo = 'Faltan datos'; cuerpo = res.error; }
  return '<div class="res-section"><div class="res-title"><div class="num">1</div>Determinación estática del bastidor</div>'
    + '<div class="verdict bad"><div class="verdict-t">Resultado</div><b>' + titulo + '</b><br>' + cuerpo + '</div>'
    + (d ? '<div class="proc-block"><div class="eq-row"><div class="eq-body">' + kx('\\text{Incógnitas } U = ' + d.U + ' \\qquad \\text{Ecuaciones } E = ' + d.E) + '</div></div></div>' : '')
    + '</div>';
}
const _simbExt = (b, ext) => { const n = nodos.find(z=>z.id===(ext==='a'?b.a:b.b)); return n ? n.nombre : '?'; };
function renderResultadosMarco(res){
  const d = res.diag, f = v => dec(v,'f'), uF = unitFor, uL = unitLen, uM = unitFor + '·' + unitLen;
  let h = '';
  const elementos = barras.filter(b=>!res.dosFuerzas[b.id]), dosF = barras.filter(b=>res.dosFuerzas[b.id]);

  // 1 · Determinación
  h += '<div class="res-section"><div class="res-title"><div class="num">1</div>Determinación estática del bastidor</div>'
    + '<div class="verdict ok"><div class="verdict-t">Resultado</div><b>Bastidor isostático.</b></div>'
    + '<div class="proc-block proc-cols"><div class="proc-col"><div class="proc-sub">Incógnitas</div><div class="eq-row"><div class="eq-body">'
    + kx('U = 2(' + d.extArt + ') + ' + d.extRig + ' + ' + d.r + ' = ' + d.U) + '</div></div>'
    + '<div class="hint-sm">2 por extremo de pieza, + 1 por extremo unido rígidamente, + r reacciones</div></div>'
    + '<div class="proc-col"><div class="proc-sub">Ecuaciones</div><div class="eq-row"><div class="eq-body">'
    + kx('E = 3(' + d.m + ') + 2(' + d.j + ') + ' + d.nudosRigidos + ' = ' + d.E) + '</div></div>'
    + '<div class="hint-sm">3 por pieza, + 2 por nudo, + 1 por nudo rígido</div></div></div></div>';

  // 2 · Reacciones
  h += '<div class="res-section"><div class="res-title"><div class="num">2</div>Reacciones en los apoyos</div>'
    + '<table class="tabla"><thead><tr><th>Apoyo</th><th>Tipo</th><th class="r">R<sub>x</sub> (' + uF + ')</th><th class="r">R<sub>y</sub> (' + uF + ')</th><th class="r">M (' + uM + ')</th></tr></thead><tbody>';
  nodos.forEach(n=>{ const R = res.reacciones[n.id]; if(!R) return;
    h += '<tr><td><b>' + n.nombre + '</b></td><td>' + (n.apoyo==='fijo' ? 'Fijo (pasador)' : n.apoyo==='empotrado' ? 'Empotrado' : 'Móvil (' + (n.apAng===0?'horizontal':'vertical') + ')') + '</td>'
      + '<td class="r">' + (R.rx!==undefined ? f(R.rx) : '—') + '</td><td class="r">' + (R.ry!==undefined ? f(R.ry) : '—') + '</td><td class="r">' + (R.m!==undefined ? f(R.m) : '—') + '</td></tr>'; });
  h += '</tbody></table><div class="hint-sm">Signo: + hacia +x, +y y antihorario.</div></div>';

  // 3 · Elementos de dos fuerzas
  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>Elementos de dos fuerzas</div>';
  if(dosF.length){
    h += '<table class="tabla"><thead><tr><th>Barra</th><th class="r">Fuerza (' + uF + ')</th><th>Naturaleza</th></tr></thead><tbody>'
      + dosF.map(b=>{ const v = res.fuerzas[b.id]; return '<tr><td><b>' + nombreBarra(b) + '</b></td><td class="r"><b>' + f(Math.abs(v)) + '</b></td><td>' + (esCero(v) ? '<span class="tag z">Fuerza cero</span>' : v > 0 ? '<span class="tag t">Tracción</span>' : '<span class="tag c">Compresión</span>') + '</td></tr>'; }).join('')
      + '</tbody></table><div class="hint-sm">Barras de armadura: sin cargas intermedias y articuladas en los dos extremos, la fuerza va a lo largo de la barra, una sola incógnita.</div>';
  } else h += '<div class="verdict"><div class="verdict-t">Resultado</div>Ninguna: todas las piezas son vigas o marcos.</div>';
  h += '</div>';

  // 4 · Desmembrado: cada pieza de varias fuerzas
  h += '<div class="res-section"><div class="res-title"><div class="num">4</div>Desmembrado: equilibrio de cada pieza</div>'
    + '<div class="hint-sm" style="margin-bottom:8px">Fuerzas de pasador sobre la pieza supuestas hacia +x y +y (momentos antihorarios); ΣM respecto del extremo ' + 'inicial de cada pieza.</div>';
  elementos.forEach((b, i)=>{
    const g = geomBarra(b), ex = res.extremos[b.id], rc = resultanteCargas(b);
    const A = _simbExt(b,'a'), B = _simbExt(b,'b');
    const ma = esRigidoExtremo(b,'a'), mb = esRigidoExtremo(b,'b');
    const dx = g.nb.x - g.na.x, dy = g.nb.y - g.na.y;
    const tX = [{v:1, tex:A + '_x'}, {v:1, tex:B + '_x'}]; if(Math.abs(rc.Fx) > 1e-9) tX.push({v:rc.Fx, tex:f(Math.abs(rc.Fx))});
    const tY = [{v:1, tex:A + '_y'}, {v:1, tex:B + '_y'}]; if(Math.abs(rc.Fy) > 1e-9) tY.push({v:rc.Fy, tex:f(Math.abs(rc.Fy))});
    const tM = []; if(ma) tM.push({v:1, tex:'M_{' + A + '}'}); if(mb) tM.push({v:1, tex:'M_{' + B + '}'});
    if(Math.abs(dx) > 1e-9) tM.push({v:dx, tex:dec(Math.abs(dx),'len') + '\\,' + B + '_y'});
    if(Math.abs(dy) > 1e-9) tM.push({v:-dy, tex:dec(Math.abs(dy),'len') + '\\,' + B + '_x'});
    if(Math.abs(rc.Ma) > 1e-9) tM.push({v:rc.Ma, tex:f(Math.abs(rc.Ma))});
    const ecX = _sumaTexArm(tX) + ' = 0', ecY = _sumaTexArm(tY) + ' = 0', ecM = _sumaTexArm(tM) + ' = 0';
    h += '<div class="joint-card"><div class="joint-h"><div class="joint-n">' + (i+1) + '</div>Viga / marco <b>' + nombreBarra(b) + '</b>'
      + '<span style="color:var(--muted);font-weight:500;font-size:11px">L = ' + dec(g.L,'len') + ' ' + uL + ' · ' + cargasDeBarra(b).length + ' carga(s)</span></div>'
      + '<div class="joint-body"><div>'
      + '<div class="eq-row"><div class="eq-body">' + kx('\\xrightarrow{+}\\ \\sum F_x = 0:\\quad ' + ecX) + '</div></div>'
      + '<div class="eq-row"><div class="eq-body">' + kx('+\\!\\uparrow\\ \\sum F_y = 0:\\quad ' + ecY) + '</div></div>'
      + '<div class="eq-row"><div class="eq-body">' + kx('\\circlearrowleft\\!+\\ \\sum M_{' + A + '} = 0:\\quad ' + ecM) + '</div></div>'
      + '<div class="proc-sub" style="margin-top:8px">Fuerzas de los pasadores sobre la pieza</div>'
      + '<div class="eq-row"><div class="eq-body">' + kx(A + '_x = ' + f(ex.a.fx) + '\\quad ' + A + '_y = ' + f(ex.a.fy) + (ma ? '\\quad M_{' + A + '} = ' + f(ex.a.m) : '') + '\\ [' + uF + (ma ? ', ' + uM : '') + ']') + '</div></div>'
      + '<div class="eq-row"><div class="eq-body">' + kx(B + '_x = ' + f(ex.b.fx) + '\\quad ' + B + '_y = ' + f(ex.b.fy) + (mb ? '\\quad M_{' + B + '} = ' + f(ex.b.m) : '') + '\\ [' + uF + (mb ? ', ' + uM : '') + ']') + '</div></div>'
      + '</div><div>' + svgDCLPieza(b, res) + '</div></div></div>';
  });
  h += '</div>';

  // 5 · Fuerzas en los pasadores
  h += '<div class="res-section"><div class="res-title"><div class="num">5</div>Fuerzas en los pasadores</div>'
    + '<table class="tabla"><thead><tr><th>Pasador</th><th>Sobre la pieza</th><th class="r">F<sub>x</sub> (' + uF + ')</th><th class="r">F<sub>y</sub> (' + uF + ')</th><th class="r">|F| (' + uF + ')</th><th class="r">M (' + uM + ')</th></tr></thead><tbody>';
  nodos.forEach(n=>{
    barras.filter(b=>b.a===n.id||b.b===n.id).forEach(b=>{
      const e = res.extremos[b.id][b.a===n.id ? 'a' : 'b'];
      const rig = esRigidoExtremo(b, b.a===n.id ? 'a' : 'b');
      h += '<tr><td><b>' + n.nombre + '</b></td><td>' + nombreBarra(b) + '</td><td class="r">' + f(e.fx) + '</td><td class="r">' + f(e.fy) + '</td><td class="r"><b>' + f(Math.hypot(e.fx, e.fy)) + '</b></td><td class="r">' + (rig ? f(e.m) : '—') + '</td></tr>';
    });
  });
  h += '</tbody></table><div class="hint-sm">Sobre la otra pieza (o sobre el apoyo) el pasador ejerce la fuerza igual y opuesta: tercera ley.</div></div>';

  // 6 · Diagramas N, V, M
  if(elementos.length){
    h += '<div class="res-section"><div class="res-title"><div class="num">6</div>Diagramas N · V · M de cada viga o marco</div>'
      + '<div class="hint-sm" style="margin-bottom:8px">s medida desde el primer extremo de la pieza; N + tracción; V y M con el convenio de vigas (M + curva el elemento hacia su lado +n, el de la izquierda al recorrerlo).</div>';
    elementos.forEach(b=>{
      const es = res.esfuerzos[b.id];
      h += '<div class="proc-block" style="margin-bottom:10px"><div class="proc-sub">Viga / marco ' + nombreBarra(b) + ' — L = ' + dec(es.L,'len') + ' ' + uL + '</div>'
        + svgDiagramasElemento(b, es)
        + '<div class="hint-sm">' + kx('N_{\\max} = ' + f(es.maxN.N) + '\\ (s = ' + dec(es.maxN.s,'len') + ')\\qquad V_{\\max} = ' + f(es.maxV.V) + '\\ (s = ' + dec(es.maxV.s,'len') + ')\\qquad M_{\\max} = ' + f(es.maxM.M) + '\\ (s = ' + dec(es.maxM.s,'len') + ')') + '</div></div>';
    });
    h += '</div>';
  }

  // 7 · Comprobación global
  {
    let sx = 0, sy = 0, sm = 0;
    nodos.forEach(n=>{ sx += n.fx||0; sy += n.fy||0; sm += n.x*(n.fy||0) - n.y*(n.fx||0);
      const R = res.reacciones[n.id]; if(R){ sx += R.rx||0; sy += R.ry||0; sm += n.x*(R.ry||0) - n.y*(R.rx||0) + (R.m||0); } });
    barras.forEach(b=>{ const g = geomBarra(b), rc = resultanteCargas(b);
      sx += rc.Fx; sy += rc.Fy; sm += rc.Ma + (g.na.x*rc.Fy - g.na.y*rc.Fx); });
    const esc0 = Math.max(1, ...Object.values(res.x).map(v=>Math.abs(v)));
    const cero = v => Math.abs(v) < 1e-7*esc0 ? '0' : f(v);
    h += '<div class="res-section"><div class="res-title"><div class="num">7</div>Comprobación del conjunto</div>'
      + '<div class="proc-block"><div class="eq-row"><div class="eq-body">' + kx('\\sum F_x = ' + cero(sx) + '\\qquad \\sum F_y = ' + cero(sy) + '\\qquad \\sum M_O = ' + cero(sm) + '\\qquad\\checkmark') + '</div></div></div></div>';
  }
  return h;
}

// DCL de una pieza en SVG: la barra en su orientación real, sus cargas y las
// fuerzas de pasador con su nombre (variable), en el sentido positivo supuesto.
function svgDCLPieza(b, res){
  const g = geomBarra(b), W2 = 300, H2 = 190, M = 58;
  const k = (W2 - 2*M)/Math.max(g.L, 1e-9);
  const cx = W2/2, cy = H2/2 + 8;
  const P = s => [cx + (s - g.L/2)*g.ux*k, cy - (s - g.L/2)*g.uy*k];
  const A = _simbExt(b,'a'), B = _simbExt(b,'b');
  const fl = (x, y, ang, col) => '<polygon points="0,0 -9,-4 -9,4" fill="' + col + '" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')"/>';
  let s = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;max-width:300px;height:auto;display:block"><rect width="' + W2 + '" height="' + H2 + '" fill="#fff"/>';
  const [ax,ay] = P(0), [bx,by] = P(g.L);
  s += '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="#7c3a06" stroke-width="4" stroke-linecap="round"/>';
  // cargas
  cargasDeBarra(b).forEach(c=>{
    if(c.tipo === 'P'){
      const [px,py] = P(c.s), q = compCargaPuntual(c, g), mag = Math.hypot(q.fx, q.fy);
      if(mag < 1e-12) return;
      const ux = q.fx/mag, uy = -q.fy/mag, L = 30;
      s += '<line x1="' + (px-ux*L).toFixed(1) + '" y1="' + (py-uy*L).toFixed(1) + '" x2="' + (px-ux*7).toFixed(1) + '" y2="' + (py-uy*7).toFixed(1) + '" stroke="#c0392b" stroke-width="2"/>' + fl(px-ux*6, py-uy*6, Math.atan2(uy,ux)*180/Math.PI, '#c0392b')
        + '<text x="' + (px-ux*L-ux*10).toFixed(1) + '" y="' + (py-uy*L-uy*10+3).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">' + dec(mag,'f') + '</text>';
    } else if(c.tipo === 'M'){
      const [px,py] = P(c.s);
      s += '<path d="M' + (px+10).toFixed(1) + ' ' + py.toFixed(1) + ' A10 10 0 1 ' + (c.mag > 0 ? 0 : 1) + ' ' + (px-7).toFixed(1) + ' ' + (py-7).toFixed(1) + '" fill="none" stroke="#c0392b" stroke-width="1.8"/>'
        + '<text x="' + px.toFixed(1) + '" y="' + (py-16).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">' + dec(Math.abs(c.mag),'f') + '</text>';
    } else {
      const d = vectorCarga(c.dir, g), n = 5, wmax = Math.max(Math.abs(wIni(c)), Math.abs(wFin(c)), 1e-12), pts = [];
      for(let i=0;i<=n;i++){
        const sv = c.s1 + (c.s2-c.s1)*i/n, w = wIni(c) + (wFin(c)-wIni(c))*i/n, [px,py] = P(sv), len = 22*Math.abs(w)/wmax;
        const sg = w >= 0 ? 1 : -1, ux = d.x*sg, uy = -d.y*sg;
        pts.push([px-ux*len, py-uy*len]);
        if(len > 2) s += '<line x1="' + (px-ux*len).toFixed(1) + '" y1="' + (py-uy*len).toFixed(1) + '" x2="' + (px-ux*5).toFixed(1) + '" y2="' + (py-uy*5).toFixed(1) + '" stroke="#c0392b" stroke-width="1.3"/>' + fl(px-ux*4, py-uy*4, Math.atan2(uy,ux)*180/Math.PI, '#c0392b');
      }
      s += '<polyline points="' + pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ') + '" fill="none" stroke="#c0392b" stroke-width="1.3"/>';
      const pm = pts[Math.floor(n/2)];
      s += '<text x="' + pm[0].toFixed(1) + '" y="' + (pm[1]-6).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">' + (Math.abs(wIni(c)-wFin(c))<1e-9 ? dec(Math.abs(wIni(c)),'f') : dec(Math.abs(wIni(c)),'f') + '→' + dec(Math.abs(wFin(c)),'f')) + '</text>';
    }
  });
  // fuerzas de pasador (sentido positivo supuesto) y momentos
  [['a', ax, ay, A], ['b', bx, by, B]].forEach(([ext, px, py, nom])=>{
    const col = '#15803d', L = 26;
    s += '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' + (px+L).toFixed(1) + '" y2="' + py.toFixed(1) + '" stroke="' + col + '" stroke-width="2"/>' + fl(px+L+1, py, 0, col)
      + '<text x="' + (px+L+6).toFixed(1) + '" y="' + (py+4).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="' + col + '">' + nom + 'x</text>'
      + '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' + px.toFixed(1) + '" y2="' + (py-L).toFixed(1) + '" stroke="' + col + '" stroke-width="2"/>' + fl(px, py-L-1, -90, col)
      + '<text x="' + (px+4).toFixed(1) + '" y="' + (py-L-6).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="' + col + '">' + nom + 'y</text>';
    if(esRigidoExtremo(b, ext))
      s += '<path d="M' + (px-12).toFixed(1) + ' ' + py.toFixed(1) + ' A12 12 0 1 1 ' + (px+8).toFixed(1) + ' ' + (py+9).toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="1.6"/>'
        + '<text x="' + (px-14).toFixed(1) + '" y="' + (py+16).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="' + col + '" text-anchor="end">M' + nom + '</text>';
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="#7c3a06" stroke="#fff" stroke-width="1.5"/>'
      + '<text x="' + (px-9).toFixed(1) + '" y="' + (py-9).toFixed(1) + '" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24" text-anchor="middle">' + nom + '</text>';
  });
  s += '<text x="' + (W2/2) + '" y="' + (H2-6) + '" font-family="Inter,sans-serif" font-size="8" fill="#9aa3ad" text-anchor="middle">fuerzas de pasador supuestas hacia +x, +y · cargas con su valor</text></svg>';
  return s;
}

// Tres diagramas (N, V, M) desarrollados sobre la longitud de la pieza.
function svgDiagramasElemento(b, es){
  const W2 = 720, Hd = 92, M0 = 42, gap = 6;
  const pts = es.puntos, L = es.L || 1;
  let s = '<svg viewBox="0 0 ' + W2 + ' ' + (3*Hd + 14) + '" style="width:100%;height:auto;display:block"><rect width="' + W2 + '" height="' + (3*Hd+14) + '" fill="#fff"/>';
  [['N', unitFor, '#1d4ed8'], ['V', unitFor, '#b45309'], ['M', unitFor + '·' + unitLen, '#c0392b']].forEach(([k, u, col], i)=>{
    const y0 = 8 + i*Hd, ym = y0 + Hd/2, amp = Math.max(1e-9, ...pts.map(p=>Math.abs(p[k])));
    const X = sv => M0 + sv/L*(W2 - M0 - 20), Y = v => ym - v/amp*(Hd/2 - gap - 8);
    s += '<line x1="' + M0 + '" y1="' + ym + '" x2="' + (W2-20) + '" y2="' + ym + '" stroke="#68727f" stroke-width="1"/>'
      + '<text x="10" y="' + (ym+4) + '" font-family="Inter,sans-serif" font-size="11" font-weight="800" fill="' + col + '">' + k + '</text>'
      + '<text x="10" y="' + (ym+15) + '" font-family="Inter,sans-serif" font-size="8" fill="#68727f">' + u + '</text>';
    let d = 'M' + X(0).toFixed(1) + ',' + ym.toFixed(1);
    pts.forEach(p=>{ d += ' L' + X(p.s).toFixed(1) + ',' + Y(p[k]).toFixed(1); });
    d += ' L' + X(L).toFixed(1) + ',' + ym.toFixed(1) + ' Z';
    s += '<path d="' + d + '" fill="' + col + '" fill-opacity=".14" stroke="' + col + '" stroke-width="1.6"/>';
    const ext = es['max' + k];
    const vals = [pts[0], ext, pts[pts.length-1]].filter((p,j,arr)=>arr.findIndex(q=>Math.abs(q.s-p.s)<1e-9)===j);
    vals.forEach(p=>{ if(Math.abs(p[k]) < 1e-9*amp) return;
      s += '<text x="' + X(p.s).toFixed(1) + '" y="' + (Y(p[k]) + (p[k] >= 0 ? -4 : 11)).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="' + col + '" text-anchor="middle">' + dec(p[k],'f') + '</text>'; });
  });
  s += '<text x="' + M0 + '" y="' + (3*Hd+11) + '" font-family="Inter,sans-serif" font-size="8" fill="#68727f">s = 0 (' + _simbExt(b,'a') + ')</text>'
    + '<text x="' + (W2-20) + '" y="' + (3*Hd+11) + '" font-family="Inter,sans-serif" font-size="8" fill="#68727f" text-anchor="end">s = ' + dec(L,'len') + ' ' + unitLen + ' (' + _simbExt(b,'b') + ')</text></svg>';
  return s;
}

// ══ Ejemplos de verificación (bastidores) ═══════════════════════════════════
// Resueltos a mano por desmembrado; `esperado` lleva reacciones (por nudo),
// fuerzas de pasador sobre una pieza (por extremo) y momentos de extremo.
const EJEMPLOS_MARCO = [
  {
    id:'portico', marco:true,
    nom:'Pórtico con pasador y rodillo (bastidor)',
    desc:'Columnas AB y CD de 4 m y viga BC de 6 m, las tres dibujadas como Viga / marco y unidas rígidamente en B y C; pasador en A y rodillo en D. 12 kN hacia abajo a mitad de BC y 6 kN horizontales en B.',
    ref:'ΣM_A = 0: R_Dy = (12·3 + 6·4)/6 = 10 kN; R_Ay = 2, R_Ax = −6 kN. Columna AB: N = −2 (C), V = 6, M crece de 0 a 24 kN·m en B. Viga BC: M = 24 en B, 30 bajo la carga, 0 en C. CD sin momento.',
    esperado:{R:{A:{rx:-6, ry:2}, D:{ry:10}}, ext:{AB:{b:{fx:6, fy:-2, m:24}}, BC:{a:{fx:0, fy:2, m:-24}, b:{fx:0, fy:10, m:0}}, CD:{b:{fx:0, fy:10}}}},
    armar(){
      const A = addNodo(0,0), B = addNodo(0,4), C = addNodo(6,4), D = addNodo(6,0);
      const ab = addBarra(A.id,B.id,'viga'), bc = addBarra(B.id,C.id,'viga'), cd = addBarra(C.id,D.id,'viga');
      A.apoyo = 'fijo'; D.apoyo = 'movil'; D.apAng = 90;
      B.union = 'rigido'; C.union = 'rigido';
      ponerCargaNudo(B, 0, 6);                                       // 6 kN hacia la derecha
      bc.cargas = [{tipo:'P', s:3, marco:'plano', magY:12, magX:0}];  // 12 kN hacia abajo
      void ab; void cd;
    }
  },
  {
    id:'puntal', marco:true,
    nom:'Viga con puntal de dos fuerzas (Hibbeler ej. 6.15)',
    desc:'Viga A–B–C de 6 m (pasador en A, extremo C libre) con 3 kN/m hacia abajo en toda su longitud, sostenida en B (a 4 m de A) por el puntal BD, una barra de dos fuerzas, con D en (1, −4). La viga es continua en B (unión rígida) y la barra se articula ahí por ser barra.',
    ref:'Viga entera: ΣM_A = 0 → F_By = 18·3/4 = 13.5 kN; el puntal (3-4-5) empuja con S = 16.875 kN (C), S_x = 10.125. R_A = (−10.125, 4.5), R_D = (10.125, 13.5) kN. M en B = −6 kN·m; M máx = 3.375 kN·m en s = 1.5 m.',
    esperado:{R:{A:{rx:-10.125, ry:4.5}, D:{rx:10.125, ry:13.5}}, F:{BD:-16.875}, ext:{AB:{b:{m:-6}}, BC:{a:{fy:6, m:6}}}},
    armar(){
      const A = addNodo(0,0), C = addNodo(4,0), B = addNodo(6,0), D = addNodo(1,-4);
      const ac = addBarra(A.id,C.id,'viga'), cb = addBarra(C.id,B.id,'viga'), cd = addBarra(C.id,D.id,'barra');
      A.apoyo = 'fijo'; D.apoyo = 'fijo'; C.union = 'rigido';
      ac.cargas = [{tipo:'U', s1:0, s2:4, dir:'y', mag:3}];    // 3 kN/m hacia abajo
      cb.cargas = [{tipo:'U', s1:0, s2:2, dir:'y', mag:3}];
      void cd;                              // el puntal es barra: va articulado en C aunque C sea rígido
    }
  },
  {
    id:'mensula', marco:true,
    nom:'Ménsula empotrada en L',
    desc:'Columna AB de 3 m empotrada en A y viga BC de 3 m, las dos como Viga / marco, unidas rígidamente en B; 5 kN hacia abajo en el extremo libre C.',
    ref:'Reacciones en A: R_x = 0, R_y = 5 kN, M_A = 15 kN·m (antihorario). M = −15 kN·m constante en AB y de −15 en B a 0 en C.',
    esperado:{R:{A:{rx:0, ry:5, m:15}}, ext:{AB:{a:{m:15}, b:{m:-15}}, BC:{a:{fy:5, m:15}}}},
    armar(){
      const A = addNodo(0,0), B = addNodo(0,3), C = addNodo(3,3);
      addBarra(A.id,B.id,'viga'); addBarra(B.id,C.id,'viga');
      A.apoyo = 'empotrado'; A.union = 'rigido'; B.union = 'rigido';
      ponerCargaNudo(C, 5, 0);                         // 5 kN hacia abajo
    }
  }
];
function comprobarEjemploMarco(ej){
  if(!ej || !ej.esperado || !resultado || resultado.error || !resultado.marco) return;
  const tol = 0.006; let desvios = 0;
  const cmp = (nombre, obt, esp) => { if(esp === undefined) return; if(!isFinite(obt) || Math.abs(obt - esp) > Math.max(tol, 1e-3*Math.abs(esp))){ console.warn('Ejemplo ' + ej.id + ': ' + nombre + ' se desvía de la referencia', {motor:obt, referencia:esp}); desvios++; } };
  Object.keys(ej.esperado.R || {}).forEach(nom=>{ const n = nodos.find(z=>z.nombre===nom), R = n && resultado.reacciones[n.id]; if(!R){ desvios++; return; }
    const e = ej.esperado.R[nom]; cmp('R_x' + nom, R.rx, e.rx); cmp('R_y' + nom, R.ry, e.ry); cmp('M_' + nom, R.m, e.m); });
  Object.keys(ej.esperado.F || {}).forEach(nom=>{ const b = barras.find(x=>nombreBarra(x)===nom); cmp('F_' + nom, b ? resultado.fuerzas[b.id] : NaN, ej.esperado.F[nom]); });
  Object.keys(ej.esperado.ext || {}).forEach(nom=>{ const b = barras.find(x=>nombreBarra(x)===nom); if(!b){ desvios++; return; }
    ['a','b'].forEach(ext=>{ const e = ej.esperado.ext[nom][ext]; if(!e) return; const o = resultado.extremos[b.id][ext];
      cmp(nom + '.' + ext + '.fx', o.fx, e.fx); cmp(nom + '.' + ext + '.fy', o.fy, e.fy); cmp(nom + '.' + ext + '.m', o.m, e.m); }); });
  return desvios;
}

// ══ Informe LaTeX del bastidor ══════════════════════════════════════════════
let _yaDichoMarco = {};
function _porqueMarco(clave, txt){ if(_yaDichoMarco[clave]) return ''; _yaDichoMarco[clave] = true; return '\\porque{' + txt + '}\n'; }
function _preambuloArm(subcabecera){
  return '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n\\usepackage{amsmath,amssymb}\n'
    + '\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta,calc,patterns}\n\\usepackage{xcolor}\n\\usepackage{needspace}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{B45309}\n\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n\\definecolor{bsaRoj}{HTML}{B3261E}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n\\definecolor{bsaAlerta}{HTML}{DB2777}\n\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaBarra}{HTML}{7C3A06}\n\\definecolor{bsaLogoB}{HTML}{CDA953}\n\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    + '\\setlength{\\parskip}{2pt}\n\\makeatletter\n\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Armaduras y Marcos}\\hfill\\footnotesize\\color{bsaMuted}' + subcabecera + '}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ p\\\'ag.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n\\makeatother\n\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n  \\par\\addvspace{10pt}\\penalty-250\n  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n'
    + '\\newcommand{\\subpaso}[1]{\\vspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\vspace{3pt}}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc2!40}{bsaAcc2!5}{%\n  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}\\textquestiondown Por qu\\\'e?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\veredicto}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaAcc}{bsaAcc!7}{%\n  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\makeatletter\n\\newenvironment{tablacentrada}{\\par\\nopagebreak\\begingroup\\@beginparpenalty=10000\\relax\\begin{center}}{\\end{center}\\endgroup}\n\\makeatother\n'
    + '\\raggedbottom\n\n\\begin{document}\n\n';
}
// Cargas sobre las barras en TikZ (para la figura general y el DCL de cada pieza).
function _tikzCargasBarra(b, tx, ty, esc, conValor){
  const g = geomBarra(b), F = v => v.toFixed(3), uF = escLatex(unitFor), uL = escLatex(unitLen);
  const P = s => [parseFloat(tx(g.na.x + g.ux*s)), parseFloat(ty(g.na.y + g.uy*s))];
  let s = '';
  cargasDeBarra(b).forEach(c=>{
    if(c.tipo === 'P'){
      const [px,py] = P(c.s), q = compCargaPuntual(c, g), mag = Math.hypot(q.fx, q.fy);
      if(mag < 1e-12) return;
      const ux = q.fx/mag, uy = q.fy/mag, Lf = 1.0;
      s += '\\draw[->, >=stealth, line width=0.85pt, bsaAcc] (' + F(px-ux*Lf) + ',' + F(py-uy*Lf) + ') -- (' + F(px-ux*0.05) + ',' + F(py-uy*0.05) + ');\n';
      if(conValor !== false) s += '\\node[font=\\scriptsize, color=bsaAcc, inner sep=1pt] at (' + F(px-ux*(Lf+0.32)) + ',' + F(py-uy*(Lf+0.32)) + ') {' + dec(mag,'f') + '\\,' + uF + '};\n';
    } else if(c.tipo === 'M'){
      const [px,py] = P(c.s), sg = c.mag > 0 ? 1 : -1;
      s += '\\draw[->, >=stealth, line width=0.85pt, bsaAcc] (' + F(px+0.32) + ',' + F(py) + ') arc [start angle=0, end angle=' + (sg*250) + ', radius=0.32];\n';
      if(conValor !== false) s += '\\node[font=\\scriptsize, color=bsaAcc, inner sep=1pt, above] at (' + F(px) + ',' + F(py+0.36) + ') {' + dec(Math.abs(c.mag),'f') + '\\,' + uF + '$\\cdot$' + uL + '};\n';
    } else {
      const d = vectorCarga(c.dir, g), n = 6, wmax = Math.max(Math.abs(wIni(c)), Math.abs(wFin(c)), 1e-12), pts = [];
      for(let i=0;i<=n;i++){
        const sv = c.s1 + (c.s2-c.s1)*i/n, w = wIni(c) + (wFin(c)-wIni(c))*i/n, [px,py] = P(sv), len = 0.9*Math.abs(w)/wmax;
        const sg = w >= 0 ? 1 : -1, ux = d.x*sg, uy = d.y*sg;
        pts.push([px-ux*len, py-uy*len]);
        if(len > 0.05) s += '\\draw[->, >=stealth, line width=0.5pt, bsaAcc] (' + F(px-ux*len) + ',' + F(py-uy*len) + ') -- (' + F(px-ux*0.04) + ',' + F(py-uy*0.04) + ');\n';
      }
      s += '\\draw[bsaAcc, line width=0.5pt] ' + pts.map(p=>'(' + F(p[0]) + ',' + F(p[1]) + ')').join(' -- ') + ';\n';
      if(conValor !== false){ const pm = pts[Math.floor(n/2)];
        s += '\\node[font=\\scriptsize, color=bsaAcc, inner sep=1pt, above] at (' + F(pm[0]) + ',' + F(pm[1]+0.05) + ') {' + (Math.abs(wIni(c)-wFin(c))<1e-9 ? dec(Math.abs(wIni(c)),'f') : dec(Math.abs(wIni(c)),'f') + '$\\to$' + dec(Math.abs(wFin(c)),'f')) + '\\,' + uF + '/' + uL + '};\n'; }
    }
  });
  return s;
}
function _tikzEmpotrado(px, py, n){
  const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
  let vx = 0, vy = 0;
  conec.forEach(b=>{ const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a)); const dx=o.x-n.x, dy=o.y-n.y, L=Math.hypot(dx,dy)||1; vx += dx/L; vy += dy/L; });
  // Mismo criterio que en el lienzo: el muro mira al lado contrario de las
  // piezas y gira con ellas (aquí en coordenadas del modelo, y hacia arriba).
  const ang = (Math.abs(vx)+Math.abs(vy) < 1e-9) ? -90 : Math.atan2(-vy, -vx)*180/Math.PI;
  return '\\begin{scope}[shift={(' + px + ',' + py + ')}, rotate=' + ang.toFixed(2) + ']\n'
    + '\\draw[bsaAcc, line width=1pt] (0.12,-0.5) -- (0.12,0.5);\n'
    + '\\foreach \\yy in {-0.5,-0.33,...,0.5}{\\draw[bsaAcc, line width=0.5pt] (0.12,\\yy) -- ++(0.18,-0.16);}\n'
    + '\\end{scope}\n';
}
function tikzMarcoCompleto(opts){
  opts = opts || {};
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const esc = 11.5/Math.max(maxX-minX, maxY-minY, 1e-6);
  const tx = x => ((x-minX)*esc).toFixed(3), ty = y => ((y-minY)*esc).toFixed(3);
  let s = '';
  barras.forEach(b=>{ const g = geomBarra(b);
    const seg = '(' + tx(g.na.x) + ',' + ty(g.na.y) + ') -- (' + tx(g.nb.x) + ',' + ty(g.nb.y) + ');\n';
    // viga o marco: banda clara con el eje encima; barra de armadura: trazo fino
    if(esViga(b)) s += '\\draw[bsaBarra!22, line width=4.5pt] ' + seg + '\\draw[bsaBarra, line width=1.6pt] ' + seg;
    else s += '\\draw[bsaBarra, line width=1.2pt] ' + seg;
    s += _tikzCargasBarra(b, tx, ty, esc, true);
  });
  const genC = letrasGriegas();
  nodos.forEach(n=>{
    if(n.union === 'rigido') s += '\\fill[bsaBarra] (' + tx(n.x) + ',' + ty(n.y) + ') +(-0.09,-0.09) rectangle +(0.09,0.09);\n';
    else s += '\\fill[white, draw=bsaBarra, line width=0.7pt] (' + tx(n.x) + ',' + ty(n.y) + ') circle (2pt);\n';
    s += '\\node[font=\\tiny, above right, xshift=1pt] at (' + tx(n.x) + ',' + ty(n.y) + ') {' + escLatex(n.nombre) + '};\n';
    if(n.apoyo === 'fijo' || n.apoyo === 'movil') s += tikzApoyo(n.apoyo, tx(n.x), ty(n.y));
    else if(n.apoyo === 'empotrado') s += _tikzEmpotrado(tx(n.x), ty(n.y), n);
    if(opts.cargas !== false) s += tikzFlechaCarga(n, tx, ty, 1, null, {gen:genC, coloc:crearColocador(24,0.4), angulos:[]});
    if(opts.reaccionesIncognita && resultado && resultado.reacciones[n.id]){
      const rr = resultado.reacciones[n.id], px = parseFloat(tx(n.x)), py = parseFloat(ty(n.y));
      if(rr.ry !== undefined) s += '\\draw[->, >=stealth, bsaVerde, line width=1.1pt] (' + px.toFixed(3) + ',' + (py-1.45).toFixed(3) + ') -- (' + px.toFixed(3) + ',' + (py-0.62).toFixed(3) + ') node[midway, right, font=\\scriptsize, text=bsaVerde] {$R_{y' + escLatex(n.nombre) + '}$};\n';
      if(rr.rx !== undefined) s += '\\draw[->, >=stealth, bsaVerde, line width=1.1pt] (' + (px-1.35).toFixed(3) + ',' + py.toFixed(3) + ') -- (' + (px-0.45).toFixed(3) + ',' + py.toFixed(3) + ') node[midway, above, font=\\scriptsize, text=bsaVerde] {$R_{x' + escLatex(n.nombre) + '}$};\n';
      if(rr.m !== undefined) s += '\\draw[->, >=stealth, bsaVerde, line width=1.1pt] (' + (px+0.55).toFixed(3) + ',' + py.toFixed(3) + ') arc [start angle=0, end angle=250, radius=0.55] node[pos=0.5, above right, font=\\scriptsize, text=bsaVerde] {$M_{' + escLatex(n.nombre) + '}$};\n';
    }
  });
  if(opts.cotas) s += tikzCotas(tx, ty, minX, maxX, minY, maxY, esc);
  return s;
}
// DCL de una pieza: la barra en su orientación real, cargas con valor, fuerzas
// de pasador con su nombre en el sentido positivo supuesto y las cotas de s.
function tikzDCLPieza(b, res){
  const g = geomBarra(b);
  // A lo ancho hasta 7.5 cm y a lo alto hasta 4.5 cm: una columna vertical a
  // escala de la viga se salía de la página.
  const esc = Math.min(7.5/Math.max(Math.abs(g.nb.x - g.na.x), 1e-6), 4.5/Math.max(Math.abs(g.nb.y - g.na.y), 1e-6));
  const cx0 = 0, cy0 = 0;
  const tx = x => (cx0 + (x - g.na.x)*esc).toFixed(3), ty = y => (cy0 + (y - g.na.y)*esc).toFixed(3);
  const F = v => v.toFixed(3);
  const A = _simbExt(b,'a'), B = _simbExt(b,'b');
  let s = '\\draw[bsaBarra, line width=2pt] (' + tx(g.na.x) + ',' + ty(g.na.y) + ') -- (' + tx(g.nb.x) + ',' + ty(g.nb.y) + ');\n';
  s += _tikzCargasBarra(b, tx, ty, esc, true);
  [['a', g.na, A], ['b', g.nb, B]].forEach(([ext, n, nom])=>{
    const px = parseFloat(tx(n.x)), py = parseFloat(ty(n.y)), col = 'bsaVerde';
    s += '\\draw[->, >=stealth, ' + col + ', line width=1pt] (' + F(px) + ',' + F(py) + ') -- (' + F(px+0.9) + ',' + F(py) + ') node[right, font=\\scriptsize, text=' + col + '] {$' + nom + '_x$};\n';
    s += '\\draw[->, >=stealth, ' + col + ', line width=1pt] (' + F(px) + ',' + F(py) + ') -- (' + F(px) + ',' + F(py+0.9) + ') node[above, font=\\scriptsize, text=' + col + '] {$' + nom + '_y$};\n';
    if(esRigidoExtremo(b, ext)) s += '\\draw[->, >=stealth, ' + col + ', line width=1pt] (' + F(px-0.42) + ',' + F(py) + ') arc [start angle=180, end angle=-70, radius=0.42] node[pos=0.55, below left, font=\\scriptsize, text=' + col + '] {$M_{' + nom + '}$};\n';
    s += '\\fill[bsaBarra] (' + F(px) + ',' + F(py) + ') circle (1.8pt);\n';
    s += '\\node[font=\\small\\bfseries, ' + (ext === 'a' ? 'below left' : 'below right') + ', inner sep=2pt] at (' + F(px) + ',' + F(py) + ') {' + escLatex(nom) + '};\n';
  });
  // cotas de s de cada carga, bajo la pieza
  const ss = [0, g.L]; cargasDeBarra(b).forEach(c=>{ if(esRepartida(c)){ ss.push(c.s1, c.s2); } else ss.push(c.s); });
  const uni = [...new Set(ss.map(v=>+v.toFixed(6)))].sort((p,q)=>p-q);
  if(uni.length > 1){
    const off = 0.9;
    const Pn = sv => [parseFloat(tx(g.na.x + g.ux*sv)) + g.nx*(-off), parseFloat(ty(g.na.y + g.uy*sv)) + g.ny*(-off)];
    for(let i=0;i<uni.length-1;i++){
      const [x1,y1] = Pn(uni[i]), [x2,y2] = Pn(uni[i+1]);
      if(uni[i+1]-uni[i] < 1e-9) continue;
      s += '\\draw[black!55, line width=0.4pt, <->, >=stealth] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ') node[midway, fill=white, font=\\tiny, inner sep=1pt] {' + dec(uni[i+1]-uni[i],'len') + '\\,' + escLatex(unitLen) + '};\n';
    }
    uni.forEach(sv=>{ const [x1,y1] = Pn(sv); const px = parseFloat(tx(g.na.x + g.ux*sv)), py = parseFloat(ty(g.na.y + g.uy*sv));
      s += '\\draw[black!35, line width=0.3pt, dash pattern=on 1.4pt off 1.4pt] (' + F(px) + ',' + F(py) + ') -- (' + F(x1) + ',' + F(y1) + ');\n'; });
  }
  return s;
}
// Diagramas N, V, M de un elemento, desarrollados en horizontal.
function tikzDiagramasElemento(b, es){
  const L = es.L || 1, W = 11, Hd = 1.25, F = v => v.toFixed(3);
  let s = '';
  [['N', escLatex(unitFor), 'bsaAcc2'], ['V', escLatex(unitFor), 'bsaAcc'], ['M', escLatex(unitFor) + '$\\cdot$' + escLatex(unitLen), 'bsaRoj']].forEach(([k, u, col], i)=>{
    const y0 = -i*(2*Hd + 0.9), amp = Math.max(1e-9, ...es.puntos.map(p=>Math.abs(p[k])));
    const X = sv => sv/L*W, Y = v => y0 + v/amp*Hd;
    s += '\\draw[black!60, line width=0.4pt] (0,' + F(y0) + ') -- (' + W + ',' + F(y0) + ');\n';
    s += '\\node[left, font=\\small\\bfseries, text=' + col + '] at (-0.15,' + F(y0) + ') {$' + k + '$};\n';
    s += '\\node[right, font=\\tiny, text=bsaMuted] at (' + W + ',' + F(y0) + ') {' + u + '};\n';
    s += '\\fill[' + col + '!15] (0,' + F(y0) + ') ' + es.puntos.map(p=>'-- (' + F(X(p.s)) + ',' + F(Y(p[k])) + ')').join(' ') + ' -- (' + W + ',' + F(y0) + ') -- cycle;\n';
    s += '\\draw[' + col + ', line width=0.7pt] ' + es.puntos.map(p=>'(' + F(X(p.s)) + ',' + F(Y(p[k])) + ')').join(' -- ') + ';\n';
    const ext = es['max' + k], pts = es.puntos;
    const vals = [pts[0], ext, pts[pts.length-1]].filter((p,j,arr)=>arr.findIndex(q=>Math.abs(q.s-p.s)<1e-9)===j);
    vals.forEach(p=>{ if(Math.abs(p[k]) < 1e-9*amp) return;
      s += '\\node[font=\\tiny, text=' + col + ', ' + (p[k] >= 0 ? 'above' : 'below') + ', inner sep=1pt] at (' + F(X(p.s)) + ',' + F(Y(p[k])) + ') {' + dec(p[k],'f') + '};\n'; });
  });
  const yb = -2*(2*Hd + 0.9) - Hd - 0.35;
  s += '\\node[font=\\tiny, text=bsaMuted, below right] at (0,' + F(yb) + ') {$s = 0$ (' + escLatex(_simbExt(b,'a')) + ')};\n';
  s += '\\node[font=\\tiny, text=bsaMuted, below left] at (' + W + ',' + F(yb) + ') {$s = ' + dec(L,'len') + '$\\,' + escLatex(unitLen) + ' (' + escLatex(_simbExt(b,'b')) + ')};\n';
  return s;
}

function construirLatexMarco(){
  if(!resultado || resultado.error || !resultado.marco){ aviso('Primero resuelve el bastidor sin errores.'); return null; }
  _yaDichoMarco = {};
  const res = resultado, d = res.diag, uF = escLatex(unitFor), uL = escLatex(unitLen), uM = uF + '$\\cdot$' + uL;
  const f = v => dec(v,'f'), nomN = n => escLatex(n.nombre), nomB = b => escLatex(nombreBarra(b));
  const elementos = barras.filter(b=>!res.dosFuerzas[b.id]), dosF = barras.filter(b=>res.dosFuerzas[b.id]);
  let figN = 0, tablaN = 0;
  const lamina = (cuerpo, txt) => { figN++; return '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + cuerpo + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\n\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCaption = txt => { tablaN++; return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = _porqueMarco;
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  // Autocomprobación: cada pieza debe cerrar con las fuerzas del motor.
  barras.forEach(b=>{
    const g = geomBarra(b), ex = res.extremos[b.id], rc = resultanteCargas(b);
    const r1 = ex.a.fx + ex.b.fx + rc.Fx, r2 = ex.a.fy + ex.b.fy + rc.Fy;
    const r3 = (ex.a.m||0) + (ex.b.m||0) + (g.nb.x-g.na.x)*ex.b.fy - (g.nb.y-g.na.y)*ex.b.fx + rc.Ma;
    const esc0 = Math.max(1, ...res.x.map(v=>Math.abs(v)));
    if(Math.abs(r1) > 1e-6*esc0 || Math.abs(r2) > 1e-6*esc0 || Math.abs(r3) > 1e-6*esc0*Math.max(1,g.L)) console.warn('Informe LaTeX: el DCL de la pieza ' + nombreBarra(b) + ' no cierra', {r1, r2, r3});
  });

  let tex = _preambuloArm('Bastidor: desmembrado (\\S6.6)');
  tex += '\\begin{center}\n  {\\LARGE\\bfseries\\color{bsaAcc} An\\\'alisis de un bastidor (marco)}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Reacciones, fuerzas en los pasadores y diagramas $N$, $V$, $M$ por desmembrado}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n\\end{center}\n\\vspace{6pt}\n\n';

  // 1 · Planteamiento
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += lamina(tikzMarcoCompleto({cotas:true}), 'Modelo del bastidor: vigas o marcos (trazo grueso), barras de dos fuerzas (trazo fino), nudos (cuadrado = uni\\\'on r\\\'igida, c\\\'irculo = pasador), apoyos, cargas y cotas.');
  tex += '\\subpaso{Objetivo}\nHallar las reacciones en los apoyos, la fuerza que cada pasador ejerce sobre cada pieza'
    + (elementos.length ? ' y los diagramas de fuerza normal, cortante y momento flector de los elementos de varias fuerzas' : '') + '.\n';
  tex += porque('varias-fuerzas',
    'En una armadura cada barra recibe fuerza solo en sus dos extremos y basta un n\\\'umero por barra. Aqu\\\'i hay '
    + 'piezas dibujadas como \\emph{viga o marco}: elementos r\\\'igidos que reciben cargas entre sus extremos o van unidos '
    + 'r\\\'igidamente, es decir, \\emph{elementos de varias fuerzas}; la fuerza de sus extremos ya no va a lo largo de la pieza '
    + 'y dentro aparecen fuerza normal, cortante y momento flector. '
    + 'El m\\\'etodo es \\textbf{desmembrar} (Hibbeler \\S6.6): separar las piezas en los pasadores y plantear el equilibrio '
    + 'de cada una, con la fuerza del pasador igual y opuesta en las dos piezas que une (tercera ley de Newton).');
  tex += '\\subpaso{Procedimiento de an\\\'alisis}\n\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Determinaci\\\'on est\\\'atica.} Se cuentan las inc\\\'ognitas (fuerzas de pasador y reacciones) y las ecuaciones (tres por pieza y las de cada nudo).\n'
    + '\\item \\textbf{Elementos de dos fuerzas.} Las piezas sin carga intermedia y articuladas en sus dos extremos: su fuerza va a lo largo de la pieza y es una sola inc\\\'ognita.\n'
    + '\\item \\textbf{Equilibrio del conjunto.} DCL del bastidor completo: da las reacciones cuando son tres.\n'
    + '\\item \\textbf{Desmembrar.} DCL de cada pieza con sus cargas y las fuerzas de sus pasadores; $\\sum F_x = 0$, $\\sum F_y = 0$ y $\\sum M = 0$ en cada una, y la compatibilidad en cada pasador.\n'
    + '\\item \\textbf{Diagramas.} Con las fuerzas de extremo conocidas, $N$, $V$ y $M$ a lo largo de cada elemento.\n'
    + '\\item \\textbf{Comprobaci\\\'on.} Equilibrio del conjunto con todas las fuerzas halladas.\n\\end{enumerate}\n';
  tex += '\\subpaso{Convenio}\n\\noindent La fuerza de un pasador $P$ sobre una pieza se escribe por componentes $P_x$, $P_y$, '
    + 'supuestas hacia $+x$ y $+y$; si el resultado es negativo, act\\\'ua al rev\\\'es. En una uni\\\'on r\\\'igida hay adem\\\'as un momento '
    + '$M_P$, positivo antihorario. Sobre la otra pieza (o sobre el apoyo) el mismo pasador ejerce la fuerza igual y opuesta. '
    + 'En cada pieza la abscisa $s$ se mide desde su primer extremo.\n';

  // 2 · Determinación
  tex += '\\seccion{2. Paso 1 --- Determinaci\\\'on est\\\'atica}\n';
  tex += '\\[ U = 2\\,(' + d.extArt + ') + ' + d.extRig + ' + ' + d.r + ' = ' + d.U + ' \\qquad E = 3\\,(' + d.m + ') + 2\\,(' + d.j + ') + ' + d.nudosRigidos + ' = ' + d.E + ' \\qquad ' + (d.U === d.E ? 'U = E\\;\\checkmark' : 'U \\ne E') + ' \\]\n';
  tex += '{\\footnotesize $U$: dos componentes por extremo de pieza, una m\\\'as por extremo unido r\\\'igidamente (su momento) y $r$ reacciones. '
    + '$E$: tres ecuaciones por pieza, dos por nudo y una m\\\'as por nudo r\\\'igido (suma de momentos en el nudo).}\\\\[3pt]\n';
  tex += '\\veredicto{\\textbf{Bastidor isost\\\'atico}: tantas inc\\\'ognitas como ecuaciones de equilibrio, y el sistema tiene soluci\\\'on \\\'unica.}\n';

  // 3 · Dos fuerzas
  tex += '\\seccion{3. Paso 2 --- Elementos de dos fuerzas}\n';
  if(dosF.length){
    tex += porque('dos-fuerzas', 'Una pieza sin cargas entre sus extremos y articulada en los dos recibe fuerza en dos puntos nada m\\\'as: para '
      + 'estar en equilibrio, esas dos fuerzas tienen que ser iguales, opuestas y \\textbf{a lo largo de la pieza}. Reconocerlo antes '
      + 'de desmembrar reduce sus dos componentes de pasador a una sola inc\\\'ognita, la fuerza axial.');
    tex += '\\noindent ' + dosF.map(b=>'$' + nomB(b) + '$').join(', ') + (dosF.length > 1 ? ' son elementos' : ' es un elemento') + ' de dos fuerzas. Su fuerza axial, con el resto del c\\\'alculo:\n';
    tex += '\\[ ' + dosF.map(b=>{ const v = res.fuerzas[b.id]; return 'F_{' + nomB(b) + '} = ' + f(Math.abs(v)) + '\\,\\text{' + uF + '}\\ (' + (esCero(v) ? '0' : v > 0 ? 'T' : 'C') + ')'; }).join('\\qquad ') + ' \\]\n';
  } else tex += '\\noindent Ninguna pieza es de dos fuerzas: todas son vigas o marcos.\n';

  // 4 · Equilibrio del conjunto
  tex += '\\seccion{4. Paso 3 --- Equilibrio del conjunto}\n';
  tex += lamina(tikzMarcoCompleto({cotas:false, reaccionesIncognita:true}), 'DCL del bastidor completo: cargas y reacciones inc\\\'ognita en su sentido positivo.');
  {
    let sumFx = 0, sumFy = 0, sumM = 0;   // momentos de las cargas respecto de O
    const termsM = [];
    nodos.forEach(n=>{ if(!esCero(n.fx)||!esCero(n.fy)){ sumFx += n.fx||0; sumFy += n.fy||0; const mo = n.x*(n.fy||0) - n.y*(n.fx||0); sumM += mo; if(Math.abs(mo) > 1e-9) termsM.push({v:mo, tex:f(Math.abs(mo))}); } });
    barras.forEach(b=>{ const g = geomBarra(b), rc = resultanteCargas(b); if(Math.abs(rc.Fx)+Math.abs(rc.Fy)+Math.abs(rc.Ma) < 1e-12) return;
      sumFx += rc.Fx; sumFy += rc.Fy; const mo = rc.Ma + g.na.x*rc.Fy - g.na.y*rc.Fx; sumM += mo; if(Math.abs(mo) > 1e-9) termsM.push({v:mo, tex:f(Math.abs(mo))}); });
    const R = [];
    nodos.forEach(n=>{ const rr = res.reacciones[n.id]; if(!rr) return;
      if(rr.rx !== undefined) R.push({tex:'R_{x' + nomN(n) + '}', val:rr.rx, cx:1, cy:0, cm:-n.y});
      if(rr.ry !== undefined) R.push({tex:'R_{y' + nomN(n) + '}', val:rr.ry, cx:0, cy:1, cm:n.x});
      if(rr.m !== undefined)  R.push({tex:'M_{' + nomN(n) + '}', val:rr.m, cx:0, cy:0, cm:1}); });
    const lin = (etq, coefKey, cte) => {
      const t = R.filter(q=>Math.abs(q[coefKey]) > 1e-9).map(q=>{ const c = q[coefKey]; return {v:c, tex:(Math.abs(Math.abs(c)-1) < 1e-9 ? '' : dec(Math.abs(c),'len') + '\\,') + q.tex}; });
      if(Math.abs(cte) > 1e-9) t.push({v:cte, tex:f(Math.abs(cte))});
      return etq + ' & ' + _sumaTexArm(t) + ' = 0';
    };
    tex += _alineadaArm([lin('\\xrightarrow{+}\\ \\sum F_x = 0:\\quad', 'cx', sumFx), lin('+\\!\\uparrow\\ \\sum F_y = 0:\\quad', 'cy', sumFy), lin('\\circlearrowleft\\!+\\ \\sum M_O = 0:\\quad', 'cm', sumM)]);
    tex += (d.r === 3
      ? '\\noindent Tres reacciones y tres ecuaciones: se resuelven aqu\\\'i.\n'
      : '\\noindent Hay ' + d.r + ' reacciones y solo tres ecuaciones del conjunto: no bastan solas; se resuelven junto con el desmembrado del paso 4.\n');
    tex += '\\[ ' + R.map(q=>q.tex + ' = ' + f(q.val)).join('\\qquad ') + ' \\]\n';
  }

  // 5 · Desmembrado
  tex += '\\seccion{5. Paso 4 --- Desmembrado: equilibrio de cada pieza}\n';
  tex += porque('desmembrar', 'Al separar las piezas, la fuerza del pasador aparece como acci\\\'on sobre cada una de ellas, igual y opuesta. '
    + 'Con tres ecuaciones por pieza y la compatibilidad en cada pasador se obtiene un sistema que tiene tantas ecuaciones como '
    + 'inc\\\'ognitas; se resuelve empezando por la pieza con menos inc\\\'ognitas y sustituyendo lo ya conocido.');
  elementos.forEach((b, i)=>{
    const g = geomBarra(b), ex = res.extremos[b.id], rc = resultanteCargas(b);
    const A = nomN(g.na), B = nomN(g.nb), ma = esRigidoExtremo(b,'a'), mb = esRigidoExtremo(b,'b');
    const dx = g.nb.x - g.na.x, dy = g.nb.y - g.na.y;
    // Sin minipage: el bloque entero no cabía y dejaba media página en blanco.
    // needspace solo salta de página si quedan menos de 6 cm.
    tex += '\\needspace{6cm}\\subpaso{Viga / marco ' + nomB(b) + '\\ \\ {\\small\\color{bsaMuted}(L = ' + dec(g.L,'len') + ' ' + uL + ')}}\n';
    tex += '\\begin{center}\\begin{tikzpicture}[scale=1]\n' + tikzDCLPieza(b, res) + '\\end{tikzpicture}\\end{center}\n';
    const tX = [{v:1, tex:A + '_x'}, {v:1, tex:B + '_x'}]; if(Math.abs(rc.Fx) > 1e-9) tX.push({v:rc.Fx, tex:f(Math.abs(rc.Fx))});
    const tY = [{v:1, tex:A + '_y'}, {v:1, tex:B + '_y'}]; if(Math.abs(rc.Fy) > 1e-9) tY.push({v:rc.Fy, tex:f(Math.abs(rc.Fy))});
    const tM = []; if(ma) tM.push({v:1, tex:'M_{' + A + '}'}); if(mb) tM.push({v:1, tex:'M_{' + B + '}'});
    if(Math.abs(dx) > 1e-9) tM.push({v:dx, tex:dec(Math.abs(dx),'len') + '\\,' + B + '_y'});
    if(Math.abs(dy) > 1e-9) tM.push({v:-dy, tex:dec(Math.abs(dy),'len') + '\\,' + B + '_x'});
    if(Math.abs(rc.Ma) > 1e-9) tM.push({v:rc.Ma, tex:f(Math.abs(rc.Ma))});
    tex += _alineadaArm(['\\xrightarrow{+}\\ \\sum F_x = 0:\\quad & ' + _sumaTexArm(tX) + ' = 0',
                         '+\\!\\uparrow\\ \\sum F_y = 0:\\quad & ' + _sumaTexArm(tY) + ' = 0',
                         '\\circlearrowleft\\!+\\ \\sum M_{' + A + '} = 0:\\quad & ' + _sumaTexArm(tM) + ' = 0']);
    tex += '\\resultado{$' + A + '_x = ' + f(ex.a.fx) + '$, $' + A + '_y = ' + f(ex.a.fy) + '$' + (ma ? ', $M_{' + A + '} = ' + f(ex.a.m) + '$' : '')
      + '; $' + B + '_x = ' + f(ex.b.fx) + '$, $' + B + '_y = ' + f(ex.b.fy) + '$' + (mb ? ', $M_{' + B + '} = ' + f(ex.b.m) + '$' : '') + ' (' + uF + (ma||mb ? ', ' + uM : '') + ').}\n';
    tex += '\\vspace{6pt}\n';
  });
  // compatibilidad en los pasadores con más de una pieza, carga o apoyo
  const nudosC = nodos.filter(n=>barras.filter(b=>b.a===n.id||b.b===n.id).length > 1 || res.reacciones[n.id] || !esCero(n.fx) || !esCero(n.fy));
  if(nudosC.length){
    tex += '\\subpaso{Compatibilidad en los pasadores}\n\\noindent En cada nudo, la suma de las fuerzas que las piezas ejercen sobre \\\'el m\\\'as la reacci\\\'on y la carga aplicada es nula; con el convenio (fuerza del nudo sobre la pieza):\n';
    const filas = [];
    nudosC.forEach(n=>{
      const con = barras.filter(b=>b.a===n.id||b.b===n.id), rr = res.reacciones[n.id] || {};
      ['x','y'].forEach(comp=>{
        const t = con.map(b=>({v:1, tex:nomN(n) + '_' + comp + '^{(' + nomB(b) + ')}'}));
        if(rr['r'+comp] !== undefined) t.push({v:-1, tex:'R_{' + comp + nomN(n) + '}'});
        const carga = comp === 'x' ? (n.fx||0) : (n.fy||0);
        filas.push('\\text{nudo } ' + nomN(n) + ',\\ ' + comp + ':\\quad & ' + _sumaTexArm(t) + ' = ' + (Math.abs(carga) > 1e-9 ? f(carga) : '0'));
      });
      if(n.union === 'rigido'){
        const t = con.filter(b=>esRigidoExtremo(b, b.a===n.id?'a':'b')).map(b=>({v:1, tex:'M_{' + nomN(n) + '}^{(' + nomB(b) + ')}'}));
        if(rr.m !== undefined) t.push({v:-1, tex:'M_{' + nomN(n) + '}'});
        if(t.length) filas.push('\\text{nudo } ' + nomN(n) + ',\\ M:\\quad & ' + _sumaTexArm(t) + ' = 0');
      }
    });
    tex += '{\\small' + _alineadaArm(filas) + '}\n';
    tex += '{\\footnotesize El super\\\'indice dice sobre qu\\\'e pieza act\\\'ua la fuerza del pasador. Con estas ecuaciones y las de cada pieza, el sistema completo queda determinado; los valores de arriba son su soluci\\\'on.}\\\\[3pt]\n';
  }

  // 6 · Fuerzas en los pasadores
  tex += '\\seccion{6. Paso 5 --- Fuerzas en los pasadores}\n';
  tex += tablaCaption('Fuerza de cada pasador sobre cada pieza (componentes, m\\\'odulo y momento en las uniones r\\\'igidas).');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clrrrr}\\hline\n\\textbf{Pasador} & \\textbf{Sobre la pieza} & $F_x$ (' + uF + ') & $F_y$ (' + uF + ') & $|F|$ (' + uF + ') & $M$ (' + uM + ') \\\\\\hline\n';
  nodos.forEach(n=>{ barras.filter(b=>b.a===n.id||b.b===n.id).forEach(b=>{ const ext = b.a===n.id?'a':'b', e = res.extremos[b.id][ext];
    tex += nomN(n) + ' & ' + nomB(b) + ' & ' + f(e.fx) + ' & ' + f(e.fy) + ' & ' + f(Math.hypot(e.fx,e.fy)) + ' & ' + (esRigidoExtremo(b,ext) ? f(e.m) : '---') + ' \\\\\n'; }); });
  tex += '\\hline\\end{tabular}\\end{tablacentrada}}\n';
  tex += tablaCaption('Reacciones en los apoyos.');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clrrr}\\hline\n\\textbf{Apoyo} & \\textbf{Tipo} & $R_x$ (' + uF + ') & $R_y$ (' + uF + ') & $M$ (' + uM + ') \\\\\\hline\n';
  nodos.forEach(n=>{ const rr = res.reacciones[n.id]; if(!rr) return;
    tex += nomN(n) + ' & ' + (n.apoyo==='fijo' ? 'pasador' : n.apoyo==='empotrado' ? 'empotramiento' : 'rodillo') + ' & ' + (rr.rx!==undefined?f(rr.rx):'---') + ' & ' + (rr.ry!==undefined?f(rr.ry):'---') + ' & ' + (rr.m!==undefined?f(rr.m):'---') + ' \\\\\n'; });
  tex += '\\hline\\end{tabular}\\end{tablacentrada}}\n';

  // 7 · Diagramas
  if(elementos.length){
    tex += '\\seccion{7. Paso 6 --- Diagramas $N$, $V$ y $M$ de cada elemento}\n';
    tex += porque('diagramas', 'Con la fuerza y el momento de su primer extremo conocidos, se corta el elemento a una distancia $s$ y se plantea el '
      + 'equilibrio del trozo anterior: la fuerza normal $N$ (positiva a tracci\\\'on), la cortante $V$ y el momento flector $M$ '
      + 'del corte equilibran a la fuerza de extremo y a las cargas que quedan antes de \\\'el. El convenio es el de las vigas: '
      + '$M$ positivo curva el elemento hacia su lado $+n$, el de la izquierda al recorrerlo de su primer extremo al segundo.');
    elementos.forEach(b=>{
      const es = res.esfuerzos[b.id];
      tex += '\\needspace{9cm}\\subpaso{Viga / marco ' + nomB(b) + '}\n';
      tex += '\\begin{center}\\begin{tikzpicture}[scale=0.92]\n' + tikzDiagramasElemento(b, es) + '\\end{tikzpicture}\\end{center}\n';
      tex += '{\\footnotesize $N_{\\max} = ' + f(es.maxN.N) + '$ ' + uF + ' en $s = ' + dec(es.maxN.s,'len') + '$; $V_{\\max} = ' + f(es.maxV.V) + '$ ' + uF + ' en $s = ' + dec(es.maxV.s,'len') + '$; $M_{\\max} = ' + f(es.maxM.M) + '$ ' + uM + ' en $s = ' + dec(es.maxM.s,'len') + '$ ' + uL + '.}\n\\vspace{6pt}\n';
    });
  }

  // 8 · Comprobación
  tex += '\\seccion{' + (elementos.length ? 8 : 7) + '. Paso ' + (elementos.length ? 7 : 6) + ' --- Comprobaci\\\'on}\n';
  {
    let sx = 0, sy = 0, sm = 0;
    nodos.forEach(n=>{ sx += n.fx||0; sy += n.fy||0; sm += n.x*(n.fy||0) - n.y*(n.fx||0); const R = res.reacciones[n.id]; if(R){ sx += R.rx||0; sy += R.ry||0; sm += n.x*(R.ry||0) - n.y*(R.rx||0) + (R.m||0); } });
    barras.forEach(b=>{ const g = geomBarra(b), rc = resultanteCargas(b); sx += rc.Fx; sy += rc.Fy; sm += rc.Ma + g.na.x*rc.Fy - g.na.y*rc.Fx; });
    const esc0 = Math.max(1, ...res.x.map(v=>Math.abs(v)));
    const cero = v => Math.abs(v) < 1e-7*esc0 ? '0' : f(v);
    tex += '\\noindent Con todas las fuerzas exteriores (cargas y reacciones halladas):\n\\[ \\sum F_x = ' + cero(sx) + ' \\qquad \\sum F_y = ' + cero(sy) + ' \\qquad \\sum M_O = ' + cero(sm) + ' \\qquad\\checkmark \\]\n';
    tex += '\\noindent Y en cada pasador la fuerza sobre una pieza es igual y opuesta a la fuerza sobre la otra (Tabla 1).\n';
  }
  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} R.~C. Hibbeler, \\emph{Ingenier\\\'ia Mec\\\'anica: Est\\\'atica}, 12.\\textsuperscript{a} ed., cap.~6, \\S6.6 «Bastidores y m\\\'aquinas» (ej.~6.14--6.21) y cap.~7, \\S7.1--7.2. F.~P. Beer y E.~R. Johnston, \\emph{Mec\\\'anica vectorial para ingenieros: Est\\\'atica}, cap.~6.}\n';
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
