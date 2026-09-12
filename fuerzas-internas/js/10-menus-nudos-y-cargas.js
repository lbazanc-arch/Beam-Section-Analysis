// ── Cargas ──
function nuevaCarga(tipo){
  if(!tramos.length){ aviso('Primero construye al menos un tramo de viga.', 'error'); return; }
  edCarga = {nuevo:true, tipo};
  abrirCargaModal(tipo, null);
}
function abrirCargaModal(tipo, c){
  const tit={P:'Carga puntual', PX:'Carga puntual',
             U:'Carga uniforme',T:'Carga triangular',M:'Momento concentrado'};
  const distrib = (tipo==='U'||tipo==='T');
  document.getElementById('cgTitulo').textContent = tit[tipo]||'Carga';
  document.getElementById('cgSub').textContent = distrib
    ? 'Indica dónde empieza y dónde acaba dentro del tramo, y en qué dirección actúa.'
    : 'Sobre un tramo, a una distancia de su inicio, o sobre un nudo.';

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
  const _o = document.getElementById('cgDir');
  const _dirIni = c ? dirDeCarga(c) : (tipo === 'PX' ? 'x' : 'y');
  if(_o) _o.value = _dirIni;
  // Ángulo de la carga inclinada, en el convenio del alumno: señala DE DÓNDE
  // VIENE la flecha. Por defecto 90° (hacia abajo), que es el sentido
  // positivo de la vertical: elegir «Inclinada» no mueve la carga.
  const _a = document.getElementById('cgAng');
  if(_a) _a.value = (c && c.ang !== undefined && isFinite(+c.ang))
                      ? bsaAnguloOpuesto(c.ang, true) : 90;
  const _b = document.getElementById('cgBase');
  if(_b) _b.value = (c && c.basePos) || 'eje';
  // Se fija el modo de partida ANTES de refrescar etiquetas, para que al
  // abrir no se dispare una conversión de valores que ya están en su modo.
  _baseAnterior = (c && c.basePos) || 'eje';
  if(typeof cambioBasePos === 'function') cambioBasePos();
  // El momento no tiene dirección que elegir: gira en el plano.
  const _grDir = document.getElementById('cgGrupoDir');
  if(_grDir) _grDir.style.display = (tipo === 'M') ? 'none' : '';
  setDirCarga(_dirIni);
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

// ── Flecha del croquis ────────────────────────────────────────────
// LLEGA al punto (x,y) viniendo del lado contrario al que apunta, igual que
// en el lienzo y en los DCL del informe: la punta toca el punto de
// aplicación. (ux,uy) es el sentido EN PANTALLA, con la y hacia abajo.
function _flechaCroquis(x, y, ux, uy, L, col, w){
  const F = v => v.toFixed(1);
  const x0 = x - ux*L, y0 = y - uy*L;
  const gr = (Math.atan2(uy, ux)*180/Math.PI).toFixed(1);
  return '<line x1="'+F(x0)+'" y1="'+F(y0)+'" x2="'+F(x-ux*1.5)+'" y2="'+F(y-uy*1.5)
       + '" stroke="'+col+'" stroke-width="'+(w||2)+'"/>'
       + '<polygon points="0,0 -7.5,-3.4 -7.5,3.4" fill="'+col+'" transform="translate('
       + F(x)+','+F(y)+') rotate('+gr+')"/>';
}
// ── Arco del par ────────────────────────────────────────────────
// El sentido de giro es justo lo que no se veía: un par positivo es
// ANTIHORARIO (CLAUDE.md §7) y su punta de flecha tiene que decirlo.
function _arcoParCroquis(x, y, anti, col){
  const F = v => v.toFixed(1), r = 15;
  const rad = g => g*Math.PI/180;
  // Arco de unos 280° recorrido EN EL SENTIDO DEL GIRO, para que la punta
  // caiga donde de verdad termina el trazo.
  const a0 = anti ? -55 : 235, a1 = anti ? 235 : -55;
  const x0 = x + r*Math.cos(rad(a0)), y0 = y - r*Math.sin(rad(a0));
  const x1 = x + r*Math.cos(rad(a1)), y1 = y - r*Math.sin(rad(a1));
  // En pantalla la y va hacia abajo, así que el antihorario del plano se
  // dibuja con sweep-flag 0.
  const sweep = anti ? 0 : 1;
  // La punta es tangente al arco en su extremo: perpendicular al radio y
  // girada hacia donde avanza el trazo.
  const tg = a1 + (anti ? 90 : -90);
  return '<path d="M '+F(x0)+' '+F(y0)+' A '+r+' '+r+' 0 1 '+sweep+' '+F(x1)+' '+F(y1)
       + '" fill="none" stroke="'+col+'" stroke-width="2.2"/>'
       + '<polygon points="0,0 -8,-3.6 -8,3.6" fill="'+col+'" transform="translate('
       + F(x1)+','+F(y1)+') rotate('+(-tg).toFixed(1)+')"/>';
}

// ── Croquis de una carga puesta sobre un NUDO ──────────────────────
// Antes aquí solo había una frase: el alumno no veía ni hacia dónde tira la
// carga ni, en el par, en qué sentido gira. Mismo planteamiento que el
// croquis de nudo de armaduras: el nudo, los tramos que llegan y la flecha.
function _croquisCargaNudo(){
  const W2 = 240, H2 = 150, F = v => v.toFixed(1), ROJO = '#d94f5c';
  const n = nodo(parseInt((document.getElementById('cgNudo')||{}).value, 10));
  const cx = W2/2, cy = H2/2;
  let s = '<svg viewBox="0 0 '+W2+' '+H2+'" style="width:100%;height:auto;display:block">'
        + '<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';
  if(n){
    // Tramos que llegan al nudo, a escala común.
    const con = tramos.filter(t=>t.a===n.id || t.b===n.id);
    let esc = 1e-9;
    con.forEach(t=>{ const o = nodo(t.a===n.id ? t.b : t.a);
      if(o) esc = Math.max(esc, Math.hypot(o.x-n.x, o.y-n.y)); });
    const k = 46/Math.max(esc, 1e-9);
    con.forEach(t=>{ const o = nodo(t.a===n.id ? t.b : t.a); if(!o) return;
      s += '<line x1="'+cx+'" y1="'+cy+'" x2="'+F(cx+(o.x-n.x)*k)+'" y2="'+F(cy-(o.y-n.y)*k)
         + '" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round" opacity=".5"/>'; });
  }
  const tipoC = edCarga ? edCarga.tipo : 'P';
  const magC = parseFloat((document.getElementById('cgMag')||{}).value) || 0;
  if(tipoC === 'M'){
    s += _arcoParCroquis(cx, cy, magC >= 0, ROJO)
       + '<text x="'+cx+'" y="'+(cy-21)+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'
       + dec(Math.abs(magC),'mom')+' '+(magC>=0?'\u21ba':'\u21bb')+'</text>';
  } else if(Math.abs(magC) > 1e-12){
    const _angUsr = parseFloat((document.getElementById('cgAng')||{}).value);
    const v = dirCarga({dir:_dirModal(), ang:bsaAnguloOpuesto(isFinite(_angUsr)?_angUsr:90)}, null);
    const sg = (magC < 0) ? -1 : 1;
    const ux = v.x*sg, uy = -v.y*sg;
    s += _flechaCroquis(cx, cy, ux, uy, 44, ROJO, 2.2)
       + '<text x="'+F(cx-ux*55)+'" y="'+F(cy-uy*55+3)+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'
       + dec(Math.abs(magC),'f')+'</text>';
  }
  s += '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="#1e3a8a" stroke="#fff" stroke-width="2"/>';
  if(n) s += '<text x="'+(cx+10)+'" y="'+(cy-9)+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24">'+n.nombre+'</text>';
  return s + '</svg>';
}

// ── Croquis acotado del tramo elegido (punto 4) ──
function dibujarCroquisTramo(){
  const cont=document.getElementById('cgCroquis'); if(!cont) return;
  const enNudo = document.getElementById('cgDestino').value==='nudo'
              && !(edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T'));
  if(enNudo){ cont.innerHTML = _croquisCargaNudo(); return; }
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
  const _aS = v => sDesdePos({basePos:_modo, dir:_dirModal()}, g, v);
  const p1 = _aS(parseFloat(document.getElementById('cgPos').value)||0);
  const p2 = distrib ? _aS(parseFloat(document.getElementById('cgFin').value)||0) : p1;
  const f1 = Math.max(0, Math.min(1, p1/g.L)), f2 = Math.max(0, Math.min(1, p2/g.L));

  // ── La carga, con su dirección ──
  // Hasta el 2026-09-11 el croquis solo marcaba DÓNDE cae la carga (una banda
  // o un punto): no se veía hacia dónde tira ni, en el par, en qué sentido
  // gira. Ahora se dibuja la flecha, como en el croquis de armaduras.
  const tipoC = edCarga ? edCarga.tipo : 'P';
  const magC  = parseFloat((document.getElementById('cgMag')||{}).value) || 0;
  const magC2 = parseFloat((document.getElementById('cgMag2')||{}).value) || 0;
  const ROJO = '#d94f5c';
  // Sentido en pantalla: dirCarga devuelve el vector con la y hacia arriba.
  let uxC = 0, uyC = 1;
  if(tipoC !== 'M'){
    const _angUsr = parseFloat((document.getElementById('cgAng')||{}).value);
    const _vC = dirCarga({dir:_dirModal(), ang:bsaAnguloOpuesto(isFinite(_angUsr)?_angUsr:90)}, g);
    uxC = _vC.x; uyC = -_vC.y;
  }

  if(distrib && Math.abs(f2-f1)>1e-6){
    const q1x=ax+(bx-ax)*f1, q1y=ay+(by-ay)*f1, q2x=ax+(bx-ax)*f2, q2y=ay+(by-ay)*f2;
    s+='<line x1="'+q1x+'" y1="'+q1y+'" x2="'+q2x+'" y2="'+q2y+'" stroke="#e0a83c" stroke-width="7" stroke-linecap="round" opacity=".75"/>';
    // Flechas repartidas sobre el trozo cargado. En la triangular la longitud
    // va de `mag` a `mag2`: es justo lo que distingue las dos formas.
    const m1 = magC, m2 = (tipoC === 'T') ? magC2 : magC;
    const mx = Math.max(Math.abs(m1), Math.abs(m2)) || 1;
    const LMAX = 30, NF = 6;
    const colas = [];
    for(let i=0;i<=NF;i++){
      const t = i/NF;
      const m = m1 + (m2-m1)*t;
      const qx = q1x+(q2x-q1x)*t, qy = q1y+(q2y-q1y)*t;
      const L = Math.abs(m)/mx*LMAX;
      const sg = (m < 0) ? -1 : 1;          // una intensidad negativa tira al revés
      const dxF = uxC*sg, dyF = uyC*sg;
      colas.push([qx-dxF*L, qy-dyF*L]);
      if(L > 2.5) s+=_flechaCroquis(qx, qy, dxF, dyF, L, ROJO, 1.5);
    }
    // Silueta de la carga: la línea que une las colas (rectángulo o triángulo).
    s+='<polyline points="'+colas.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')
      +'" fill="none" stroke="'+ROJO+'" stroke-width="1.6"/>';
    // el rótulo va al lado opuesto de la cota de longitud, para no pisarla
    s+='<text x="'+((q1x+q2x)/2-px)+'" y="'+((q1y+q2y)/2-py)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#b07d1a" text-anchor="middle">cargado '+dec(Math.abs(p2-p1),'len')+'</text>';
  } else if(!distrib){
    const qx=ax+(bx-ax)*f1, qy=ay+(by-ay)*f1;
    if(tipoC === 'M'){
      s+=_arcoParCroquis(qx, qy, magC >= 0, ROJO);
      s+='<text x="'+qx+'" y="'+(qy-20)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'
        +dec(Math.abs(magC),'mom')+' '+(magC>=0?'\u21ba':'\u21bb')+'</text>';
    } else if(Math.abs(magC) > 1e-12){
      const sgP = (magC < 0) ? -1 : 1;
      s+=_flechaCroquis(qx, qy, uxC*sgP, uyC*sgP, 34, ROJO, 2.2);
      s+='<text x="'+(qx-uxC*sgP*44)+'" y="'+(qy-uyC*sgP*44+3)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'
        +dec(Math.abs(magC),'f')+'</text>';
    }
    s+='<circle cx="'+qx+'" cy="'+qy+'" r="4" fill="'+ROJO+'"/>';
    // La distancia se aparta a lo largo del eje y al lado CONTRARIO de la cota
    // de longitud: puestas las dos en el centro del tramo, se pisaban.
    const _uL = Math.hypot(bx-ax, by-ay) || 1;
    const _sep = (tipoC === 'M') ? 31 : 15;   // el par ocupa un arco de radio 15
    s+='<text x="'+(qx - px*0.45 + (bx-ax)/_uL*_sep).toFixed(1)+'" y="'+(qy - py*0.45 + (by-ay)/_uL*_sep + 3).toFixed(1)
      +'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'+dec(p1,'len')+'</text>';
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
  const h = document.getElementById('cgDir');
  if(h) setDirCarga(h.value);      // misma dirección: solo refresca pista y rótulos
  dibujarCroquisTramo();
}
// Dirección elegida en el modal, con su marco de coordenadas asociado.
function _dirModal(){ return (document.getElementById('cgDir')||{}).value || 'y'; }
function _marcoDeDir(v){ return (v === 'perp' || v === 'axial') ? 'local' : 'global'; }

function setDirCarga(v){
  const h = document.getElementById('cgDir');
  if(!h) return;
  const antes = h.value;
  // Cambiar de marco cambia el SIGNIFICADO de las coordenadas, así que hay
  // que reexpresarlas; si no, la carga saltaría de sitio al pulsar el botón.
  const modo = (document.getElementById('cgBase')||{}).value || 'eje';
  // Solo importa el cambio de MARCO (global <-> local): pasar de vertical a
  // horizontal no toca las coordenadas.
  if(_marcoDeDir(antes) !== _marcoDeDir(v) && modo !== 'eje'){
    const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
    const g = t && geoTramo(t);
    if(g){
      const conv = (id)=>{
        const el = document.getElementById(id);
        if(!el) return;
        const val = parseFloat(el.value);
        if(!isFinite(val)) return;
        const sEje = sDesdePos({basePos:modo, dir:antes}, g, val);
        el.value = +posDesdeS(modo, g, sEje, _marcoDeDir(v) === 'local').toFixed(4);
      };
      conv('cgPos');
      if(document.getElementById('cgTdFin').style.display !== 'none') conv('cgFin');
    }
  }
  h.value = v;
  marcarSeg('cgSegDir', v);
  // El campo del ángulo solo tiene sentido en la inclinada.
  const filaAng = document.getElementById('cgFilaAng');
  if(filaAng) filaAng.style.display = (v === 'ang') ? '' : 'none';
  const t = tramos.find(z=>z.id===parseInt(document.getElementById('cgTramo').value,10));
  const g = t && geoTramo(t);
  const recto = !g || Math.abs(g.ang) < 0.05;
  const hint = document.getElementById('cgHintDir');
  const distrib2 = edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T');
  if(hint){
    let txt = (DIR_CARGA[v] ? DIR_CARGA[v].ayuda : '');
    // La inclinada es global, y su ayuda ya dice desde dónde se mide el ángulo:
    // añadirle la coletilla del marco la partiría en dos líneas.
    if(v === 'ang'){ /* la ayuda basta */ }
    else if(_marcoDeDir(v) === 'local'){
      txt += ' Las coordenadas se miden entonces desde el nudo inicial del tramo.';
      if(recto) txt += ' En un tramo horizontal, «Perpendicular» coincide con «Vertical».';
    } else {
      txt += ' Las coordenadas son las del plano.';
    }
    if(distrib2 && (v === 'x' || v === 'y' || v === 'ang'))
      txt += ' La intensidad se reparte sobre la <b>longitud real del eje</b> del tramo, '
           + 'no sobre su proyección.';
    hint.innerHTML = txt;
  }
  const prev = document.getElementById('cgPrev');
  if(prev) prev.innerHTML = (edCarga && edCarga.tipo === 'M')
    ? 'Positivo en sentido antihorario.'
    : 'Un valor negativo invierte el sentido de la flecha.';
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
      const marco = _marcoDeDir(_dirModal());
      const conv = (id)=>{
        const el = document.getElementById(id);
        if(!el) return;
        const v = parseFloat(el.value);
        if(!isFinite(v)) return;
        const s = sDesdePos({basePos:_baseAnterior, dir:_dirModal()}, g, v);
        el.value = +posDesdeS(modo, g, s, marco === 'local').toFixed(4);
      };
      conv('cgPos');
      if(document.getElementById('cgTdFin').style.display !== 'none') conv('cgFin');
    }
    _baseAnterior = modo;
  }

  marcarSeg('cgSegBase', modo);
  const th = document.getElementById('cgThDist');
  const mk = _marcoDeDir(_dirModal()) === 'local';
  if(th) th.textContent = (modo === 'eje') ? 'Distancia'
        : (modo === 'coordX' ? (mk ? 'Δx' : 'Coord. x')
                             : (mk ? 'Δy' : 'Coord. y'));
  const l = document.getElementById('cgLblPos');
  const _marco = _marcoDeDir(_dirModal());
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
  const _dir = (edCarga.tipo === 'M') ? null : _dirModal();
  const datos = {
    dir: _dir,
    // Se guarda siempre, aunque la dirección no sea la inclinada: así el
    // alumno que vuelve a «Inclinada» reencuentra el ángulo que había puesto.
    ang: bsaAnguloOpuesto(parseFloat((document.getElementById('cgAng')||{}).value) || 0),
    // El marco de las coordenadas va con la dirección; se guarda aparte
    // porque es lo que leen las funciones de posición.
    orient: _dir ? _marcoDeDir(_dir) : 'global',
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
  const _tipo = (edCarga.tipo === 'PX') ? 'P' : edCarga.tipo;
  if(edCarga.nuevo) cargas.push(Object.assign({id:++cargaSeq, tipo:_tipo}, datos));
  else Object.assign(edCarga, datos, {tipo:_tipo});
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
  cargas = normalizarCargas(e.cargas.map(c=>Object.assign({}, c)));
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
    aviso('Selecciona antes lo que quieras borrar con la herramienta Mover / editar.', 'error');
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
