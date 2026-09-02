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
  nodos.forEach(n=>{ n.x *= kL; n.y *= kL; n.fx *= kF; n.fy *= kF; });
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
             : ((!esCero(n.fx||0) || !esCero(n.fy||0)) ? [{fx:n.fx||0, fy:n.fy||0}] : [{fx:0, fy:-10}]);
  cargaFilasData = base.map(c=>({fx:c.fx||0, fy:c.fy||0}));
  cargaExpandidoIdx = 0;
  renderCargaLista();
  document.getElementById('cargaModal').classList.add('show');
}

function renderCargaLista(){
  const lista = document.getElementById('cargaLista');
  lista.innerHTML = cargaFilasData.map((c, idx)=>
    idx === cargaExpandidoIdx ? htmlFilaExpandida(c, idx) : htmlFilaColapsada(c, idx)
  ).join('');
  actualizarPreviewCarga();
}

function htmlFilaExpandida(c, idx){
  return '<div class="carga-card">'
    + '<div class="carga-card-head">'
    +   '<span class="carga-card-title">Fuerza ' + (idx+1) + '</span>'
    +   '<button class="carga-del" title="Quitar esta fuerza" onclick="quitarFilaCarga(' + idx + ')">\u00d7</button>'
    + '</div>'
    + '<div class="carga-eje-row">'
    +   '<div class="carga-campo">'
    +     '<label class="carga-campo-lbl">F<sub>x</sub></label>'
    +     '<div class="carga-input-wrap">'
    +       '<input type="number" step="any" class="cf-fx" value="'+c.fx+'" '
    +         'oninput="actualizarCampoCarga(' + idx + ',\'fx\',this.value)">'
    +       '<span class="carga-campo-unit">' + unitFor + '</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="carga-campo">'
    +     '<label class="carga-campo-lbl">F<sub>y</sub></label>'
    +     '<div class="carga-input-wrap">'
    +       '<input type="number" step="any" class="cf-fy" value="'+c.fy+'" '
    +         'oninput="actualizarCampoCarga(' + idx + ',\'fy\',this.value)">'
    +       '<span class="carga-campo-unit">' + unitFor + '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

function htmlFilaColapsada(c, idx){
  return '<div class="carga-mini" onclick="expandirFilaCarga(' + idx + ')">'
    +   '<span class="carga-mini-nom">Fuerza ' + (idx+1) + '</span>'
    +   '<span class="carga-mini-val">F<sub>x</sub> = ' + dec(c.fx,'f') + '   F<sub>y</sub> = ' + dec(c.fy,'f') + ' ' + unitFor + '</span>'
    +   '<button class="carga-del" title="Quitar esta fuerza" '
    +     'onclick="event.stopPropagation(); quitarFilaCarga(' + idx + ')">\u00d7</button>'
    + '</div>';
}

// Actualiza el dato en vivo mientras se escribe, sin esperar a colapsar la fila.
function actualizarCampoCarga(idx, eje, valor){
  if(!cargaFilasData[idx]) return;
  cargaFilasData[idx][eje] = parseFloat(valor) || 0;
  actualizarPreviewCarga();
}

function expandirFilaCarga(idx){
  cargaExpandidoIdx = idx;
  renderCargaLista();
}

function agregarFilaCarga(){
  cargaFilasData.push({fx:0, fy:0});
  cargaExpandidoIdx = cargaFilasData.length - 1;   // la nueva fuerza se abre expandida
  renderCargaLista();
}

function quitarFilaCarga(idx){
  cargaFilasData.splice(idx, 1);
  if(!cargaFilasData.length){ cargaFilasData.push({fx:0, fy:0}); }
  cargaExpandidoIdx = Math.min(cargaExpandidoIdx, cargaFilasData.length - 1);
  renderCargaLista();
}

function leerFilasCarga(){
  return cargaFilasData.map(c=>({fx:c.fx||0, fy:c.fy||0}));
}
function actualizarPreviewCarga(){
  const filas = leerFilasCarga();
  const sFx = filas.reduce((s,c)=>s+c.fx, 0), sFy = filas.reduce((s,c)=>s+c.fy, 0);
  const el = document.getElementById('cargaResultante');
  if(!el) return;
  el.innerHTML = filas.length > 1
    ? 'Resultante de las ' + filas.length + ' fuerzas: F<sub>x</sub> = ' + dec(sFx,'f')
      + ', F<sub>y</sub> = ' + dec(sFy,'f') + ' ' + unitFor + ' (|R| = ' + dec(Math.hypot(sFx,sFy),'f') + ' ' + unitFor + ')'
    : 'Una carga hacia abajo se escribe con F<sub>y</sub> negativa.';
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
    const filas = leerFilasCarga();
    n.cargas = filas;
    n.fx = filas.reduce((s,c)=>s+c.fx, 0);
    n.fy = filas.reduce((s,c)=>s+c.fy, 0);
    resultado = null;
  }
  closeCargaModal(); refrescar();
}
