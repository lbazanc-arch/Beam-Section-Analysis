// ═══════════════════════════════════════════════════════════
//  ARRANQUE
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', ()=>{
  cv = document.getElementById('mainCanvas');
  ctx = cv.getContext('2d');
  cv.addEventListener('mousedown', onCanvasDown);
  cv.addEventListener('dblclick', e=>{
    const r = cv.getBoundingClientRect();
    intentarAbrirEdicion(e.clientX - r.left, e.clientY - r.top);
  });
  cv.addEventListener('mousemove', onCanvasMove);
  window.addEventListener('mouseup', onCanvasUp);
  let pinchDist = null, pinchMid = null;
  let ultimoTapArm = 0, ultimoTapArmPos = null;
  cv.addEventListener('touchstart', e=>{
    if(e.touches.length===1){ const t=e.touches[0];
      const r = cv.getBoundingClientRect();
      const mx = t.clientX - r.left, my = t.clientY - r.top;
      const ahora = Date.now();
      const cerca = ultimoTapArmPos && Math.hypot(mx-ultimoTapArmPos.x, my-ultimoTapArmPos.y) < 26;
      if(ahora - ultimoTapArm < 320 && cerca){
        ultimoTapArm = 0; ultimoTapArmPos = null;
        intentarAbrirEdicion(mx, my);
        e.preventDefault();
        return;
      }
      ultimoTapArm = ahora; ultimoTapArmPos = {x:mx, y:my};
      onCanvasDown({clientX:t.clientX, clientY:t.clientY}); e.preventDefault(); }
    else if(e.touches.length===2){
      // dos dedos: inicia el pellizco de zoom y suspende cualquier gesto de un dedo
      gesto = null; if(dragNodo!==null){ dragNodo=null; }
      const [a,b] = e.touches;
      pinchDist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      const r = cv.getBoundingClientRect();
      pinchMid = {x:(a.clientX+b.clientX)/2-r.left, y:(a.clientY+b.clientY)/2-r.top};
      e.preventDefault();
    }
  }, {passive:false});
  cv.addEventListener('touchmove', e=>{
    if(e.touches.length===1){ const t=e.touches[0];
      onCanvasMove({clientX:t.clientX, clientY:t.clientY}); e.preventDefault(); }
    else if(e.touches.length===2 && pinchDist!==null){
      const [a,b] = e.touches;
      const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      const factor = d / pinchDist;
      if(isFinite(factor) && factor>0){
        const antes = aMundo(pinchMid.x, pinchMid.y);
        escala = Math.max(0.02, Math.min(escala*factor, 4000));
        const despues = aMundo(pinchMid.x, pinchMid.y);
        vx += antes[0]-despues[0]; vy += antes[1]-despues[1];
        dibujar();
      }
      pinchDist = d;
      e.preventDefault();
    }
  }, {passive:false});
  cv.addEventListener('touchend', e=>{
    if(e.touches.length < 2) pinchDist = null;
    if(e.touches.length === 0) onCanvasUp();
  });
  // Sin esto, una llamada entrante o el gesto "atrás" del sistema dejaban el
  // arrastre a medias: touchend nunca llega y el gesto quedaba colgado.
  cv.addEventListener('touchcancel', ()=>{
    pinchDist = null;
    if(gesto){ if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId); gesto = null; }
    dragNodo = null;
    dibujar();
  });
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    if(e.deltaY < 0) zoomIn(); else zoomOut();
  }, {passive:false});
  window.addEventListener('resize', ajustarCanvas);
  try{ new ResizeObserver(()=>ajustarCanvas()).observe(document.getElementById('canvasArea')); }catch(e){}
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape') manejarEsc();
  });  document.getElementById('chipDec').textContent = textoDecimales();
  posicionarToggle();
  ajustarCanvas();
  setTool('pan');
  setSubTab('nodos');
  actualizarBotonesHistorial();
  dibujarRefPlantilla();
  ['repDx','repDy','repN'].forEach(id=>{
    const e = document.getElementById(id);
    if(e) e.addEventListener('input', actualizarPrevRep);
  });
  ['transDx','transDy','transAng'].forEach(id=>{
    const e = document.getElementById(id);
    if(e) e.addEventListener('input', actualizarPrevTrans);
  });
  const tref = document.getElementById('transRef');
  if(tref) tref.addEventListener('change', actualizarPrevTrans);
  histRequest();
});


// ═══════════════════════════════════════════════════════════
//  GUARDAR / ABRIR — archivo local del usuario
//  El ejercicio ya no vive en el navegador ni en el portal: se descarga un
//  .json que el alumno guarda donde quiera y vuelve a abrir cuando quiera.
//  En escritorio se ofrece el diálogo "Guardar como" del sistema; donde esa
//  API no existe (Firefox, Safari, móvil) se recurre a la descarga normal.
// ═══════════════════════════════════════════════════════════
const BSA_FORMATO = 'bsa6';
const BSA_VERSION = 1;
const BSA_EXT     = '.json';          // un solo .json: la doble extensión .bsa6.json
                                      // dejaba los archivos en gris en el selector de Android
const BSA_PREFIJO = 'armaduras-';    // el tema va en el nombre, y el formato dentro (bsaApp)

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60);
  return limpio || 'ejercicio';
}

function abrirGuardar(){
  ['guardadoAviso','guardadoAcciones'].forEach(i=>{ const e = document.getElementById(i); if(e) e.style.display = 'none'; });
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
  const archivo = BSA_PREFIJO + nombreArchivoSeguro(nombre) + BSA_EXT;

  // Camino preferido: el diálogo del sistema, que deja elegir carpeta.
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: archivo,
        types: [{ description:'Ejercicio BSA — Armaduras',
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
  // Siempre queda una copia en ESTE equipo (core/comun.js): sin servidor y sin
  // archivos. Es lo que hace que guardar funcione en el teléfono.
  const enEquipo = bsaGuardarEnEquipo(BSA_FORMATO, nombre, texto);
  bsaUltimoTextoGuardado = texto;
  bsaUltimoNombreGuardado = archivo;
  if(bsaEsMovil()){ mostrarGuardadoEnEquipo(enEquipo, nombre); return; }
  const como = await bsaGuardarArchivo(texto, archivo);
  cerrarGuardar();
  // En el móvil el archivo sale como .txt (ver bsaGuardarArchivo): se avisa
  // con el nombre real, que es el que el alumno verá en Archivos.
  const guardadoComo = bsaUltimoNombreGuardado || archivo;
  if(como === 'compartido') aviso('Guardado "' + guardadoComo + '" donde elegiste.');
  else if(como === 'descargado') aviso('Descargando "' + guardadoComo + '". Búscalo en tu carpeta de descargas.');
}


function abrirHistorial(){
  pintarGuardadosEnEquipo();
  const el = document.getElementById('histLista'); if(el) el.innerHTML = '';
  const m = document.getElementById('histModal'); if(m) m.classList.add('show');
}
function cerrarHistorial(){
  const m = document.getElementById('histModal'); if(m) m.classList.remove('show');
}

// Carga un ejercicio a partir de su TEXTO, venga de un archivo o de lo que
// haya guardado en este equipo.
function _cargarEjercicioTexto(texto, nombre){
    let datos;
    try{ datos = JSON.parse(texto); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece de otro capítulo (' + datos.bsaApp
          + '). Se intentará abrir de todos modos.', 'error');
    const it = {id:'archivo', titulo: datos.titulo || nombre,
                estado: datos.estado || datos};
    histItems = [it];
    cargarProyecto('archivo');
    aviso('Ejercicio abierto desde "' + nombre + '".');
}
function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                    // permite reelegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => _cargarEjercicioTexto(lector.result, file.name);
  lector.readAsText(file);
}

// ── Guardado en ESTE equipo y salida sin nube (core/comun.js) ──
// En el teléfono no se intenta escribir un archivo: entregarlo desde el iframe
// del portal no es fiable. Se guarda aquí y se ofrece llevárselo en una pestaña
// propia, donde el gesto y el documento sí son de nivel superior.
function mostrarGuardadoEnEquipo(res, nombre){
  const av = document.getElementById('guardadoAviso');
  const ac = document.getElementById('guardadoAcciones');
  if(av){
    av.innerHTML = res.ok
      ? 'Guardado <b>' + nombre + '</b> en este equipo. Lo vuelves a abrir desde <b>Historial</b>.'
      : 'No se pudo guardar en este equipo: el almacenamiento está lleno o bloqueado. Usa «Enviar o descargar».';
    av.style.display = '';
  }
  if(ac) ac.style.display = '';
  if(res.ok) aviso('Guardado en este equipo.');
}
function enviarEjercicio(){
  if(!bsaEnviarUltimo()) aviso('El navegador bloqueó la pestaña. Permítela y vuelve a intentarlo.', 'error');
}
// Abrir y quitar lo guardado en este equipo. Los llama bsaHtmlGuardados.
function abrirEjercicioGuardado(id){
  const t = bsaLeerGuardado(BSA_FORMATO, id);
  if(!t){ aviso('Ese ejercicio ya no está en este equipo.', 'error'); return; }
  const e = bsaListaGuardados(BSA_FORMATO).find(x=>x.id === id);
  _cargarEjercicioTexto(t, (e && e.titulo) || 'ejercicio');
  cerrarHistorial();
}
function borrarEjercicioGuardado(id){
  bsaBorrarGuardado(BSA_FORMATO, id);
  pintarGuardadosEnEquipo();
}
function pintarGuardadosEnEquipo(){
  const c = document.getElementById('histGuardados');
  if(c) c.innerHTML = bsaHtmlGuardados(BSA_FORMATO);
}
