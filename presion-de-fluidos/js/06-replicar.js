// ═══════════════════════════════════════════════════════════
//  REPLICAR: copiar la selección desplazada N veces
// ═══════════════════════════════════════════════════════════
// La selección solo con ids que existen: tras borrar o abrir otro ejercicio
// podían quedar ids fantasma, y Replicar registraba un paso de deshacer vacío.
function depurarSeleccionPF(){
  selN = selN.filter(id=>nodos.some(n=>n.id===id));
  selT = selT.filter(id=>tramos.some(t=>t.id===id));
  if(infoNodo !== null && !nodos.some(n=>n.id===infoNodo)) infoNodo = null;
  if(infoTramo !== null && !tramos.some(t=>t.id===infoTramo)) infoTramo = null;
}
// Vacía la selección entera: limpiar, cargar un ejemplo y abrir un ejercicio.
function vaciarSeleccionPF(){ selN = []; selT = []; infoNodo = null; infoTramo = null; selNodo = null; }
// El panel de resultados no puede seguir enseñando la solución de un modelo que
// ya cambió: se oculta como al limpiar.
function invalidarResultados(){
  R = null;
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'none';
  const rp = document.getElementById('resultsPanel'); if(rp){ rp.innerHTML = ''; rp.style.display = 'none'; }
  const hh = document.getElementById('noResultsHint'); if(hh) hh.style.display = '';
}
// Lee la ventana con Number(): parseInt('2.7') daba 2 copias y un campo vacío o
// ilegible se convertía en silencio en 0 o en 1.
function _leerReplicar(){
  const txt = id => { const e = document.getElementById(id); return e ? String(e.value).trim() : ''; };
  const numero = s => s === '' ? NaN : Number(s);
  const nrep = numero(txt('repN')), dx = numero(txt('repDx')), dy = numero(txt('repDy'));
  if(!Number.isInteger(nrep) || nrep < 1 || nrep > 50) return {error:'Repeticiones: un entero de 1 a 50.'};
  if(!isFinite(dx) || !isFinite(dy)) return {error:'Distancias: escribe números.'};
  return {dx, dy, nrep};
}
function abrirReplicar(){
  depurarSeleccionPF();
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){
    refrescar();
    aviso('Marca con "Mover / editar" lo que quieras replicar.');
    return;
  }
  const nTramos = tramosDeGrupo(idsNodos).length;
  document.getElementById('repSub').textContent =
    'Se replicarán ' + idsNodos.length + ' nudo(s)'
    + (nTramos ? ' y ' + nTramos + ' tramo(s)' : '')
    + ', desplazándolos la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const el = document.getElementById('repPrev');
  if(!el) return;
  depurarSeleccionPF();
  const idsNodos = nodosDeSeleccion();
  const base = nodos.find(z=>z.id===idsNodos[0]);
  if(!base){ el.innerHTML = 'No hay nada seleccionado que replicar.'; return; }
  const v = _leerReplicar();
  if(v.error){ el.innerHTML = v.error; return; }
  if(v.dx === 0 && v.dy === 0){ el.innerHTML = 'Indica un desplazamiento en x o en y.'; return; }
  let t = 'Saldrán <b>' + v.nrep + (v.nrep === 1 ? ' copia' : ' copias') + '</b>. '
        + 'Desde ('+dec(base.x,'len')+' ; '+dec(base.y,'len')+') '+unitLen+' → ';
  const p = [];
  for(let i=1;i<=Math.min(v.nrep,3);i++)
    p.push('('+dec(base.x+v.dx*i,'len')+' ; '+dec(base.y+v.dy*i,'len')+')');
  el.innerHTML = t + p.join(', ') + (v.nrep>3 ? ' …' : '');
}
// Entre dos nudos solo cabe un tramo, el mismo criterio que addTramo (04-): una
// copia que cae sobre CUALQUIER tramo que ya une ese par de nudos, en cualquier
// sentido, se descarta. Con un recto encima de un arco la cadena de la compuerta
// se rompía, la presión cargaba los dos y el resultado salía falso sin aviso.
function _tramoEntre(a, b){
  return tramos.find(t=>(t.a === a && t.b === b) || (t.a === b && t.b === a));
}
// ¿El tramo existente tiene la forma de la copia? Misma flecha geométrica: un
// recto (o un arco de flecha nula) vale 0, y un arco recorrido al revés tiene la
// flecha cambiada de signo (arcoDeTramo). Solo decide si se avisa.
function _flechaGeom(t){ return (t.tipo === 'arco') ? (t.flecha || 0) : 0; }
function _mismaForma(t, a, f, tol){
  return Math.abs(_flechaGeom(t) - (t.a === a ? f : -f)) <= tol;
}
function applyReplicar(){
  // Nada se toca ni se registra en deshacer hasta que la selección y los
  // campos son válidos.
  depurarSeleccionPF();
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){ refrescar(); aviso('No hay nada seleccionado que replicar.', 'error'); return; }
  const v = _leerReplicar();
  if(v.error){ aviso(v.error, 'error'); return; }
  const {dx, dy, nrep} = v;
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  const idsTramos = tramosDeGrupo(idsNodos);
  // Tolerancia relativa al tamaño del modelo (con el recorrido de las copias).
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const tam = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys),
                       Math.abs(dx)*nrep, Math.abs(dy)*nrep);
  const tol = 1e-6 * (tam > 0 ? tam : 1);
  // Un solo paso de deshacer, registrado justo antes del primer cambio: si
  // todas las copias caen sobre lo que ya existe, no queda un paso vacío.
  let registrado = false;
  const registrar = () => { if(!registrado){ registrarCambio(); registrado = true; } };
  const selNodos = [], selTramos = [];
  const anadir = (lista, id) => { if(lista.indexOf(id) < 0) lista.push(id); };
  let creados = 0, unidos = 0;
  const distintos = new Set();   // tramos existentes que no tienen la forma de la copia
  for(let i=1;i<=nrep;i++){
    const mapaNodo = {};
    // Una copia que cae sobre un nudo que ya existía (o sobre la copia de una
    // repetición anterior) REUTILIZA ese nudo, que conserva su apoyo, su rótula
    // y su tope. Un nudo superpuesto dejaba el tramo copiado fuera de la
    // cadena de la compuerta: presión por la cara contraria y reacción falsa.
    const previos = nodos.slice();
    idsNodos.forEach(id=>{
      const o = nodos.find(z=>z.id===id); if(!o) return;
      const x = o.x + dx*i, y = o.y + dy*i;
      const ya = previos.find(n=>Math.hypot(n.x - x, n.y - y) <= tol);
      if(ya){ mapaNodo[id] = ya.id; anadir(selNodos, ya.id); unidos++; return; }
      registrar();
      const nn = Object.assign({}, o, {id:++nodoSeq, x, y, nombre:'',
                                       tope: o.tope ? Object.assign({}, o.tope) : null});
      nodos.push(nn); mapaNodo[id] = nn.id; anadir(selNodos, nn.id); creados++;
    });
    idsTramos.forEach(id=>{
      const o = tramos.find(z=>z.id===id); if(!o) return;
      const a = mapaNodo[o.a], b = mapaNodo[o.b];
      if(a === undefined || b === undefined || a === b) return;
      // Si esos nudos ya los une un tramo, la copia se descarta y queda
      // seleccionado el existente, con su forma, su peso propio y su cara.
      const ya = _tramoEntre(a, b);
      if(ya){
        anadir(selTramos, ya.id);
        if(!_mismaForma(ya, a, _flechaGeom(o), tol)) distintos.add(ya.id);
        return;
      }
      registrar();
      const nt = Object.assign({}, o, {id:++tramoSeq, a, b});
      tramos.push(nt); anadir(selTramos, nt.id); creados++;
    });
  }
  closeReplicar();
  if(!creados){
    aviso(distintos.size ? 'Las copias caen sobre nudos que ya une otro tramo: no se añadió nada.'
                         : 'Las copias caen sobre lo que ya existe: no se añadió nada.');
    return;
  }
  reNombrar();
  selN = selNodos; selT = selTramos;
  infoNodo = selNodos.length ? selNodos[selNodos.length-1] : null;
  infoTramo = selTramos.length ? selTramos[selTramos.length-1] : null;
  invalidarResultados();
  refrescar();
  // Un solo aviso (la caja muestra uno): los nudos unidos y los tramos no copiados.
  const partes = [];
  if(unidos) partes.push(unidos === 1 ? 'Se unió 1 nudo que caía sobre un nudo existente'
                                      : 'Se unieron ' + unidos + ' nudos que caían sobre nudos existentes');
  if(distintos.size) partes.push(distintos.size + (distintos.size === 1
      ? ' tramo no se copió: esos nudos ya los une otro tramo'
      : ' tramos no se copiaron: esos nudos ya los une otro tramo'));
  if(partes.length) aviso(partes.join('; ') + '.');
}
function limpiarTodo(){
  registrarCambio();
  nodos=[]; tramos=[]; nodoSeq=0; tramoSeq=0; vaciarSeleccionPF();
  pesos=[]; pesoSeq=0; pesoActivo=null;
  invalidarResultados();
  refrescar();
}
function refrescar(){ dibujar(); pintarListas(); pintarZonas(); }

function toggleActivo(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.activo = (t.activo === false);
  invalidarResultados(); refrescar();
}
function invertirCara(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.invertir = !t.invertir; invalidarResultados(); refrescar();
}
function cambiarFlecha(id,v){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.flecha=parseFloat(v)||0; invalidarResultados(); refrescar();
}
// Texto corto de la orientación de un tope o apoyo móvil, para las listas.
// Dice el ángulo como el alumno lo escribió (dónde se apoya, desde dónde
// empuja) o, si lo fija la compuerta, el agudo con el eje más cercano; nunca
// el de 0 a 360 del modelo (2026-09-14).
function _textoDireccion(u){
  const d = direccionIncognita(u);
  const agudo = bsaAnguloAgudoEje(d.x, d.y).grados < 1e-6 ? '' : ' (a ' + bsaTextoAnguloAgudo(d.x, d.y) + ')';
  if(u.tipo==='T') return (u.n.tope && u.n.tope.modo === 'angulo')
    ? 'tope desde ' + dec(bsaAnguloOpuesto(u.n.tope.ang, true),'f') + '°' : 'tope ⟂' + agudo;
  return (u.n.apModo === 'normal') ? 'móvil ⟂' + agudo
    : 'móvil apoyado a ' + dec(bsaAnguloOpuesto(u.n.apAng===undefined?90:u.n.apAng),'f') + '°';
}
function pintarListas(){
  const lt=document.getElementById('listaTramos');
  if(lt){
    lt.innerHTML = tramos.length ? tramos.map(t=>{
      const act = t.activo !== false;
      const cara1 = signoZona(t) === 1 ? 'izq.' : 'der.';
      return '<div class="item-row'+(selT.indexOf(t.id)>=0?' sel':'')+'">'
        + '<input type="checkbox" '+(act?'checked':'')+' onchange="toggleActivo('+t.id+')" '
        + 'title="Incluir en el análisis" style="width:14px;height:14px;accent-color:#0f5c56">'
        + '<div class="nm">'+nomTramo(t)+' · '+(t.tipo==='arco'?'curvo':'recto')+(pesoDe(t) ? ' · '+escaparTexto(pesoDe(t).nom) : '')+'</div>'
        + (t.tipo==='arco' ? '<input type="number" step="any" value="'+t.flecha+'" title="flecha (sagita)" '
            + 'style="width:52px;padding:2px 4px;border:1px solid var(--border2);border-radius:4px;font-size:10px" '
            + 'onchange="cambiarFlecha('+t.id+',this.value)">' : '')
        + '<button class="cara-btn'+(t.invertir?' on':'')+'" onclick="invertirCara('+t.id+')" '
        + 'title="Qué cara mira a la zona 1. Se deduce de la cadena de la compuerta; púlsalo solo si el dibujo del líquido no coincide">Z1 '+cara1+'</button>'
        + '<button class="x" onclick="borrarTramo('+t.id+')">×</button></div>';
    }).join('') : '<div class="list-empty">Sin tramos. Coloca nudos y únelos.</div>';
  }
  const la=document.getElementById('listaApoyos');
  if(la){
    const con = nodos.filter(n=>n.apoyo||n.rotula||n.tope);
    la.innerHTML = con.length ? con.map(n=>{
      const et=[];
      if(n.apoyo==='fijo') et.push('apoyo fijo');
      if(n.apoyo==='movil') et.push(_textoDireccion({n, tipo:'R'}));
      if(n.rotula) et.push('rótula');
      if(n.tope) et.push(_textoDireccion({n, tipo:'T'}) + (n.tope.modo === 'angulo' ? '' : ' · lado zona ' + (n.tope.lado||1)));
      return '<div class="item-row"><div class="dot" style="background:'+(n.tope?'#b45309':'#0b3f3a')+'"></div>'
        + '<div class="nm">'+n.nombre+' · '+et.join(', ')+'</div></div>';
    }).join('') : '<div class="list-empty">Sin apoyos.</div>';
  }
  const si=document.getElementById('tbSelInfo');
  if(si) si.textContent = (!selN.length&&!selT.length) ? 'Nada seleccionado'
    : 'Seleccionado: '+[selN.length?selN.length+' nudo(s)':null, selT.length?selT.length+' tramo(s)':null]
      .filter(Boolean).join(' y ');
}
function borrarTramo(id){
  registrarCambio(); tramos=tramos.filter(t=>t.id!==id);
  selT = selT.filter(s=>s!==id); if(infoTramo === id) infoTramo = null;
  invalidarResultados(); refrescar();
}

// ── Modal de apoyo ──
function abrirApoyoModal(id){
  apoyoId=id; const n=nodos.find(z=>z.id===id);
  _anotarGiroFijo(n);   // el giro de partida, antes de que se teclee nada
  if(!n) return;
  document.getElementById('apNom').textContent=n.nombre;
  // Los dos campos enseñan el ángulo del USUARIO (dónde se apoya el nudo);
  // el modelo guarda el opuesto, que es hacia dónde empuja la reacción.
  document.getElementById('apAng').value = bsaAnguloOpuesto(n.apAng===undefined?90:n.apAng);
  const gf = document.getElementById('apAngFijo');
  if(gf) gf.value = bsaAnguloOpuesto(anguloDibujoApoyoFijo(n));
  const chk = document.getElementById('apNormal');
  if(chk) chk.checked = (n.apModo === 'normal');
  actualizarPrevApoyo();
  document.getElementById('apoyoModal').classList.add('show');
}
// Dos ángulos que señalan la misma dirección (el campo va en (−180, 180] y el
// modelo puede guardar 270, o arrastrar un redondeo de la media vuelta).
function _mismoAngulo(a, b){
  const d = ((Number(a) - Number(b)) % 360 + 360) % 360;
  return Math.min(d, 360 - d) < 1e-6;
}
function _movilNormal(n){ return !!n && n.apoyo === 'movil' && n.apModo === 'normal'; }
// `apLado` (la cara del móvil normal, que Transformar cambia al girar) solo
// vale mientras ese móvil normal sigue puesto. Si se quita el apoyo, pasa a
// fijo o a ángulo, el móvil normal que se ponga después empieza en la zona 2,
// como un nudo nuevo: si no, heredaba en silencio la cara de un giro anterior.
function _reiniciarLadoMovil(n, eraNormal){
  if(!(eraNormal && _movilNormal(n))) n.apLado = 2;
}
// Giro del apoyo fijo CONFIRMADO: el de partida al abrir la ventana, o el último
// que se aplicó. El listener 'input' del campo (09-) escribe en n.apAngFijo lo
// que se va tecleando, para verlo en el lienzo; antes de comparar o de registrar
// un paso de deshacer se devuelve el confirmado. Sin eso la instantánea se
// llevaba un valor a medio escribir («1», «18») que nunca existió, y volver a
// teclear el mismo ángulo dejaba un paso espurio. Se anota el objeto del nudo:
// si deshacer lo sustituyó entretanto, no hay nada que devolver.
let _giroFijoConfirmado = null;   // {n, v}
function _anotarGiroFijo(n){ _giroFijoConfirmado = n ? {n, v:n.apAngFijo} : null; }
function _devolverGiroFijo(n){
  const g = _giroFijoConfirmado;
  if(!g || g.n !== n) return;
  if(g.v === undefined) delete n.apAngFijo; else n.apAngFijo = g.v;
}
// Vista previa del giro que se está tecleando: el campo dice DÓNDE SE APOYA y el
// modelo guarda el opuesto (bsaAnguloOpuesto), igual que closeApoyoModal. Solo en
// un fijo, el único apoyo que enseña ese campo. La llaman el listener 'input' del
// campo (09-) y toggleRotulaNudo, que devuelve el confirmado para su instantánea
// y vuelve a poner el tecleado para que el lienzo lo siga enseñando.
function _previsualizarGiroFijo(n){
  if(!n || n.apoyo !== 'fijo') return;
  const gf = document.getElementById('apAngFijo'), vf = parseFloat(gf && gf.value);
  if(isFinite(vf) && !_mismoAngulo(bsaAnguloOpuesto(vf), anguloDibujoApoyoFijo(n)))
    n.apAngFijo = bsaAnguloOpuesto(vf);
}
function closeApoyoModal(){
  const n=nodos.find(z=>z.id===apoyoId);
  if(n){
    _devolverGiroFijo(n);
    // 0 grados es una direccion valida (el nudo se apoya en la pared
    // derecha): con `||90` se convertia en silencio en 90, y este angulo SI
    // entra en el calculo. Mismo criterio que el campo del apoyo fijo.
    // El campo dice DONDE SE APOYA; se guarda el opuesto, la direccion de la
    // reaccion, que es lo que consume direccionIncognita.
    const vm=parseFloat(document.getElementById('apAng').value);
    const apAng = isFinite(vm)?bsaAnguloOpuesto(vm):90;
    const chk = document.getElementById('apNormal');
    const apModo = (chk && chk.checked) ? 'normal' : 'angulo';
    // Giro del apoyo fijo: solo dibujo (ver anguloDibujoApoyoFijo en 01-).
    const gf = document.getElementById('apAngFijo');
    const vf = parseFloat(gf && gf.value);
    const apAngFijo = isFinite(vf) ? bsaAnguloOpuesto(vf) : 90;
    // Solo lo que cambia, y solo en los campos que la ventana enseña para el
    // apoyo que tiene el nudo (actualizarPrevApoyo oculta los demás): un ángulo
    // tecleado en el móvil antes de «Quitar» no se guarda en un nudo sin apoyo.
    // Un paso de deshacer, y el panel de resultados se oculta si cambia algo
    // que entra en el cálculo (no el giro del fijo).
    const cambiaCalculo = n.apoyo === 'movil'
                       && (!_mismoAngulo(apAng, n.apAng===undefined?90:n.apAng)
                           || apModo !== (n.apModo || 'angulo'));
    const cambiaDibujo = n.apoyo === 'fijo' && !_mismoAngulo(apAngFijo, anguloDibujoApoyoFijo(n));
    if(cambiaCalculo || cambiaDibujo){
      registrarCambio();
      const eraNormal = _movilNormal(n);
      if(cambiaCalculo){ n.apAng = apAng; n.apModo = apModo; }
      if(cambiaDibujo) n.apAngFijo = apAngFijo;
      _reiniciarLadoMovil(n, eraNormal);
      if(cambiaCalculo) invalidarResultados();
    }
  }
  _giroFijoConfirmado = null;
  document.getElementById('apoyoModal').classList.remove('show'); apoyoId=null; refrescar();
}
// Deja marcado el apoyo que tiene el nudo (bloque 4, 2026-09-09).
function marcarApoyoPF(n){
  const cual = {fijo:'apbFijo', movil:'apbMovil'};
  Object.keys(cual).forEach(k=>{
    const b = document.getElementById(cual[k]);
    if(b) b.classList.toggle('active', n && n.apoyo === k);
  });
  const q = document.getElementById('apbQuitar');
  if(q) q.classList.toggle('active', !(n && n.apoyo));
  const r = document.getElementById('apbRotula');
  if(r) r.classList.toggle('active', !!(n && n.rotula));
}
// La rótula interna se pone y se quita desde la misma ventana del apoyo
// (2026-09-09): antes era una herramienta suelta de la barra, y era el único
// atributo de un nudo que no se editaba donde se editan los demás.
function toggleRotulaNudo(){
  const n = nodos.find(z=>z.id===apoyoId); if(!n) return;
  _devolverGiroFijo(n);   // la instantánea, sin el giro a medio teclear
  registrarCambio();
  _previsualizarGiroFijo(n);   // y el tecleado, otra vez a la vista
  n.rotula = !n.rotula;
  invalidarResultados();
  actualizarPrevApoyo(); refrescar();
}

function actualizarPrevApoyo(){
  const n=nodos.find(z=>z.id===apoyoId);
  marcarApoyoPF(n);
  const el=document.getElementById('apPrev');
  if(!n||!el) return;
  // Cada apoyo enseña solo su campo: el del fijo gira el dibujo y el del móvil
  // es la dirección de su única reacción, que sí entra en el cálculo.
  const esFijo = n.apoyo === 'fijo', esMovil = n.apoyo === 'movil';
  const ver = (id, on) => { const e = document.getElementById(id); if(e) e.style.display = on ? '' : 'none'; };
  ['apAngFijoRow','apAngFijoNota'].forEach(id=>ver(id, esFijo));
  ['apAngRow','apAngNota','apNormalRow','apNormalNota'].forEach(id=>ver(id, esMovil));
  const chk = document.getElementById('apNormal');
  const ang = document.getElementById('apAng');
  if(ang && chk) ang.disabled = chk.checked;
  const inc = nodos.reduce((s,z)=>s+(z.apoyo==='fijo'?2:z.apoyo==='movil'?1:0)+(z.tope?1:0),0);
  const eq = 3 + nodos.filter(z=>z.rotula).length;
  el.innerHTML='Ahora: <b>'+(n.apoyo?(n.apoyo==='fijo'?'apoyo fijo':'apoyo móvil'):'sin apoyo')
    +(n.rotula?' con rótula':'')
    +'</b> · Incógnitas totales: <b>'+inc+'</b> frente a <b>'+eq+'</b> ecuaciones'
    + (esMovil && chk && chk.checked
        ? '<br>La reacción del móvil será perpendicular a la compuerta (a ' + (function(){ const dd = direccionIncognita({n, tipo:'R'}); return bsaTextoAnguloAgudo(dd.x, dd.y); })() + ').'
        : '')
    + (esFijo ? '<br>El giro del apoyo fijo es solo del dibujo: sus dos reacciones no cambian.' : '');
}
function setApoyo(t){
  const n=nodos.find(z=>z.id===apoyoId);
  if(n){
    _devolverGiroFijo(n);   // el listener de 09- pudo escribir un giro a medias
    const eraNormal = _movilNormal(n);
    const apoyo = t || null;
    let apAng = n.apAng, apModo = n.apModo, apAngFijo = n.apAngFijo;
    if(apoyo==='movil'){
      const vm=parseFloat(document.getElementById('apAng').value);  // 0 es valido
      apAng=isFinite(vm)?bsaAnguloOpuesto(vm):90;
      const chk = document.getElementById('apNormal');
      apModo = (chk && chk.checked) ? 'normal' : 'angulo';
    }
    if(apoyo==='fijo'){
      const gf = document.getElementById('apAngFijo');
      const vf = parseFloat(gf && gf.value);
      if(isFinite(vf)) apAngFijo = bsaAnguloOpuesto(vf);     // solo dibujo
    }
    // Pulsar el apoyo que el nudo ya tiene, con los mismos campos, no cambia
    // nada: ni paso de deshacer ni panel oculto. El giro del fijo es dibujo: deja
    // paso de deshacer pero no oculta el panel, como en closeApoyoModal.
    const cambiaApoyo = apoyo !== (n.apoyo || null);
    const cambiaMovil = apoyo==='movil'
      && (!_mismoAngulo(apAng, n.apAng===undefined?90:n.apAng) || apModo !== (n.apModo || 'angulo'));
    const cambiaFijo = apoyo==='fijo' && !_mismoAngulo(apAngFijo, anguloDibujoApoyoFijo(n));
    if(cambiaApoyo || cambiaMovil || cambiaFijo){
      registrarCambio();
      n.apoyo = apoyo;
      if(apoyo==='movil'){ n.apAng = apAng; n.apModo = apModo; }
      if(cambiaFijo) n.apAngFijo = apAngFijo;
      _reiniciarLadoMovil(n, eraNormal);
      if(cambiaApoyo || cambiaMovil) invalidarResultados();
    }
    _anotarGiroFijo(n);
  }
  actualizarPrevApoyo(); refrescar();
}

// ── Modal de tope ──
// Un tope liso empuja perpendicularmente a la compuerta desde el lado en
// que está (modo `normal`); si el problema da la dirección, modo `angulo`.
let _topeModo = 'normal';
function abrirTopeModal(id){
  topeId=id; const n=nodos.find(z=>z.id===id); if(!n) return;
  document.getElementById('tpNom').textContent=n.nombre;
  const tp = n.tope || {};
  // El campo va en el convenio del alumno (de dónde empuja el tope); el
  // modelo guarda el opuesto, la dirección de la fuerza, que es lo que lee
  // direccionIncognita.
  document.getElementById('tpAng').value =
    (tp.ang !== undefined && isFinite(+tp.ang)) ? bsaAnguloOpuesto(tp.ang, true) : 0;
  // lado por defecto: el seco, si solo una zona tiene líquido
  let lado = tp.lado;
  if(!lado){
    const z1 = capasOrdenadas(1).length, z2 = capasOrdenadas(2).length;
    lado = (z1 && !z2) ? 2 : (z2 && !z1 ? 1 : 2);
  }
  document.getElementById('tpLado').value = String(lado);
  setTopeModo(tp.modo === 'angulo' ? 'angulo' : 'normal');
  document.getElementById('topeModal').classList.add('show');
}
function setTopeModo(m){
  _topeModo = m;
  document.getElementById('tpCampoNormal').style.display = (m==='normal') ? 'block' : 'none';
  document.getElementById('tpCampoAngulo').style.display = (m==='angulo') ? 'block' : 'none';
  const a = document.getElementById('tpTabNormal'), b = document.getElementById('tpTabAngulo');
  if(a) a.classList.toggle('active', m==='normal');
  if(b) b.classList.toggle('active', m==='angulo');
}
function closeTopeModal(){ document.getElementById('topeModal').classList.remove('show'); topeId=null; }
function applyTope(){
  const n=nodos.find(z=>z.id===topeId);
  if(n){
    const nuevo = {ang:bsaAnguloOpuesto(parseFloat(document.getElementById('tpAng').value)||0), modo:_topeModo,
                   lado:parseInt(document.getElementById('tpLado').value,10)||1};
    // Aplicar sin tocar nada no deja paso de deshacer ni oculta el panel.
    const tp = n.tope;
    const igual = !!tp && (tp.modo || 'angulo') === nuevo.modo && (tp.lado || 1) === nuevo.lado
               && _mismoAngulo(tp.ang || 0, nuevo.ang);
    if(!igual){ registrarCambio(); n.tope = nuevo; invalidarResultados(); }
  }
  document.getElementById('topeModal').classList.remove('show'); topeId=null; refrescar();
}
// ── Ventana de peso propio (2026-09-14) ──
// Valores con nombre, en peso por unidad de superficie de placa; mientras la
// herramienta está activa, tocar un tramo le asigna el elegido.
function abrirPeso(){
  const lb = document.getElementById('pesoLbl'); if(lb) lb.textContent = 'Peso por ' + unitLen + '²';
  const pu = document.getElementById('pesoU'); if(pu) pu.textContent = uPres();
  renderPesos();
  document.getElementById('pesoModal').classList.add('show');
}
function cerrarPeso(){ document.getElementById('pesoModal').classList.remove('show'); }
function renderPesos(){
  const el = document.getElementById('pesoLista'); if(!el) return;
  if(!pesos.length){ el.innerHTML = '<div class="list-empty">Todavía no hay valores. Crea uno abajo.</div>'; return; }
  el.innerHTML = pesos.map(p=>{
    const n = tramos.filter(t=>t.pesoId === p.id).length;
    return '<div class="item-row' + (pesoActivo === p.id ? ' sel' : '') + '" onclick="elegirPeso(' + p.id + ')" style="cursor:pointer">'
      + '<div class="dot" style="background:#b07d1a"></div>'
      + '<div class="nm">' + escaparTexto(p.nom) + ' · <b>' + dec(p.val,'f') + ' ' + uPres() + '</b>'
      + (n ? ' <span style="color:var(--muted)">· ' + n + ' tramo' + (n>1?'s':'') + '</span>' : '') + '</div>'
      + '<button class="x" title="Borrar" onclick="event.stopPropagation();borrarPeso(' + p.id + ')">×</button></div>';
  }).join('');
}
function crearPeso(){
  const v = parseFloat(document.getElementById('pesoVal').value);
  if(!isFinite(v) || v <= 0){ aviso('Indica un peso mayor que cero.', 'error'); return; }
  const nom = (document.getElementById('pesoNom').value || '').trim() || ('Peso ' + (pesos.length + 1));
  registrarCambio();
  const p = {id:++pesoSeq, nom, val:v};
  pesos.push(p); pesoActivo = p.id;
  document.getElementById('pesoNom').value = '';
  document.getElementById('pesoVal').value = 0;
  renderPesos(); refrescar();
  aviso('Valor creado. Toca los tramos a los que quieras asignárselo.');
}
function elegirPeso(id){ pesoActivo = (pesoActivo === id) ? null : id; renderPesos(); refrescar(); }
function borrarPeso(id){
  registrarCambio();
  pesos = pesos.filter(p=>p.id !== id);
  tramos.forEach(t=>{ if(t.pesoId === id) t.pesoId = null; });
  if(pesoActivo === id) pesoActivo = null;
  invalidarResultados(); renderPesos(); refrescar();
}
function activarPeso(){ setTool('peso'); abrirPeso(); }
function asignarPesoATramo(idTramo){
  const t = tramos.find(z=>z.id === idTramo); if(!t) return false;
  if(pesoActivo === null){ aviso('Elige antes un valor de peso en la lista.', 'error'); return false; }
  registrarCambio();
  t.pesoId = (t.pesoId === pesoActivo) ? null : pesoActivo;
  invalidarResultados(); renderPesos(); refrescar();
  return true;
}
function quitarTope(){
  const n=nodos.find(z=>z.id===topeId);
  // Sin tope que quitar no hay cambio: ni paso de deshacer ni panel oculto.
  if(n && n.tope){ registrarCambio(); n.tope=null; invalidarResultados(); }
  document.getElementById('topeModal').classList.remove('show'); topeId=null; refrescar();
}

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  ele:{titulo:'Elementos', btn:'rbEle'},
  liq:{titulo:'Líquidos', btn:'rbLiq'}
};
let seccionAbierta = null;

function posicionarToggle(){
  const p = document.getElementById('leftPanel');
  const f = document.getElementById('panelFlyout');
  const b = document.getElementById('panelToggle');
  if(!p || !b) return;
  const rail = !p.classList.contains('plegado');
  const fly  = f && !f.classList.contains('plegado');
  b.classList.toggle('corrido', rail);
  b.classList.toggle('expandido', rail && fly);
}
function togglePanel(){
  const p = document.getElementById('leftPanel');
  if(!p) return;
  const seCierra = !p.classList.contains('plegado');
  p.classList.toggle('plegado');
  if(seCierra) cerrarSeccion();
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  if(seccionAbierta === id && !f.classList.contains('plegado')){ cerrarSeccion(); return; }
  seccionAbierta = id;
  Object.keys(SECCIONES).forEach(k=>{
    const c = document.getElementById('sec_' + k);
    if(c) c.style.display = (k===id) ? '' : 'none';
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.toggle('active', k===id);
  });
  document.getElementById('flyoutTitulo').textContent = SECCIONES[id].titulo;
  // El desplegable va SIEMPRE a la derecha de la columna de control, así que
  // abrir una sección abre también la columna. Por debajo de 820 px la columna
  // arranca plegada, y sin esto el panel salía con la franja de la izquierda
  // vacía y sin los botones de acción (2026-09-24).
  const lp = document.getElementById('leftPanel');
  if(lp) lp.classList.remove('plegado');
  f.classList.remove('plegado');
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function cerrarSeccion(){
  const f = document.getElementById('panelFlyout');
  if(f) f.classList.add('plegado');
  seccionAbierta = null;
  Object.keys(SECCIONES).forEach(k=>{
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.remove('active');
  });
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

function zoomIn(){ escala=Math.min(escala*1.25,4000); dibujar(); }
function zoomOut(){ escala=Math.max(escala/1.25,0.02); dibujar(); }
function centrar(){
  if(!nodos.length){ vx=0; vy=0; escala=60; dibujar(); return; }
  const nv = Math.max(nivelZona(1), nivelZona(2));
  const xs=nodos.map(n=>n.x), ys=nodos.map(n=>n.y).concat(isFinite(nv)?[nv]:[]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  vx=(x0+x1)/2; vy=(y0+y1)/2;
  const dx=Math.max(x1-x0,0.5), dy=Math.max(y1-y0,0.5);
  // Margen amplio: los diagramas de presión, las resultantes y sus cotas
  // salen de la compuerta por los dos lados.
  escala=Math.max(2,Math.min(Math.min((W-340)/dx,(H-170)/dy),900));
  dibujar();
}

// ═══════════════════════════════════════════════════════════
//  EJEMPLOS DE VERIFICACIÓN
//  Casos de complejidad creciente, contrastados con las fórmulas cerradas
//  del curso (Hibbeler ej. 9.14 y §9.5; Beer §5.9 y prob. 5.79/5.84).
// ═══════════════════════════════════════════════════════════
const EJEMPLOS = [
  {
    id:'vertical',
    nom:'Placa vertical entre 2 y 5 m de profundidad',
    desc:'Compuerta AB vertical de 3 m, ancho 1.5 m, con la superficie del agua 2 m por encima de A. '
        +'Articulada en A y apoyada en un tope liso en B.',
    esperado:'F₁ = 154.51 kN a 1.29 m sobre B (z_P = 3.71 m) · N_B = 88.29 kN ← · R_xA = 66.22 kN ← · R_yA = 0',
    verifica:{F1:154.51, zP1:3.71, N_B:{v:88.29, s:'←'}, R_xA:{v:66.22, s:'←'}, R_yA:0},
    armar(N){
      const A=N(0,-2), B=N(0,-5);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:180, modo:'normal', lado:2};
      zonas = {1:[{g:9.81, niv:0}], 2:[]};
      return 1.5;
    }
  },
  {
    id:'inclinada',
    nom:'Compuerta inclinada apoyada en el fondo',
    desc:'Compuerta AB de 2 × 3 (inclinada), ancho 2 m, articulada en A al nivel del agua y apoyada en B '
        +'sobre el fondo liso del canal (reacción vertical). El agua queda sobre la placa, a su derecha.',
    esperado:'Diagrama triangular: F₁ = γ z̄ A = 9.81·1.5·(3.606·2) = 106.11 kN, en P a 2/3 de AB (z_P = 2.00 m) · R_B = 127.53 kN ↑ · R_xA = 88.29 kN → · R_yA = 68.67 kN ↓',
    verifica:{F1:106.11, L1:3.606, zP1:2.00, R_B:{v:127.53, s:'↑'},
              R_xA:{v:88.29, s:'→'}, R_yA:{v:68.67, s:'↓'}},
    armar(N){
      const A=N(0,0), B=N(2,-3);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.apoyo='movil'; B.apAng=90; B.apModo='angulo';
      zonas = {1:[], 2:[{g:9.81, niv:0}]};
      return 2;
    }
  },
  {
    id:'pesoPropio',
    nom:'Compuerta inclinada con peso propio',
    desc:'La compuerta inclinada AB, ahora con peso propio q = 2 kN/m²: W = q·b·L, vertical, en el centro de AB.',
    esperado:'W₁ = 2·2·3.606 = 14.42 kN en G = (1; −1.5) · con W a x = 1 m, ΣM_A reparte W a partes iguales: R_B = 127.53 + W/2 = 134.74 kN ↑ · R_yA = 68.67 − W/2 = 61.46 kN ↓ · R_xA = 88.29 kN →',
    verifica:{F1:106.11, W1:14.42, R_B:{v:134.74, s:'↑'},
              R_xA:{v:88.29, s:'→'}, R_yA:{v:61.46, s:'↓'}},
    armar(N){
      const A=N(0,0), B=N(2,-3);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.apoyo='movil'; B.apAng=90; B.apModo='angulo';
      zonas = {1:[], 2:[{g:9.81, niv:0}]};
      pesos = [{id:1, nom:'Chapa de la compuerta', val:2}]; pesoSeq = 1;
      tramos[tramos.length-1].pesoId = 1;
      return 2;
    }
  },
  {
    id:'curva',
    nom:'Compuerta curva (cuarto de círculo)',
    desc:'Arco AB de radio 2 m con centro en (2 ; 0), ancho 2 m; el agua llena el cuarto de círculo, a la derecha, '
        +'hasta el nivel de A. Articulada en B (abajo) y con un tope liso en A, del lado seco.',
    esperado:'F_h = γ(1)(2)(2) = 39.24 kN ← · F_v = peso del cuarto de círculo de agua = γ b πR²/4 = 61.64 kN ↓ · F₁ = 73.07 kN por el centro del arco · N_A = 39.24 kN →',
    verifica:{F1:73.07, Fx1:{v:39.24, s:'←'}, Fy1:{v:61.64, s:'↓'}, N_A:{v:39.24, s:'→'}},
    armar(N){
      const A=N(0,0), B=N(2,-2);
      const t = addTramo(A.id,B.id,'arco'); t.flecha = -(2 - Math.SQRT2);   // R(1 − cos 45°), combado hacia fuera del agua
      B.apoyo='fijo'; A.tope={ang:0, modo:'normal', lado:1};
      zonas = {1:[], 2:[{g:9.81, niv:0}]};
      return 2;
    }
  },
  {
    id:'capas',
    nom:'Dos líquidos: aceite sobre agua',
    desc:'Compuerta AB vertical de 4 m, ancho 1 m. A la izquierda, 1.5 m de aceite (γ = 8.5) sobre agua (γ = 9.81). '
        +'Articulada en A (en la superficie) y tope liso en B.',
    esperado:'p en el cambio de capa = 8.5·1.5 = 12.75; en B = 12.75 + 9.81·2.5 = 37.28 kN/m². F₁ = 9.56 + 62.53 = 72.09 kN (z_P = 2.70 m) · N_B = 48.57 kN. Se resuelve por capas: cada una, rectángulo + triángulo.',
    verifica:{pD1:37.28, F1:72.09, zP1:2.70, N_B:48.57},
    armar(N){
      const A=N(0,0), B=N(0,-4);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:180, modo:'normal', lado:2};
      zonas = {1:[{g:8.5, niv:0},{g:9.81, niv:-1.5}], 2:[]};
      return 1;
    }
  },
  {
    id:'dosLados',
    nom:'Compuerta de marea: líquido a los dos lados',
    desc:'Compuerta AB vertical de 3 m y 1.2 m de ancho, con bisagra en A (arriba) y tope en B. A la derecha, mar '
        +'(γ = 10.05) 0.5 m por encima de A; a la izquierda, agua dulce (γ = 9.81) 0.3 m por debajo de A.',
    esperado:'Dos fuerzas en el DCL: F₁ = 42.91 kN del agua dulce (izquierda, 2.7 m mojados, z_P = 1.80 m) y F₂ = 72.36 kN del mar (derecha, z_P = 2.38 m). El tope, del lado izquierdo, resiste la diferencia: N_B = 15.19 kN → · R_xA = 14.26 kN →',
    verifica:{F1:42.91, L1:2.7, zP1:1.80, F2:72.36, zP2:2.38,
              N_B:{v:15.19, s:'→'}, R_xA:{v:14.26, s:'→'}},
    armar(N){
      const A=N(0,0), B=N(0,-3);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:0, modo:'normal', lado:1};
      zonas = {1:[{g:9.81, niv:-0.3}], 2:[{g:10.05, niv:0.5}]};
      return 1.2;
    }
  },
  {
    id:'rotula',
    nom:'Compuerta de dos hojas con rótula',
    desc:'Hoja vertical AB articulada en A, rótula en B y hoja inclinada BC articulada en C. Ancho 1 m, agua a la izquierda hasta A. '
        +'Cuatro incógnitas y cuatro ecuaciones: la rótula aporta ΣM_B = 0 de una hoja.',
    esperado:'F₁ = 19.62 kN (hoja AB) y F₂ = 73.57 kN (hoja BC, inclinada). La rótula da ΣM_B = 0 de la hoja AB, que despeja R_xA = 6.54 kN ←; luego ΣF_x, ΣM_A y ΣF_y.',
    verifica:{F1:19.62, F2:73.57, R_xA:{v:6.54, s:'←'}},
    armar(N){
      const A=N(0,0), B=N(0,-2), C=N(1.5,-4);
      addTramo(A.id,B.id,'recto'); addTramo(B.id,C.id,'recto');
      A.apoyo='fijo'; C.apoyo='fijo'; B.rotula=true;
      zonas = {1:[{g:9.81, niv:0}], 2:[]};
      return 1;
    }
  }
];

// ═══════════════════════════════════════════════════════════
//  COMPROBACIÓN DE LOS EJEMPLOS
//  `esperado` es el texto que ve el alumno; `verifica` lleva esos mismos
//  números en forma legible por máquina, para contrastarlos con lo que ha
//  calculado el motor. Claves admitidas (k = número de la resultante):
//    Fk, Fxk, Fyk · magnitud de la resultante y de sus componentes
//    zPk, Lk      · su centro de presión y su longitud mojada
//    pTk, pDk     · presión en el extremo menos y más profundo de la parte mojada
//    R_xA, R_yA, R_B, N_B · incógnitas, con el nombre con el que salen en pantalla
//  Cada valor es un número (la magnitud, como en el texto) o {v, s} con la
//  flecha del sentido real: un apoyo resuelto al revés da la misma magnitud y
//  la flecha contraria, y eso es lo más grave que puede pasar aquí.
// ═══════════════════════════════════════════════════════════
// Magnitudes del resultado que se pueden contrastar, cada una con su nombre.
function magnitudesEjemplo(r){
  const m = {};
  if(!r || r.error) return m;
  (r.cargas||[]).forEach(c=>{
    const d = c.des || desarrolloCarga(c);
    m['F'+c.k]  = {v:c.F, fam:'f'};
    m['Fx'+c.k] = {v:Math.abs(c.Fx), fam:'f', s: c.Fx >= 0 ? '→' : '←'};
    m['Fy'+c.k] = {v:Math.abs(c.Fy), fam:'f', s: c.Fy >= 0 ? '↑' : '↓'};
    m['zP'+c.k] = {v:c.zP,  fam:'len'};
    m['L'+c.k]  = {v:c.len, fam:'len'};
    // Presiones en los extremos de la parte mojada: las mismas que imprime la
    // tabla 1 de los resultados. `c.pMax` NO vale aquí: se muestrea en el punto
    // medio de cada segmento de la integral y no llega al valor del extremo.
    if(d && d.tipo === 'recto' && d.bandas.length){
      m['pT'+c.k] = {v:d.bandas[0].p0, fam:'pres'};
      m['pD'+c.k] = {v:d.bandas[d.bandas.length-1].p1, fam:'pres'};
    } else if(d && d.tipo === 'curvo'){
      m['pT'+c.k] = {v:presionZona(c.z, d.yTop), fam:'pres'};
      m['pD'+c.k] = {v:presionZona(c.z, d.yBot), fam:'pres'};
    }
  });
  (r.pesos||[]).forEach(c=>{ m[c.k] = {v:c.F, fam:'f'}; });     // W1, W2…
  (r.inc||[]).forEach((u,j)=>{
    const pre = u.tipo==='Rx' ? 'R_x' : u.tipo==='Ry' ? 'R_y' : u.tipo==='R' ? 'R_' : 'N_';
    const s = sentidoRealIncognita(u, r.val[j]);
    m[pre + u.n.nombre] = {v:Math.abs(r.val[j]), fam:'f', s:iconoSentidoHtml(s.x, s.y)};
  });
  return m;
}
// Familia de cada clave, que es la que fija la escala de la tolerancia.
function _familiaEjemplo(k){
  if(/^(zP|L)\d+$/.test(k)) return 'len';
  if(/^p[TD]\d+$/.test(k)) return 'pres';
  return 'f';
}
// Contrasta el resultado del motor con los valores de referencia del ejemplo
// y devuelve cuántas magnitudes se desvían (0 si todo cuadra).
function comprobarEjemploPF(ej){
  if(!ej || !ej.verifica) return 0;
  // Un ejemplo que tiene valores de referencia y NO llega a resolverse es un
  // fallo, no un caso sin comprobar. Callarse aqui era indistinguible de «todo
  // cuadra»: una regresion que rompiera calcular() no habria dado ni un aviso.
  if(!R || R.error){
    console.warn('Ejemplo ' + ej.id + ': el motor no ha resuelto, no se puede comprobar', {error:(R && R.error) || 'sin resultado'});
    return 1;
  }
  if(R.cierra === false){
    console.warn('Ejemplo ' + ej.id + ': el equilibrio no cierra');
  }
  const mag = magnitudesEjemplo(R);
  const refs = ej.verifica;
  const ref = e => (typeof e === 'number') ? {v:e} : e;
  // Escala de cada familia: el mayor valor de referencia del ejemplo.
  const escala = {f:1, len:1, pres:1};
  Object.keys(refs).forEach(k=>{
    const f = _familiaEjemplo(k);
    escala[f] = Math.max(escala[f], Math.abs(ref(refs[k]).v));
  });
  // Los números de referencia están escritos con dos decimales, así que se
  // admite medio dígito del último (0.005) más el 0.1 % del mayor valor de su
  // familia. Si algo se desvía más, o falla el motor o el número de referencia
  // está mal leído: hay que mirarlo, no ensanchar esta tolerancia.
  const tol = f => 0.005 + 1e-3*escala[f];
  let desvios = 0;
  Object.keys(refs).forEach(k=>{
    const e = ref(refs[k]), m = mag[k], t = tol(_familiaEjemplo(k));
    if(!m){ console.warn('Ejemplo ' + ej.id + ': ' + k + ' no es una magnitud calculada'); desvios++; return; }
    // Negado a propósito: si el motor devolviera NaN, `> t` sería falso y el
    // desvío pasaría en silencio, que es justo lo que esta comprobación evita.
    if(!(Math.abs(m.v - e.v) <= t)){
      console.warn('Ejemplo ' + ej.id + ': ' + k + ' se desvía de la referencia', {motor:m.v, referencia:e.v});
      desvios++;
      return;
    }
    // El sentido solo se compara si el texto lo da y la fuerza no es nula.
    if(e.s && m.s && e.v > t && m.s !== e.s){
      console.warn('Ejemplo ' + ej.id + ': ' + k + ' se desvía de la referencia (sentido)', {motor:m.s, referencia:e.s});
      desvios++;
    }
  });
  return desvios;
}
function abrirEjemplos(){
  const el = document.getElementById('ejLista');
  // Un solo ejemplo a la vista; los demás siguen en el código como casos de
  // verificación, que es lo que contrasta la consola (CLAUDE.md §4).
  if(el) el.innerHTML = EJEMPLOS.slice(0,1).map((e,i)=>
      '<button type="button" class="ej-item" onclick="cargarEjemplo(\'' + e.id + '\')">'
    + '<div class="ej-cab"><span class="ej-num">' + (i+1) + '</span><span class="ej-nom">' + e.nom + '</span></div>'
    + '<div class="ej-desc">' + e.desc + '</div>'
    + '<div class="ej-ref"><b>Referencia:</b> ' + e.esperado + '</div>'
    + '</button>').join('');
  document.getElementById('ejModal').classList.add('show');
}
function cerrarEjemplos(){ document.getElementById('ejModal').classList.remove('show'); }

// Sin argumento carga el primero, para no romper llamadas antiguas.
function cargarEjemplo(id){
  const ej = EJEMPLOS.find(e=>e.id === id) || EJEMPLOS[0];
  registrarCambio();
  nodos=[]; tramos=[]; nodoSeq=0; tramoSeq=0; vaciarSeleccionPF(); R=null;
  pesos=[]; pesoSeq=0; pesoActivo=null;
  // Nudo en coordenada EXACTA: addNodo engancha a la rejilla, cuyo paso
  // depende del zoom.
  const N = (x,y)=>{
    const n = {id:++nodoSeq, x, y, nombre:'', apoyo:null, apAng:90, apModo:'angulo', apLado:2,
               apAngFijo:90, rotula:false, tope:null};
    nodos.push(n); return n;
  };
  const b = ej.armar(N);
  const eb=document.getElementById('pB'); if(eb) eb.value = b || 1;
  if(typeof sincronizarAnchoB === 'function') sincronizarAnchoB();   // 09-
  reNombrar(); centrar(); refrescar(); calcular();
  comprobarEjemploPF(ej);
  cerrarEjemplos();
}

function openUnitsModal(){
  document.getElementById('selLen').value = unitLen;
  document.getElementById('selFor').value = unitFor;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const L = document.getElementById('selLen').value, F = document.getElementById('selFor').value;
  document.getElementById('upP').textContent = F+'/'+L+'²';
  document.getElementById('upG').textContent = F+'/'+L+'³';
}
// Fija las unidades vigentes y sus rótulos. La usan applyUnits y deshacer (04-),
// que devuelve las unidades de la instantánea junto con sus números.
function fijarUnidades(nL, nF){
  unitLen=nL; unitFor=nF;
  const ch=document.getElementById('chipUnits'); if(ch) ch.textContent=nL+' · '+nF;
  ['uL5','uL6','uL7'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nL; });
  ['uG1','uG2'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nF+'/'+nL+'³'; });
}
function applyUnits(){
  const nL=document.getElementById('selLen').value, nF=document.getElementById('selFor').value;
  // Con las mismas unidades (o una que no se conoce) no hay nada que convertir
  // ni paso de deshacer.
  if((nL===unitLen && nF===unitFor) || !LEN_A_M[nL] || !FOR_A_KN[nF]){ closeUnitsModal(); return; }
  const kL=LEN_A_M[unitLen]/LEN_A_M[nL], kF=FOR_A_KN[unitFor]/FOR_A_KN[nF];
  // Un solo paso de deshacer, y la instantánea lleva las unidades (04-): sin él,
  // deshacer devolvía la compuerta de 3 m con la unidad nueva y se leía 3 cm.
  registrarCambio();
  nodos.forEach(n=>{ n.x*=kL; n.y*=kL; });
  tramos.forEach(t=>{ t.flecha=(t.flecha||0)*kL; });
  const eb=document.getElementById('pB');
  if(eb && eb.value!=='') eb.value=(parseFloat(eb.value)||0)*kL;
  if(typeof sincronizarAnchoB === 'function') sincronizarAnchoB();   // 09-
  [1,2].forEach(z=>zonas[z].forEach(l=>{ l.niv*=kL; l.g = l.g*kF/(kL*kL*kL); }));
  // Peso propio: fuerza por unidad de superficie de placa (W = q·b·L, 01-).
  // Antes no se convertía, y en cm·N la compuerta pesaba 10 veces más.
  pesos.forEach(p=>{ const v=Number(p.val); if(isFinite(v)) p.val = v*kF/(kL*kL); });
  fijarUnidades(nL, nF);
  invalidarResultados(); closeUnitsModal(); centrar(); refrescar();
}
function fillDec(id,val){
  const s = document.getElementById(id); if(!s) return;
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
  fillDec('selDecLen',DEC.len); fillDec('selDecFor',DEC.fuerza);
  updateDecPreview(); document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  const a = document.getElementById('dpL'), b2 = document.getElementById('dpF');
  if(a) a.textContent = (3.14159).toFixed(g('selDecLen'))+' '+unitLen;
  if(b2) b2.textContent = (58.9231).toFixed(g('selDecFor'))+' '+unitFor;
}
function applyDecModal(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  DEC = {len:g('selDecLen'), fuerza:g('selDecFor')};
  document.getElementById('chipDec').textContent = textoDecimales();
  closeDecModal();
  if(R && !R.error) calcular(); else refrescar();
}
