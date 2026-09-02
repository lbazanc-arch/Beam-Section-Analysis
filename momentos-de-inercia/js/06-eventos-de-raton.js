// ═══════════════════════════════════════════════════════════
//  MOUSE EVENTS
// ═══════════════════════════════════════════════════════════
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('dblclick', onDblClick);
canvas.addEventListener('wheel', onWheel, {passive:false});
canvas.addEventListener('mouseleave', () => { ghostPos=null; render(); });

// ── TOUCH EVENTS (mobile/tablet drag) ──
// ── EVENTOS TÁCTILES ──
// Puente hacia el MISMO motor de gestos del ratón (patrón de cap6 y cap9): en
// lugar de duplicar la lógica de arrastre, los eventos de un dedo se reenvían a
// onMouseDown / onMouseMove / onMouseUp con un objeto sintético {clientX,
// clientY}. Así el toque simple, el arrastre de figuras, el pan temporal y el
// recuadro de selección se comportan igual en móvil que en PC. Con dos dedos se
// hace zoom de pellizco y se cancela el gesto de un dedo que hubiera en curso.
let ultimoTap = 0, ultimoTapPos = null;
let pinchDist = null, pinchMid = null;

// Anula cualquier gesto pendiente y sus efectos visuales.
function cancelarGestoEnCurso(){
  if(gesto){
    if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
    ocultarRecuadroSeleccion();
    gesto = null;
  }
  isDragging = false; isDraggingFig = false; dragFigId = null; dragAnchorId = null;
}

canvas.addEventListener('touchstart', e=>{
  if(e.touches.length === 1){
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = t.clientX - rect.left, my = t.clientY - rect.top;

    // Doble toque: en táctil no se dispara 'dblclick', así que sin esto la
    // ventana de edición sería inalcanzable desde el celular o la tableta.
    const ahora = Date.now();
    const cerca = ultimoTapPos && Math.hypot(mx-ultimoTapPos.x, my-ultimoTapPos.y) < 26;
    if(!selectedFigType && ahora - ultimoTap < 320 && cerca){
      ultimoTap = 0; ultimoTapPos = null;
      cancelarGestoEnCurso();
      const h = hitTest(mx, my);
      if(h) abrirEdicionFigura(h.id);
      e.preventDefault();
      return;
    }
    ultimoTap = ahora; ultimoTapPos = {x:mx, y:my};

    onMouseDown({clientX:t.clientX, clientY:t.clientY});
    e.preventDefault();
  } else if(e.touches.length === 2){
    // Dos dedos: se suspende cualquier gesto de un dedo y empieza el pellizco.
    cancelarGestoEnCurso();
    const a = e.touches[0], b = e.touches[1];
    pinchDist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const rect = canvas.getBoundingClientRect();
    pinchMid = {x:(a.clientX+b.clientX)/2-rect.left, y:(a.clientY+b.clientY)/2-rect.top};
    render();
    e.preventDefault();
  }
}, {passive:false});

canvas.addEventListener('touchmove', e=>{
  if(e.touches.length === 1){
    const t = e.touches[0];
    onMouseMove({clientX:t.clientX, clientY:t.clientY});
    e.preventDefault();
  } else if(e.touches.length === 2 && pinchDist !== null){
    const a = e.touches[0], b = e.touches[1];
    const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const factor = d / pinchDist;
    if(isFinite(factor) && factor > 0){
      // Misma matemática que onWheel: el punto medio entre los dedos se
      // mantiene fijo en coordenadas de mundo mientras cambia la escala.
      const antes = screenToWorld(pinchMid.x, pinchMid.y);
      viewScale = Math.max(0.1, Math.min(50, viewScale*factor));
      const despues = screenToWorld(pinchMid.x, pinchMid.y);
      viewTx += (despues.x-antes.x)*viewScale;
      viewTy -= (despues.y-antes.y)*viewScale;
      render();
    }
    pinchDist = d;
    e.preventDefault();
  }
}, {passive:false});

canvas.addEventListener('touchend', e=>{
  if(e.touches.length < 2) pinchDist = null;
  if(e.touches.length === 0) onMouseUp();
}, {passive:false});

// Sin esto, una llamada entrante o el gesto "atrás" del sistema dejaban el
// arrastre a medias: touchend nunca llega y la figura se quedaba pegada al dedo.
canvas.addEventListener('touchcancel', ()=>{
  pinchDist = null;
  cancelarGestoEnCurso();
  ghostPos = null;
  render();
}, {passive:false});


function getCanvasPos(e){
  const rect = canvas.getBoundingClientRect();
  return {x: e.clientX-rect.left, y: e.clientY-rect.top};
}

function onMouseMove(e){
  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x,sp.y);

  // Update canvas hint with coordinates
  document.getElementById('canvasHint').textContent =
    `x: ${r2(wp.x)} ${unit}  y: ${r2(wp.y)} ${unit}`;

  if(selectedFigType){ ghostPos = wp; render(); return; }

  // Resolución del gesto: hasta que el puntero no recorre UMBRAL_ARRASTRE no se
  // decide nada, y así un toque nunca se confunde con un arrastre.
  if(gesto){
    if(!gesto.moved && Math.hypot(sp.x-gesto.x0, sp.y-gesto.y0) > UMBRAL_ARRASTRE){
      gesto.moved = true;
      if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId = null; }
      if(gesto.modo === 'borrar'){
        gesto.tipo = 'rubber-borrar';
        mostrarRecuadroSeleccion('borrar');
      } else if(gesto.hitFig !== null){
        // Arrastre sobre una figura: la mueve. registrarCambio() se hace AQUÍ y
        // no al pulsar, para que un toque simple no ensucie el historial.
        // Arrastrar una figura ya marcada mueve TODO el grupo marcado (mismo
        // criterio que centroide y los demás temas); arrastrar una suelta la
        // convierte en la única selección.
        gesto.tipo = 'mover';
        const f = figures.find(x=>x.id===gesto.hitFig);
        if(f){
          registrarCambio();
          const grupo = selFiguras.indexOf(f.id) >= 0 ? selFiguras.slice() : [f.id];
          if(selFiguras.indexOf(f.id) < 0) selFiguras = grupo;
          if(selectedFigId !== f.id) selectFigure(f.id);
          gesto.origenes = grupo.map(id=>{ const g=figures.find(z=>z.id===id); return g?{id, cx:g.cx, cy:g.cy}:null; }).filter(Boolean);
          isDraggingFig = true; dragFigId = f.id; dragAnchorId = 'C';
          dragFigOffset = {x: gesto.wx0 - f.cx, y: gesto.wy0 - f.cy};
        }
      } else if(gesto.mantenido){
        gesto.tipo = 'rubber';
        mostrarRecuadroSeleccion('sel');
      } else {
        // Arrastre rápido sobre zona vacía: desplaza la vista sin tocar la
        // selección. Es el pan temporal de cap6/cap9.
        gesto.tipo = 'pan-temporal';
        isDragging = true;
        dragStart = {x:gesto.x0, y:gesto.y0};
        dragViewStart = {x:viewTx, y:viewTy};
        canvas.style.cursor = 'grabbing';
      }
    }
    if(gesto.tipo === 'rubber' || gesto.tipo === 'rubber-borrar'){
      gesto.x1 = sp.x; gesto.y1 = sp.y;
      actualizarRecuadroSeleccion(gesto);
      return;
    }
  }

  if(isDragging && !isDraggingFig){
    viewTx = dragViewStart.x + (sp.x - dragStart.x);
    viewTy = dragViewStart.y + (sp.y - dragStart.y);
    render(); return;
  }
  if(isDraggingFig && dragFigId !== null){
    // Grupo de varias figuras: se trasladan todas por el mismo vector, sin
    // imantado (el imantado es de una figura sola contra las demás).
    if(gesto && gesto.tipo === 'mover' && gesto.origenes && gesto.origenes.length > 1){
      const wdx = wp.x - gesto.wx0, wdy = wp.y - gesto.wy0;
      gesto.origenes.forEach(o=>{ const g=figures.find(z=>z.id===o.id); if(g){ g.cx=o.cx+wdx; g.cy=o.cy+wdy; } });
      updatePropPanel(); results=null; render();
      return;
    }
    const fig = figures.find(f=>f.id===dragFigId);
    if(fig){
      if(dragAnchorId && dragAnchorId !== 'C'){
        const def = FIG_DEFS[fig.type];
        const off = def.anchorOffset(fig.dims, dragAnchorId);
        const rot = fig.rotation*Math.PI/180;
        const rdx = off.dx*Math.cos(rot)-off.dy*Math.sin(rot);
        const rdy = off.dx*Math.sin(rot)+off.dy*Math.cos(rot);
        fig.cx = wp.x - rdx;
        fig.cy = wp.y - rdy;
      } else {
        fig.cx = wp.x - dragFigOffset.x;
        fig.cy = wp.y - dragFigOffset.y;
      }
      // Snap to origin if very close
      if(Math.abs(fig.cx) < 2/viewScale) fig.cx = 0;
      if(Math.abs(fig.cy) < 2/viewScale) fig.cy = 0;
      // Live edge snap during drag
      if(figures.length > 1) trySnapFigure(fig);
      updatePropPanel();
      results=null; render();
    }
    return;
  }
  // Hover cursor
  const hit = hitTest(sp.x,sp.y);
  canvas.style.cursor = hit ? 'move' : (isDragging?'grabbing':'grab');
}


// ── Recuadro de selección tipo CAD ────────────────────────────────────────
// Tras UMBRAL_MANTENER_MS sosteniendo sobre zona vacía sin haberse movido aún,
// el gesto queda habilitado para trazar recuadro. Si el arrastre empezó antes,
// esta espera llega tarde y no hace nada: el gesto se resuelve como pan.
function mostrarRecuadroSeleccion(modo){
  const esBorrado = modo === 'borrar';
  let box = document.getElementById('rubberBandBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'rubberBandBox';
    box.style.cssText = 'position:absolute; pointer-events:none; z-index:6; border:1.5px dashed #0d3a8f;';
    document.getElementById('canvasArea').appendChild(box);
  }
  // Rojo al borrar, azul al seleccionar: el color anticipa lo que ocurrirá al
  // soltar, igual que en cap6 y cap9.
  box.style.borderColor = esBorrado ? 'rgba(192,57,43,.75)' : '#0d3a8f';
  box.style.background  = esBorrado ? 'rgba(192,57,43,.10)' : 'rgba(13,58,143,.10)';
  box.style.display = 'block';
}
function actualizarRecuadroSeleccion(g){
  const box = document.getElementById('rubberBandBox');
  if(!box) return;
  const x0 = Math.min(g.x0,g.x1), x1 = Math.max(g.x0,g.x1);
  const y0 = Math.min(g.y0,g.y1), y1 = Math.max(g.y0,g.y1);
  box.style.left = x0+'px'; box.style.top = y0+'px';
  box.style.width = (x1-x0)+'px'; box.style.height = (y1-y0)+'px';
}
function ocultarRecuadroSeleccion(){
  const box = document.getElementById('rubberBandBox');
  if(box) box.style.display = 'none';
}
// Figuras cuya caja delimitadora en coordenadas de mundo cruza el recuadro
// trazado en pantalla.
function figurasEnRecuadro(x0,y0,x1,y1){
  const a = screenToWorld(Math.min(x0,x1), Math.min(y0,y1));
  const b = screenToWorld(Math.max(x0,x1), Math.max(y0,y1));
  const rx0 = Math.min(a.x,b.x), rx1 = Math.max(a.x,b.x);
  const ry0 = Math.min(a.y,b.y), ry1 = Math.max(a.y,b.y);
  return figures.filter(f=>{
    const c = figuraBoundsMundo(f);
    return c.left <= rx1 && c.right >= rx0 && c.bottom <= ry1 && c.top >= ry0;
  }).map(f=>f.id);
}
// El botón Eliminar es una herramienta, no una acción suelta: si ya hay figuras
// marcadas las borra de una vez; si no, entra en modo borrado para ir tocando.
function activarEliminar(){
  if(selFiguras.length){ eliminarFiguraSel(); return; }
  setHerramienta('borrar');
}

function onMouseDown(e){
  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x,sp.y);

  if(selectedFigType){
    // Place figure
    placeFigure(selectedFigType, wp.x, wp.y);
    return;
  }

  // Check anchor handle first
  if(selectedFigId){
    const fig = figures.find(f=>f.id===selectedFigId);
    if(fig){
      const def = FIG_DEFS[fig.type];
      for(const a of def.anchors||['C']){
        // El tirador central se salta con Mover / editar y con Eliminar: cae
        // justo en el centroide, así que se tragaba los toques en el centro de
        // la figura y el segundo toque nunca llegaba a desmarcarla. Arrastrar
        // el cuerpo ya mueve la figura por su centroide; los tiradores de
        // esquina siguen funcionando igual.
        if(a === 'C' && (herramienta === 'sel' || herramienta === 'borrar')) continue;
        const off = def.anchorOffset(fig.dims,a);
        const rot = fig.rotation*Math.PI/180;
        const rdx = off.dx*Math.cos(rot)-off.dy*Math.sin(rot);
        const rdy = off.dx*Math.sin(rot)+off.dy*Math.cos(rot);
        const ap = worldToScreen(fig.cx+rdx, fig.cy+rdy);
        if(Math.hypot(sp.x-ap.x,sp.y-ap.y)<8){
          fig.activeAnchor = a;
          registrarCambio();          // un arrastre = un solo paso de historial
          isDraggingFig=true; dragFigId=fig.id;
          dragAnchorId = a;
          dragFigOffset={x:0,y:0};
          buildPropPanel(fig); render();
          return;
        }
      }
    }
  }

  // Mover / editar: se abre un gesto sin decidir nada todavía.
  if(herramienta === 'sel'){
    const golpe = hitTest(sp.x, sp.y);
    gesto = { modo:'sel', hitFig: golpe ? golpe.id : null, x0:sp.x, y0:sp.y,
              wx0:wp.x, wy0:wp.y, moved:false, mantenido:false };
    if(!golpe) armarEsperaDeRecuadro(gesto);
    return;
  }

  // Eliminar: igual que 'sel' pero para borrar. Un toque sin arrastre elimina la
  // figura tocada; un arrastre se resuelve siempre como recuadro de borrado.
  if(herramienta === 'borrar'){
    const golpe = hitTest(sp.x, sp.y);
    gesto = { modo:'borrar', hitFig: golpe ? golpe.id : null, x0:sp.x, y0:sp.y,
              wx0:wp.x, wy0:wp.y, moved:false, mantenido:false };
    if(!golpe) armarEsperaDeRecuadro(gesto);
    return;
  }

  // Check figure hit
  const hit = hitTest(sp.x,sp.y);
  if(hit){
    selectFigure(hit.id);
    registrarCambio();          // un arrastre = un solo paso de historial
    isDraggingFig=true; dragFigId=hit.id;
    dragAnchorId='C';
    dragFigOffset={x:wp.x-hit.cx, y:wp.y-hit.cy};
    return;
  }

  // Pan (respaldo)
  isDragging=true; dragStart=sp; dragViewStart={x:viewTx,y:viewTy};
  canvas.style.cursor='grabbing';
  selectFigure(null);
}


// ── EDGE SNAP SYSTEM ──
const SNAP_THRESHOLD_WORLD = 8; // snap distance in world units (dynamic with zoom)


// Snap state tracking
let snapState = null; // {movId, otherId, snapCx, snapCy}

function getFigMaxDim(fig) {
  const d = fig.dims || {};
  const type = fig.type || '';
  if(type==='circle'||type==='semicircle'||type==='quarter') return (d.r||50)*2;
  if(type==='sector') return (d.r||50)*2;
  if(d.b!==undefined && d.h!==undefined) return Math.max(d.b, d.h);
  if(d.r!==undefined) return d.r*2;
  return 100;
}

function getSnapThreshold(figA, figB) {
  // 12% of average largest dimension — comfortable snap zone
  return 0.12 * (getFigMaxDim(figA) + getFigMaxDim(figB)) / 2;
}
function getDetachThreshold(figA, figB) {
  return 2 * getSnapThreshold(figA, figB);
}
function getFigBounds(fig) {
  if(!fig || !fig.dims) return {xmin:-50,xmax:50,ymin:-50,ymax:50,hw:50,hh:50};
  const def = FIG_DEFS[fig.type];
  if(def && def.bounds) {
    const b = def.bounds(fig.dims);
    const rot = (fig.rotation||0)*Math.PI/180;
    const corners = [{x:b.left,y:b.bottom},{x:b.right,y:b.bottom},{x:b.right,y:b.top},{x:b.left,y:b.top}];
    const rx = corners.map(c=>c.x*Math.cos(rot)-c.y*Math.sin(rot));
    const ry = corners.map(c=>c.x*Math.sin(rot)+c.y*Math.cos(rot));
    const xmin=fig.cx+Math.min(...rx), xmax=fig.cx+Math.max(...rx);
    const ymin=fig.cy+Math.min(...ry), ymax=fig.cy+Math.max(...ry);
    const hw=(xmax-xmin)/2, hh=(ymax-ymin)/2;
    return {xmin,xmax,ymin,ymax,hw,hh};
  }
  const d=fig.dims; let hw=50,hh=50;
  const type=fig.type||'';
  if(type==='circle'||type==='semicircle'||type==='quarter'){hw=hh=d.r||50;}
  else if(type==='sector'){hw=d.r||50;hh=d.r||50;}
  else if(d.b!==undefined&&d.h!==undefined){hw=d.b/2;hh=d.h/2;}
  else if(d.r!==undefined){hw=hh=d.r;}
  return {xmin:fig.cx-hw,xmax:fig.cx+hw,ymin:fig.cy-hh,ymax:fig.cy+hh,hw,hh};
}

function trySnapFigure(movingFig) {
  const mb = getFigBounds(movingFig);
  // If currently snapped, check for detach
  if(snapState && snapState.movId === movingFig.id) {
    const other = figures.find(f=>f.id===snapState.otherId);
    if(other) {
      const detach = getDetachThreshold(movingFig, other);
      const pullDist = Math.hypot(movingFig.cx - snapState.snapCx, movingFig.cy - snapState.snapCy);
      if(pullDist > detach) { snapState=null; return false; } // detached
      movingFig.cx = snapState.snapCx; movingFig.cy = snapState.snapCy;
      return true;
    }
    snapState = null;
  }
  // Look for new snap
  let bestSnap=null, bestDist=Infinity;
  for(const other of figures) {
    if(other.id === movingFig.id) continue;
    const ob = getFigBounds(other);
    const thr = getSnapThreshold(movingFig, other);
    // Deep overlap = user wants to stack
    const olX = Math.min(mb.xmax,ob.xmax)-Math.max(mb.xmin,ob.xmin);
    const olY = Math.min(mb.ymax,ob.ymax)-Math.max(mb.ymin,ob.ymin);
    const minW = Math.min(mb.xmax-mb.xmin, ob.xmax-ob.xmin);
    const minH = Math.min(mb.ymax-mb.ymin, ob.ymax-ob.ymin);
    if(olX>minW*0.5 && olY>minH*0.5) continue;
    // 4 edge pairs
    const pairs = [
      {d:Math.abs(mb.xmin-ob.xmax), dx:ob.xmax-mb.xmin, dy:0},
      {d:Math.abs(mb.xmax-ob.xmin), dx:ob.xmin-mb.xmax, dy:0},
      {d:Math.abs(mb.ymin-ob.ymax), dx:0, dy:ob.ymax-mb.ymin},
      {d:Math.abs(mb.ymax-ob.ymin), dx:0, dy:ob.ymin-mb.ymax}
    ];
    for(const p of pairs) {
      if(p.d<thr && p.d<bestDist) { bestDist=p.d; bestSnap={dx:p.dx,dy:p.dy,otherId:other.id}; }
    }
  }
  if(bestSnap) {
    movingFig.cx += bestSnap.dx; movingFig.cy += bestSnap.dy;
    snapState = {movId:movingFig.id, otherId:bestSnap.otherId, snapCx:movingFig.cx, snapCy:movingFig.cy};
    return true;
  }
  return false;
}

function onMouseUp(){
  if(isDraggingFig && dragFigId !== null) {
    updatePropPanel(); render();
  }
  isDragging=false; isDraggingFig=false; dragFigId=null; dragAnchorId=null;

  if(gesto){
    if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId = null; }

    if(gesto.tipo === 'pan-temporal'){
      // El arrastre se resolvió como desplazamiento de la vista: la selección
      // no se toca.
      gesto = null;
      canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default';
      return;
    }

    if(gesto.modo === 'borrar'){
      // Un toque borra la figura tocada; un arrastre borra cuanto abarque el
      // recuadro. Un solo registrarCambio() por operación.
      let aBorrar = [];
      if(!gesto.moved){
        if(gesto.hitFig !== null) aBorrar = [gesto.hitFig];
      } else if(gesto.tipo === 'rubber-borrar'){
        aBorrar = figurasEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      }
      ocultarRecuadroSeleccion();
      if(aBorrar.length){
        registrarCambio();
        figures = figures.filter(f => aBorrar.indexOf(f.id) < 0);
        if(aBorrar.indexOf(selectedFigId) >= 0) selectFigure(null);
        selFiguras = selFiguras.filter(id => aBorrar.indexOf(id) < 0);
        results = null; renderFigList(); cerrarEdicionSiSobra();
        aviso(aBorrar.length === 1 ? 'Figura eliminada.'
                                   : aBorrar.length + ' figuras eliminadas.');
      }
      actualizarInfoSel(); render();
      gesto = null;
      canvas.style.cursor = 'default';
      return;   // se permanece en modo borrado para seguir eliminando
    }

    if(!gesto.moved){
      // Toque simple: alterna la marca de la figura tocada, o limpia la
      // selección si se tocó zona vacía.
      if(gesto.hitFig !== null){
        alternarSelFigura(gesto.hitFig);
        selectFigure(selFiguras.indexOf(gesto.hitFig) >= 0
          ? gesto.hitFig
          : (selFiguras.length ? selFiguras[selFiguras.length-1] : null));
      } else {
        selFiguras = []; selectFigure(null); actualizarInfoSel();
      }
      renderFigList(); render();
    } else if(gesto.tipo === 'mover'){
      renderFigList(); actualizarInfoSel(); render();
    } else if(gesto.tipo === 'rubber'){
      selFiguras = figurasEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selectFigure(selFiguras.length ? selFiguras[selFiguras.length-1] : null);
      ocultarRecuadroSeleccion();
      renderFigList(); actualizarInfoSel(); render();
    }
    gesto = null;
  }
  canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default';
}

function onDblClick(e){
  const sp = getCanvasPos(e);
  const hit = hitTest(sp.x,sp.y);
  if(hit) abrirEdicionFigura(hit.id);
}

// ── Ventana de edición de una figura (doble clic o doble toque) ──
// Mismo mecanismo que cap9: el panel de propiedades ya existe y es rico
// (dimensiones por tipo, signo, anclas, posición), así que en vez de duplicarlo
// se TRASLADA el nodo #propPanel al cuerpo de la ventana y al cerrar vuelve a su
// sitio exacto en la columna. Nunca hay dos copias que puedan desincronizarse, y
// cualquier campo que se añada al panel aparece aquí solo.
let _propPanelPadre = null, _propPanelAncla = null;

function abrirEdicionFigura(id){
  const fig = figures.find(f=>f.id===id);
  if(!fig) return;
  if(gesto){
    if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
    gesto = null;
  }
  selFiguras = [id];
  selectFigure(id);                      // llena el panel con esta figura

  const pp = document.getElementById('propPanel');
  const cuerpo = document.getElementById('edFigBody');
  if(pp && cuerpo && pp.parentNode !== cuerpo){
    // Se recuerda de dónde salió para devolverlo al mismo lugar.
    _propPanelPadre = pp.parentNode;
    _propPanelAncla = pp.nextSibling;
    cuerpo.appendChild(pp);
  }
  if(pp) pp.style.display = 'block';

  const nom = document.getElementById('edFigNom');
  if(nom) nom.textContent = fig.etiqueta ? (fig.name + ' ' + fig.etiqueta) : (fig.name || '');
  document.getElementById('edFigModal').classList.add('show');
  actualizarInfoSel();
  render();
}

// Devuelve el panel a la columna y cierra la ventana. Los cambios ya se
// aplicaron en caliente, así que no hay nada que confirmar ni revertir.
function cerrarEdicionFigura(){
  const pp = document.getElementById('propPanel');
  if(pp && _propPanelPadre){
    _propPanelPadre.insertBefore(pp, _propPanelAncla);
    _propPanelPadre = null; _propPanelAncla = null;
  }
  const m = document.getElementById('edFigModal');
  if(m) m.classList.remove('show');
  render();
}

// Tocar el fondo oscuro cierra la ventana; tocar dentro de la tarjeta, no.
function cerrarEdicionSiFondo(e){
  if(e.target === document.getElementById('edFigModal')) cerrarEdicionFigura();
}

// Para quien prefiera seguir trabajando con la columna abierta al costado.
function edicionAlPanel(){
  cerrarEdicionFigura();
  try{ abrirSeccion('fig'); }catch(e){}
  const pp = document.getElementById('propPanel');
  if(pp){
    pp.style.display = 'block';
    setTimeout(()=>{
      try{ pp.scrollIntoView({block:'nearest',behavior:'smooth'}); }catch(e){}
      pp.classList.add('recien-abierto');
      setTimeout(()=>pp.classList.remove('recien-abierto'), 900);
    }, 260);
  }
}

function onWheel(e){
  e.preventDefault();
  const sp = getCanvasPos(e);
  const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
  const wBefore = screenToWorld(sp.x,sp.y);
  viewScale *= factor;
  viewScale = Math.max(0.1, Math.min(50, viewScale));
  const wAfter = screenToWorld(sp.x,sp.y);
  viewTx += (wAfter.x-wBefore.x)*viewScale;
  viewTy -= (wAfter.y-wBefore.y)*viewScale;
  render();
}

function hitTest(sx,sy){
  for(const fig of [...figures].reverse()){
    const sp = worldToScreen(fig.cx,fig.cy);
    // Centroid dot hit
    if(Math.hypot(sx-sp.x,sy-sp.y)<10) return fig;
    // Better bounding: use actual figure radius
    const def = FIG_DEFS[fig.type];
    if(!def) continue;
    const d = fig.dims;
    let hw=50, hh=50;
    if(d.b !== undefined && d.h !== undefined){ hw=d.b/2; hh=d.h/2; }
    else if(d.r !== undefined){ hw=hh=d.r; }
    else if(d.R !== undefined){ hw=hh=d.R; }
    else if(d.a !== undefined && d.b !== undefined){ hw=d.a; hh=d.b; }
    else if(d.B !== undefined && d.H !== undefined){ hw=d.B/2; hh=d.H/2; }
    const dx=(sx-sp.x)/viewScale, dy=(sy-sp.y)/viewScale;
    if(Math.abs(dx)<=hw+6 && Math.abs(dy)<=hh+6) return fig;
  }
  return null;
}
