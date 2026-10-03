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
// `exacto`: la posición ya viene enganchada a la rejilla, o la escribió el alumno.
function addNodo(x,y,exacto){
  const n={id:++nodoSeq,x:exacto?x:snap(x),y:exacto?y:snap(y),nombre:'',apoyo:null,apAng:90,apModo:'angulo',apLado:2,
           apAngFijo:90,rotula:false,tope:null};
  nodos.push(n); reNombrar(); return n;
}
// El nudo que ya está en (x, y), si lo hay: un toque que engancha a la rejilla
// sobre un nudo, o unas coordenadas escritas en la ventana, lo reutilizan.
function nodoEnPunto(x, y){
  const tol = v => 1e-6*Math.max(1, Math.abs(v));
  return nodos.find(n=>Math.abs(n.x - x) <= tol(x) && Math.abs(n.y - y) <= tol(y)) || null;
}
function mismoPunto(P, Q){
  if(P.id !== null && P.id === Q.id) return true;
  return Math.abs(P.x - Q.x) <= 1e-9*Math.max(1, Math.abs(P.x))
      && Math.abs(P.y - Q.y) <= 1e-9*Math.max(1, Math.abs(P.y));
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
  // El panel de resultados se oculta solo si el modelo cambia (06-): tocar un
  // nudo que ya existe, o unir dos que ya une un tramo, no cambia nada.
  if(tool==='recto' || tool==='arco'){
    // El punto tocado: un nudo que ya existe (o uno en ese mismo sitio de la
    // rejilla) o un punto nuevo, que no entra en el modelo hasta cerrar el tramo.
    let aqui;
    if(n) aqui = {id:n.id, x:n.x, y:n.y};
    else {
      const x = snap(wx), y = snap(wy), e = nodoEnPunto(x, y);
      aqui = e ? {id:e.id, x:e.x, y:e.y} : {id:null, x, y};
    }
    const P0 = puntoPendiente;
    if(!P0){ puntoPendiente = aqui; dibujar(); return; }        // arranque: aún no cambia nada
    if(mismoPunto(P0, aqui)) return;
    if(tool === 'arco'){ abrirArcoNuevo(P0, aqui); return; }    // el radio lo pide la ventana
    // Tramo recto: se construye NUDO A NUDO, como en armaduras y fuerzas internas
    // (2026-09-27, petición del profesor): cada toque se une al anterior y la
    // cadena sigue. No hay herramienta de nudo suelto: un nudo existe porque es
    // el extremo de un tramo. La cadena se corta al cambiar de herramienta o con Esc.
    if(P0.id !== null && aqui.id !== null && _tramoEntre(P0.id, aqui.id)){ puntoPendiente = aqui; dibujar(); return; }
    registrarCambio();
    const na = (P0.id !== null && nodo(P0.id)) || addNodo(P0.x, P0.y, true);
    const nb = (aqui.id !== null && nodo(aqui.id)) || addNodo(aqui.x, aqui.y, true);
    addTramo(na.id, nb.id, 'recto');
    puntoPendiente = {id:nb.id, x:nb.x, y:nb.y};
    invalidarResultados(); refrescar();
  }
  else if(tool==='presaPoli'){ tocarPresaPoligono(wx, wy, mx, my); }   // vértices de una presa (10-)
  else if(tool==='apoyo'){ if(n) abrirApoyoModal(n.id); }
  else if(tool==='tope'){ if(n) abrirTopeModal(n.id); }
  else if(tool==='peso'){
    // Tocar un tramo le asigna (o le quita) el valor de peso elegido.
    const tr = tramoEn(mx, my);
    if(tr) asignarPesoATramo(tr.id);
    else aviso('Toca sobre un tramo para asignarle el peso.');
  }
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
    if(!hit){ const pr = presaEn(mx,my); if(pr) hit = {tipo:'presa', id:pr.id}; }   // 10-
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
  // Tramo en curso: la línea a trazos sigue al puntero (03-).
  if(!gesto && puntoPendiente && (tool==='recto' || tool==='arco')){ dibujar(); return; }
  if(!gesto && presaPend && tool==='presaPoli'){ dibujar(); return; }

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
        } else if(gesto.hit.tipo==='presa'){
          // Una presa se mueve entera (y con ella las demás presas marcadas).
          const grupoP = selP.indexOf(gesto.hit.id)>=0 ? selP.slice() : [gesto.hit.id];
          if(selP.indexOf(gesto.hit.id)<0) selP = grupoP;
          gesto.tipo='moverPresa';
          gesto.presasOrig = grupoP.map(id=>({id, copia:copiaPresa(presa(id))}));
        } else if(gesto.hit.tipo==='nodo'){
          // El paso de deshacer y el panel oculto esperan a que un nudo cambie
          // de verdad (abajo): un toque con temblor no mueve nada.
          const grupo = selN.indexOf(gesto.hit.id)>=0 ? selN.slice() : [gesto.hit.id];
          if(selN.indexOf(gesto.hit.id)<0){ selN = grupo; infoNodo = gesto.hit.id; }
          gesto.tipo='mover';
          gesto.origenes = grupo.map(id=>{ const nn=nodos.find(z=>z.id===id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        } else {
          // Tramo: se mueve como bloque rígido junto con sus dos nudos (y
          // los de cualquier otro tramo que ya estuviera seleccionado).
          const grupoT = selT.indexOf(gesto.hit.id)>=0 ? selT.slice() : [gesto.hit.id];
          if(selT.indexOf(gesto.hit.id)<0){ selT = grupoT; infoTramo = gesto.hit.id; }
          const idsNodos = new Set(selN);
          grupoT.forEach(tid=>{ const t=tramos.find(z=>z.id===tid); if(t){ idsNodos.add(t.a); idsNodos.add(t.b); } });
          gesto.tipo='mover';
          gesto.origenes = [...idsNodos].map(id=>{ const nn=nodos.find(z=>z.id===id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        }
      }
    }
    if(gesto.tipo==='moverPresa'){
      const wdx = snap(mouseW[0]-gesto.wx0), wdy = snap(mouseW[1]-gesto.wy0);
      if(!gesto.registrado && (wdx || wdy)){ registrarCambio(); invalidarResultados(); gesto.registrado = true; }
      gesto.presasOrig.forEach(o=>{
        const i = presas.findIndex(p=>p.id===o.id); if(i < 0) return;
        presas[i] = copiaPresa(o.copia); trasladarPresa(presas[i], wdx, wdy);
      });
      dibujar();
    } else if(gesto.tipo==='mover'){
      const wdx = mouseW[0]-gesto.wx0, wdy = mouseW[1]-gesto.wy0;
      const destinos = gesto.origenes.map(o=>({nn:nodos.find(z=>z.id===o.id), x:snap(o.x+wdx), y:snap(o.y+wdy)}))
                                     .filter(d=>d.nn);
      // Un solo paso de deshacer para todo el arrastre, registrado en el primer
      // movimiento que cambia algún nudo; hasta entonces el panel de resultados
      // sigue a la vista. Un toque con más de 4 px de temblor (pantalla táctil)
      // que snap deja en su sitio no es un cambio (06-: invalidarResultados).
      if(!gesto.registrado && destinos.some(d=>d.x !== d.nn.x || d.y !== d.nn.y)){
        registrarCambio(); invalidarResultados(); gesto.registrado = true;
      }
      destinos.forEach(d=>{ d.nn.x = d.x; d.nn.y = d.y; });
      dibujar();
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
      let bN=[], bT=[], bP=[];
      if(!gesto.moved){
        if(gesto.hit){
          if(gesto.hit.tipo==='nodo') bN=[gesto.hit.id];
          else if(gesto.hit.tipo==='presa') bP=[gesto.hit.id];
          else bT=[gesto.hit.id];
        }
      } else if(gesto.tipo==='rubber-borrar'){
        const r = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
        bN = r.ns; bT = r.ts; bP = r.ps;
      }
      ocultarRecuadroSeleccion();
      if(bN.length || bT.length || bP.length){
        registrarCambio();
        borrarPresas(bP);
        tramos = tramos.filter(t=>!marcado(bT,t.id) && !marcado(bN,t.a) && !marcado(bN,t.b));
        nodos  = nodos.filter(n=>!marcado(bN,n.id));
        // Fuera de la selección todo id que ya no existe, también el de un tramo
        // que cayó con su nudo; y el panel de resultados, que era del modelo de antes.
        depurarSeleccionPF();
        reNombrar(); invalidarResultados();
      }
      gesto = null;
      refrescar();
      return;
    }
    if(!gesto.moved){
      if(gesto.hit){
        if(gesto.hit.tipo==='nodo'){ const i=selN.indexOf(gesto.hit.id); i>=0?selN.splice(i,1):selN.push(gesto.hit.id); infoNodo=gesto.hit.id; }
        else if(gesto.hit.tipo==='presa'){ const i=selP.indexOf(gesto.hit.id); i>=0?selP.splice(i,1):selP.push(gesto.hit.id); }
        else { const i=selT.indexOf(gesto.hit.id); i>=0?selT.splice(i,1):selT.push(gesto.hit.id); infoTramo=gesto.hit.id; }
      } else {
        selN=[]; selT=[]; selP=[]; infoNodo=null; infoTramo=null;
      }
    } else if(gesto.tipo==='mover' && gesto.registrado
              && gesto.origenes.every(o=>{ const nn=nodos.find(z=>z.id===o.id); return !nn || (nn.x===o.x && nn.y===o.y); })){
      // Arrastrado y devuelto a su sitio: el paso de deshacer quedaría vacío.
      pilaDeshacer.pop(); actualizarBotonesHistorial();
    } else if(gesto.tipo==='rubber'){
      const {ns, ts, ps} = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selN = ns; selT = ts; selP = ps;
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
  // Una presa cuenta si TODOS sus vértices quedan dentro, como un tramo (10-).
  const ps = presas.filter(p=>{ const g = geomPresa(p); return !g.error && g.verts.every(q=>{ const [px,py]=aPantalla(q.x,q.y); return dentro(px,py); }); }).map(p=>p.id);
  return {ns, ts, ps};
}

// ── Estado del puente táctil (criterio cap6/cap9) ──────────────────────────
let pinchDist = null, ultimoTap = 0, ultimoTapX = 0, ultimoTapY = 0;
function cancelarGestoEnCurso(){
  if(gesto && gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
  panDrag = null; gesto = null; pinchDist = null;
  ocultarRecuadroSeleccion();
}
function activarEliminar(){
  if(selN.length || selT.length || selP.length){ eliminarSeleccion(); return; }
  setTool('borrar');
}

function onDbl(e){
  // Dibujando, dos toques seguidos son dos puntos del tramo, no una edición.
  if(tool==='recto' || tool==='arco' || tool==='presaPoli') return;
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const n=nodoEn(mx,my);
  if(n){ abrirEdNodo(n.id); return; }
  const t=tramoEn(mx,my);
  if(t && t.tipo === 'arco'){ abrirArcoEdicion(t.id); return; }   // su radio y su lado
  if(t){ infoTramo=t.id; if(selT.indexOf(t.id)<0) selT.push(t.id); refrescar(); return; }
  const pr=presaEn(mx,my);
  if(pr) abrirPresaEdicion(pr.id);                                // 10-
}

function setTool(t){
  tool=t; selNodo=null; puntoPendiente=null;
  if(t !== 'presaPoli') presaPend = null;
  ['recto','arco','apoyo','tope','peso','sel','pan'].forEach(k=>{
    const el=document.getElementById('t'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.classList.toggle('active',k===t);
  });
  // El botón Eliminar no sigue el patrón de id 't'+Nombre, se marca aparte.
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t==='borrar');
  const bp = document.getElementById('tPresa');      // la presa también mientras se tocan sus vértices
  if(bp) bp.classList.toggle('active', t==='presa' || t==='presaPoli');
  const hints={
    recto:'Toca para colocar nudos: cada uno se une al anterior con un tramo recto. Esc corta la cadena.',
    arco:'Toca el inicio y el fin del arco (un nudo o un punto nuevo); la ventana pide el radio.',
    apoyo:'Haz clic en un nudo y elige su apoyo o su rótula interna.',
    tope:'Haz clic en un nudo para colocar un tope liso: una fuerza incógnita, normal a la compuerta (o con la dirección que indiques).',
    peso:'Toca los tramos a los que quieras asignar el peso elegido; tócalos de nuevo para quitárselo.',
    pan:'Arrastra el lienzo para desplazar la vista.',
    presa:'Elige en la ventana cómo dibujar la presa.',
    presaPoli:'Toca los vértices de la presa; ciérrala tocando el primero. Esc cancela.',
    sel:'Toca para seleccionar (varios) · mantén presionado y arrastra para mover · doble clic para editar.',
    borrar:'Toca un nudo o un tramo para borrarlo · sobre zona vacía, mantén presionado y luego arrastra para encerrar y borrar varios (un arrastre rápido solo desplaza el panel).'};
  const ch=document.getElementById('canvasHint'); if(ch) ch.textContent=hints[t]||'';
  dibujar();
}
// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
//  Instantáneas del modelo (geometría, líquidos, unidades y ancho b). La vista no se guarda:
//  deshacer restaura la compuerta, no el encuadre.
// ═══════════════════════════════════════════════════════════
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  const eb = document.getElementById('pB');
  return JSON.stringify({
    nodos:  nodos.map(n=>Object.assign({}, n)),
    tramos: tramos.map(t=>Object.assign({}, t)),
    zonas:  {1: zonas[1].map(l=>Object.assign({}, l)),
             2: zonas[2].map(l=>Object.assign({}, l))},
    pesos:  pesos.map(p=>Object.assign({}, p)),
    presas: presas.map(copiaPresa), presaSeq,          // 10-
    // Las unidades van con el modelo: sus números solo valen en ellas, y
    // deshacer un cambio de unidades tiene que devolver las dos cosas juntas.
    unidades: {len:unitLen, fuerza:unitFor},
    // El ancho b es un campo, pero el resultado depende de él: su edición es un
    // paso de deshacer (09-), y deshacer un cambio de unidades lo devuelve tal cual.
    ancho: eb ? eb.value : '',
    nodoSeq, tramoSeq, pesoSeq
  });
}
// Llamar ANTES de modificar el modelo.
function registrarCambio(){
  // Un ancho b tecleado y sin confirmar va antes, en su propio paso (09-).
  if(typeof confirmarAnchoPendiente === 'function') confirmarAnchoPendiente();
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
  pesos = (e.pesos || []).map(p=>Object.assign({}, p)); pesoSeq = e.pesoSeq || 0;
  if(!pesos.some(p=>p.id === pesoActivo)) pesoActivo = null;
  presas = (e.presas || []).map(copiaPresa); presaSeq = e.presaSeq || 0;
  selP = selP.filter(id=>presas.some(p=>p.id===id)); presaPend = null;
  // El ancho b vuelve tal cual: está en las unidades de la instantánea, que son
  // las que se devuelven aquí abajo.
  const eb = document.getElementById('pB');
  if(eb && e.ancho !== undefined) eb.value = e.ancho;
  if(typeof sincronizarAnchoB === 'function') sincronizarAnchoB();   // 09-
  // Una instantánea sin unidades conserva las actuales.
  if(e.unidades){
    const nL = e.unidades.len || unitLen, nF = e.unidades.fuerza || unitFor;
    if(nL !== unitLen){
      const k = LEN_A_M[unitLen]/LEN_A_M[nL];
      // La vista pasa también a las unidades devueltas, conservando el encuadre:
      // sin esto, deshacer un m → cm dibujaba la compuerta en metros con la
      // escala de centímetros (unos pocos píxeles) y la rejilla enganchaba a
      // pasos de 20 m. applyUnits, en cambio, recentra.
      vx *= k; vy *= k; escala /= k;
    }
    fijarUnidades(nL, nF);   // 06-
  }
  selN = selN.filter(id=>nodos.some(n=>n.id===id));
  selT = selT.filter(id=>tramos.some(t=>t.id===id));
  if(!nodos.some(n=>n.id===infoNodo))   infoNodo = null;
  if(!tramos.some(t=>t.id===infoTramo)) infoTramo = null;
  selNodo = null; puntoPendiente = null;
  // El panel enseñaba la solución del modelo de antes de deshacer (06-).
  invalidarResultados();
  refrescar();
}
// Un b tecleado sin confirmar es un cambio más (09-): deshacer lo quita primero,
// y rehacer ya no tiene nada que rehacer, como tras cualquier cambio nuevo.
function deshacer(){
  if(typeof confirmarAnchoPendiente === 'function') confirmarAnchoPendiente();
  if(!pilaDeshacer.length) return;
  pilaRehacer.push(instantanea());
  restaurarInstantanea(pilaDeshacer.pop());
  actualizarBotonesHistorial();
}
function rehacer(){
  if(typeof confirmarAnchoPendiente === 'function') confirmarAnchoPendiente();
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
  if(!selN.length && !selT.length && !selP.length){ aviso('Selecciona algo con la herramienta Mover / editar.', 'error'); return; }
  registrarCambio();
  borrarPresas(selP.slice());
  tramos = tramos.filter(t=>selT.indexOf(t.id)<0 && selN.indexOf(t.a)<0 && selN.indexOf(t.b)<0);
  nodos = nodos.filter(n=>selN.indexOf(n.id)<0);
  // Lo borrado era la selección: se vacía entera (infoNodo e infoTramo incluidos)
  // y se oculta el panel de resultados (06-).
  vaciarSeleccionPF(); invalidarResultados(); reNombrar(); refrescar();
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
  // La unidad va junto a cada campo, como el ° en la ventana del apoyo.
  document.querySelectorAll('#edNodoModal .uLen').forEach(s=>{ s.textContent = unitLen; });
  // Bajo cada icono, lo que el nudo tiene ahora.
  const ta = document.getElementById('edNApoyoTxt');
  if(ta) ta.textContent = (n.apoyo === 'fijo' ? 'Apoyo fijo' : (n.apoyo === 'movil' ? 'Apoyo móvil' : 'Sin apoyo'))
                        + (n.rotula ? ' · rótula' : '');
  const tt = document.getElementById('edNTopeTxt');
  if(tt) tt.textContent = n.tope ? 'Con tope' : 'Sin tope';
  document.getElementById('edNodoModal').classList.add('show');
  const inp = document.getElementById('edNx'); if(inp) setTimeout(()=>inp.focus(), 50);
}
function closeEdNodo(){ document.getElementById('edNodoModal').classList.remove('show'); edNodoId = null; }
function applyEdNodo(){
  const n = nodos.find(z=>z.id===edNodoId); if(!n){ closeEdNodo(); return; }
  const x = parseFloat(document.getElementById('edNx').value);
  const y = parseFloat(document.getElementById('edNy').value);
  if(!isFinite(x) || !isFinite(y)){ aviso('Escribe valores numéricos para x e y.', 'error'); return; }
  // Aplicar las mismas coordenadas no es un cambio: ni paso de deshacer ni panel oculto.
  if(x === n.x && y === n.y){ closeEdNodo(); return; }
  registrarCambio();
  n.x = x; n.y = y; invalidarResultados();
  closeEdNodo(); refrescar();
}

// ═══════════════════════════════════════════════════════════
//  TRAMO CURVO: dos puntos y el radio, al estilo del ARC de AutoCAD
//  (2026-09-27, petición del profesor). Los dos puntos se tocan en el lienzo
//  —un nudo que ya existe o un punto nuevo de la rejilla— y la ventana los
//  enseña con sus coordenadas, que se pueden corregir a mano; ahí se piden el
//  radio, hacia qué lado se comba y si es el arco mayor. Nada entra en el
//  modelo hasta Aplicar. El modelo sigue guardando la FLECHA (01-): el radio es
//  una conversión de borde y los archivos no cambian. Con doble clic sobre un
//  arco, o con su botón de la lista, la misma ventana edita su radio y su lado.
// ═══════════════════════════════════════════════════════════
function _numCampo(v){ return String(+(+v).toFixed(6)); }
function _campoArco(id, v, soloLectura){
  const e = document.getElementById(id); if(!e) return;
  e.value = v; e.readOnly = !!soloLectura;
  e.style.background = soloLectura ? 'var(--bg,#f3f5f7)' : '';
}
function _prepararArco(modo, a, b, extra){
  arcoVentana = Object.assign({modo, lado:1,
    A0:{id:a.id, x:a.x, y:a.y, tx:_numCampo(a.x), ty:_numCampo(a.y)},
    B0:{id:b.id, x:b.x, y:b.y, tx:_numCampo(b.x), ty:_numCampo(b.y)}}, extra || {});
  const fijo = modo === 'editar';
  _campoArco('arAx', arcoVentana.A0.tx, fijo); _campoArco('arAy', arcoVentana.A0.ty, fijo);
  _campoArco('arBx', arcoVentana.B0.tx, fijo); _campoArco('arBy', arcoVentana.B0.ty, fijo);
}
function abrirArcoNuevo(Pa, Pb){
  _prepararArco('nuevo', Pa, Pb);
  // Por defecto, un cuarto de circunferencia: la compuerta radial de siempre.
  const c = Math.hypot(Pb.x - Pa.x, Pb.y - Pa.y);
  document.getElementById('arR').value = _numCampo(c/Math.SQRT2);
  document.getElementById('arMayor').checked = false;
  document.getElementById('arTitulo').textContent = 'Tramo curvo nuevo';
  _abrirVentanaArco();
}
function abrirArcoEdicion(id){
  const t = tramos.find(z=>z.id===id); if(!t || t.tipo !== 'arco') return;
  const a = nodo(t.a), b = nodo(t.b); if(!a || !b) return;
  const c = Math.hypot(b.x - a.x, b.y - a.y);
  const r = radioDesdeFlecha(c, t.flecha || 0) || {R:c/Math.SQRT2, mayor:false, lado:1};
  _prepararArco('editar', a, b, {tramo:id, lado:r.lado});
  document.getElementById('arR').value = _numCampo(r.R);
  document.getElementById('arMayor').checked = r.mayor;
  document.getElementById('arTitulo').textContent = 'Tramo curvo ' + nomTramo(t);
  _abrirVentanaArco();
}
function _abrirVentanaArco(){
  document.querySelectorAll('#arcoModal .uLen').forEach(s=>{ s.textContent = unitLen; });
  document.getElementById('arcoModal').classList.add('show');
  dibujarCroquisArco();
  const r = document.getElementById('arR');
  if(r) setTimeout(()=>{ r.focus(); r.select(); }, 50);
}
// Un punto de la ventana: el nudo que se tocó si sus campos siguen igual, o el
// de las coordenadas escritas (reutilizando el nudo que ya esté ahí).
function _puntoArco(P0, idx, idy){
  const sx = document.getElementById(idx).value, sy = document.getElementById(idy).value;
  if(sx === P0.tx && sy === P0.ty) return {id:P0.id, x:P0.x, y:P0.y};
  const x = parseFloat(sx), y = parseFloat(sy);
  if(!isFinite(x) || !isFinite(y)) return null;
  const e = nodoEnPunto(x, y);
  return e ? {id:e.id, x:e.x, y:e.y} : {id:null, x, y};
}
function leerArco(){
  const V = arcoVentana; if(!V) return {error:'Sin tramo.'};
  const A = _puntoArco(V.A0, 'arAx', 'arAy'), B = _puntoArco(V.B0, 'arBx', 'arBy');
  const R = parseFloat(document.getElementById('arR').value);
  const mayor = document.getElementById('arMayor').checked;
  if(!A || !B || !isFinite(R)) return {A, B, error:'Escribe números en las coordenadas y en el radio.'};
  const c = Math.hypot(B.x - A.x, B.y - A.y);
  if(c < 1e-9 || (A.id !== null && A.id === B.id))
    return {A, B, error:'El inicio y el fin coinciden: el arco necesita dos puntos distintos.'};
  if(!(R > 0) || R < c/2*(1 - 1e-9))
    return {A, B, c, error:'El radio tiene que ser al menos la mitad de la cuerda: ' + dec(c/2,'len') + ' ' + unitLen + '.'};
  const Ru = Math.max(R, c/2);
  return {A, B, c, R:Ru, lado:V.lado, mayor, f:flechaDesdeRadio(c, Ru, V.lado, mayor)};
}
// Hacia dónde se comba, dicho como se ve en la pantalla: con la cuerda más bien
// horizontal, «hacia arriba» o «hacia abajo»; si no, a la izquierda o a la derecha.
function _textoLadoArco(A, B, lado){
  const c = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  const nx = -(B.y - A.y)/c*lado, ny = (B.x - A.x)/c*lado;
  if(Math.abs(ny) >= Math.abs(nx)) return ny > 0 ? 'Hacia arriba' : 'Hacia abajo';
  return nx > 0 ? 'Hacia la derecha' : 'Hacia la izquierda';
}
function setLadoArco(l){ if(arcoVentana){ arcoVentana.lado = l; dibujarCroquisArco(); } }
function dibujarCroquisArco(){
  const V = arcoVentana; if(!V) return;
  const L = leerArco(), A = L.A, B = L.B;
  const eti = (Q, base) => base + (Q ? (Q.id !== null && nodo(Q.id) ? ' · nudo ' + nodo(Q.id).nombre : ' · nudo nuevo') : '');
  document.getElementById('arLblA').textContent = eti(A, 'Inicio');
  document.getElementById('arLblB').textContent = eti(B, 'Fin');
  // Los dos botones del lado, marcados como toda opción elegida (§7 de CLAUDE.md).
  [[1, 'arLado1'], [-1, 'arLado2']].forEach(([l, id])=>{
    const b = document.getElementById(id); if(!b) return;
    b.textContent = (A && B && L.c !== undefined) ? _textoLadoArco(A, B, l) : (l > 0 ? 'Un lado' : 'El otro lado');
    b.classList.toggle('active', V.lado === l);
  });
  const svg = document.getElementById('arCroquis'), info = document.getElementById('arInfo');
  if(!svg || !info) return;
  const arc = L.error ? null : arcoEntre(A, B, L.f);
  const muestras = [];
  if(arc) for(let i = 0; i <= 64; i++){
    const th = arc.t1 + arc.d*i/64;
    muestras.push({x:arc.cx + arc.R*Math.cos(th), y:arc.cy + arc.R*Math.sin(th)});
  }
  let pts = (A && B) ? [A, B] : [];
  if(arc) pts = pts.concat(muestras, [{x:arc.cx, y:arc.cy}]);
  info.style.color = L.error ? '#c0392b' : '';
  if(!pts.length){ svg.innerHTML = ''; info.textContent = L.error || ''; return; }
  const W2 = 360, H2 = 200, m = 28;
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((W2 - 2*m)/Math.max(x1 - x0, 1e-9), (H2 - 2*m)/Math.max(y1 - y0, 1e-9));
  const X = x => m + (x - x0)*k + ((W2 - 2*m) - (x1 - x0)*k)/2;
  const Y = y => H2 - m - (y - y0)*k - ((H2 - 2*m) - (y1 - y0)*k)/2;
  const F = v => v.toFixed(1);
  let s = '<line x1="' + F(X(A.x)) + '" y1="' + F(Y(A.y)) + '" x2="' + F(X(B.x)) + '" y2="' + F(Y(B.y))
        + '" stroke="#9aa3ad" stroke-width="1.2" stroke-dasharray="5,4"/>';
  let fuera = (Q) => [0, -1];                     // hacia dónde se aparta el nombre
  if(arc){
    const C = {x:arc.cx, y:arc.cy};
    [A, B].forEach(Q=>{ s += '<line x1="' + F(X(C.x)) + '" y1="' + F(Y(C.y)) + '" x2="' + F(X(Q.x)) + '" y2="' + F(Y(Q.y))
      + '" stroke="#9aa3ad" stroke-width="1" stroke-dasharray="3,3"/>'; });
    s += '<polyline points="' + muestras.map(p=>F(X(p.x)) + ',' + F(Y(p.y))).join(' ')
       + '" fill="none" stroke="#0f5c56" stroke-width="3" stroke-linecap="round"/>';
    s += '<path d="M' + F(X(C.x) - 5) + ' ' + F(Y(C.y)) + 'h10M' + F(X(C.x)) + ' ' + F(Y(C.y) - 5) + 'v10" stroke="#0b3f3a" stroke-width="1.4"/>';
    s += '<text x="' + F(X(C.x) + 7) + '" y="' + F(Y(C.y) + 13) + '" font-size="10" font-weight="700" fill="#0b3f3a">O</text>';
    const mR = {x:(C.x + A.x)/2, y:(C.y + A.y)/2};
    s += '<text x="' + F(X(mR.x) + 6) + '" y="' + F(Y(mR.y) - 6) + '" font-size="10" font-weight="700" fill="#0b3f3a">R = '
       + dec(L.R,'len') + ' ' + unitLen + '</text>';
    fuera = (Q) => { const d = Math.hypot(Q.x - C.x, Q.y - C.y) || 1; return [(Q.x - C.x)/d, (Q.y - C.y)/d]; };
  }
  [[A, 'Inicio'], [B, 'Fin']].forEach(([Q, nom])=>{
    const nombre = (Q.id !== null && nodo(Q.id)) ? nodo(Q.id).nombre : nom;
    const [ux, uy] = fuera(Q);
    s += '<circle cx="' + F(X(Q.x)) + '" cy="' + F(Y(Q.y)) + '" r="4.5" fill="#0b3f3a" stroke="#fff" stroke-width="1.5"/>';
    s += '<text x="' + F(X(Q.x) + ux*14) + '" y="' + F(Y(Q.y) - uy*14 + 4) + '" font-size="10.5" font-weight="700" fill="#0b3f3a" text-anchor="'
       + (ux > 0.3 ? 'start' : (ux < -0.3 ? 'end' : 'middle')) + '">' + escaparTexto(nombre) + '</text>';
  });
  svg.innerHTML = s;
  info.textContent = L.error ? L.error
    : 'Cuerda ' + dec(L.c,'len') + ' ' + unitLen + ' · arco de ' + dec(Math.abs(arc.d)*180/Math.PI,'ang')
      + '° · flecha ' + dec(Math.abs(L.f),'len') + ' ' + unitLen + ' · centro O (' + dec(arc.cx,'len') + ' ; ' + dec(arc.cy,'len') + ')';
}
function aplicarArco(){
  const V = arcoVentana; if(!V) return;
  const L = leerArco();
  if(L.error){ aviso(L.error, 'error'); return; }
  if(V.modo === 'editar'){
    const t = tramos.find(z=>z.id===V.tramo);
    if(!t){ cerrarArco(); return; }
    // Aplicar lo mismo no es un cambio: ni paso de deshacer ni panel oculto.
    if(Math.abs((t.flecha || 0) - L.f) <= 1e-12*Math.max(1, Math.abs(L.f))){ cerrarArco(); return; }
    registrarCambio(); t.flecha = L.f; invalidarResultados(); cerrarArco(); refrescar();
    return;
  }
  if(L.A.id !== null && L.B.id !== null && _tramoEntre(L.A.id, L.B.id)){
    aviso('Ya hay un tramo entre ' + nodo(L.A.id).nombre + ' y ' + nodo(L.B.id).nombre + '.', 'error'); return;
  }
  registrarCambio();
  const na = (L.A.id !== null && nodo(L.A.id)) || addNodo(L.A.x, L.A.y, true);
  const nb = (L.B.id !== null && nodo(L.B.id)) || addNodo(L.B.x, L.B.y, true);
  const t = addTramo(na.id, nb.id, 'arco');      // la flecha se mide de a hacia b, como en la ventana
  if(t) t.flecha = L.f;
  invalidarResultados(); cerrarArco(); refrescar();
}
function cerrarArco(){
  const m = document.getElementById('arcoModal'); if(m) m.classList.remove('show');
  arcoVentana = null; puntoPendiente = null; dibujar();
}
