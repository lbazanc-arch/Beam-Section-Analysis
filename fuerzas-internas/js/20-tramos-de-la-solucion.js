// ═══════════════════════════════════════════════════════════
//  TRAMOS DE LA SOLUCIÓN (2026-10-18, petición del profesor)
//  Al pulsar Calcular se abre una ventana con la estructura dibujada: el
//  alumno toca los tramos que quiere ver desarrollados, o marca «Toda la
//  estructura». Solo esos tramos salen en el procedimiento, en el resumen, en
//  los diagramas de la pantalla y en los pasos 2 a 4 del PDF; las reacciones
//  salen siempre completas, porque cualquier tramo las necesita.
//  Los tramos elegidos, seguidos y en la misma recta forman un solo grupo
//  (ABC), con su abscisa continua: es `gruposDireccion(r, true)`.
// ═══════════════════════════════════════════════════════════

// null = toda la estructura; si no, la lista de ids de tramo elegidos.
let tramosSolucion = null;
let _selPend = null;        // la selección mientras la ventana está abierta (Set de ids)
let _selPrevia = null;      // R provisional, solo para la vista previa de los grupos

// ¿Sale este tramo (un elemento de R.internas) en la solución?
function tramoEnSolucion(seg){
  if(!tramosSolucion) return true;
  const id = seg && seg.tramo ? seg.tramo.id : seg;
  return tramosSolucion.indexOf(id) >= 0;
}
// ¿Se eligió solo una parte de la estructura?
function solucionParcial(){
  return !!tramosSolucion && tramos.some(t=>tramosSolucion.indexOf(t.id) < 0);
}
// Los grupos que se desarrollan: solo con los tramos elegidos.
function gruposSolucion(r){ return gruposDireccion(r, true); }

// ── La ventana ──
function _selModal(){
  let ov = document.getElementById('selTramosModal');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'selTramosModal';
  ov.className = 'modal-ov';
  ov.innerHTML =
      '<div class="modal selT">'
    +   '<h3>Tramos de la solución</h3>'
    +   '<p class="sub">Toca los tramos que quieres ver desarrollados.</p>'
    +   '<label class="selT-todo"><input type="checkbox" id="selTodo" onchange="selTodaEstructura(this.checked)">'
    +   '<span>Toda la estructura</span></label>'
    +   '<div id="selTramosSVG" class="selT-svg"></div>'
    +   '<div id="selTramosRes" class="selT-res"></div>'
    +   '<div class="modal-btns">'
    +     '<button class="mbtn ghost" onclick="cerrarSeleccionTramos()">Cancelar</button>'
    +     '<button class="mbtn" onclick="confirmarSeleccionTramos()">Resolver</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}

// Lo que llama el botón Calcular. Con un solo tramo no hay nada que elegir.
function resolverConSeleccion(){
  if(tramos.length <= 1){ tramosSolucion = null; calcular(); return; }
  // Se calcula antes, para enseñar cómo quedarán los grupos. Si la estructura
  // no se puede resolver, Calcular enseña el motivo como siempre.
  let Rp = null;
  try{
    Rp = analizar();
    if(!Rp.error) Rp.internas = fuerzasInternas(Rp);
  }catch(e){ Rp = null; }
  if(!Rp || Rp.error){ calcular(); return; }
  _selPrevia = Rp;
  const ids = tramos.map(t=>t.id);
  _selPend = new Set(tramosSolucion ? tramosSolucion.filter(id=>ids.indexOf(id) >= 0) : ids);
  if(!_selPend.size) ids.forEach(id=>_selPend.add(id));
  _selModal().classList.add('show');
  pintarSeleccionTramos();
}
function cerrarSeleccionTramos(){
  const ov = document.getElementById('selTramosModal');
  if(ov) ov.classList.remove('show');
  _selPend = null; _selPrevia = null;
}
function confirmarSeleccionTramos(){
  if(!_selPend || !_selPend.size){ aviso('Elige al menos un tramo.', 'error'); return; }
  const todos = tramos.every(t=>_selPend.has(t.id));
  tramosSolucion = todos ? null : tramos.map(t=>t.id).filter(id=>_selPend.has(id));
  cerrarSeleccionTramos();
  calcular();
}
function selTodaEstructura(v){
  if(!_selPend) return;
  _selPend = new Set(v ? tramos.map(t=>t.id) : []);
  pintarSeleccionTramos();
}
function alternarTramoSel(id){
  if(!_selPend) return;
  if(_selPend.has(id)) _selPend.delete(id); else _selPend.add(id);
  pintarSeleccionTramos();
}

// La estructura, con cada tramo tocable: el elegido, en el acento; el otro, gris.
function pintarSeleccionTramos(){
  const caja = document.getElementById('selTramosSVG');
  if(!caja || !_selPend) return;
  const todo = document.getElementById('selTodo');
  if(todo) todo.checked = tramos.every(t=>_selPend.has(t.id));
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  puntosDelModelo().forEach(n=>{ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); });
  // El ancho del dibujo es el de su caja: en el teléfono las letras no encogen.
  const W = Math.round(Math.max(300, Math.min(560, (caja.clientWidth || 560) - 10))), M = 40;
  const sx = Math.max(x1-x0, 1e-6), sy = Math.max(y1-y0, 0);
  let k = (W-2*M)/sx;
  const H = Math.max(170, Math.min(360, 2*M + sy*k));
  if(sy > 1e-9) k = Math.min(k, (H-2*M)/sy);
  const ox = (W - sx*k)/2, oy = (H - sy*k)/2;
  const X = x => ox + (x-x0)*k, Y = y => H - oy - (y-y0)*k;
  const f = v => v.toFixed(1);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Estructura">';
  // Tramos: una franja ancha e invisible recibe el toque, para que en el
  // teléfono no haga falta apuntar a una línea de 5 px.
  tramos.forEach(t=>{
    const a = nodo(t.a), b = nodo(t.b);
    if(!a || !b) return;
    const on = _selPend.has(t.id);
    // un tramo curvo se dibuja con su arco (23-)
    const gt = geoTramo(t);
    const pts = (gt && gt.arco ? ejeTramo(gt, 40) : [a, b]).map(q=>f(X(q.x)) + ',' + f(Y(q.y))).join(' ');
    s += '<g class="selT-tramo' + (on ? ' on' : '') + '" onclick="alternarTramoSel(' + t.id + ')">'
      + '<polyline points="' + pts + '" fill="none" stroke="transparent" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<polyline points="' + pts + '" fill="none" stroke="' + (on ? 'var(--acc)' : '#c3cad3')
      + '" stroke-width="' + (on ? 6 : 4) + '" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</g>';
  });
  // Apoyos, como señal para reconocer la estructura (sin su ángulo).
  nodos.forEach(n=>{
    if(!n.apoyo || n.apoyo === 'libre') return;
    const cx = X(n.x), cy = Y(n.y);
    if(n.apoyo === 'empotrado')
      s += '<line x1="' + f(cx-11) + '" y1="' + f(cy+7) + '" x2="' + f(cx+11) + '" y2="' + f(cy+7) + '" stroke="#26415e" stroke-width="3"/>';
    else {
      s += '<path d="M ' + f(cx) + ' ' + f(cy+5) + ' L ' + f(cx-8) + ' ' + f(cy+18) + ' L ' + f(cx+8) + ' ' + f(cy+18) + ' Z" fill="none" stroke="#26415e" stroke-width="1.6"/>';
      if(n.apoyo === 'movil')
        s += '<line x1="' + f(cx-10) + '" y1="' + f(cy+23) + '" x2="' + f(cx+10) + '" y2="' + f(cy+23) + '" stroke="#26415e" stroke-width="1.6"/>';
    }
  });
  nodos.forEach(n=>{
    const cx = X(n.x), cy = Y(n.y);
    // El nombre, del lado contrario a los tramos que llegan (en pantalla).
    let dx = 0, dy = 0;
    tramos.forEach(t=>{
      if(t.a !== n.id && t.b !== n.id) return;
      const o = nodo(t.a === n.id ? t.b : t.a);
      if(!o) return;
      const ex = X(o.x) - cx, ey = Y(o.y) - cy, l = Math.hypot(ex, ey) || 1;
      dx += ex/l; dy += ey/l;
    });
    let l = Math.hypot(dx, dy);
    if(l < 0.3){ dx = 0; dy = 1; l = 1; }          // tramos opuestos: el nombre, arriba
    const lx = cx - dx/l*16, ly = cy - dy/l*16 + 4.5;
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="4.5" fill="' + (n.rotula ? '#fff' : '#26415e') + '" stroke="#26415e" stroke-width="1.8"/>'
      + '<text x="' + f(lx) + '" y="' + f(ly) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + n.nombre + '</text>';
  });
  s += '</svg>';
  caja.innerHTML = s;
  // Cómo saldrá: los grupos que forman los tramos elegidos.
  const res = document.getElementById('selTramosRes');
  if(res){
    if(!_selPend.size) res.innerHTML = 'Ningún tramo elegido.';
    else if(_selPrevia && _selPrevia.internas){
      const guardada = tramosSolucion;
      tramosSolucion = [..._selPend];
      let gs = [];
      try{ gs = gruposSolucion(_selPrevia); } finally { tramosSolucion = guardada; }
      res.innerHTML = 'Se desarrollará: ' + gs.map(g=>'<b>' + g.recorrido + '</b> ('
        + (g.arco ? 'curvo' : (g.oblicuo ? 'inclinado ' + dec(g.ang,'ang') + '°' : (g.vertical ? 'vertical' : 'horizontal'))) + ')').join(' · ');
    }
  }
}
