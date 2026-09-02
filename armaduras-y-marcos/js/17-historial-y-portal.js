// ═══════════════════════════════════════════════════════════
//  HISTORIAL (puente con el portal)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  PROYECTOS GUARDADOS
//  Sustituye al antiguo historial automático de ejercicios: ahora
//  el alumno decide qué guardar y le pone nombre. Máximo 10 por
//  capítulo; al llegar al tope hay que borrar uno para seguir.
// ═══════════════════════════════════════════════════════════
const HIST_APP = 'arma';
const MAX_PROYECTOS = 10;
let histItems = [], histUser = null;

function histPost(msg){
  try{ if(window.parent && window.parent!==window)
    window.parent.postMessage(Object.assign({app:HIST_APP}, msg), '*'); }catch(e){}
}
function histRequest(){ histPost({bsa:'hist:list'}); }

// ═══ Latido de actividad hacia el portal ═══
// El portal cierra la sesión por inactividad, pero no ve lo que ocurre
// dentro de este iframe. Se le avisa como mucho una vez cada 20 s.
let _ultLatido = 0;
function latidoActividad(){
  const ahora = Date.now();
  if(ahora - _ultLatido < 20000) return;
  _ultLatido = ahora;
  try{
    if(window.parent && window.parent !== window)
      window.parent.postMessage({bsa:'activo'}, '*');
  }catch(e){}
}
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>
  document.addEventListener(ev, latidoActividad, {passive:true}));

window.addEventListener('message', ev=>{
  const d = ev.data;
  if(!d || typeof d!=='object' || d.bsa!=='hist:data' || d.app!==HIST_APP) return;
  histItems = Array.isArray(d.items) ? d.items : [];
  histUser = d.user || null;
  if(document.getElementById('guardarModal').classList.contains('show'))
    actualizarListaProyectos();
  if(document.getElementById('histModal').classList.contains('show'))
    pintarHistorial();
});

// Estado completo del ejercicio, para poder reabrirlo tal cual
// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
//  Se guarda una instantánea del modelo ANTES de cada cambio que lo
//  modifica. La vista (zoom y desplazamiento) no forma parte del
//  historial: deshacer no debe moverte la cámara.
// ═══════════════════════════════════════════════════════════
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  return JSON.stringify({
    nodos: nodos.map(n=>({id:n.id, x:n.x, y:n.y, nombre:n.nombre, apoyo:n.apoyo,
                          apAng:n.apAng, fx:n.fx, fy:n.fy, cargas:(n.cargas||[]).map(c=>({fx:c.fx,fy:c.fy})), tope:n.tope})),
    barras: barras.map(b=>({id:b.id, a:b.a, b:b.b})),
    nodoSeq, barraSeq
  });
}

// Llamar ANTES de modificar el modelo.
function registrarCambio(){
  pilaDeshacer.push(instantanea());
  if(pilaDeshacer.length > MAX_HISTORIAL) pilaDeshacer.shift();
  pilaRehacer = [];              // una acción nueva invalida el camino de rehacer
  actualizarBotonesHistorial();
}

function restaurarInstantanea(txt){
  const e = JSON.parse(txt);
  nodos = e.nodos.map(n=>({id:n.id, x:n.x, y:n.y, nombre:n.nombre||'',
            apoyo:n.apoyo||null, apAng:(n.apAng!==undefined?n.apAng:90), fx:n.fx||0, fy:n.fy||0,
            cargas:(n.cargas||[]).map(c=>({fx:c.fx,fy:c.fy})), tope:n.tope||null}));
  barras = e.barras.map(b=>({id:b.id, a:b.a, b:b.b}));
  nodoSeq = e.nodoSeq; barraSeq = e.barraSeq;
  // La selección puede apuntar a elementos que ya no existen tras restaurar.
  selNodos = selNodos.filter(id=>nodos.some(n=>n.id===id));
  selBarras = selBarras.filter(id=>barras.some(b=>b.id===id));
  if(selBarra !== null && !barras.some(b=>b.id===selBarra)) selBarra = null;
  if(selNodoInfo !== null && !nodos.some(n=>n.id===selNodoInfo)) selNodoInfo = null;
  resultado = null;
  reNombrar(); refrescar();
}

function deshacer(){
  if(!pilaDeshacer.length) return;
  pilaRehacer.push(instantanea());
  restaurarInstantanea(pilaDeshacer.pop());
  actualizarBotonesHistorial();
}
function rehacer(){
  if(!pilaRehacer.length) return;
  pilaDeshacer.push(instantanea());
  restaurarInstantanea(pilaRehacer.pop());
  actualizarBotonesHistorial();
}
function actualizarBotonesHistorial(){
  const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
  if(u) u.disabled = !pilaDeshacer.length;
  if(r) r.disabled = !pilaRehacer.length;
}

function estadoActual(){
  return {
    nodos: nodos.map(n=>({id:n.id, x:n.x, y:n.y, apoyo:n.apoyo, apAng:n.apAng, fx:n.fx, fy:n.fy,
                          cargas:(n.cargas||[]).map(c=>({fx:c.fx,fy:c.fy}))})),
    barras: barras.map(b=>({id:b.id, a:b.a, b:b.b})),
    unidades: {len: unitLen, fuerza: unitFor},
    decimales: DEC,
    metodo: (typeof metodo !== 'undefined') ? metodo : 'nudos'
  };
}

function actualizarListaProyectos(){
  const el = document.getElementById('listaProyectos');
  if(!el) return;
  const n = histItems.length;
  if(!n){
    el.innerHTML = 'Todavía no has guardado ningún ejercicio. Espacio disponible: '
      + MAX_PROYECTOS + '.';
    return;
  }
  let h2 = '<b>Guardados: ' + n + ' de ' + MAX_PROYECTOS + '</b><br>'
    + histItems.map(it=>'· ' + escaparTexto(it.titulo || 'sin nombre')).join('<br>');
  if(n >= MAX_PROYECTOS)
    h2 += '<br><b style="color:#c0392b">Has llegado al máximo. '
        + 'Borra uno desde el portal para guardar otro.</b>';
  el.innerHTML = h2;
}

// El nombre lo escribe el alumno: se escapa antes de mostrarlo
function escaparTexto(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}




function pintarHistorial(){
  const el = document.getElementById('histLista');
  if(!el) return;
  if(!histItems.length){
    el.innerHTML = '<div class="hint-sm">Todavía no has guardado ningún ejercicio. '
      + 'Usa el botón Guardar de la barra de herramientas.</div>';
    return;
  }
  el.innerHTML = histItems.map(it=>{
    const f = it.fecha ? new Date(it.fecha).toLocaleDateString('es-PE') : '';
    return '<div class="item-row">'
      + '<div class="nm"><b>' + escaparTexto(it.titulo || 'sin nombre') + '</b>'
      + (f ? ' <span style="color:var(--muted);font-size:10px">· ' + f + '</span>' : '') + '</div>'
      + '<button class="btn-sm" style="flex:none;padding:3px 9px" '
      + 'onclick="cargarProyecto(\'' + it.id + '\')">Abrir</button>'
      + '<button class="x" onclick="borrarProyecto(\'' + it.id + '\')">×</button></div>';
  }).join('');
}

function cargarProyecto(id){
  const it = histItems.find(x=>x.id===id);
  if(!it || !it.estado){ aviso('Ese ejercicio no tiene datos para abrir.', 'error'); return; }
  const e = it.estado;
  try{
    nodos = (e.nodos||[]).map(n=>({id:n.id, x:n.x, y:n.y, nombre:'',
              apoyo:n.apoyo||null, apAng:(n.apAng!==undefined?n.apAng:90), fx:n.fx||0, fy:n.fy||0,
              cargas:(n.cargas||[]).map(c=>({fx:c.fx,fy:c.fy})), tope:null}));
    barras = (e.barras||[]).map(b=>({id:b.id, a:b.a, b:b.b}));
    nodoSeq = nodos.reduce((m,n)=>Math.max(m,n.id), 0);
    barraSeq = barras.reduce((m,b)=>Math.max(m,b.id), 0);
    if(e.unidades){ unitLen = e.unidades.len || unitLen; unitFor = e.unidades.fuerza || unitFor; }
    if(e.decimales) DEC = e.decimales;
    resultado = null;
    reNombrar(); centrar(); refrescar();
    cerrarHistorial();
  }catch(err){ aviso('No se pudo abrir el ejercicio.', 'error'); }
}

function borrarProyecto(id){
  if(!confirm('¿Borrar este ejercicio guardado?')) return;
  histPost({bsa:'hist:del', id:id});
  histItems = histItems.filter(x=>x.id!==id);
  pintarHistorial();
}
