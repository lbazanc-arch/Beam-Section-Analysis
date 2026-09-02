// ═══════════════════════════════════════════════════════════
//  INTERACCIÓN
// ═══════════════════════════════════════════════════════════

function nodoEn(mx, my){
  for(const n of nodos){
    const [px,py] = aPantalla(n.x, n.y);
    if(Math.hypot(px-mx, py-my) < 13) return n;
  }
  return null;
}

function barraEn(mx, my){
  let mejor = null, dMin = 11;
  for(const b of barras){
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    if(!na || !nb) continue;
    const [x1,y1] = aPantalla(na.x,na.y), [x2,y2] = aPantalla(nb.x,nb.y);
    const dx = x2-x1, dy = y2-y1;
    const L2 = dx*dx + dy*dy;
    if(L2 < 1) continue;
    let t = ((mx-x1)*dx + (my-y1)*dy)/L2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(mx - (x1+t*dx), my - (y1+t*dy));
    if(d < dMin){ dMin = d; mejor = b; }
  }
  return mejor;
}

function nombreNodo(i){
  // A, B, ... Z, A1, B1 ...
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return i < 26 ? L[i] : L[i%26] + Math.floor(i/26);
}

function reNombrar(){ nodos.forEach((n,i)=>n.nombre = nombreNodo(i)); }

function addNodo(x, y){
  registrarCambio();
  const n = {id:++nodoSeq, x:snap(x), y:snap(y), apoyo:null, fx:0, fy:0, cargas:[], nombre:''};
  nodos.push(n); reNombrar(); return n;
}

function addBarra(a, b){
  if(a===b) return null;
  if(barras.some(m=>(m.a===a&&m.b===b)||(m.a===b&&m.b===a))) return null;
  registrarCambio();
  const m = {id:++barraSeq, a, b};
  barras.push(m); return m;
}

function borrarNodo(id){
  registrarCambio();
  nodos = nodos.filter(n=>n.id!==id);
  barras = barras.filter(b=>b.a!==id && b.b!==id);
  reNombrar(); resultado = null; refrescar();
}
function borrarBarra(id){ registrarCambio(); barras = barras.filter(b=>b.id!==id); resultado = null; refrescar(); }

// Abre la edición de lo que haya bajo (mx,my), en coordenadas de pantalla.
// La usan tanto el 'dblclick' de ratón como el doble toque táctil, ya que
// 'dblclick' no se sintetiza de forma fiable en móvil (y menos aún cuando
// touchstart llama preventDefault()).
function intentarAbrirEdicion(mx, my){
  const n = nodoEn(mx, my);
  if(n){ abrirEdNodo(n.id); return; }
  const b = barraEn(mx, my);
  if(b) abrirEdBarra(b.id);
}

function onCanvasDown(e){
  const r = cv.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const n = nodoEn(mx, my);
  const [wx, wy] = aMundo(mx, my);

  if(tool === 'nodo'){
    if(!n) addNodo(wx, wy);
    resultado = null; refrescar();
  } else if(tool === 'barra'){
    if(n){
      if(selNodo === null){ selNodo = n.id; }
      else { addBarra(selNodo, n.id); selNodo = null; resultado = null; }
      refrescar();
    } else { selNodo = null; dibujar(); }
  } else if(tool === 'apoyo'){
    if(n) abrirApoyoModal(n.id);
  } else if(tool === 'carga'){
    if(n) abrirCarga(n.id);
  } else if(tool === 'pan'){
    iniciarPan(mx, my);
  } else if(tool === 'corte'){
    corteDrag = {x1:wx, y1:wy};
    corte = {x1:wx, y1:wy, x2:wx, y2:wy};
    dibujar();
  } else if(tool === 'sel'){
    // No se decide aún si es un toque (alterna selección) o una pulsación
    // sostenida (mueve la selección) ni si se traza un recuadro: eso se
    // resuelve en onCanvasMove/onCanvasUp según haya arrastre o no.
    const b = n ? null : barraEn(mx, my);
    gesto = { modo:'sel', hitNodo: n ? n.id : null, hitBarra: b ? b.id : null,
              x0: mx, y0: my, wx0: wx, wy0: wy, moved: false, mantenido: false };
    if(!n && !b) armarEsperaDeRecuadro(gesto);
  } else if(tool === 'borrar'){
    // Igual que 'sel' pero para borrar: un toque sin arrastre elimina el
    // elemento tocado; un arrastre siempre se resuelve como recuadro de
    // borrado (aquí no tiene sentido "mover" nada).
    const b = n ? null : barraEn(mx, my);
    gesto = { modo:'borrar', hitNodo: n ? n.id : null, hitBarra: b ? b.id : null,
              x0: mx, y0: my, moved: false, mantenido: false };
    if(!n && !b) armarEsperaDeRecuadro(gesto);
  }
}
// Tras UMBRAL_MANTENER_MS sosteniendo sobre zona vacía sin haberse movido
// aún, habilita el recuadro de selección/borrado masivo. Si el arrastre ya
// empezó antes de eso, esta función llega tarde y no hace nada (el gesto ya
// se resolvió como desplazamiento del panel).

function onCanvasMove(e){
  const r = cv.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  mouseW = aMundo(mx, my);
  if(dragNodo !== null){
    const n = nodos.find(x=>x.id===dragNodo);
    if(n){ n.x = snap(mouseW[0]); n.y = snap(mouseW[1]); resultado = null; }
  }
  if(panDrag){ moverPan(mx, my); return; }
  if(corteDrag){ corte.x2 = mouseW[0]; corte.y2 = mouseW[1]; dibujar(); }

  if(gesto){
    const dx = mx - gesto.x0, dy = my - gesto.y0;
    if(!gesto.moved && Math.hypot(dx,dy) > UMBRAL_ARRASTRE){
      gesto.moved = true;
      if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); }
      const esVacio = gesto.hitNodo === null && gesto.hitBarra === null;
      if(esVacio && !gesto.mantenido){
        // Arrastre rápido sobre zona vacía, sin sostener lo suficiente antes:
        // se interpreta como desplazamiento del panel, igual que la
        // herramienta Pan, para no exigir cambiar de herramienta solo para
        // moverse por el dibujo.
        gesto.tipo = 'pan-temporal';
        iniciarPan(gesto.x0, gesto.y0);
        moverPan(mx, my);   // aplica ya este mismo movimiento, no solo el siguiente
      } else if(gesto.modo === 'borrar'){
        // En modo borrar, una vez sostenido lo suficiente, cualquier arrastre
        // es un recuadro de borrado: no tiene sentido "mover" un elemento
        // que se está por eliminar.
        gesto.tipo = 'rubber-borrar';
      } else if(gesto.hitNodo !== null){
        // Arrastrar un nudo ya seleccionado mueve TODO el grupo; arrastrar uno
        // que no estaba seleccionado lo convierte en la única selección.
        const grupo = selNodos.indexOf(gesto.hitNodo) >= 0 ? selNodos.slice() : [gesto.hitNodo];
        if(selNodos.indexOf(gesto.hitNodo) < 0){ selNodos = grupo; selBarras = []; selBarra = null; selNodoInfo = null; }
        gesto.tipo = 'mover';
        registrarCambio();
        gesto.origenes = grupo.map(id=>{
          const nn = nodos.find(z=>z.id===id);
          return nn ? {id, x:nn.x, y:nn.y} : null;
        }).filter(Boolean);
      } else if(esVacio && gesto.mantenido){
        gesto.tipo = 'rubber';
      }
      // tocar/arrastrar una barra no la mueve (sigue a sus nudos); ese caso
      // se resuelve como toque simple al soltar, más abajo.
    }
    if(gesto.tipo === 'mover'){
      const wdx = mouseW[0] - gesto.wx0, wdy = mouseW[1] - gesto.wy0;
      gesto.origenes.forEach(o=>{
        const nn = nodos.find(z=>z.id===o.id);
        if(nn){ nn.x = snap(o.x + wdx); nn.y = snap(o.y + wdy); }
      });
      resultado = null; dibujar();
    } else if(gesto.tipo === 'rubber' || gesto.tipo === 'rubber-borrar'){
      gesto.x1 = mx; gesto.y1 = my;
      dibujar();
    }
  }

  if(dragNodo !== null || (tool==='barra' && selNodo!==null)) dibujar();
}
function onCanvasUp(){
  soltarPan();
  if(dragNodo!==null){ dragNodo = null; refrescar(); }
  if(corteDrag){
    corteDrag = null;
    const L = Math.hypot(corte.x2-corte.x1, corte.y2-corte.y1);
    if(L < 1e-6) corte = null;
    refrescar();
    if(metodo === 'secciones' && resultado){
      const c = document.getElementById('corteBox');
      if(c){ c.innerHTML = renderSeccionCorte();
             try{ renderKatex(c); }catch(e){} }
    }
  }
  if(gesto){
    if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); }
    if(gesto.tipo === 'pan-temporal'){
      // El arrastre se resolvió como desplazamiento del panel: no se toca
      // selección ni modelo alguno.
      gesto = null;
      return;
    }
    if(gesto.modo === 'borrar'){
      if(gesto.hitNodo!==null || gesto.hitBarra!==null || gesto.tipo==='rubber-borrar') registrarCambio();
      if(!gesto.moved){
        // Toque simple: borra el elemento tocado, uno por uno.
        if(gesto.hitNodo !== null){
          barras = barras.filter(b => b.a!==gesto.hitNodo && b.b!==gesto.hitNodo);
          nodos = nodos.filter(nn => nn.id !== gesto.hitNodo);
          reNombrar();
        } else if(gesto.hitBarra !== null){
          barras = barras.filter(b => b.id !== gesto.hitBarra);
        }
      } else if(gesto.tipo === 'rubber-borrar'){
        // Arrastre tipo CAD: borra automáticamente todo lo que el recuadro
        // capturó, en cuanto se suelta el botón/dedo.
        const {nodosIds, barrasIds} = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
        barras = barras.filter(b => barrasIds.indexOf(b.id) < 0
                                 && nodosIds.indexOf(b.a) < 0 && nodosIds.indexOf(b.b) < 0);
        nodos = nodos.filter(nn => nodosIds.indexOf(nn.id) < 0);
        reNombrar();
      }
      resultado = null; refrescar();
      gesto = null;
      return;
    }
    if(!gesto.moved){
      // Toque simple, sin arrastre: alterna la selección tocada (o la limpia
      // si se tocó una zona vacía del lienzo).
      if(gesto.hitNodo !== null){
        const i = selNodos.indexOf(gesto.hitNodo);
        if(i >= 0) selNodos.splice(i,1); else selNodos.push(gesto.hitNodo);
        selBarra = null;
        selNodoInfo = gesto.hitNodo;
      } else if(gesto.hitBarra !== null){
        const i = selBarras.indexOf(gesto.hitBarra);
        if(i >= 0) selBarras.splice(i,1); else selBarras.push(gesto.hitBarra);
        selBarra = gesto.hitBarra;
        selNodoInfo = null;
      } else {
        selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null;
      }
      refrescar();
    } else if(gesto.tipo === 'mover'){
      refrescar();
    } else if(gesto.tipo === 'rubber'){
      const {nodosIds, barrasIds} = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selNodos = nodosIds; selBarras = barrasIds;
      // La selección múltiple con recuadro nunca muestra la caja de
      // información de un elemento individual (ni nudo ni barra), aunque
      // haya capturado uno solo: esa caja es exclusiva del toque simple.
      selBarra = null;
      selNodoInfo = null;
      refrescar();
    }
    gesto = null;
  }
}
// Intersección de dos segmentos (para saber si una barra "toca" el recuadro
// de selección múltiple, no solo si queda contenida en él).
function segmentosCruzan(ax,ay,bx,by, cx,cy,dx,dy){
  const d1 = (dx-cx)*(ay-cy) - (dy-cy)*(ax-cx);
  const d2 = (dx-cx)*(by-cy) - (dy-cy)*(bx-cx);
  const d3 = (bx-ax)*(cy-ay) - (by-ay)*(cx-ax);
  const d4 = (bx-ax)*(dy-ay) - (by-ay)*(dx-ax);
  return ((d1>0&&d2<0)||(d1<0&&d2>0)) && ((d3>0&&d4<0)||(d3<0&&d4>0));
}

function setTool(t){
  tool = t; selNodo = null;
  ['nodo','barra','apoyo','carga','corte','sel','pan'].forEach(k=>{
    const el = document.getElementById('t'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.classList.toggle('active', k===t);
  });
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t==='borrar');
  const hints = {
    nodo:'Haz clic en el lienzo para colocar un nudo.',
    barra:'Haz clic en un nudo y luego en otro para unirlos.',
    apoyo:'Haz clic sobre un nudo y elige el tipo de apoyo, o quítalo.',
    corte:'Arrastra una línea que atraviese la armadura de lado a lado.',
    carga:'Haz clic sobre un nudo para aplicarle una carga.',
    pan:'Arrastra el lienzo para desplazar la vista.',
    sel:'Toca para seleccionar · arrastra un objeto para moverlo · sobre zona vacía, mantén presionado y luego arrastra para encerrar varios (un arrastre rápido solo desplaza el panel) · doble clic para editar.',
    borrar:'Toca un elemento para borrarlo · sobre zona vacía, mantén presionado y luego arrastra para encerrar y borrar varios (un arrastre rápido solo desplaza el panel).'
  };
  const th = document.getElementById('toolHint');
  if(th) th.textContent = hints[t] || '';
  const ch = document.getElementById('canvasHint');
  if(ch) ch.textContent = hints[t] || '';
  dibujar();
}

// setModo() se eliminó junto con el conmutador "Dibujo libre"/"Plantilla":
// apuntaba a #mLibre y #libreBox, que ya no existen. El dibujo libre sigue
// disponible a través de las herramientas de la barra superior.
function setTipo(t, btn){
  tipoTpl = t;
  document.querySelectorAll('.tpl-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  dibujarRefPlantilla();
}

// ── Panel plegable (diseño estándar BSA) ──
// ── Panel de dos niveles ──
// El botón de plegado abre o cierra la barra de botones (nivel 1).
// Al elegir un botón de la Zona 1 se despliega su sección (nivel 2).
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  tpl :{titulo:'Plantilla',     btn:'rbTpl'},
  met :{titulo:'Método',        btn:'rbMet'},
  ele :{titulo:'Elementos',     btn:'rbEle'}
};
let seccionAbierta = null;

function posicionarToggle(){
  const p = document.getElementById('leftPanel');
  const f = document.getElementById('panelFlyout');
  const b = document.getElementById('panelToggle');
  if(!p || !b) return;
  const railAbierto = !p.classList.contains('plegado');
  const flyAbierto  = f && !f.classList.contains('plegado');
  b.classList.toggle('corrido', railAbierto);
  b.classList.toggle('expandido', railAbierto && flyAbierto);
}

function togglePanel(){
  const p = document.getElementById('leftPanel');
  if(!p) return;
  const seCierra = !p.classList.contains('plegado');
  p.classList.toggle('plegado');
  if(seCierra) cerrarSeccion();      // al plegar la barra se cierra su sección
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  // volver a pulsar el mismo botón cierra la sección
  if(seccionAbierta === id && !f.classList.contains('plegado')){ cerrarSeccion(); return; }
  seccionAbierta = id;
  Object.keys(SECCIONES).forEach(k=>{
    const cont = document.getElementById('sec' + k.charAt(0).toUpperCase() + k.slice(1));
    if(cont) cont.style.display = (k===id) ? '' : 'none';
    const bt = document.getElementById(SECCIONES[k].btn);
    if(bt) bt.classList.toggle('active', k===id);
  });
  document.getElementById('flyoutTitulo').textContent = SECCIONES[id].titulo;
  f.classList.remove('plegado');
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

function cerrarSeccion(){
  const f = document.getElementById('panelFlyout');
  if(f) f.classList.add('plegado');
  seccionAbierta = null;
  Object.keys(SECCIONES).forEach(k=>{
    const bt = document.getElementById(SECCIONES[k].btn);
    if(bt) bt.classList.remove('active');
  });
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

// ── Desplazamiento por el panel (arrastrar la vista) ──
let panDrag = null;
function iniciarPan(mx, my){ panDrag = {mx, my, vx, vy}; }
function moverPan(mx, my){
  if(!panDrag) return false;
  vx = panDrag.vx - (mx - panDrag.mx)/escala;
  vy = panDrag.vy + (my - panDrag.my)/escala;
  dibujar();
  return true;
}
function soltarPan(){ panDrag = null; }

// ── Guardar el ejercicio como proyecto con nombre ──





function zoomIn(){ escala = Math.min(escala*1.25, 4000); dibujar(); }
function zoomOut(){ escala = Math.max(escala/1.25, 0.02); dibujar(); }

function centrar(){
  if(!nodos.length){ vx = 0; vy = 0; escala = 45; dibujar(); return; }
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  vx = (x0+x1)/2; vy = (y0+y1)/2;
  const dx = Math.max(x1-x0, 1), dy = Math.max(y1-y0, 1);
  escala = Math.min((W-140)/dx, (H-140)/dy);
  // El límite inferior debe permitir armaduras grandes: en centímetros una luz
  // de 800 necesita ~1.3 px/unidad, y el antiguo tope de 6 la dejaba fuera.
  escala = Math.max(0.02, Math.min(escala, 900));
  dibujar();
}

function limpiarTodo(){
  registrarCambio();
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0;
  selNodo = null; resultado = null; selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null;
  document.getElementById('resultsArea').style.display = 'none';
  const rp = document.getElementById('resultsPanel');
  if(rp){ rp.innerHTML = ''; rp.style.display = 'none'; }
  const h = document.getElementById('noResultsHint');
  if(h) h.style.display = '';
  refrescar();
}

function refrescar(){ dibujar(); pintarLista(); }

// ── Edición de coordenadas ──
function abrirEdNodo(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  edNodoId = id;
  document.getElementById('edNodoNom').textContent = n.nombre;
  document.getElementById('edNx').value = n.x;
  document.getElementById('edNy').value = n.y;
  document.getElementById('edNuL').textContent = unitLen;
  document.getElementById('edNuF').textContent = unitFor;
  const nCargas = (n.cargas && n.cargas.length) ? n.cargas.length : ((!esCero(n.fx||0)||!esCero(n.fy||0)) ? 1 : 0);
  const rc = document.getElementById('edNCargasResumen');
  if(rc) rc.textContent = nCargas
    ? nCargas + (nCargas===1 ? ' fuerza asignada' : ' fuerzas asignadas')
      + ' \u00b7 resultante Fx=' + dec(n.fx||0,'f') + ', Fy=' + dec(n.fy||0,'f') + ' ' + unitFor
    : 'Sin cargas asignadas.';
  document.getElementById('edNodoModal').classList.add('show');
}
function closeEdNodo(){ document.getElementById('edNodoModal').classList.remove('show'); edNodoId = null; }
function applyEdNodo(){
  const n = nodos.find(z=>z.id===edNodoId);
  if(n){
    registrarCambio();
    const g = id => parseFloat(document.getElementById(id).value);
    if(isFinite(g('edNx'))) n.x = g('edNx');
    if(isFinite(g('edNy'))) n.y = g('edNy');
    resultado = null;
  }
  closeEdNodo(); refrescar();
}

function abrirEdBarra(id){
  const b = barras.find(z=>z.id===id); if(!b) return;
  const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
  if(!na || !nb) return;
  edBarraId = id; selBarra = id;
  document.getElementById('edBarraNom').textContent = nombreBarra(b);
  document.getElementById('edBn1').textContent = na.nombre;
  document.getElementById('edBn1b').textContent = na.nombre;
  document.getElementById('edBn2').textContent = nb.nombre;
  document.getElementById('edBn2b').textContent = nb.nombre;
  document.getElementById('edBx1').value = na.x;
  document.getElementById('edBy1').value = na.y;
  document.getElementById('edBx2').value = nb.x;
  document.getElementById('edBy2').value = nb.y;
  document.getElementById('edBlen').textContent =
    dec(Math.hypot(nb.x-na.x, nb.y-na.y),'len') + ' ' + unitLen;
  document.getElementById('edBarraModal').classList.add('show');
  dibujar();
}
function closeEdBarra(){ document.getElementById('edBarraModal').classList.remove('show'); edBarraId = null; }
function applyEdBarra(){
  const b = barras.find(z=>z.id===edBarraId);
  if(b){
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const g = id => parseFloat(document.getElementById(id).value);
    if(na){ if(isFinite(g('edBx1'))) na.x = g('edBx1'); if(isFinite(g('edBy1'))) na.y = g('edBy1'); }
    if(nb){ if(isFinite(g('edBx2'))) nb.x = g('edBx2'); if(isFinite(g('edBy2'))) nb.y = g('edBy2'); }
    resultado = null;
  }
  closeEdBarra(); refrescar();
}

// ── Selección, eliminar y replicar ──
function infoSeleccion(){
  const el = document.getElementById('tbSelInfo');
  if(!el) return;
  const a = selNodos.length, b = selBarras.length;
  el.textContent = (!a && !b) ? 'Nada seleccionado'
    : 'Seleccionado: ' + [a?a+' nudo'+(a>1?'s':''):null, b?b+' barra'+(b>1?'s':''):null]
        .filter(Boolean).join(' y ');
}

let apoyoNodoId = null;
function abrirApoyoModal(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  apoyoNodoId = id;
  document.getElementById('apNom').textContent = n.nombre;
  actualizarPrevApoyo();
  document.getElementById('apoyoModal').classList.add('show');
}
function closeApoyoModal(){ document.getElementById('apoyoModal').classList.remove('show'); apoyoNodoId = null; }
