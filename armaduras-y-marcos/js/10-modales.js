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
  // Cargas sobre barras (19-): posiciones en longitud, fuerzas, pares y repartidas.
  barras.forEach(b=>cargasDeBarra(b).forEach(c=>{
    if(c.tipo === 'P'){ c.s *= kL; c.mag = (c.mag||0)*kF; }
    else if(c.tipo === 'M'){ c.s *= kL; c.mag *= kF*kL; }
    else { c.s1 *= kL; c.s2 *= kL; c.mag *= kF/kL; if(c.mag2 !== undefined) c.mag2 *= kF/kL; }
  }));
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

function abrirCarga(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  nodoCarga = n.id;
  document.getElementById('cargaNodoNom').textContent = n.nombre;
  // Semilla de filas: las cargas ya guardadas, o si el nudo viene de un
  // formato antiguo sin ese arreglo, una sola fila con su resultante actual.
  const base = (n.cargas && n.cargas.length) ? n.cargas
             : ((!esCero(n.fx||0) || !esCero(n.fy||0)) ? _cargasNudoDeComponentes(n.fx||0, n.fy||0) : [{dir:'y', mag:10}]);
  cargaFilasData = (base.length ? base : [{dir:'y', mag:10}]).map(c=>({dir:c.dir||'y', mag:+c.mag||0, ang:+c.ang||0}));
  cargaExpandidoIdx = 0;
  renderCargaLista();
  document.getElementById('cargaModal').classList.add('show');
  dibujarCroquisNudo();
}

function renderCargaLista(){
  const lista = document.getElementById('cargaLista');
  lista.innerHTML = cargaFilasData.map((c, idx)=>
    idx === cargaExpandidoIdx ? htmlFilaExpandida(c, idx) : htmlFilaColapsada(c, idx)
  ).join('');
  actualizarPreviewCarga();
  dibujarCroquisNudo();
}

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
function htmlFilaExpandida(c, idx){
  const dir = c.dir || 'y';
  const campo = (k, etq, val, u) =>
      '<div class="carga-campo"><label class="carga-campo-lbl">' + etq + '</label>'
    + '<div class="carga-input-wrap">'
    + '<input type="number" step="any" value="' + val + '" oninput="actualizarCampoCarga(' + idx + ',&quot;' + k + '&quot;,this.value)">'
    + '<span class="carga-campo-unit">' + u + '</span></div></div>';
  const bot = [['y','\u2193 Vert.'], ['x','\u2192 Horiz.'], ['ang','\u2220 Inclinada']]
    .map(([v,t])=>segCargaArm(dir===v, v, t, DIR_CARGA_ARM[v].ayuda,
        'actualizarCampoCarga(' + idx + ',&quot;dir&quot;,&quot;' + v + '&quot;)')).join('');
  return '<div class="carga-card">'
    + '<div class="carga-card-head">'
    +   '<span class="carga-card-title">Fuerza ' + (idx+1) + '</span>'
    +   '<button class="carga-del" title="Quitar esta fuerza" onclick="quitarFilaCarga(' + idx + ')">\u00d7</button>'
    + '</div>'
    + '<div class="carga-eje-row">' + campo('mag', 'Magnitud', c.mag, unitFor)
    +   (dir === 'ang' ? campo('ang', '\u00c1ngulo desde la horizontal', c.ang || 0, '\u00b0') : '') + '</div>'
    + '<div class="cg-grupo"><div class="cg-cap">Direcci\u00f3n</div><div class="cg-seg">' + bot + '</div>'
    +   '<div class="hint-sm">' + DIR_CARGA_ARM[dir].ayuda + '</div></div>'
    + '</div>';
}

function htmlFilaColapsada(c, idx){
  return '<div class="carga-mini" onclick="expandirFilaCarga(' + idx + ')">'
    +   '<span class="carga-mini-nom">Fuerza ' + (idx+1) + '</span>'
    +   '<span class="carga-mini-val">' + descCargaNudo(c) + '</span>'
    +   '<button class="carga-del" title="Quitar esta fuerza" '
    +     'onclick="event.stopPropagation(); quitarFilaCarga(' + idx + ')">\u00d7</button>'
    + '</div>';
}

// Actualiza el dato en vivo mientras se escribe, sin esperar a colapsar la fila.
function actualizarCampoCarga(idx, campo, valor){
  const c = cargaFilasData[idx]; if(!c) return;
  if(campo === 'dir'){ c.dir = valor; if(valor === 'ang' && !c.ang) c.ang = -90; renderCargaLista(); return; }
  c[campo] = parseFloat(valor) || 0;
  actualizarPreviewCarga(); dibujarCroquisNudo();
}

// ── Croquis del nudo con sus fuerzas ──
// El equivalente del croquis del tramo de fuerzas internas: enseña hacia dónde
// empuja cada magnitud escrita, que es justo lo que decide su signo.
function dibujarCroquisNudo(){
  const cont = document.getElementById('cargaCroquis'); if(!cont) return;
  const n = nodos.find(z=>z.id===nodoCarga);
  const W2 = 220, H2 = 190, cx = W2/2, cy = H2/2;
  let s = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;height:auto;display:block">'
        + '<rect width="' + W2 + '" height="' + H2 + '" fill="#fff"/>';
  // las piezas que llegan al nudo, para situarlo
  if(n){
    const con = barras.filter(b=>b.a===n.id||b.b===n.id);
    let esc = 1e-9;
    con.forEach(b=>{ const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a));
      if(o) esc = Math.max(esc, Math.hypot(o.x-n.x, o.y-n.y)); });
    const k = 52/Math.max(esc, 1e-9);
    con.forEach(b=>{
      const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a)); if(!o) return;
      const ex = cx + (o.x-n.x)*k, ey = cy - (o.y-n.y)*k;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1)
         + '" stroke="#7c3a06" stroke-width="' + ((typeof esViga === 'function' && esViga(b)) ? 5 : 2.6) + '" stroke-linecap="round" opacity=".55"/>';
    });
  }
  // las fuerzas escritas ahora mismo en la ventana
  const filas = leerFilasCarga().map(c=>compCargaNudo(c)).filter(q=>Math.hypot(q.fx,q.fy) > 1e-12);
  const mx = Math.max(1e-9, ...filas.map(q=>Math.hypot(q.fx,q.fy)));
  filas.forEach(q=>{
    const m = Math.hypot(q.fx, q.fy);
    const ux = q.fx/m, uy = -q.fy/m;                       // en pantalla la y va invertida
    const L = 30 + 34*m/mx;
    const sx = cx - ux*L, sy = cy - uy*L;
    s += '<line x1="' + sx.toFixed(1) + '" y1="' + sy.toFixed(1) + '" x2="' + (cx-ux*9).toFixed(1) + '" y2="' + (cy-uy*9).toFixed(1) + '" stroke="#c0392b" stroke-width="2.2"/>'
       + '<polygon points="0,0 -9,-4 -9,4" fill="#c0392b" transform="translate(' + (cx-ux*8).toFixed(1) + ',' + (cy-uy*8).toFixed(1) + ') rotate(' + (Math.atan2(uy,ux)*180/Math.PI).toFixed(1) + ')"/>'
       + '<text x="' + sx.toFixed(1) + '" y="' + (sy - 6).toFixed(1) + '" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#c0392b" text-anchor="middle">' + dec(m,'f') + '</text>';
  });
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#7c3a06" stroke="#fff" stroke-width="2"/>';
  if(n) s += '<text x="' + (cx+10) + '" y="' + (cy-9) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24">' + n.nombre + '</text>';
  if(!filas.length) s += '<text x="' + cx + '" y="' + (H2-10) + '" font-family="Inter,sans-serif" font-size="9.5" fill="#66727e" text-anchor="middle">Sin fuerzas todav\u00eda.</text>';
  cont.innerHTML = s + '</svg>';
}

function expandirFilaCarga(idx){
  cargaExpandidoIdx = idx;
  renderCargaLista();
}

function agregarFilaCarga(){
  cargaFilasData.push({dir:'y', mag:10, ang:0});
  cargaExpandidoIdx = cargaFilasData.length - 1;   // la nueva fuerza se abre expandida
  renderCargaLista();
}

function quitarFilaCarga(idx){
  cargaFilasData.splice(idx, 1);
  if(!cargaFilasData.length){ cargaFilasData.push({dir:'y', mag:0, ang:0}); }
  cargaExpandidoIdx = Math.min(cargaExpandidoIdx, cargaFilasData.length - 1);
  renderCargaLista();
}

function leerFilasCarga(){
  return cargaFilasData.map(c=>({dir:c.dir||'y', mag:c.mag||0, ang:c.ang||0}));
}
function actualizarPreviewCarga(){
  const filas = leerFilasCarga();
  let sFx = 0, sFy = 0;
  filas.forEach(c=>{ const q = compCargaNudo(c); sFx += q.fx; sFy += q.fy; });
  const el = document.getElementById('cargaResultante');
  if(!el) return;
  el.innerHTML = filas.length > 1
    ? 'Resultante de las ' + filas.length + ' fuerzas: ' + dec(Math.abs(sFx),'f') + ' ' + unitFor
      + (sFx >= 0 ? ' hacia la derecha' : ' hacia la izquierda') + ' y ' + dec(Math.abs(sFy),'f') + ' ' + unitFor
      + (sFy <= 0 ? ' hacia abajo' : ' hacia arriba')
    : 'Una magnitud negativa invierte el sentido: en vertical, un valor negativo empuja hacia arriba.';
}
function quitarCarga(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  registrarCambio();
  n.cargas = []; n.fx = 0; n.fy = 0;
  resultado = null;
  refrescar();
}
function closeCargaModal(){ document.getElementById('cargaModal').classList.remove('show'); nodoCarga = null; }
function applyCarga(){
  const n = nodos.find(z=>z.id===nodoCarga);
  if(n){
    registrarCambio();
    n.cargas = leerFilasCarga().filter(c=>Math.abs(c.mag) > 1e-12);
    recomponerCargaNudo(n);          // la resultante es lo que lee el motor (06-)
    resultado = null;
  }
  closeCargaModal(); refrescar();
}
