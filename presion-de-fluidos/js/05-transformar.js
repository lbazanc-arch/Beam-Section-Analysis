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
    const n = nodos.find(z=>z.id===id);
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
  const n = nodos.find(z=>z.id===id);
  if(!n) return null;
  return {x:n.x, y:n.y, nombre:'el nudo '+n.nombre};
}
function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const idsNodos = nodosDeSeleccion();
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    idsNodos.forEach(id=>{ const n=nodos.find(z=>z.id===id); if(!n) return; destinos.push({id, x:n.x+dx, y:n.y+dy}); });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  idsNodos.forEach(id=>{
    const n = nodos.find(z=>z.id===id); if(!n) return;
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
  registrarCambio();
  // Topes en modo 'normal' y móviles normales a la compuerta cuyos tramos giran
  // enteros: se anota, antes de mover nada, la normal de cada uno (ver abajo).
  const topesNormales = (transModo === 'girar') ? normalesDeTopesAntesDeGirar(t) : [];
  t.destinos.forEach(d=>{ const n=nodos.find(z=>z.id===d.id); if(n){ n.x=d.x; n.y=d.y; } });
  // Al GIRAR, el apoyo gira con la compuerta: el movil porque su reaccion es
  // real y entra en el calculo, y el fijo para que su simbolo no quede torcido.
  // El tope con direccion dada (modo 'angulo') tambien: su fuerza entra en el
  // calculo tal cual (direccionIncognita lee tope.ang), y sin girarla quedaria
  // apuntando como antes contra una compuerta que ya no esta ahi.
  if(transModo === 'girar'){
    const norm = a => { const v = ((a % 360) + 360) % 360; return v > 180 ? v - 360 : v; };
    t.destinos.forEach(d=>{
      const n = nodos.find(z=>z.id===d.id);
      if(!n) return;
      if(n.apoyo === 'movil') n.apAng     = norm((n.apAng === undefined ? 90 : n.apAng) + t.ang);
      if(n.apoyo === 'fijo')  n.apAngFijo = norm(anguloDibujoApoyoFijo(n) + t.ang);
      if(n.tope && n.tope.modo === 'angulo'){
        const a0 = +n.tope.ang;
        n.tope.ang = norm((isFinite(a0) ? a0 : 0) + t.ang);
      }
    });
    corregirLadoDeTopes(topesNormales, t.ang);
  }
  // El panel enseñaba la solución de la compuerta antes de transformarla.
  invalidarResultados();
  closeTransformar(); refrescar();
}

// ── El lado de un tope normal al girar la compuerta ──
// Un tope en modo 'normal' no guarda direccion: empuja segun la normal a la
// compuerta desde la cara que mira a la zona `lado`, asi que la direccion gira
// sola con los nudos. Lo que puede descolocarse es el LADO. Las zonas son del
// entorno (zona 1 a −x de la frontera, zona 2 a +x) y no giran, pero la cara
// que mira a cada una la decide cadenaCompuerta, que recorre la compuerta del
// extremo mas alto al mas bajo. Si el giro cambia cual de los extremos queda
// arriba (con una compuerta recta, en cuanto pasa de la horizontal), la cadena
// se recorre al reves y la cara que el tope tocaba pasa a mirar a la otra zona:
// con el mismo `lado` el tope saltaria a la cara opuesta y empujaria al reves,
// y como solo puede empujar el resultado seria falso (o «la compuerta se abre»).
// Criterio: la normal con la que empujaba, girada con la compuerta, tiene que
// seguir siendo la normal hacia su lado; si queda opuesta, se cambia 1 ↔ 2.
// La comparacion es LOCAL (la normal en el nudo del tope), asi que basta con
// que el giro sea rigido alli: el nudo del tope y el otro extremo de cada
// tramo que llega a el tienen que girar con la seleccion, es decir, estar
// seleccionados o caer en el centro de giro (que no se mueve). Entonces esos
// tramos giran enteros y «la misma cara» tiene sentido aunque el resto de la
// compuerta, u otra compuerta aparte, no se haya seleccionado. Si alguno de
// esos tramos se estira o se tuerce, no hay giro que comparar y no se toca.
// t.invertir no se toca: es relativo a la regla de la cadena, que ya sigue al
// entorno, y el tramo invertido conserva su cara respecto de sus vecinos.
// El apoyo MÓVIL normal a la compuerta (apModo 'normal') tiene el mismo
// problema: su reacción va según la normal hacia la zona `apLado` (2 si falta),
// y sin corregirla el símbolo saltaba a la otra cara y R cambiaba de signo.
// Se trata igual que el tope, con el mismo criterio de giro rígido.
function normalesDeTopesAntesDeGirar(t){
  if(!tramos.length || !t.ref) return [];
  const ids = new Set(t.destinos.map(d=>d.id));
  let ext = Math.max(1, Math.abs(t.ref.x), Math.abs(t.ref.y));
  nodos.forEach(n=>{ ext = Math.max(ext, Math.abs(n.x), Math.abs(n.y)); });
  const tol = 1e-9*ext;
  const giraConLaSeleccion = id => {
    if(ids.has(id)) return true;
    const n = nodos.find(z=>z.id===id);
    return !!n && Math.hypot(n.x - t.ref.x, n.y - t.ref.y) < tol;
  };
  const lista = [];
  nodos.forEach(n=>{
    const esTope  = !!n.tope && n.tope.modo !== 'angulo';
    const esMovil = n.apoyo === 'movil' && n.apModo === 'normal';
    if((!esTope && !esMovil) || !giraConLaSeleccion(n.id)) return;
    const suyos = tramos.filter(tr=>tr.a === n.id || tr.b === n.id);
    if(!suyos.length) return;
    if(!suyos.every(tr=>giraConLaSeleccion(tr.a === n.id ? tr.b : tr.a))) return;
    if(esTope){
      const nv = normalCompuertaEnNudo(n, _ladoGiro(n, 'tope'));
      if(nv) lista.push({n, nv, cual:'tope'});
    }
    if(esMovil){
      const nv = normalCompuertaEnNudo(n, _ladoGiro(n, 'movil'));
      if(nv) lista.push({n, nv, cual:'movil'});
    }
  });
  return lista;
}
// El lado vigente: el del tope (1 si falta) o la cara del móvil (2 si falta).
function _ladoGiro(n, cual){
  return (cual === 'movil') ? (n.apLado === 1 ? 1 : 2) : (n.tope.lado || 1);
}
function corregirLadoDeTopes(lista, grados){
  const a = grados*Math.PI/180, cs = Math.cos(a), sn = Math.sin(a);
  lista.forEach(({n, nv, cual})=>{
    const gx = nv.x*cs - nv.y*sn, gy = nv.x*sn + nv.y*cs;     // la normal de antes, girada
    const lado = _ladoGiro(n, cual);
    const ahora = normalCompuertaEnNudo(n, lado);
    if(!ahora || gx*ahora.x + gy*ahora.y >= 0) return;
    const otro = (lado === 2) ? 1 : 2;
    if(cual === 'movil') n.apLado = otro;
    else n.tope.lado = otro;
  });
}
