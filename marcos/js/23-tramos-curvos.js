// ═══════════════════════════════════════════════════════════
//  TRAMOS CURVOS (2026-10-25, petición del profesor)
//  Un tramo curvo es un arco de circunferencia entre dos nudos. Se dibuja como
//  el ARC de AutoCAD y como el «Tramo curvo» de presión de fluidos: se tocan el
//  inicio y el fin (un nudo que ya existe o un punto nuevo de la rejilla) y la
//  ventana pide el RADIO, hacia dónde se comba y si es el arco mayor. El modelo
//  guarda la FLECHA (`t.flecha`, 01-): el radio es una conversión de borde.
//  Con doble clic sobre un arco, la misma ventana edita su radio y su lado.
//  La geometría vive en 01- (`arcoDeTramo`, `puntoEnTramo`), el cálculo en 03-
//  (`_internasDeArco`) y su presentación, aquí abajo y en las piezas que la
//  llaman.
// ═══════════════════════════════════════════════════════════
let arcoVentana = null;     // {modo:'nuevo'|'editar', tramo, lado, A0, B0}

// ── Herramienta: dos toques ──
function toqueCurvo(n, wx, wy){
  const P = n ? {id:n.id, x:n.x, y:n.y} : {id:null, x:snap(wx), y:snap(wy)};
  if(!curvoPrimer){ curvoPrimer = P; dibujar(); return; }
  const A = curvoPrimer;
  if((A.id !== null && A.id === P.id) || Math.hypot(P.x - A.x, P.y - A.y) < 1e-9) return;
  abrirArcoNuevo(A, P);
}
// Marca del primer punto y línea hasta el puntero, mientras se elige el segundo.
function dibujarCurvoPendiente(){
  if(tool !== 'curvo' || !curvoPrimer) return;
  const [ax, ay] = aPantalla(curvoPrimer.x, curvoPrimer.y);
  ctx.save();
  ctx.strokeStyle = '#e8914a'; ctx.lineWidth = 1.6; ctx.setLineDash([5,4]);
  if(mouseW){ const [bx, by] = aPantalla(mouseW[0], mouseW[1]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  ctx.setLineDash([]); ctx.fillStyle = '#e8914a';
  ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Ventana «Tramo curvo» ──
function _numCampoArco(v){ return String(+(+v).toFixed(6)); }
function _campoArco(id, v, soloLectura){
  const e = document.getElementById(id); if(!e) return;
  e.value = v; e.readOnly = !!soloLectura;
  e.style.background = soloLectura ? '#f3f5f7' : '';
}
function _prepararArco(modo, a, b, extra){
  arcoVentana = Object.assign({modo, lado:1,
    A0:{id:a.id, x:a.x, y:a.y, tx:_numCampoArco(a.x), ty:_numCampoArco(a.y)},
    B0:{id:b.id, x:b.x, y:b.y, tx:_numCampoArco(b.x), ty:_numCampoArco(b.y)}}, extra || {});
  const fijo = (modo === 'editar');
  _campoArco('arAx', arcoVentana.A0.tx, fijo); _campoArco('arAy', arcoVentana.A0.ty, fijo);
  _campoArco('arBx', arcoVentana.B0.tx, fijo); _campoArco('arBy', arcoVentana.B0.ty, fijo);
}
function abrirArcoNuevo(Pa, Pb){
  _prepararArco('nuevo', Pa, Pb);
  // Por defecto, un cuarto de circunferencia.
  const c = Math.hypot(Pb.x - Pa.x, Pb.y - Pa.y);
  document.getElementById('arR').value = _numCampoArco(c/Math.SQRT2);
  document.getElementById('arMayor').checked = false;
  document.getElementById('arTitulo').textContent = 'Tramo curvo nuevo';
  _abrirVentanaArco();
}
function abrirArcoEdicion(id){
  const t = tramos.find(z=>z.id===id); if(!t || !esArco(t)) return;
  const a = nodo(t.a), b = nodo(t.b); if(!a || !b) return;
  const c = Math.hypot(b.x - a.x, b.y - a.y);
  const r = radioDesdeFlecha(c, +t.flecha) || {R:c/Math.SQRT2, mayor:false, lado:1};
  _prepararArco('editar', a, b, {tramo:id, lado:r.lado});
  document.getElementById('arR').value = _numCampoArco(r.R);
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
function _nodoEnPuntoArco(x, y){
  const tol = 1e-6*Math.max(1, ...nodos.map(n=>Math.max(Math.abs(n.x), Math.abs(n.y))));
  return nodos.find(n=>Math.hypot(n.x - x, n.y - y) <= tol) || null;
}
// Un punto de la ventana: el nudo que se tocó si sus campos siguen igual, o el
// de las coordenadas escritas (reutilizando el nudo que ya esté ahí).
function _puntoArco(P0, idx, idy){
  const sx = document.getElementById(idx).value, sy = document.getElementById(idy).value;
  if(sx === P0.tx && sy === P0.ty) return {id:P0.id, x:P0.x, y:P0.y};
  const x = parseFloat(sx), y = parseFloat(sy);
  if(!isFinite(x) || !isFinite(y)) return null;
  const e = _nodoEnPuntoArco(x, y);
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
// Hacia dónde se comba, dicho como se ve: con la cuerda más bien horizontal,
// «hacia arriba» o «hacia abajo»; si no, a la izquierda o a la derecha.
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
  const W2 = 360, H2 = 200, m = 44;     // margen para los nombres de los extremos
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((W2 - 2*m)/Math.max(x1 - x0, 1e-9), (H2 - 2*m)/Math.max(y1 - y0, 1e-9));
  const X = x => m + (x - x0)*k + ((W2 - 2*m) - (x1 - x0)*k)/2;
  const Y = y => H2 - m - (y - y0)*k - ((H2 - 2*m) - (y1 - y0)*k)/2;
  const F = v => v.toFixed(1);
  let s = '<line x1="' + F(X(A.x)) + '" y1="' + F(Y(A.y)) + '" x2="' + F(X(B.x)) + '" y2="' + F(Y(B.y))
        + '" stroke="#9aa3ad" stroke-width="1.2" stroke-dasharray="5,4"/>';
  let fuera = () => [0, -1];
  if(arc){
    const C = {x:arc.cx, y:arc.cy};
    [A, B].forEach(Q=>{ s += '<line x1="' + F(X(C.x)) + '" y1="' + F(Y(C.y)) + '" x2="' + F(X(Q.x)) + '" y2="' + F(Y(Q.y))
      + '" stroke="#9aa3ad" stroke-width="1" stroke-dasharray="3,3"/>'; });
    s += '<polyline points="' + muestras.map(p=>F(X(p.x)) + ',' + F(Y(p.y))).join(' ')
       + '" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>';
    s += '<path d="M' + F(X(C.x) - 5) + ' ' + F(Y(C.y)) + 'h10M' + F(X(C.x)) + ' ' + F(Y(C.y) - 5) + 'v10" stroke="#0f5c56" stroke-width="1.4"/>';
    s += '<text x="' + F(X(C.x) + 7) + '" y="' + F(Y(C.y) + 13) + '" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#0f5c56">O</text>';
    const mR = {x:(C.x + A.x)/2, y:(C.y + A.y)/2};
    s += '<text x="' + F(X(mR.x) + 6) + '" y="' + F(Y(mR.y) - 6) + '" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#0f5c56">R = '
       + dec(L.R,'len') + ' ' + unitLen + '</text>';
    fuera = (Q) => { const d = Math.hypot(Q.x - C.x, Q.y - C.y) || 1; return [(Q.x - C.x)/d, (Q.y - C.y)/d]; };
  }
  [[A, 'Inicio'], [B, 'Fin']].forEach(([Q, nom])=>{
    const nombre = (Q.id !== null && nodo(Q.id)) ? nodo(Q.id).nombre : nom;
    const [ux, uy] = fuera(Q);
    s += '<circle cx="' + F(X(Q.x)) + '" cy="' + F(Y(Q.y)) + '" r="4.5" fill="#1e3a8a" stroke="#fff" stroke-width="1.5"/>';
    s += '<text x="' + F(X(Q.x) + ux*14) + '" y="' + F(Y(Q.y) - uy*14 + 4) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="700" fill="#1b1f24" text-anchor="'
       + (ux > 0.3 ? 'start' : (ux < -0.3 ? 'end' : 'middle')) + '">' + escaparHTML(nombre) + '</text>';
  });
  svg.innerHTML = s;
  info.textContent = L.error ? L.error
    : 'Cuerda ' + dec(L.c,'len') + ' ' + unitLen + ' · arco de ' + dec(Math.abs(arc.d)*180/Math.PI,'ang')
      + '° · longitud ' + dec(L.R*Math.abs(arc.d),'len') + ' ' + unitLen
      + ' · centro O (' + dec(arc.cx,'len') + ' ; ' + dec(arc.cy,'len') + ')';
}
function aplicarArco(){
  const V = arcoVentana; if(!V) return;
  const L = leerArco();
  if(L.error){ aviso(L.error, 'error'); return; }
  if(V.modo === 'editar'){
    const t = tramos.find(z=>z.id===V.tramo);
    if(!t){ cerrarArco(); return; }
    // Aplicar lo mismo no es un cambio: ni paso de deshacer ni panel oculto.
    if(Math.abs((+t.flecha || 0) - L.f) <= 1e-12*Math.max(1, Math.abs(L.f))){ cerrarArco(); return; }
    registrarCambio(); t.flecha = L.f; invalidarResultados(); cerrarArco(); refrescar();
    return;
  }
  if(L.A.id !== null && L.B.id !== null
     && tramos.some(t=>(t.a===L.A.id && t.b===L.B.id) || (t.a===L.B.id && t.b===L.A.id))){
    aviso('Ya hay un tramo entre ' + nodo(L.A.id).nombre + ' y ' + nodo(L.B.id).nombre + '.', 'error'); return;
  }
  registrarCambio();
  // Los nudos nuevos van en la coordenada exacta (como `aplicarTramoNuevo`): con
  // `addNodo` se engancharían a la rejilla y el arco no tendría el radio escrito.
  const nuevo = P=>{ const n = addNodo(P.x, P.y); n.x = P.x; n.y = P.y; return n; };
  const na = (L.A.id !== null && nodo(L.A.id)) || nuevo(L.A);
  const nb = (L.B.id !== null && nodo(L.B.id)) || nuevo(L.B);
  const t = addTramo(na.id, nb.id);          // la flecha se mide de a hacia b, como en la ventana
  // Marcos (24-): un arco dibujado aparte es un miembro propio.
  if(t){ t.miembro = ++miembroSeq; cadenaMiembro = null; }
  if(t) t.flecha = L.f;
  invalidarResultados(); cerrarArco(); refrescar();
}
function cerrarArco(){
  const m = document.getElementById('arcoModal'); if(m) m.classList.remove('show');
  arcoVentana = null; curvoPrimer = null; dibujar();
}

// ── Croquis de la ventana de carga sobre un tramo curvo ──
// El arco con su centro O y sus nudos (el primero, con un anillo: desde él se
// mide θ), la carga en su dirección —una concentrada en su punto; una repartida,
// con flechas a lo largo del trozo cargado— y el ángulo θ acotado en O.
function croquisCargaArco(g){
  const W2 = 240, H2 = 190, m = 30, F = v=>v.toFixed(1);
  const A = g.arco, sg = A.d >= 0 ? 1 : -1;
  const eje = ejeTramo(g, 48);
  const pts = eje.concat([{x:A.cx, y:A.cy}]);
  const x0 = Math.min(...pts.map(p=>p.x)), x1 = Math.max(...pts.map(p=>p.x));
  const y0 = Math.min(...pts.map(p=>p.y)), y1 = Math.max(...pts.map(p=>p.y));
  const k = Math.min((W2 - 2*m)/Math.max(x1 - x0, 1e-9), (H2 - 2*m)/Math.max(y1 - y0, 1e-9));
  const X = x=>m + ((W2 - 2*m) - (x1 - x0)*k)/2 + (x - x0)*k;
  const Y = y=>H2 - m - ((H2 - 2*m) - (y1 - y0)*k)/2 - (y - y0)*k;
  const ROJO = '#d94f5c', tipo = edCarga ? edCarga.tipo : 'P';
  const distrib = (tipo === 'U' || tipo === 'T');
  const tot = g.L/A.R*180/Math.PI;
  const th1 = Math.max(0, Math.min(tot, Math.abs(parseFloat(document.getElementById('cgPos').value) || 0)));
  const th2 = distrib ? Math.max(0, Math.min(tot, Math.abs(parseFloat(document.getElementById('cgFin').value) || 0))) : th1;
  const sDe = th=>th*Math.PI/180*A.R;
  let s = '<svg viewBox="0 0 '+W2+' '+H2+'" style="width:100%;height:auto;display:block"><rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';
  const Cx = X(A.cx), Cy = Y(A.cy);
  // Radios a trazos de O al primer nudo y a la carga, y el arco de θ.
  const Pa = puntoEnTramo(g, 0), Pq = puntoEnTramo(g, sDe(th1));
  s += '<line x1="'+F(Cx)+'" y1="'+F(Cy)+'" x2="'+F(X(Pa.x))+'" y2="'+F(Y(Pa.y))+'" stroke="#9aa3ad" stroke-width="1" stroke-dasharray="3,3"/>';
  s += '<line x1="'+F(Cx)+'" y1="'+F(Cy)+'" x2="'+F(X(Pq.x))+'" y2="'+F(Y(Pq.y))+'" stroke="#9aa3ad" stroke-width="1" stroke-dasharray="3,3"/>';
  if(th1 > 0.5){
    const rT = 18, n = 16, arc = [];
    for(let i=0;i<=n;i++){ const al = A.t1 + sg*th1*Math.PI/180*i/n; arc.push([Cx + rT*Math.cos(al), Cy - rT*Math.sin(al)]); }
    s += '<polyline points="'+arc.map(p=>F(p[0])+','+F(p[1])).join(' ')+'" fill="none" stroke="#8b5cf6" stroke-width="1.4"/>';
    const am = A.t1 + sg*th1*Math.PI/360;
    s += '<text x="'+F(Cx + 30*Math.cos(am))+'" y="'+F(Cy - 30*Math.sin(am) + 3)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#8b5cf6" text-anchor="middle">θ = '+dec(th1,'ang')+'°</text>';
  }
  s += '<path d="M'+F(Cx-4)+' '+F(Cy)+'h8M'+F(Cx)+' '+F(Cy-4)+'v8" stroke="#0f5c56" stroke-width="1.3"/>'
     + '<text x="'+F(Cx+6)+'" y="'+F(Cy+12)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#0f5c56">O</text>';
  // El arco y sus nudos.
  s += '<polyline points="'+eje.map(p=>F(X(p.x))+','+F(Y(p.y))).join(' ')+'" fill="none" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  [[g.a, true], [g.b, false]].forEach(([n, primero])=>{
    const px = X(n.x), py = Y(n.y), dx = px - Cx, dy = py - Cy, L = Math.hypot(dx, dy) || 1;
    s += '<circle cx="'+F(px)+'" cy="'+F(py)+'" r="4" fill="#1e3a8a"/>';
    if(primero) s += '<circle cx="'+F(px)+'" cy="'+F(py)+'" r="8.5" fill="none" stroke="#0f766e" stroke-width="1.6"/>';
    s += '<text x="'+F(px + dx/L*15)+'" y="'+F(py + dy/L*15 + 4)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24" text-anchor="middle">'+n.nombre+'</text>';
  });
  // La carga.
  const dirM = _dirModal(), mA = (tipo === 'M') ? null : _magAngModal();
  const mag = mA ? mA.mag : (parseFloat(document.getElementById('cgMag').value) || 0);
  const dirEn = th=>{
    const ss = sDe(th);
    if(dirM === 'perp' || dirM === 'axial') return dirCarga({dir:dirM}, marcoLocalArco(g, ss));
    return dirCarga({dir:dirM, ang:mA ? mA.ang : 270}, g);
  };
  if(distrib && th2 - th1 > 0.2){
    const n = 8, colas = [];
    for(let i=0;i<=n;i++){
      const th = th1 + (th2 - th1)*i/n, P = puntoEnTramo(g, sDe(th)), d = dirEn(th);
      const qx = X(P.x), qy = Y(P.y), L = 26*(mag < 0 ? -1 : 1);
      colas.push([qx - d.x*L, qy + d.y*L]);
      s += _flechaCroquis(qx, qy, d.x*(mag < 0 ? -1 : 1), -d.y*(mag < 0 ? -1 : 1), 26, ROJO, 1.5);
    }
    s += '<polyline points="'+colas.map(p=>F(p[0])+','+F(p[1])).join(' ')+'" fill="none" stroke="'+ROJO+'" stroke-width="1.5"/>';
    const cm = colas[n/2];
    s += '<text x="'+F(cm[0])+'" y="'+F(cm[1] - 5)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'+dec(Math.abs(mag),'f')+' '+uDist()+'</text>';
  } else if(!distrib){
    const qx = X(Pq.x), qy = Y(Pq.y);
    if(tipo === 'M'){
      s += _arcoParCroquis(qx, qy, mag >= 0, ROJO);
    } else if(Math.abs(mag) > 1e-12){
      const d = dirEn(th1);
      s += _flechaPuntualCroquis(qx, qy, d.x, -d.y, 32, mag < 0, ROJO, 2.2);
      s += '<text x="'+F(qx - d.x*42)+'" y="'+F(qy + d.y*42 + 3)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'+dec(Math.abs(mag),'f')+' '+unitFor+'</text>';
    }
    s += '<circle cx="'+F(qx)+'" cy="'+F(qy)+'" r="3.6" fill="'+ROJO+'"/>';
  }
  s += '<text x="'+(W2-6)+'" y="'+(H2-6)+'" font-family="Inter,sans-serif" font-size="9" fill="#66727e" text-anchor="end">R = '+dec(A.R,'len')+' '+unitLen+' · arco de '+dec(tot,'ang')+'°</text>';
  return s + '</svg>';
}

// ═══════════════════════════════════════════════════════════
//  PANTALLA: el tramo curvo por el método de las ecuaciones
//  Por subtramo: el DCL del trozo hasta un corte genérico en θ, con θ marcado
//  desde el centro O, y las tres leyes N(θ), V(θ), M(θ) (03-, `_internasDeArco`)
//  con sus valores en los extremos. θ se mide desde el nudo de entrada, en el
//  centro del arco; en las fórmulas va en radianes.
// ═══════════════════════════════════════════════════════════
function _grados(s, R){ return s/R*180/Math.PI; }
function htmlArcoEcuaciones(r, t, ti){
  const ar = t.arco, g = s=>dec(_grados(s, ar.R),'ang');
  let h = '<div class="sub-tramo-cab">Tramo ' + t.nombre + ' — curvo · R = ' + dec(ar.R,'len') + ' ' + unitLen
        + ' · arco de ' + g(t.L) + '° · L = ' + dec(t.L,'len') + ' ' + unitLen + '</div>';
  t.subs.forEach((su, si)=>{
    const a = g(su.sa), b = g(su.sb);
    const fila = tex=>'<div class="eq-row"><div class="eq-body">' + kx(tex) + '</div></div>';
    h += '<div class="dcl-caja">'
      + '<div class="dcl-rango">' + (t.subs.length > 1 ? 'Subtramo ' + (si+1) + ' · ' : '')
      + kx(a + '^{\\circ} \\le \\theta \\le ' + b + '^{\\circ}')
      + ' <span class="dcl-nota">(θ desde ' + t.desde.nombre + ', medido en el centro O; en las fórmulas, en radianes)</span></div>'
      + svgDCLArco(r, ti, su)
      + '<div class="dcl-ecs">';
    if(!subNulo(su, 'N'))
      h += fila('\\sum F_{\\parallel} = 0:\\quad N(\\theta) = ' + trigTex(su.fN,'f') + '\\ \\ [' + unitFor + ']');
    h += fila('\\sum F_{\\perp} = 0:\\quad V(\\theta) = ' + trigTex(su.fV,'f') + '\\ \\ [' + unitFor + ']');
    h += fila('\\circlearrowleft\\! + \\;\\sum M_{\\text{corte}} = 0:\\quad M(\\theta) = ' + trigTex(su.fM,'mom') + '\\ \\ [' + uMom() + ']');
    const v = (k, s, dt)=>'<b>' + dec(valorSub(su, k, s), dt) + '</b>';
    h += '</div><div class="dcl-extremos">Extremos del subtramo:'
      + (!subNulo(su, 'N') ? '<br>N(' + a + '°) = ' + v('N', su.sa, 'f') + ' · N(' + b + '°) = ' + v('N', su.sb, 'f') + ' ' + unitFor : '')
      + '<br>V(' + a + '°) = ' + v('V', su.sa, 'f') + ' · V(' + b + '°) = ' + v('V', su.sb, 'f') + ' ' + unitFor
      + '<br>M(' + a + '°) = ' + v('M', su.sa, 'mom') + ' · M(' + b + '°) = ' + v('M', su.sb, 'mom') + ' ' + uMom()
      + '</div></div>';
  });
  return h;
}

// Eje de un tramo de la cadena (resultado de 03-) entre s = 0 y s = hasta, en
// el sentido del recorrido: el arco muestreado o el segmento.
function ejeSegmento(seg, hasta){
  const L = (hasta === undefined) ? seg.L : hasta;
  if(seg.arco){
    const n = Math.max(2, Math.ceil(32*L/Math.max(seg.L, 1e-9)));
    return Array.from({length:n + 1}, (_, i)=>puntoArcoRec(seg.arco, L*i/n));
  }
  return [{x:seg.desde.x, y:seg.desde.y}, {x:seg.desde.x + seg.ux*L, y:seg.desde.y + seg.uy*L}];
}
// Repartidas que caen en la cadena antes del punto `sCutG` (posición en la
// cadena), muestreadas para dibujarlas: puntos del eje, dirección de la carga
// positiva y su intensidad. Valen para tramos rectos y curvos.
function repartidasEnTrozo(r, t, sCutG){
  const segsC = cadenaDe(r, t), cadC = cadDe(r, t), tiC = t.idx, out = [];
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const pos = cadC.findIndex(z=>z.t.id===c.tramo);
    if(pos < 0 || pos > tiC) return;
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const el = segsC[pos], inv = (cadC[pos].desde.id !== z.g.a.id);
    const r1 = inv ? (z.g.L - z.s2) : z.s1, r2 = inv ? (z.g.L - z.s1) : z.s2;
    const hasta = Math.min(r2, sCutG - el.s0);
    if(hasta <= r1 + 1e-12) return;
    const n = el.arco ? 8 : 4, pts = [];
    for(let i=0;i<=n;i++){
      const u = r1 + (hasta - r1)*i/n, sT = inv ? z.g.L - u : u;
      const P = el.arco ? puntoArcoRec(el.arco, u) : {x:el.desde.x + el.ux*u, y:el.desde.y + el.uy*u};
      const d = el.arco ? dirRepartidaArco(c, z.g, sT) : dirCarga(c, z.g);
      pts.push({x:P.x, y:P.y, dx:d.x, dy:d.y, w:wRepartidaEn(c, z, sT)});
    }
    out.push({c, pts, peso:!!c._peso});
  });
  return out;
}

// DCL del trozo de la cadena hasta un corte genérico dentro del subtramo `su`
// del arco `t`: la estructura hasta ahí, las acciones que actúan antes, N, V y M
// en la cara cortada (sentido positivo del convenio) y el ángulo θ en O.
function svgDCLArco(r, ti, su){
  const t = r.internas[ti], ar = t.arco;
  const segsC = cadenaDe(r, t), tiC = t.idx;
  const uCut = su.sa + 0.6*(su.sb - su.sa), sCutG = t.s0 + uCut;
  const P = puntoArcoRec(ar, uCut);
  const ejes = [];
  for(let k=0;k<tiC;k++) ejes.push(ejeSegmento(segsC[k]));
  ejes.push(ejeSegmento(t, uCut));
  const nudos = [];
  for(let k=0;k<=tiC;k++) nudos.push(segsC[k].desde);
  const acciones = puntualesDe(r, t).filter(o=>o.s !== null && o.s < sCutG - 1e-9);
  const reps = repartidasEnTrozo(r, t, sCutG);
  const O = {x:ar.cx, y:ar.cy};
  // Escala: todo lo que se dibuja, O incluido.
  const pts = [O, P].concat(...ejes, nudos);
  reps.forEach(d=>d.pts.forEach(p=>pts.push(p)));
  const x0 = Math.min(...pts.map(p=>p.x)), x1 = Math.max(...pts.map(p=>p.x));
  const y0 = Math.min(...pts.map(p=>p.y)), y1 = Math.max(...pts.map(p=>p.y));
  const W2 = 540, MX = 70, MY = 70;
  const k = Math.min((W2 - 2*MX)/Math.max(x1 - x0, 1e-6), (380 - 2*MY)/Math.max(y1 - y0, 1e-6));
  const H2 = Math.max(220, (y1 - y0)*k + 2*MY);
  const SX = x=>MX + ((W2 - 2*MX) - (x1 - x0)*k)/2 + (x - x0)*k, SY = y=>H2 - MY - (y - y0)*k;
  const F = v=>v.toFixed(1);
  const linea = (a, b, col, w, dash)=>'<line x1="'+F(a[0])+'" y1="'+F(a[1])+'" x2="'+F(b[0])+'" y2="'+F(b[1])+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha = (a, b, col, w)=>{
    const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx, dy) || 1, ex = dx/L, ey = dy/L;
    const hx = b[0]-ex*9, hy = b[1]-ey*9;
    return linea(a, [hx, hy], col, w) + '<path d="M '+F(b[0])+' '+F(b[1])+' L '+F(hx-ey*4)+' '+F(hy+ex*4)+' L '+F(hx+ey*4)+' '+F(hy-ex*4)+' Z" fill="'+col+'"/>';
  };
  const texto = (x, y, txt, col, sz, anc, it)=>'<text x="'+F(x)+'" y="'+F(y)+'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="800" fill="'+col+'" text-anchor="'+(anc||'middle')+'"'+(it?' font-style="italic"':'')+'>'+txt+'</text>';
  const arcoM = (cx, cy, rr, col, horario)=>{
    const a0 = -35*Math.PI/180, a1 = 215*Math.PI/180;
    const p1 = [cx + rr*Math.cos(a0), cy - rr*Math.sin(a0)], p2 = [cx + rr*Math.cos(a1), cy - rr*Math.sin(a1)];
    const ini = horario ? p2 : p1, fin = horario ? p1 : p2, af = horario ? a0 : a1;
    const tx = -Math.sin(af), ty = -Math.cos(af), s2 = horario ? -1 : 1;
    return '<path d="M '+F(ini[0])+' '+F(ini[1])+' A '+rr+' '+rr+' 0 1 '+(horario?1:0)+' '+F(fin[0])+' '+F(fin[1])+'" fill="none" stroke="'+col+'" stroke-width="2"/>'
      + '<path d="M '+F(fin[0]+s2*tx*8)+' '+F(fin[1]-s2*ty*8)+' L '+F(fin[0]+3.5*ty*s2)+' '+F(fin[1]+3.5*tx*s2)+' L '+F(fin[0]-3.5*ty*s2)+' '+F(fin[1]-3.5*tx*s2)+' Z" fill="'+col+'"/>';
  };
  let sv = '<svg class="dcl-svg" viewBox="0 0 '+W2+' '+F(H2)+'" xmlns="http://www.w3.org/2000/svg"><rect width="'+W2+'" height="'+F(H2)+'" fill="#fff"/>';
  // θ: radios a trazos de O al nudo de entrada y al corte, y el arco entre ellos.
  const Os = [SX(O.x), SY(O.y)], A0 = puntoArcoRec(ar, 0);
  sv += linea(Os, [SX(A0.x), SY(A0.y)], '#8892a0', 1, '4,3') + linea(Os, [SX(P.x), SY(P.y)], '#8892a0', 1, '4,3');
  const rTh = Math.min(30, 0.35*ar.R*k), nA = 24, arcoTh = [];
  for(let i=0;i<=nA;i++){ const Q = puntoArcoRec(ar, uCut*i/nA); arcoTh.push([Os[0] + (SX(Q.x)-Os[0])/(ar.R*k)*rTh, Os[1] + (SY(Q.y)-Os[1])/(ar.R*k)*rTh]); }
  sv += '<polyline points="'+arcoTh.map(p=>F(p[0])+','+F(p[1])).join(' ')+'" fill="none" stroke="#8b5cf6" stroke-width="1.4"/>';
  const mTh = arcoTh[Math.floor(nA/2)], dTh = [mTh[0]-Os[0], mTh[1]-Os[1]], lTh = Math.hypot(dTh[0], dTh[1]) || 1;
  sv += texto(Os[0] + dTh[0]/lTh*(rTh+11), Os[1] + dTh[1]/lTh*(rTh+11) + 4, 'θ', '#8b5cf6', 12, 'middle', true);
  sv += '<path d="M'+F(Os[0]-5)+' '+F(Os[1])+'h10M'+F(Os[0])+' '+F(Os[1]-5)+'v10" stroke="#0f5c56" stroke-width="1.4"/>' + texto(Os[0]+9, Os[1]+14, 'O', '#0f5c56', 10);
  // Repartidas: flechas hacia el eje y la línea de sus colas.
  const wmax = Math.max(1e-9, ...reps.map(d=>Math.max(...d.pts.map(p=>Math.abs(p.w)))));
  reps.forEach(d=>{
    const colas = d.pts.map(p=>{ const h = 26*p.w/wmax; return [SX(p.x) - p.dx*h, SY(p.y) + p.dy*h]; });
    sv += '<polyline points="'+colas.map(q=>F(q[0])+','+F(q[1])).join(' ')+'" fill="none" stroke="#b8860b" stroke-width="1.6"/>';
    d.pts.forEach((p, i)=>{
      const X = SX(p.x), Y = SY(p.y), c = colas[i];
      if(Math.hypot(c[0]-X, c[1]-Y) > 5) sv += flecha(c, [X - (c[0]-X)*0.1, Y - (c[1]-Y)*0.1], '#b8860b', 1.5);
    });
    const m = colas[Math.floor(colas.length/2)];
    sv += texto(m[0], m[1] - 6, dec(Math.abs(d.pts[0].w),'f'), '#8a6508', 9.5);
  });
  // La estructura hasta el corte.
  ejes.forEach(e=>{ sv += '<polyline points="'+e.map(p=>F(SX(p.x))+','+F(SY(p.y))).join(' ')+'" fill="none" stroke="#26415e" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'; });
  nudos.forEach(n=>{ sv += '<circle cx="'+F(SX(n.x))+'" cy="'+F(SY(n.y))+'" r="4.4" fill="#fff" stroke="#26415e" stroke-width="2"/>' + texto(SX(n.x)-10, SY(n.y)+17, n.nombre, '#1b1f24', 11); });
  // Acciones puntuales antes del corte.
  acciones.forEach(o=>{
    const a = o.a, X = SX(a.x), Y = SY(a.y);
    const col = a.reac ? '#1a7f37' : a.pin ? COL_PIN : a.rama ? COL_RAMA : (Math.abs(a.fx)+Math.abs(a.fy) < 1e-12 ? '#8b5cf6' : '#c62828');
    const Fm = Math.hypot(a.fx, a.fy);
    if(Fm > 1e-12){
      const ex = a.fx/Fm, ey = -a.fy/Fm;
      sv += flecha([X - ex*34, Y - ey*34], [X - ex*4, Y - ey*4], col, 2.2);
      sv += texto(X - ex*44, Y - ey*44 + 3, (a.pin ? nomPlanoTex(a.pin.nombre) + ' = ' : (a.rama ? 'F' + a.rama.nombre + ' = ' : '')) + dec(Fm,'f'), col, 10);
    }
    if(Math.abs(a.m) > 1e-12){
      sv += arcoM(X, Y, 15, col, a.m < 0);
      sv += texto(X + 24, Y - 18, dec(Math.abs(a.m),'mom'), col, 10, 'start');
    }
  });
  // Cara cortada: doble trazo y N (hacia +û), V (hacia −n̂) y M (antihorario).
  const X = SX(P.x), Y = SY(P.y), ux = P.ux, uy = -P.uy, nx = P.nx, ny = -P.ny;
  sv += linea([X+nx*9+ux*3, Y+ny*9+uy*3], [X-nx*9+ux*3, Y-ny*9+uy*3], '#0b57d0', 2);
  sv += linea([X+nx*9+ux*7, Y+ny*9+uy*7], [X-nx*9+ux*7, Y-ny*9+uy*7], '#0b57d0', 2);
  sv += flecha([X+ux*10, Y+uy*10], [X+ux*40, Y+uy*40], '#0b57d0', 2.2) + texto(X+ux*50, Y+uy*50+4, 'N', '#0b57d0', 12, 'middle', true);
  sv += flecha([X, Y], [X-nx*32, Y-ny*32], '#0b57d0', 2.2) + texto(X-nx*44, Y-ny*44+4, 'V', '#0b57d0', 12, 'middle', true);
  sv += arcoM(X-ux*16, Y-uy*16, 12, '#0b57d0', false) + texto(X-ux*16-20, Y-uy*16-16, 'M', '#0b57d0', 12, 'middle', true);
  return sv + '</svg>';
}

// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX DE UN TRAMO CURVO (2026-10-25)
//  θ en el centro O desde el nudo de entrada del recorrido (en las fórmulas, en
//  radianes) y α = α₀ ± θ el ángulo del radio que va al corte. Por subtramo: el
//  DCL del trozo, lo que actúa sobre él reducido a O (ΣFx, ΣFy, ΣM_O) y las tres
//  ecuaciones del corte. Se autocomprueba contra la ley del motor (03-).
// ═══════════════════════════════════════════════════════════
const _radTex = v => (+v).toFixed(4);
const _gradTex = s => dec(s, 'ang') + '^{\\circ}';

// Lo que actúa antes del subtramo `su` (puntuales hasta su inicio, repartidas de
// los tramos anteriores y las de este arco ya terminadas), reducido al centro O,
// y las repartidas de este arco que siguen activas en el subtramo.
function _datosSubArco(R, t, su){
  const ar = t.arco, L = t.L, O = {x:ar.cx, y:ar.cy};
  const sP = su.sa + 1e-9*Math.max(1, L);
  const info = datosCorte(R, t, sP, 'izq');
  let Fx = info.F.x, Fy = info.F.y, Mo = info.F.M;
  const inv = (t.desde.id !== t.tramo.a);
  const activas = [];
  cargasConPeso().filter(c=>(c.tipo==='U'||c.tipo==='T') && c.tramo === t.tramo.id).forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const r1 = inv ? L - z.s2 : z.s1, r2 = inv ? L - z.s1 : z.s2;
    if(r1 > su.sa + 1e-9 || r2 <= su.sa + 1e-9) return;
    // activa: se quita lo que `datosCorte` contó de ella hasta sP
    const a = inv ? L - sP : r1, b = inv ? L - r1 : sP;
    if(b > a){
      const rr = fuerzaRepartidaArco(c, z, a, b, info.P);
      Fx -= rr.Fx; Fy -= rr.Fy; Mo -= rr.Mo;
    }
    activas.push({c, z, r1, th1:r1/ar.R});
  });
  const K = Mo + (info.P.x - O.x)*Fy - (info.P.y - O.y)*Fx;
  return {Fx, Fy, K, activas};
}

// Una ley de θ en filas de un `align` (como mucho tres términos por fila).
function _leyArcoTex(f, dt){
  const base = ['', '\\theta', '\\cos\\theta', '\\operatorname{sen}\\theta', '\\theta\\cos\\theta', '\\theta\\operatorname{sen}\\theta'];
  const ts = [];
  f.forEach((v, i)=>{
    const txt = dec(Math.abs(v), dt);
    if(Math.abs(v) < 5e-12 || /^0(\.0+)?$/.test(txt)) return;
    ts.push({neg:v < 0, tex:txt + (i ? '\\,' + base[i] : '')});
  });
  if(!ts.length) return '0';
  let s = '';
  ts.forEach((q, i)=>{
    if(i && i % 3 === 0) s += ' \\\\ &\\qquad ';
    s += (i ? (q.neg ? ' - ' : ' + ') : (q.neg ? '-' : '')) + q.tex;
  });
  return s;
}

// El DCL del trozo hasta un corte genérico del subtramo, en TikZ (el mismo
// dibujo que `svgDCLArco`): nombres en la figura y valores en la caja.
function tikzDCLArcoTex(R, t, su){
  const ar = t.arco, segsC = cadenaDe(R, t), tiC = t.idx;
  const uCut = su.sa + 0.6*(su.sb - su.sa), sCutG = t.s0 + uCut;
  const P = puntoArcoRec(ar, uCut);
  const ejes = [];
  for(let k=0;k<tiC;k++) ejes.push(ejeSegmento(segsC[k]));
  ejes.push(ejeSegmento(t, uCut));
  const nudos = [];
  for(let k=0;k<=tiC;k++) nudos.push(segsC[k].desde);
  const acciones = puntualesDe(R, t).filter(o=>o.s !== null && o.s < sCutG - 1e-9);
  const reps = repartidasEnTrozo(R, t, sCutG);
  const O = {x:ar.cx, y:ar.cy};
  const pts = [O, P].concat(...ejes, nudos);
  reps.forEach(d=>d.pts.forEach(p=>pts.push(p)));
  const x0 = Math.min(...pts.map(p=>p.x)), x1 = Math.max(...pts.map(p=>p.x));
  const y0 = Math.min(...pts.map(p=>p.y)), y1 = Math.max(...pts.map(p=>p.y));
  const k = Math.min(7/Math.max(x1 - x0, 1e-6), 5.2/Math.max(y1 - y0, 1e-6));
  const X = x=>(x - x0)*k, Y = y=>(y - y0)*k, F = v=>v.toFixed(3);
  const c2 = p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')';
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uW = escLatex(uDist());
  tzReiniciar();
  const valores = [], pend = [];
  let out = '';
  // θ: radios a trazos de O al nudo de entrada y al corte, y el arco entre ellos
  const A0 = puntoArcoRec(ar, 0);
  out += '\\draw[black!45, dashed, line width=.4pt] ' + c2(O) + ' -- ' + c2(A0) + ' ' + c2(O) + ' -- ' + c2(P) + ';\n';
  const rTh = Math.min(0.8, 0.35*ar.R*k), nA = 24, arcTh = [];
  for(let i=0;i<=nA;i++){ const Q = puntoArcoRec(ar, uCut*i/nA); arcTh.push({x:X(O.x) + (X(Q.x) - X(O.x))/(ar.R*k)*rTh, y:Y(O.y) + (Y(Q.y) - Y(O.y))/(ar.R*k)*rTh}); }
  out += '\\draw[-{Latex[length=1.5mm]}, bsaMomento, line width=.6pt] ' + arcTh.map(p=>'(' + F(p.x) + ',' + F(p.y) + ')').join(' -- ') + ';\n';
  arcTh.forEach((p, i)=>{ if(i) tzOcuparTrazo(arcTh[i-1].x, arcTh[i-1].y, p.x, p.y, 0.03); });
  const mT = arcTh[nA >> 1], dmx = mT.x - X(O.x), dmy = mT.y - Y(O.y), lm = Math.hypot(dmx, dmy) || 1;
  pend.push({x:X(O.x) + dmx/lm*(rTh + 0.22), y:Y(O.y) + dmy/lm*(rTh + 0.22), txt:'$\\theta$', opts:'font=\\scriptsize, color=bsaMomento', dir:[dmx, dmy]});
  out += '\\draw[bsaMuted, line width=.5pt] (' + F(X(O.x)-0.09) + ',' + F(Y(O.y)) + ') -- (' + F(X(O.x)+0.09) + ',' + F(Y(O.y)) + ') ('
       + F(X(O.x)) + ',' + F(Y(O.y)-0.09) + ') -- (' + F(X(O.x)) + ',' + F(Y(O.y)+0.09) + ');\n';
  tzOcupar(X(O.x)-0.1, Y(O.y)-0.1, X(O.x)+0.1, Y(O.y)+0.1);
  pend.push({x:X(O.x) - 0.2, y:Y(O.y) - 0.2, txt:'$O$', opts:'font=\\scriptsize, color=bsaMuted', dir:[-1, -1]});
  // Repartidas: flechas hacia el eje y la línea de sus colas
  reps.forEach(d=>{
    const nom = nombreCargaFI(d.c);
    const colas = d.pts.map(p=>({x:X(p.x) - p.dx*0.5*Math.sign(p.w || 1), y:Y(p.y) - p.dy*0.5*Math.sign(p.w || 1)}));
    out += '\\draw[bsaDist, line width=.7pt] ' + colas.map(q=>'(' + F(q.x) + ',' + F(q.y) + ')').join(' -- ') + ';\n';
    d.pts.forEach((p, i)=>{
      const q = colas[i];
      out += '\\draw[-{Latex[length=1.4mm]}, bsaDist, line width=.6pt] (' + F(q.x) + ',' + F(q.y) + ') -- (' + F(X(p.x) - p.dx*0.04) + ',' + F(Y(p.y) - p.dy*0.04) + ');\n';
      tzOcuparTrazo(q.x, q.y, X(p.x), Y(p.y), 0.04);
      if(i) tzOcuparTrazo(colas[i-1].x, colas[i-1].y, q.x, q.y, 0.04);
    });
    const m = colas[colas.length >> 1], pm = d.pts[d.pts.length >> 1];
    pend.push({x:m.x - pm.dx*0.2, y:m.y - pm.dy*0.2, txt:'$' + nom + '$', opts:'font=\\tiny, color=bsaDist!70!black', dir:[-pm.dx, -pm.dy]});
    valores.push({nom, val:dec(Math.abs(d.pts[0].w),'fuerza') + '\\,\\text{' + uW + '}'});
  });
  // La estructura hasta el corte
  ejes.forEach(e=>{
    out += '\\draw[line width=1.6pt, color=bsaAcc2, line join=round, line cap=round] ' + e.map(c2).join(' -- ') + ';\n';
    e.forEach((p, i)=>{ if(i) tzOcuparTrazo(X(e[i-1].x), Y(e[i-1].y), X(p.x), Y(p.y), 0.06); });
  });
  nudos.forEach(n=>{
    out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.8pt] ' + c2(n) + ' circle (0.06);\n';
    tzOcupar(X(n.x)-0.1, Y(n.y)-0.1, X(n.x)+0.1, Y(n.y)+0.1);
    const x = X(n.x), y = Y(n.y), e = 0.2;
    pend.push({x:x + e, y:y - e, txt:escLatex(n.nombre), opts:'font=\\scriptsize\\bfseries, color=bsaAcc2', dir:[1, -1],
      candidatos:[{x:x+e, y:y-e}, {x:x-e, y:y-e}, {x:x+e, y:y+e}, {x:x-e, y:y+e}]});
  });
  // Acciones puntuales antes del corte
  acciones.forEach(o=>{
    const a = o.a, x = X(a.x), y = Y(a.y), Fm = Math.hypot(a.fx, a.fy);
    const nom = nombreAccion(a);
    const col = a.reac ? 'bsaReac' : (a.rama ? 'orange!80!black' : 'bsaCarga');
    if(Fm > 1e-12){
      const ex = a.fx/Fm, ey = a.fy/Fm;
      out += '\\draw[-{Latex[length=2mm]}, ' + col + ', line width=1pt] (' + F(x - ex*0.85) + ',' + F(y - ey*0.85) + ') -- (' + F(x - ex*0.08) + ',' + F(y - ey*0.08) + ');\n';
      tzOcuparTrazo(x - ex*0.85, y - ey*0.85, x - ex*0.08, y - ey*0.08, 0.06);
      pend.push({x:x - ex*1.05, y:y - ey*1.05, txt:'$' + nom.tex + '$', opts:'font=\\tiny, color=' + col, dir:[-ex, -ey]});
      valores.push({nom:nom.tex, val:dec(Fm,'fuerza') + '\\,\\text{' + uF + '}'});
    }
    if(Math.abs(a.m) > 1e-12){
      const colM = a.reac ? 'bsaReac' : (a.rama ? 'orange!80!black' : 'bsaMomento');
      out += '\\draw[' + (a.m > 0 ? '-{Latex[length=1.8mm]}' : '{Latex[length=1.8mm]}-') + ', ' + colM + ', line width=.9pt] (' + F(x + 0.3) + ',' + F(y) + ') arc (0:300:0.3);\n';
      tzOcuparArco(x, y, 0.3, 0.05);
      const nm = nom.texM || nom.tex;
      pend.push({x:x + 0.5, y:y + 0.42, txt:'$' + nm + '$', opts:'font=\\tiny, color=' + colM, dir:[1, 1]});
      valores.push({nom:nm, val:dec(Math.abs(a.m),'momento') + '\\,\\text{' + uM + '}'});
    }
  });
  // Cara cortada: N hacia +û, V hacia −n̂ y M antihorario
  const x = X(P.x), y = Y(P.y), ux = P.ux, uy = P.uy, nx = P.nx, ny = P.ny;
  out += '\\draw[bsaAcc, line width=.9pt] (' + F(x + nx*0.2 + ux*0.06) + ',' + F(y + ny*0.2 + uy*0.06) + ') -- (' + F(x - nx*0.2 + ux*0.06) + ',' + F(y - ny*0.2 + uy*0.06) + ');\n';
  out += '\\draw[-{Latex[length=2mm]}, bsaAcc, line width=1pt] (' + F(x + ux*0.12) + ',' + F(y + uy*0.12) + ') -- (' + F(x + ux*0.85) + ',' + F(y + uy*0.85) + ');\n';
  out += '\\draw[-{Latex[length=2mm]}, bsaAcc, line width=1pt] ' + c2(P) + ' -- (' + F(x - nx*0.75) + ',' + F(y - ny*0.75) + ');\n';
  out += '\\draw[-{Latex[length=1.8mm]}, bsaAcc, line width=.9pt] (' + F(x - ux*0.32 + 0.24) + ',' + F(y - uy*0.32) + ') arc (0:300:0.24);\n';
  tzOcuparTrazo(x, y, x + ux*0.85, y + uy*0.85, 0.06);
  tzOcuparTrazo(x, y, x - nx*0.75, y - ny*0.75, 0.06);
  tzOcuparArco(x - ux*0.32, y - uy*0.32, 0.24, 0.05);
  pend.push({x:x + ux*1.05, y:y + uy*1.05, txt:'$N$', opts:'font=\\scriptsize, color=bsaAcc', dir:[ux, uy]});
  pend.push({x:x - nx*0.95, y:y - ny*0.95, txt:'$V$', opts:'font=\\scriptsize, color=bsaAcc', dir:[-nx, -ny]});
  pend.push({x:x - ux*0.32 + 0.38, y:y - uy*0.32 + 0.36, txt:'$M$', opts:'font=\\scriptsize, color=bsaAcc', dir:[1, 1]});
  pend.push({x:x + nx*0.32, y:y + ny*0.32, txt:'$S$', opts:'font=\\scriptsize, color=bsaAcc', dir:[nx, ny]});
  pend.forEach(r=>{
    out += r.candidatos ? tzTextoEn(r.candidatos, r.txt, r.opts, r.dir[0], r.dir[1]) : tzTexto(r.x, r.y, r.txt, r.opts, r.dir[0], r.dir[1]);
  });
  return out + leyendaFigFI(valores);
}

// Desarrollo de un grupo curvo en el paso 2 del informe.
function desarrolloArcoTex(R, grupos, gg, figCaption){
  const t = gg.tramos[0], ar = t.arco, g = geoTramo(t.tramo);
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uL = escLatex(unitLen), uW = escLatex(uDist());
  const sg = ar.sg, nO = escLatex(t.desde.nombre);
  let out = '';
  // Lo que llega por el nudo de quiebre, como en un tramo recto (16-).
  const s0 = t.subs[0];
  if(gg.anterior) out += bloqueQuiebre(R, grupos, gg, {ctes:{N0:valorSub(s0,'N',s0.sa), V0:valorSub(s0,'V',s0.sa), M0:valorSub(s0,'M',s0.sa)}});
  else out += bloqueArranque(R, gg);
  // Geometría del corte: centro, radio y el ángulo del radio que va al corte.
  let a0 = ar.a0;
  while(a0 > Math.PI) a0 -= 2*Math.PI;
  while(a0 <= -Math.PI) a0 += 2*Math.PI;
  out += '\\begin{align*}\n'
    + 'O &= (' + dec(ar.cx,'len') + ';\\ ' + dec(ar.cy,'len') + ')\\ \\text{' + uL + '},\\quad R = ' + dec(ar.R,'len') + '\\ \\text{' + uL + '}'
    + ',\\quad \\alpha = ' + _radTex(a0) + (sg > 0 ? ' + ' : ' - ') + '\\theta\\ \\ \\text{(rad)} \\\\\n'
    + 'x_S &= x_O + R\\cos\\alpha,\\quad y_S = y_O + R\\operatorname{sen}\\alpha \\\\\n'
    + '\\hat u &= ' + (sg > 0 ? '(-\\operatorname{sen}\\alpha,\\ \\cos\\alpha)' : '(\\operatorname{sen}\\alpha,\\ -\\cos\\alpha)')
    + ',\\quad \\hat n = ' + (sg > 0 ? '(-\\cos\\alpha,\\ -\\operatorname{sen}\\alpha)' : '(\\cos\\alpha,\\ \\operatorname{sen}\\alpha)')
    + '\n\\end{align*}\n';
  const sN = sg > 0 ? '' : '-', sV = sg > 0 ? '-' : '';
  t.subs.forEach(su=>{
    const a = su.sa/ar.R*180/Math.PI, b = su.sb/ar.R*180/Math.PI;
    out += '\\par\\noindent\\begin{minipage}{\\linewidth}\n'
      + '{\\bfseries Corte en $' + _gradTex(a) + ' \\le \\theta \\le ' + _gradTex(b) + '$}\n'
      + '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}\n' + tikzDCLArcoTex(R, t, su)
      + '\\end{tikzpicture}}\\end{center}\n\\end{minipage}\n';
    out += figCaption('DCL del trozo antes de la sección $S$; $\\theta$ desde ' + nO + ', medido en $O$.');
    // Lo que actúa sobre el trozo, reducido a O.
    const d = _datosSubArco(R, t, su);
    const fx = [], fy = [], mo = [];
    const sumar = (lista, v, dt) => { if(Math.abs(v) > 5e-9) lista.push({v, tex:dec(Math.abs(v), dt)}); };
    sumar(fx, d.Fx, 'fuerza'); sumar(fy, d.Fy, 'fuerza'); sumar(mo, d.K, 'momento');
    const leyes = _leyesConstante(ar, d.Fx, d.Fy, d.K);
    const wTxt = [];
    d.activas.forEach(p=>{
      const c = p.c, nom = nombreCargaFI(c), w = c.mag, wR = w*ar.R, wR2 = w*ar.R*ar.R;
      const al1 = ar.a0 + sg*p.th1, th1 = _radTex(p.th1);
      const dth = Math.abs(p.th1) < 5e-9 ? '\\theta' : '(\\theta - ' + th1 + ')';
      // (sen α − sen α₁) y (cos α − cos α₁), sin el término si es nulo
      const resta = (f, v) => Math.abs(v) < 5e-5 ? f : '(' + f + (v < 0 ? ' + ' : ' - ') + _radTex(Math.abs(v)) + ')';
      const dsin = resta('\\operatorname{sen}\\alpha', Math.sin(al1)), dcos = resta('\\cos\\alpha', Math.cos(al1));
      const desde = '\\text{ desde } \\theta_1 = ' + _gradTex(p.th1*180/Math.PI) + (Math.abs(p.th1) < 5e-9 ? '' : ' = ' + th1 + '\\ \\text{rad}');
      if(dirDeCarga(c) === 'perp'){
        wTxt.push(nom + ' = ' + dec(Math.abs(w),'fuerza') + '\\ \\text{' + uW + ' (radial)}' + desde);
        fx.push({v:-sg*wR, tex:dec(Math.abs(wR),'fuerza') + '\\,' + dsin});
        fy.push({v: sg*wR, tex:dec(Math.abs(wR),'fuerza') + '\\,' + dcos});
      } else {
        const dd = dirCarga(c, g);
        wTxt.push(nom + ' = ' + dec(Math.abs(w),'fuerza') + '\\ \\text{' + uW + '}' + desde);
        if(Math.abs(dd.x) > 1e-9) fx.push({v:wR*dd.x, tex:dec(Math.abs(wR*dd.x),'fuerza') + '\\,' + dth});
        if(Math.abs(dd.y) > 1e-9) fy.push({v:wR*dd.y, tex:dec(Math.abs(wR*dd.y),'fuerza') + '\\,' + dth});
        if(Math.abs(dd.x) > 1e-9) mo.push({v:sg*wR2*dd.x, tex:dec(Math.abs(wR2*dd.x),'momento') + '\\,' + dcos});
        if(Math.abs(dd.y) > 1e-9) mo.push({v:sg*wR2*dd.y, tex:dec(Math.abs(wR2*dd.y),'momento') + '\\,' + dsin});
      }
      const l = _leyesRepartidaArco(ar, c, g, p.th1);
      if(l) _sumaLeyes(leyes, l);
    });
    // Autocontrol: lo escrito reproduce la ley del motor.
    ['N','V','M'].forEach(kk=>{
      const f1 = leyes[kk], f2 = su['f' + kk], esc = Math.max(1, ...f2.map(Math.abs));
      if(f1.some((v, i)=>Math.abs(v - f2[i]) > 1e-6*esc))
        console.warn('Informe LaTeX: el desarrollo del arco no reproduce la ley de ' + kk, {tramo:gg.recorrido, sa:su.sa, f1, f2});
    });
    if(wTxt.length) out += '$$' + wTxt.join(',\\qquad ') + '$$\n';
    const fila = (izq, ts, dt)=>{
      if(!ts.length) return izq + ' &= 0';
      let s = izq + ' &= ';
      ts.forEach((q, i)=>{
        if(i && i % 3 === 0) s += ' \\\\ &\\qquad ';
        s += (i ? (q.v < 0 ? ' - ' : ' + ') : (q.v < 0 ? '-' : '')) + q.tex;
      });
      return s + '\\ \\text{' + (dt === 'momento' ? uM : uF) + '}';
    };
    out += _alineada([fila('\\textstyle\\sum F_x', fx, 'fuerza'), fila('\\textstyle\\sum F_y', fy, 'fuerza'),
                      fila('\\textstyle\\sum M_O', mo, 'momento')]);
    const pares = [];
    if(!subNulo(su, 'N'))
      pares.push(['\\sum F_{\\parallel} = 0:\\quad & N = ' + sN + '\\left(\\textstyle\\sum F_x\\operatorname{sen}\\alpha - \\sum F_y\\cos\\alpha\\right)',
                  '& N(\\theta) = ' + _leyArcoTex(su.fN, 'fuerza') + '\\ \\text{' + uF + '}']);
    pares.push(['\\sum F_{\\perp} = 0:\\quad & V = ' + sV + '\\left(\\textstyle\\sum F_x\\cos\\alpha + \\sum F_y\\operatorname{sen}\\alpha\\right)',
                '& V(\\theta) = ' + _leyArcoTex(su.fV, 'fuerza') + '\\ \\text{' + uF + '}']);
    pares.push(['\\circlearrowleft\\!+\\ \\sum M_{S} = 0:\\quad & M = -\\textstyle\\sum M_O + R\\left(\\sum F_y\\cos\\alpha - \\sum F_x\\operatorname{sen}\\alpha\\right)',
                '& M(\\theta) = ' + _leyArcoTex(su.fM, 'momento') + '\\ \\text{' + uM + '}']);
    out += _ecuaciones(pares);
    // Valores en los extremos y donde M es extremo o se anula.
    const puntos = [{s:su.sa, nota:''}, {s:su.sb, nota:''}];
    extremosSub(su, 'M').forEach(s=>{ if(s > su.sa + 1e-6 && s < su.sb - 1e-6) puntos.push({s, nota:'$M$ extremo'}); });
    cerosSub(su, 'M').forEach(s=>{ if(s > su.sa + 1e-6 && s < su.sb - 1e-6) puntos.push({s, nota:'$M = 0$'}); });
    puntos.sort((p, q)=>p.s - q.s);
    const hayN = !subNulo(su, 'N'), hayNota = puntos.some(p=>p.nota);
    out += tablaCaption('Valores de la ley en los extremos del intervalo' + (hayNota ? ' y en sus puntos singulares' : '') + '.');
    out += '{\\footnotesize\\begin{center}\\begin{tabular}{r' + (hayN ? 'r' : '') + 'rr' + (hayNota ? 'l' : '') + '}\n\\hline\n'
      + '$\\theta$ [$^{\\circ}$] & ' + (hayN ? '$N$ [' + uF + '] & ' : '') + '$V$ [' + uF + '] & $M$ [' + uM + ']'
      + (hayNota ? ' & ' : '') + ' \\\\\n\\hline\n';
    puntos.forEach(p=>{
      out += dec(p.s/ar.R*180/Math.PI,'ang') + ' & ' + (hayN ? dec(valorSub(su,'N',p.s),'fuerza') + ' & ' : '')
        + dec(valorSub(su,'V',p.s),'fuerza') + ' & ' + dec(valorSub(su,'M',p.s),'momento')
        + (hayNota ? ' & {\\scriptsize\\color{bsaMuted}' + p.nota + '}' : '') + ' \\\\\n';
    });
    out += '\\hline\n\\end{tabular}\\end{center}}\n';
    out += '\\vspace{3pt}\\noindent{\\color{bsaMuted}\\rule{0.35\\linewidth}{.3pt}}\\\\[3pt]\n';
  });
  return out;
}

// Diagramas de un grupo curvo en el paso 3: N, V y M dibujados sobre el arco
// (ordenada por la normal +n̂ de cada punto) y, debajo, desarrollados frente a θ.
function tikzDiagramaSobreArco(R, gg, clave, color, titulo){
  const t = gg.tramos[0];
  const muestras = [];
  let vmax = 0;
  t.subs.forEach(su=>{
    const pts = [];
    for(let i=0;i<=24;i++){
      const s = su.sa + (su.sb - su.sa)*i/24, P = puntoArcoRec(t.arco, s), v = valorSub(su, clave, s);
      pts.push({x:P.x, y:P.y, nx:P.nx, ny:P.ny, v}); vmax = Math.max(vmax, Math.abs(v));
    }
    muestras.push(pts);
  });
  const eje = ejeSegmento(t);
  const xs = eje.map(p=>p.x), ys = eje.map(p=>p.y);
  const D = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-9);
  const esc = vmax > 1e-9 ? 0.22*D/vmax : 0;
  const todos = eje.slice();
  muestras.forEach(m=>m.forEach(p=>todos.push({x:p.x + p.nx*p.v*esc, y:p.y + p.ny*p.v*esc})));
  const x0 = Math.min(...todos.map(p=>p.x)), x1 = Math.max(...todos.map(p=>p.x));
  const y0 = Math.min(...todos.map(p=>p.y)), y1 = Math.max(...todos.map(p=>p.y));
  const k = Math.min(5.2/Math.max(x1 - x0, 1e-9), 4.2/Math.max(y1 - y0, 1e-9));
  const X = x=>(x - x0)*k, Y = y=>(y - y0)*k, F = v=>v.toFixed(3);
  tzReiniciar();
  let out = '';
  const pend = [];
  muestras.forEach(m=>{
    const curva = m.map(p=>({x:X(p.x + p.nx*p.v*esc), y:Y(p.y + p.ny*p.v*esc)}));
    const base = m.map(p=>({x:X(p.x), y:Y(p.y)}));
    out += '\\fill[' + color + '!14] ' + base.concat(curva.slice().reverse()).map(p=>'(' + F(p.x) + ',' + F(p.y) + ')').join(' -- ') + ' -- cycle;\n';
    out += '\\draw[' + color + ', line width=1pt, line join=round] ' + curva.map(p=>'(' + F(p.x) + ',' + F(p.y) + ')').join(' -- ') + ';\n';
    out += '\\draw[' + color + ', line width=.6pt] (' + F(base[0].x) + ',' + F(base[0].y) + ') -- (' + F(curva[0].x) + ',' + F(curva[0].y) + ') ('
         + F(base[base.length-1].x) + ',' + F(base[base.length-1].y) + ') -- (' + F(curva[curva.length-1].x) + ',' + F(curva[curva.length-1].y) + ');\n';
    curva.forEach((p, i)=>{ if(i) tzOcuparTrazo(curva[i-1].x, curva[i-1].y, p.x, p.y, 0.04); });
  });
  out += '\\draw[line width=1.3pt, color=bsaAcc2, line join=round] ' + eje.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ') + ';\n';
  eje.forEach((p, i)=>{ if(i) tzOcuparTrazo(X(eje[i-1].x), Y(eje[i-1].y), X(p.x), Y(p.y), 0.05); });
  [t.desde, t.hasta].forEach(n=>{
    out += '\\filldraw[color=bsaAcc2] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (0.045);\n';
    tzOcupar(X(n.x)-0.08, Y(n.y)-0.08, X(n.x)+0.08, Y(n.y)+0.08);
  });
  // Valores: extremos de cada subtramo y el mayor en valor absoluto.
  const dt = clave === 'M' ? 'momento' : 'fuerza', vistos = [];
  const rotular = p=>{
    if(Math.abs(p.v) < 1e-7 || vistos.some(q=>Math.hypot(q.x - p.x, q.y - p.y) < 1e-6 && Math.abs(q.v - p.v) < 5e-3*Math.max(1, Math.abs(p.v)))) return;
    vistos.push(p);
    const s = Math.sign(p.v) || 1, cx = X(p.x + p.nx*p.v*esc), cy = Y(p.y + p.ny*p.v*esc);
    pend.push({x:cx + p.nx*s*0.22, y:cy + p.ny*s*0.22, txt:dec(p.v, dt), opts:'font=\\tiny, color=' + color, dir:[p.nx*s, p.ny*s]});
  };
  muestras.forEach(m=>{ rotular(m[0]); rotular(m[m.length-1]); });
  let mx = null;
  muestras.forEach(m=>m.forEach(p=>{ if(!mx || Math.abs(p.v) > Math.abs(mx.v) + 1e-9) mx = p; }));
  if(mx) rotular(mx);
  pend.forEach(r=>{ out += tzTexto(r.x, r.y, r.txt, r.opts, r.dir[0], r.dir[1]); });
  out += '\\node[anchor=south west, font=\\scriptsize\\bfseries, color=' + color + '] at (current bounding box.north west) {' + titulo + '};\n';
  return out;
}
function diagramasArcoTex(R, gg){
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const t = gg.tramos[0];
  const hayN = t.subs.some(su=>!subNulo(su, 'N'));
  const series = [];
  if(hayN) series.push({k:'N', col:'bsaVerde', tit:'$N$ [' + uF + ']'});
  series.push({k:'V', col:'bsaCarga', tit:'$V$ [' + uF + ']'});
  series.push({k:'M', col:'bsaMomento', tit:'$M$ [' + uM + ']'});
  // Sobre el arco, de dos en dos.
  const piezas = series.map(se=>'\\begin{tikzpicture}[baseline=(current bounding box.center)]\n'
    + tikzDiagramaSobreArco(R, gg, se.k, se.col, se.tit) + '\\end{tikzpicture}');
  let filas = '';
  for(let i=0;i<piezas.length;i+=2)
    filas += piezas[i] + ' & ' + (piezas[i+1] || '') + (i + 2 < piezas.length ? ' \\\\[6mm]\n' : '\n');
  let out = '\\begin{center}\\bsaEncajar{\\begin{tabular}{@{}c@{\\hspace{8mm}}c@{}}\n' + filas + '\\end{tabular}}\\end{center}\n';
  // Desarrollados frente a θ, apilados (16-, `tikzDiagramaGrupo`).
  const W = 10, HH = 1.4;
  let y = 0, cuerpo = '';
  series.forEach(se=>{
    cuerpo += '\\begin{scope}[yshift=' + y.toFixed(2) + 'cm]\n' + tikzDiagramaGrupo(R, gg, se.k, se.col, W, HH, se.tit) + '\\end{scope}\n';
    y -= (2*HH + 1.9);
  });
  out += '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}\n' + cuerpo + '\\end{tikzpicture}}\\end{center}\n';
  return out;
}
