// ── Cargas ──
// Flujo (2026-09-14, decisión del profesor): el menú «Cargas» solo elige el
// TIPO y arma la herramienta 'carga'; el destino lo fija el toque en el lienzo
// y la ventana se abre ya con él, sin listas que elegir. El toque no la abre en
// el acto: `onDown` (09-) lo deja en espera y `ejecutarToqueCarga` la abre al
// vencer, salvo que un doble toque (`onDbl`) edite antes la carga de debajo.
function elegirTipoCarga(tipo){
  if(!tramos.length){ aviso('Primero construye al menos un tramo de viga.', 'error'); return; }
  tipoCargaPendiente = tipo;
  setTool('carga');
}
// Carga nueva de `tipo` sobre `destino` = {destino:'tramo', tramo:id} o
// {destino:'nudo', nudo:id}. La llama `ejecutarToqueCarga` (09-) con lo que se
// tocó, al vencer la espera del toque o desde `onDbl` si no había carga debajo.
function nuevaCarga(tipo, destino){
  edCarga = {nuevo:true, tipo};
  abrirCargaModal(tipo, null, destino);
}
// Tramo del destino fijado en la ventana; null si la carga va sobre un nudo.
function _tramoModal(){
  if((document.getElementById('cgDestino')||{}).value === 'nudo') return null;
  const id = parseInt((document.getElementById('cgTramo')||{}).value, 10);
  return tramos.find(z=>z.id===id) || null;
}
function abrirCargaModal(tipo, c, destino){
  const tit={P:'Carga puntual', PX:'Carga puntual',
             U:'Carga uniforme',T:'Carga triangular',M:'Momento concentrado'};
  const distrib = (tipo==='U'||tipo==='T');
  // El destino es FIJO: el de la carga que se edita o el que se tocó. Desde
  // aquí una carga no cambia de tramo ni de nudo. Los tres campos ocultos lo
  // guardan para el resto de la ventana y para aplicarCarga.
  const dest = c ? ((c.destino === 'nudo') ? {destino:'nudo', nudo:c.nudo}
                                           : {destino:'tramo', tramo:c.tramo})
                 : (destino || {destino:'tramo', tramo:null});
  const enNudo = (dest.destino === 'nudo');
  const tDest = enNudo ? null : (tramos.find(t=>t.id===dest.tramo) || null);
  const nDest = enNudo ? (nodo(dest.nudo) || null) : null;
  document.getElementById('cgDestino').value = enNudo ? 'nudo' : 'tramo';
  document.getElementById('cgTramo').value = tDest ? tDest.id : '';
  document.getElementById('cgNudo').value  = nDest ? nDest.id : '';
  document.getElementById('cgDestinoTxt').innerHTML = enNudo
    ? 'Sobre el nudo <b>' + (nDest ? nDest.nombre : '?') + '</b>'
    : 'Sobre el tramo <b>' + (tDest ? nomTramo(tDest) : '?') + '</b>';

  document.getElementById('cgTitulo').textContent = tit[tipo]||'Carga';
  document.getElementById('cgSub').textContent = distrib
    ? 'Indica dónde empieza y dónde acaba dentro del tramo, y en qué dirección actúa.'
    : (tipo === 'M')
      ? (enNudo ? 'Indica el valor del momento.'
                : 'Indica dónde actúa dentro del tramo y el valor del momento.')
      : (enNudo ? 'Indica la magnitud y la dirección de la carga.'
                : 'Indica dónde actúa dentro del tramo, su magnitud y su dirección.');

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

  const g0 = tDest ? geoTramo(tDest) : null;
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
  // Ángulo de la carga inclinada: desde +x, antihorario, HACIA DONDE APUNTA la
  // fuerza (2026-10-04, decisión del profesor; antes decía de dónde venía). Es
  // el mismo número que guarda `c.ang`. Por defecto 270° (hacia abajo), el
  // sentido positivo de la vertical: elegir «Inclinada» no mueve la carga.
  const _a = document.getElementById('cgAng');
  if(_a) _a.value = (c && c.ang !== undefined && isFinite(+c.ang))
                      ? angulo360(c.ang) : 270;
  // Forma de dar la puntual inclinada: magnitud y ángulo, o componentes. Las
  // componentes no se guardan: se sacan de mag y ang al mostrarlas.
  const _e = document.getElementById('cgEntrada');
  if(_e) _e.value = (c && c.entrada === 'comp') ? 'comp' : 'ang';
  _compVisible = false;       // los campos Fx, Fy son de la ventana anterior
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
// Ajusta las filas de la ventana al destino FIJADO al abrirla (ya no hay
// selector que lo cambie).
function cambioDestinoCarga(){
  const d = document.getElementById('cgDestino').value;
  const distrib = edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T');
  const enNudo = (!distrib && d==='nudo');
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
// Flecha de una carga PUNTUAL en su recta fija: (ux,uy) es el sentido de la
// magnitud positiva, que llega al punto. Con magnitud negativa la flecha queda
// en el mismo sitio y sale del punto: el signo solo cambia la punta.
function _flechaPuntualCroquis(x, y, ux, uy, L, negativa, col, w){
  return negativa ? _flechaCroquis(x - ux*L, y - uy*L, -ux, -uy, L - 6, col, w)
                  : _flechaCroquis(x, y, ux, uy, L, col, w);
}
// Ángulo del alumno de la inclinada: el escrito o, con componentes, el que dan.
function _anguloAlumnoModal(){
  if(_compVisible) return angulo360(_magAngModal().ang);
  const u = _num('cgAng');
  return isFinite(u) ? u : 270;
}
// Ángulo en [0, 360), redondeado a 1e-4 para que 36.8699 no salga 36.869897.
function angulo360(a){
  const r = _redondo(((+a % 360) + 360) % 360, 4);
  return (r >= 360) ? 0 : r;
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

// ── Choques de los rótulos del croquis de nudo ─────────────────────
// Caja aproximada de un texto del SVG: (x,y) es la línea base y `ta` su
// text-anchor. El ancho se estima por caracteres; basta para saber si el
// texto pisa una barra, no para medirlo.
function _cajaTextoCroquis(x, y, texto, ta, fs){
  const w = String(texto).length*fs*0.62;
  const x0 = ta === 'start' ? x : (ta === 'end' ? x - w : x - w/2);
  return {x0, x1: x0 + w, y0: y - fs*0.95, y1: y + fs*0.25};
}
// ¿El segmento [x1,y1,x2,y2] corta la caja ensanchada `h`? Recorte de
// Liang–Barsky: se estrecha el intervalo del parámetro contra los cuatro lados.
function _segCortaCajaCroquis(sg, c, h){
  const dx = sg[2]-sg[0], dy = sg[3]-sg[1];
  const p = [-dx, dx, -dy, dy];
  const q = [sg[0]-(c.x0-h), (c.x1+h)-sg[0], sg[1]-(c.y0-h), (c.y1+h)-sg[1]];
  let t0 = 0, t1 = 1;
  for(let i = 0; i < 4; i++){
    if(Math.abs(p[i]) < 1e-12){ if(q[i] < 0) return false; continue; }
    const r = q[i]/p[i];
    if(p[i] < 0){ if(r > t1) return false; if(r > t0) t0 = r; }
    else        { if(r < t0) return false; if(r < t1) t1 = r; }
  }
  return true;
}
// Cuántas cosas ya dibujadas pisa una caja: barras y flecha (con la mitad de
// su grosor de holgura) y los rótulos ya colocados.
function _choquesCroquis(caja, segs, cajas){
  let k = 0;
  segs.forEach(sg=>{ if(_segCortaCajaCroquis(sg, caja, 2)) k++; });
  cajas.forEach(c=>{ if(caja.x0 < c.x1 && c.x0 < caja.x1 && caja.y0 < c.y1 && c.y0 < caja.y1) k++; });
  return k;
}

// ── Croquis de una carga puesta sobre un NUDO ──────────────────────
// Antes aquí solo había una frase: el alumno no veía ni hacia dónde tira la
// carga ni, en el par, en qué sentido gira. Mismo planteamiento que el
// croquis de nudo de armaduras: el nudo, los tramos que llegan y la flecha.
// Cada tramo se dibuja con una longitud visible mínima: a escala del más
// largo, uno corto se quedaba en un par de píxeles y no se veía llegar.
function _croquisCargaNudo(){
  const W2 = 240, H2 = 180, F = v => v.toFixed(1), ROJO = '#d94f5c', BARRA = '#1e3a8a';
  const n = nodo(parseInt((document.getElementById('cgNudo')||{}).value, 10));
  const cx = W2/2, cy = H2/2;
  // Radio disponible: deja sitio al nombre del nudo del otro extremo.
  const RAD = Math.min(W2, H2)/2 - 26;
  // Direcciones EN PANTALLA (y hacia abajo) ya ocupadas alrededor del nudo;
  // sirven para que los rótulos no caigan encima de un tramo o de la carga.
  const ocupadas = [];
  // Lo mismo, pero como trazos y cajas en pantalla, para colocar el valor del
  // par y el nombre del nudo donde no pisen nada.
  const segs = [], cajas = [];
  const difAng = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  // Anclaje del texto según el lado hacia el que se aparta del punto.
  const anclaje = (ux, uy) => ({
    ta: ux > 0.3 ? 'start' : (ux < -0.3 ? 'end' : 'middle'),
    dy: uy > 0.3 ? 8 : (uy < -0.3 ? 0 : 3.5)
  });
  let s = '<svg viewBox="0 0 '+W2+' '+H2+'" style="width:100%;height:auto;display:block">'
        + '<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';
  // La carga puntual se resuelve antes que los tramos: si llega por el mismo
  // lado que uno, su flecha pasa por encima del nombre del extremo, así que
  // ese nombre y el valor de la carga se reparten a los dos costados.
  const tipoC = edCarga ? edCarga.tipo : 'P';
  const _mA = (tipoC === 'M') ? null : _magAngModal();
  const magC = _mA ? _mA.mag : (parseFloat((document.getElementById('cgMag')||{}).value) || 0);
  let uC = null, angCola = 0, ladoV = null;
  if(tipoC !== 'M' && Math.abs(magC) > 1e-12){
    // La dirección sale de la MISMA geometría que usan el cálculo
    // (accionesDeCarga, 02-) y el lienzo (dibujarCarga, 08-): geoDeCarga toma el
    // primer tramo que llega al nudo. Sin ella, «Perp.» y «Axial» se dibujaban
    // aquí verticales aunque se calcularan según el tramo.
    const cProv = {destino:'nudo', nudo: n ? n.id : null, tramo:null, dir:_dirModal(), ang:_mA.ang};
    const v = dirCarga(cProv, n ? geoDeCarga(cProv) : null);
    // `uC` es el sentido de la magnitud POSITIVA: la flecha queda siempre en la
    // misma recta y del mismo lado del nudo, y el signo solo invierte la punta
    // (2026-10-04, petición del profesor; antes saltaba al otro lado).
    uC = {x: v.x, y: -v.y};
    // La inclinada SALE del nudo en la dirección escrita (abajo); las demás
    // llegan a él, como en el lienzo. `angCola` es el lado que ocupa la flecha.
    angCola = (_dirModal() === 'ang') ? Math.atan2(uC.y, uC.x)*180/Math.PI
                                      : Math.atan2(-uC.y, -uC.x)*180/Math.PI;
  }
  if(n){
    // Tramos que llegan al nudo, en su dirección real. La longitud va entre
    // 0.55 y 1 del radio: conserva qué tramo es más largo sin perder los cortos.
    const con = tramos.map(t=>{
        if(t.a !== n.id && t.b !== n.id) return null;
        const o = nodo(t.a===n.id ? t.b : t.a);
        return o ? {o, L: Math.hypot(o.x-n.x, o.y-n.y)} : null; })
      .filter(z=>z && z.L > 1e-12);
    const esc = Math.max(1e-9, ...con.map(z=>z.L));
    let rotulos = '';
    con.forEach(({o, L})=>{
      const ux = (o.x-n.x)/L, uy = -(o.y-n.y)/L;
      const Lp = RAD*(0.55 + 0.45*L/esc);
      const tx = cx + ux*Lp, ty = cy + uy*Lp;
      const angB = Math.atan2(uy, ux)*180/Math.PI;
      ocupadas.push(angB);
      segs.push([cx, cy, tx, ty]);
      s += '<line x1="'+cx+'" y1="'+cy+'" x2="'+F(tx)+'" y2="'+F(ty)
         + '" stroke="'+BARRA+'" stroke-width="3.2" stroke-linecap="round"/>'
         + '<circle cx="'+F(tx)+'" cy="'+F(ty)+'" r="3" fill="'+BARRA+'"/>';
      // El nombre del otro extremo, junto a la punta y en la prolongación del
      // tramo; si la carga llega por ese lado, a un costado de la flecha.
      let lx = ux, ly = uy, sep = 7;
      if(uC && difAng(angB, angCola) < 35){
        if(!ladoV){
          let px = uC.y, py = -uC.x;          // perpendicular a la flecha
          if(px*ux + py*uy > 0){ px = -px; py = -py; }
          ladoV = {x: px, y: py};             // costado del valor de la carga
        }
        lx = -ladoV.x; ly = -ladoV.y; sep = 6;
      }
      const an = anclaje(lx, ly);
      cajas.push(_cajaTextoCroquis(tx+lx*sep, ty+ly*sep+an.dy, o.nombre, an.ta, 9.5));
      rotulos += '<text x="'+F(tx+lx*sep)+'" y="'+F(ty+ly*sep+an.dy)+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="#44505c" text-anchor="'+an.ta+'">'+o.nombre+'</text>';
    });
    s += rotulos;
  }
  if(tipoC === 'M'){
    // El valor del par iba siempre encima del nudo, y un tramo que sube lo
    // tachaba. Se prueba arriba, abajo, izquierda y derecha, fuera del arco, y
    // se queda la primera posición que no pisa ninguna barra ni rótulo (si
    // todas pisan algo, la que menos). Sin barras, o con la viga horizontal,
    // sigue saliendo encima, como siempre.
    const txtM = dec(Math.abs(magC),'mom')+' '+(magC>=0?'\u21ba':'\u21bb');
    // `sector`: direcciones que el texto ocupa, para apartar de él el nombre.
    const posM = [
      {x: cx,    y: cy-21,  ta: 'middle', sector: [-90, -45, -135]},
      {x: cx,    y: cy+31,  ta: 'middle', sector: [90, 45, 135]},
      {x: cx-23, y: cy+3.5, ta: 'end',    sector: [180, 135, -135]},
      {x: cx+23, y: cy+3.5, ta: 'start',  sector: [0, -45, 45]}
    ];
    let pM = posM[0], cajaM = null, menos = Infinity;
    for(const p of posM){
      const caja = _cajaTextoCroquis(p.x, p.y, txtM, p.ta, 9.5);
      const k = _choquesCroquis(caja, segs, cajas);
      if(k < menos){ menos = k; pM = p; cajaM = caja; }
      if(k === 0) break;
    }
    cajas.push(cajaM);
    s += _arcoParCroquis(cx, cy, magC >= 0, ROJO)
       + '<text x="'+pM.x+'" y="'+pM.y+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'+ROJO+'" text-anchor="'+pM.ta+'">'
       + txtM+'</text>';
    // El valor del par, si es largo, ocupa todo su sector.
    ocupadas.push(...pM.sector);
  } else if(uC){
    const ux = uC.x, uy = uC.y;
    // Si la carga llega por el mismo lado que un tramo, su valor va al costado
    // contrario al nombre de ese extremo, anclado hacia fuera para que el
    // texto entero quede libre de la flecha.
    let ox = 0, oy = 0, anV = {ta: 'middle', dy: 3};
    if(ladoV){ ox = ladoV.x*8; oy = ladoV.y*8; anV = anclaje(ladoV.x, ladoV.y); }
    // La INCLINADA (2026-10-04, corrección del profesor): la flecha SALE del nudo
    // en la dirección escrita y el ángulo se acota EN EL NUDO, desde +x hasta la
    // propia flecha (bsaArcoAnguloSVG, core): así el arco toca la fuerza. Con
    // magnitud negativa la flecha queda en el mismo sitio y la punta mira al nudo.
    const conAng = (_dirModal() === 'ang');
    const txtV = dec(Math.abs(magC),'f')+' '+unitFor;
    let lx = cx-ux*55+ox, ly = cy-uy*55+oy+anV.dy, lta = anV.ta;
    ocupadas.push(angCola);
    segs.push(conAng ? [cx, cy, cx+ux*50, cy+uy*50] : [cx-ux*44, cy-uy*44, cx, cy]);
    if(conAng){
      // Lo que ocupa el ángulo en el nudo: la línea +x y el arco.
      segs.push([cx, cy, cx+44, cy]);
      segs.push(..._cuerdasArco(cx, cy, 15, anguloCorto(_anguloAlumnoModal())));
      // Sitios para el valor: pasada la punta y a los dos costados de la flecha.
      const sitios = [];
      [60, 70].forEach(m=>sitios.push({x0:cx + ux*m, y0:cy + uy*m + 3, ta:anclaje(ux, uy).ta, extra:0}));
      [[-uy, ux], [uy, -ux]].forEach(([px, py])=>{ [30, 40, 22].forEach(m=>{ [12, 20].forEach(e=>{
        sitios.push({x0:cx + ux*m + px*e, y0:cy + uy*m + py*e + 3, ta:anclaje(px, py).ta, extra:0.1}); }); }); });
      let mejorV = null;
      sitios.forEach(q=>{
        const cj = _cajaTextoCroquis(q.x0, q.y0, txtV, q.ta, 9.5);
        const fuera = (cj.x0 < 1 || cj.x1 > W2-1 || cj.y0 < 1 || cj.y1 > H2-1) ? 5 : 0;
        const k = _choquesCroquis(cj, segs, cajas) + fuera + q.extra;
        if(!mejorV || k < mejorV.k) mejorV = {k, x0:q.x0, y0:q.y0, ta:q.ta};
      });
      lx = mejorV.x0; ly = mejorV.y0; lta = mejorV.ta;
    }
    cajas.push(_cajaTextoCroquis(lx, ly, txtV, lta, 9.5));
    if(conAng){
      const th = _anguloAlumnoModal();
      const arco = bsaArcoAnguloSVG({x:cx, y:cy, ang:th, col:ROJO, r:17,
                                     segs, cajas, ancho:W2, alto:H2});
      s += arco.svg; cajas.push(arco.caja);
    }
    s += (conAng ? _flechaPuntualCroquis(cx+ux*50, cy+uy*50, ux, uy, 44, magC < 0, ROJO, 2.2)
                 : _flechaPuntualCroquis(cx, cy, ux, uy, 44, magC < 0, ROJO, 2.2))
       + '<text x="'+F(lx)+'" y="'+F(ly)+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'+ROJO+'" text-anchor="'+lta+'">'
       + dec(Math.abs(magC),'f')+' '+unitFor+'</text>';
  }
  s += '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="'+BARRA+'" stroke="#fff" stroke-width="2"/>';
  if(n){
    // El nombre del nudo va en la dirección más despejada, empezando por
    // arriba a la derecha, que es donde estaba siempre; con un par se aparta
    // más, porque el arco ocupa un radio de 15 alrededor del nudo.
    // Las direcciones se ordenan por holgura angular (a igualdad, en el orden
    // de la lista) y se toma la primera cuya caja no pisa una barra, la flecha
    // ni otro rótulo; si todas pisan algo, la de más holgura, como antes.
    const cand = [-45, -135, 45, 135, 0, 180, -90, 90];
    const d = (tipoC === 'M') ? 28 : 12;
    const orden = cand.map((a, i)=>({a, i,
        h: ocupadas.length ? Math.min(...ocupadas.map(o=>difAng(a, o))) : 180}))
      .sort((p, q)=> Math.abs(p.h - q.h) > 1e-6 ? q.h - p.h : p.i - q.i);
    const posNombre = a => {
      const ux = Math.cos(a*Math.PI/180), uy = Math.sin(a*Math.PI/180);
      const an = anclaje(ux, uy);
      return {x: cx+ux*d, y: cy+uy*d+an.dy, ta: an.ta};
    };
    let pN = posNombre(orden[0].a);
    for(const o of orden){
      const p = posNombre(o.a);
      if(_choquesCroquis(_cajaTextoCroquis(p.x, p.y, n.nombre, p.ta, 10.5), segs, cajas) === 0){ pN = p; break; }
    }
    s += '<text x="'+F(pN.x)+'" y="'+F(pN.y)+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24" text-anchor="'+pN.ta+'">'+n.nombre+'</text>';
  }
  return s + '</svg>';
}

// ── Croquis acotado del tramo elegido (punto 4) ──
function dibujarCroquisTramo(){
  const cont=document.getElementById('cgCroquis'); if(!cont) return;
  _notaAnguloCroquis();
  const enNudo = document.getElementById('cgDestino').value==='nudo'
              && !(edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T'));
  // El título del croquis dice qué se está enseñando: con la carga sobre un
  // nudo, «Tramo seleccionado» describía un dibujo que no estaba.
  const cap = document.getElementById('cgCroquisCap');
  if(cap) cap.textContent = enNudo ? 'Nudo seleccionado' : 'Tramo seleccionado';
  if(enNudo){ cont.innerHTML = _croquisCargaNudo(); return; }
  const t = _tramoModal();
  const g = t && geoTramo(t);
  if(!g){ cont.innerHTML='<div style="font-size:10.5px;color:#66727e;padding:14px 6px">Sin tramo.</div>'; return; }

  const W2=240, M=34;
  const dx=g.b.x-g.a.x, dy=g.b.y-g.a.y;
  // primera pasada con el alto máximo; luego el alto se ciñe al dibujo
  const H2max = 215;
  let k = Math.min((W2-2*M)/Math.max(Math.abs(dx),1e-6),
                   (H2max-2*M-30)/Math.max(Math.abs(dy),1e-6), 90);
  // Una puntual inclinada lleva su ángulo en la cola de la flecha: necesita más
  // alto que la franja de siempre para que el arco y su valor no se corten.
  const _angP = edCarga && (edCarga.tipo === 'P' || edCarga.tipo === 'PX') && _dirModal() === 'ang';
  const H2 = Math.max(_angP ? 160 : 110, Math.min(H2max, Math.abs(dy)*k + 2*M + 30));
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
    s+='<text x="'+(ax+r+4)+'" y="'+(ay-6)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#8b5cf6">'+dec(g.ang,'ang')+'°</text>';
  }
  // el tramo
  s+='<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>';
  s+='<circle cx="'+ax+'" cy="'+ay+'" r="4" fill="#1e3a8a"/><circle cx="'+bx+'" cy="'+by+'" r="4" fill="#1e3a8a"/>';
  s+='<text x="'+(ax-9)+'" y="'+(ay+4)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+g.a.nombre+'</text>';
  s+='<text x="'+(bx+5)+'" y="'+(by+4)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+g.b.nombre+'</text>';
  // cota diagonal (longitud real). Una puntual inclinada SALE del punto en su
  // dirección: si cae del lado de la cota, la cota pasa al otro lado.
  const ox=-(by-ay), oy=(bx-ax), on=Math.hypot(ox,oy)||1;
  let px=ox/on*17, py=oy/on*17;
  if(_angP){
    const d0 = dirCarga({dir:'ang', ang:_magAngModal().ang}, g);
    if((d0.x*ox - d0.y*oy)/on > 0.2){ px = -px; py = -py; }
  }
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
  const _mA = (tipoC === 'M') ? null : _magAngModal();
  const magC  = _mA ? _mA.mag : (parseFloat((document.getElementById('cgMag')||{}).value) || 0);
  const magC2 = parseFloat((document.getElementById('cgMag2')||{}).value) || 0;
  const ROJO = '#d94f5c';
  // Sentido en pantalla: dirCarga devuelve el vector con la y hacia arriba.
  let uxC = 0, uyC = 1;
  if(tipoC !== 'M'){
    const _vC = dirCarga({dir:_dirModal(), ang:_mA.ang}, g);
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
    // El rótulo va pasada la línea de las colas, en la prolongación de la flecha
    // central: entre las flechas se tachaba con ellas (2026-10-04).
    const qmx=(q1x+q2x)/2, qmy=(q1y+q2y)/2, cm=colas[NF/2];
    let ex=cm[0]-qmx, ey=cm[1]-qmy; const el=Math.hypot(ex,ey);
    if(el > 2){ ex/=el; ey/=el; } else { ex=-px/17; ey=-py/17; }
    const lxR = cm[0]+ex*10, lyR = cm[1]+ey*10 + (ey > 0.3 ? 8 : (ey < -0.3 ? 0 : 3));
    s+='<text x="'+lxR.toFixed(1)+'" y="'+lyR.toFixed(1)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#b07d1a" text-anchor="middle">cargado '+dec(Math.abs(p2-p1),'len')+'</text>';
  } else if(!distrib){
    const qx=ax+(bx-ax)*f1, qy=ay+(by-ay)*f1;
    if(tipoC === 'M'){
      s+=_arcoParCroquis(qx, qy, magC >= 0, ROJO);
      s+='<text x="'+qx+'" y="'+(qy-20)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="middle">'
        +dec(Math.abs(magC),'mom')+' '+(magC>=0?'\u21ba':'\u21bb')+'</text>';
    } else if(Math.abs(magC) > 1e-12){
      // Misma recta y mismo lado para los dos signos: el signo solo cambia la punta.
      // La INCLINADA sale del punto en la dirección escrita y su ángulo se acota
      // en el punto, desde +x hasta la propia flecha (bsaArcoAnguloSVG, core).
      const sale = (_dirModal() === 'ang');
      let tlx = qx-uxC*44, tly = qy-uyC*44+3, tta = 'middle';
      if(sale){
        const th = _anguloAlumnoModal(), txtV = dec(Math.abs(magC),'f')+' '+unitFor;
        const segsC = [[ax, ay, bx, by], [ax+px, ay+py, bx+px, by+py], [qx, qy, qx+uxC*40, qy+uyC*40],
                       [qx, qy, qx+44, qy]];
        segsC.push(..._cuerdasArco(qx, qy, 15, anguloCorto(th)));
        // El rótulo de la distancia, que se escribe más abajo en este mismo sitio.
        const _uL0 = Math.hypot(bx-ax, by-ay) || 1;
        const cajaDist = _cajaTextoCroquis(qx - px*0.45 + (bx-ax)/_uL0*15, qy - py*0.45 + (by-ay)/_uL0*15 + 3,
                                           dec(p1,'len'), 'middle', 9);
        const anc = (vx) => vx > 0.3 ? 'start' : (vx < -0.3 ? 'end' : 'middle');
        const sitios = [];
        [50, 60].forEach(m=>sitios.push({x0:qx + uxC*m, y0:qy + uyC*m + 3, ta:anc(uxC)}));
        [[-uyC, uxC], [uyC, -uxC]].forEach(([ppx, ppy])=>{ [28, 36, 20].forEach(m=>{ [11, 18].forEach(e=>{
          sitios.push({x0:qx + uxC*m + ppx*e, y0:qy + uyC*m + ppy*e + 3, ta:anc(ppx)}); }); }); });
        let mejorV = null;
        sitios.forEach(q=>{
          const cj = _cajaTextoCroquis(q.x0, q.y0, txtV, q.ta, 9);
          const fuera = (cj.x0 < 1 || cj.x1 > W2-1 || cj.y0 < 1 || cj.y1 > H2-1) ? 5 : 0;
          const k = _choquesCroquis(cj, segsC, [cajaDist]) + fuera;
          if(!mejorV || k < mejorV.k) mejorV = {k, x0:q.x0, y0:q.y0, ta:q.ta};
        });
        tlx = mejorV.x0; tly = mejorV.y0; tta = mejorV.ta;
        s+=bsaArcoAnguloSVG({x:qx, y:qy, ang:th, col:ROJO,
             segs:segsC, cajas:[_cajaTextoCroquis(tlx, tly, txtV, tta, 9), cajaDist], ancho:W2, alto:H2}).svg;
      }
      s+= sale ? _flechaPuntualCroquis(qx+uxC*40, qy+uyC*40, uxC, uyC, 34, magC < 0, ROJO, 2.2)
               : _flechaPuntualCroquis(qx, qy, uxC, uyC, 34, magC < 0, ROJO, 2.2);
      s+='<text x="'+tlx.toFixed(1)+'" y="'+tly.toFixed(1)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="'+ROJO+'" text-anchor="'+tta+'">'
        +dec(Math.abs(magC),'f')+' '+unitFor+'</text>';
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
// Dirección elegida en el modal, con su marco de coordenadas asociado.
function _dirModal(){ return (document.getElementById('cgDir')||{}).value || 'y'; }
function _marcoDeDir(v){ return (v === 'perp' || v === 'axial') ? 'local' : 'global'; }

// ── Carga puntual inclinada: magnitud y ángulo, o componentes x, y ──
// (2026-10-04, petición del profesor.) La verdad del modelo sigue siendo
// mag + ang (ángulo INTERNO, hacia donde apunta el vector con mag positiva).
// Las componentes son otra forma de escribirlo: Fx positiva hacia la derecha y
// Fy positiva HACIA ABAJO, como la carga vertical de todo el tema (2026-10-05,
// corrección del profesor; antes Fy era positiva hacia arriba y contradecía a la
// dirección «Vert.»). El vector del modelo lleva +y arriba, así que Fy cambia
// de signo en el borde. Mientras se ven las componentes, los campos de magnitud y
// ángulo no se leen; al dejar de verlas se rellenan desde ellas
// (`_sincroDesdeComp`), y al volver a verlas se calculan de ellos.
let _compVisible = false;
function _esPuntualModal(){ return !!edCarga && (edCarga.tipo === 'P' || edCarga.tipo === 'PX'); }
function _entradaModal(){
  return (_esPuntualModal() && _dirModal() === 'ang'
          && (document.getElementById('cgEntrada')||{}).value === 'comp') ? 'comp' : 'ang';
}
const _num = id => parseFloat((document.getElementById(id)||{}).value);
// Magnitud y ángulo interno que dicen ahora los campos de la ventana.
function _magAngModal(){
  if(_compVisible){
    const fx = _num('cgFx') || 0, fy = -(_num('cgFy') || 0), m = Math.hypot(fx, fy);
    return {mag: m, ang: (m > 1e-12) ? Math.atan2(fy, fx)*180/Math.PI : -90};
  }
  const u = _num('cgAng');
  return {mag: _num('cgMag') || 0, ang: isFinite(u) ? u : 270};
}
const _redondo = (v, n) => +(+v).toFixed(n);
function _sincroHaciaComp(){
  const u = _num('cgAng'), m = _num('cgMag') || 0;
  const a = (isFinite(u) ? u : 270)*Math.PI/180;
  document.getElementById('cgFx').value = _redondo(Math.abs(m*Math.cos(a)) < 1e-12 ? 0 : m*Math.cos(a), 6);
  document.getElementById('cgFy').value = _redondo(Math.abs(m*Math.sin(a)) < 1e-12 ? 0 : -m*Math.sin(a), 6);
}
function _sincroDesdeComp(){
  const r = _magAngModal();
  document.getElementById('cgMag').value = _redondo(r.mag, 6);
  document.getElementById('cgAng').value = angulo360(r.ang);
}
// Muestra los campos de la forma elegida y pasa los valores de una a otra, para
// que la carga no cambie al cambiar de forma.
function _mostrarEntrada(){
  const incl = (_dirModal() === 'ang');
  const comp = (_entradaModal() === 'comp');
  if(comp && !_compVisible) _sincroHaciaComp();
  if(!comp && _compVisible) _sincroDesdeComp();
  _compVisible = comp;
  const ver = (id, si) => { const e = document.getElementById(id); if(e) e.style.display = si ? '' : 'none'; };
  ver('cgSegEntrada', incl && _esPuntualModal());
  marcarSeg('cgSegEntrada', comp ? 'comp' : 'ang');
  ver('cgFilaAng', incl && !comp);
  ver('cgFilaComp', comp);
  // Con componentes no hay magnitud que escribir: su fila de la matriz se oculta.
  const thMag = document.getElementById('cgThMag');
  if(thMag && thMag.parentElement) thMag.parentElement.style.display = comp ? 'none' : '';
  const lx = document.getElementById('cgLblFx'), ly = document.getElementById('cgLblFy');
  if(lx) lx.textContent = 'Fx ('+unitFor+')';
  if(ly) ly.textContent = 'Fy ('+unitFor+')';
}
function setEntradaInclinada(v){
  const h = document.getElementById('cgEntrada');
  if(!h) return;
  h.value = (v === 'comp') ? 'comp' : 'ang';
  setDirCarga(_dirModal());   // repinta campos, ayuda y croquis
}
// Equivalente de arco más corto, en (−180°, 180°]: el que acota el croquis
// (bsaArcoAnguloSVG, core) y del que avisa `_notaAnguloCroquis`.
// Ocho cuerdas del arco de radio r desde +x hasta t grados (pantalla, y abajo).
function _cuerdasArco(x, y, r, t){
  const out = [], rad = g => g*Math.PI/180;
  for(let i = 0; i < 8; i++){
    const a0 = rad(t*i/8), a1 = rad(t*(i+1)/8);
    out.push([x + r*Math.cos(a0), y - r*Math.sin(a0), x + r*Math.cos(a1), y - r*Math.sin(a1)]);
  }
  return out;
}
function anguloCorto(th){
  let t = ((+th % 360) + 540) % 360 - 180;
  if(t <= -180 + 1e-9) t = 180;
  return _redondo(t, 4);
}
// Nota de la ventana cuando el croquis acota otro número que el escrito.
function _notaAnguloCroquis(){
  const el = document.getElementById('cgNotaAng');
  if(!el) return;
  const u = _num('cgAng');
  const ver = _dirModal() === 'ang' && !_compVisible && isFinite(u)
           && Math.abs(anguloCorto(u) - u) > 1e-6;
  el.style.display = ver ? '' : 'none';
  if(ver) el.textContent = 'En el croquis se acota ' + dec(anguloCorto(u), 'ang') + '°: es la misma dirección que '
    + dec(u, 'ang') + '° con un arco más corto desde +x.';
}

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
    const t = _tramoModal();
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
  // El ángulo, o las componentes, solo tienen sentido en la inclinada.
  _mostrarEntrada();
  const t = _tramoModal();
  const g = t && geoTramo(t);
  const recto = !g || Math.abs(g.ang) < 0.05;
  const hint = document.getElementById('cgHintDir');
  const distrib2 = edCarga && (edCarga.tipo==='U'||edCarga.tipo==='T');
  if(hint){
    let txt = (DIR_CARGA[v] ? DIR_CARGA[v].ayuda : '');
    // La inclinada es global, y su ayuda ya dice desde dónde se mide el ángulo:
    // añadirle la coletilla del marco la partiría en dos líneas.
    // Una carga de nudo tampoco lleva coordenadas que explicar.
    if(v === 'ang' && _entradaModal() === 'comp')
      txt = 'Fx positiva a la derecha, Fy positiva hacia abajo.';
    else if(v === 'ang' || !t){ /* la ayuda basta */ }
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
  if(prev){
    const comp = (v === 'ang' && _entradaModal() === 'comp');
    prev.style.display = comp ? 'none' : '';
    prev.innerHTML = (edCarga && edCarga.tipo === 'M')
      ? 'Positivo en sentido antihorario.'
      : 'Un valor negativo invierte el sentido de la flecha.';
  }
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
    const t = _tramoModal();
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
  // El destino es el fijado al abrir. Una repartida sobre un nudo se rechaza:
  // antes se forzaba a 'tramo' y caía en un tramo que nadie había elegido.
  const destino = (document.getElementById('cgDestino').value === 'nudo') ? 'nudo' : 'tramo';
  if(distrib && destino === 'nudo'){
    aviso('Las cargas repartidas van sobre un tramo: toca un tramo.', 'error'); return;
  }
  const idTramo = parseInt(document.getElementById('cgTramo').value, 10);
  const idNudo  = parseInt(document.getElementById('cgNudo').value, 10);
  if((destino === 'nudo') ? !nodo(idNudo) : !tramos.some(t=>t.id===idTramo)){
    aviso('El ' + destino + ' de esta carga ya no existe.', 'error'); return;
  }
  const _dir = (edCarga.tipo === 'M') ? null : _dirModal();
  // Con componentes, la magnitud y el ángulo salen de ellas.
  if(_compVisible){
    if(_magAngModal().mag < 1e-12){ aviso('Las dos componentes son cero: escribe al menos una.', 'error'); return; }
    _sincroDesdeComp();
  }
  const datos = {
    dir: _dir,
    // Se guarda siempre, aunque la dirección no sea la inclinada: así el
    // alumno que vuelve a «Inclinada» reencuentra el ángulo que había puesto.
    // Campo vacío = 270° (abajo), lo mismo que dibuja el croquis; 0 es un
    // valor válido (hacia la derecha), así que no vale `|| 0`.
    ang: (v => isFinite(v) ? v : 270)(parseFloat((document.getElementById('cgAng')||{}).value)),
    // El marco de las coordenadas va con la dirección; se guarda aparte
    // porque es lo que leen las funciones de posición.
    orient: _dir ? _marcoDeDir(_dir) : 'global',
    basePos: (document.getElementById('cgBase')||{}).value || 'eje',
    destino,
    // Solo el elemento que la sostiene: una carga de nudo no guarda tramo ni
    // la de tramo nudo. Antes se guardaban los dos selectores, y el tramo de
    // una carga de nudo era uno cualquiera (el cálculo lo ignora, 02-).
    tramo: (destino === 'tramo') ? idTramo : null,
    nudo:  (destino === 'nudo')  ? idNudo  : null,
    pos: parseFloat(document.getElementById('cgPos').value)||0,
    posFin: distrib ? (parseFloat(document.getElementById('cgFin').value)||0) : null,
    mag: parseFloat(document.getElementById('cgMag').value)||0,
    mag2: parseFloat(document.getElementById('cgMag2').value)||0,
    // Cómo se escribió la inclinada, para reabrirla igual. No entra en el cálculo.
    entrada: _compVisible ? 'comp' : 'ang'
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
  registrarCambio();          // antes de tocar el modelo, como borrarCarga
  if(edCarga.nuevo) cargas.push(Object.assign({id:++cargaSeq, tipo:_tipo}, datos));
  else Object.assign(edCarga, datos, {tipo:_tipo});
  // La herramienta 'carga' no se toca: sigue armada con el mismo tipo.
  invalidarResultados(); cerrarCarga(); refrescar();
}
// Doble toque con la herramienta «Cargas» (`onDbl`, 09-) o ✎ del panel: la
// ventana se reabre con el destino de la carga, que se muestra pero no se cambia.
function editarCarga(id){
  const c=cargas.find(z=>z.id===id); if(!c) return;
  edCarga=c; abrirCargaModal(c.tipo, c);
}
function borrarCarga(id){ registrarCambio(); cargas=cargas.filter(c=>c.id!==id); invalidarResultados(); refrescar(); }

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
    // Las unidades van con el modelo: sus números solo valen en ellas, y deshacer
    // un cambio de unidades tiene que devolver las dos cosas juntas.
    unidades: {len:unitLen, fuerza:unitFor},
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
  // Una instantánea sin unidades (anterior a guardarlas) conserva las actuales.
  if(e.unidades){
    const nL = e.unidades.len || unitLen, nF = e.unidades.fuerza || unitFor;
    // La vista pasa también a las unidades devueltas, conservando el encuadre
    // (como en presión, 04-): sin esto, deshacer un m → cm dibujaba la viga en
    // metros con la escala de centímetros, cien veces más pequeña, y la rejilla
    // enganchaba a pasos de metros. applyUnits, en cambio, recentra.
    if(nL !== unitLen && LEN_A_M[nL] && LEN_A_M[unitLen]){
      const k = LEN_A_M[unitLen]/LEN_A_M[nL];
      vx *= k; vy *= k; escala /= k;
    }
    fijarUnidades(nL, nF);   // 15-
  }
  // La selección puede apuntar a elementos que ya no existen tras restaurar.
  selNodos  = selNodos.filter(id=>nodos.some(n=>n.id===id));
  selTramos = selTramos.filter(id=>tramos.some(t=>t.id===id));
  selCargas = selCargas.filter(id=>cargas.some(c=>c.id===id));
  if(!nodos.some(n=>n.id===selNodo))   selNodo = null;
  if(!tramos.some(t=>t.id===selTramo)) selTramo = null;
  primerNodo = null;
  // El panel enseñaba la solución del modelo de antes de deshacer (12-).
  invalidarResultados();
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
  cargas = cargas.filter(cargaSigueAnclada);   // cada carga cae con su nudo o su tramo
  selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null;
  reNombrar(); invalidarResultados(); refrescar();
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
