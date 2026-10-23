// ═══════════════════════════════════════════════════════════
//  VÍNCULOS: CUERDA, BIELA Y TOPE (2026-10-23, petición del profesor)
//  Los mismos de fuerzas internas (22-) y con sus criterios. Elementos de dos
//  fuerzas que se asignan a los nudos de la compuerta; solo llevan fuerza axial
//  y cada uno es UNA incógnita, positiva en tracción:
//   · cuerda: solo tracción;   · biela: tracción o compresión;
//   · tope: solo compresión (empuja la compuerta, nunca tira), anclado a un nudo.
//  La cuerda y la biela van entre dos nudos existentes o desde un nudo hacia un
//  anclaje; el tope, solo hacia su anclaje. El anclaje se da de dos maneras:
//   · `modo:'angulo'`: el ángulo dice DÓNDE ESTÁ el anclaje visto desde el nudo,
//     desde +x y antihorario (0° derecha, 90° arriba, −90° abajo), el criterio
//     de los apoyos; es también lo que guarda el modelo (`v.ang`);
//   · `modo:'normal'`: el anclaje está detrás de la cara de la compuerta que
//     mira a la zona `lado`, según la normal en el nudo (lo habitual en un tope).
//  Entre dos nudos sus dos fuerzas son iguales y opuestas y se anulan en el
//  equilibrio global: solo entran en la ecuación de una rótula, así que un
//  tirante necesita una rótula para que el problema siga siendo isostático.
//  Si el signo sale inadmisible (cuerda comprimida, tope traccionado) se avisa
//  en rojo y se enseñan los resultados; con el tope, «la compuerta se abre».
//  Sustituye al tope antiguo del nudo (`n.tope`, con ángulo «hacia dónde
//  empuja»): `migrarTopes` lo convierte al abrir un archivo o un ejemplo.
//  El modelo: `vinculos` = [{id, tipo, a, b|null, ang, modo, lado}] (01-). En
//  el cálculo cada uno es una incógnita {tipo:'V', vin, n, n2?, dir} (01-).
// ═══════════════════════════════════════════════════════════
const VIN_TIPOS = {
  cuerda:{nom:'Cuerda', letra:'T', col:'#9a6a1c', colTex:'bsaCuerda', admite:'Solo tracción'},
  biela: {nom:'Biela',  letra:'F', col:'#475569', colTex:'bsaBiela',  admite:'Tracción o compresión'},
  tope:  {nom:'Tope',   letra:'R', col:'#b45309', colTex:'bsaTope',   admite:'Solo compresión: empuja la compuerta'}
};
const _esAnclado = v => v.b === null || v.b === undefined;

function vinculoValido(v){
  if(!v || !VIN_TIPOS[v.tipo] || !nodo(v.a)) return false;
  if(_esAnclado(v)) return v.modo === 'normal' || isFinite(+v.ang);
  return v.tipo !== 'tope' && v.b !== v.a && !!nodo(v.b);
}
// Un vínculo cae con su nudo. Devuelve si se quitó alguno.
function depurarVinculos(){
  const n0 = vinculos.length;
  vinculos = vinculos.filter(vinculoValido);
  return vinculos.length !== n0;
}
// El tope antiguo del nudo (`n.tope = {ang, modo, lado}`, con `ang` hacia donde
// EMPUJABA) pasa a ser un vínculo tope: el anclaje queda detrás, al lado
// contrario (ang + 180°). En modo normal el lado es el mismo: el bloque estaba
// en la cara que mira a la zona `lado`.
function migrarTopes(){
  let hubo = false;
  nodos.forEach(n=>{
    if(!n.tope){ if('tope' in n) delete n.tope; return; }
    const tp = n.tope;
    const modo = tp.modo === 'normal' ? 'normal' : 'angulo';
    let ang = null;
    if(modo === 'angulo'){
      const a = (+tp.ang || 0) + 180;
      ang = ((a + 180) % 360 + 360) % 360 - 180;           // en (−180, 180]
      if(ang === -180) ang = 180;
    }
    vinculos.push({id:++vinculoSeq, tipo:'tope', a:n.id, b:null, ang, modo, lado:tp.lado === 2 ? 2 : 1});
    delete n.tope;
    hubo = true;
  });
  return hubo;
}

// ── Nombres: T de la cuerda, F de la biela y R_t del tope, con sus nudos ──
function _vinNudos(v){
  const A = nodo(v.a), B = _esAnclado(v) ? null : nodo(v.b);
  return (A ? A.nombre : '?') + (B ? B.nombre : '');
}
function nombreVinculoTex(v){ return v.tipo === 'tope' ? 'R_{t' + _vinNudos(v) + '}' : VIN_TIPOS[v.tipo].letra + '_{' + _vinNudos(v) + '}'; }
function nombreVinculoHtml(v){ return v.tipo === 'tope' ? 'R<sub>t' + _vinNudos(v) + '</sub>' : VIN_TIPOS[v.tipo].letra + '<sub>' + _vinNudos(v) + '</sub>'; }
function nombreVinculoPlano(v){ return (v.tipo === 'tope' ? 'Rt' : VIN_TIPOS[v.tipo].letra) + _vinNudos(v); }

// Dirección unitaria de la fuerza de TRACCIÓN sobre el nudo a: hacia el otro
// nudo o hacia el anclaje.
function dirVinculo(v){
  const A = nodo(v.a);
  if(!_esAnclado(v)){
    const B = nodo(v.b), L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    return {x:(B.x - A.x)/L, y:(B.y - A.y)/L};
  }
  if(v.modo === 'normal'){
    const nv = normalCompuertaEnNudo(A, v.lado === 2 ? 2 : 1);
    if(nv) return nv;
  }
  const a = (+v.ang || 0)*Math.PI/180;
  return {x:Math.cos(a), y:Math.sin(a)};
}
// Una incógnita por vínculo, para listaIncognitas (01-).
function incognitasDeVinculos(){
  return vinculos.filter(vinculoValido).map(v=>{
    const u = {n:nodo(v.a), tipo:'V', vin:v};
    if(!_esAnclado(v)) u.n2 = nodo(v.b);
    return u;
  });
}
// Las fuerzas que hace una incógnita de valor unidad, con su nudo: una en un
// apoyo o un vínculo anclado y dos, iguales y opuestas, en uno entre dos nudos.
// La usan el equilibrio, las rótulas, el plan, las ecuaciones y los dibujos.
function fuerzasDeIncognita(u){
  const d = u.dir || direccionIncognita(u);
  const f = [{n:u.n, d}];
  if(u.n2) f.push({n:u.n2, d:{x:-d.x, y:-d.y}});
  return f;
}
// Momento respecto de C de la incógnita unidad, contando solo las fuerzas cuyo
// nudo está en `filtro` (una rótula toma un lado). Devuelve también la fuerza
// que da el brazo, para nombrarlo y acotarlo.
function momentoIncognita(u, C, filtro){
  let m = 0, f0 = null;
  fuerzasDeIncognita(u).forEach(f=>{
    if(filtro && filtro.indexOf(f.n.id) < 0) return;
    const mi = (f.n.x - C.x)*f.d.y - (f.n.y - C.y)*f.d.x;
    if(Math.abs(mi) > 1e-12 && !f0) f0 = f;
    m += mi;
  });
  return {m, brazo:Math.abs(m), signo: m >= 0 ? 1 : -1, n: f0 ? f0.n : u.n, d: f0 ? f0.d : u.dir};
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
  const t = nulo ? (u.vin.tipo === 'tope' ? 'a punto de abrirse' : 'sin fuerza') : (N > 0 ? 'tracción' : 'compresión');
  const ok = (u.vin.tipo === 'cuerda') ? N > -1e-9 : (u.vin.tipo === 'tope' ? N < 1e-9 : true);
  return {txt:t, ok};
}
function textoAvisoVinculo(a, tex){
  const nom = tex ? '$' + nombreVinculoTex(a.u.vin) + '$' : nombreVinculoHtml(a.u.vin);
  const val = tex ? '$' + dec(a.N,'f') + '$\\,' + unitFor : dec(a.N,'f') + ' ' + unitFor;
  return a.cuerda
    ? 'La cuerda ' + nom + ' tendría que trabajar a compresión (' + val + '): una cuerda solo admite tracción. Con estos niveles se afloja.'
    : 'El tope ' + nom + ' tendría que tirar de la compuerta (' + val + '): un tope solo empuja. Con estos niveles <b>la compuerta se abre</b>.';
}
// Texto corto del anclaje, para la lista y las tablas: «anclado a 135°» o
// «⟂ a la compuerta, lado zona 1».
function textoAnclaje(v){
  if(!_esAnclado(v)) return 'entre ' + nodo(v.a).nombre + ' y ' + nodo(v.b).nombre;
  if(v.modo === 'normal') return '⟂ a la compuerta, anclaje del lado de la zona ' + (v.lado === 2 ? 2 : 1);
  return 'anclaje a ' + dec(+v.ang,'ang') + '°';
}

// ── Herramienta: el botón Vínculos abre su menú ──
function abrirMenuPF(id, ev){
  const m = document.getElementById(id); if(!m) return;
  const abre = !m.classList.contains('abierto');
  m.classList.toggle('abierto', abre);
  if(!abre) return;
  const tb = document.querySelector('.toolbar').getBoundingClientRect();
  const bt = (ev && ev.currentTarget) ? ev.currentTarget.getBoundingClientRect() : tb;
  m.style.top = (tb.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(bt.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
}
function menuVinculos(ev){ abrirMenuPF('menuVinculos', ev); }
document.addEventListener('click', ev=>{
  const m = document.getElementById('menuVinculos');
  if(!m || !m.classList.contains('abierto')) return;
  const dentro = m.contains(ev.target);
  const boton = ev.target.closest && ev.target.closest('[onclick*="menuVinculos"]');
  if(!dentro && !boton) m.classList.remove('abierto');
  else if(dentro && ev.target.closest('.menu-btn')) m.classList.remove('abierto');
});
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
// El lado seco del nudo: donde va un tope nuevo (si solo una zona tiene líquido).
function _ladoSeco(){
  const z1 = capasOrdenadas(1).length, z2 = capasOrdenadas(2).length;
  return (z1 && !z2) ? 2 : (z2 && !z1 ? 1 : 2);
}
// El toque con la herramienta armada. La cuerda y la biela se trazan en dos
// toques: el segundo, sobre otro nudo, la pone entre los dos; sobre un punto
// vacío, la ancla en esa dirección. El tope se pone con un toque, en su nudo,
// normal a la compuerta y del lado seco.
function toqueVinculo(mx, my){
  if(!tipoVinculoPendiente) return;
  const n = nodoEn(mx, my);
  const [wx, wy] = aMundo(mx, my);
  if(tipoVinculoPendiente === 'tope'){
    if(!n){ aviso('Toca el nudo donde va el tope.'); return; }
    const ya = vinculos.find(v=>v.tipo === 'tope' && v.a === n.id);
    if(ya){ editarVinculo(ya.id); return; }
    abrirVinculo({id:null, tipo:'tope', a:n.id, b:null, ang:-90, modo:'normal', lado:_ladoSeco()});
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
    if(vinculos.some(v=>!_esAnclado(v) && ((v.a === A.id && v.b === n.id) || (v.a === n.id && v.b === A.id)))){
      aviso('Ya hay un vínculo entre ' + A.nombre + ' y ' + n.nombre + '.', 'error');
      cancelarTrazoVinculo();
      return;
    }
    abrirVinculo({id:null, tipo:tipoVinculoPendiente, a:A.id, b:n.id});
  } else {
    const ang = Math.round(Math.atan2(wy - A.y, wx - A.x)*180/Math.PI);
    abrirVinculo({id:null, tipo:tipoVinculoPendiente, a:A.id, b:null, ang, modo:'angulo', lado:_ladoSeco()});
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
const SVG_VIN = {
  cuerda:'<svg viewBox="0 0 40 34"><circle cx="8" cy="26" r="3.2" fill="#0b3f3a"/><path d="M8 26 C 16 18, 22 14, 32 6" fill="none" stroke="#9a6a1c" stroke-width="2.4"/><line x1="27" y1="3" x2="37" y2="9" stroke="#475569" stroke-width="2"/></svg>',
  biela:'<svg viewBox="0 0 40 34"><line x1="8" y1="26" x2="32" y2="8" stroke="#475569" stroke-width="3.4"/><circle cx="8" cy="26" r="3.6" fill="#fff" stroke="#0b3f3a" stroke-width="2"/><circle cx="32" cy="8" r="3.6" fill="#fff" stroke="#0b3f3a" stroke-width="2"/></svg>',
  tope:'<svg viewBox="0 0 40 34"><circle cx="20" cy="10" r="3.4" fill="#0b3f3a"/><rect x="11" y="15" width="18" height="7" fill="#e9d2b3" stroke="#b45309" stroke-width="1.6"/><path d="M12 22 l-3 5 M18 22 l-3 5 M24 22 l-3 5 M30 22 l-3 5" stroke="#b45309" stroke-width="1.3"/></svg>'
};
function _vnModal(){
  let ov = document.getElementById('vinculoModal');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'vinculoModal';
  ov.className = 'modal-ov';
  const boton = t => '<button type="button" class="menu-btn" data-vtipo="' + t + '" onclick="vnCambiarTipo(\'' + t + '\')">'
    + SVG_VIN[t] + '<span>' + VIN_TIPOS[t].nom + '</span></button>';
  ov.innerHTML =
      '<div class="modal vn">'
    +   '<h3 id="vnTit">Vínculo</h3>'
    +   '<p class="sub" id="vnSub"></p>'
    +   '<div class="menu-grid">' + boton('cuerda') + boton('biela') + boton('tope') + '</div>'
    +   '<div class="vn-admite" id="vnAdmite"></div>'
    +   '<div class="modo-tabs" id="vnModos">'
    +     '<button class="modo-btn" id="vnModoNormal" onclick="vnCambiarModo(\'normal\')">Perpendicular a la compuerta</button>'
    +     '<button class="modo-btn" id="vnModoAngulo" onclick="vnCambiarModo(\'angulo\')">Dirección dada</button>'
    +   '</div>'
    +   '<div class="vn-cuerpo">'
    +     '<div class="vn-campos">'
    +       '<div class="vn-destino" id="vnDestino"></div>'
    +       '<div class="modal-field" id="vnLadoFila"><label>Lado del anclaje</label>'
    +         '<select id="vnLado" onchange="dibujarCroquisVinculo()"><option value="1">Zona 1 (izquierda)</option><option value="2">Zona 2 (derecha)</option></select></div>'
    +       '<div class="modal-field" id="vnAngFila"><label>Dónde está el anclaje (°)</label>'
    +         '<input type="number" id="vnAng" step="any" oninput="dibujarCroquisVinculo()"></div>'
    +       '<div class="vn-nota" id="vnNota"></div>'
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
function abrirVinculo(datos){
  edVinculo = Object.assign({modo:'angulo', lado:1}, datos);
  if(_esAnclado(edVinculo) && !isFinite(+edVinculo.ang)) edVinculo.ang = -90;
  _vnModal().classList.add('show');
  document.getElementById('vnAng').value = _esAnclado(edVinculo) ? (+edVinculo.ang || 0) : '';
  document.getElementById('vnLado').value = String(edVinculo.lado === 2 ? 2 : 1);
  pintarVentanaVinculo();
}
function editarVinculo(id){
  const v = vinculos.find(z=>z.id === id);
  if(!v) return;
  abrirVinculo({id:v.id, tipo:v.tipo, a:v.a, b:(v.b === undefined ? null : v.b), ang:v.ang, modo:v.modo || 'angulo', lado:v.lado || 1});
}
// Desde la ventana Editar nudo: el tope de ese nudo, o uno nuevo.
function abrirTopeDeNudo(id){
  const ya = vinculos.find(v=>v.tipo === 'tope' && v.a === id);
  if(ya) editarVinculo(ya.id);
  else abrirVinculo({id:null, tipo:'tope', a:id, b:null, ang:-90, modo:'normal', lado:_ladoSeco()});
}
function cerrarVinculo(){
  const ov = document.getElementById('vinculoModal');
  if(ov) ov.classList.remove('show');
  edVinculo = null;
  cancelarTrazoVinculo();
}
function vnCambiarTipo(t){
  if(!edVinculo) return;
  if(t === 'tope' && !_esAnclado(edVinculo)){ aviso('El tope va en un solo nudo, contra su anclaje: no se pone entre dos nudos.', 'error'); return; }
  edVinculo.tipo = t;
  pintarVentanaVinculo();
}
function vnCambiarModo(m){
  if(!edVinculo) return;
  edVinculo.modo = m;
  pintarVentanaVinculo();
}
function pintarVentanaVinculo(){
  const e = edVinculo; if(!e) return;
  const A = nodo(e.a), anc = _esAnclado(e), B = anc ? null : nodo(e.b);
  const T = VIN_TIPOS[e.tipo];
  document.getElementById('vnTit').textContent = (e.id ? 'Editar ' + T.nom.toLowerCase() : T.nom) + (anc ? ' en el nudo ' + A.nombre : ' entre ' + A.nombre + ' y ' + B.nombre);
  document.getElementById('vnSub').textContent = anc ? (e.tipo === 'tope' ? 'Anclado' : 'Anclada') + ' en una dirección: indica dónde está su anclaje.' : 'Une los dos nudos: solo lleva fuerza axial.';
  document.querySelectorAll('#vinculoModal .menu-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.vtipo === e.tipo);
    b.disabled = (b.dataset.vtipo === 'tope' && !anc);
    b.style.opacity = b.disabled ? '.4' : '';
  });
  document.getElementById('vnAdmite').innerHTML = 'Admite: <b>' + T.admite + '</b>';
  document.getElementById('vnDestino').textContent = anc ? 'Desde el nudo ' + A.nombre + ' hacia su anclaje.' : 'Entre los nudos ' + A.nombre + ' y ' + B.nombre + '.';
  const normal = anc && e.modo === 'normal';
  document.getElementById('vnModos').style.display = anc ? '' : 'none';
  document.getElementById('vnModoNormal').classList.toggle('active', normal);
  document.getElementById('vnModoAngulo').classList.toggle('active', anc && !normal);
  document.getElementById('vnLadoFila').style.display = normal ? '' : 'none';
  document.getElementById('vnAngFila').style.display = (anc && !normal) ? '' : 'none';
  document.getElementById('vnQuitar').style.display = e.id ? '' : 'none';
  dibujarCroquisVinculo();
}
// Dirección del anclaje con lo que dice ahora la ventana.
function _vnDirVentana(e, A){
  if(!_esAnclado(e)){ const B = nodo(e.b), L = Math.hypot(B.x - A.x, B.y - A.y) || 1; return {x:(B.x - A.x)/L, y:(B.y - A.y)/L}; }
  if(e.modo === 'normal'){
    const nv = normalCompuertaEnNudo(A, parseInt(document.getElementById('vnLado').value, 10) === 2 ? 2 : 1);
    if(nv) return nv;
  }
  const a = parseFloat(document.getElementById('vnAng').value);
  const r = (isFinite(a) ? a : 0)*Math.PI/180;
  return {x:Math.cos(r), y:Math.sin(r)};
}
// Croquis de la ventana: el nudo con los tramos que llegan, el vínculo con su
// símbolo y, si va anclado, el ángulo desde +x hasta la dirección del anclaje.
function dibujarCroquisVinculo(){
  const caja = document.getElementById('vnCroquis');
  const e = edVinculo;
  if(!caja || !e) return;
  const W = 230, H = 190, F = v => v.toFixed(1);
  const A = nodo(e.a), anc = _esAnclado(e);
  const T = VIN_TIPOS[e.tipo];
  const d = _vnDirVentana(e, A);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  s += '<rect width="' + W + '" height="' + H + '" fill="#fbfcfe"/>';
  let ax, ay, bx, by, sx = 0, sy = 0;
  const segs = [];
  if(anc){
    const ex = d.x, ey = -d.y;
    ax = W/2; ay = H/2;
    // tramos que llegan al nudo, cortos y tenues, con su forma, para situarlo
    tramos.forEach(t=>{
      if(t.a !== A.id && t.b !== A.id) return;
      let pts = puntosTramo(t, 24);
      if(pts.length < 2) return;
      if(t.b === A.id) pts = pts.slice().reverse();
      const fin = pts[pts.length-1], Lt = Math.hypot(fin.x - A.x, fin.y - A.y) || 1;
      const k = 70/Lt;
      const P = p => [ax + (p.x - A.x)*k, ay - (p.y - A.y)*k];
      s += '<polyline points="' + pts.map(p=>P(p).map(F).join(',')).join(' ') + '" fill="none" stroke="#7fa9a4" stroke-width="5" stroke-linecap="round"/>';
      for(let i=0;i<pts.length-1;i++){ const p1 = P(pts[i]), p2 = P(pts[i+1]); segs.push([p1[0], p1[1], p2[0], p2[1]]); }
      sx += (fin.x - A.x)/Lt; sy -= (fin.y - A.y)/Lt;
    });
    const L = e.tipo === 'tope' ? 26 : 62;
    bx = ax + ex*L; by = ay + ey*L;
    sx += ex; sy += ey;
    s += _vnSimboloSVG(e.tipo, ax, ay, bx, by, ex, ey, false, F);
    segs.push([ax, ay, bx, by]);
    const ang = Math.atan2(d.y, d.x)*180/Math.PI;
    s += bsaArcoAnguloSVG({x:ax, y:ay, ang, col:T.col, r:20, ref:34, ancho:W, alto:H, segs, ocupadas:[]}).svg;
  } else {
    const B = nodo(e.b);
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const k = 140/L;
    ax = W/2 - dx*k/2; ay = H/2 + dy*k/2; bx = W/2 + dx*k/2; by = H/2 - dy*k/2;
    s += _vnSimboloSVG(e.tipo, ax, ay, bx, by, dx/L, -dy/L, true, F);
    sx = dx/L; sy = -dy/L;
    s += '<circle cx="' + F(bx) + '" cy="' + F(by) + '" r="5" fill="#0b3f3a"/>'
      + '<text x="' + F(bx + dx/L*16) + '" y="' + F(by - dy/L*16 + 4.5) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + B.nombre + '</text>';
  }
  let ls = Math.hypot(sx, sy);
  if(ls < 0.3){ sx = 0; sy = 1; ls = 1; }                   // sin dirección clara: el nombre, arriba
  s += '<circle cx="' + F(ax) + '" cy="' + F(ay) + '" r="5" fill="#0b3f3a"/>'
    + '<text x="' + F(ax - sx/ls*16) + '" y="' + F(ay - sy/ls*16 + 4.5) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + A.nombre + '</text>';
  s += '</svg>';
  caja.innerHTML = s;
  // La nota: cómo se lee el ángulo o, en perpendicular, a cuánto queda el anclaje.
  const nota = document.getElementById('vnNota');
  if(nota){
    if(!anc) nota.textContent = '';
    else if(e.modo === 'normal') nota.textContent = 'El anclaje queda a ' + dec(Math.atan2(d.y, d.x)*180/Math.PI,'ang') + '° desde +x (normal a la compuerta en ' + A.nombre + ').';
    else nota.textContent = 'Visto desde el nudo: 0° derecha, 90° arriba, −90° abajo, 180° izquierda.';
  }
}
// El símbolo en SVG: cuerda (línea fina), biela (barra con pasadores) o tope
// (bloque). Anclado, con su apoyo rayado al final.
function _vnSimboloSVG(tipo, ax, ay, bx, by, ex, ey, dos, F){
  const T = VIN_TIPOS[tipo], nx = -ey, ny = ex;
  let s = '';
  if(tipo === 'tope'){
    const cx = ax + ex*14, cy = ay + ey*14;
    const p = (u, v) => F(cx + ex*u + nx*v) + ',' + F(cy + ey*u + ny*v);
    s += '<polygon points="' + [p(-5,-15), p(7,-15), p(7,15), p(-5,15)].join(' ') + '" fill="#e9d2b3" stroke="' + T.col + '" stroke-width="1.6"/>';
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
    s += '<line x1="' + F(bx + nx*12) + '" y1="' + F(by + ny*12) + '" x2="' + F(bx - nx*12) + '" y2="' + F(by - ny*12) + '" stroke="#0b3f3a" stroke-width="2.2"/>';
    for(let i=-2;i<=2;i++){
      const q0 = {x:bx + nx*i*5.5, y:by + ny*i*5.5};
      s += '<line x1="' + F(q0.x) + '" y1="' + F(q0.y) + '" x2="' + F(q0.x + ex*6 - nx*4) + '" y2="' + F(q0.y + ey*6 - ny*4) + '" stroke="#0b3f3a" stroke-width="1.1"/>';
    }
  }
  return s;
}
function aplicarVinculo(){
  const e = edVinculo; if(!e) return;
  const anc = _esAnclado(e);
  let ang = null, modo = 'angulo', lado = 1;
  if(anc){
    modo = e.modo === 'normal' ? 'normal' : 'angulo';
    lado = parseInt(document.getElementById('vnLado').value, 10) === 2 ? 2 : 1;
    // 0° es un valor válido (anclaje a la derecha): nada de «|| -90».
    ang = parseFloat(document.getElementById('vnAng').value);
    if(modo === 'angulo' && !isFinite(ang)){ aviso('Escribe el ángulo del anclaje en grados.', 'error'); return; }
    if(!isFinite(ang)) ang = null;
    if(modo === 'normal' && !normalCompuertaEnNudo(nodo(e.a), lado)){ aviso('En ese nudo no hay compuerta de la que tomar la normal: da la dirección.', 'error'); return; }
  }
  const v0 = e.id ? vinculos.find(z=>z.id === e.id) : null;
  const igual = v0 && v0.tipo === e.tipo && (!anc || ((v0.modo || 'angulo') === modo
              && (modo === 'normal' ? (v0.lado || 1) === lado : +v0.ang === ang)));
  if(igual){ cerrarVinculo(); return; }                      // sin cambios
  registrarCambio();
  if(v0){ v0.tipo = e.tipo; if(anc){ v0.modo = modo; v0.lado = lado; v0.ang = ang; } }
  else vinculos.push({id:++vinculoSeq, tipo:e.tipo, a:e.a, b:anc ? null : e.b, ang:anc ? ang : null, modo, lado});
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
  if(!_esAnclado(v)){
    const B = nodo(v.b); const [bx, by] = aPantalla(B.x, B.y);
    const L = Math.hypot(bx - ax, by - ay) || 1;
    return {ax, ay, bx, by, ex:(bx - ax)/L, ey:(by - ay)/L, dos:true};
  }
  const d = dirVinculo(v), ex = d.x, ey = -d.y;
  const L = v.tipo === 'tope' ? 26 : 58;
  return {ax, ay, bx:ax + ex*L, by:ay + ey*L, ex, ey, dos:false};
}
// Se dibujan con los apoyos (VIS.apoyos); el nombre y, con resultados, su
// fuerza: «T_AD = 12.50 kN (tracción)», en rojo si trabaja como no admite.
function dibujarVinculos(){
  if(VIS.apoyos === false) return;
  vinculos.filter(vinculoValido).forEach(v=>{
    const g = _vnGeomPx(v), T = VIN_TIPOS[v.tipo];
    const nx = -g.ey, ny = g.ex;
    ctx.save();
    if(v.tipo === 'tope'){
      const cx = g.ax + g.ex*14, cy = g.ay + g.ey*14;
      const p = (u, w) => [cx + g.ex*u + nx*w, cy + g.ey*u + ny*w];
      const pol = [p(-5,-15), p(7,-15), p(7,15), p(-5,15)];
      ctx.beginPath();
      pol.forEach((q,i)=>{ if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath(); ctx.fillStyle = '#e9d2b3'; ctx.fill(); ctx.strokeStyle = T.col; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineWidth = 1.2;
      for(let i=-2;i<=2;i++){
        const q0 = [cx + g.ex*7 + nx*i*6, cy + g.ey*7 + ny*i*6];
        ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q0[0] + g.ex*6 - nx*4, q0[1] + g.ey*6 - ny*4); ctx.stroke();
      }
      _reservarTrazo(g.ax + g.ex*8, g.ay + g.ey*8, g.ax + g.ex*28, g.ay + g.ey*28, 16, 'simbolo');
    } else {
      ctx.strokeStyle = T.col; ctx.lineWidth = v.tipo === 'cuerda' ? 2.2 : 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke();
      _reservarTrazo(g.ax, g.ay, g.bx, g.by, 3, 'trazo');
      if(v.tipo === 'biela'){
        ctx.fillStyle = '#fff'; ctx.lineWidth = 1.8;
        [[g.ax + g.ex*11, g.ay + g.ey*11], [g.bx - g.ex*(g.dos ? 11 : 0), g.by - g.ey*(g.dos ? 11 : 0)]].forEach(q=>{
          ctx.beginPath(); ctx.arc(q[0], q[1], 3.8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        });
      }
      if(!g.dos){
        ctx.strokeStyle = '#0b3f3a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(g.bx + nx*12, g.by + ny*12); ctx.lineTo(g.bx - nx*12, g.by - ny*12); ctx.stroke();
        ctx.lineWidth = 1.2;
        for(let i=-2;i<=2;i++){
          const q0 = [g.bx + nx*i*5.5, g.by + ny*i*5.5];
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q0[0] + g.ex*6 - nx*4, q0[1] + g.ey*6 - ny*4); ctx.stroke();
        }
        _reservarTrazo(g.bx - nx*13, g.by - ny*13, g.bx + nx*13, g.by + ny*13, 8, 'simbolo');
      }
    }
    ctx.restore();
    let txt = nombreVinculoPlano(v), col = T.col;
    if(R && !R.error && R.inc){
      const j = R.inc.findIndex(u=>u.vin === v);
      if(j >= 0){
        const tr = trabajoVinculo(R.inc[j], R.val[j]);
        txt += ' = ' + dec(Math.abs(R.val[j]),'f') + ' ' + unitFor + ' (' + tr.txt + ')';
        if(!tr.ok) col = '#c0392b';
      }
    }
    const mx = (v.tipo === 'tope') ? g.ax + g.ex*30 : (g.ax + g.bx)/2;
    const my = (v.tipo === 'tope') ? g.ay + g.ey*30 : (g.ay + g.by)/2;
    const lx = (v.tipo === 'tope') ? g.ex : nx, ly = (v.tipo === 'tope') ? g.ey : ny;
    _rotulo(txt, mx + lx*12, my + ly*12, col, lx, ly, '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
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

// ── Panel Elementos: la lista de vínculos, bajo la de apoyos ──
function htmlListaVinculos(){
  const lista = vinculos.filter(vinculoValido);
  if(!lista.length) return '';
  return '<div class="panel-title" style="margin-top:10px">Vínculos</div>' + lista.map(v=>
    '<div class="item-row"><div class="dot" style="background:' + VIN_TIPOS[v.tipo].col + '"></div>'
    + '<div class="nm"><b>' + nombreVinculoHtml(v) + '</b> · ' + VIN_TIPOS[v.tipo].nom.toLowerCase() + ' · ' + textoAnclaje(v) + '</div>'
    + '<button class="x" title="Editar" onclick="editarVinculo(' + v.id + ')">✎</button>'
    + '<button class="x" title="Borrar" onclick="borrarVinculo(' + v.id + ')">×</button></div>').join('');
}

// ── Pantalla y PDF: avisos ──
function avisosVinculosHtml(r){
  return avisosDeVinculos(r).map(a=>'<div class="verdict bad" style="margin-top:8px"><div class="verdict-t">'
    + (a.cuerda ? 'Cuerda en compresión' : 'Tope que no trabaja') + '</div>' + textoAvisoVinculo(a, false) + '</div>').join('');
}
function avisosVinculosTex(r){
  // En rojo, como en fuerzas internas (22-).
  return avisosDeVinculos(r).map(a=>'\\par\\noindent\\fcolorbox{red!70!black}{red!6}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small\\textbf{'
    + (a.cuerda ? 'Cuerda en compresión' : 'Tope que no trabaja') + '.} '
    + textoAvisoVinculo(a, true).replace(/<b>/g, '\\textbf{').replace(/<\/b>/g, '}') + '}}\\par\\smallskip\n').join('');
}

// ── TikZ: los vínculos en las figuras del PDF (07-) ──
// En el modelo (figura 1) se dibujan todos con su símbolo y su nombre. En un DCL
// los anclados ya están sustituidos por su fuerza (la dibuja tkpDCL), y los que
// unen dos nudos del cuerpo dibujado son parte de él: se dibujan como barra.
// `nodosSel`: los nudos del cuerpo (null = toda la compuerta).
function tikzVinculosPF(X, Y, enDCL, nodosSel){
  const F = v => v.toFixed(3);
  let out = '';
  const dentro = id => !nodosSel || nodosSel.indexOf(id) >= 0;
  vinculos.filter(vinculoValido).forEach(v=>{
    const A = nodo(v.a), dos = !_esAnclado(v);
    if(!dentro(v.a)) return;
    if(dos && !dentro(v.b)) return;
    if(enDCL && !dos) return;
    const T = VIN_TIPOS[v.tipo], d = dirVinculo(v);
    const ax = X(A.x), ay = Y(A.y);
    if(dos){
      const B = nodo(v.b), bx = X(B.x), by = Y(B.y);
      out += '\\draw[color=' + T.colTex + ', line width=' + (v.tipo === 'cuerda' ? '.9' : '1.5') + 'pt] (' + F(ax) + ',' + F(ay) + ') -- (' + F(bx) + ',' + F(by) + ');\n';
      if(v.tipo === 'biela'){
        const L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax)/L, uy = (by - ay)/L;
        out += '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(ax + ux*0.22) + ',' + F(ay + uy*0.22) + ') circle (0.06);\n'
             + '\\filldraw[fill=white, draw=' + T.colTex + ', line width=.6pt] (' + F(bx - ux*0.22) + ',' + F(by - uy*0.22) + ') circle (0.06);\n';
      }
      tkpOcuparTrazo(ax, ay, bx, by, 0.06);
      if(!enDCL) out += tkpTexto((ax + bx)/2 - d.y*0.25, (ay + by)/2 + d.x*0.25, '$' + nombreVinculoTex(v) + '$', 'font=\\scriptsize, color=' + T.colTex, -d.y, d.x);
      return;
    }
    // Anclado (solo en el modelo): el símbolo hacia su anclaje.
    const nx = -d.y, ny = d.x;
    if(v.tipo === 'tope'){
      const cx = ax + d.x*0.32, cy = ay + d.y*0.32;
      const p = (u, w) => '(' + F(cx + d.x*u + nx*w) + ',' + F(cy + d.y*u + ny*w) + ')';
      out += '\\filldraw[fill=bsaTope!15, draw=bsaTope, line width=.8pt] ' + p(-0.1,-0.3) + ' -- ' + p(0.14,-0.3) + ' -- ' + p(0.14,0.3) + ' -- ' + p(-0.1,0.3) + ' -- cycle;\n';
      for(let i=-2;i<=2;i++) out += '\\draw[bsaTope, line width=.5pt] ' + p(0.14, i*0.12) + ' -- ' + p(0.26, i*0.12 - 0.08) + ';\n';
      tkpOcupar(cx - 0.35, cy - 0.35, cx + 0.35, cy + 0.35);
      out += tkpTexto(cx + d.x*0.55, cy + d.y*0.55, '$' + nombreVinculoTex(v) + '$', 'font=\\scriptsize, color=bsaTope', d.x, d.y);
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
    tkpOcuparTrazo(ax, ay, bx + d.x*0.15, by + d.y*0.15, 0.3);
    out += tkpTexto((ax + bx)/2 - nx*0.3, (ay + by)/2 - ny*0.3, '$' + nombreVinculoTex(v) + '$', 'font=\\scriptsize, color=' + T.colTex, -nx, -ny);
  });
  return out;
}
// Las fuerzas que una incógnita hace sobre el cuerpo dibujado (nudosSel; null =
// toda la compuerta), con su nudo: un vínculo entre dos nudos del cuerpo es
// interno y no hace ninguna; si une el cuerpo con el resto, hace la del nudo
// que está dentro.
function fuerzasVisibles(u, nodosSel){
  const fs = fuerzasDeIncognita(u);
  if(!nodosSel) return u.n2 ? [] : fs;
  const dentro = fs.filter(f=>nodosSel.indexOf(f.n.id) >= 0);
  return (u.n2 && dentro.length === 2) ? [] : dentro;
}
