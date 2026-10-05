// ═══════════════════════════════════════════════════════════
//  MODALES
// ═══════════════════════════════════════════════════════════
function openUnitsModal(){
  document.getElementById('selLen').value = unitLen;
  document.getElementById('selFor').value = unitFor;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  document.getElementById('upL').textContent = document.getElementById('selLen').value;
  document.getElementById('upF').textContent = document.getElementById('selFor').value;
}
// Cambiar de unidades convierte TODO lo que guarda un número con unidad: las
// coordenadas de los nudos, sus cargas (magnitudes y resultante), la línea de
// corte y, fuera del modelo, lo de convertirUnidadesFueraDelModelo. Es UN paso de
// deshacer, y la instantánea lleva las unidades (17-), así que deshacer devuelve
// los números y las unidades juntos. Con las mismas unidades no hace nada.
function applyUnits(){
  const nL = document.getElementById('selLen').value;
  const nF = document.getElementById('selFor').value;
  if((nL === unitLen && nF === unitFor) || !LEN_A_M[nL] || !FOR_A_KN[nF]){ closeUnitsModal(); return; }
  const kL = LEN_A_M[unitLen]/LEN_A_M[nL];
  const kF = FOR_A_KN[unitFor]/FOR_A_KN[nF];
  registrarCambio();
  nodos.forEach(n=>{ n.x *= kL; n.y *= kL; n.fx *= kF; n.fy *= kF; (n.cargas||[]).forEach(c=>{ c.mag = (c.mag||0)*kF; }); });
  if(corte) corte = {x1:corte.x1*kL, y1:corte.y1*kL, x2:corte.x2*kL, y2:corte.y2*kL};
  corteDrag = null;
  convertirUnidadesFueraDelModelo(kL, kF);
  unitLen = nL; unitFor = nF;
  pintarChipUnidades();
  invalidarResultados(); closeUnitsModal(); centrar(); refrescar();
}
// Lo que tiene unidad y NO va en la instantánea de deshacer: la vista (se escala
// para que la imagen en pantalla no cambie), la posición del ratón en el mundo y
// los admisibles ya evaluados del «¿qué barra falla primero?» (08-) con lo que
// se deriva de ellos. La usan applyUnits y restaurarInstantanea (17-) cuando la
// instantánea está en otras unidades. kL y kF multiplican un valor en las
// unidades actuales para pasarlo a las nuevas.
function convertirUnidadesFueraDelModelo(kL, kF){
  vx *= kL; vy *= kL;
  escala = Math.max(0.02, Math.min(escala/kL, 4000));
  if(mouseW) mouseW = [mouseW[0]*kL, mouseW[1]*kL];
  if(typeof simCap !== 'undefined' && simCap) simCap = {T:simCap.T*kF, C:simCap.C*kF};
  if(typeof simP0 !== 'undefined') simP0 *= kF;
  if(typeof simA !== 'undefined') Object.keys(simA).forEach(k=>{ simA[k] *= kF; });
}
function pintarChipUnidades(){
  const cu = document.getElementById('chipUnits');
  if(cu) cu.textContent = unitLen + ' \u00b7 ' + unitFor;
}

function fillDec(id, val){
  const s = document.getElementById(id);
  if(!s) return;
  s.innerHTML = '';
  for(let i=0;i<=5;i++){
    const o = document.createElement('option');
    o.value = i; o.textContent = i + (i===1?' decimal':' decimales');
    if(i===val) o.selected = true;
    s.appendChild(o);
  }
}
// Etiqueta de decimales en palabras, igual que en los demás capítulos.
function textoDecimales(){
  const v = Object.values(DEC);
  const iguales = v.every(x=>x===v[0]);
  return iguales ? (v[0] + (v[0]===1?' decimal':' decimales'))
                 : v.join(' / ') + ' decimales';
}

function openDecModal(){
  fillDec('selDecLen', DEC.len); fillDec('selDecFor', DEC.fuerza); fillDec('selDecAng', DEC.ang);
  updateDecPreview();
  document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g = id => { const e = document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 2; };
  const eL = document.getElementById('dpL'), eF = document.getElementById('dpF');
  if(eL) eL.textContent = (4.23456).toFixed(g('selDecLen')) + ' ' + unitLen;
  if(eF) eF.textContent = (18.76543).toFixed(g('selDecFor')) + ' ' + unitFor;
  const eA = document.getElementById('dpA');
  if(eA) eA.textContent = (33.69007).toFixed(g('selDecAng')) + '\u00b0';
}
function applyDecModal(){
  const g = id => { const e = document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 2; };
  DEC = {len:g('selDecLen'), fuerza:g('selDecFor'), ang:g('selDecAng')};
  document.getElementById('chipDec').textContent = textoDecimales();
  closeDecModal();
  if(resultado) resolver(); else refrescar();
}

// Abre el editor de carga de un nudo. Lo usan tanto la herramienta "Carga"
// del lienzo como el botón ✎ de la lista de cargas.
// ═══════════════════════════════════════════════════════════
//  MODAL DE CARGAS — acordeón
//  Con muchas fuerzas, mostrar todas expandidas hacía crecer el modal sin
//  límite y tapaba los botones Aplicar/Cancelar. Ahora solo la fuerza que
//  se está editando aparece con sus campos; las demás se colapsan a una
//  línea con su resumen, y basta con tocarlas para volver a abrirlas.
let cargaFilasData = [];   // [{fx,fy}, ...] — fuente de verdad mientras el modal está abierto
let cargaExpandidoIdx = 0; // índice de la única fila expandida



// Botón de un grupo segmentado, ya marcado si es el elegido. Lo comparten las
// dos ventanas de carga; el estado se pinta al generar el HTML, así no puede
// desincronizarse del dato.
function segCargaArm(activo, valor, texto, ayuda, alPulsar){
  return '<button type="button" class="seg-btn' + (activo ? ' active' : '') + '" data-v="' + valor + '"'
    + ' title="' + ayuda + '" onclick="' + alPulsar + '">' + texto + '</button>';
}

// Una fuerza de nudo lleva sus DOS componentes en el mismo registro: una carga
// inclinada es una sola fuerza, no dos que haya que sumar a mano.
// Una fuerza de nudo, con el formato de fuerzas internas: una magnitud y una
// dirección. «Inclinada» pide además el ángulo desde la horizontal.


// Actualiza el dato en vivo mientras se escribe, sin esperar a colapsar la fila.

// ── Croquis del nudo con sus fuerzas ──
// El equivalente del croquis del tramo de fuerzas internas: enseña hacia dónde
// empuja cada magnitud escrita, que es justo lo que decide su signo.




function quitarCarga(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  registrarCambio();
  n.cargas = []; n.fx = 0; n.fy = 0;
  invalidarResultados();
  refrescar();
}

// ══ CARGAS EN LOS NUDOS ═══════════════════════════════════════════════════
// En una armadura las cargas van SOLO en los nudos: cada barra es de dos
// fuerzas. Una carga se declara con magnitud y direccion, con el convenio de
// CLAUDE.md §7: la vertical es positiva hacia abajo y la horizontal hacia la
// derecha. El modelo guarda `nodo.cargas = [{dir, mag, ang}]`, y `nodo.fx` /
// `nodo.fy` son su suma vectorial con +y hacia ARRIBA, que es lo que consume
// el motor de equilibrio de 06-.
const DIR_CARGA_ARM = {
  y:   {nom:'Vertical',   ico:'\u2193', ayuda:'Vertical, positiva hacia abajo.'},
  x:   {nom:'Horizontal', ico:'\u2192', ayuda:'Horizontal, positiva hacia la derecha.'},
  ang: {nom:'Inclinada',  ico:'\u2220', ayuda:'0\u00b0 derecha, 90\u00b0 arriba, 180\u00b0 izquierda, 270\u00b0 abajo.'}
};
// Vector unitario en el que actua una magnitud positiva. `ang` es el angulo
// INTERNO (desde +x, antihorario, HACIA DONDE APUNTA la flecha). Desde el
// 2026-10-04 es tambien el numero que escribe el alumno (antes escribia de
// donde venia, el opuesto): la ventana ya no da media vuelta.
// Angulo en [0, 360), redondeado a 1e-4, para ensenarlo en la ventana.
function angulo360Arm(a){
  const r = +((((+a % 360) + 360) % 360).toFixed(4));
  return (r >= 360) ? 0 : r;
}
function vectorCarga(dir, ang){
  if(dir === 'ang'){ const a = (+ang || 0)*Math.PI/180; return {x:Math.cos(a), y:Math.sin(a)}; }
  if(dir === 'x') return {x:1, y:0};
  return {x:0, y:-1};                  // 'y': hacia abajo
}
function compCargaNudo(c){
  const v = vectorCarga(c.dir || 'y', c.ang), m = +c.mag || 0;
  return {fx: m*v.x, fy: m*v.y};
}
// De componentes (+y arriba) a la carga con magnitud y direccion.
function _cargasNudoDeComponentes(fx, fy){
  if(Math.abs(fx) < 1e-12 && Math.abs(fy) < 1e-12) return [];
  if(Math.abs(fx) < 1e-12) return [{dir:'y', mag:-fy}];
  if(Math.abs(fy) < 1e-12) return [{dir:'x', mag:fx}];
  return [{dir:'ang', mag:Math.hypot(fx, fy), ang:+(Math.atan2(fy, fx)*180/Math.PI).toFixed(2)}];
}
function descPuntual(c){
  const m = dec(+c.mag || 0, 'f');
  if((c.dir || 'y') === 'ang') return m + ' ' + unitFor + ' a ' + dec(angulo360Arm(c.ang), 'ang') + '\u00b0';
  return m + ' ' + unitFor + ' ' + (DIR_CARGA_ARM[c.dir || 'y'] || DIR_CARGA_ARM.y).ico;
}
function descCargaNudo(c){ return descPuntual(c); }
function recomponerCargaNudo(n){
  let fx = 0, fy = 0;
  (n.cargas || []).forEach(c=>{ const q = compCargaNudo(c); fx += q.fx; fy += q.fy; });
  n.fx = fx; n.fy = fy;
  return n;
}
// La usan los ejemplos: magnitud vertical (positiva hacia abajo) y horizontal.
function ponerCargaNudo(n, magY, magX){
  n.cargas = _cargasNudoDeComponentes(+magX || 0, -(+magY || 0));
  return recomponerCargaNudo(n);
}
// Deja en el convenio vigente lo que traiga un archivo anterior: componentes
// {fx, fy}, el par {magY, magX} de una version intermedia, o `nodo.fx/fy` sin
// lista de cargas. Tambien descarta lo que solo tenia sentido en un bastidor
// (pares aplicados en el nudo), retirado el 2026-09-10.
function normalizarCargasArm(){ nodos.forEach(normalizarCargasNodo); }
function normalizarCargasNodo(n){
  const out = [];
  (n.cargas || []).forEach(c=>{
    if(!c) return;
    if(c.tipo === 'M') return;                       // par: ya no existe en armaduras
    if(c.dir && c.mag !== undefined){ out.push({dir:(c.dir === 'y' || c.dir === 'x' || c.dir === 'ang') ? c.dir : 'y', mag:+c.mag || 0, ang:+c.ang || 0}); return; }
    if(c.magY !== undefined || c.magX !== undefined){ _cargasNudoDeComponentes(+c.magX || 0, -(+c.magY || 0)).forEach(q=>out.push(q)); return; }
    _cargasNudoDeComponentes(+c.fx || 0, +c.fy || 0).forEach(q=>out.push(q));
  });
  if(!out.length && (Math.abs(n.fx || 0) > 1e-12 || Math.abs(n.fy || 0) > 1e-12))
    _cargasNudoDeComponentes(n.fx || 0, n.fy || 0).forEach(q=>out.push(q));
  n.cargas = out;
  return recomponerCargaNudo(n);
}

// ── Ventana de la carga ────────────────────────────────────────────────────
// UNA ventana declara UNA carga, con la forma de la de fuerzas-internas:
// campos a la izquierda, croquis a la derecha y validacion antes de aplicar.
// Las cargas ya puestas se editan una por fila en el panel de elementos.
// La ventana se abre SIEMPRE sobre un nudo ya elegido —tocándolo con la
// herramienta Carga (03-interaccion.js), con «Añadir carga…» de Editar nudo o
// con el lápiz del panel—, así que no tiene selector: el nudo va en el título
// y, al editar, queda fijo.
let edCargaArm = null;          // {nuevo, nudo, idx}

function nuevaCargaArm(ref){
  cerrarCargaArm();
  // Sin nudo no se abre nada: nunca se toma uno por defecto.
  if(!ref || ref.nudo === undefined || ref.nudo === null) return;
  if(!nodos.some(z=>z.id === ref.nudo)) return;
  edCargaArm = {nuevo:true, nudo:ref.nudo};
  abrirCargaArmModal();
}
function editarCargaArm(id, idx){
  edCargaArm = {nuevo:false, nudo:id, idx};
  abrirCargaArmModal();
}
function borrarCargaArm(id, idx){
  const n = nodos.find(z=>z.id === id); if(!n || !n.cargas) return;
  registrarCambio();
  n.cargas.splice(idx, 1); recomponerCargaNudo(n);
  invalidarResultados(); refrescar();
}
function _cargaDeRefArm(){
  if(!edCargaArm || edCargaArm.nuevo) return null;
  const n = nodos.find(z=>z.id === edCargaArm.nudo);
  return (n && (n.cargas || [])[edCargaArm.idx]) || null;
}
function abrirCargaArmModal(){
  const n = nodos.find(z=>z.id === edCargaArm.nudo);
  if(!n){ edCargaArm = null; return; }
  const c = _cargaDeRefArm();
  // El título dice el nudo: es el único sitio de la ventana donde aparece.
  document.getElementById('cgTitulo').textContent =
    (edCargaArm.nuevo ? 'Carga en el nudo ' : 'Editar carga del nudo ') + n.nombre;
  document.getElementById('cgLblMag').textContent = 'Magnitud (' + unitFor + ')';
  document.getElementById('cgMag').value = c ? c.mag : 10;
  // El campo ensena hacia donde apunta la carga, el mismo numero que guarda
  // c.ang (270 = abajo por defecto). Ojo con `|| -90`: 0 es un angulo valido.
  document.getElementById('cgAng').value =
    (c && c.ang !== undefined && isFinite(+c.ang)) ? angulo360Arm(c.ang) : 270;
  setDirCargaArm(_pintarDirsArm(c ? (c.dir || 'y') : 'y'));
  document.getElementById('cargaModal').classList.add('show');
}
function cerrarCargaArm(){
  const m = document.getElementById('cargaModal'); if(m) m.classList.remove('show');
  edCargaArm = null;
}
function marcarSegArm(id, v){
  const g = document.getElementById(id); if(!g) return;
  g.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.v === v));
}
function _pintarDirsArm(dirIni){
  const dirs = [['y','Vertical'], ['x','Horizontal'], ['ang','Inclinada']];
  const ok = dirs.some(([x])=>x === dirIni) ? dirIni : 'y';
  const cont = document.getElementById('cgSegDir');
  if(cont) cont.innerHTML = dirs.map(([x,t])=>segCargaArm(ok===x, x, t, DIR_CARGA_ARM[x].ayuda,
      'setDirCargaArm(&quot;' + x + '&quot;)')).join('');
  return ok;
}
function setDirCargaArm(v){
  const h = document.getElementById('cgDir'); if(!h) return;
  h.value = v;
  marcarSegArm('cgSegDir', v);
  const fa = document.getElementById('cgFilaAng');
  if(fa) fa.style.display = (v === 'ang') ? '' : 'none';
  const hint = document.getElementById('cgHintDir');
  if(hint) hint.textContent = (DIR_CARGA_ARM[v] || {}).ayuda || '';
  const prev = document.getElementById('cgPrev');
  if(prev) prev.textContent = 'Un valor negativo invierte el sentido de la flecha.';
  dibujarCroquisCargaArm();
}
function aplicarCargaArm(){
  if(!edCargaArm) return;
  const n = nodos.find(z=>z.id === edCargaArm.nudo);
  if(!n){ aviso('Ese nudo ya no existe.', 'error'); cerrarCargaArm(); return; }
  if(!edCargaArm.nuevo && !(n.cargas || [])[edCargaArm.idx]){
    aviso('Esa carga ya no existe.', 'error'); cerrarCargaArm(); return;
  }
  const dir = document.getElementById('cgDir').value;
  // El campo dice hacia donde apunta la carga, que es lo que se guarda.
  const angUsr = parseFloat(document.getElementById('cgAng').value);
  const ang = isFinite(angUsr) ? angUsr : 270;
  const mag = parseFloat(document.getElementById('cgMag').value) || 0;
  if(Math.abs(mag) < 1e-12){ aviso('La magnitud es cero: la carga no har\u00eda nada.', 'error'); return; }
  registrarCambio();
  if(!Array.isArray(n.cargas)) n.cargas = [];
  // Al editar, el nudo es fijo y la carga se reemplaza EN SU SITIO: conserva
  // su fila en el panel de elementos.
  if(edCargaArm.nuevo) n.cargas.push({dir, mag, ang});
  else n.cargas[edCargaArm.idx] = {dir, mag, ang};
  recomponerCargaNudo(n);
  cerrarCargaArm();
  invalidarResultados(); refrescar();
}
function dibujarCroquisCargaArm(){
  const cont = document.getElementById('cgCroquis'); if(!cont || !edCargaArm) return;
  const W2 = 220, H2 = 200, F = v => v.toFixed(1);
  const dir = (document.getElementById('cgDir') || {}).value || 'y';
  const _angUsr = parseFloat((document.getElementById('cgAng') || {}).value);
  const ang = isFinite(_angUsr) ? _angUsr : 270;
  const mag = parseFloat((document.getElementById('cgMag') || {}).value) || 0;
  const n = nodos.find(z=>z.id === edCargaArm.nudo);
  const cx = W2/2, cy = H2/2;
  let s = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;height:auto;display:block">'
        + '<rect width="' + W2 + '" height="' + H2 + '" fill="#fff"/>';
  if(n){
    const con = barras.filter(b=>b.a===n.id||b.b===n.id);
    let esc = 1e-9;
    con.forEach(b=>{ const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a)); if(o) esc = Math.max(esc, Math.hypot(o.x-n.x, o.y-n.y)); });
    const k = 52/Math.max(esc, 1e-9);
    con.forEach(b=>{ const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a)); if(!o) return;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + F(cx+(o.x-n.x)*k) + '" y2="' + F(cy-(o.y-n.y)*k)
         + '" stroke="#563aa8" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>'; });
  }
  // La flecha ocupa SIEMPRE el sitio de la magnitud positiva y el signo solo
  // invierte la punta (2026-10-04, como en fuerzas internas). La INCLINADA sale
  // del nudo en la dirección escrita y su ángulo se acota EN EL NUDO, desde +x
  // hasta la propia flecha (bsaArcoAnguloSVG, core), para que el arco toque la
  // fuerza (corrección del profesor); las demás llegan al nudo, como siempre.
  // Se acota el equivalente de arco más corto (270° → −90°) y la ventana lo dice.
  const nota = document.getElementById('cgNotaAng');
  if(nota) nota.style.display = 'none';
  if(Math.abs(mag) > 1e-12){
    const v = vectorCarga(dir, ang), neg = mag < 0;
    const ux = v.x, uy = -v.y, L = 52, sale = (dir === 'ang');
    const punta = (x, y, dx, dy) => '<polygon points="0,0 -9,-4 -9,4" fill="#c0392b" transform="translate(' + F(x) + ',' + F(y) + ') rotate(' + (Math.atan2(dy,dx)*180/Math.PI).toFixed(1) + ')"/>';
    let lx, ly, ta = 'middle';
    if(!sale){
      const tx = cx - ux*L, ty = cy - uy*L;
      s += '<line x1="' + F(tx) + '" y1="' + F(ty) + '" x2="' + F(cx-ux*9) + '" y2="' + F(cy-uy*9) + '" stroke="#c0392b" stroke-width="2.2"/>';
      s += neg ? punta(tx, ty, -ux, -uy) : punta(cx-ux*8, cy-uy*8, ux, uy);
      lx = cx-ux*(L+12); ly = cy-uy*(L+12)+3;
    } else {
      const ax0 = cx + ux*8, ay0 = cy + uy*8, ax1 = cx + ux*L, ay1 = cy + uy*L;
      s += '<line x1="' + F(ax0) + '" y1="' + F(ay0) + '" x2="' + F(ax1 - ux*(neg ? 0 : 2)) + '" y2="' + F(ay1 - uy*(neg ? 0 : 2)) + '" stroke="#c0392b" stroke-width="2.2"/>';
      s += neg ? punta(ax0, ay0, -ux, -uy) : punta(ax1, ay1, ux, uy);
      // Lo que el valor y el ángulo no deben pisar: la flecha, las barras, +x y el nombre.
      const segs = [[cx, cy, ax1, ay1], [cx, cy, cx + 44, cy]];
      if(n){
        let esc = 1e-9;
        const con = barras.filter(b2=>b2.a===n.id||b2.b===n.id)
          .map(b2=>nodos.find(z=>z.id===(b2.a===n.id?b2.b:b2.a))).filter(Boolean);
        con.forEach(o2=>{ esc = Math.max(esc, Math.hypot(o2.x-n.x, o2.y-n.y)); });
        con.forEach(o=>segs.push([cx, cy, cx+(o.x-n.x)*52/esc, cy-(o.y-n.y)*52/esc]));
      }
      const txtV = dec(Math.abs(mag),'f');
      const caja = (x0, y0, ta2) => { const w = txtV.length*5.9, xa = ta2 === 'start' ? x0 : (ta2 === 'end' ? x0 - w : x0 - w/2); return {x0:xa, x1:xa + w, y0:y0 - 9, y1:y0 + 2.5}; };
      const cajaNom = {x0:cx+10, x1:cx+26, y0:cy-20, y1:cy-6};
      const choca = c => segs.filter(sg=>{
        const mx = Math.max(sg[0], sg[2]), mn = Math.min(sg[0], sg[2]), my = Math.max(sg[1], sg[3]), mny = Math.min(sg[1], sg[3]);
        if(c.x1 < mn - 2 || c.x0 > mx + 2 || c.y1 < mny - 2 || c.y0 > my + 2) return false;
        for(let i = 0; i <= 12; i++){ const px2 = sg[0]+(sg[2]-sg[0])*i/12, py2 = sg[1]+(sg[3]-sg[1])*i/12;
          if(px2 >= c.x0-2 && px2 <= c.x1+2 && py2 >= c.y0-2 && py2 <= c.y1+2) return true; }
        return false; }).length + ((c.x0 < cajaNom.x1 && cajaNom.x0 < c.x1 && c.y0 < cajaNom.y1 && cajaNom.y0 < c.y1) ? 1 : 0);
      const anc = vx => vx > 0.3 ? 'start' : (vx < -0.3 ? 'end' : 'middle');
      const sitios = [{x0:cx + ux*(L+12), y0:cy + uy*(L+12) + 3, ta:anc(ux)}];
      [[-uy, ux], [uy, -ux]].forEach(([px, py])=>{ [36, 44, 28].forEach(m=>{
        sitios.push({x0:cx + ux*m + px*12, y0:cy + uy*m + py*12 + 3, ta:anc(px)}); }); });
      let mejorV = null;
      sitios.forEach(q=>{
        const cj = caja(q.x0, q.y0, q.ta);
        const fuera = (cj.x0 < 1 || cj.x1 > W2-1 || cj.y0 < 1 || cj.y1 > H2-1) ? 5 : 0;
        const k = choca(cj) + fuera;
        if(!mejorV || k < mejorV.k) mejorV = {k, x0:q.x0, y0:q.y0, ta:q.ta};
      });
      lx = mejorV.x0; ly = mejorV.y0; ta = mejorV.ta;
      s += bsaArcoAnguloSVG({x:cx, y:cy, ang:ang, col:'#c0392b', r:18,
                             segs, cajas:[cajaNom, caja(lx, ly, ta)], ancho:W2, alto:H2}).svg;
      let tt = ((ang % 360) + 540) % 360 - 180;
      if(tt <= -180 + 1e-9) tt = 180;
      if(nota && isFinite(_angUsr) && Math.abs(tt - _angUsr) > 1e-6){
        nota.style.display = '';
        nota.textContent = 'En el croquis se acota ' + dec(tt, 'ang') + '\u00b0: es la misma dirección que '
          + dec(_angUsr, 'ang') + '\u00b0 con un arco más corto desde +x.';
      }
    }
    s += '<text x="' + F(lx) + '" y="' + F(ly) + '" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#c0392b" text-anchor="' + ta + '">' + dec(Math.abs(mag),'f') + '</text>';
  }
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#563aa8" stroke="#fff" stroke-width="2"/>';
  if(n) s += '<text x="' + (cx+11) + '" y="' + (cy-10) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24">' + n.nombre + '</text>';
  cont.innerHTML = s + '</svg>';
}
