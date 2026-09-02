// ═══════════════════════════════════════════════════════════
//  REPLICAR: copiar la selección desplazada N veces
// ═══════════════════════════════════════════════════════════
function abrirReplicar(){
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){
    aviso('Marca con "Mover / editar" lo que quieras replicar.');
    return;
  }
  const nTramos = tramosDeGrupo(idsNodos).length;
  document.getElementById('repSub').textContent =
    'Se replicarán ' + idsNodos.length + ' nudo(s)'
    + (nTramos ? ' y ' + nTramos + ' tramo(s)' : '')
    + ', desplazándolos la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  const idsNodos = nodosDeSeleccion();
  const base = nodos.find(z=>z.id===idsNodos[0]);
  const el = document.getElementById('repPrev');
  if(!el || !base) return;
  let t = 'Desde ('+dec(base.x,'len')+' ; '+dec(base.y,'len')+') '+unitLen+' → ';
  const p = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    p.push('('+dec(base.x+dx*i,'len')+' ; '+dec(base.y+dy*i,'len')+')');
  el.innerHTML = t + p.join(', ') + (nrep>3 ? ' …' : '');
}
function applyReplicar(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){ aviso('No hay nada que replicar.', 'error'); return; }
  registrarCambio();
  const idsTramos = tramosDeGrupo(idsNodos);
  const nuevosNodos=[], nuevosTramos=[];
  for(let i=1;i<=nrep;i++){
    const mapaNodo = {};
    idsNodos.forEach(id=>{
      const o = nodos.find(z=>z.id===id); if(!o) return;
      const nn = Object.assign({}, o, {id:++nodoSeq, x:o.x+dx*i, y:o.y+dy*i, nombre:''});
      nodos.push(nn); mapaNodo[id] = nn.id; nuevosNodos.push(nn.id);
    });
    idsTramos.forEach(id=>{
      const o = tramos.find(z=>z.id===id); if(!o) return;
      const nt = Object.assign({}, o, {id:++tramoSeq, a:mapaNodo[o.a], b:mapaNodo[o.b]});
      tramos.push(nt); nuevosTramos.push(nt.id);
    });
  }
  reNombrar();
  selN = nuevosNodos; selT = nuevosTramos;
  infoNodo = nuevosNodos.length ? nuevosNodos[nuevosNodos.length-1] : null;
  infoTramo = nuevosTramos.length ? nuevosTramos[nuevosTramos.length-1] : null;
  R = null;
  closeReplicar(); refrescar();
}
function limpiarTodo(){
  registrarCambio();
  nodos=[]; tramos=[]; nodoSeq=0; tramoSeq=0; selN=[]; selT=[]; R=null;
  document.getElementById('resultsArea').style.display='none';
  const rp=document.getElementById('resultsPanel'); if(rp){rp.innerHTML='';rp.style.display='none';}
  const hh=document.getElementById('noResultsHint'); if(hh) hh.style.display='';
  refrescar();
}
function refrescar(){ dibujar(); pintarListas(); pintarZonas(); }

function toggleActivo(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.activo = (t.activo === false);
  R=null; refrescar();
}
function invertirCara(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.invertir = !t.invertir; R=null; refrescar();
}
function cambiarFlecha(id,v){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.flecha=parseFloat(v)||0; R=null; refrescar();
}
function pintarListas(){
  const lt=document.getElementById('listaTramos');
  if(lt){
    lt.innerHTML = tramos.length ? tramos.map(t=>{
      const act = t.activo !== false;
      return '<div class="item-row'+(selT.indexOf(t.id)>=0?' sel':'')+'">'
        + '<input type="checkbox" '+(act?'checked':'')+' onchange="toggleActivo('+t.id+')" '
        + 'title="Incluir en el análisis" style="width:14px;height:14px;accent-color:#0f5c56">'
        + '<div class="nm">'+nomTramo(t)+' · '+(t.tipo==='arco'?'curvo':'recto')+'</div>'
        + (t.tipo==='arco' ? '<input type="number" step="any" value="'+t.flecha+'" title="flecha" '
            + 'style="width:52px;padding:2px 4px;border:1px solid var(--border2);border-radius:4px;font-size:10px" '
            + 'onchange="cambiarFlecha('+t.id+',this.value)">' : '')
        + '<button class="cara-btn'+(act?' on':'')+'" onclick="invertirCara('+t.id+')" '
        + 'title="Invertir qué cara mira a la zona 1">'+(t.invertir?'Z2→Z1':'Z1→Z2')+'</button>'
        + '<button class="x" onclick="borrarTramo('+t.id+')">×</button></div>';
    }).join('') : '<div class="list-empty">Sin tramos. Coloca nudos y únelos.</div>';
  }
  const la=document.getElementById('listaApoyos');
  if(la){
    const con = nodos.filter(n=>n.apoyo||n.rotula||n.tope);
    la.innerHTML = con.length ? con.map(n=>{
      const et=[];
      if(n.apoyo==='fijo') et.push('apoyo fijo');
      if(n.apoyo==='movil') et.push('móvil '+(n.apAng||90)+'°');
      if(n.rotula) et.push('rótula');
      if(n.tope) et.push('tope '+(n.tope.ang||0)+'°');
      return '<div class="item-row"><div class="dot" style="background:#0b3f3a"></div>'
        + '<div class="nm">'+n.nombre+' · '+et.join(', ')+'</div></div>';
    }).join('') : '<div class="list-empty">Sin apoyos.</div>';
  }
  const si=document.getElementById('tbSelInfo');
  if(si) si.textContent = (!selN.length&&!selT.length) ? 'Nada seleccionado'
    : 'Seleccionado: '+[selN.length?selN.length+' nudo(s)':null, selT.length?selT.length+' tramo(s)':null]
      .filter(Boolean).join(' y ');
}
function borrarTramo(id){ registrarCambio(); tramos=tramos.filter(t=>t.id!==id); R=null; refrescar(); }

// modales de apoyo y tope
function abrirApoyoModal(id){
  apoyoId=id; const n=nodos.find(z=>z.id===id); if(!n) return;
  document.getElementById('apNom').textContent=n.nombre;
  document.getElementById('apAng').value = n.apAng===undefined?90:n.apAng;
  actualizarPrevApoyo();
  document.getElementById('apoyoModal').classList.add('show');
}
function closeApoyoModal(){
  const n=nodos.find(z=>z.id===apoyoId);
  if(n) n.apAng=parseFloat(document.getElementById('apAng').value)||90;
  document.getElementById('apoyoModal').classList.remove('show'); apoyoId=null; R=null; refrescar();
}
function actualizarPrevApoyo(){
  const n=nodos.find(z=>z.id===apoyoId), el=document.getElementById('apPrev');
  if(!n||!el) return;
  const inc = nodos.reduce((s,z)=>s+(z.apoyo==='fijo'?2:z.apoyo==='movil'?1:0)+(z.tope?1:0),0);
  const eq = 3 + nodos.filter(z=>z.rotula).length;
  el.innerHTML='Ahora: <b>'+(n.apoyo?(n.apoyo==='fijo'?'apoyo fijo':'apoyo móvil'):'sin apoyo')
    +'</b> · Incógnitas totales: <b>'+inc+'</b> frente a <b>'+eq+'</b> ecuaciones';
}
function setApoyo(t){
  registrarCambio();
  const n=nodos.find(z=>z.id===apoyoId);
  if(n){ n.apoyo=t; if(t==='movil') n.apAng=parseFloat(document.getElementById('apAng').value)||90; R=null; }
  actualizarPrevApoyo(); refrescar();
}
function abrirTopeModal(id){
  topeId=id; const n=nodos.find(z=>z.id===id); if(!n) return;
  document.getElementById('tpNom').textContent=n.nombre;
  document.getElementById('tpAng').value = n.tope?n.tope.ang:0;
  document.getElementById('topeModal').classList.add('show');
}
function applyTope(){
  registrarCambio();
  const n=nodos.find(z=>z.id===topeId);
  if(n) n.tope={ang:parseFloat(document.getElementById('tpAng').value)||0};
  document.getElementById('topeModal').classList.remove('show'); topeId=null; R=null; refrescar();
}
function quitarTope(){
  registrarCambio();
  const n=nodos.find(z=>z.id===topeId);
  if(n) n.tope=null;
  document.getElementById('topeModal').classList.remove('show'); topeId=null; R=null; refrescar();
}

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  ele:{titulo:'Elementos', btn:'rbEle'},
  liq:{titulo:'Líquidos', btn:'rbLiq'}
};
let seccionAbierta = null;

function posicionarToggle(){
  const p = document.getElementById('leftPanel');
  const f = document.getElementById('panelFlyout');
  const b = document.getElementById('panelToggle');
  if(!p || !b) return;
  const rail = !p.classList.contains('plegado');
  const fly  = f && !f.classList.contains('plegado');
  b.classList.toggle('corrido', rail);
  b.classList.toggle('expandido', rail && fly);
}
function togglePanel(){
  const p = document.getElementById('leftPanel');
  if(!p) return;
  const seCierra = !p.classList.contains('plegado');
  p.classList.toggle('plegado');
  if(seCierra) cerrarSeccion();
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  if(seccionAbierta === id && !f.classList.contains('plegado')){ cerrarSeccion(); return; }
  seccionAbierta = id;
  Object.keys(SECCIONES).forEach(k=>{
    const c = document.getElementById('sec_' + k);
    if(c) c.style.display = (k===id) ? '' : 'none';
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.toggle('active', k===id);
  });
  document.getElementById('flyoutTitulo').textContent = SECCIONES[id].titulo;
  f.classList.remove('plegado');
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function cerrarSeccion(){
  const f = document.getElementById('panelFlyout');
  if(f) f.classList.add('plegado');
  seccionAbierta = null;
  Object.keys(SECCIONES).forEach(k=>{
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.remove('active');
  });
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

function zoomIn(){ escala=Math.min(escala*1.25,4000); dibujar(); }
function zoomOut(){ escala=Math.max(escala/1.25,0.02); dibujar(); }
function centrar(){
  if(!nodos.length){ vx=0; vy=0; escala=60; dibujar(); return; }
  const nv = Math.max(nivelZona(1), nivelZona(2));
  const xs=nodos.map(n=>n.x), ys=nodos.map(n=>n.y).concat(isFinite(nv)?[nv]:[]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  vx=(x0+x1)/2; vy=(y0+y1)/2;
  const dx=Math.max(x1-x0,0.5), dy=Math.max(y1-y0,0.5);
  escala=Math.max(2,Math.min(Math.min((W-260)/dx,(H-150)/dy),900));
  dibujar();
}
function cargarEjemplo(){
  registrarCambio();
  limpiarTodo();
  const A=addNodo(0,0), B=addNodo(0,-3), C=addNodo(2,-4);
  addTramo(A.id,B.id,'recto'); addTramo(B.id,C.id,'recto');
  A.apoyo='fijo';
  C.tope={ang:180};
  zonas = {1:[{g:9.81, niv:0}], 2:[]};
  const eb=document.getElementById('pB'); if(eb) eb.value=2;
  reNombrar(); centrar(); refrescar(); calcular();
}

function openUnitsModal(){
  document.getElementById('selLen').value = unitLen;
  document.getElementById('selFor').value = unitFor;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const L = document.getElementById('selLen').value, F = document.getElementById('selFor').value;
  document.getElementById('upP').textContent = F+'/'+L+'\u00B2';
  document.getElementById('upG').textContent = F+'/'+L+'\u00B3';
}
function applyUnits(){
  const nL=document.getElementById('selLen').value, nF=document.getElementById('selFor').value;
  const kL=LEN_A_M[unitLen]/LEN_A_M[nL], kF=FOR_A_KN[unitFor]/FOR_A_KN[nF];
  nodos.forEach(n=>{ n.x*=kL; n.y*=kL; });
  tramos.forEach(t=>{ t.flecha=(t.flecha||0)*kL; });
  const eb=document.getElementById('pB');
  if(eb && eb.value!=='') eb.value=(parseFloat(eb.value)||0)*kL;
  [1,2].forEach(z=>zonas[z].forEach(l=>{ l.niv*=kL; l.g = l.g*kF/(kL*kL*kL); }));
  unitLen=nL; unitFor=nF;
  document.getElementById('chipUnits').textContent=nL+' · '+nF;
  ['uL5','uL6','uL7'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nL; });
  ['uG1','uG2'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nF+'/'+nL+'³'; });
  R=null; closeUnitsModal(); centrar(); refrescar();
}
function fillDec(id,val){
  const s = document.getElementById(id); if(!s) return;
  s.innerHTML = '';
  for(let i=0;i<=5;i++){
    const o = document.createElement('option');
    o.value = i; o.textContent = i + (i===1?' decimal':' decimales');
    if(i===val) o.selected = true;
    s.appendChild(o);
  }
}
// Etiqueta de decimales en palabras, igual que en los demás capítulos.
function textoDecimales(){
  const v = Object.values(DEC);
  const iguales = v.every(x=>x===v[0]);
  return iguales ? (v[0] + (v[0]===1?' decimal':' decimales'))
                 : v.join(' / ') + ' decimales';
}

function openDecModal(){
  fillDec('selDecLen',DEC.len); fillDec('selDecFor',DEC.fuerza);
  updateDecPreview(); document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  const a = document.getElementById('dpL'), b2 = document.getElementById('dpF');
  if(a) a.textContent = (3.14159).toFixed(g('selDecLen'))+' '+unitLen;
  if(b2) b2.textContent = (58.9231).toFixed(g('selDecFor'))+' '+unitFor;
}
function applyDecModal(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  DEC = {len:g('selDecLen'), fuerza:g('selDecFor')};
  document.getElementById('chipDec').textContent = textoDecimales();
  closeDecModal();
  if(R && !R.error) calcular(); else refrescar();
}
