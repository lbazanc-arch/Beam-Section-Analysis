// ═══════════════════════════════════════════════════════════
//  CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  fig:{titulo:'Figuras', btn:'rbFig'}
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
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
}
function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  // abrir la columna lateral cierra los menús desplegables de la barra
  try{ cerrarMenusZona1(); }catch(e){}
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
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
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
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
}

// ── Menús desplegables de la Zona 1 (excluyentes entre sí) ──
// Todos los botones de la Zona 1 usan el mismo mecanismo: se despliegan hacia
// abajo desde la barra y al abrir uno se cierra cualquier otro que estuviera
// abierto, incluida la columna lateral.
const MENUS_ZONA1 = ['menuFiguras','menuTipoCuerpo'];
function abrirMenuBarra(id, ev){
  const m=document.getElementById(id); if(!m) return;
  const abre=!m.classList.contains('abierto');
  // cerrar los demás menús de la zona antes de abrir este
  MENUS_ZONA1.forEach(k=>{
    if(k!==id){ const o=document.getElementById(k); if(o) o.classList.remove('abierto'); }
  });
  m.classList.toggle('abierto', abre);
  if(!abre){ marcarBotonZona1(null); return; }
  // al desplegar un menú se repliega la columna lateral, para no tener dos
  // superficies de control abiertas a la vez
  try{ cerrarSeccion(); }catch(e){}
  marcarBotonZona1(id);
  const tb=document.querySelector('.toolbar').getBoundingClientRect();
  const bt=(ev&&ev.currentTarget)?ev.currentTarget.getBoundingClientRect():tb;
  m.style.top=(tb.bottom+6)+'px';
  m.style.left=Math.max(8, Math.min(bt.left, window.innerWidth-m.offsetWidth-8))+'px';
}
function marcarBotonZona1(id){
  const mapa={menuFiguras:'btnFiguras', menuTipoCuerpo:'btnTipoCuerpo'};
  Object.values(mapa).forEach(b=>{
    const el=document.getElementById(b); if(el) el.classList.remove('active');
  });
  if(id && mapa[id]){ const el=document.getElementById(mapa[id]); if(el) el.classList.add('active'); }
}
function cerrarMenusZona1(){
  MENUS_ZONA1.forEach(k=>{ const o=document.getElementById(k); if(o) o.classList.remove('abierto'); });
  marcarBotonZona1(null);
}
function menuFiguras(ev){ abrirMenuBarra('menuFiguras', ev); }
function menuTipoCuerpo(ev){ abrirMenuBarra('menuTipoCuerpo', ev); }

document.addEventListener('click', ev=>{
  const abiertos = MENUS_ZONA1.map(k=>document.getElementById(k)).filter(m=>m&&m.classList.contains('abierto'));
  if(!abiertos.length) return;
  const boton = ev.target.closest && ev.target.closest('[onclick*="menuFiguras"],[onclick*="menuTipoCuerpo"]');
  if(boton) return;                       // lo gestiona abrirMenuBarra
  abiertos.forEach(m=>{
    const dentro = m.contains(ev.target);
    // al elegir una figura el menú se cierra; el resto de controles internos no
    if(!dentro || (dentro && ev.target.closest('.fig-btn'))){
      m.classList.remove('abierto'); marcarBotonZona1(null);
    }
  });
});

// ── Guardar el ejercicio con nombre (máx. 10) ──
const MAX_PROYECTOS = 10;




// ── Herramienta activa y selección múltiple (Cap. 9) ──

function setHerramienta(t){
  herramienta = t;
  // 'pan' se incluye para que el botón de desplazamiento comparta el mismo
  // sistema de herramientas excluyentes que usa el Cap. 7.
  ['pan','sel'].forEach(k=>{
    const b = document.getElementById('t'+k.charAt(0).toUpperCase()+k.slice(1));
    if(b) b.classList.toggle('active', k===t);
  });
  // El botón Eliminar no sigue el patrón de id 't'+Nombre, se marca aparte.
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t==='borrar');
  if(t!=='sel'){ selFiguras=[]; actualizarInfoSel(); }
  const c = document.getElementById('mainCanvas');
  if(c) c.style.cursor = (t==='pan') ? 'grab' : 'default';
  const hint = document.getElementById('canvasHint');
  const hints = {
    pan:  'Arrastra el lienzo para desplazar la vista.',
    sel:  'Toca para seleccionar (varias) · mantén presionado y arrastra para mover · doble clic para editar.',
    borrar: 'Toca una figura para borrarla · sobre zona vacía, mantén presionado y luego arrastra para encerrar y borrar varias (un arrastre rápido solo desplaza el panel).'
  };
  if(hint) hint.textContent = hints[t] || '';
  render();
}
function figuraMarcada(id){ return selFiguras.indexOf(id) >= 0; }
function alternarFigura(id){
  const i = selFiguras.indexOf(id);
  if(i>=0) selFiguras.splice(i,1); else selFiguras.push(id);
  selectFigure(selFiguras.length ? selFiguras[selFiguras.length-1] : null);
  actualizarInfoSel();
  render();
}
function actualizarInfoSel(){
  const el = document.getElementById('tbSelInfo');
  if(el) el.textContent = selFiguras.length
    ? ('Seleccionadas: '+selFiguras.length+' figura'+(selFiguras.length>1?'s':''))
    : 'Nada seleccionado';
}
// Eliminar: ahora borra TODAS las marcadas
// Botón "Eliminar" (mismo contrato que activarEliminar() de cap6): si ya hay
// figuras marcadas con Mover / editar, las borra de inmediato. Si no hay nada
// marcado, activa la herramienta de borrado interactivo.
function activarEliminar(){
  if(selFiguras.length){ eliminarFiguraSel(); return; }
  setHerramienta('borrar');
}

function eliminarFiguraSel(){
  if(!selFiguras.length){
    aviso('Primero selecciona una o más figuras con la herramienta Mover / editar.');
    return;
  }
  registrarCambio();
  figures = figures.filter(f=>selFiguras.indexOf(f.id) < 0);
  if(selFiguras.indexOf(selectedFigId) >= 0) selectFigure(null);
  selFiguras = [];
  results = null; renderFigList(); actualizarInfoSel(); render();
}
