// ═══════════════════════════════════════════════════════════
//  INTERACCIÓN
// ═══════════════════════════════════════════════════════════
function marcado(lista,id){ return lista.indexOf(id)>=0; }
function nodoEn(mx,my){
  for(const n of nodos){ const [px,py]=aPantalla(n.x,n.y);
    if(Math.hypot(px-mx,py-my)<13) return n; }
  return null;
}
function tramoEn(mx,my){
  let mejor=null, dm=12;
  for(const t of tramos){
    const pts = puntosTramo(t,40);
    for(let i=0;i<pts.length-1;i++){
      const [ax,ay]=aPantalla(pts[i].x,pts[i].y), [bx,by]=aPantalla(pts[i+1].x,pts[i+1].y);
      const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
      if(l2<1) continue;
      let s=((mx-ax)*dx+(my-ay)*dy)/l2; s=Math.max(0,Math.min(1,s));
      const d=Math.hypot(mx-(ax+s*dx), my-(ay+s*dy));
      if(d<dm){ dm=d; mejor=t; }
    }
  }
  return mejor;
}
function addNodo(x,y){
  const n={id:++nodoSeq,x:snap(x),y:snap(y),nombre:'',apoyo:null,apAng:90,rotula:false,tope:null};
  nodos.push(n); reNombrar(); return n;
}
function addTramo(a,b,tipo){
  if(a===b) return null;
  if(tramos.some(t=>(t.a===a&&t.b===b)||(t.a===b&&t.b===a))) return null;
  const t={id:++tramoSeq,a,b,tipo:tipo||'recto',flecha:(tipo==='arco'?0.6:0),activo:true,invertir:false};
  tramos.push(t); return t;
}
function onDown(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const n=nodoEn(mx,my); const [wx,wy]=aMundo(mx,my);
  if(tool==='nudo'){ if(!n){ registrarCambio(); addNodo(wx,wy); } R=null; refrescar(); }
  else if(tool==='recto'||tool==='arco'){
    if(n){ if(selNodo===null) selNodo=n.id;
      else { registrarCambio(); addTramo(selNodo,n.id,tool==='arco'?'arco':'recto'); selNodo=null; R=null; }
      refrescar(); }
    else { selNodo=null; dibujar(); }
  }
  else if(tool==='apoyo'){ if(n) abrirApoyoModal(n.id); }
  else if(tool==='rotula'){ if(n){ registrarCambio(); n.rotula=!n.rotula; R=null; refrescar(); } }
  else if(tool==='tope'){ if(n) abrirTopeModal(n.id); }
  else if(tool==='pan'){ iniciarPan(mx,my); }
  else if(tool==='sel' || tool==='borrar'){
    // Botón unificado "Mover / editar" (o "Eliminar" interactivo): aún no se
    // decide si será un toque (alterna selección / borra), un arrastre sobre
    // un elemento (lo mueve / arma un recuadro de borrado), un arrastre
    // rápido en vacío (paneo temporal) o uno sostenido en vacío (recuadro
    // múltiple). Se resuelve en onMove/onUp.
    let hit = null;
    if(n) hit = {tipo:'nodo', id:n.id};
    else { const t=tramoEn(mx,my); if(t) hit = {tipo:'tramo', id:t.id}; }
    gesto = { modo:tool, hit, x0:mx, y0:my, wx0:wx, wy0:wy, moved:false, mantenido:false };
    if(!hit) armarEsperaDeRecuadro(gesto);
  }
}
let panDrag = null;
function iniciarPan(mx,my){ panDrag={mx,my,vx,vy}; }
function soltarPan(){ panDrag=null; }
function onMove(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  if(panDrag){ vx=panDrag.vx-(mx-panDrag.mx)/escala; vy=panDrag.vy+(my-panDrag.my)/escala; dibujar(); return; }
  mouseW=aMundo(mx, my);

  // ── Botón unificado "Mover / editar" (criterio cap9) ──
  if(gesto){
    if(!gesto.moved){
      const dx=mx-gesto.x0, dy=my-gesto.y0;
      if(Math.hypot(dx,dy) > UMBRAL_ARRASTRE){
        gesto.moved = true;
        if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId=null; }
        const esVacio = gesto.hit === null;
        if(esVacio && !gesto.mantenido){
          gesto.tipo='pan-temporal';
          panDrag = {mx:gesto.x0, my:gesto.y0, vx, vy};
        } else if(gesto.modo==='borrar'){
          // En modo borrar cualquier arrastre se resuelve como recuadro de
          // borrado: no tiene sentido mover algo que se va a eliminar.
          gesto.tipo='rubber-borrar';
          mostrarRecuadroSeleccion('borrar');
        } else if(esVacio && gesto.mantenido){
          gesto.tipo='rubber';
          mostrarRecuadroSeleccion();
        } else if(gesto.hit.tipo==='nodo'){
          registrarCambio();   // un solo paso de deshacer para todo el arrastre
          const grupo = selN.indexOf(gesto.hit.id)>=0 ? selN.slice() : [gesto.hit.id];
          if(selN.indexOf(gesto.hit.id)<0){ selN = grupo; infoNodo = gesto.hit.id; }
          gesto.tipo='mover';
          gesto.origenes = grupo.map(id=>{ const nn=nodos.find(z=>z.id===id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        } else {
          // Tramo: se mueve como bloque rígido junto con sus dos nudos (y
          // los de cualquier otro tramo que ya estuviera seleccionado).
          registrarCambio();   // un solo paso de deshacer para todo el arrastre
          const grupoT = selT.indexOf(gesto.hit.id)>=0 ? selT.slice() : [gesto.hit.id];
          if(selT.indexOf(gesto.hit.id)<0){ selT = grupoT; infoTramo = gesto.hit.id; }
          const idsNodos = new Set(selN);
          grupoT.forEach(tid=>{ const t=tramos.find(z=>z.id===tid); if(t){ idsNodos.add(t.a); idsNodos.add(t.b); } });
          gesto.tipo='mover';
          gesto.origenes = [...idsNodos].map(id=>{ const nn=nodos.find(z=>z.id===id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        }
      }
    }
    if(gesto.tipo==='mover'){
      const wdx = mouseW[0]-gesto.wx0, wdy = mouseW[1]-gesto.wy0;
      gesto.origenes.forEach(o=>{
        const nn=nodos.find(z=>z.id===o.id);
        if(nn){ nn.x=snap(o.x+wdx); nn.y=snap(o.y+wdy); }
      });
      R=null; dibujar();
    } else if(gesto.tipo==='rubber' || gesto.tipo==='rubber-borrar'){
      gesto.x1=mx; gesto.y1=my;
      actualizarRecuadroSeleccion(gesto);
    }
    return;
  }
}
function onUp(){
  if(gesto){
    if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
    if(gesto.tipo==='pan-temporal'){ panDrag=null; gesto=null; return; }
    if(gesto.modo==='borrar'){
      // Un toque sin arrastre borra el elemento tocado; un arrastre borra
      // todo lo que el recuadro haya abarcado. Se permanece en modo borrar
      // para seguir eliminando sin tener que volver a pulsar el botón.
      let bN=[], bT=[];
      if(!gesto.moved){
        if(gesto.hit){
          if(gesto.hit.tipo==='nodo') bN=[gesto.hit.id];
          else bT=[gesto.hit.id];
        }
      } else if(gesto.tipo==='rubber-borrar'){
        const r = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
        bN = r.ns; bT = r.ts;
      }
      ocultarRecuadroSeleccion();
      if(bN.length || bT.length){
        registrarCambio();
        tramos = tramos.filter(t=>!marcado(bT,t.id) && !marcado(bN,t.a) && !marcado(bN,t.b));
        nodos  = nodos.filter(n=>!marcado(bN,n.id));
        selN = selN.filter(id=>!marcado(bN,id));
        selT = selT.filter(id=>!marcado(bT,id));
        if(marcado(bN, infoNodo)) infoNodo = null;
        if(marcado(bT, infoTramo)) infoTramo = null;
        reNombrar(); R = null;
      }
      gesto = null;
      refrescar();
      return;
    }
    if(!gesto.moved){
      if(gesto.hit){
        if(gesto.hit.tipo==='nodo'){ const i=selN.indexOf(gesto.hit.id); i>=0?selN.splice(i,1):selN.push(gesto.hit.id); infoNodo=gesto.hit.id; }
        else { const i=selT.indexOf(gesto.hit.id); i>=0?selT.splice(i,1):selT.push(gesto.hit.id); infoTramo=gesto.hit.id; }
      } else {
        selN=[]; selT=[]; infoNodo=null; infoTramo=null;
      }
    } else if(gesto.tipo==='rubber'){
      const {ns, ts} = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selN = ns; selT = ts;
      infoNodo = ns.length ? ns[ns.length-1] : null;
      infoTramo = ts.length ? ts[ts.length-1] : null;
      ocultarRecuadroSeleccion();
    }
    gesto = null;
    refrescar();
    return;
  }
  soltarPan();
}

// ── Recuadro de selección (overlay simple sobre el lienzo, criterio cap9) ──
function mostrarRecuadroSeleccion(modo){
  const esBorrado = modo === 'borrar';
  let box = document.getElementById('rubberBandBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'rubberBandBox';
    document.getElementById('canvasArea').appendChild(box);
  }
  box.style.cssText = 'position:absolute; pointer-events:none; z-index:6; border:1.5px dashed '
    + (esBorrado ? 'rgba(192,57,43,.85)' : '#0f5c56') + '; background:'
    + (esBorrado ? 'rgba(192,57,43,.12)' : 'rgba(15,92,86,.10)') + ';';
  box.style.display = 'block';
}
function actualizarRecuadroSeleccion(g){
  const box = document.getElementById('rubberBandBox');
  if(!box) return;
  const x0=Math.min(g.x0,g.x1), x1=Math.max(g.x0,g.x1);
  const y0=Math.min(g.y0,g.y1), y1=Math.max(g.y0,g.y1);
  box.style.left=x0+'px'; box.style.top=y0+'px';
  box.style.width=(x1-x0)+'px'; box.style.height=(y1-y0)+'px';
}
function ocultarRecuadroSeleccion(){
  const box = document.getElementById('rubberBandBox');
  if(box) box.style.display='none';
}
// Nudos y tramos que caen dentro del recuadro (coords de pantalla). Un tramo
// cuenta si sus DOS nudos quedan dentro (evita ambigüedad con tramos que
// solo lo atraviesan).
function elementosEnRecuadro(x0,y0,x1,y1){
  const rx0=Math.min(x0,x1), rx1=Math.max(x0,x1);
  const ry0=Math.min(y0,y1), ry1=Math.max(y0,y1);
  const dentro = (px,py)=> px>=rx0 && px<=rx1 && py>=ry0 && py<=ry1;
  const ns = nodos.filter(n=>{ const [px,py]=aPantalla(n.x,n.y); return dentro(px,py); }).map(n=>n.id);
  const ts = tramos.filter(t=>{
    const na=nodos.find(z=>z.id===t.a), nb=nodos.find(z=>z.id===t.b);
    if(!na||!nb) return false;
    const [ax,ay]=aPantalla(na.x,na.y), [bx,by]=aPantalla(nb.x,nb.y);
    return dentro(ax,ay) && dentro(bx,by);
  }).map(t=>t.id);
  return {ns, ts};
}

// ── Estado del puente táctil (criterio cap6/cap9) ──────────────────────────
let pinchDist = null, ultimoTap = 0, ultimoTapX = 0, ultimoTapY = 0;
function cancelarGestoEnCurso(){
  if(gesto && gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
  panDrag = null; gesto = null; pinchDist = null;
  ocultarRecuadroSeleccion();
}
function activarEliminar(){
  if(selN.length || selT.length){ eliminarSeleccion(); return; }
  setTool('borrar');
}

function onDbl(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const n=nodoEn(mx,my);
  if(n){ abrirEdNodo(n.id); return; }
  const t=tramoEn(mx,my);
  if(t){ infoTramo=t.id; if(selT.indexOf(t.id)<0) selT.push(t.id); refrescar(); }
}

function setTool(t){
  tool=t; selNodo=null;
  ['nudo','recto','arco','apoyo','rotula','tope','sel','pan'].forEach(k=>{
    const el=document.getElementById('t'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.classList.toggle('active',k===t);
  });
  // El botón Eliminar no sigue el patrón de id 't'+Nombre, se marca aparte.
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t==='borrar');
  const hints={nudo:'Haz clic para colocar un nudo.',
    recto:'Haz clic en dos nudos para unirlos con un tramo recto.',
    arco:'Haz clic en dos nudos para unirlos con un tramo curvo.',
    apoyo:'Haz clic en un nudo y elige el tipo de apoyo.',
    rotula:'Haz clic en un nudo para poner o quitar una rótula interna.',
    tope:'Haz clic en un nudo para colocar una fuerza incógnita con su dirección.',
    pan:'Arrastra el lienzo para desplazar la vista.',
    sel:'Toca para seleccionar (varios) · mantén presionado y arrastra para mover · doble clic para editar.',
    borrar:'Toca un nudo o un tramo para borrarlo · sobre zona vacía, mantén presionado y luego arrastra para encerrar y borrar varios (un arrastre rápido solo desplaza el panel).'};
  const ch=document.getElementById('canvasHint'); if(ch) ch.textContent=hints[t]||'';
  dibujar();
}
// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
//  Instantáneas del modelo (geometría + líquidos). La vista no se guarda:
//  deshacer restaura la compuerta, no el encuadre.
// ═══════════════════════════════════════════════════════════
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  return JSON.stringify({
    nodos:  nodos.map(n=>Object.assign({}, n)),
    tramos: tramos.map(t=>Object.assign({}, t)),
    zonas:  {1: zonas[1].map(l=>Object.assign({}, l)),
             2: zonas[2].map(l=>Object.assign({}, l))},
    nodoSeq, tramoSeq
  });
}
// Llamar ANTES de modificar el modelo.
function registrarCambio(){
  pilaDeshacer.push(instantanea());
  if(pilaDeshacer.length > MAX_HISTORIAL) pilaDeshacer.shift();
  pilaRehacer = [];
  actualizarBotonesHistorial();
}
function restaurarInstantanea(txt){
  const e = JSON.parse(txt);
  nodos  = e.nodos.map(n=>Object.assign({}, n));
  tramos = e.tramos.map(t=>Object.assign({}, t));
  zonas  = {1: e.zonas[1].map(l=>Object.assign({}, l)),
            2: e.zonas[2].map(l=>Object.assign({}, l))};
  nodoSeq = e.nodoSeq; tramoSeq = e.tramoSeq;
  selN = selN.filter(id=>nodos.some(n=>n.id===id));
  selT = selT.filter(id=>tramos.some(t=>t.id===id));
  if(!nodos.some(n=>n.id===infoNodo))   infoNodo = null;
  if(!tramos.some(t=>t.id===infoTramo)) infoTramo = null;
  selNodo = null;
  R = null;
  refrescar();
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

function eliminarSeleccion(){
  if(!selN.length && !selT.length){ aviso('Selecciona algo con la herramienta Mover / editar.', 'error'); return; }
  registrarCambio();
  tramos = tramos.filter(t=>selT.indexOf(t.id)<0 && selN.indexOf(t.a)<0 && selN.indexOf(t.b)<0);
  nodos = nodos.filter(n=>selN.indexOf(n.id)<0);
  selN=[]; selT=[]; R=null; reNombrar(); refrescar();
}

// ── El grupo de nudos que abarca la selección actual (nudos + extremos de
//    los tramos marcados), igual criterio que en cap7.
function nodosDeSeleccion(){
  const ids = new Set(selN);
  selT.forEach(id=>{ const t=tramos.find(z=>z.id===id); if(t){ ids.add(t.a); ids.add(t.b); } });
  return [...ids];
}
function tramosDeGrupo(idsNodos){
  return tramos.filter(t=>idsNodos.indexOf(t.a)>=0 && idsNodos.indexOf(t.b)>=0).map(t=>t.id);
}

// ── Edición de un nudo por doble clic (mismo contrato que armaduras y fuerzas) ──
let edNodoId = null;
function abrirEdNodo(id){
  const n = nodos.find(z=>z.id===id); if(!n) return;
  edNodoId = id;
  document.getElementById('edNodoNom').textContent = n.nombre || '';
  document.getElementById('edNx').value = n.x;
  document.getElementById('edNy').value = n.y;
  const u = document.getElementById('edNuL');
  if(u) u.textContent = (typeof unitLen !== 'undefined') ? unitLen : '';
  document.getElementById('edNodoModal').classList.add('show');
  const inp = document.getElementById('edNx'); if(inp) setTimeout(()=>inp.focus(), 50);
}
function closeEdNodo(){ document.getElementById('edNodoModal').classList.remove('show'); edNodoId = null; }
function applyEdNodo(){
  const n = nodos.find(z=>z.id===edNodoId); if(!n){ closeEdNodo(); return; }
  const x = parseFloat(document.getElementById('edNx').value);
  const y = parseFloat(document.getElementById('edNy').value);
  if(!isFinite(x) || !isFinite(y)){ aviso('Escribe valores numéricos para x e y.', 'error'); return; }
  registrarCambio();
  n.x = x; n.y = y; R = null;
  closeEdNodo(); refrescar();
}
