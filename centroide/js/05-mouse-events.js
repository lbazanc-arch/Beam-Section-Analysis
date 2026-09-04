// ═══════════════════════════════════════════════════════════
//  MOUSE EVENTS
// ═══════════════════════════════════════════════════════════
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('dblclick', onDblClick);
canvas.addEventListener('wheel', onWheel, {passive:false});
canvas.addEventListener('mouseleave', () => { ghostPos=null; render(); });

// ── EVENTOS TÁCTILES ──
// Puente hacia el MISMO motor de gestos del ratón (patrón tomado de cap6.html):
// en lugar de duplicar la lógica de arrastre, los eventos de un dedo se
// reenvían a onMouseDown / onMouseMove / onMouseUp con un objeto sintético
// {clientX, clientY}. Así el toque simple, el arrastre de figuras, el pan
// temporal y el recuadro de selección se comportan igual en móvil que en PC.
// Con dos dedos se hace zoom de pellizco y se cancela el gesto en curso.
let ultimoTap = 0, ultimoTapPos = null;
let pinchDist = null, pinchMid = null;

// Anula cualquier gesto pendiente y sus efectos visuales (recuadro, arrastres).
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
    const [a,b] = e.touches;
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
    const [a,b] = e.touches;
    const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const factor = d / pinchDist;
    if(isFinite(factor) && factor > 0){
      // Misma matemática que onWheel: el punto medio entre los dedos se
      // mantiene fijo en coordenadas del mundo mientras cambia la escala.
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

canvas.addEventListener('touchcancel', ()=>{
  pinchDist = null;
  cancelarGestoEnCurso();
  render();
}, {passive:false});


function getCanvasPos(e){
  const rect = canvas.getBoundingClientRect();
  return {x: e.clientX-rect.left, y: e.clientY-rect.top};
}

function onMouseMove(e){
  if(modoEspacio === '3d') return onMouseMove3d(e);     // 21-vistas-3d.js
  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x,sp.y);

  // Update canvas hint with coordinates
  document.getElementById('canvasHint').textContent =
    `x: ${r2(wp.x)} ${unit}  y: ${r2(wp.y)} ${unit}`;

  if(selectedFigType){ ghostPos = wp; render(); return; }
  if(isDragging && !isDraggingFig){
    viewTx = dragViewStart.x + (sp.x - dragStart.x);
    viewTy = dragViewStart.y + (sp.y - dragStart.y);
    render(); return;
  }
  if(isDraggingFig && dragFigId !== null){
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
      if(Math.abs(fig.cx) < 2/viewScale) fig.cx = 0;
      if(Math.abs(fig.cy) < 2/viewScale) fig.cy = 0;
      updatePropPanel();
      results=null; render();
    }
    return;
  }

  // ── Botón unificado "Mover / editar": mismo sistema de gestos que Cap. 6 ──
  if(gesto){
    if(!gesto.moved){
      const dx = sp.x - gesto.x0, dy = sp.y - gesto.y0;
      if(Math.hypot(dx,dy) > UMBRAL_ARRASTRE){
        gesto.moved = true;
        if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId = null; }
        const esVacio = gesto.hitFig === null;
        if(esVacio && !gesto.mantenido){
          // Arrastre rápido en zona vacía sin sostener antes: se interpreta
          // como desplazamiento del panel, igual que la herramienta Pan.
          gesto.tipo = 'pan-temporal';
          isDragging = true; dragStart = {x:gesto.x0, y:gesto.y0}; dragViewStart = {x:viewTx, y:viewTy};
        } else if(gesto.modo === 'borrar'){
          // En modo borrar, cualquier arrastre que no sea pan temporal es un
          // recuadro de borrado: no tiene sentido mover algo que se va a
          // eliminar. El recuadro se dibuja en rojo para distinguirlo.
          gesto.tipo = 'rubber-borrar';
          mostrarRecuadroSeleccion('borrar');
        } else if(gesto.hitFig !== null){
          // Arrastrar una figura ya seleccionada mueve TODO el grupo; arrastrar
          // una que no estaba seleccionada la convierte en la única selección.
          const grupo = selFiguras.indexOf(gesto.hitFig) >= 0 ? selFiguras.slice() : [gesto.hitFig];
          if(selFiguras.indexOf(gesto.hitFig) < 0){ selFiguras = grupo; selectFigure(gesto.hitFig); }
          gesto.tipo = 'mover';
          registrarCambio();
          gesto.origenes = grupo.map(id=>{
            const f = figures.find(z=>z.id===id);
            return f ? {id, cx:f.cx, cy:f.cy} : null;
          }).filter(Boolean);
        } else if(esVacio && gesto.mantenido){
          gesto.tipo = 'rubber';
          mostrarRecuadroSeleccion();
        }
      }
    }
    if(gesto.tipo === 'mover'){
      const wdx = wp.x - gesto.wx0, wdy = wp.y - gesto.wy0;
      gesto.origenes.forEach(o=>{
        const f = figures.find(z=>z.id===o.id);
        if(f){ f.cx = o.cx + wdx; f.cy = o.cy + wdy; }
      });
      if(figures.length > 1){
        const f0 = figures.find(z=>z.id===gesto.origenes[0].id);
      }
      updatePropPanel(); results = null; render();
    } else if(gesto.tipo === 'pan-temporal'){
      viewTx = dragViewStart.x + (sp.x - dragStart.x);
      viewTy = dragViewStart.y + (sp.y - dragStart.y);
      render();
    } else if(gesto.tipo === 'rubber' || gesto.tipo === 'rubber-borrar'){
      gesto.x1 = sp.x; gesto.y1 = sp.y;
      actualizarRecuadroSeleccion(gesto);
    }
    return;
  }

  // Hover cursor
  const hit = hitTest(sp.x,sp.y);
  canvas.style.cursor = hit ? 'move' : (isDragging?'grabbing':'grab');
}

function onMouseDown(e){
  if(modoEspacio === '3d') return onMouseDown3d(e);     // 21-vistas-3d.js
  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x,sp.y);

  // Modo desplazamiento: el arrastre del lienzo se gestiona más abajo.
  if(herramienta === 'pan' && !selectedFigType){
    isDragging=true; dragStart=sp; dragViewStart={x:viewTx,y:viewTy};
    canvas.style.cursor='grabbing';
    return;
  }

  if(selectedFigType){
    placeFigure(selectedFigType, wp.x, wp.y);
    return;
  }

  // Ancla de la figura seleccionada: objetivo pequeño y deliberado, siempre
  // es un arrastre inmediato (nunca ambiguo con un simple toque).
  if(herramienta === 'sel' && selectedFigId){
    const fig = figures.find(f=>f.id===selectedFigId);
    if(fig){
      const def = FIG_DEFS[fig.type];
      for(const a of def.anchors||['C']){
        const off = def.anchorOffset(fig.dims,a);
        const rot = fig.rotation*Math.PI/180;
        const rdx = off.dx*Math.cos(rot)-off.dy*Math.sin(rot);
        const rdy = off.dx*Math.sin(rot)+off.dy*Math.cos(rot);
        const ap = worldToScreen(fig.cx+rdx, fig.cy+rdy);
        if(Math.hypot(sp.x-ap.x,sp.y-ap.y)<8){
          fig.activeAnchor = a;
          registrarCambio();
          isDraggingFig=true; dragFigId=fig.id;
          dragAnchorId = a;
          dragFigOffset={x:0,y:0};
          buildPropPanel(fig); render();
          return;
        }
      }
    }
  }

  // Botón unificado "Mover / editar": no se decide aún si es un toque
  // (alterna selección), un arrastre sobre una figura (la mueve), un
  // arrastre rápido en vacío (pan temporal) o uno sostenido en vacío
  // (recuadro de selección múltiple tipo CAD). Eso se resuelve en
  // onMouseMove/onMouseUp según haya arrastre o no.
  if(herramienta === 'sel'){
    const hit = hitTest(sp.x, sp.y);
    gesto = { modo:'sel', hitFig: hit ? hit.id : null, x0:sp.x, y0:sp.y, wx0:wp.x, wy0:wp.y,
              moved:false, mantenido:false };
    if(!hit) armarEsperaDeRecuadro(gesto);
    return;
  }

  // Herramienta "Eliminar": igual que 'sel' pero para borrar. Un toque sin
  // arrastre elimina la figura tocada; un arrastre se resuelve siempre como
  // recuadro de borrado (aquí no tiene sentido "mover" nada).
  if(herramienta === 'borrar'){
    const hit = hitTest(sp.x, sp.y);
    gesto = { modo:'borrar', hitFig: hit ? hit.id : null, x0:sp.x, y0:sp.y, wx0:wp.x, wy0:wp.y,
              moved:false, mantenido:false };
    if(!hit) armarEsperaDeRecuadro(gesto);
    return;
  }

  // Pan (respaldo)
  isDragging=true; dragStart=sp; dragViewStart={x:viewTx,y:viewTy};
  canvas.style.cursor='grabbing';
  selectFigure(null);
}

// Tras UMBRAL_MANTENER_MS sosteniendo sobre zona vacía sin haberse movido
// aún, habilita el recuadro de selección múltiple. Si el arrastre ya
// empezó antes de eso, esta función llega tarde y no hace nada.

// ── Recuadro de selección (overlay simple sobre el lienzo) ──
function mostrarRecuadroSeleccion(modo){
  const esBorrado = modo === 'borrar';
  let box = document.getElementById('rubberBandBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'rubberBandBox';
    box.style.cssText = 'position:absolute; border:1.5px dashed #0f5c56; '
      + 'background:rgba(15,92,86,.10); pointer-events:none; z-index:6;';
    document.getElementById('canvasArea').appendChild(box);
  }
  // Rojo al borrar, verde al seleccionar: el color anticipa lo que pasará al
  // soltar, igual que en cap6.
  box.style.borderColor = esBorrado ? 'rgba(192,57,43,.75)' : '#0f5c56';
  box.style.background  = esBorrado ? 'rgba(192,57,43,.10)' : 'rgba(15,92,86,.10)';
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

// Figuras cuya caja delimitadora (mundo) se cruza con el recuadro de
// selección trazado en pantalla.
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

function onMouseUp(){
  if(modoEspacio === '3d') return onMouseUp3d();        // 21-vistas-3d.js
  if(isDraggingFig && dragFigId !== null){
    updatePropPanel(); render();
  }
  isDragging=false; isDraggingFig=false; dragFigId=null; dragAnchorId=null;

  if(gesto){
    if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); }
    if(gesto.tipo === 'pan-temporal'){
      // El arrastre se resolvió como desplazamiento del panel: no se toca
      // la selección.
      gesto = null;
      canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default';
      return;
    }

    if(gesto.modo === 'borrar'){
      // Un toque borra la figura tocada; un arrastre borra todo lo que el
      // recuadro haya abarcado. Un solo registrarCambio() por operación,
      // aunque se eliminen varias figuras de una vez.
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
        results = null; renderFigList();
      }
      actualizarInfoSel(); render();
      gesto = null;
      canvas.style.cursor = 'default';
      return;   // se permanece en modo borrar para seguir eliminando
    }

    if(!gesto.moved){
      // Toque simple, sin arrastre: alterna la figura tocada (o limpia la
      // selección si se tocó una zona vacía del lienzo).
      if(gesto.hitFig !== null){
        alternarFigura(gesto.hitFig);
      } else {
        selFiguras = []; selectFigure(null); actualizarInfoSel(); render();
      }
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
  if(modoEspacio === '3d') return onDblClick3d(e);      // 21-vistas-3d.js
  const sp = getCanvasPos(e);
  const hit = hitTest(sp.x,sp.y);
  if(hit) abrirEdicionFigura(hit.id);
}

// ── Abrir la ventana de edición de una figura ──
// El doble clic abre una ventana centrada, como el doble clic de cap6 sobre un
// nudo o una barra. La diferencia con cap6 es que allí la ventana tiene sus
// propios campos, mientras que aquí el panel de propiedades de la figura ya
// existe y es rico (dimensiones por tipo, signo, material, espesor, anclas):
// en vez de duplicarlo, se TRASLADA el nodo #propPanel al cuerpo del modal y
// al cerrar vuelve a su sitio en la columna. Nunca hay dos copias que puedan
// desincronizarse, y cualquier campo que se agregue al panel aparece solo.
let _propPanelPadre = null, _propPanelAncla = null;

function abrirEdicionFigura(id){
  const fig = figures.find(f=>f.id===id); if(!fig) return;
  selFiguras = [id];
  selectFigure(id);                      // llena el panel con esta figura
  try{ cerrarMenusZona1(); }catch(e){}

  const pp = document.getElementById('propPanel');
  const cuerpo = document.getElementById('edFigBody');
  if(pp && cuerpo && pp.parentNode !== cuerpo){
    // Se recuerda de dónde salió para devolverlo exactamente al mismo lugar.
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
  if(modoEspacio === '3d') return onWheel3d(e);         // 21-vistas-3d.js
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
  if(modoEspacio === '3d') return hitTest3d(sx,sy);     // 21-vistas-3d.js
  for(const fig of [...figures].reverse()){
    const sp = worldToScreen(fig.cx,fig.cy);
    // Centroid dot hit
    if(Math.hypot(sx-sp.x,sy-sp.y)<10) return fig;
    // Better bounding: use actual figure radius
    const def = FIG_DEFS[fig.type];
    if(!def) continue;
    const d = fig.dims;
    const dx=(sx-sp.x)/viewScale, dy=(sy-sp.y)/viewScale;
    const tolPx = 6/viewScale;   // 6px de tolerancia, convertidos a unidades del mundo
    // La caja real de la figura respecto de su centroide (bounds), que en un
    // canal, un ángulo o un triángulo no es simétrica. Antes se adivinaba a
    // partir de los nombres de las dimensiones y un perfil (d, bf, tf, tw)
    // caía en la caja por defecto de 50 unidades.
    let bx = null;
    try{ bx = def.bounds ? def.bounds(d) : null; }catch(e){}
    if(bx){
      const wx = dx, wy = -dy;                       // el eje y del mundo apunta hacia arriba
      if(wx >= bx.left-tolPx && wx <= bx.right+tolPx && wy >= bx.bottom-tolPx && wy <= bx.top+tolPx) return fig;
      continue;
    }
    let hw=50, hh=50;
    if(d.b !== undefined && d.h !== undefined){ hw=d.b/2; hh=d.h/2; }
    else if(d.r !== undefined){ hw=hh=d.r; }
    if(Math.abs(dx)<=hw+tolPx && Math.abs(dy)<=hh+tolPx) return fig;
  }
  return null;
}
