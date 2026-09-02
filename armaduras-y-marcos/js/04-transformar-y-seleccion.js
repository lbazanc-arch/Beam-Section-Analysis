function actualizarPrevApoyo(){
  const n = nodos.find(z=>z.id===apoyoNodoId);
  const el = document.getElementById('apPrev');
  const dirBox = document.getElementById('apDirBox');
  if(!el || !n) return;
  const esMovil = n.apoyo === 'movil';
  if(dirBox) dirBox.style.display = esMovil ? '' : 'none';
  if(esMovil){
    const horiz = n.apAng === 0;
    const bV = document.getElementById('apDirV'), bH = document.getElementById('apDirH');
    if(bV) bV.classList.toggle('active', !horiz);
    if(bH) bH.classList.toggle('active', horiz);
  }
  const r = nodos.reduce((s2,z)=>s2+gradosApoyo(z), 0);
  el.innerHTML = 'Ahora: <b>' + descApoyoLargo(n)
    + '</b> · Reacciones totales en la armadura: <b>r = ' + r + '</b>';
}
function setApoyo(tipo){
  registrarCambio();
  const n = nodos.find(z=>z.id===apoyoNodoId);
  if(n){
    n.apoyo = tipo;
    if(tipo === 'movil' && n.apAng === undefined) n.apAng = 90;  // vertical por defecto
    resultado = null;
  }
  actualizarPrevApoyo();
  refrescar();
}
// Cambia la dirección de la única reacción de un apoyo móvil: 90 = vertical
// (restringe Y, el caso habitual de un rodillo sobre el suelo), 0 = horizontal
// (restringe X, el rodillo apoyado contra una superficie vertical).
function setApAng(ang){
  const n = nodos.find(z=>z.id===apoyoNodoId);
  if(!n || n.apoyo !== 'movil') return;
  registrarCambio();
  n.apAng = ang;
  resultado = null;
  actualizarPrevApoyo();
  refrescar();
}
// Texto largo (modal, caja de información del nudo).
function descApoyoLargo(n){
  if(!n.apoyo) return 'sin apoyo';
  if(n.apoyo === 'fijo') return 'apoyo fijo (2 reacciones)';
  return 'apoyo móvil (1 reacción ' + (n.apAng===0 ? 'horizontal' : 'vertical') + ')';
}
// Texto corto (lista de nudos).
function descApoyoCorto(n){
  if(!n.apoyo) return '';
  if(n.apoyo === 'fijo') return 'apoyo fijo';
  return 'apoyo móvil (' + (n.apAng===0 ? 'X' : 'Y') + ')';
}

// (editarSeleccion() se retiró: quedó sin ninguna llamada tras introducir
// intentarAbrirEdicion() para el doble clic/doble toque)

// ── Tecla Esc global ──
// Cierra la ventana emergente activa (si hay alguna) sin tocar el modelo;
// si no hay ninguna abierta, cancela la selección actual. No sustituye ni
// elimina el botón "Cancelar" de cada modal: es un atajo adicional.
function manejarEsc(){
  // Antes que nada, la ventana del informe PDF: se superpone a todo lo demás.
  const pl = document.getElementById('panelLatexPDF');
  if(pl && pl.style.display !== 'none' && pl.style.display !== ''){ cerrarPanelLatex(); return; }
  const modales = ['edNodoModal','edBarraModal','apoyoModal','repModal','cargaModal',
                    'transModal','unitsModal','decModal','histModal'];
  const abierto = modales.find(id=>{
    const m = document.getElementById(id);
    return m && m.classList.contains('show');
  });
  if(abierto){
    const m = document.getElementById(abierto);
    m.classList.remove('show');
    if(abierto==='edNodoModal') edNodoId = null;
    else if(abierto==='edBarraModal') edBarraId = null;
    else if(abierto==='apoyoModal') apoyoNodoId = null;
    else if(abierto==='cargaModal') nodoCarga = null;
    return;
  }
  if(selNodos.length || selBarras.length || selNodoInfo!==null || selBarra!==null){
    selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null;
    gesto = null;
    refrescar();
  }
}

// Nudos y barras que caen dentro de un recuadro de pantalla, o que el
// recuadro simplemente toca (una barra "toca" si cruza cualquiera de sus
// cuatro bordes, aunque sus dos nudos queden fuera). La usan tanto la
// selección múltiple como el borrado tipo CAD.
function elementosEnRecuadro(sx0, sy0, sx1, sy1){
  const x1 = Math.min(sx0, sx1), x2 = Math.max(sx0, sx1);
  const y1 = Math.min(sy0, sy1), y2 = Math.max(sy0, sy1);
  const nodosIds = [], barrasIds = [];
  nodos.forEach(nn=>{
    const [px,py] = aPantalla(nn.x, nn.y);
    if(px>=x1 && px<=x2 && py>=y1 && py<=y2) nodosIds.push(nn.id);
  });
  barras.forEach(bb=>{
    const na = nodos.find(z=>z.id===bb.a), nb = nodos.find(z=>z.id===bb.b);
    if(!na || !nb) return;
    const [ax,ay] = aPantalla(na.x,na.y), [bx,by] = aPantalla(nb.x,nb.y);
    const dentro = p => p[0]>=x1 && p[0]<=x2 && p[1]>=y1 && p[1]<=y2;
    const cruza = segmentosCruzan(ax,ay,bx,by, x1,y1,x2,y1) ||
                  segmentosCruzan(ax,ay,bx,by, x2,y1,x2,y2) ||
                  segmentosCruzan(ax,ay,bx,by, x2,y2,x1,y2) ||
                  segmentosCruzan(ax,ay,bx,by, x1,y2,x1,y1);
    if(dentro([ax,ay]) || dentro([bx,by]) || cruza) barrasIds.push(bb.id);
  });
  return {nodosIds, barrasIds};
}

// Botón "Eliminar": si ya hay una selección armada con Mover/editar, la borra
// de inmediato (comportamiento previo). Si no, activa la herramienta de
// borrado interactivo: tocar borra un elemento, arrastrar un recuadro borra
// todo lo que abarque al soltar, tipo CAD.
function activarEliminar(){
  if(selNodos.length || selBarras.length){ eliminarSeleccion(); return; }
  setTool('borrar');
}

function eliminarSeleccion(){
  if(!selNodos.length && !selBarras.length){
    aviso('Primero elige la herramienta Seleccionar y marca los elementos que quieras borrar.');
    return;
  }
  registrarCambio();
  // al borrar un nudo se van también las barras que llegan a él
  barras = barras.filter(b => selBarras.indexOf(b.id) < 0
                           && selNodos.indexOf(b.a) < 0 && selNodos.indexOf(b.b) < 0);
  nodos = nodos.filter(n => selNodos.indexOf(n.id) < 0);
  selNodos = []; selBarras = []; selBarra = null;
  reNombrar(); resultado = null; refrescar();
}

// ═══════════════════════════════════════════════════════════
//  TRANSFORMAR RESPECTO A UN NUDO (mover y girar)
//  El nudo de referencia queda fijo: al mover, es el origen del
//  desplazamiento; al girar, es el centro de rotación.
// ═══════════════════════════════════════════════════════════
let transModo = 'mover';

function abrirTransformar(){
  if(!selNodos.length){
    aviso('Marca al menos un nudo con la herramienta "Mover / editar" para transformarlo.');
    return;
  }
  // Mismo contrato que los demás temas: la referencia puede ser el origen, un
  // nudo de la selección o una coordenada escrita a mano.
  const sel = document.getElementById('transRef');
  const opciones = ['<option value="origen">Origen (0 ; 0)</option>'];
  selNodos.forEach(id=>{
    const n = nodos.find(z=>z.id===id);
    if(n) opciones.push('<option value="nodo:'+n.id+'">Nudo '+n.nombre
      + '  ('+dec(n.x,'len')+' ; '+dec(n.y,'len')+')</option>');
  });
  opciones.push('<option value="libre">Coordenada a elegir…</option>');
  sel.innerHTML = opciones.join('');
  document.getElementById('transSub').textContent =
    'Se transformarán ' + selNodos.length + ' nudo(s). Al girar, la referencia '
    + 'queda fija y es el centro de rotación; al mover, toda la selección se desplaza por igual.';
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

function setTransModo(m){
  transModo = m;
  document.getElementById('transCampoMover').style.display = (m==='mover') ? 'block' : 'none';
  document.getElementById('transCampoGirar').style.display = (m==='girar') ? 'block' : 'none';
  const a = document.getElementById('transTabMover'), b = document.getElementById('transTabGirar');
  if(a) a.classList.toggle('active', m==='mover');
  if(b) b.classList.toggle('active', m==='girar');
  actualizarPrevTrans();
}

// Calcula las posiciones resultantes sin aplicarlas todavía.
function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    selNodos.forEach(id=>{
      const n = nodos.find(z=>z.id===id); if(!n) return;
      // En un desplazamiento se mueve TODA la selección por igual: la
      // referencia solo queda fija cuando se gira.
      destinos.push({id, x:n.x+dx, y:n.y+dy});
    });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  selNodos.forEach(id=>{
    const n = nodos.find(z=>z.id===id); if(!n) return;
    const ux = n.x-ref.x, uy = n.y-ref.y;      // rotación 2D alrededor de la referencia
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
  registrarCambio();   // un solo paso de deshacer para todo el lote
  // Ni el giro ni el desplazamiento se enganchan a la rejilla: redondear cada
  // nudo alteraría las longitudes de las barras y deformaría la armadura (un
  // giro de 37° llegó a cambiar una barra de 6 a 6.10). Mismo criterio que
  // los demás temas.
  t.destinos.forEach(d=>{ const n = nodos.find(z=>z.id===d.id); if(n){ n.x = d.x; n.y = d.y; } });
  resultado = null;
  closeTransformar();
  refrescar();
}

function abrirReplicar(){
  if(!selNodos.length){
    aviso('Elige la herramienta Seleccionar y marca al menos un nudo para replicar.');
    return;
  }
  document.getElementById('repSub').textContent =
    'Se replicarán ' + selNodos.length + ' nudo(s)'
    + (selBarras.length ? ' y las barras seleccionadas cuyos dos extremos estén marcados' : '')
    + ', desplazándolos la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  const base = nodos.find(n=>n.id===selNodos[0]);
  const el = document.getElementById('repPrev');
  if(!el || !base) return;
  let t = 'Desde (' + dec(base.x,'len') + ' ; ' + dec(base.y,'len') + ') → ';
  const p = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    p.push('(' + dec(base.x+dx*i,'len') + ' ; ' + dec(base.y+dy*i,'len') + ')');
  el.innerHTML = t + p.join(', ') + (nrep>3 ? ' …' : '');
}
function applyReplicar(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  registrarCambio();
  const orig = selNodos.slice();
  const barrasRep = barras.filter(b => selBarras.indexOf(b.id) >= 0
                    && orig.indexOf(b.a) >= 0 && orig.indexOf(b.b) >= 0);
  const nuevosN = [], nuevasB = [];
  for(let i=1;i<=nrep;i++){
    const mapa = {};
    orig.forEach(id=>{
      const o = nodos.find(z=>z.id===id);
      if(!o) return;
      const nn = {id:++nodoSeq, x:o.x+dx*i, y:o.y+dy*i, apoyo:o.apoyo, apAng:o.apAng, fx:o.fx, fy:o.fy, cargas:(o.cargas||[]).map(c=>({fx:c.fx,fy:c.fy})), nombre:''};
      nodos.push(nn); mapa[id] = nn.id; nuevosN.push(nn.id);
    });
    barrasRep.forEach(b=>{ if(mapa[b.a] && mapa[b.b]){ const nb = addBarra(mapa[b.a], mapa[b.b]); if(nb) nuevasB.push(nb.id); } });
  }
  reNombrar(); resultado = null;
  // Las copias quedan seleccionadas y la vista no se mueve, como en los demás
  // temas: así se puede seguir replicando o transformando el resultado.
  selNodos = nuevosN; selBarras = nuevasB; selBarra = null;
  closeReplicar(); refrescar();
}

// ── Pestañas Nudos / Barras / Cargas ──
function setSubTab(t){
  subTab = t;
  ['nodos','barras','cargas'].forEach(k=>{
    const tab = document.getElementById('st'+k.charAt(0).toUpperCase()+k.slice(1));
    if(tab) tab.classList.toggle('active', t===k);
    const lista = document.getElementById('lista'+k.charAt(0).toUpperCase()+k.slice(1));
    if(lista) lista.style.display = (t===k) ? '' : 'none';
  });
}

// ── Croquis de referencia de la plantilla ──
function dibujarRefPlantilla(){
  const svg = document.getElementById('tplRef');
  if(!svg) return;
  const L = parseFloat(document.getElementById('tplL').value) || 12;
  const Hh = parseFloat(document.getElementById('tplH').value) || 3;
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('tplN').value) || 4));
  const x0 = 26, x1 = 234, yB = 96, yT = 46;
  const p = (x1-x0)/n;
  let s = '<rect x="0" y="0" width="260" height="132" fill="#fff"/>';
  // cuerda inferior y superior según el tipo
  s += '<line x1="'+x0+'" y1="'+yB+'" x2="'+x1+'" y2="'+yB+'" stroke="#b45309" stroke-width="2.2"/>';
  if(tipoTpl === 'warren'){
    for(let i=0;i<n;i++){
      const xa = x0+i*p, xm = xa+p/2, xb = xa+p;
      s += '<line x1="'+xa+'" y1="'+yB+'" x2="'+xm+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
      s += '<line x1="'+xm+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#c98a3a" stroke-width="1.6"/>';
      if(i<n-1) s += '<line x1="'+xm+'" y1="'+yT+'" x2="'+(xm+p)+'" y2="'+yT+'" stroke="#b45309" stroke-width="2.2"/>';
    }
  } else {
    s += '<line x1="'+(x0+p)+'" y1="'+yT+'" x2="'+(x1-p)+'" y2="'+yT+'" stroke="#b45309" stroke-width="2.2"/>';
    s += '<line x1="'+x0+'" y1="'+yB+'" x2="'+(x0+p)+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
    s += '<line x1="'+(x1-p)+'" y1="'+yT+'" x2="'+x1+'" y2="'+yB+'" stroke="#c98a3a" stroke-width="1.6"/>';
    for(let i=1;i<n;i++){
      const x = x0+i*p;
      s += '<line x1="'+x+'" y1="'+yB+'" x2="'+x+'" y2="'+yT+'" stroke="#c98a3a" stroke-width="1.6"/>';
    }
    for(let i=1;i<n-1;i++){
      const xa = x0+i*p, xb = xa+p;
      const izq = (i+1) <= n/2;
      if(tipoTpl === 'howe') s += izq ? '<line x1="'+xa+'" y1="'+yB+'" x2="'+xb+'" y2="'+yT+'" stroke="#dcbb92" stroke-width="1.3"/>'
                                      : '<line x1="'+xa+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#dcbb92" stroke-width="1.3"/>';
      else                   s += izq ? '<line x1="'+xa+'" y1="'+yT+'" x2="'+xb+'" y2="'+yB+'" stroke="#dcbb92" stroke-width="1.3"/>'
                                      : '<line x1="'+xa+'" y1="'+yB+'" x2="'+xb+'" y2="'+yT+'" stroke="#dcbb92" stroke-width="1.3"/>';
    }
  }
  // cotas
  s += '<line x1="'+x0+'" y1="116" x2="'+x1+'" y2="116" stroke="#68727f" stroke-width="1"/>'
     + '<path d="M'+x0+' 116 l6 -3 v6 z M'+x1+' 116 l-6 -3 v6 z" fill="#68727f"/>'
     + '<text x="130" y="128" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#1b1f24" text-anchor="middle">Luz total = '+L+'</text>';
  s += '<line x1="14" y1="'+yT+'" x2="14" y2="'+yB+'" stroke="#68727f" stroke-width="1"/>'
     + '<path d="M14 '+yT+' l-3 6 h6 z M14 '+yB+' l-3 -6 h6 z" fill="#68727f"/>'
     + '<text x="12" y="'+((yT+yB)/2)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#1b1f24" '
     + 'text-anchor="middle" transform="rotate(-90 12 '+((yT+yB)/2)+')">Altura = '+Hh+'</text>';
  // un panel resaltado
  s += '<rect x="'+x0+'" y="'+yT+'" width="'+p+'" height="'+(yB-yT)+'" fill="rgba(180,83,9,.10)"/>'
     + '<text x="'+(x0+p/2)+'" y="'+(yT-6)+'" font-family="Inter,sans-serif" font-size="8.5" font-weight="700" fill="#b45309" text-anchor="middle">1 panel</text>'
     + '<text x="'+(x0+p*2.6)+'" y="'+(yT-6)+'" font-family="Inter,sans-serif" font-size="8.5" fill="#68727f" text-anchor="middle">'+n+' paneles en total</text>';
  s += '<text x="'+x0+'" y="108" font-family="Inter,sans-serif" font-size="8" fill="#68727f" text-anchor="middle">apoyo</text>'
     + '<text x="'+x1+'" y="108" font-family="Inter,sans-serif" font-size="8" fill="#68727f" text-anchor="middle">apoyo</text>';
  svg.innerHTML = s;
}

function pintarLista(){
  const bn = document.getElementById('listaNodos');
  const bb = document.getElementById('listaBarras');
  const bc = document.getElementById('listaCargas');
  const cn = document.getElementById('cntNodos'), cb = document.getElementById('cntBarras');
  const cc = document.getElementById('cntCargas');
  if(cn) cn.textContent = nodos.length;
  if(cb) cb.textContent = barras.length;
  const cargados = nodos.filter(n=>!esCero(n.fx||0) || !esCero(n.fy||0));
  if(cc) cc.textContent = cargados.length;
  if(bc){
    if(!cargados.length){ bc.innerHTML = '<div class="list-empty">Sin cargas todav\u00eda.</div>'; }
    else {
      let h = '';
      cargados.forEach(n=>{
        // Con varias fuerzas se lista cada una por separado (F1, F2...) y al
        // final la resultante del nudo; con una sola, solo sus componentes.
        const lista = (n.cargas && n.cargas.length) ? n.cargas : [{fx:n.fx||0, fy:n.fy||0}];
        const detalle = lista.length > 1
          ? lista.map((c,i)=>'F'+(i+1)+'=('+dec(c.fx,'f')+', '+dec(c.fy,'f')+')').join(' , ')
            + ' \u00b7 resultante Fx=' + dec(n.fx,'f') + ', Fy=' + dec(n.fy,'f') + ' ' + unitFor
          : 'Fx = ' + dec(n.fx,'f') + '   Fy = ' + dec(n.fy,'f') + ' ' + unitFor;
        const marc = selNodos.indexOf(n.id) >= 0 ? ' sel' : '';
        h += '<div class="item-row'+marc+'"><div class="dot" style="background:#c0392b"></div>'
           + '<div class="nm">Nudo ' + n.nombre + ' \u00b7 ' + detalle + '</div>'
           + '<button class="x" title="Editar carga" onclick="abrirCarga('+n.id+')">\u270e</button>'
           + '<button class="x" title="Quitar carga" onclick="quitarCarga('+n.id+')">\u00d7</button></div>';
      });
      bc.innerHTML = h;
    }
  }
  if(bn){
    if(!nodos.length){ bn.innerHTML = '<div class="list-empty">Sin nudos todav\u00eda.</div>'; }
    else {
      let h = '';
      nodos.forEach(n=>{
        const extra = [];
        if(n.apoyo) extra.push(descApoyoCorto(n));
        if(!esCero(n.fx) || !esCero(n.fy)) extra.push('carga');
        const marc = selNodos.indexOf(n.id) >= 0 ? ' sel' : '';
        h += '<div class="item-row'+marc+'"><div class="dot" style="background:#7c3a06"></div>'
           + '<div class="nm">' + n.nombre + ' (' + dec(n.x,'len') + ' ; ' + dec(n.y,'len') + ')'
           + (extra.length ? ' \u00b7 '+extra.join(', ') : '') + '</div>'
           + '<button class="x" title="Editar" onclick="abrirEdNodo('+n.id+')">\u270e</button>'
           + '<button class="x" onclick="borrarNodo('+n.id+')">\u00d7</button></div>';
      });
      bn.innerHTML = h;
    }
  }
  if(bb){
    if(!barras.length){ bb.innerHTML = '<div class="list-empty">Sin barras todav\u00eda.</div>'; }
    else {
      let h = '';
      barras.forEach(b=>{
        const na = nodos.find(n=>n.id===b.a), nb2 = nodos.find(n=>n.id===b.b);
        if(!na||!nb2) return;
        const L = Math.hypot(nb2.x-na.x, nb2.y-na.y);
        const marc = selBarras.indexOf(b.id) >= 0 ? ' sel' : '';
        let col = '#b45309';
        if(resultado){
          const f = resultado.fuerzas[b.id];
          col = esCero(f) ? '#9aa3ad' : (f>0 ? '#1d4ed8' : '#c0392b');
        }
        h += '<div class="item-row'+marc+'"><div class="dot" style="background:'+col+'"></div>'
           + '<div class="nm">' + na.nombre + nb2.nombre + ' \u00b7 L = ' + dec(L,'len') + ' ' + unitLen + '</div>'
           + '<button class="x" title="Editar" onclick="abrirEdBarra('+b.id+')">\u270e</button>'
           + '<button class="x" onclick="borrarBarra('+b.id+')">\u00d7</button></div>';
      });
      bb.innerHTML = h;
    }
  }
  infoSeleccion();
}
