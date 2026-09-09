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
function applyUnits(){
  const nL = document.getElementById('selLen').value;
  const nF = document.getElementById('selFor').value;
  const kL = LEN_A_M[unitLen]/LEN_A_M[nL];
  const kF = FOR_A_KN[unitFor]/FOR_A_KN[nF];
  nodos.forEach(n=>{ n.x *= kL; n.y *= kL; n.fx *= kF; n.fy *= kF; (n.cargas||[]).forEach(c=>{ c.mag = (c.mag||0)*kF; }); });
  unitLen = nL; unitFor = nF;
  const cu = document.getElementById('chipUnits');
  if(cu) cu.textContent = nL + ' \u00b7 ' + nF;
  resultado = null; closeUnitsModal(); centrar(); refrescar();
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
  fillDec('selDecLen', DEC.len); fillDec('selDecFor', DEC.fuerza);
  updateDecPreview();
  document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g = id => { const e = document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 2; };
  const eL = document.getElementById('dpL'), eF = document.getElementById('dpF');
  if(eL) eL.textContent = (4.23456).toFixed(g('selDecLen')) + ' ' + unitLen;
  if(eF) eF.textContent = (18.76543).toFixed(g('selDecFor')) + ' ' + unitFor;
}
function applyDecModal(){
  const g = id => { const e = document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 2; };
  DEC = {len:g('selDecLen'), fuerza:g('selDecFor')};
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
  resultado = null;
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
  ang: {nom:'Inclinada',  ico:'\u2220', ayuda:'\u00c1ngulo desde la horizontal, antihorario: 0\u00b0 derecha, 90\u00b0 arriba, \u221290\u00b0 abajo.'}
};
// Vector unitario en el que actua una magnitud positiva.
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
  if((c.dir || 'y') === 'ang') return m + ' ' + unitFor + ' a ' + dec(+c.ang || 0, 'ang') + '\u00b0';
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
let edCargaArm = null;          // {nuevo, nudo, nudo0, idx}

function nuevaCargaArm(ref){
  cerrarCargaArm();
  if(!nodos.length){ aviso('Primero dibuja la armadura.', 'error'); return; }
  edCargaArm = {nuevo:true, nudo:(ref && ref.nudo) || nodos[0].id};
  abrirCargaArmModal();
}
function editarCargaArm(id, idx){
  edCargaArm = {nuevo:false, nudo:id, nudo0:id, idx};
  abrirCargaArmModal();
}
function borrarCargaArm(id, idx){
  const n = nodos.find(z=>z.id === id); if(!n || !n.cargas) return;
  registrarCambio();
  n.cargas.splice(idx, 1); recomponerCargaNudo(n);
  resultado = null; refrescar();
}
function _cargaDeRefArm(){
  if(!edCargaArm || edCargaArm.nuevo) return null;
  const n = nodos.find(z=>z.id === edCargaArm.nudo0);
  return (n && (n.cargas || [])[edCargaArm.idx]) || null;
}
function abrirCargaArmModal(){
  const c = _cargaDeRefArm();
  const selN = document.getElementById('cgNudo');
  selN.innerHTML = nodos.map(n=>'<option value="' + n.id + '">Nudo ' + n.nombre + '</option>').join('');
  selN.value = edCargaArm.nudo;
  document.getElementById('cgLblMag').textContent = 'Magnitud (' + unitFor + ')';
  document.getElementById('cgMag').value = c ? c.mag : 10;
  document.getElementById('cgAng').value = (c && c.ang) || -90;
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
  const n = nodos.find(z=>z.id === parseInt(document.getElementById('cgNudo').value, 10));
  if(!n){ aviso('Elige un nudo.', 'error'); return; }
  const dir = document.getElementById('cgDir').value;
  const ang = parseFloat(document.getElementById('cgAng').value) || 0;
  const mag = parseFloat(document.getElementById('cgMag').value) || 0;
  if(Math.abs(mag) < 1e-12){ aviso('La magnitud es cero: la carga no har\u00eda nada.', 'error'); return; }
  registrarCambio();
  // Al editar, la carga original se quita de donde estuviera: asi se puede
  // moverla de un nudo a otro sin duplicarla.
  if(!edCargaArm.nuevo){
    const n0 = nodos.find(z=>z.id === edCargaArm.nudo0);
    if(n0 && n0.cargas){ n0.cargas.splice(edCargaArm.idx, 1); recomponerCargaNudo(n0); }
  }
  if(!Array.isArray(n.cargas)) n.cargas = [];
  n.cargas.push({dir, mag, ang});
  recomponerCargaNudo(n);
  cerrarCargaArm();
  resultado = null; refrescar();
}
function dibujarCroquisCargaArm(){
  const cont = document.getElementById('cgCroquis'); if(!cont || !edCargaArm) return;
  const W2 = 220, H2 = 200, F = v => v.toFixed(1);
  const dir = (document.getElementById('cgDir') || {}).value || 'y';
  const ang = parseFloat((document.getElementById('cgAng') || {}).value) || 0;
  const mag = parseFloat((document.getElementById('cgMag') || {}).value) || 0;
  const n = nodos.find(z=>z.id === parseInt((document.getElementById('cgNudo') || {}).value, 10));
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
  if(Math.abs(mag) > 1e-12){
    const v = vectorCarga(dir, ang), sg = mag >= 0 ? 1 : -1;
    const ux = v.x*sg, uy = -v.y*sg, L = 52;
    s += '<line x1="' + F(cx-ux*L) + '" y1="' + F(cy-uy*L) + '" x2="' + F(cx-ux*9) + '" y2="' + F(cy-uy*9) + '" stroke="#c0392b" stroke-width="2.2"/>'
       + '<polygon points="0,0 -9,-4 -9,4" fill="#c0392b" transform="translate(' + F(cx-ux*8) + ',' + F(cy-uy*8) + ') rotate(' + (Math.atan2(uy,ux)*180/Math.PI).toFixed(1) + ')"/>'
       + '<text x="' + F(cx-ux*(L+12)) + '" y="' + F(cy-uy*(L+12)+3) + '" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#c0392b" text-anchor="middle">' + dec(Math.abs(mag),'f') + '</text>';
  }
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#563aa8" stroke="#fff" stroke-width="2"/>';
  if(n) s += '<text x="' + (cx+11) + '" y="' + (cy-10) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24">' + n.nombre + '</text>';
  cont.innerHTML = s + '</svg>';
}
