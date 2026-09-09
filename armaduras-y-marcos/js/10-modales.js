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
  nodos.forEach(n=>{ n.x *= kL; n.y *= kL; n.fx *= kF; n.fy *= kF; (n.cargas||[]).forEach(c=>{ c.mag = (c.mag||0)*(c.tipo === 'M' ? kF*kL : kF); }); });
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
