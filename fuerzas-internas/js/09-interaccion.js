// ═══════════════════════════════════════════════════════════
//  INTERACCIÓN
// ═══════════════════════════════════════════════════════════

// ¿hay una carga bajo el cursor?  (para poder seleccionarla y editarla)
function cargaEn(mx,my){
  for(const c of cargas){
    const t = tramos.find(z=>z.id===c.tramo); const g = t && geoTramo(t);
    if(!g) continue;
    if(c.tipo==='U' || c.tipo==='T'){
      // el bloque de la distribuida, por encima del tramo
      const [ax,ay]=aPantalla(g.a.x,g.a.y), [bx,by]=aPantalla(g.b.x,g.b.y);
      const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy; if(l2<1) continue;
      let s=((mx-ax)*dx+(my-ay)*dy)/l2;
      if(s<0||s>1) continue;
      const px=ax+s*dx, py=ay+s*dy;
      if(my < py && my > py-40 && Math.abs(mx-px) < 400) return c;
    } else {
      const s = Math.max(0, Math.min(g.L, c.pos||0));
      const [px,py]=aPantalla(g.a.x+g.ux*s, g.a.y+g.uy*s);
      if(c.tipo==='P'  && Math.abs(mx-px)<12 && my<py && my>py-52) return c;
      if(c.tipo==='PX' && Math.abs(my-py)<12 && Math.abs(mx-px)<52) return c;
      if(c.tipo==='M'  && Math.hypot(mx-px,my-py)<22) return c;
    }
  }
  return null;
}
function marcado(lista,id){ return lista.indexOf(id)>=0; }
function alternar(lista,id){ const i=lista.indexOf(id); i>=0?lista.splice(i,1):lista.push(id); }

function nodoEn(mx,my){
  for(const n of nodos){ const [px,py]=aPantalla(n.x,n.y);
    if(Math.hypot(px-mx,py-my)<14) return n; }
  return null;
}
function tramoEn(mx,my){
  let mejor=null, dm=12;
  for(const t of tramos){
    const g=geoTramo(t); if(!g) continue;
    const [ax,ay]=aPantalla(g.a.x,g.a.y), [bx,by]=aPantalla(g.b.x,g.b.y);
    const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy; if(l2<1) continue;
    let s=((mx-ax)*dx+(my-ay)*dy)/l2; s=Math.max(0,Math.min(1,s));
    const d=Math.hypot(mx-(ax+s*dx), my-(ay+s*dy));
    if(d<dm){ dm=d; mejor=t; }
  }
  return mejor;
}
function addNodo(x,y){
  const n={id:++nodoSeq, x:snap(x), y:snap(y), nombre:'', apoyo:'libre', rotula:false};
  nodos.push(n); reNombrar(); return n;
}
function addTramo(a,b){
  if(a===b) return null;
  if(tramos.some(t=>(t.a===a&&t.b===b)||(t.a===b&&t.b===a))) return null;
  const t={id:++tramoSeq, a, b}; tramos.push(t); return t;
}

function onDown(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const n=nodoEn(mx,my); const [wx,wy]=aMundo(mx,my);
  if(tool==='pan'){ panDrag={mx,my,vx,vy}; return; }
  // Herramienta de peso propio: tocar un tramo le asigna (o le quita) el
  // valor elegido. Se comprueba antes que las demás para que el clic no se
  // interprete como creación de nudos.
  if(tool==='peso'){
    // tramoEn trabaja en coordenadas de PANTALLA, no de mundo.
    const [_mx,_my] = aPantalla(wx, wy);
    const tr = tramoEn(_mx, _my);
    if(tr) asignarPesoATramo(tr.id);
    else aviso('Toca sobre un tramo para asignarle el peso.');
    return;
  }
  if(tool==='nudo'){
    // construir por nudos: cada clic añade un nudo y lo une al anterior
    registrarCambio();
    const nn = n || addNodo(wx,wy);
    if(primerNodo !== null && primerNodo !== nn.id) addTramo(primerNodo, nn.id);
    primerNodo = nn.id; R=null; refrescar(); return;
  }
  if(tool==='apoyo'){ if(n) abrirApoyo(n.id); return; }
  if(tool==='sel' || tool==='borrar'){
    // Botón unificado "Mover / editar" (o "Eliminar" interactivo): aún no se
    // decide si será un toque (alterna selección / borra), un arrastre sobre
    // un elemento (lo mueve / arma un recuadro de borrado — nunca se mueve
    // algo que se va a eliminar), un arrastre rápido en vacío (paneo
    // temporal) o uno sostenido en vacío (recuadro múltiple). Se resuelve en
    // onMove/onUp.
    let hit = null;
    if(n) hit = {tipo:'nodo', id:n.id};
    else {
      const c = cargaEn(mx,my);
      if(c) hit = {tipo:'carga', id:c.id};
      else {
        const t = tramoEn(mx,my);
        if(t) hit = {tipo:'tramo', id:t.id};
      }
    }
    gesto = { modo:tool, hit, x0:mx, y0:my, wx0:wx, wy0:wy, moved:false, mantenido:false };
    if(!hit) armarEsperaDeRecuadro(gesto);
    return;
  }
}
function onMove(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  if(panDrag){ vx=panDrag.vx-(mx-panDrag.mx)/escala; vy=panDrag.vy+(my-panDrag.my)/escala; dibujar(); return; }
  mouseW=aMundo(mx,my);

  // ── Botón unificado "Mover / editar" (criterio cap9) ──
  if(gesto){
    if(!gesto.moved){
      const dx=mx-gesto.x0, dy=my-gesto.y0;
      if(Math.hypot(dx,dy) > UMBRAL_ARRASTRE){
        gesto.moved = true;
        if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId=null; }
        const esVacio = gesto.hit === null;
        if(esVacio && !gesto.mantenido){
          // Arrastre rápido en vacío, sin sostener antes: paneo temporal.
          gesto.tipo='pan-temporal';
          panDrag = {mx:gesto.x0, my:gesto.y0, vx, vy};
        } else if(gesto.modo==='borrar'){
          // En modo borrar cualquier arrastre (haya o no un elemento bajo el
          // dedo) se resuelve como recuadro de borrado: no tiene sentido
          // mover algo que se va a eliminar.
          gesto.tipo='rubber-borrar';
          mostrarRecuadroSeleccion('borrar');
        } else if(esVacio && gesto.mantenido){
          gesto.tipo='rubber';
          mostrarRecuadroSeleccion();
        } else if(gesto.hit.tipo==='nodo'){
          // Arrastrar un nudo ya seleccionado mueve TODO el grupo; arrastrar
          // uno suelto lo convierte en la única selección.
          registrarCambio();   // un solo paso de deshacer para todo el arrastre
          const grupo = marcado(selNodos, gesto.hit.id) ? selNodos.slice() : [gesto.hit.id];
          if(!marcado(selNodos, gesto.hit.id)){ selNodos = grupo; selNodo = gesto.hit.id; }
          gesto.tipo='mover';
          gesto.origenes = grupo.map(id=>{ const nn=nodo(id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        } else if(gesto.hit.tipo==='tramo'){
          // Arrastrar un tramo mueve como bloque rígido sus dos nudos (y de
          // paso, cualquier otro tramo seleccionado junto con los suyos).
          const grupoT = marcado(selTramos, gesto.hit.id) ? selTramos.slice() : [gesto.hit.id];
          if(!marcado(selTramos, gesto.hit.id)){ selTramos = grupoT; selTramo = gesto.hit.id; }
          const idsNodos = new Set(selNodos);
          grupoT.forEach(tid=>{ const t=tramos.find(z=>z.id===tid); if(t){ idsNodos.add(t.a); idsNodos.add(t.b); } });
          gesto.tipo='mover';
          gesto.origenes = [...idsNodos].map(id=>{ const nn=nodo(id); return nn?{id,x:nn.x,y:nn.y}:null; }).filter(Boolean);
        } else {
          // Carga: no tiene posición libre que arrastrar (va anclada a un
          // tramo); el arrastre no hace nada, solo evita el paneo accidental.
          gesto.tipo='sin-mover';
        }
      }
    }
    if(gesto.tipo==='mover'){
      const wdx = mouseW[0]-gesto.wx0, wdy = mouseW[1]-gesto.wy0;
      gesto.origenes.forEach(o=>{
        const nn=nodo(o.id);
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
      let bN=[], bT=[], bC=[];
      if(!gesto.moved){
        if(gesto.hit){
          if(gesto.hit.tipo==='nodo') bN=[gesto.hit.id];
          else if(gesto.hit.tipo==='tramo') bT=[gesto.hit.id];
          else if(gesto.hit.tipo==='carga') bC=[gesto.hit.id];
        }
      } else if(gesto.tipo==='rubber-borrar'){
        const r = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
        bN = r.ns; bT = r.ts;
      }
      ocultarRecuadroSeleccion();
      if(bN.length || bT.length || bC.length){
        registrarCambio();
        cargas = cargas.filter(c=>!marcado(bC, c.id));
        tramos = tramos.filter(t=>!marcado(bT,t.id) && !marcado(bN,t.a) && !marcado(bN,t.b));
        nodos  = nodos.filter(n=>!marcado(bN,n.id));
        cargas = cargas.filter(c=>tramos.some(t=>t.id===c.tramo));
        selNodos = selNodos.filter(id=>!marcado(bN,id));
        selTramos = selTramos.filter(id=>!marcado(bT,id));
        selCargas = selCargas.filter(id=>!marcado(bC,id));
        if(marcado(bN, selNodo)) selNodo = null;
        if(marcado(bT, selTramo)) selTramo = null;
        reNombrar(); R = null;
      }
      gesto = null;
      refrescar();
      return;
    }
    if(!gesto.moved){
      if(gesto.hit){
        if(gesto.hit.tipo==='nodo'){ alternar(selNodos, gesto.hit.id); selNodo=gesto.hit.id; }
        else if(gesto.hit.tipo==='carga'){ alternar(selCargas, gesto.hit.id); }
        else if(gesto.hit.tipo==='tramo'){ alternar(selTramos, gesto.hit.id); selTramo=gesto.hit.id; }
      } else {
        selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null;
      }
    } else if(gesto.tipo==='rubber'){
      const {ns, ts} = elementosEnRecuadro(gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selNodos = ns; selTramos = ts;
      selNodo = ns.length ? ns[ns.length-1] : null;
      selTramo = ts.length ? ts[ts.length-1] : null;
      ocultarRecuadroSeleccion();
    }
    // gesto.tipo==='mover' ya se aplicó en vivo durante onMove.
    gesto = null;
    refrescar();
    return;
  }
  panDrag = null;
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
    + (esBorrado ? 'rgba(217,79,92,.85)' : '#2563eb') + '; background:'
    + (esBorrado ? 'rgba(217,79,92,.12)' : 'rgba(37,99,235,.10)') + ';';
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
// solo lo atraviesan). Las cargas no participan del recuadro por ahora.
function elementosEnRecuadro(x0,y0,x1,y1){
  const rx0=Math.min(x0,x1), rx1=Math.max(x0,x1);
  const ry0=Math.min(y0,y1), ry1=Math.max(y0,y1);
  const dentro = (px,py)=> px>=rx0 && px<=rx1 && py>=ry0 && py<=ry1;
  const ns = nodos.filter(n=>{ const [px,py]=aPantalla(n.x,n.y); return dentro(px,py); }).map(n=>n.id);
  const ts = tramos.filter(t=>{
    const [ax,ay]=aPantalla(nodo(t.a).x,nodo(t.a).y), [bx,by]=aPantalla(nodo(t.b).x,nodo(t.b).y);
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
  if(selNodos.length || selTramos.length || selCargas.length){ eliminarSeleccion(); return; }
  setTool('borrar');
}
function onDbl(e){
  const r=cv.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const n=nodoEn(mx,my);
  if(n){ abrirNudo(n.id); return; }
  const c=cargaEn(mx,my);
  if(c){ editarCarga(c.id); return; }
  const t=tramoEn(mx,my);
  if(t) abrirTramo(t.id);
}

function setTool(t){
  tool=t; if(t!=='nudo') primerNodo=null;
  ['pan','nudo','apoyo','sel'].forEach(k=>{
    const el=document.getElementById('t'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.classList.toggle('active', k===t);
  });
  // Eliminar y Peso propio no siguen el patrón de id 't'+Nombre: se marcan
  // aparte. Sin esto la herramienta quedaba activa sin que se notara.
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t==='borrar');
  const bp = document.getElementById('btnPeso');
  if(bp) bp.classList.toggle('active', t==='peso');
  const hints={pan:'Arrastra el lienzo para desplazar la vista.',
    nudo:'Haz clic para colocar nudos; se van uniendo formando la viga.',
    apoyo:'Haz clic en un nudo para asignarle apoyo o rótula.',
    sel:'Toca para seleccionar (varios) · mantén presionado y arrastra para mover · doble clic para editar.',
    peso:'Toca los tramos a los que quieras asignar el peso elegido; tócalos de nuevo para quitárselo.',
    borrar:'Toca un nudo, tramo o carga para borrarlo · sobre zona vacía, mantén presionado y luego arrastra para encerrar y borrar varios (un arrastre rápido solo desplaza el panel).'};
  const ch=document.getElementById('canvasHint'); if(ch) ch.textContent=hints[t]||'';
  dibujar();
}

// ── Construcción: por nudos o por tramos ──
function menuViga(ev){ abrirMenu('menuViga', ev); }
function menuCargas(ev){ abrirMenu('menuCargas', ev); }
function abrirMenu(id, ev){
  const m=document.getElementById(id); if(!m) return;
  ['menuViga','menuCargas'].forEach(k=>{ if(k!==id) document.getElementById(k).classList.remove('abierto'); });
  const abre=!m.classList.contains('abierto');
  m.classList.toggle('abierto', abre);
  if(!abre) return;
  const tb=document.querySelector('.toolbar').getBoundingClientRect();
  const bt=(ev&&ev.currentTarget)?ev.currentTarget.getBoundingClientRect():tb;
  m.style.top=(tb.bottom+6)+'px';
  m.style.left=Math.max(8, Math.min(bt.left, window.innerWidth-m.offsetWidth-8))+'px';
}
document.addEventListener('click', ev=>{
  ['menuViga','menuCargas'].forEach(id=>{
    const m=document.getElementById(id);
    if(!m||!m.classList.contains('abierto')) return;
    const dentro=m.contains(ev.target);
    const boton=ev.target.closest && ev.target.closest('[onclick*="menu"]');
    if(!dentro && !boton) m.classList.remove('abierto');
    else if(dentro && ev.target.closest('.menu-btn')) m.classList.remove('abierto');
  });
});

function modoConstruir(m){
  modoConstr = m;
  if(m==='nudos'){
    setTool('nudo');
    aviso('Haz clic en el lienzo para ir colocando los nudos. Cada nuevo nudo se une al anterior.');
  } else {
    nuevoTramoPorLongitud();
  }
  refrescar();
}
function nuevoTramoPorLongitud(){
  if(!nodos.length){ addNodo(0,0); reNombrar(); }
  const sel=document.getElementById('tnDesde');
  // por defecto se engancha al extremo izquierdo, pero se puede elegir cualquiera
  const izq = nodos.reduce((m,n)=> n.x < m.x ? n : m, nodos[0]);
  const ult = nodos[nodos.length-1];
  sel.innerHTML = nodos.map(n=>'<option value="'+n.id+'">Nudo '+n.nombre
    +' ('+dec(n.x,'len')+' ; '+dec(n.y,'len')+')</option>').join('');
  sel.value = (tramos.length ? ult.id : izq.id);
  prevTramoNuevo();
  document.getElementById('tramoNuevoModal').classList.add('show');
}
function cerrarTramoNuevo(){ document.getElementById('tramoNuevoModal').classList.remove('show'); }
function prevTramoNuevo(){
  const el=document.getElementById('tnPrev'); if(!el) return;
  const id=parseInt(document.getElementById('tnDesde').value,10);
  const n=nodo(id);
  const L=parseFloat(document.getElementById('tnL').value)||0;
  const A=parseFloat(document.getElementById('tnAng').value)||0;
  if(!n){ el.textContent=''; return; }
  const rad=A*Math.PI/180;
  const x2=n.x+L*Math.cos(rad), y2=n.y+L*Math.sin(rad);
  el.innerHTML='Desde <b>'+n.nombre+'</b> ('+dec(n.x,'len')+' ; '+dec(n.y,'len')+') '
    +'hasta ('+dec(x2,'len')+' ; '+dec(y2,'len')+') '+unitLen
    +'<br>Proyecciones: Δx = '+dec(L*Math.cos(rad),'len')+' · Δy = '+dec(L*Math.sin(rad),'len');
}
function aplicarTramoNuevo(){
  const id=parseInt(document.getElementById('tnDesde').value,10);
  const desde=nodo(id);
  const L=parseFloat(document.getElementById('tnL').value);
  const A=parseFloat(document.getElementById('tnAng').value);
  if(!desde || !isFinite(L) || L<=0 || !isFinite(A)){ aviso('Revisa la longitud y el ángulo.', 'error'); return; }
  const rad=A*Math.PI/180;
  const x2=desde.x+L*Math.cos(rad), y2=desde.y+L*Math.sin(rad);
  // si ya existe un nudo en ese punto, se enlaza en vez de duplicarlo
  let destino=nodos.find(n=>Math.hypot(n.x-x2,n.y-y2)<1e-6);
  if(!destino) destino=addNodo(x2,y2);
  addTramo(desde.id, destino.id);
  R=null; reNombrar(); cerrarTramoNuevo(); centrar(); refrescar();
}

// ── Edición ──
function abrirNudo(id){
  edNodo=id; const n=nodo(id); if(!n) return;
  document.getElementById('ndNom').textContent=n.nombre;
  document.getElementById('ndX').value=n.x;
  document.getElementById('ndY').value=n.y;
  document.getElementById('nudoModal').classList.add('show');
}
function cerrarNudo(){ document.getElementById('nudoModal').classList.remove('show'); edNodo=null; }
function aplicarNudo(){
  const n=nodo(edNodo);
  if(n){ const gx=parseFloat(document.getElementById('ndX').value),
              gy=parseFloat(document.getElementById('ndY').value);
    if(isFinite(gx)) n.x=gx; if(isFinite(gy)) n.y=gy; R=null; }
  cerrarNudo(); centrar(); refrescar();
}
function abrirTramo(id){
  edTramo=id; const t=tramos.find(z=>z.id===id); const g=t&&geoTramo(t); if(!g) return;
  document.getElementById('trNom').textContent=nomTramo(t);
  document.getElementById('trL').value=+g.L.toFixed(6);
  document.getElementById('trAng').value=+g.ang.toFixed(4);
  document.getElementById('trPrev').textContent =
    'Desde '+g.a.nombre+' ('+dec(g.a.x,'len')+' ; '+dec(g.a.y,'len')+') hasta '
    + g.b.nombre+' ('+dec(g.b.x,'len')+' ; '+dec(g.b.y,'len')+')';
  document.getElementById('tramoModal').classList.add('show');
}
function cerrarTramo(){ document.getElementById('tramoModal').classList.remove('show'); edTramo=null; }
function aplicarTramo(){
  const t=tramos.find(z=>z.id===edTramo); const g=t&&geoTramo(t);
  if(g){
    const L=parseFloat(document.getElementById('trL').value);
    const A=parseFloat(document.getElementById('trAng').value);
    if(isFinite(L) && L>0 && isFinite(A)){
      const rad=A*Math.PI/180;
      const nx=g.a.x+L*Math.cos(rad), ny=g.a.y+L*Math.sin(rad);
      const ddx=nx-g.b.x, ddy=ny-g.b.y;
      // se arrastra el resto de la cadena para no romper la continuidad
      const cad=cadena();
      const idx=cad.findIndex(e=>e.t.id===t.id);
      g.b.x=nx; g.b.y=ny;
      if(idx>=0) for(let i=idx+1;i<cad.length;i++){ cad[i].hasta.x+=ddx; cad[i].hasta.y+=ddy; }
      R=null;
    }
  }
  cerrarTramo(); centrar(); refrescar();
}
function abrirApoyo(id){
  edApoyo=id; const n=nodo(id); if(!n) return;
  document.getElementById('apNom').textContent=n.nombre;
  marcarApoyo(); actualizarPrevApoyo();
  document.getElementById('apoyoModal').classList.add('show');
}
function cerrarApoyo(){ document.getElementById('apoyoModal').classList.remove('show');
  edApoyo=null; refrescar(); }   // refrescar borra el resaltado del nudo
function marcarApoyo(){
  const n=nodo(edApoyo); if(!n) return;
  ['simple','movil','empotrado','libre'].forEach(k=>{
    const b=document.getElementById('apb_'+k);
    if(b) b.classList.toggle('active', (n.apoyo||'libre')===k);
  });
  const r=document.getElementById('apb_rotula');
  if(r) r.classList.toggle('active', !!n.rotula);
  sincroApAng();
}
function elegirApoyo(tipo){
  const n=nodo(edApoyo); if(!n) return;
  registrarCambio();
  n.apoyo=tipo;
  // Un móvil recién puesto desliza en horizontal, o sea reacción vertical.
  if(tipo === 'movil' && n.apAng === undefined) n.apAng = AP_ANG_DEF;
  R=null;
  marcarApoyo(); sincroApAng(); actualizarPrevApoyo(); refrescar();
}
// Solo el apoyo móvil tiene orientación: los demás no dejan grado de
// libertad que orientar.
function sincroApAng(){
  const n = nodo(edApoyo);
  const bloque = document.getElementById('apBloqueAng');
  if(!bloque) return;
  // Solo el móvil deja un grado de libertad que orientar.
  const esMovil = !!(n && n.apoyo === 'movil');
  bloque.style.display = esMovil ? '' : 'none';
  if(!esMovil) return;
  const a = (n.apAng === undefined) ? AP_ANG_DEF : n.apAng;
  const campo = document.getElementById('apAngVal');
  if(campo && document.activeElement !== campo) campo.value = a;
  const h = document.getElementById('apAngHint');
  if(h) h.textContent = 'Es la dirección hacia la que cuelga el apoyo desde el nudo '
    + '(−90° = hacia abajo, la posición habitual). La reacción actúa en sentido '
    + 'contrario, a ' + ((+a + 180) % 360) + '°.';
}
function setApAng(v){
  const n = nodo(edApoyo);
  if(!n || n.apoyo !== 'movil') return;
  const a = parseFloat(v);
  if(!isFinite(a)) return;
  registrarCambio();
  n.apAng = a; R = null;
  const campo = document.getElementById('apAngVal');
  if(campo && document.activeElement !== campo) campo.value = a;
  sincroApAng(); actualizarPrevApoyo(); refrescar();
}
function alternarRotula(){
  const n=nodo(edApoyo); if(!n) return;
  n.rotula=!n.rotula; R=null;
  marcarApoyo(); actualizarPrevApoyo(); refrescar();
}
function actualizarPrevApoyo(){
  const el=document.getElementById('apPrev'), n=nodo(edApoyo);
  if(!el||!n) return;
  const rot=nodos.filter(z=>z.rotula && !esExtremo(z)).length;
  const tot=nodos.reduce((s,z)=>s+GRADOS[z.apoyo||'libre'],0);
  el.innerHTML='Ahora: <b>'+NOMBRE_APOYO[n.apoyo||'libre']+'</b>'
    +(n.rotula?' con rótula interna':'')
    +'. Reacciones en la viga: <b>'+tot+'</b> frente a <b>'+(3+rot)+'</b> ecuaciones.';
}
