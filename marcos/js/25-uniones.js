// ═══════════════════════════════════════════════════════════
//  UNIÓN EN UN NUDO (2026-10-25, tema Marcos)
//  En la ventana del nudo, si llegan dos o más miembros: Pasador (por defecto:
//  fuerza sin momento), Rígida (soldados: también momento) o Deslizante (un
//  pasador que corre a lo largo de un tramo: solo la fuerza perpendicular a
//  él). El tramo por el que desliza se toca en el croquis, que dibuja el nudo y
//  los tramos que llegan con el nombre de su otro extremo.
// ═══════════════════════════════════════════════════════════
function miembrosEnNudo(n){ return new Set(tramosDeNudo(n.id).map(miembroDeTramo)); }

function pintarUnionNudo(){
  const n = nodo(edApoyo), bl = document.getElementById('unionBloque');
  if(!bl) return;
  const ver = !!n && miembrosEnNudo(n).size >= 2;
  bl.style.display = ver ? '' : 'none';
  if(!ver) return;
  const u = n.union || 'pasador';
  bl.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.u === u));
  const ts = tramosDeNudo(n.id), td = ts.find(t=>t.id === n.desliza);
  const h = document.getElementById('unionHint');
  if(h) h.textContent = u === 'rigida' ? 'Los miembros quedan soldados: se transmiten también momento.'
    : (u === 'deslizante' ? (td ? 'Desliza a lo largo del tramo ' + nomTramo(td) + ': solo transmite la fuerza perpendicular a él.'
                                : 'Toca en el croquis el tramo a lo largo del cual desliza.')
       : 'Transmite fuerza, no momento.');
  const cq = document.getElementById('unionCroquis');
  if(cq) cq.innerHTML = (u === 'deslizante') ? croquisDeslizante(n, ts, td) : '';
}
// El nudo en el centro y cada tramo que llega, en su dirección, con el nombre del
// nudo de su otro extremo. Cada tramo se toca para elegirlo.
function croquisDeslizante(n, ts, td){
  const W = 260, H = 190, cx = W/2, cy = H/2, L = 72, f = v=>v.toFixed(1);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:300px;display:block;margin:0 auto" role="img" aria-label="Tramos que llegan al nudo">';
  ts.forEach(t=>{
    const u = tangenteEnNudo(t, n.id), sg = (t.a === n.id) ? 1 : -1;
    const dx = u.x*sg, dy = u.y*sg, x2 = cx + dx*L, y2 = cy - dy*L;
    const on = td && td.id === t.id, o = nodo(t.a === n.id ? t.b : t.a);
    s += '<g style="cursor:pointer" onclick="elegirTramoDeslizante(' + t.id + ')">'
      + '<line x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="transparent" stroke-width="26" stroke-linecap="round"/>'
      + '<line x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + (on ? 'var(--acc)' : '#1e3a8a')
      + '" stroke-width="' + (on ? 7 : 4.5) + '" stroke-linecap="round"/>'
      + '<text x="' + f(cx + dx*(L + 14)) + '" y="' + f(cy - dy*(L + 14) + 4) + '" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#1b1f24" text-anchor="middle">'
      + (o ? o.nombre : '') + '</text></g>';
    if(on){
      const a = Math.atan2(-dy, dx)*180/Math.PI;
      s += '<rect x="' + f(cx - 17) + '" y="' + f(cy - 10) + '" width="34" height="20" fill="rgba(15,118,110,.14)" stroke="' + COL_PIN
        + '" stroke-width="2.2" transform="rotate(' + f(a) + ' ' + f(cx) + ' ' + f(cy) + ')"/>';
    }
  });
  s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="7" fill="#fff" stroke="#1e3a8a" stroke-width="2.6"/>'
    + '<text x="' + f(cx + 12) + '" y="' + f(cy + 20) + '" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#1b1f24">' + n.nombre + '</text>';
  return s + '</svg>';
}
function elegirUnion(u){
  const n = nodo(edApoyo); if(!n) return;
  if((n.union || 'pasador') === u){ pintarUnionNudo(); return; }
  registrarCambio();
  if(u === 'pasador'){ delete n.union; delete n.desliza; }
  else { n.union = u; if(u !== 'deslizante') delete n.desliza; }
  invalidarResultados(); pintarUnionNudo(); actualizarPrevApoyo(); refrescar();
}
// ═══════════════════════════════════════════════════════════
//  LOS MIEMBROS SE VEN Y SE CAMBIAN (2026-10-25, ejercicios PC4 del profesor)
//  Qué tramos forman un miembro lo decide el dibujo (un tirón, un miembro),
//  pero un marco se dibuja a trozos: hacía falta verlo y poder corregirlo.
//  Cada miembro lleva en el lienzo un halo de su color, y al marcar tramos con
//  Mover / editar aparece una barra sobre el lienzo: «Unir en un miembro» (los
//  tramos marcados, conectados y sin anillo, pasan a ser una sola pieza) y
//  «Separar» (cada tramo marcado, un miembro propio: entre ellos, pasador).
// ═══════════════════════════════════════════════════════════
const PALETA_MIEMBROS = ['#3b82f6', '#16a34a', '#a855f7', '#db2777', '#0891b2', '#ca8a04', '#64748b', '#dc2626'];
function colorMiembroDe(t){
  const orden = [];
  tramos.forEach(z=>{ const m = miembroDeTramo(z); if(orden.indexOf(m) < 0) orden.push(m); });
  return PALETA_MIEMBROS[Math.max(0, orden.indexOf(miembroDeTramo(t))) % PALETA_MIEMBROS.length];
}
function _tramosMarcados(){ return selTramos.map(id=>tramos.find(t=>t.id === id)).filter(Boolean); }
// Nombre de un conjunto de tramos (sus nudos en orden de recorrido).
function _nombreTramos(ts){
  const nds = [];
  ts.forEach(t=>[t.a, t.b].forEach(id=>{ if(nds.indexOf(id) < 0) nds.push(id); }));
  return _nombreCuerpo({tramos:ts, nudos:nds});
}
function pintarBarraMiembros(){
  const area = document.getElementById('canvasArea');
  if(!area) return;
  let b = document.getElementById('barraMiembros');
  const ts = _tramosMarcados();
  if(!ts.length || tool !== 'sel'){ if(b) b.style.display = 'none'; return; }
  if(!b){ b = document.createElement('div'); b.id = 'barraMiembros'; b.className = 'barra-miembros'; area.appendChild(b); }
  const ms = [...new Set(ts.map(miembroDeTramo))];
  const delMiembro = m=>tramos.filter(t=>miembroDeTramo(t) === m);
  let txt;
  if(ms.length === 1){
    const todo = delMiembro(ms[0]);
    txt = (todo.length === ts.length ? 'Miembro <b>' : 'Del miembro <b>') + _nombreTramos(todo) + '</b>';
  } else txt = ts.length + ' tramos de ' + ms.length + ' miembros';
  b.innerHTML = '<span>' + txt + '</span>'
    + (ts.length >= 2 && ms.length >= 2 ? '<button type="button" class="mbtn" onclick="unirEnMiembro()">Unir en un miembro</button>' : '')
    + (ts.some(t=>delMiembro(miembroDeTramo(t)).length > 1) ? '<button type="button" class="mbtn ghost" onclick="separarMiembros()">Separar</button>' : '');
  b.style.display = '';
}
function unirEnMiembro(){
  const ts = _tramosMarcados();
  if(ts.length < 2) return;
  // Conectados por sus nudos y sin anillo: una pieza que se pueda soldar.
  const nds = new Set(); ts.forEach(t=>{ nds.add(t.a); nds.add(t.b); });
  const vistos = new Set([ts[0].a]), pila = [ts[0].a];
  while(pila.length){ const id = pila.pop(); ts.forEach(t=>{ if(t.a !== id && t.b !== id) return; const o = t.a === id ? t.b : t.a; if(!vistos.has(o)){ vistos.add(o); pila.push(o); } }); }
  if(vistos.size !== nds.size){ aviso('Los tramos marcados no están unidos entre sí: no pueden formar un solo miembro.', 'error'); return; }
  if(ts.length !== nds.size - 1){ aviso('Los tramos marcados forman un anillo cerrado: un miembro así no se resuelve con la estática.', 'error'); return; }
  registrarCambio();
  const m = ++miembroSeq;
  ts.forEach(t=>{ t.miembro = m; });
  cadenaMiembro = null;
  invalidarResultados(); refrescar();
  aviso('Ahora ' + _nombreTramos(ts) + ' es un solo miembro.');
}
function separarMiembros(){
  const ts = _tramosMarcados();
  if(!ts.length) return;
  registrarCambio();
  ts.forEach(t=>{ t.miembro = ++miembroSeq; });
  cadenaMiembro = null;
  invalidarResultados(); refrescar();
  aviso(ts.length === 1 ? 'El tramo ' + nomTramo(ts[0]) + ' es ahora un miembro aparte.' : 'Cada tramo marcado es ahora un miembro aparte.');
}

function elegirTramoDeslizante(id){
  const n = nodo(edApoyo); if(!n || n.desliza === id) return;
  registrarCambio();
  n.union = 'deslizante'; n.desliza = id;
  invalidarResultados(); pintarUnionNudo(); actualizarPrevApoyo(); refrescar();
}
