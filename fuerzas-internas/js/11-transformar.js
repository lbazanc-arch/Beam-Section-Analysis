// ═══════════════════════════════════════════════════════════
//  TRANSFORMAR: mover o girar la selección respecto a una coordenada
// ═══════════════════════════════════════════════════════════
let transModo = 'mover';

function abrirTransformar(){
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){
    aviso('Marca con "Mover / editar" lo que quieras transformar.');
    return;
  }
  const sel = document.getElementById('transRef');
  const opciones = ['<option value="origen">Origen (0 ; 0)</option>'];
  idsNodos.forEach(id=>{
    const n = nodo(id);
    if(n) opciones.push('<option value="nodo:'+n.id+'">Nudo '+n.nombre
      + '  ('+dec(n.x,'len')+' ; '+dec(n.y,'len')+')</option>');
  });
  opciones.push('<option value="libre">Coordenada a elegir…</option>');
  sel.innerHTML = opciones.join('');
  document.getElementById('transSub').textContent =
    'Se transformarán ' + idsNodos.length + ' nudo(s). Al girar, la referencia '
    + 'queda fija y es el centro de rotación; al mover, todo se desplaza por igual.';
  cambiarRefTrans();
  setTransModo('mover');
  document.getElementById('transModal').classList.add('show');
}
function closeTransformar(){ document.getElementById('transModal').classList.remove('show'); }

function cambiarRefTrans(){
  const v = document.getElementById('transRef').value;
  document.getElementById('transCampoRef').style.display = (v==='libre') ? 'block' : 'none';
  actualizarPrevTrans();
}
function setTransModo(m){
  transModo = m;
  document.getElementById('transCampoMover').style.display = (m==='mover') ? 'block' : 'none';
  document.getElementById('transCampoGirar').style.display = (m==='girar') ? 'block' : 'none';
  const a = document.getElementById('transTabMover'), b = document.getElementById('transTabGirar');
  if(a) a.classList.toggle('active', m==='mover');
  if(b) b.classList.toggle('active', m==='girar');
  actualizarPrevTrans();
}
function refTransformar(){
  const v = document.getElementById('transRef').value;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  if(v === 'origen') return {x:0, y:0, nombre:'el origen'};
  if(v === 'libre')  return {x:num('transRx'), y:num('transRy'), nombre:'la coordenada indicada'};
  const id = parseInt(String(v).split(':')[1]);
  const n = nodo(id);
  if(!n) return null;
  return {x:n.x, y:n.y, nombre:'el nudo '+n.nombre};
}
// Calcula el resultado sin aplicarlo todavía, para la vista previa.
function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const idsNodos = nodosDeSeleccion();
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    idsNodos.forEach(id=>{ const n=nodo(id); if(!n) return; destinos.push({id, x:n.x+dx, y:n.y+dy}); });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  idsNodos.forEach(id=>{
    const n = nodo(id); if(!n) return;
    const ux = n.x-ref.x, uy = n.y-ref.y;
    destinos.push({id, x: ref.x+ux*cs-uy*sn, y: ref.y+ux*sn+uy*cs});
  });
  return {ref, destinos, ang:grados};
}
function actualizarPrevTrans(){
  const p = document.getElementById('transPrev');
  if(!p) return;
  const t = calcularTransformacion();
  if(!t){ p.textContent = 'Elige una referencia válida.'; return; }
  if(transModo === 'mover'){
    p.textContent = 'Los ' + t.destinos.length + ' nudo(s) se desplazan ('
      + dec(t.dx,'len') + ' ; ' + dec(t.dy,'len') + ') ' + unitLen
      + ', midiendo desde ' + t.ref.nombre + '.';
  } else {
    p.textContent = 'Los ' + t.destinos.length + ' nudo(s) giran ' + t.ang
      + '° alrededor de ' + t.ref.nombre + ' (' + dec(t.ref.x,'len') + ' ; '
      + dec(t.ref.y,'len') + ') ' + unitLen + '.';
  }
}
function applyTransformar(){
  const t = calcularTransformacion();
  if(!t){ aviso('Elige una referencia válida.', 'error'); return; }
  if(transModo === 'mover' && t.dx === 0 && t.dy === 0){
    aviso('Indica un desplazamiento en x o en y.'); return;
  }
  if(transModo === 'girar' && t.ang === 0){
    aviso('Indica un ángulo de giro distinto de cero.'); return;
  }
  // Todo —nudos, apoyos y cargas— entra en UN solo paso de deshacer.
  registrarCambio();
  const movidos = new Set(t.destinos.map(d=>d.id));
  // Las cargas de tramo situadas por COORDENADA (coordX / coordY) guardan en
  // pos y posFin un número que solo tiene sentido con la geometría del momento:
  // `sDesdePos` le resta la del nudo inicial (marco global) o lo divide por la
  // componente del eje (marco local). Al mover o girar el tramo, ese número ya
  // no cae sobre él y la carga se pegaba a un extremo (una repartida podía
  // quedarse con largo cero y desaparecer). Por eso, ANTES de mover nada, se
  // anota la distancia sobre el eje de cada una —sin recortar— y después se
  // vuelve a escribir con la geometría nueva: la carga conserva su sitio en la
  // pieza. Sobre el eje ('eje') la posición ya es relativa y no hace falta.
  const porCoord = [];
  cargas.forEach(c=>{
    if(c.destino === 'nudo') return;
    if(c.basePos !== 'coordX' && c.basePos !== 'coordY') return;
    const tr = tramos.find(z=>z.id === c.tramo);
    if(!tr || (!movidos.has(tr.a) && !movidos.has(tr.b))) return;
    const g = geoTramo(tr);
    if(!g) return;
    const conFin = (c.posFin !== undefined && c.posFin !== null);
    porCoord.push({c, tr, s1: sDesdePos(c, g, c.pos),
                   s2: conFin ? sDesdePos(c, g, c.posFin) : null});
  });
  // Las cargas referidas al EJE ('perp', 'axial') no giran solas del todo: la
  // 'perp' de `dirCarga` apunta siempre «contra» la barra, hacia la y negativa,
  // así que en cuanto el eje pasa de ±90° cambia de lado y la carga saldría
  // invertida respecto del giro rígido (una 'perp' hacia abajo en una viga
  // girada 180° debe quedar hacia ARRIBA). Se anota su vector con la geometría
  // ORIGINAL para compararlo después. Solo si el tramo que da su eje gira
  // entero: con un extremo quieto el eje se deforma, no gira.
  const localAntes = [];
  if(transModo === 'girar'){
    cargas.forEach(c=>{
      if(c.tipo === 'M' || c._peso || marcoDeCarga(c) !== 'local') return;
      const g = geoDeCarga(c);
      if(!g || !movidos.has(g.a.id) || !movidos.has(g.b.id)) return;
      localAntes.push({c, d0: dirCarga(c, g)});
    });
  }
  // El giro NUNCA se engancha a la rejilla: redondear cada nudo alteraría las
  // distancias entre ellos y deformaría la viga.
  t.destinos.forEach(d=>{ const n=nodo(d.id); if(n){ n.x=d.x; n.y=d.y; } });
  // Al GIRAR, el apoyo gira con la viga: el movil porque su reaccion es real y
  // entra en el calculo, y el simple para que su simbolo no quede torcido.
  if(transModo === 'girar'){
    const norm = a => { const v = ((a % 360) + 360) % 360; return v > 180 ? v - 360 : v; };
    t.destinos.forEach(d=>{
      const n = nodo(d.id);
      if(!n) return;
      if(n.apoyo === 'movil')       n.apAng    = norm(anguloApoyo(n) + t.ang);
      else if(n.apoyo === 'simple') n.apAngDib = norm(anguloApoyo(n) + t.ang);
    });
    // Y las cargas giran con la estructura, igual que los apoyos: una vertical
    // sobre una viga girada 90° pasa a horizontal. Aquí las de dirección del
    // PLANO ('y', 'x', 'ang'); las 'perp' y 'axial' siguen al eje del tramo y se
    // tratan justo después, y un par no tiene dirección. Solo si su soporte gira
    // ENTERO —el nudo marcado, o el tramo con sus dos nudos—: con un solo extremo
    // movido el tramo se deforma, no gira, y la carga no tiene por qué girar.
    // El peso propio no es una carga guardada y sigue siempre vertical.
    cargas.forEach(c=>{
      if(c.tipo === 'M' || c._peso) return;
      const d = dirDeCarga(c);
      if(d !== 'y' && d !== 'x' && d !== 'ang') return;
      let entero = false;
      if(c.destino === 'nudo') entero = movidos.has(c.nudo);
      else {
        const tr = tramos.find(z=>z.id === c.tramo);
        entero = !!tr && movidos.has(tr.a) && movidos.has(tr.b);
      }
      if(entero) girarDireccionCarga(c, t.ang);
    });
    // Las de marco local: si el vector con el eje nuevo apunta al revés del
    // vector original girado, la carga se ha invertido (le pasa a la 'perp';
    // la 'axial' sigue al eje y nunca se invierte). Como la magnitud no cambia
    // de signo, pasa a dirección del plano con el vector girado —lo mismo que
    // una 'y' girada 180°—; la posición se reexpresa abajo en marco global,
    // conservando s. Si no se ha invertido, sigue siendo 'perp'.
    localAntes.forEach(r=>{
      const d1 = dirCarga(r.c, geoDeCarga(r.c));
      const e = girarVector(r.d0, t.ang);
      if(e.x*d1.x + e.y*d1.y < 0) direccionDesdeVector(r.c, e.x, e.y);
    });
  }
  // Reexpresión con la geometría NUEVA. Si el tramo quedó perpendicular al eje
  // de su coordenada (vertical con coordX, horizontal con coordY), esa
  // coordenada ya no distingue puntos y se pasa a la otra.
  const limpiar = v => +((Math.abs(v) < 1e-12 ? 0 : v).toFixed(10));
  porCoord.forEach(r=>{
    const g = geoTramo(r.tr);
    if(!g) return;
    const c = r.c;
    let modo = c.basePos;
    if(modo === 'coordX' && Math.abs(g.ux) < 1e-6)      modo = 'coordY';
    else if(modo === 'coordY' && Math.abs(g.uy) < 1e-6) modo = 'coordX';
    c.basePos = modo;
    const local = (marcoDeCarga(c) === 'local');
    c.pos = limpiar(posDesdeS(modo, g, r.s1, local));
    if(r.s2 !== null) c.posFin = limpiar(posDesdeS(modo, g, r.s2, local));
  });
  invalidarResultados();              // 12-: oculta el panel del modelo anterior
  closeTransformar(); refrescar();
}
// Gira la dirección de una carga del plano ('y', 'x', 'ang') un ángulo en
// grados, antihorario. La magnitud NO cambia de signo: una vertical girada 180°
// no pasa a "vertical negativa", sino a inclinada con su ángulo interno (90°,
// hacia arriba). Si el vector cae justo en uno de los dos ejes del modelo
// —(0, −1) es la 'y' positiva y (1, 0) la 'x' positiva— vuelve a esa dirección,
// que es como la escribiría el alumno. `c.ang` es el ángulo INTERNO (desde +x,
// antihorario, hacia donde apunta); el de la ventana lo sigue dando
// `bsaAnguloOpuesto` al abrirla.
function girarDireccionCarga(c, grados){
  const v = girarVector(dirCarga(c, null), grados);
  direccionDesdeVector(c, v.x, v.y);
}
// Vector girado `grados` en sentido antihorario.
function girarVector(v, grados){
  const a = grados*Math.PI/180, cs = Math.cos(a), sn = Math.sin(a);
  return {x: v.x*cs - v.y*sn, y: v.x*sn + v.y*cs};
}
// Deja la carga con la dirección del plano del vector (x, y): 'y', 'x' o 'ang'
// con el ángulo interno normalizado 0–360 y redondeado a 1e-6.
function direccionDesdeVector(c, x, y){
  let ang = Math.atan2(y, x)*180/Math.PI;
  ang = Math.round((((ang % 360) + 360) % 360)*1e6)/1e6;
  if(ang >= 360) ang = 0;
  if(c.tipo === 'PX') c.tipo = 'P';
  if(ang === 270)    { c.dir = 'y'; delete c.ang; }
  else if(ang === 0) { c.dir = 'x'; delete c.ang; }
  else               { c.dir = 'ang'; c.ang = ang; }
  c.orient = marcoDeCarga(c);
}
