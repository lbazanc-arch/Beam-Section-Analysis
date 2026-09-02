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
  registrarCambio();
  // El giro NUNCA se engancha a la rejilla: redondear cada nudo alteraría las
  // distancias entre ellos y deformaría la viga.
  t.destinos.forEach(d=>{ const n=nodo(d.id); if(n){ n.x=d.x; n.y=d.y; } });
  R = null;
  closeTransformar(); refrescar();
}
