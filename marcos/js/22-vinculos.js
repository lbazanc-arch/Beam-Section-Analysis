// ═══════════════════════════════════════════════════════════
//  VÍNCULOS: CUERDA, BIELA Y TOPE (2026-10-18, petición del profesor)
//  Elementos de dos fuerzas que se asignan a los nudos, como el tope de presión
//  de fluidos. Solo llevan fuerza axial y cada uno es UNA incógnita, positiva
//  en tracción:
//   · cuerda: solo tracción;   · biela: tracción o compresión;
//   · tope: solo compresión (empuja el nudo, nunca tira), anclado a un nudo.
//  La cuerda y la biela van entre dos nudos existentes o desde un nudo hacia un
//  anclaje externo; el tope, solo hacia su anclaje. El ángulo de un anclaje dice
//  DÓNDE ESTÁ visto desde el nudo, desde +x y antihorario (0° derecha, 90°
//  arriba, −90° abajo): el mismo criterio que los apoyos (decisión del
//  profesor). Es también lo que guarda el modelo (`v.ang`): no hay conversión.
//  Entre dos nudos sus dos fuerzas son iguales y opuestas y se anulan en el
//  equilibrio global: solo entran en la ecuación de una rótula. Por eso un
//  tirante necesita una rótula para que el problema siga siendo isostático.
//  Si el signo sale inadmisible (cuerda comprimida, tope traccionado) se avisa
//  en rojo y se enseñan igualmente los resultados (decisión del profesor).
//  El modelo: `vinculos` = [{id, tipo, a, b|null, ang}] (01-), guardado en el
//  archivo y en deshacer. En el cálculo cada uno es una incógnita {tipo:'V',
//  vin, n, n2 | ang} de R.inc (03-): el anclado lleva `ang` y el resto del
//  código lo trata como la reacción de un rodillo inclinado.
// ═══════════════════════════════════════════════════════════
const VIN_TIPOS = {
  cuerda:{nom:'Cuerda', letra:'T', col:'#9a6a1c', colTex:'brown!85!black', admite:'Solo tracción'},
  biela: {nom:'Biela',  letra:'F', col:'#475569', colTex:'black!70',       admite:'Tracción o compresión'},
  tope:  {nom:'Tope',   letra:'R', col:'#0f766e', colTex:'teal!80!black',  admite:'Solo compresión: empuja el nudo'}
};

function vinculoValido(v){
  if(!v || !VIN_TIPOS[v.tipo] || !nodo(v.a)) return false;
  if(v.b === null || v.b === undefined) return isFinite(+v.ang);
  return v.tipo !== 'tope' && v.b !== v.a && !!nodo(v.b);
}
// Un vínculo cae con su nudo. Devuelve si se quitó alguno.
function depurarVinculos(){
  const n0 = vinculos.length;
  vinculos = vinculos.filter(vinculoValido);
  return vinculos.length !== n0;
}
// Nombre: T de la cuerda, F de la biela y R_t del tope, con sus nudos.
function nombreVinculoTex(v){
  const A = nodo(v.a), B = (v.b !== null && v.b !== undefined) ? nodo(v.b) : null;
  const s = escLatex(A ? A.nombre : '?') + (B ? escLatex(B.nombre) : '');
  return v.tipo === 'tope' ? 'R_{t' + s + '}' : VIN_TIPOS[v.tipo].letra + '_{' + s + '}';
}
function nombreVinculoPlano(v){
  const A = nodo(v.a), B = (v.b !== null && v.b !== undefined) ? nodo(v.b) : null;
  const s = (A ? A.nombre : '?') + (B ? B.nombre : '');
  return (v.tipo === 'tope' ? 'Rt' : VIN_TIPOS[v.tipo].letra) + s;
}
// Dirección unitaria de la fuerza de TRACCIÓN sobre el nudo a: hacia el otro
// nudo o hacia el anclaje.
function dirVinculo(v){
  const A = nodo(v.a);
  if(v.b !== null && v.b !== undefined){
    const B = nodo(v.b), L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    return {x:(B.x - A.x)/L, y:(B.y - A.y)/L};
  }
  const a = (+v.ang || 0)*Math.PI/180;
  return {x:Math.cos(a), y:Math.sin(a)};
}
// Una incógnita por vínculo, para `analizar` (03-).
function incognitasDeVinculos(){
  return vinculos.filter(vinculoValido).map(v=>{
    const u = {n:nodo(v.a), tipo:'V', vin:v};
    const d = dirVinculo(v);
    if(v.b !== null && v.b !== undefined) u.n2 = nodo(v.b);
    else u.ang = Math.atan2(d.y, d.x);
    return u;
  });
}
// Fuerzas que hace una incógnita de valor unidad, con su nudo: las usan el
// equilibrio global, las rótulas y las fuerzas internas (03-).
function fuerzasUnitarias(u){
  if(u.tipo === 'V'){
    const d = dirVinculo(u.vin);
    const f = [{n:u.n, fx:d.x, fy:d.y, m:0}];
    if(u.n2) f.push({n:u.n2, fx:-d.x, fy:-d.y, m:0});
    return f;
  }
  if(u.ang !== undefined) return [{n:u.n, fx:Math.cos(u.ang), fy:Math.sin(u.ang), m:0}];
  if(u.tipo === 'Rx') return [{n:u.n, fx:1, fy:0, m:0}];
  if(u.tipo === 'Ry') return [{n:u.n, fx:0, fy:1, m:0}];
  return [{n:u.n, fx:0, fy:0, m:1}];
}
// ¿Trabaja como admite? La cuerda, N ≥ 0; el tope, N ≤ 0.
function avisosDeVinculos(r){
  const out = [];
  if(!r || r.error || !r.inc) return out;
  const esc = Math.max(1, ...r.inc.map((u,j)=>Math.abs(r.val[j] || 0)));
  r.inc.forEach((u,j)=>{
    if(u.tipo !== 'V') return;
    const N = r.val[j];
    if(u.vin.tipo === 'cuerda' && N < -1e-9*esc) out.push({u, j, N, cuerda:true});
    if(u.vin.tipo === 'tope' && N > 1e-9*esc) out.push({u, j, N, cuerda:false});
  });
  return out;
}
function trabajoVinculo(u, N){
  const nulo = Math.abs(N) < 1e-9;
  const t = nulo ? 'sin fuerza' : (N > 0 ? 'tracción' : 'compresión');
  const ok = (u.vin.tipo === 'cuerda') ? N > -1e-9 : (u.vin.tipo === 'tope' ? N < 1e-9 : true);
  return {txt:t, ok};
}
function textoAvisoVinculo(a, tex){
  const nom = tex ? '$' + nombreVinculoTex(a.u.vin) + '$' : nombreVinculoPlano(a.u.vin);
  const val = tex ? '$' + dec(a.N,'f') + '$\\,' + escLatex(unitFor) : dec(a.N,'f') + ' ' + unitFor;
  return a.cuerda
    ? 'La cuerda ' + nom + ' tendría que trabajar a compresión (' + val + '): una cuerda solo admite tracción. Con estas cargas se afloja.'
    : 'El tope ' + nom + ' tendría que tirar del nudo (' + val + '): un tope solo empuja. Con estas cargas el nudo se separa de él.';
}

// ── Herramienta ──
function menuVinculos(ev){ abrirMenu('menuVinculos', ev); }
function elegirTipoVinculo(tipo){
  tipoVinculoPendiente = tipo;
  vinculoPrimerNudo = null;
  setTool('vinculo');
}
function textoHerramientaVinculo(){
  if(tipoVinculoPendiente === 'tope') return 'Toca el nudo donde va el tope. · Doble clic sobre un vínculo para editarlo.';
  if(vinculoPrimerNudo !== null) return 'Toca el otro nudo, o un punto vacío para anclarla en esa dirección. Esc cancela.';
  return 'Toca el primer nudo; después otro nudo o un punto vacío (anclada en esa dirección). · Doble clic sobre un vínculo para editarlo.';
}
// El toque con la herramienta armada. La cuerda y la biela se trazan en dos
// toques, como un tramo: el segundo, sobre otro nudo, la pone entre los dos;
// sobre un punto vacío, la ancla en esa dirección (el ángulo se corrige en la
// ventana). El tope se pone con un solo toque, en su nudo.
function toqueVinculo(mx, my){
  if(!tipoVinculoPendiente) return;
  const n = nodoEn(mx, my);
  const [wx, wy] = aMundo(mx, my);
  if(tipoVinculoPendiente === 'tope'){
    if(!n){ aviso('Toca el nudo donde va el tope.'); return; }
    abrirVinculo({id:null, tipo:'tope', a:n.id, b:null, ang:-90});
    return;
  }
  const nomT = tipoVinculoPendiente === 'cuerda' ? 'la cuerda' : 'la biela';
  if(vinculoPrimerNudo === null){
    if(!n){ aviso('Toca primero el nudo donde empieza ' + nomT + '.'); return; }
    vinculoPrimerNudo = n.id;
    const ch = document.getElementById('canvasHint'); if(ch) ch.textContent = textoHerramientaVinculo();
    dibujar();
    return;
  }
  const A = nodo(vinculoPrimerNudo);
  if(!A || (n && n.id === A.id)){ cancelarTrazoVinculo(); return; }
  if(n){
    if(vinculos.some(v=>v.b !== null && v.b !== undefined && ((v.a === A.id && v.b === n.id) || (v.a === n.id && v.b === A.id)))){
      aviso('Ya hay un vínculo entre ' + A.nombre + ' y ' + n.nombre + '.', 'error');
      cancelarTrazoVinculo();
      return;
    }
    abrirVinculo({id:null, tipo:tipoVinculoPendiente, a:A.id, b:n.id});
  } else {
    const ang = Math.round(Math.atan2(wy - A.y, wx - A.x)*180/Math.PI);
    abrirVinculo({id:null, tipo:tipoVinculoPendiente, a:A.id, b:null, ang:ang});
  }
}
function cancelarTrazoVinculo(){
  vinculoPrimerNudo = null;
  const ch = document.getElementById('canvasHint');
  if(ch && tool === 'vinculo') ch.textContent = textoHerramientaVinculo();
  dibujar();
}

// ── Ventana ──
let edVinculo = null;
function _vnModal(){
  let ov = document.getElementById('vinculoModal');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'vinculoModal';
  ov.className = 'modal-ov';
  const boton = (t, svg) => '<button type="button" class="menu-btn" data-vtipo="' + t + '" onclick="vnCambiarTipo(\'' + t + '\')">'
    + svg + '<span>' + VIN_TIPOS[t].nom + '</span></button>';
  ov.innerHTML =
      '<div class="modal vn">'
    +   '<h3 id="vnTit">Vínculo</h3>'
    +   '<p class="sub" id="vnSub"></p>'
    +   '<div class="menu-grid">'
    +     boton('cuerda', SVG_VIN.cuerda) + boton('biela', SVG_VIN.biela) + boton('tope', SVG_VIN.tope)
    +   '</div>'
    +   '<div class="vn-admite" id="vnAdmite"></div>'
    +   '<div class="vn-cuerpo">'
    +     '<div class="vn-campos">'
    +       '<div class="vn-destino" id="vnDestino"></div>'
    +       '<div class="modal-field" id="vnAngFila"><label>Dónde está el anclaje (°)</label>'
    +         '<input type="number" id="vnAng" step="any" oninput="dibujarCroquisVinculo()"></div>'
    +       '<div class="vn-nota" id="vnAngNota">Visto desde el nudo: 0° derecha, 90° arriba, −90° abajo, 180° izquierda.</div>'
    +     '</div>'
    +     '<div class="vn-croquis" id="vnCroquis"></div>'
    +   '</div>'
    +   '<div class="modal-btns">'
    +     '<button class="mbtn ghost" id="vnQuitar" onclick="quitarVinculo()" style="margin-right:auto">Quitar</button>'
    +     '<button class="mbtn ghost" onclick="cerrarVinculo()">Cancelar</button>'
    +     '<button class="mbtn" onclick="aplicarVinculo()">Aplicar</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}
const SVG_VIN = {
  cuerda:'<svg viewBox="0 0 40 34"><circle cx="8" cy="26" r="3.2" fill="#1e3a8a"/><path d="M8 26 C 16 18, 22 14, 32 6" fill="none" stroke="#9a6a1c" stroke-width="2.4"/><line x1="27" y1="3" x2="37" y2="9" stroke="#475569" stroke-width="2"/></svg>',
  biela:'<svg viewBox="0 0 40 34"><line x1="8" y1="26" x2="32" y2="8" stroke="#475569" stroke-width="3.4"/><circle cx="8" cy="26" r="3.6" fill="#fff" stroke="#1e3a8a" stroke-width="2"/><circle cx="32" cy="8" r="3.6" fill="#fff" stroke="#1e3a8a" stroke-width="2"/></svg>',
  tope:'<svg viewBox="0 0 40 34"><circle cx="20" cy="10" r="3.4" fill="#1e3a8a"/><rect x="11" y="15" width="18" height="7" fill="#99d5cc" stroke="#0f766e" stroke-width="1.6"/><path d="M12 22 l-3 5 M18 22 l-3 5 M24 22 l-3 5 M30 22 l-3 5" stroke="#0f766e" stroke-width="1.3"/></svg>'
};
function abrirVinculo(datos){
  edVinculo = Object.assign({}, datos);
  _vnModal().classList.add('show');
  const anc = (edVinculo.b === null || edVinculo.b === undefined);
  document.getElementById('vnAng').value = anc ? (+edVinculo.ang || 0) : '';
  pintarVentanaVinculo();
}
function editarVinculo(id){
  const v = vinculos.find(z=>z.id === id);
  if(!v) return;
  abrirVinculo({id:v.id, tipo:v.tipo, a:v.a, b:(v.b === undefined ? null : v.b), ang:v.ang});
}
function cerrarVinculo(){
  const ov = document.getElementById('vinculoModal');
  if(ov) ov.classList.remove('show');
  edVinculo = null;
  cancelarTrazoVinculo();
}
function vnCambiarTipo(t){
  if(!edVinculo) return;
  const anc = (edVinculo.b === null || edVinculo.b === undefined);
  if(t === 'tope' && !anc){ aviso('El tope va en un solo nudo, contra su anclaje: no se pone entre dos nudos.', 'error'); return; }
  edVinculo.tipo = t;
  pintarVentanaVinculo();
}
function pintarVentanaVinculo(){
  const e = edVinculo; if(!e) return;
  const A = nodo(e.a), anc = (e.b === null || e.b === undefined), B = anc ? null : nodo(e.b);
  const T = VIN_TIPOS[e.tipo];
  document.getElementById('vnTit').textContent = (e.id ? 'Editar ' + T.nom.toLowerCase() : T.nom) + (anc ? ' en el nudo ' + A.nombre : ' entre ' + A.nombre + ' y ' + B.nombre);
  document.getElementById('vnSub').textContent = anc ? 'Anclada en una dirección: escribe dónde está su anclaje.' : 'Une los dos nudos: solo lleva fuerza axial.';
  document.querySelectorAll('#vinculoModal .menu-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.vtipo === e.tipo);
    b.disabled = (b.dataset.vtipo === 'tope' && !anc);
    b.style.opacity = b.disabled ? '.4' : '';
  });
  document.getElementById('vnAdmite').innerHTML = 'Admite: <b>' + T.admite + '</b>';
  document.getElementById('vnDestino').textContent = anc ? 'Desde el nudo ' + A.nombre + ' hacia su anclaje.' : 'Entre los nudos ' + A.nombre + ' y ' + B.nombre + '.';
  document.getElementById('vnAngFila').style.display = anc ? '' : 'none';
  document.getElementById('vnAngNota').style.display = anc ? '' : 'none';
  document.getElementById('vnQuitar').style.display = e.id ? '' : 'none';
  dibujarCroquisVinculo();
}
// Croquis de la ventana: el nudo, el vínculo con su símbolo y, si va anclado,
// el ángulo desde +x hasta la dirección del anclaje.
function dibujarCroquisVinculo(){
  const caja = document.getElementById('vnCroquis');
  const e = edVinculo;
  if(!caja || !e) return;
  const W = 230, H = 190, F = v => v.toFixed(1);
  const A = nodo(e.a), anc = (e.b === null || e.b === undefined);
  const T = VIN_TIPOS[e.tipo];
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  s += '<rect width="' + W + '" height="' + H + '" fill="#fbfcfe"/>';
  let ax, ay, bx, by;
  // Hacia dónde salen las líneas del nudo A: su nombre va del lado contrario.
  let sx = 0, sy = 0;
  if(anc){
    const ang = +document.getElementById('vnAng').value;
    const a = (isFinite(ang) ? ang : 0)*Math.PI/180, ex = Math.cos(a), ey = -Math.sin(a);
    ax = W/2; ay = H/2;
    // tramos que llegan al nudo, cortos y tenues, para situarlo
    tramos.forEach(t=>{
      if(t.a !== A.id && t.b !== A.id) return;
      const o = nodo(t.a === A.id ? t.b : t.a), L = Math.hypot(o.x - A.x, o.y - A.y) || 1;
      s += '<line x1="' + F(ax) + '" y1="' + F(ay) + '" x2="' + F(ax + (o.x - A.x)/L*70) + '" y2="' + F(ay - (o.y - A.y)/L*70)
        + '" stroke="#9aa6b6" stroke-width="5" stroke-linecap="round"/>';
      sx += (o.x - A.x)/L; sy -= (o.y - A.y)/L;
    });
    const L = e.tipo === 'tope' ? 26 : 62;
    bx = ax + ex*L; by = ay + ey*L;
    sx += ex; sy += ey;
    s += _vnSimboloSVG(e.tipo, ax, ay, bx, by, ex, ey, false, F);
    if(isFinite(ang)) s += bsaArcoAnguloSVG({x:ax, y:ay, ang, col:T.col, r:20, ref:34, ancho:W, alto:H,
                                             segs:[[ax, ay, bx, by]], ocupadas:[]}).svg;
  } else {
    const B = nodo(e.b);
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const k = 140/L;
    ax = W/2 - dx*k/2; ay = H/2 + dy*k/2; bx = W/2 + dx*k/2; by = H/2 - dy*k/2;
    s += _vnSimboloSVG(e.tipo, ax, ay, bx, by, dx/L, -dy/L, true, F);
    sx = dx/L; sy = -dy/L;
    s += '<circle cx="' + F(bx) + '" cy="' + F(by) + '" r="5" fill="#1e3a8a"/>'
      + '<text x="' + F(bx + dx/L*16) + '" y="' + F(by - dy/L*16 + 4.5) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + B.nombre + '</text>';
  }
  let ls = Math.hypot(sx, sy);
  if(ls < 0.3){ sx = 0; sy = 1; ls = 1; }                   // sin dirección clara: el nombre, arriba
  s += '<circle cx="' + F(ax) + '" cy="' + F(ay) + '" r="5" fill="#1e3a8a"/>'
    + '<text x="' + F(ax - sx/ls*16) + '" y="' + F(ay - sy/ls*16 + 4.5) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + A.nombre + '</text>';
  s += '</svg>';
  caja.innerHTML = s;
}
// El símbolo en SVG: cuerda (línea fina), biela (barra con pasadores) o tope
// (bloque). Anclado, con su apoyo rayado al final.
function _vnSimboloSVG(tipo, ax, ay, bx, by, ex, ey, dos, F){
  const T = VIN_TIPOS[tipo], nx = -ey, ny = ex;
  let s = '';
  if(tipo === 'tope'){
    const cx = ax + ex*14, cy = ay + ey*14;
    const p = (u, v) => F(cx + ex*u + nx*v) + ',' + F(cy + ey*u + ny*v);
    s += '<polygon points="' + [p(-5,-15), p(7,-15), p(7,15), p(-5,15)].join(' ') + '" fill="#99d5cc" stroke="' + T.col + '" stroke-width="1.6"/>';
    for(let i=-2;i<=2;i++){
      const q0 = {x:cx + ex*7 + nx*i*6, y:cy + ey*7 + ny*i*6};
      s += '<line x1="' + F(q0.x) + '" y1="' + F(q0.y) + '" x2="' + F(q0.x + ex*6 - nx*4) + '" y2="' + F(q0.y + ey*6 - ny*4) + '" stroke="' + T.col + '" stroke-width="1.2"/>';
    }
    return s;
  }
  const w = tipo === 'cuerda' ? 2 : 3.4;
  s += '<line x1="' + F(ax) + '" y1="' + F(ay) + '" x2="' + F(bx) + '" y2="' + F(by) + '" stroke="' + T.col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
  if(tipo === 'biela'){
    s += '<circle cx="' + F(ax + ex*9) + '" cy="' + F(ay + ey*9) + '" r="3.4" fill="#fff" stroke="' + T.col + '" stroke-width="1.6"/>';
    s += '<circle cx="' + F(bx - ex*(dos ? 9 : 0)) + '" cy="' + F(by - ey*(dos ? 9 : 0)) + '" r="3.4" fill="#fff" stroke="' + T.col + '" stroke-width="1.6"/>';
  }
  if(!dos){
    s += '<line x1="' + F(bx + nx*12) + '" y1="' + F(by + ny*12) + '" x2="' + F(bx - nx*12) + '" y2="' + F(by - ny*12) + '" stroke="#26415e" stroke-width="2.2"/>';
    for(let i=-2;i<=2;i++){
      const q0 = {x:bx + nx*i*5.5, y:by + ny*i*5.5};
      s += '<line x1="' + F(q0.x) + '" y1="' + F(q0.y) + '" x2="' + F(q0.x + ex*6 - nx*4) + '" y2="' + F(q0.y + ey*6 - ny*4) + '" stroke="#26415e" stroke-width="1.1"/>';
    }
  }
  return s;
}
function aplicarVinculo(){
  const e = edVinculo; if(!e) return;
  const anc = (e.b === null || e.b === undefined);
  let ang = null;
  if(anc){
    // 0° es un valor válido (anclaje a la derecha): nada de «|| -90».
    ang = parseFloat(document.getElementById('vnAng').value);
    if(!isFinite(ang)){ aviso('Escribe el ángulo del anclaje en grados.', 'error'); return; }
  }
  const v0 = e.id ? vinculos.find(z=>z.id === e.id) : null;
  if(v0 && v0.tipo === e.tipo && (!anc || +v0.ang === ang)){ cerrarVinculo(); return; }   // sin cambios
  registrarCambio();
  if(v0){ v0.tipo = e.tipo; if(anc) v0.ang = ang; }
  else vinculos.push({id:++vinculoSeq, tipo:e.tipo, a:e.a, b:anc ? null : e.b, ang:anc ? ang : null});
  invalidarResultados();
  cerrarVinculo();
  refrescar();
}
function quitarVinculo(){
  const e = edVinculo; if(!e || !e.id) return;
  registrarCambio();
  vinculos = vinculos.filter(v=>v.id !== e.id);
  invalidarResultados();
  cerrarVinculo();
  refrescar();
}
function borrarVinculo(id){
  if(!vinculos.some(v=>v.id === id)) return;
  registrarCambio();
  vinculos = vinculos.filter(v=>v.id !== id);
  invalidarResultados();
  refrescar();
}

// ── Lienzo ──
// Geometría en pantalla: dos nudos, o el nudo y el final del símbolo.
function _vnGeomPx(v){
  const A = nodo(v.a); const [ax, ay] = aPantalla(A.x, A.y);
  if(v.b !== null && v.b !== undefined){
    const B = nodo(v.b); const [bx, by] = aPantalla(B.x, B.y);
    const L = Math.hypot(bx - ax, by - ay) || 1;
    return {ax, ay, bx, by, ex:(bx - ax)/L, ey:(by - ay)/L, dos:true};
  }
  const d = dirVinculo(v), ex = d.x, ey = -d.y;
  const L = v.tipo === 'tope' ? 26 : 58;
  return {ax, ay, bx:ax + ex*L, by:ay + ey*L, ex, ey, dos:false};
}
function dibujarVinculos(){
  const validos = vinculos.filter(vinculoValido);
  validos.forEach(v=>{
    const g = _vnGeomPx(v), T = VIN_TIPOS[v.tipo];
    const nx = -g.ey, ny = g.ex;
    ctx.save();
    if(v.tipo === 'tope'){
      const cx = g.ax + g.ex*14, cy = g.ay + g.ey*14;
      const p = (u, w) => [cx + g.ex*u + nx*w, cy + g.ey*u + ny*w];
      ctx.beginPath();
      [p(-5,-15), p(7,-15), p(7,15), p(-5,15)].forEach((q,i)=>{ if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath(); ctx.fillStyle = '#99d5cc'; ctx.fill(); ctx.strokeStyle = T.col; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineWidth = 1.2;
      for(let i=-2;i<=2;i++){
        const q0 = [cx + g.ex*7 + nx*i*6, cy + g.ey*7 + ny*i*6];
        ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q0[0] + g.ex*6 - nx*4, q0[1] + g.ey*6 - ny*4); ctx.stroke();
      }
      _ocCaja(cx + g.ex*4, cy + g.ey*4, 22, 34, 'vinculo');
    } else {
      ctx.strokeStyle = T.col; ctx.lineWidth = v.tipo === 'cuerda' ? 2.2 : 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke();
      _ocSeg(g.ax, g.ay, g.bx, g.by, 3, 'vinculo');
      if(v.tipo === 'biela'){
        ctx.fillStyle = '#fff'; ctx.lineWidth = 1.8;
        [[g.ax + g.ex*11, g.ay + g.ey*11], [g.bx - g.ex*(g.dos ? 11 : 0), g.by - g.ey*(g.dos ? 11 : 0)]].forEach(q=>{
          ctx.beginPath(); ctx.arc(q[0], q[1], 3.8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        });
      }
      if(!g.dos){
        ctx.strokeStyle = '#26415e'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(g.bx + nx*12, g.by + ny*12); ctx.lineTo(g.bx - nx*12, g.by - ny*12); ctx.stroke();
        ctx.lineWidth = 1.2;
        for(let i=-2;i<=2;i++){
          const q0 = [g.bx + nx*i*5.5, g.by + ny*i*5.5];
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q0[0] + g.ex*6 - nx*4, q0[1] + g.ey*6 - ny*4); ctx.stroke();
        }
        _ocCaja(g.bx + g.ex*3, g.by + g.ey*3, 26, 26, 'vinculo');
      }
    }
    ctx.restore();
    // Nombre y, con resultados, su fuerza: «T_AD = 12.50 kN (tracción)», en
    // rojo si trabaja como no admite.
    let txt = nombreVinculoPlano(v), col = T.col;
    if(R && !R.error && R.inc){
      const j = R.inc.findIndex(u=>u.vin === v);
      if(j >= 0){
        const tr = trabajoVinculo(R.inc[j], R.val[j]);
        txt += ' = ' + dec(Math.abs(R.val[j]),'f') + ' ' + unitFor + ' (' + tr.txt + ')';
        if(!tr.ok) col = '#c0392b';
      }
    }
    const mx = g.dos ? (g.ax + g.bx)/2 : (v.tipo === 'tope' ? g.ax + g.ex*30 : (g.ax + g.bx)/2);
    const my = g.dos ? (g.ay + g.by)/2 : (v.tipo === 'tope' ? g.ay + g.ey*30 : (g.ay + g.by)/2);
    rotulo(txt, mx + nx*14, my + ny*14, col, nx, ny, '700 10.5px Inter,sans-serif', {prio:3});
  });
  // Trazo en curso: del primer nudo al puntero.
  if(tool === 'vinculo' && vinculoPrimerNudo !== null && mouseW){
    const A = nodo(vinculoPrimerNudo);
    if(A){
      const [ax, ay] = aPantalla(A.x, A.y), [mx, my] = aPantalla(mouseW[0], mouseW[1]);
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = VIN_TIPOS[tipoVinculoPendiente || 'cuerda'].col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mx, my); ctx.stroke(); ctx.restore();
    }
  }
}
// El vínculo bajo el puntero (o null).
function vinculoEn(mx, my){
  let mejor = null, dm = 8;
  vinculos.filter(vinculoValido).forEach(v=>{
    const g = _vnGeomPx(v);
    let d;
    if(v.tipo === 'tope') d = Math.hypot(mx - (g.ax + g.ex*15), my - (g.ay + g.ey*15)) - 10;
    else {
      const L2 = (g.bx - g.ax)**2 + (g.by - g.ay)**2 || 1;
      const t = Math.max(0, Math.min(1, ((mx - g.ax)*(g.bx - g.ax) + (my - g.ay)*(g.by - g.ay))/L2));
      d = Math.hypot(mx - (g.ax + t*(g.bx - g.ax)), my - (g.ay + t*(g.by - g.ay)));
    }
    if(d < dm){ dm = d; mejor = v; }
  });
  return mejor;
}

// ── Panel: la lista de vínculos, bajo la de apoyos ──
function htmlListaVinculos(){
  const lista = vinculos.filter(vinculoValido);
  if(!lista.length) return '';
  return '<div class="fam" style="margin-top:8px">Vínculos</div>' + lista.map(v=>{
    const A = nodo(v.a), B = (v.b !== null && v.b !== undefined) ? nodo(v.b) : null;
    const donde = B ? A.nombre + '–' + B.nombre : A.nombre + ' · ' + dec(+v.ang,'ang') + '°';
    return '<div class="item-row"><div class="nm"><b>' + nombreVinculoPlano(v) + '</b> ' + VIN_TIPOS[v.tipo].nom
      + ' <span class="loc">' + donde + '</span></div>'
      + '<button class="x" title="Editar" onclick="editarVinculo(' + v.id + ')">✎</button>'
      + '<button class="x" title="Borrar" onclick="borrarVinculo(' + v.id + ')">×</button></div>';
  }).join('');
}

// ── Pantalla y PDF: avisos y filas de la tabla ──
function avisosVinculosHtml(r){
  return avisosDeVinculos(r).map(a=>'<div class="verdict bad" style="margin-top:8px"><div class="verdict-t">'
    + (a.cuerda ? 'Cuerda en compresión' : 'Tope en tracción') + '</div>' + textoAvisoVinculo(a, false) + '</div>').join('');
}
function avisosVinculosTex(R){
  return avisosDeVinculos(R).map(a=>'\\par\\noindent\\fcolorbox{red!70!black}{red!6}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small\\textbf{'
    + (a.cuerda ? 'Cuerda en compresión' : 'Tope en tracción') + '.} ' + textoAvisoVinculo(a, true) + '}}\\par\\smallskip\n').join('');
}

// ── TikZ: los vínculos en las figuras del PDF (17-) ──
// En el modelo (figura 1) se dibujan todos con su símbolo y su nombre. En un DCL
// los anclados ya están sustituidos por su fuerza (la dibuja `tikzViga`), y los
// que unen dos nudos son parte del cuerpo: se dibujan como barra, sin fuerza.
function tikzVinculos(Xn, Yn, conReacciones, ndIds, F){
  let out = '';
  const pend = [];
  vinculos.filter(vinculoValido).forEach(v=>{
    const A = nodo(v.a), dos = (v.b !== null && v.b !== undefined);
    if(ndIds && !ndIds.has(v.a)) return;
    if(dos && ndIds && !ndIds.has(v.b)) return;
    if(conReacciones && !dos) return;
    const T = VIN_TIPOS[v.tipo], d = dirVinculo(v);
    const ax = Xn(A.x), ay = Yn(A.y);
    if(dos){
      const B = nodo(v.b), bx = Xn(B.x), by = Yn(B.y);
      out += '\\draw[color=' + T.colTex + ', line width=' + (v.tipo === 'cuerda' ? '.9' : '1.5') + 'pt] (' + F(ax) + ',' + F(ay) + ') -- (' + F(bx) + ',' + F(by) + ');\n';
      if(v.tipo === 'biela'){
        const L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax)/L, uy = (by - ay)/L;
        out += '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(ax + ux*0.22) + ',' + F(ay + uy*0.22) + ') circle (0.06);\n'
             + '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(bx - ux*0.22) + ',' + F(by - uy*0.22) + ') circle (0.06);\n';
      }
      tzOcuparTrazo(ax, ay, bx, by, 0.06);
      if(!conReacciones) pend.push({x:(ax + bx)/2 - d.y*0.25, y:(ay + by)/2 + d.x*0.25, txt:'$' + nombreVinculoTex(v) + '$', col:T.colTex, dx:-d.y, dy:d.x});
      return;
    }
    // Anclado (solo en el modelo): el símbolo hacia su anclaje.
    const nx = -d.y, ny = d.x;
    if(v.tipo === 'tope'){
      const cx = ax + d.x*0.32, cy = ay + d.y*0.32;
      const p = (u, w) => '(' + F(cx + d.x*u + nx*w) + ',' + F(cy + d.y*u + ny*w) + ')';
      out += '\\filldraw[fill=teal!25, draw=' + T.colTex + ', line width=.6pt] ' + p(-0.1,-0.3) + ' -- ' + p(0.14,-0.3) + ' -- ' + p(0.14,0.3) + ' -- ' + p(-0.1,0.3) + ' -- cycle;\n';
      for(let i=-2;i<=2;i++) out += '\\draw[color=' + T.colTex + ', line width=.4pt] ' + p(0.14, i*0.12) + ' -- ' + p(0.26, i*0.12 - 0.08) + ';\n';
      tzOcupar(cx - 0.35, cy - 0.35, cx + 0.35, cy + 0.35);
      pend.push({x:cx + d.x*0.55, y:cy + d.y*0.55, txt:'$' + nombreVinculoTex(v) + '$', col:T.colTex, dx:d.x, dy:d.y});
      return;
    }
    const L = 1.1, bx = ax + d.x*L, by = ay + d.y*L;
    out += '\\draw[color=' + T.colTex + ', line width=' + (v.tipo === 'cuerda' ? '.9' : '1.5') + 'pt] (' + F(ax) + ',' + F(ay) + ') -- (' + F(bx) + ',' + F(by) + ');\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(bx + nx*0.25) + ',' + F(by + ny*0.25) + ') -- (' + F(bx - nx*0.25) + ',' + F(by - ny*0.25) + ');\n';
    for(let i=-2;i<=2;i++) out += '\\draw[color=bsaAcc2, line width=.4pt] (' + F(bx + nx*i*0.1) + ',' + F(by + ny*i*0.1) + ') -- ('
      + F(bx + nx*i*0.1 + d.x*0.12 - nx*0.08) + ',' + F(by + ny*i*0.1 + d.y*0.12 - ny*0.08) + ');\n';
    if(v.tipo === 'biela')
      out += '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(ax + d.x*0.22) + ',' + F(ay + d.y*0.22) + ') circle (0.06);\n'
           + '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(bx) + ',' + F(by) + ') circle (0.06);\n';
    tzOcuparTrazo(ax, ay, bx + d.x*0.15, by + d.y*0.15, 0.3);
    pend.push({x:(ax + bx)/2 - nx*0.3, y:(ay + by)/2 - ny*0.3, txt:'$' + nombreVinculoTex(v) + '$', col:T.colTex, dx:-nx, dy:-ny});
  });
  return {tikz:out, pend};
}
