// ── Cargas ──
function nuevaCarga(tipo){
  if(!tramos.length){ aviso('Primero construye al menos un tramo de viga.', 'error'); return; }
  edCarga = {nuevo:true, tipo};
  abrirCargaModal(tipo, null);
}
function abrirCargaModal(tipo, c){
  const tit={P:'Carga puntual vertical',PX:'Carga puntual horizontal',
             U:'Carga uniforme',T:'Carga triangular',M:'Momento concentrado'};
  const distrib = (tipo==='U'||tipo==='T');
  document.getElementById('cgTitulo').textContent = tit[tipo]||'Carga';
  document.getElementById('cgSub').textContent = distrib
    ? 'Indica dónde empieza y dónde acaba dentro del tramo. Actúa perpendicular a él.'
    : 'Puede ir sobre un tramo, a una distancia de su inicio, o directamente sobre un nudo.';

  const selT=document.getElementById('cgTramo');
  selT.innerHTML = tramos.map(t=>'<option value="'+t.id+'">Tramo '+nomTramo(t)+'</option>').join('');
  const selN=document.getElementById('cgNudo');
  selN.innerHTML = nodos.map(n=>'<option value="'+n.id+'">Nudo '+n.nombre+'</option>').join('');

  // las distribuidas siempre van sobre un tramo
  document.getElementById('cgFilaDestino').style.display = distrib ? 'none' : '';
  document.getElementById('cgDestino').value = (c && c.destino) ? c.destino : 'tramo';
  if(c && c.tramo) selT.value = c.tramo;
  if(c && c.nudo) selN.value = c.nudo;

  // ── Matriz de doble entrada, adaptada al tipo ──
  // Distribuida variable: las dos columnas y las dos filas completas.
  // Distribuida uniforme: dos distancias, pero UNA sola magnitud, que ocupa
  //   las dos columnas (no tiene sentido pedir dos valores iguales).
  // Puntual o momento: un solo punto, así que la columna Final desaparece y
  //   la de Inicio pasa a llamarse Aplicación.
  const unaCol = !distrib;
  const magUnica = (tipo === 'U');
  const mostrar = (id, ver) => { const e=document.getElementById(id); if(e) e.style.display = ver ? '' : 'none'; };

  mostrar('cgThFin', !unaCol);
  mostrar('cgTdFin', !unaCol);
  document.getElementById('cgThIni').textContent = unaCol ? 'Aplicación' : 'Inicio';

  const tdMag = document.getElementById('cgTdMag');
  if(magUnica || unaCol){
    mostrar('cgTdMag2', false);
    tdMag.setAttribute('colspan', unaCol ? '1' : '2');
  } else {
    mostrar('cgTdMag2', true);
    tdMag.setAttribute('colspan', '1');
  }
  document.getElementById('cgThMag').textContent =
    (tipo==='M') ? ('Momento ('+uMom()+')')
    : distrib ? ('Magnitud ('+uDist()+')') : ('Magnitud ('+unitFor+')');

  const g0 = tramos.length ? geoTramo(tramos.find(t=>t.id===parseInt(selT.value,10))) : null;
  document.getElementById('cgPos').value = c ? c.pos : 0;
  document.getElementById('cgFin').value = (c && c.posFin!==undefined && c.posFin!==null)
      ? c.posFin : (g0 ? +g0.L.toFixed(4) : 0);
  document.getElementById('cgMag').value = c ? c.mag : 10;
  document.getElementById('cgMag2').value = c ? (c.mag2||0) : 0;

  // Dirección y forma de declarar la posición: SIEMPRE se reinician a partir
  // de la carga que se edita (o a los valores por defecto si es nueva). Sin
  // esto los <select> conservaban la elección anterior, y una carga nueva
  // podía heredar "coordenada x": sus posiciones caían fuera del tramo, la
  // longitud cargada quedaba en cero y la carga no llegaba a dibujarse.
  const _o = document.getElementById('cgOrient');
  if(_o) _o.value = (c && c.orient) || 'global';
  const _b = document.getElementById('cgBase');
  if(_b) _b.value = (c && c.basePos) || 'eje';
  // Se fija el modo de partida ANTES de refrescar etiquetas, para que al
  // abrir no se dispare una conversión de valores que ya están en su modo.
  _baseAnterior = (c && c.basePos) || 'eje';
  if(typeof cambioBasePos === 'function') cambioBasePos();
  setOrientCarga((c && c.orient) || 'global');
  document.getElementById('cgPrev').innerHTML =
    (tipo==='P') ? 'Positiva hacia abajo.' :
    (tipo==='PX') ? 'Positiva hacia la derecha.' :
    (tipo==='M') ? 'Positivo en sentido antihorario.' :
    'Positiva hacia abajo, perpendicular al tramo.';
  cambioDestinoCarga();
  document.getElementById('cargaModal').classList.add('show');
}
function cambioDestinoCarga(){
  const d = document.getElementById('cgDestino').value;
  const distrib = edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T');
  const enNudo = (!distrib && d==='nudo');
  document.getElementById('cgFilaTramo').style.display = enNudo ? 'none' : '';
  document.getElementById('cgFilaNudo').style.display  = enNudo ? '' : 'none';
  // Sobre un nudo no hay distancia que dar: la fila entera de la matriz
  // desaparece y solo queda la magnitud.
  const filaDist = document.getElementById('cgThDist');
  const tr = filaDist && filaDist.parentElement;
  if(tr) tr.style.display = enNudo ? 'none' : '';
  const cab = document.getElementById('cgThIni');
  if(cab && cab.parentElement) cab.parentElement.style.display = enNudo ? 'none' : '';
  const ayuda = document.getElementById('cgLblPos');
  if(ayuda) ayuda.style.display = enNudo ? 'none' : '';
  const grupoBase = document.getElementById('cgSegBase');
  if(grupoBase && grupoBase.parentElement) grupoBase.parentElement.style.display = enNudo ? 'none' : '';
  dibujarCroquisTramo();
}

// ── Croquis acotado del tramo elegido (punto 4) ──
function dibujarCroquisTramo(){
  const cont=document.getElementById('cgCroquis'); if(!cont) return;
  const enNudo = document.getElementById('cgDestino').value==='nudo'
              && !(edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T'));
  if(enNudo){ cont.innerHTML='<div style="font-size:10.5px;color:#66727e;padding:14px 6px;'
    +'text-align:center">La carga se aplica directamente sobre el nudo elegido.</div>'; return; }
  const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
  const g = t && geoTramo(t);
  if(!g){ cont.innerHTML='<div style="font-size:10.5px;color:#66727e;padding:14px 6px">Sin tramo.</div>'; return; }

  const W2=240, M=34;
  const dx=g.b.x-g.a.x, dy=g.b.y-g.a.y;
  // primera pasada con el alto máximo; luego el alto se ciñe al dibujo
  const H2max = 215;
  let k = Math.min((W2-2*M)/Math.max(Math.abs(dx),1e-6),
                   (H2max-2*M-30)/Math.max(Math.abs(dy),1e-6), 90);
  const H2 = Math.max(110, Math.min(H2max, Math.abs(dy)*k + 2*M + 30));
  const cx=W2/2, cy=H2/2-6;
  const ax=cx-dx*k/2, ay=cy+dy*k/2, bx=cx+dx*k/2, by=cy-dy*k/2;
  let s='<svg viewBox="0 0 '+W2+' '+H2+'" style="width:100%;height:auto;display:block">';
  s+='<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';
  // proyecciones si el tramo es inclinado
  const incl = Math.abs(dx)>1e-9 && Math.abs(dy)>1e-9;
  if(incl){
    s+='<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+ay+'" stroke="#ccd2d8" stroke-width="1" stroke-dasharray="3,3"/>';
    s+='<line x1="'+bx+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" stroke="#ccd2d8" stroke-width="1" stroke-dasharray="3,3"/>';
    s+='<text x="'+((ax+bx)/2)+'" y="'+(ay+13)+'" font-family="Inter,sans-serif" font-size="9" fill="#66727e" text-anchor="middle">Δx = '+dec(Math.abs(dx),'len')+'</text>';
    s+='<text x="'+Math.min(bx+5, W2-56)+'" y="'+((ay+by)/2)+'" font-family="Inter,sans-serif" font-size="9" fill="#66727e">Δy = '+dec(Math.abs(dy),'len')+'</text>';
    // ángulo
    const r=22, a0=0, a1=Math.atan2(-(by-ay), bx-ax);
    s+='<path d="M '+(ax+r)+' '+ay+' A '+r+' '+r+' 0 0 '+(a1>0?0:1)+' '+(ax+r*Math.cos(a1))+' '+(ay-r*Math.sin(a1))+'" fill="none" stroke="#8b5cf6" stroke-width="1.4"/>';
    s+='<text x="'+(ax+r+4)+'" y="'+(ay-6)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#8b5cf6">'+g.ang.toFixed(1)+'°</text>';
  }
  // el tramo
  s+='<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>';
  s+='<circle cx="'+ax+'" cy="'+ay+'" r="4" fill="#1e3a8a"/><circle cx="'+bx+'" cy="'+by+'" r="4" fill="#1e3a8a"/>';
  s+='<text x="'+(ax-9)+'" y="'+(ay+4)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+g.a.nombre+'</text>';
  s+='<text x="'+(bx+5)+'" y="'+(by+4)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+g.b.nombre+'</text>';
  // cota diagonal (longitud real)
  const ox=-(by-ay), oy=(bx-ax), on=Math.hypot(ox,oy)||1;
  const px=ox/on*17, py=oy/on*17;
  s+='<line x1="'+(ax+px)+'" y1="'+(ay+py)+'" x2="'+(bx+px)+'" y2="'+(by+py)+'" stroke="#1b1f24" stroke-width="1"/>';
  let am=Math.atan2((by+py)-(ay+py), (bx+px)-(ax+px));
  if(am>Math.PI/2||am<-Math.PI/2) am+=Math.PI;
  s+='<g transform="translate('+((ax+bx)/2+px)+','+((ay+by)/2+py)+') rotate('+(am*180/Math.PI)+')">'
    +'<text y="-4" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#1b1f24" text-anchor="middle">L = '+dec(g.L,'len')+' '+unitLen+'</text></g>';
  // marca del trozo cargado o del punto
  const distrib = edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T');
  // Los campos pueden estar en coordenadas (y en marco local o global), así
  // que hay que CONVERTIRLOS a distancia sobre el eje antes de situar la
  // marca. Leerlos en crudo hacía que con Δy negativa el croquis no pintara
  // nada, porque interpretaba -1.2 como una distancia fuera del tramo.
  const _modo  = (document.getElementById('cgBase')||{}).value || 'eje';
  const _marco = (document.getElementById('cgOrient')||{}).value || 'global';
  const _aS = v => sDesdePos({basePos:_modo, orient:_marco}, g, v);
  const p1 = _aS(parseFloat(document.getElementById('cgPos').value)||0);
  const p2 = distrib ? _aS(parseFloat(document.getElementById('cgFin').value)||0) : p1;
  const f1 = Math.max(0, Math.min(1, p1/g.L)), f2 = Math.max(0, Math.min(1, p2/g.L));
  if(distrib && Math.abs(f2-f1)>1e-6){
    const q1x=ax+(bx-ax)*f1, q1y=ay+(by-ay)*f1, q2x=ax+(bx-ax)*f2, q2y=ay+(by-ay)*f2;
    s+='<line x1="'+q1x+'" y1="'+q1y+'" x2="'+q2x+'" y2="'+q2y+'" stroke="#e0a83c" stroke-width="7" stroke-linecap="round" opacity=".75"/>';
    // el rótulo va al lado opuesto de la cota de longitud, para no pisarla
    s+='<text x="'+((q1x+q2x)/2-px)+'" y="'+((q1y+q2y)/2-py)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#b07d1a" text-anchor="middle">cargado '+dec(Math.abs(p2-p1),'len')+'</text>';
  } else if(!distrib){
    const qx=ax+(bx-ax)*f1, qy=ay+(by-ay)*f1;
    s+='<circle cx="'+qx+'" cy="'+qy+'" r="5" fill="#d94f5c"/>';
    s+='<text x="'+qx+'" y="'+(qy-11)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#d94f5c" text-anchor="middle">'+dec(p1,'len')+'</text>';
  }
  s+='</svg>';
  cont.innerHTML=s;
}
let _baseAnterior = 'eje';
// Marca visualmente el botón activo de un grupo segmentado.
function marcarSeg(idGrupo, valor){
  const g = document.getElementById(idGrupo);
  if(!g) return;
  g.querySelectorAll('.seg-btn').forEach(b=>
    b.classList.toggle('active', b.dataset.v === valor));
}
function setBasePos(v){
  const h = document.getElementById('cgBase');
  if(!h) return;
  h.value = v;
  cambioBasePos();          // convierte los valores y refresca etiquetas
  marcarSeg('cgSegBase', h.value);   // puede haberse revertido si no era válido
}
function cambioTramoCarga(){
  const h = document.getElementById('cgOrient');
  if(h) setOrientCarga(h.value);   // mismo marco: solo refresca pista y rótulos
  dibujarCroquisTramo();
}
function setOrientCarga(v){
  const h = document.getElementById('cgOrient');
  if(!h) return;
  const antes = h.value;
  // Cambiar de marco cambia el SIGNIFICADO de las coordenadas, así que hay
  // que reexpresarlas; si no, la carga saltaría de sitio al pulsar el botón.
  const modo = (document.getElementById('cgBase')||{}).value || 'eje';
  if(antes !== v && modo !== 'eje'){
    const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
    const g = t && geoTramo(t);
    if(g){
      const conv = (id)=>{
        const el = document.getElementById(id);
        if(!el) return;
        const val = parseFloat(el.value);
        if(!isFinite(val)) return;
        const sEje = sDesdePos({basePos:modo, orient:antes}, g, val);
        el.value = +posDesdeS(modo, g, sEje, v === 'local').toFixed(4);
      };
      conv('cgPos');
      if(document.getElementById('cgTdFin').style.display !== 'none') conv('cgFin');
    }
  }
  h.value = v;
  marcarSeg('cgSegOrient', v);
  const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
  const g = t && geoTramo(t);
  const recto = !g || Math.abs(g.ang) < 0.05;
  const hint = document.getElementById('cgHintOrient');
  if(hint) hint.innerHTML = (v === 'global')
    ? 'Referido a <b>todo el sistema</b>: la carga sigue la vertical y la '
      + 'horizontal del plano, y las coordenadas son las del plano.'
      + (recto ? ' En este tramo, horizontal, ambas opciones coinciden.' : '')
    : 'Referido <b>al tramo seleccionado</b>: la carga se orienta respecto a su '
      + 'eje (perpendicular, o paralela si es axial) y las coordenadas se miden '
      + 'desde su nudo inicial.'
      + (recto ? ' En este tramo, horizontal, ambas opciones coinciden.' : '');
  // Las etiquetas de la matriz dependen del marco: se refrescan aquí.
  if(typeof cambioBasePos === 'function' && document.getElementById('cgBase')){
    const _m = document.getElementById('cgBase').value;
    _baseAnterior = _m;          // ya se convirtió arriba: no reconvertir
    cambioBasePos();
  }
  if(edCarga) dibujarCroquisTramo();
}

function cambioBasePos(){
  const sel = document.getElementById('cgBase');
  if(!sel) return;
  const modo = sel.value;

  // Convertir los valores para que la carga NO se mueva de sitio: se pasa
  // del modo anterior a distancia sobre el eje, y de ahí al modo nuevo.
  // Antes el número se quedaba igual y pasaba a significar otra cosa, así
  // que la carga saltaba (o desaparecía si caía fuera del tramo).
  if(modo !== _baseAnterior){
    const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
    const g = t && geoTramo(t);
    if(g){
      const ejeMuerto = (m) =>
        (m === 'coordX' && Math.abs(g.ux) < 1e-9) ||
        (m === 'coordY' && Math.abs(g.uy) < 1e-9);
      if(ejeMuerto(modo)){
        // En un tramo vertical la x no distingue puntos (y al revés).
        aviso('En este tramo esa coordenada es constante: no sirve para situar '
            + 'la carga. Se mantiene el modo anterior.', 'error');
        sel.value = _baseAnterior;
        return;
      }
      const marco = (document.getElementById('cgOrient')||{}).value || 'global';
      const conv = (id)=>{
        const el = document.getElementById(id);
        if(!el) return;
        const v = parseFloat(el.value);
        if(!isFinite(v)) return;
        const s = sDesdePos({basePos:_baseAnterior, orient:marco}, g, v);
        el.value = +posDesdeS(modo, g, s, marco === 'local').toFixed(4);
      };
      conv('cgPos');
      if(document.getElementById('cgTdFin').style.display !== 'none') conv('cgFin');
    }
    _baseAnterior = modo;
  }

  marcarSeg('cgSegBase', modo);
  const th = document.getElementById('cgThDist');
  const mk = (document.getElementById('cgOrient')||{}).value === 'local';
  if(th) th.textContent = (modo === 'eje') ? 'Distancia'
        : (modo === 'coordX' ? (mk ? 'Δx' : 'Coord. x')
                             : (mk ? 'Δy' : 'Coord. y'));
  const l = document.getElementById('cgLblPos');
  const _marco = (document.getElementById('cgOrient')||{}).value || 'global';
  if(l) l.textContent = (modo === 'eje')
    ? 'Distancias medidas sobre el eje del tramo, desde su nudo inicial.'
    : (_marco === 'local'
        ? ((modo === 'coordX' ? 'Δx' : 'Δy') + ' desde el nudo inicial del tramo.')
        : ((modo === 'coordX' ? 'Abscisa x' : 'Ordenada y')
           + ' del punto, en coordenadas del plano.'));
  if(edCarga) dibujarCroquisTramo();
}
function cerrarCarga(){ document.getElementById('cargaModal').classList.remove('show'); edCarga=null; }
function aplicarCarga(){
  if(!edCarga) return;
  const distrib = (edCarga.tipo==='U'||edCarga.tipo==='T');
  const destino = distrib ? 'tramo' : document.getElementById('cgDestino').value;
  const datos = {
    orient: (document.getElementById('cgOrient')||{}).value || 'global',
    basePos: (document.getElementById('cgBase')||{}).value || 'eje',
    destino,
    tramo: parseInt(document.getElementById('cgTramo').value,10),
    nudo: parseInt(document.getElementById('cgNudo').value,10),
    pos: parseFloat(document.getElementById('cgPos').value)||0,
    posFin: distrib ? (parseFloat(document.getElementById('cgFin').value)||0) : null,
    mag: parseFloat(document.getElementById('cgMag').value)||0,
    mag2: parseFloat(document.getElementById('cgMag2').value)||0
  };
  if(distrib && Math.abs(datos.posFin-datos.pos) < 1e-9){
    aviso('El inicio y el fin de la carga no pueden coincidir.', 'error'); return;
  }
  // Con posiciones dadas por coordenada es fácil salirse del tramo sin darse
  // cuenta; entonces la carga quedaría con longitud nula y no se vería.
  if(distrib){
    const _t = tramos.find(z=>z.id===datos.tramo), _g = _t && geoTramo(_t);
    if(_g){
      const s1 = Math.max(0, Math.min(_g.L, sDesdePos(datos, _g, datos.pos)));
      const s2 = Math.max(0, Math.min(_g.L, sDesdePos(datos, _g, datos.posFin)));
      if(Math.abs(s2-s1) < 1e-9){
        aviso('Con esas posiciones la carga queda fuera del tramo: revisa el '
            + 'modo de "Posición dada por".', 'error');
        return;
      }
    }
  }
  if(edCarga.nuevo) cargas.push(Object.assign({id:++cargaSeq, tipo:edCarga.tipo}, datos));
  else Object.assign(edCarga, datos);
  R=null; cerrarCarga(); refrescar();
}
function editarCarga(id){
  const c=cargas.find(z=>z.id===id); if(!c) return;
  edCarga=c; abrirCargaModal(c.tipo, c);
}
function borrarCarga(id){ registrarCambio(); cargas=cargas.filter(c=>c.id!==id); R=null; refrescar(); }

// ── Eliminar selección ──
// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
//  Mismo criterio que cap9: se guarda una instantánea del modelo ANTES de
//  cada cambio. La vista (zoom, encuadre, herramienta activa) no forma parte
//  del historial: deshacer restaura la viga, no el punto de vista.
// ═══════════════════════════════════════════════════════════
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  return JSON.stringify({
    nodos:  nodos.map(n=>Object.assign({}, n)),
    tramos: tramos.map(t=>Object.assign({}, t)),
    cargas: cargas.map(c=>Object.assign({}, c)),
    pesos: pesos.map(p=>Object.assign({}, p)),
    nodoSeq, tramoSeq, cargaSeq, pesoSeq
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
  nodos  = e.nodos.map(n=>Object.assign({}, n));
  tramos = e.tramos.map(t=>Object.assign({}, t));
  cargas = e.cargas.map(c=>Object.assign({}, c));
  pesos  = (e.pesos || []).map(p=>Object.assign({}, p));
  nodoSeq = e.nodoSeq; tramoSeq = e.tramoSeq; cargaSeq = e.cargaSeq;
  pesoSeq = e.pesoSeq || pesoSeq;
  if(!pesos.some(p=>p.id === pesoActivo)) pesoActivo = null;
  // La selección puede apuntar a elementos que ya no existen tras restaurar.
  selNodos  = selNodos.filter(id=>nodos.some(n=>n.id===id));
  selTramos = selTramos.filter(id=>tramos.some(t=>t.id===id));
  selCargas = selCargas.filter(id=>cargas.some(c=>c.id===id));
  if(!nodos.some(n=>n.id===selNodo))   selNodo = null;
  if(!tramos.some(t=>t.id===selTramo)) selTramo = null;
  primerNodo = null;
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
  if(!selNodos.length && !selTramos.length && !selCargas.length){
    aviso('Selecciona antes lo que quieras borrar con la herramienta Ver / editar.', 'error');
    return;
  }
  registrarCambio();
  cargas = cargas.filter(c=>!marcado(selCargas, c.id));
  tramos = tramos.filter(t=>!marcado(selTramos, t.id)
                        && !marcado(selNodos, t.a) && !marcado(selNodos, t.b));
  nodos  = nodos.filter(n=>!marcado(selNodos, n.id));
  cargas = cargas.filter(c=>tramos.some(t=>t.id===c.tramo));
  selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null;
  reNombrar(); R=null; refrescar();
}

// ── El grupo de nudos que abarca la selección actual: los nudos marcados
//    directamente, más los extremos de cualquier tramo marcado (así se puede
//    transformar/replicar aunque solo se haya tocado el tramo, no sus nudos).
function nodosDeSeleccion(){
  const ids = new Set(selNodos);
  selTramos.forEach(id=>{ const t=tramos.find(z=>z.id===id); if(t){ ids.add(t.a); ids.add(t.b); } });
  return [...ids];
}
// Tramos cuyos DOS nudos están en el grupo (para volver a trazarlos al replicar).
function tramosDeGrupo(idsNodos){
  return tramos.filter(t=>idsNodos.indexOf(t.a)>=0 && idsNodos.indexOf(t.b)>=0).map(t=>t.id);
}
