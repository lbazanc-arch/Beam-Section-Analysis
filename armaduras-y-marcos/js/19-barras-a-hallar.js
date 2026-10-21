// ═══════════════════════════════════════════════════════════
//  BARRAS A HALLAR (2026-10-20, petición del profesor)
//  Con el método de secciones en cortes automáticos, Resolver abre una ventana
//  con la armadura dibujada: el alumno toca las barras que quiere hallar, o
//  marca «Todas las barras». buscarCortes (16-) busca entonces los MENOS cortes
//  que hallan esas barras (buscarCortesDirigidos), con la simetría si la hay.
//  Es la misma ventana que «Tramos de la solución» de fuerzas internas.
//  Con el método de nudos, Resolver resuelve directamente: todos los nudos, o
//  la mitad si la armadura es simétrica (planNudos, 06-).
//  La elección vive en `barrasPedidas` (00-, null = todas) y no se guarda en
//  el archivo.
// ═══════════════════════════════════════════════════════════

let _pedPend = null;        // la selección mientras la ventana está abierta (Set de ids)

function _pedModal(){
  let ov = document.getElementById('barrasPedidasModal');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'barrasPedidasModal';
  ov.className = 'modal-ov';
  ov.innerHTML =
      '<div class="modal selB">'
    +   '<h3>Barras a hallar</h3>'
    +   '<p class="sub">Toca las barras que quieres hallar con el método de secciones.</p>'
    +   '<label class="selB-todo"><input type="checkbox" id="pedTodas" onchange="pedirTodasLasBarras(this.checked)">'
    +   '<span>Todas las barras</span></label>'
    +   '<div id="pedSVG" class="selB-svg"></div>'
    +   '<div id="pedRes" class="selB-res"></div>'
    +   '<div class="modal-btns">'
    +     '<button class="mbtn ghost" onclick="cerrarBarrasPedidas()">Cancelar</button>'
    +     '<button class="mbtn" onclick="confirmarBarrasPedidas()">Resolver</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}

// Lo que llama el botón Resolver.
function resolverConSeleccion(){
  if(metodo !== 'secciones' || modoCorte !== 'auto' || barras.length <= 1){ resolver(); return; }
  const ids = barras.map(b=>b.id);
  const previa = barrasPedidas ? barrasPedidas.filter(id=>ids.indexOf(id) >= 0) : [];
  _pedPend = new Set(previa.length ? previa : ids);
  _pedModal().classList.add('show');
  pintarBarrasPedidas();
}
function cerrarBarrasPedidas(){
  const ov = document.getElementById('barrasPedidasModal');
  if(ov) ov.classList.remove('show');
  _pedPend = null;
}
function confirmarBarrasPedidas(){
  if(!_pedPend || !_pedPend.size){ aviso('Elige al menos una barra.', 'error'); return; }
  const todas = barras.every(b=>_pedPend.has(b.id));
  barrasPedidas = todas ? null : barras.map(b=>b.id).filter(id=>_pedPend.has(id));
  cerrarBarrasPedidas();
  resolver();
}
function pedirTodasLasBarras(v){
  if(!_pedPend) return;
  _pedPend = new Set(v ? barras.map(b=>b.id) : []);
  pintarBarrasPedidas();
}
function alternarBarraPedida(id){
  if(!_pedPend) return;
  if(_pedPend.has(id)) _pedPend.delete(id); else _pedPend.add(id);
  pintarBarrasPedidas();
}

// La armadura, con cada barra tocable: la pedida, en el acento; la otra, gris.
function pintarBarrasPedidas(){
  const caja = document.getElementById('pedSVG');
  if(!caja || !_pedPend) return;
  const todas = document.getElementById('pedTodas');
  if(todas) todas.checked = barras.every(b=>_pedPend.has(b.id));
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  nodos.forEach(n=>{ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); });
  // El ancho del dibujo es el de su caja: en el teléfono las letras no encogen.
  const W = Math.round(Math.max(300, Math.min(560, (caja.clientWidth || 560) - 10))), M = 34;
  const sx = Math.max(x1-x0, 1e-6), sy = Math.max(y1-y0, 0);
  let k = (W-2*M)/sx;
  const H = Math.max(170, Math.min(380, 2*M + sy*k));
  if(sy > 1e-9) k = Math.min(k, (H-2*M)/sy);
  const ox = (W - sx*k)/2, oy = (H - sy*k)/2;
  const X = x => ox + (x-x0)*k, Y = y => H - oy - (y-y0)*k;
  const f = v => v.toFixed(1);
  const nd = id => nodos.find(n=>n.id===id);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Armadura">';
  // Barras: una franja ancha e invisible recibe el toque, para que en el
  // teléfono no haga falta apuntar a una línea de 5 px.
  barras.forEach(b=>{
    const a = nd(b.a), c = nd(b.b);
    if(!a || !c) return;
    const on = _pedPend.has(b.id);
    const xa=X(a.x), ya=Y(a.y), xb=X(c.x), yb=Y(c.y);
    s += '<g class="selB-barra' + (on ? ' on' : '') + '" onclick="alternarBarraPedida(' + b.id + ')">'
      + '<line x1="' + f(xa) + '" y1="' + f(ya) + '" x2="' + f(xb) + '" y2="' + f(yb) + '" stroke="transparent" stroke-width="22" stroke-linecap="round"/>'
      + '<line x1="' + f(xa) + '" y1="' + f(ya) + '" x2="' + f(xb) + '" y2="' + f(yb) + '" stroke="' + (on ? 'var(--acc)' : '#c3cad3')
      + '" stroke-width="' + (on ? 5 : 3.5) + '" stroke-linecap="round"/>'
      + '</g>';
  });
  // Apoyos, como señal para reconocer la armadura (sin su ángulo).
  nodos.forEach(n=>{
    if(!n.apoyo) return;
    const cx = X(n.x), cy = Y(n.y);
    s += '<path d="M ' + f(cx) + ' ' + f(cy+5) + ' L ' + f(cx-8) + ' ' + f(cy+18) + ' L ' + f(cx+8) + ' ' + f(cy+18) + ' Z" fill="none" stroke="#26415e" stroke-width="1.6"/>';
    if(n.apoyo === 'movil')
      s += '<line x1="' + f(cx-10) + '" y1="' + f(cy+23) + '" x2="' + f(cx+10) + '" y2="' + f(cy+23) + '" stroke="#26415e" stroke-width="1.6"/>';
  });
  nodos.forEach(n=>{
    const cx = X(n.x), cy = Y(n.y);
    // El nombre, del lado contrario a las barras que llegan (en pantalla).
    let dx = 0, dy = 0;
    barras.forEach(b=>{
      if(b.a !== n.id && b.b !== n.id) return;
      const o = nd(b.a === n.id ? b.b : b.a);
      if(!o) return;
      const ex = X(o.x) - cx, ey = Y(o.y) - cy, l = Math.hypot(ex, ey) || 1;
      dx += ex/l; dy += ey/l;
    });
    let l = Math.hypot(dx, dy);
    if(l < 0.3){ dx = 0; dy = 1; l = 1; }
    const lx = cx - dx/l*14, ly = cy - dy/l*14 + 4.5;
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="3.8" fill="#26415e"/>'
      + '<text x="' + f(lx) + '" y="' + f(ly) + '" font-family="Inter,sans-serif" font-size="12.5" font-weight="800" fill="#1b1f24" text-anchor="middle">' + n.nombre + '</text>';
  });
  s += '</svg>';
  caja.innerHTML = s;
  const res = document.getElementById('pedRes');
  if(res){
    if(!_pedPend.size) res.innerHTML = 'Ninguna barra elegida.';
    else if(barras.every(b=>_pedPend.has(b.id))) res.innerHTML = 'Se hallarán <b>todas las barras</b>, con la secuencia de cortes más corta.';
    else res.innerHTML = 'Se hallarán: ' + barras.filter(b=>_pedPend.has(b.id)).map(b=>'<b>' + nombreBarra(b) + '</b>').join(' · ')
      + ', con los menos cortes posibles.';
  }
}
