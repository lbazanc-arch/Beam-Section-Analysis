// Deja marcado el apoyo que tiene el nudo: con cuatro botones parecidos era
// imposible saber cuál estaba puesto (bloque 4, 2026-09-09).
function marcarApoyoArm(n){
  const cual = {fijo:'apbFijo', movil:'apbMovil'};
  Object.keys(cual).forEach(k=>{
    const b = document.getElementById(cual[k]);
    if(b) b.classList.toggle('active', n.apoyo === k);
  });
  const q = document.getElementById('apbQuitar');
  if(q) q.classList.toggle('active', !n.apoyo);
  pintarAtajosApoyo(n);
}
// Atajos de ángulo de la ventana de apoyo. Se generan aquí, con la marca ya
// puesta, para que no puedan desincronizarse del dato (como segCargaArm).
// Atajos en el ANGULO QUE ESCRIBE EL USUARIO (donde se apoya el nudo):
// -90 suelo, 0 pared derecha, 180 pared izquierda, 90 techo. El valor que
// guarda el modelo es el opuesto (bsaAnguloOpuesto), que es la direccion en
// la que empuja la reaccion.
const ATAJOS_AP_MOVIL = [-90, 0, 180, -45];
const ATAJOS_AP_FIJO  = [-90, 0, 180, 90];
function pintarAtajosApoyo(n){
  const cont = document.getElementById('apDirAtajos');
  if(!cont) return;
  if(!n || !n.apoyo){ cont.innerHTML = ''; return; }
  const esMovil = n.apoyo === 'movil';
  const actual = bsaAnguloOpuesto(esMovil ? anguloReaccionApoyo(n) : anguloDibujoApoyo(n));
  cont.innerHTML = (esMovil ? ATAJOS_AP_MOVIL : ATAJOS_AP_FIJO).map(a=>{
    const puesto = Math.abs(normalizarAnguloArm(a - actual)) < 0.01;
    return '<button type="button" class="tpl-btn' + (puesto ? ' active' : '') + '"'
      + ' onclick="setApAng(' + a + ')">' + a + '°</button>';
  }).join('');
}
function actualizarPrevApoyo(){
  const n = nodos.find(z=>z.id===apoyoNodoId);
  const el = document.getElementById('apPrev');
  const dirBox = document.getElementById('apDirBox');
  if(!el || !n) return;
  marcarApoyoArm(n);
  const esMovil = n.apoyo === 'movil', esFijo = n.apoyo === 'fijo';
  if(dirBox) dirBox.style.display = (esMovil || esFijo) ? '' : 'none';
  if(esMovil || esFijo){
    const tit = document.getElementById('apDirTit');
    const hint = document.getElementById('apDirHint');
    const campo = document.getElementById('apAng');
    if(tit) tit.textContent = esMovil ? 'Dónde se apoya' : 'Giro del dibujo';
    if(hint) hint.textContent = esMovil
      ? '−90° suelo, 0° pared derecha, 180° pared izquierda, 90° techo.'
      : 'Solo presentación: el pasador sujeta las dos direcciones se dibuje como se dibuje.';
    // El campo muestra el angulo del USUARIO (donde se apoya); el modelo
    // guarda el opuesto, que es hacia donde empuja la reaccion.
    if(campo) campo.value = bsaAnguloOpuesto(esMovil ? anguloReaccionApoyo(n) : anguloDibujoApoyo(n));
  }
  const r = nodos.reduce((s2,z)=>s2+gradosApoyo(z), 0);
  el.innerHTML = 'Ahora: <b>' + descApoyoLargo(n)
    + '</b> · Reacciones totales en la armadura: <b>r = ' + r + '</b>';
}
function setApoyo(tipo){
  registrarCambio();
  const n = nodos.find(z=>z.id===apoyoNodoId);
  if(n){
    n.apoyo = tipo;
    if(tipo === 'movil' && n.apAng === undefined) n.apAng = AP_ANG_POR_DEFECTO;
    if(tipo === 'fijo' && n.apAngDib === undefined) n.apAngDib = AP_ANG_POR_DEFECTO;
    invalidarResultados();
  }
  actualizarPrevApoyo();
  refrescar();
}
// Ángulo del apoyo TAL Y COMO LO ESCRIBE EL USUARIO: señala dónde se apoya
// el nudo —−90° en el suelo, 0° contra la pared derecha, 180° contra la
// izquierda, 90° en el techo—, no hacia dónde empuja la reacción. El modelo
// guarda el opuesto (`bsaAnguloOpuesto`), que sí es la dirección de la
// reacción y es lo que consume el motor.
// En un apoyo MÓVIL ese valor ENTRA EN EL CÁLCULO; en un apoyo FIJO gira solo
// el dibujo, porque un pasador restringe las dos direcciones igual, y por eso
// ahí no se invalida el resultado ya calculado.
function setApAng(ang){
  const n = nodos.find(z=>z.id===apoyoNodoId);
  if(!n || !n.apoyo) return;
  const v = parseFloat(ang);
  if(!isFinite(v)) return;
  const a = normalizarAnguloArm(bsaAnguloOpuesto(v));
  registrarCambio();
  if(n.apoyo === 'movil'){ n.apAng = a; invalidarResultados(); }
  else { n.apAngDib = a; }
  actualizarPrevApoyo();
  refrescar();
}
// Cómo se nombra un apoyo por su ángulo. Recibe el ángulo INTERNO (dirección
// de la reacción) y lo cuenta como lo ve el alumno: dónde se apoya el nudo.
// Cualquier otra posición se dice con el ángulo que él escribió.
function descDirApoyo(a){
  const v = normalizarAnguloArm(a);
  if(Math.abs(v - 90) < 0.01) return 'sobre el suelo';
  if(Math.abs(v + 90) < 0.01) return 'bajo el techo';
  if(Math.abs(v) < 0.01) return 'contra la pared izquierda';
  if(Math.abs(Math.abs(v) - 180) < 0.01) return 'contra la pared derecha';
  return 'apoyado a ' + dec(bsaAnguloOpuesto(v),'f') + '°';
}
// Texto largo (modal, caja de información del nudo).
function descApoyoLargo(n){
  if(!n.apoyo) return 'sin apoyo';
  if(n.apoyo === 'fijo') return 'apoyo fijo (2 reacciones)';
  return 'apoyo móvil (1 reacción) ' + descDirApoyo(anguloReaccionApoyo(n));
}
// Texto corto (lista de nudos).
function descApoyoCorto(n){
  if(!n.apoyo) return '';
  if(n.apoyo === 'fijo') return 'apoyo fijo';
  const d = descDirApoyo(anguloReaccionApoyo(n));
  return 'apoyo móvil (' + (d === 'sobre el suelo' ? 'Y' : (d === 'contra la pared izquierda' ? 'X' : d)) + ')';
}

// (editarSeleccion() se retiró: quedó sin ninguna llamada tras introducir
// intentarAbrirEdicion() para el doble clic/doble toque)

// ── Tecla Esc global ──
// Cierra la ventana emergente activa (si hay alguna) sin tocar el modelo;
// si no hay ninguna abierta, corta la cadena de Barra, luego suelta la
// herramienta Carga (vuelve a pan) y por último cancela la selección actual. No sustituye ni
// elimina el botón "Cancelar" de cada modal: es un atajo adicional.
function manejarEsc(){
  // Antes que nada, la ventana del informe PDF: se superpone a todo lo demás.
  const pl = document.getElementById('panelLatexPDF');
  if(pl && pl.style.display !== 'none' && pl.style.display !== ''){ cerrarPanelLatex(); return; }
  const modales = ['edNodoModal','edBarraModal','apoyoModal','repModal','cargaModal',
                    'transModal','unitsModal','decModal','histModal','ejModal'];
  const abierto = modales.find(id=>{
    const m = document.getElementById(id);
    return m && m.classList.contains('show');
  });
  if(abierto){
    const m = document.getElementById(abierto);
    m.classList.remove('show');
    if(abierto==='edNodoModal') edNodoId = null;
    else if(abierto==='edBarraModal') edBarraId = null;
    else if(abierto==='apoyoModal') apoyoNodoId = null;
    else if(abierto==='cargaModal') edCargaArm = null;
    return;
  }
  // Esc corta la cadena de construcción antes que nada: es lo que se espera
  // mientras se está dibujando nudo a nudo (03-interaccion.js).
  if(selNodo !== null){ selNodo = null; refrescar(); return; }
  // Con la ventana ya cerrada, Esc suelta la herramienta Carga (que se queda
  // activa para poner varias seguidas) y vuelve a desplazar el panel.
  if(tool === 'carga'){ setTool('pan'); return; }
  if(selNodos.length || selBarras.length || selNodoInfo!==null || selBarra!==null){
    selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null;
    gesto = null;
    refrescar();
  }
}

// Nudos y barras que caen dentro de un recuadro de pantalla, o que el
// recuadro simplemente toca (una barra "toca" si cruza cualquiera de sus
// cuatro bordes, aunque sus dos nudos queden fuera). La usan tanto la
// selección múltiple como el borrado tipo CAD.
function elementosEnRecuadro(sx0, sy0, sx1, sy1){
  const x1 = Math.min(sx0, sx1), x2 = Math.max(sx0, sx1);
  const y1 = Math.min(sy0, sy1), y2 = Math.max(sy0, sy1);
  const nodosIds = [], barrasIds = [];
  nodos.forEach(nn=>{
    const [px,py] = aPantalla(nn.x, nn.y);
    if(px>=x1 && px<=x2 && py>=y1 && py<=y2) nodosIds.push(nn.id);
  });
  barras.forEach(bb=>{
    const na = nodos.find(z=>z.id===bb.a), nb = nodos.find(z=>z.id===bb.b);
    if(!na || !nb) return;
    const [ax,ay] = aPantalla(na.x,na.y), [bx,by] = aPantalla(nb.x,nb.y);
    const dentro = p => p[0]>=x1 && p[0]<=x2 && p[1]>=y1 && p[1]<=y2;
    const cruza = segmentosCruzan(ax,ay,bx,by, x1,y1,x2,y1) ||
                  segmentosCruzan(ax,ay,bx,by, x2,y1,x2,y2) ||
                  segmentosCruzan(ax,ay,bx,by, x2,y2,x1,y2) ||
                  segmentosCruzan(ax,ay,bx,by, x1,y2,x1,y1);
    if(dentro([ax,ay]) || dentro([bx,by]) || cruza) barrasIds.push(bb.id);
  });
  return {nodosIds, barrasIds};
}

// Botón "Eliminar": si ya hay una selección armada con Mover/editar, la borra
// de inmediato (comportamiento previo). Si no, activa la herramienta de
// borrado interactivo: tocar borra un elemento, arrastrar un recuadro borra
// todo lo que abarque al soltar, tipo CAD.
function activarEliminar(){
  if(selNodos.length || selBarras.length){ eliminarSeleccion(); return; }
  setTool('borrar');
}

function eliminarSeleccion(){
  if(!selNodos.length && !selBarras.length){
    aviso('Primero elige la herramienta Seleccionar y marca los elementos que quieras borrar.');
    return;
  }
  registrarCambio();
  // al borrar un nudo se van también las barras que llegan a él
  barras = barras.filter(b => selBarras.indexOf(b.id) < 0
                           && selNodos.indexOf(b.a) < 0 && selNodos.indexOf(b.b) < 0);
  nodos = nodos.filter(n => selNodos.indexOf(n.id) < 0);
  selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null;
  reNombrar(); invalidarResultados(); refrescar();
}

// ═══════════════════════════════════════════════════════════
//  TRANSFORMAR RESPECTO A UN NUDO (mover y girar)
//  El nudo de referencia queda fijo: al mover, es el origen del
//  desplazamiento; al girar, es el centro de rotación.
// ═══════════════════════════════════════════════════════════
let transModo = 'mover';

function abrirTransformar(){
  if(!selNodos.length){
    aviso('Marca al menos un nudo con la herramienta "Mover / editar" para transformarlo.');
    return;
  }
  // Mismo contrato que los demás temas: la referencia puede ser el origen, un
  // nudo de la selección o una coordenada escrita a mano.
  const sel = document.getElementById('transRef');
  const opciones = ['<option value="origen">Origen (0 ; 0)</option>'];
  selNodos.forEach(id=>{
    const n = nodos.find(z=>z.id===id);
    if(n) opciones.push('<option value="nodo:'+n.id+'">Nudo '+n.nombre
      + '  ('+dec(n.x,'len')+' ; '+dec(n.y,'len')+')</option>');
  });
  opciones.push('<option value="libre">Coordenada a elegir…</option>');
  sel.innerHTML = opciones.join('');
  document.getElementById('transSub').textContent =
    'Se transformarán ' + selNodos.length + ' nudo(s). Al girar, la referencia '
    + 'queda fija y es el centro de rotación; al mover, toda la selección se desplaza por igual.';
  cambiarRefTrans();
  setTransModo('mover');
  document.getElementById('transModal').classList.add('show');
}
function closeTransformar(){ document.getElementById('transModal').classList.remove('show'); }

function cambiarRefTrans(){
  const v = document.getElementById('transRef').value;
  document.getElementById('transCampoRef').style.display = (v==='libre') ? 'block' : 'none';
  actualizarPrevTrans();
}

function refTransformar(){
  const v = document.getElementById('transRef').value;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  if(v === 'origen') return {x:0, y:0, nombre:'el origen'};
  if(v === 'libre')  return {x:num('transRx'), y:num('transRy'), nombre:'la coordenada indicada'};
  const id = parseInt(String(v).split(':')[1]);
  const n = nodos.find(z=>z.id===id);
  if(!n) return null;
  return {x:n.x, y:n.y, nombre:'el nudo '+n.nombre};
}

function setTransModo(m){
  transModo = m;
  document.getElementById('transCampoMover').style.display = (m==='mover') ? 'block' : 'none';
  document.getElementById('transCampoGirar').style.display = (m==='girar') ? 'block' : 'none';
  const a = document.getElementById('transTabMover'), b = document.getElementById('transTabGirar');
  if(a) a.classList.toggle('active', m==='mover');
  if(b) b.classList.toggle('active', m==='girar');
  actualizarPrevTrans();
}

// Calcula las posiciones resultantes sin aplicarlas todavía.
function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    selNodos.forEach(id=>{
      const n = nodos.find(z=>z.id===id); if(!n) return;
      // En un desplazamiento se mueve TODA la selección por igual: la
      // referencia solo queda fija cuando se gira.
      destinos.push({id, x:n.x+dx, y:n.y+dy});
    });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  selNodos.forEach(id=>{
    const n = nodos.find(z=>z.id===id); if(!n) return;
    const ux = n.x-ref.x, uy = n.y-ref.y;      // rotación 2D alrededor de la referencia
    destinos.push({id, x: ref.x+ux*cs-uy*sn, y: ref.y+ux*sn+uy*cs});
  });
  return {ref, destinos, ang:grados};
}

function actualizarPrevTrans(){
  const p = document.getElementById('transPrev');
  if(!p) return;
  const t = calcularTransformacion();
  if(!t){ p.textContent = 'Elige una referencia válida.'; return; }
  if(transModo === 'mover'){
    p.textContent = 'Los ' + t.destinos.length + ' nudo(s) se desplazan ('
      + dec(t.dx,'len') + ' ; ' + dec(t.dy,'len') + ') ' + unitLen
      + ', midiendo desde ' + t.ref.nombre + '.';
  } else {
    p.textContent = 'Los ' + t.destinos.length + ' nudo(s) giran ' + t.ang
      + '° alrededor de ' + t.ref.nombre + ' (' + dec(t.ref.x,'len') + ' ; '
      + dec(t.ref.y,'len') + ') ' + unitLen + '.';
  }
}

function applyTransformar(){
  const t = calcularTransformacion();
  if(!t){ aviso('Elige una referencia válida.', 'error'); return; }
  if(transModo === 'mover' && t.dx === 0 && t.dy === 0){
    aviso('Indica un desplazamiento en x o en y.'); return;
  }
  if(transModo === 'girar' && t.ang === 0){
    aviso('Indica un ángulo de giro distinto de cero.'); return;
  }
  registrarCambio();   // un solo paso de deshacer para todo el lote
  // Ni el giro ni el desplazamiento se enganchan a la rejilla: redondear cada
  // nudo alteraría las longitudes de las barras y deformaría la armadura (un
  // giro de 37° llegó a cambiar una barra de 6 a 6.10). Mismo criterio que
  // los demás temas.
  t.destinos.forEach(d=>{ const n = nodos.find(z=>z.id===d.id); if(n){ n.x = d.x; n.y = d.y; } });
  // Al GIRAR, el apoyo gira con la armadura. Si no, un rodillo seguiria
  // reaccionando en la direccion de antes —resultado incorrecto, no solo feo—
  // y el simbolo del pasador quedaria torcido respecto a lo que sostiene.
  if(transModo === 'girar'){
    t.destinos.forEach(d=>{
      const n = nodos.find(z=>z.id===d.id);
      if(!n || !n.apoyo) return;
      if(n.apoyo === 'movil') n.apAng    = normalizarAnguloArm(anguloReaccionApoyo(n) + t.ang);
      else                    n.apAngDib = normalizarAnguloArm(anguloDibujoApoyo(n)  + t.ang);
    });
    // Las cargas de los nudos girados giran con ellos, igual que los apoyos:
    // una vertical en una armadura girada 90° pasa a horizontal. Sin esto la
    // armadura girada cargaría de otra manera y los esfuerzos cambiarían.
    t.destinos.forEach(d=>{
      const n = nodos.find(z=>z.id===d.id);
      if(n && (n.cargas || []).length) girarCargasNudo(n, t.ang);
    });
  }
  transformarCorte(t);
  invalidarResultados();
  closeTransformar();
  refrescar();
}

// Gira la dirección de cada carga del nudo `grados` (antihorario) sin tocar
// su magnitud, ni siquiera el signo: una vertical girada 180° no pasa a ser
// una vertical negativa, sino una inclinada con su ángulo INTERNO (hacia donde
// apunta, CLAUDE.md §7). Solo vuelve a 'y' o 'x' si queda justo en el sentido
// positivo de esa dirección (abajo o derecha). Luego recompone n.fx/n.fy.
function girarCargasNudo(n, grados){
  const a = grados*Math.PI/180, cs = Math.cos(a), sn = Math.sin(a);
  const EPS = 1e-9;
  n.cargas = (n.cargas || []).map(c=>{
    const v = vectorCarga(c.dir || 'y', c.ang);
    const vx = v.x*cs - v.y*sn, vy = v.x*sn + v.y*cs;
    if(Math.abs(vx) < EPS && vy < 0) return {dir:'y', mag:c.mag, ang:0};
    if(Math.abs(vy) < EPS && vx > 0) return {dir:'x', mag:c.mag, ang:0};
    return {dir:'ang', mag:c.mag, ang:normalizarAnguloArm(Math.atan2(vy, vx)*180/Math.PI)};
  });
  recomponerCargaNudo(n);
}

// La línea de corte manual del método de secciones vive en coordenadas del
// mundo: si se mueven TODOS los nudos, el corte los acompaña con la misma
// transformación; si solo una parte, deja de cortar lo que cortaba y se borra
// (el alumno lo vuelve a trazar). Es la regla de cualquier gesto que mueva
// nudos —la ventana Transformar y el arrastre de Mover / editar—, para que los
// dos dejen el corte igual. `ids`: los nudos movidos; `mueve(x, y)` devuelve
// [x', y'] con la transformación aplicada a esos nudos.
function ajustarCorteArm(ids, mueve){
  if(!corte) return;
  const todos = nodos.length > 0 && nodos.every(n=>ids.indexOf(n.id) >= 0);
  if(!todos){ corte = null; corteDrag = null; return; }
  const p1 = mueve(corte.x1, corte.y1), p2 = mueve(corte.x2, corte.y2);
  corte = {x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1]};
}

function transformarCorte(t){
  ajustarCorteArm(t.destinos.map(d=>d.id), (x, y)=>{
    if(transModo === 'mover') return [x + t.dx, y + t.dy];
    const g = t.ang*Math.PI/180, cs = Math.cos(g), sn = Math.sin(g);
    const ux = x - t.ref.x, uy = y - t.ref.y;
    return [t.ref.x + ux*cs - uy*sn, t.ref.y + ux*sn + uy*cs];
  });
}

// ── Replicar ──
// Qué se copia: los nudos marcados más los extremos de las barras marcadas, y
// todas las barras con sus dos extremos en ese conjunto (como tramosDeGrupo de
// fuerzas internas). Vale marcar solo nudos tocándolos, solo barras o las dos
// cosas. Solo cuenta lo que existe: un borrado puede dejar ids viejos.
function grupoReplicar(){
  const idsN = [];
  const pon = id => { if(idsN.indexOf(id) < 0 && nodos.some(n=>n.id===id)) idsN.push(id); };
  selNodos.forEach(pon);
  barras.forEach(b=>{ if(selBarras.indexOf(b.id) >= 0){ pon(b.a); pon(b.b); } });
  const idsB = barras.filter(b=>idsN.indexOf(b.a) >= 0 && idsN.indexOf(b.b) >= 0).map(b=>b.id);
  return {nodos:idsN, barras:idsB};
}
// Lee la ventana sin corregir nada en silencio: un campo vacío no es 0 y las
// repeticiones tienen que ser un entero de 1 a 50. `error` dice qué falla.
function leerReplicar(){
  const num = id => {
    const e = document.getElementById(id);
    const s = e ? String(e.value).trim() : '';
    return s === '' ? NaN : Number(s);
  };
  const dx = num('repDx'), dy = num('repDy'), n = num('repN');
  let error = null;
  if(!isFinite(dx) || !isFinite(dy)) error = 'Escribe las dos distancias; pon 0 en la que no se desplace.';
  else if(!Number.isInteger(n) || n < 1 || n > 50) error = 'Las repeticiones deben ser un número entero entre 1 y 50.';
  else if(dx === 0 && dy === 0) error = 'Indica un desplazamiento en x o en y.';
  return {dx, dy, n, error};
}
// Tras un cambio que anula la solución, el panel no puede seguir enseñando la
// anterior: se vacía como en limpiarTodo (#corteBox va dentro del panel).
// Toda acción de la interfaz que cambia el modelo la llama, en vez de poner solo
// `resultado = null`: un panel visible con el resultado anulado enseñaba una
// solución que ya no era la del dibujo. No la llaman resolver() (07-), que pinta
// el panel, ni cargarEjemplo (05-), que resuelve al terminar.
function invalidarResultados(){
  resultado = null;
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'none';
  const rp = document.getElementById('resultsPanel'); if(rp){ rp.innerHTML = ''; rp.style.display = 'none'; }
  const h = document.getElementById('noResultsHint'); if(h) h.style.display = '';
}

function abrirReplicar(){
  if(!grupoReplicar().nodos.length){
    aviso('Marca con "Mover / editar" lo que quieras replicar.');
    return;
  }
  // La ayuda de la ventana es fija y de una línea; lo que depende de la
  // selección (cuántos nudos, barras y copias) lo cuenta la vista previa.
  actualizarPrevRep();
  const m = document.getElementById('repModal');
  if(m) m.classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const el = document.getElementById('repPrev');
  if(!el) return;
  const g = grupoReplicar(), r = leerReplicar();
  if(!g.nodos.length){ el.textContent = 'No hay nada marcado para replicar.'; return; }
  if(r.error){ el.textContent = r.error; return; }
  const base = nodos.find(n=>n.id===g.nodos[0]);
  const p = [];
  for(let i=1;i<=Math.min(r.n,3);i++)
    p.push('(' + dec(base.x+r.dx*i,'len') + ' ; ' + dec(base.y+r.dy*i,'len') + ')');
  const nN = g.nodos.length, nB = g.barras.length;
  el.innerHTML = 'Saldrán <b>' + r.n + (r.n === 1 ? ' copia' : ' copias') + '</b> de '
    + nN + (nN === 1 ? ' nudo' : ' nudos') + ' y ' + nB + (nB === 1 ? ' barra' : ' barras')
    + ' · nudo ' + base.nombre + ': (' + dec(base.x,'len') + ' ; ' + dec(base.y,'len') + ') → '
    + p.join(', ') + (r.n>3 ? ' …' : '');
}
function applyReplicar(){
  const g = grupoReplicar();
  if(!g.nodos.length){ aviso('Marca con "Mover / editar" lo que quieras replicar.'); return; }
  const r = leerReplicar();
  if(r.error){ aviso(r.error, 'error'); return; }
  const dx = r.dx, dy = r.dy, nrep = r.n;
  // Plantilla tomada ANTES de copiar: si un nudo marcado recibe las cargas de
  // una copia que cae sobre él, las copias siguientes no deben arrastrarlas.
  const plantilla = g.nodos.map(id=>{
    const o = nodos.find(z=>z.id===id);
    return {id, x:o.x, y:o.y, apoyo:o.apoyo, apAng:o.apAng, apAngDib:o.apAngDib,
            cargas:(o.cargas||[]).map(c=>Object.assign({}, c))};
  });
  const pares = barras.filter(b=>g.barras.indexOf(b.id) >= 0).map(b=>[b.a, b.b]);
  // Tolerancia para reconocer un nudo que ya está: relativa al tamaño del
  // modelo con las copias, y nunca mayor que una milésima del paso, para que una
  // copia no se confunda con su propio original.
  const xs = nodos.map(z=>z.x).concat(plantilla.map(o=>o.x + dx*nrep));
  const ys = nodos.map(z=>z.y).concat(plantilla.map(o=>o.y + dy*nrep));
  const tam = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const tol = Math.min(1e-6*tam, 1e-3*Math.hypot(dx, dy));
  registrarCambio();   // un solo paso de deshacer para toda la réplica
  const nuevosN = [], nuevasB = [];
  const marca = (lista, id) => { if(lista.indexOf(id) < 0) lista.push(id); };
  let unidos = 0;
  for(let i=1;i<=nrep;i++){
    const mapa = {};
    plantilla.forEach(o=>{
      const x = o.x + dx*i, y = o.y + dy*i;
      const cargas = o.cargas.map(c=>Object.assign({}, c));
      // La copia que cae sobre un nudo que ya está —del modelo o de una copia
      // anterior— lo reutiliza: el nudo conserva su apoyo y sus ángulos, y las
      // cargas de la copia se suman a las suyas.
      const hay = nodos.find(z=>Math.abs(z.x - x) <= tol && Math.abs(z.y - y) <= tol);
      if(hay){
        hay.cargas = (hay.cargas || []).concat(cargas);
        recomponerCargaNudo(hay);
        mapa[o.id] = hay.id; marca(nuevosN, hay.id); unidos++;
        return;
      }
      const nn = {id:++nodoSeq, x, y, apoyo:o.apoyo, apAng:o.apAng, apAngDib:o.apAngDib,
                  fx:0, fy:0, cargas, nombre:''};
      recomponerCargaNudo(nn);
      nodos.push(nn); mapa[o.id] = nn.id; marca(nuevosN, nn.id);
    });
    pares.forEach(par=>{
      const na = mapa[par[0]], nb = mapa[par[1]];
      if(na === undefined || nb === undefined || na === nb) return;
      // addBarra descarta el par repetido; la barra que ya unía esos dos
      // nudos pasa a ser la de la copia (y queda marcada con ella).
      const m = addBarra(na, nb, true)
             || barras.find(z=>(z.a===na && z.b===nb) || (z.a===nb && z.b===na));
      if(m) marca(nuevasB, m.id);
    });
  }
  reNombrar(); invalidarResultados();
  // Las copias quedan seleccionadas y la vista no se mueve, como en los demás
  // temas: así se puede seguir replicando o transformando el resultado.
  selNodos = nuevosN; selBarras = nuevasB; selBarra = null; selNodoInfo = null;
  closeReplicar(); refrescar();
  if(unidos === 1) aviso('Se unió 1 nudo que caía sobre un nudo existente.');
  else if(unidos > 1) aviso('Se unieron ' + unidos + ' nudos que caían sobre nudos existentes.');
}

// ── Pestañas Nudos / Barras / Cargas ──
function setSubTab(t){
  subTab = t;
  ['nodos','barras','cargas'].forEach(k=>{
    const tab = document.getElementById('st'+k.charAt(0).toUpperCase()+k.slice(1));
    if(tab) tab.classList.toggle('active', t===k);
    const lista = document.getElementById('lista'+k.charAt(0).toUpperCase()+k.slice(1));
    if(lista) lista.style.display = (t===k) ? '' : 'none';
  });
}

// ── Croquis de referencia de la plantilla ──
function dibujarRefPlantilla(){
  const svg = document.getElementById('tplRef');
  if(!svg) return;
  const L = parseFloat(document.getElementById('tplL').value) || 12;
  const Hh = parseFloat(document.getElementById('tplH').value) || 3;
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('tplN').value) || 4));
  const x0 = 26, x1 = 234, yB = 96, yT = 46;
  const p = (x1-x0)/n;
  let s = '<rect x="0" y="0" width="260" height="132" fill="#fff"/>';
  // cuerda inferior y superior según el tipo
  s += '<line x1="'+x0+'" y1="'+yB+'" x2="'+x1+'" y2="'+yB+'" stroke="#7c5cd6" stroke-width="2.2"/>';
  if(tipoTpl === 'warren'){
    for(let i=0;i<n;i++){
      const xa = x0+i*p, xm = xa+p/2, xb = xa+p;
      s += '<line x1="'+xa+'" y1="'+yB+'" x2="'+xm+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
      s += '<line x1="'+xm+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#c98a3a" stroke-width="1.6"/>';
      if(i<n-1) s += '<line x1="'+xm+'" y1="'+yT+'" x2="'+(xm+p)+'" y2="'+yT+'" stroke="#7c5cd6" stroke-width="2.2"/>';
    }
  } else {
    s += '<line x1="'+(x0+p)+'" y1="'+yT+'" x2="'+(x1-p)+'" y2="'+yT+'" stroke="#7c5cd6" stroke-width="2.2"/>';
    s += '<line x1="'+x0+'" y1="'+yB+'" x2="'+(x0+p)+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
    s += '<line x1="'+(x1-p)+'" y1="'+yT+'" x2="'+x1+'" y2="'+yB+'" stroke="#c98a3a" stroke-width="1.6"/>';
    for(let i=1;i<n;i++){
      const x = x0+i*p;
      s += '<line x1="'+x+'" y1="'+yB+'" x2="'+x+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
    }
    for(let i=1;i<n-1;i++){
      const xa = x0+i*p, xb = xa+p;
      const izq = (i+1) <= n/2;
      if(tipoTpl === 'howe') s += izq ? '<line x1="'+xa+'" y1="'+yB+'" x2="'+xb+'" y2="'+yT+'" stroke="#dcbb92" stroke-width="1.3"/>'
                                      : '<line x1="'+xa+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#dcbb92" stroke-width="1.3"/>';
      else                   s += izq ? '<line x1="'+xa+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#dcbb92" stroke-width="1.3"/>'
                                      : '<line x1="'+xa+'" y1="'+yB+'" x2="'+xb+'" y2="'+yT+'" stroke="#dcbb92" stroke-width="1.3"/>';
    }
  }
  // cotas
  s += '<line x1="'+x0+'" y1="116" x2="'+x1+'" y2="116" stroke="#68727f" stroke-width="1"/>'
     + '<path d="M'+x0+' 116 l6 -3 v6 z M'+x1+' 116 l-6 -3 v6 z" fill="#68727f"/>'
     + '<text x="130" y="128" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#1b1f24" text-anchor="middle">Luz total = '+L+'</text>';
  s += '<line x1="14" y1="'+yT+'" x2="14" y2="'+yB+'" stroke="#68727f" stroke-width="1"/>'
     + '<path d="M14 '+yT+' l-3 6 h6 z M14 '+yB+' l-3 -6 h6 z" fill="#68727f"/>'
     + '<text x="12" y="'+((yT+yB)/2)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#1b1f24" '
     + 'text-anchor="middle" transform="rotate(-90 12 '+((yT+yB)/2)+')">Altura = '+Hh+'</text>';
  // un panel resaltado
  s += '<rect x="'+x0+'" y="'+yT+'" width="'+p+'" height="'+(yB-yT)+'" fill="rgba(124,92,214,.10)"/>'
     + '<text x="'+(x0+p/2)+'" y="'+(yT-6)+'" font-family="Inter,sans-serif" font-size="8.5" font-weight="700" fill="#7c5cd6" text-anchor="middle">1 panel</text>'
     + '<text x="'+(x0+p*2.6)+'" y="'+(yT-6)+'" font-family="Inter,sans-serif" font-size="8.5" fill="#68727f" text-anchor="middle">'+n+' paneles en total</text>';
  s += '<text x="'+x0+'" y="108" font-family="Inter,sans-serif" font-size="8" fill="#68727f" text-anchor="middle">apoyo</text>'
     + '<text x="'+x1+'" y="108" font-family="Inter,sans-serif" font-size="8" fill="#68727f" text-anchor="middle">apoyo</text>';
  svg.innerHTML = s;
}

function pintarLista(){
  const bn = document.getElementById('listaNodos');
  const bb = document.getElementById('listaBarras');
  const bc = document.getElementById('listaCargas');
  const cn = document.getElementById('cntNodos'), cb = document.getElementById('cntBarras');
  const cc = document.getElementById('cntCargas');
  if(cn) cn.textContent = nodos.length;
  if(cb) cb.textContent = barras.length;
  const cargados = nodos.filter(n=>(n.cargas || []).length);
  if(cc) cc.textContent = cargados.reduce((a,n)=>a+n.cargas.length, 0);
  if(bc){
    if(!cargados.length){ bc.innerHTML = '<div class="list-empty">Sin cargas todav\u00eda.</div>'; }
    else {
      let h = '';
      // Una fila por CARGA, no por pieza: el lápiz abre esa carga y la cruz la
      // quita, como en fuerzas internas.
      cargados.forEach(n=>{
        (n.cargas || []).forEach((c, i)=>{
          const marc = selNodos.indexOf(n.id) >= 0 ? ' sel' : '';
          h += '<div class="item-row'+marc+'"><div class="dot" style="background:#c0392b"></div>'
             + '<div class="nm">Nudo ' + n.nombre + ' \u00b7 ' + descCargaNudo(c) + '</div>'
             + '<button class="x" title="Editar" onclick="editarCargaArm('+n.id+','+i+')">\u270e</button>'
             + '<button class="x" title="Quitar" onclick="borrarCargaArm('+n.id+','+i+')">\u00d7</button></div>';
        });
      });
      bc.innerHTML = h;
    }
  }
  if(bn){
    if(!nodos.length){ bn.innerHTML = '<div class="list-empty">Sin nudos todav\u00eda.</div>'; }
    else {
      let h = '';
      nodos.forEach(n=>{
        const extra = [];
        if(n.apoyo) extra.push(descApoyoCorto(n));
        if(!esCero(n.fx) || !esCero(n.fy)) extra.push('carga');
        const marc = selNodos.indexOf(n.id) >= 0 ? ' sel' : '';
        h += '<div class="item-row'+marc+'"><div class="dot" style="background:#563aa8"></div>'
           + '<div class="nm">' + n.nombre + ' (' + dec(n.x,'len') + ' ; ' + dec(n.y,'len') + ')'
           + (extra.length ? ' \u00b7 '+extra.join(', ') : '') + '</div>'
           + '<button class="x" title="Editar" onclick="abrirEdNodo('+n.id+')">\u270e</button>'
           + '<button class="x" onclick="borrarNodo('+n.id+')">\u00d7</button></div>';
      });
      bn.innerHTML = h;
    }
  }
  if(bb){
    if(!barras.length){ bb.innerHTML = '<div class="list-empty">Sin barras todav\u00eda.</div>'; }
    else {
      let h = '';
      barras.forEach(b=>{
        const na = nodos.find(n=>n.id===b.a), nb2 = nodos.find(n=>n.id===b.b);
        if(!na||!nb2) return;
        const L = Math.hypot(nb2.x-na.x, nb2.y-na.y);
        const marc = selBarras.indexOf(b.id) >= 0 ? ' sel' : '';
        let col = '#7c5cd6';
        if(resultado){
          const f = resultado.fuerzas[b.id];
          col = esCero(f) ? '#9aa3ad' : (f>0 ? '#1d4ed8' : '#c0392b');
        }
        h += '<div class="item-row'+marc+'"><div class="dot" style="background:'+col+'"></div>'
           + '<div class="nm">' + na.nombre + nb2.nombre + ' \u00b7 L = ' + dec(L,'len') + ' ' + unitLen
           + '</div>'
           + '<button class="x" title="Editar" onclick="abrirEdBarra('+b.id+')">\u270e</button>'
           + '<button class="x" onclick="borrarBarra('+b.id+')">\u00d7</button></div>';
      });
      bb.innerHTML = h;
    }
  }
  infoSeleccion();
}
