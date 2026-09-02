// ═══════════════════════════════════════════════════════════
//  PROYECTOS GUARDADOS  (máx. 10, con nombre puesto por el alumno)
// ═══════════════════════════════════════════════════════════
const MAX_PROYECTOS = 10;
function escaparTexto(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function estadoActual(){
  return {
    nodos: nodos.map(n=>({id:n.id,x:n.x,y:n.y,apoyo:n.apoyo,apAng:n.apAng,
                          rotula:n.rotula,tope:n.tope})),
    tramos: tramos.map(t=>({id:t.id,a:t.a,b:t.b,tipo:t.tipo,flecha:t.flecha,
                            activo:t.activo,invertir:t.invertir})),
    zonas: JSON.parse(JSON.stringify(zonas)),
    ancho: num('pB',1),
    unidades:{len:unitLen, fuerza:unitFor},
    decimales: DEC
  };
}


function actualizarListaProyectos(){
  const el=document.getElementById('listaProyectos'); if(!el) return;
  const n=histItems.length;
  if(!n){ el.innerHTML='Todavía no has guardado ningún ejercicio. Espacio disponible: '+MAX_PROYECTOS+'.'; return; }
  let t='<b>Guardados: '+n+' de '+MAX_PROYECTOS+'</b><br>'
    + histItems.map(it=>'· '+escaparTexto(it.titulo||'sin nombre')).join('<br>');
  if(n>=MAX_PROYECTOS) t+='<br><b style="color:#c0392b">Has llegado al máximo. Borra uno para guardar otro.</b>';
  el.innerHTML=t;
}



function pintarHistorial(){
  const el=document.getElementById('histLista'); if(!el) return;
  if(!histItems.length){
    el.innerHTML='<div class="hint-sm">Todavía no has guardado ningún ejercicio.</div>'; return; }
  el.innerHTML=histItems.map(it=>{
    const f=it.fecha?new Date(it.fecha).toLocaleDateString('es-PE'):'';
    return '<div class="item-row"><div class="nm"><b>'+escaparTexto(it.titulo||'sin nombre')+'</b>'
      +(f?' <span style="color:var(--muted);font-size:10px">· '+f+'</span>':'')+'</div>'
      +'<button class="btn-sm" style="flex:none;padding:3px 9px" onclick="cargarProyecto(\''+it.id+'\')">Abrir</button>'
      +'<button class="x" onclick="borrarProyecto(\''+it.id+'\')">×</button></div>';
  }).join('');
}
function cargarProyecto(id){
  const it=histItems.find(x=>x.id===id);
  if(!it||!it.estado){ aviso('Ese ejercicio no tiene datos para abrir.', 'error'); return; }
  const e=it.estado;
  try{
    nodos=(e.nodos||[]).map(n=>Object.assign({nombre:''},n));
    tramos=(e.tramos||[]).slice();
    nodoSeq=nodos.reduce((m,n)=>Math.max(m,n.id),0);
    tramoSeq=tramos.reduce((m,t)=>Math.max(m,t.id),0);
    if(e.zonas) zonas=e.zonas;
    if(e.unidades){ unitLen=e.unidades.len||unitLen; unitFor=e.unidades.fuerza||unitFor; }
    if(e.decimales) DEC=e.decimales;
    const eb=document.getElementById('pB'); if(eb && e.ancho) eb.value=e.ancho;
    R=null; reNombrar(); centrar(); refrescar(); cerrarHistorial();
  }catch(err){ aviso('No se pudo abrir el ejercicio.', 'error'); }
}
function borrarProyecto(id){
  /* Sin diálogo nativo de confirmación: queda silenciado en móvil y el botón
     parecía muerto. Se borra directamente, como en cap9 y cap10. */
  histPost({bsa:'hist:del', id:id});
  histItems=histItems.filter(x=>x.id!==id);
  pintarHistorial();
  aviso('Ejercicio borrado.');
}

window.addEventListener('message', ev=>{
  const d = ev.data;
  if(!d || typeof d!=='object' || d.bsa!=='hist:data' || d.app!==HIST_APP) return;
  histItems = Array.isArray(d.items) ? d.items : [];
  histUser = d.user || null;
  const g=document.getElementById('guardarModal'), hm=document.getElementById('histModal');
  if(g && g.classList.contains('show')) actualizarListaProyectos();
  if(hm && hm.classList.contains('show')) pintarHistorial();
});


// ── Jerarquía de Esc (criterio cap9): cierra lo más superficial primero ────
function manejarEsc(){
  // 1) Un modal abierto: se cierra con su función propia para no dejar estado sucio
  const cierres = {apoyoModal:'closeApoyoModal', topeModal:'closeTopeModal',
    unitsModal:'closeUnitsModal', decModal:'closeDecModal',
    guardarModal:'cerrarGuardar', histModal:'cerrarHistorial',
    transModal:'closeTransformar', repModal:'closeReplicar'};
  for(const id in cierres){
    const m = document.getElementById(id);
    if(m && m.classList.contains('show')){
      try{ window[cierres[id]](); }catch(_){ m.classList.remove('show'); }
      return;
    }
  }
  // 2) Un aviso en pantalla
  const av = document.getElementById('avisoCaja');
  if(av && av.classList.contains('visible')){ cerrarAviso(); return; }
  // 3) Un gesto a medias
  if(panDrag || gesto || pinchDist!==null){ cancelarGestoEnCurso(); dibujar(); return; }
  // 4) El primer nudo de un tramo pendiente de cerrar
  if(selNodo!==null){ selNodo=null; dibujar(); return; }
  // 5) La selección actual
  if(selN.length || selT.length || infoNodo!==null || infoTramo!==null){
    selN=[]; selT=[]; infoNodo=null; infoTramo=null; refrescar(); return;
  }
  // 6) La herramienta de borrado, para no dejarla armada sin darse cuenta
  if(tool==='borrar'){ setTool('sel'); }
}
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ manejarEsc(); return; }
  // Se ignoran si el foco está en un campo: allí Ctrl+Z debe deshacer la
  // escritura, no el dibujo.
  const et = (e.target && e.target.tagName || '').toLowerCase();
  if(et === 'input' || et === 'textarea' || et === 'select') return;
  if((e.ctrlKey || e.metaKey) && !e.altKey){
    const k = (e.key || '').toLowerCase();
    if(k === 'z' && !e.shiftKey){ e.preventDefault(); deshacer(); }
    else if(k === 'y' || (k === 'z' && e.shiftKey)){ e.preventDefault(); rehacer(); }
  }
});

window.addEventListener('load', ()=>{
  cv=document.getElementById('mainCanvas'); ctx=cv.getContext('2d');
  cv.addEventListener('mousedown',onDown);
  cv.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onUp);
  cv.addEventListener('dblclick', onDbl);
  // ── Puente táctil: un dedo delega en el motor de ratón; dos dedos hacen
  //    pellizco con las mismas cotas que zoomIn/zoomOut; el doble toque
  //    delega en onDbl porque dblclick no existe en pantallas táctiles.
  cv.addEventListener('touchstart', e=>{
    if(e.touches.length===2){
      cancelarGestoEnCurso();
      const a=e.touches[0], b=e.touches[1];
      pinchDist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      e.preventDefault(); return;
    }
    if(e.touches.length===1){
      const t=e.touches[0], ahora=Date.now();
      if(ahora-ultimoTap<350 && Math.hypot(t.clientX-ultimoTapX,t.clientY-ultimoTapY)<24){
        ultimoTap=0;
        onDbl({clientX:t.clientX,clientY:t.clientY});
        e.preventDefault(); return;
      }
      ultimoTap=ahora; ultimoTapX=t.clientX; ultimoTapY=t.clientY;
      onDown({clientX:t.clientX,clientY:t.clientY}); e.preventDefault();
    }
  },{passive:false});
  cv.addEventListener('touchmove', e=>{
    if(e.touches.length===2 && pinchDist!==null){
      const a=e.touches[0], b=e.touches[1];
      const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      if(d>0 && pinchDist>0){
        escala = Math.min(4000, Math.max(0.02, escala*d/pinchDist));
        pinchDist = d; dibujar();
      }
      e.preventDefault(); return;
    }
    if(e.touches.length===1 && pinchDist===null){
      const t=e.touches[0];
      onMove({clientX:t.clientX,clientY:t.clientY}); e.preventDefault();
    }
  },{passive:false});
  cv.addEventListener('touchend', e=>{ if(!e.touches || e.touches.length===0){ pinchDist=null; onUp(); } });
  cv.addEventListener('touchcancel', ()=>cancelarGestoEnCurso());
  cv.addEventListener('wheel',e=>{ e.preventDefault(); e.deltaY<0?zoomIn():zoomOut(); },{passive:false});
  window.addEventListener('resize',ajustarCanvas);
  ['pB'].forEach(id=>{ const e=document.getElementById(id);
    if(e) e.addEventListener('input',()=>{ R=null; refrescar(); }); });
  const ap=document.getElementById('apAng');
  if(ap) ap.addEventListener('input',actualizarPrevApoyo);
  document.getElementById('chipDec').textContent=textoDecimales();
  posicionarToggle();
  ajustarCanvas(); setTool('pan'); centrar(); refrescar(); histRequest();
});


// ═══════════════════════════════════════════════════════════
//  GUARDAR / ABRIR — archivo local del usuario
//  El ejercicio ya no vive en el navegador ni en el portal: se descarga un
//  .json que el alumno guarda donde quiera y vuelve a abrir cuando quiera.
//  En escritorio se ofrece el diálogo "Guardar como" del sistema; donde esa
//  API no existe (Firefox, Safari, móvil) se recurre a la descarga normal.
// ═══════════════════════════════════════════════════════════
const BSA_FORMATO = 'bsa9p';
const BSA_VERSION = 1;
const BSA_EXT     = '.bsa9p.json';

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60);
  return limpio || 'ejercicio';
}

function abrirGuardar(){
  const m = document.getElementById('guardarModal'); if(!m) return;
  const inp = document.getElementById('nombreProyecto');
  if(inp) inp.value = '';
  m.classList.add('show');
}
function cerrarGuardar(){
  const m = document.getElementById('guardarModal'); if(m) m.classList.remove('show');
}

async function guardarProyecto(){
  const inp = document.getElementById('nombreProyecto');
  const nombre = (inp && inp.value || '').trim();
  if(!nombre){ aviso('Ponle un nombre al ejercicio antes de guardarlo.', 'error');
               if(inp) inp.focus(); return; }

  const estado = estadoActual();
  if(!estado){ aviso('No hay nada calculado que guardar.', 'error'); return; }

  const paquete = { bsaApp: BSA_FORMATO, version: BSA_VERSION,
                    titulo: nombre, fecha: new Date().toISOString(), estado: estado };
  const texto   = JSON.stringify(paquete, null, 2);
  const archivo = nombreArchivoSeguro(nombre) + BSA_EXT;

  // Camino preferido: el diálogo del sistema, que deja elegir carpeta.
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: archivo,
        types: [{ description:'Ejercicio BSA — Presión de fluidos',
                  accept: {'application/json': ['.json']} }]
      });
      const w = await handle.createWritable();
      await w.write(texto); await w.close();
      cerrarGuardar();
      aviso('Guardado como "' + handle.name + '".');
      return;
    }catch(err){
      // Cancelar no es un error: se sale en silencio.
      if(err && err.name === 'AbortError') return;
    }
  }
  descargarComoArchivo(texto, archivo);
  cerrarGuardar();
  aviso('Descargando "' + archivo + '". Búscalo en tu carpeta de descargas.');
}

function descargarComoArchivo(texto, nombreArchivo){
  const blob = new Blob([texto], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Se revoca con retraso: algunos navegadores necesitan la URL viva
  // mientras arranca la descarga.
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function abrirHistorial(){
  const el = document.getElementById('histLista'); if(el) el.innerHTML = '';
  const m = document.getElementById('histModal'); if(m) m.classList.add('show');
}
function cerrarHistorial(){
  const m = document.getElementById('histModal'); if(m) m.classList.remove('show');
}

function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                    // permite reelegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => {
    let datos;
    try{ datos = JSON.parse(lector.result); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece de otro capítulo (' + datos.bsaApp
          + '). Se intentará abrir de todos modos.', 'error');
    const it = {id:'archivo', titulo: datos.titulo || file.name,
                estado: datos.estado || datos};
    histItems = [it];
    cargarProyecto('archivo');
    aviso('Ejercicio abierto desde "' + file.name + '".');
  };
  lector.readAsText(file);
}
