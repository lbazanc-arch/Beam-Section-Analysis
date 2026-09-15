function cargaDeFalla(){
  if(!simCap) return null;
  let mejor = null;
  barras.forEach(b=>{
    const a = simA[b.id], m = simB[b.id];
    if(a === undefined || m === undefined || Math.abs(m) < 1e-12) return;
    // límite superior = capacidad a tracción; inferior = capacidad a compresión
    [simCap.T, -simCap.C].forEach(lim=>{
      if(!(Math.abs(lim) > 0)) return;
      const P = (lim - a) / m;
      if(P > 1e-9 && (mejor === null || P < mejor)) mejor = P;
    });
  });
  return mejor;
}

function simular(){
  if(!simCap || simNodoId === null) return;
  const n = nodos.find(z=>z.id===simNodoId);
  if(!n) return;
  const r = document.getElementById('simRange');
  // El deslizador ya está en unidades absolutas de fuerza (no en 0-100%),
  // así que su valor ES directamente la carga P.
  const P = parseFloat(r.value) || 0;

  const fz = {}; let uMax = 0, gobierna = null; const rotas = [];
  barras.forEach(b=>{
    const f = (simA[b.id] || 0) + (simB[b.id] || 0)*P;
    fz[b.id] = f;
    const adm = f >= 0 ? simCap.T : simCap.C;
    const u = adm > 0 ? Math.abs(f)/adm : 0;
    if(u > uMax){ uMax = u; gobierna = b; }
    if(u > 1) rotas.push(b.id);
  });

  const vv = document.getElementById('simVal');
  if(vv) vv.textContent = dec(P,'f') + ' ' + unitFor;

  // Valor crítico exacto: menor P>0 que hace |a + b·P| = admisible
  let Pcrit = Infinity, bCrit = null;
  barras.forEach(b=>{
    const a = simA[b.id] || 0, bb = simB[b.id] || 0;
    if(Math.abs(bb) < 1e-12) return;
    [simCap.T, -simCap.C].forEach(lim=>{
      const p = (lim - a)/bb;
      if(p > 1e-9 && p < Pcrit){ Pcrit = p; bCrit = b; }
    });
  });
  const cr = document.getElementById('simCrit');
  if(cr){
    if(bCrit && isFinite(Pcrit)){
      cr.innerHTML = '<div class="verdict" style="margin-bottom:8px">'
        + '<div class="verdict-t">Primera barra en fallar al aumentar esta carga</div>'
        + 'Variando la carga del nudo <b>' + n.nombre + '</b>, la primera en llegar a su límite es la barra '
        + '<b style="color:#c0392b">' + nombreBarra(bCrit) + '</b>, cuando esa carga alcanza <b>'
        + dec(Pcrit,'f') + ' ' + unitFor + '</b> (ahora vale ' + dec(simP0,'f') + ' ' + unitFor + ').'
        + '<div class="hint-sm" style="margin-top:4px">Con otra carga del sistema la barra crítica puede ser distinta: '
        + 'cámbiala en el desplegable para comprobarlo.</div></div>';
    } else {
      cr.innerHTML = '<div class="verdict"><div class="verdict-t">Sin barra crítica</div>'
        + 'Esta carga no llega a agotar ninguna barra en el rango analizado.</div>';
    }
  }

  const est = document.getElementById('simEstado');
  if(est){
    if(rotas.length){
      const nom = rotas.map(id=>nombreBarra(barras.find(z=>z.id===id)));
      est.innerHTML = '<div class="verdict bad" style="margin-bottom:8px">'
        + '<div class="verdict-t">Estructura colapsada</div>'
        + '<b>' + nom.length + ' barra(s) han superado su capacidad: ' + nom.join(', ') + '.</b><br>'
        + 'Al fallar una barra la armadura deja de ser estable y se convierte en un mecanismo. '
        + 'A partir de aquí las ecuaciones de la estática ya no describen la estructura: '
        + 'lo que ocurre después es un problema dinámico, fuera del alcance del Cap. 6.</div>';
    } else {
      const nomG = gobierna ? nombreBarra(gobierna) : '—';
      est.innerHTML = '<div class="verdict ok" style="margin-bottom:8px">'
        + '<div class="verdict-t">Estructura estable</div>'
        + 'Con la carga del nudo ' + n.nombre + ' en <b>' + dec(P,'f') + ' ' + unitFor + '</b>, '
        + 'la barra más exigida es <b>' + nomG + '</b> al <b>' + (uMax*100).toFixed(1) + '%</b> de su capacidad.</div>';
    }
  }
  const d = document.getElementById('simDCL');
  if(d) d.innerHTML = svgArmadura({fuerzas:fz, etiqueta:'valor', color:'util', cap:simCap,
        rotas:rotas, cargas:{[simNodoId]:{fx:simDir.ux*P, fy:simDir.uy*P}}});
}

// ═══════════════════════════════════════════════════════════
//  DIAGRAMA DE LA ARMADURA EN SVG (para los resultados)
//  opts: {fuerzas, etiqueta:'nombre'|'valor'|'ambos'|'ninguno',
//         color:'natural'|'util', cap:{T,C}, rotas:[ids], w, h,
//         cargas:{idNudo:{fx,fy}} (sustituyen a las del modelo),
//         reacciones:{idNudo:rr} (se dibujan en su sentido real, con valor)}
// ═══════════════════════════════════════════════════════════
function colorUtil(u){
  // verde → ámbar → rojo según el aprovechamiento (0 a 1)
  if(u >= 1) return '#7f1d1d';
  const t = Math.max(0, Math.min(1, u));
  let r, g, b;
  if(t < 0.5){ const k = t/0.5; r = Math.round(21+(217-21)*k); g = Math.round(128+(160-128)*k); b = Math.round(61+(30-61)*k); }
  else { const k = (t-0.5)/0.5; r = Math.round(217+(192-217)*k); g = Math.round(160+(57-160)*k); b = Math.round(30+(43-30)*k); }
  return 'rgb('+r+','+g+','+b+')';
}

function svgArmadura(opts){
  opts = opts || {};
  const conReac = !!opts.reacciones;
  const W2 = opts.w || 560, H2 = opts.h || 300, M = conReac ? 66 : 46;
  if(!nodos.length) return '<svg viewBox="0 0 '+W2+' '+H2+'"></svg>';
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dx = Math.max(x1-x0, 1e-6), dy = Math.max(y1-y0, 1e-6);
  const k = Math.min((W2-2*M)/dx, (H2-2*M)/dy);
  const ox = (W2 - dx*k)/2 - x0*k, oy = (H2 - dy*k)/2 + y1*k;
  const P = (x,y)=>[ (x*k+ox), (oy - y*k) ];
  const fz = opts.fuerzas || (resultado ? resultado.fuerzas : {});
  const rotas = opts.rotas || [];
  // Todo lo dibujado se apunta en el registro de 12- para que las cargas, las
  // reacciones y sus rótulos no se monten sobre las barras ni entre sí.
  const reg = crearRegistro(SVG_ESC);
  const pend = [], arcos = [];
  let s = '';

  barras.forEach(b=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    if(!na||!nb) return;
    const [ax,ay] = P(na.x,na.y), [bx,by] = P(nb.x,nb.y);
    const f = fz[b.id];
    const rota = rotas.indexOf(b.id) >= 0;
    let col, gw = 3.2;
    if(opts.color === 'util' && opts.cap){
      const adm = (f >= 0 ? opts.cap.T : opts.cap.C) || 1;
      const u = Math.abs(f)/adm;
      col = colorUtil(u);
      gw = 2.6 + Math.min(u,1.4)*2.4;
    } else {
      col = (f===undefined||f===null) ? '#563aa8'
          : (esCero(f) ? '#9aa3ad' : (f>0 ? '#1d4ed8' : '#c0392b'));
      if(esCero(f)) gw = 2;
    }
    s += '<line x1="'+ax.toFixed(1)+'" y1="'+ay.toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+by.toFixed(1)
       + '" stroke="'+col+'" stroke-width="'+gw.toFixed(1)+'" stroke-linecap="round"'
       + (rota ? ' stroke-dasharray="7,6" opacity=".55"' : (esCero(f)&&opts.color!=='util' ? ' stroke-dasharray="6,4"' : '')) + '/>';
    reg.seg(ax, ay, bx, by, gw/2, 'barra', {radialDe:[na.id, nb.id]});
    if(rota){
      const mx = (ax+bx)/2, my = (ay+by)/2;
      s += '<g transform="translate('+mx.toFixed(1)+','+my.toFixed(1)+')">'
         + '<circle r="10" fill="#fff" stroke="#7f1d1d" stroke-width="2"/>'
         + '<line x1="-5" y1="-5" x2="5" y2="5" stroke="#7f1d1d" stroke-width="2.4"/>'
         + '<line x1="5" y1="-5" x2="-5" y2="5" stroke="#7f1d1d" stroke-width="2.4"/></g>';
      reg.caja(mx, my, 22, 22, 'rotulo');
    }
    const et = opts.etiqueta || 'nombre';
    if(et !== 'ninguno' && !rota){
      const mx = (ax+bx)/2, my = (ay+by)/2;
      // desplaza la etiqueta perpendicular a la barra para que no la tape
      const vx = bx-ax, vy = by-ay, L = Math.hypot(vx,vy) || 1;
      const px = -vy/L*11, py = vx/L*11;
      let txt = '';
      if(et === 'nombre') txt = nombreBarra(b);
      else if(et === 'valor') txt = esCero(f) ? '0' : dec(Math.abs(f),'f')+(f>0?' T':' C');
      else txt = nombreBarra(b) + ': ' + (esCero(f) ? '0' : dec(Math.abs(f),'f')+(f>0?' T':' C'));
      const anc = txt.length*5.0 + 8;
      s += '<rect x="'+(mx+px-anc/2).toFixed(1)+'" y="'+(my+py-8).toFixed(1)+'" width="'+anc.toFixed(1)
         + '" height="15" rx="4" fill="#fff" fill-opacity=".92"/>'
         + '<text x="'+(mx+px).toFixed(1)+'" y="'+(my+py+3.5).toFixed(1)
         + '" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'+col
         + '" text-anchor="middle">'+txt+'</text>';
      reg.caja(mx+px, my+py, anc, 15, 'rotulo');
    }
  });

  // apoyos
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    if(n.apoyo === 'fijo'){ const gf = giroApoyoSVG(n, px, py);
      s += gf.abre + '<path d="M'+px+' '+(py+2)+' L'+(px-11)+' '+(py+18)+' L'+(px+11)+' '+(py+18)+' Z" fill="none" stroke="#563aa8" stroke-width="1.8"/>'
         + '<line x1="'+(px-16)+'" y1="'+(py+18)+'" x2="'+(px+16)+'" y2="'+(py+18)+'" stroke="#563aa8" stroke-width="1.8"/>' + gf.cierra;
      _svgRegApoyo(reg, n, px, py);
    } else if(n.apoyo === 'movil'){
      const gm = giroApoyoSVG(n, px, py);
      s += gm.abre
         + '<path d="M'+px+' '+(py+2)+' L'+(px-11)+' '+(py+15)+' L'+(px+11)+' '+(py+15)+' Z" fill="none" stroke="#563aa8" stroke-width="1.8"/>'
         + '<circle cx="'+(px-6)+'" cy="'+(py+19)+'" r="3.4" fill="none" stroke="#563aa8" stroke-width="1.6"/>'
         + '<circle cx="'+(px+6)+'" cy="'+(py+19)+'" r="3.4" fill="none" stroke="#563aa8" stroke-width="1.6"/>'
         + '<line x1="'+(px-16)+'" y1="'+(py+23)+'" x2="'+(px+16)+'" y2="'+(py+23)+'" stroke="#563aa8" stroke-width="1.8"/>'
         + gm.cierra;
      _svgRegApoyo(reg, n, px, py);
    }
  });
  let puntos = '';
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    puntos += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="5" fill="#563aa8" stroke="#fff" stroke-width="1.6"/>';
    reg.caja(px, py, 10, 10, 'punto', {nudo:n.id, radialDe:[n.id]});
  });

  // Fuerzas en los nudos: llegan al nudo, por el lado que decide ladoCarga
  // (12-); una reacción que viene por el eje de su apoyo nace más allá del
  // símbolo. Rótulo tras el extremo libre, colocado al final.
  const ocupDe = {}, ocup = n => (ocupDe[n.id] = ocupDe[n.id] || _angulosBarras(n).map(a => -a));
  const fuerzaNudo = (n, px, py, ux, uy, col, rot, op) => {
    const c = ladoCarga(n, px, py, ux, uy, {reg, L:38, hueco:5, ocupados:ocup(n).concat(op.eje || []),
                                            esApoyo:!!op.esApoyo, lateral:14*Math.sqrt(SVG_ESC)});
    s += _svgFlecha(reg, c.x1, c.y1, c.x2, c.y2, col, {ancho:2.2, extra: c.lateral === 0 ? {radialDe:[n.id]} : {nudo:n.id}});
    ocup(n).push(c.ang);
    pend.push({ex:c.ex, ey:c.ey, dx:c.rx, dy:c.ry, r:rot, col, largo:38});
    // El ángulo de una fuerza inclinada se acota en su cola, con su valor.
    arcos.push({ux, uy, col, ox:c.x1, oy:c.y1});
  };
  // Reacciones (opcional): en su sentido real y con su valor. El rodillo
  // inclinado es UNA reacción, con el arco de su ángulo agudo.
  if(conReac){
    nodos.forEach(n=>{
      const rr = opts.reacciones[n.id];
      if(!rr) return;
      const [px,py] = P(n.x,n.y);
      if(rr.inclinado){
        if(esCero(rr.mag)) return;
        const ar = rr.ang*Math.PI/180, sg = rr.mag > 0 ? 1 : -1;
        fuerzaNudo(n, px, py, sg*Math.cos(ar), -sg*Math.sin(ar), SVG_COL.reac,
          {v:'R', s:n.nombre, t:'\u00a0=\u00a0' + dec(Math.abs(rr.mag),'f') + '\u00a0' + unitFor}, {esApoyo:true});
      } else {
        if(rr.ry !== undefined && !esCero(rr.ry))
          fuerzaNudo(n, px, py, 0, rr.ry > 0 ? -1 : 1, SVG_COL.reac,
            {v:'R', s:'y' + n.nombre, t:'\u00a0=\u00a0' + dec(Math.abs(rr.ry),'f') + '\u00a0' + unitFor}, {esApoyo:true});
        if(rr.rx !== undefined && !esCero(rr.rx))
          fuerzaNudo(n, px, py, rr.rx > 0 ? 1 : -1, 0, SVG_COL.reac,
            {v:'R', s:'x' + n.nombre, t:'\u00a0=\u00a0' + dec(Math.abs(rr.rx),'f') + '\u00a0' + unitFor}, {esApoyo:true});
      }
    });
  }
  nodos.forEach(n=>{
    // Las cargas se pueden sustituir para el dibujo (módulo dinámico), así la
    // flecha y su rótulo acompañan al deslizador en vez de quedarse fijos.
    const cg = (opts.cargas && opts.cargas[n.id]) ? opts.cargas[n.id] : {fx:n.fx, fy:n.fy};
    if(esCero(cg.fx) && esCero(cg.fy)) return;
    const [px,py] = P(n.x,n.y);
    const mag = Math.hypot(cg.fx, cg.fy);
    // La carga no va por donde cuelga el símbolo del apoyo.
    const eje = n.apoyo ? [{ang:180 - anguloDibujoApoyo(n), tol:30}] : [];
    fuerzaNudo(n, px, py, cg.fx/mag, -cg.fy/mag, SVG_COL.carga, {t:dec(mag,'f') + '\u00a0' + unitFor}, {eje});
  });
  arcos.forEach(a=>{ s += _svgArco(reg, a.ox, a.oy, a.ux, a.uy, a.col, null, 17).svg; });
  s += puntos;
  nodos.forEach(n=>{ const [px,py] = P(n.x,n.y); s += _svgNombreNudo(reg, px, py, n.nombre, n.id, 11.5, null, 5); });
  pend.forEach(p=>{ s += _svgRotuloTrasExtremo(reg, p.ex, p.ey, p.dx, p.dy, p.r, p.col, p.largo, 11.5); });
  return _svgEnvolver(s, reg, {x0:0, y0:0, x1:W2, y1:H2}, 4);
}

function fmtCoef(c){
  if(Math.abs(c-1) < 1e-9) return '';
  if(Math.abs(c+1) < 1e-9) return '-';
  return (Math.round(c*10000)/10000) + '\\,';
}
function fmtNum(v){ return (Math.round(v*10000)/10000).toString(); }

// ═══════════════════════════════════════════════════════════
//  FIGURAS SVG DE LA PANTALLA: DCL de nudo, porción del corte y comparativa
// ═══════════════════════════════════════════════════════════
// Criterios del profesor (2026-09-15), los mismos en pantalla y en el PDF:
//  · Incógnita: A TRAZOS, en gris neutro, SALIENDO del nudo (se supone en
//    tracción), con punta sólida y rótulo F_BC, sin valor ni «?».
//  · Conocida (barra resuelta en un nudo anterior, reacción): trazo SÓLIDO, en
//    su color (tracción azul, compresión rojo, reacción verde) y en su sentido
//    real. En pantalla lleva variable y valor: «F_AB = 8.33 T», «R_yC = 5.00 kN»
//    (en el PDF, R21: solo la variable). Fuerza cero conocida: trazo fino gris
//    sin punta, «F_AB = 0».
//  · Carga aplicada: en el acento del tema, llegando al nudo, con valor y unidad.
//  · Ángulos agudos desde el eje más cercano (bsaAnguloAgudoEje), solo si la
//    dirección no está sobre un eje.
//  · Nada se pisa: todo se apunta en el registro de ocupación de 12-latex.js
//    (crearRegistro), con las coordenadas del SVG (y hacia abajo). La escala
//    SVG_ESC convierte las medidas en «cm de papel» de 12- (puntas, márgenes) en
//    píxeles, así que ladoCarga decide el lado de cargas y reacciones igual que
//    en el PDF. Las funciones de 12- se llaman al dibujar, cuando ya se han
//    cargado todas las piezas.
//  · Tipografía de las fórmulas (la de KaTeX, con Times de respaldo) y variables
//    en cursiva, con el subíndice en <tspan>.
const SVG_PX_CM = 38, SVG_ESC = 1/SVG_PX_CM;
const SVG_COL = {incog:'#3d4550', ten:'#1d4ed8', com:'#c0392b', cero:'#9aa3ad',
                 reac:'#15803d', carga:'#7c5cd6', nudo:'#1b1f24'};
const SVG_FUENTE = "KaTeX_Main,'Times New Roman',serif";
const SVG_FUENTE_VAR = "KaTeX_Math,'Times New Roman',serif";
const SVG_GRIEGA = {'\\theta':'\u03b8', '\\alpha':'\u03b1', '\\beta':'\u03b2', '\\gamma':'\u03b3',
                    '\\delta':'\u03b4', '\\varepsilon':'\u03b5', '\\zeta':'\u03b6', '\\eta':'\u03b7'};

function _svgNum(v){ return (Math.round(v*10)/10).toString(); }
function _svgEsc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Rótulo {v, s, t}: variable en cursiva, subíndice en cursiva y texto recto
// detrás («F», «BC», « = 8.33 T»). Medida aproximada, en px, a tamaño fs: basta
// con que la caja no se quede corta.
function _svgMedida(r, fs, peso){
  const ancho = (txt, k) => {
    let w = 0;
    for(const ch of String(txt)){
      if(/[A-Z]/.test(ch)) w += 0.68;
      else if(/[a-z\u03b1-\u03c9]/.test(ch)) w += 0.52;
      else if(/[0-9]/.test(ch)) w += 0.52;
      else if(ch === ' ' || ch === '\u00a0' || ch === '.' || ch === ',') w += 0.27;
      else if(ch === '=') w += 0.62;
      else if(ch === '\u00b0') w += 0.42;
      else w += 0.56;
    }
    return w*fs*k;
  };
  const w = (ancho(r.v || '', 1) + ancho(r.s || '', 0.72) + ancho(r.t || '', 1))*(peso ? 1.08 : 1) + 3;
  return {w, h: fs*(r.s ? 1.34 : 1.14)};
}
// El rótulo centrado en (cx, cy).
function _svgTextoRotulo(r, cx, cy, fs, col, peso){
  const sub = fs*0.30, base = cy + fs*0.34 - (r.s ? fs*0.10 : 0);
  let s = '<text x="'+_svgNum(cx)+'" y="'+_svgNum(base)+'" text-anchor="middle" font-size="'+fs+'" fill="'+col
        + '" font-family="'+SVG_FUENTE+'"'+(peso ? ' font-weight="'+peso+'"' : '')
        + ' stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke">';
  if(r.v) s += '<tspan font-family="'+SVG_FUENTE_VAR+'" font-style="italic">'+_svgEsc(r.v)+'</tspan>';
  if(r.s) s += '<tspan font-family="'+SVG_FUENTE_VAR+'" font-style="italic" font-size="'+_svgNum(fs*0.72)+'" dy="'+_svgNum(sub)+'">'+_svgEsc(r.s)+'</tspan>';
  if(r.t) s += '<tspan'+(r.s ? ' dy="'+_svgNum(-sub)+'"' : '')+'>'+_svgEsc(r.t)+'</tspan>';
  return s + '</text>';
}
// Flecha de (x1,y1) a la punta (x2,y2): el fuste acaba en la base de la punta
// (extremo recto, sin asomar por delante) y la punta sólida lo remata. Registra
// fuste y punta con _polFlecha de 12-, que usa las mismas medidas.
//   op: {ancho, trazos (stroke-dasharray), extra (datos del registro)}
function _svgFlecha(reg, x1, y1, x2, y2, col, op){
  op = op || {};
  const L = Math.hypot(x2-x1, y2-y1) || 1e-9, ux = (x2-x1)/L, uy = (y2-y1)/L, F = _svgNum;
  const pl = Math.min(PUNTA_LARGO_CM*SVG_PX_CM, L), ps = PUNTA_SEMI_CM*SVG_PX_CM*1.05;
  const bx = x2 - ux*pl, by = y2 - uy*pl;
  let s = '<line x1="'+F(x1)+'" y1="'+F(y1)+'" x2="'+F(bx)+'" y2="'+F(by)+'" stroke="'+col+'" stroke-width="'+(op.ancho || 2)
        + '" stroke-linecap="butt"'+(op.trazos ? ' stroke-dasharray="'+op.trazos+'"' : '')+'/>';
  s += '<path d="M'+F(x2)+' '+F(y2)+' L'+F(bx - uy*ps)+' '+F(by + ux*ps)+' L'+F(bx + uy*ps)+' '+F(by - ux*ps)+' Z" fill="'+col+'"/>';
  if(reg) _polFlecha(x1, y1, x2, y2, reg.esc).forEach(p => reg.poner(p, 'flecha', op.extra));
  return s;
}
// Trazo fino sin punta (fuerza cero conocida), registrado como una flecha.
function _svgTrazoCero(reg, x1, y1, x2, y2, extra){
  const F = _svgNum;
  reg.seg(x1, y1, x2, y2, 1.2, 'flecha', extra);
  return '<line x1="'+F(x1)+'" y1="'+F(y1)+'" x2="'+F(x2)+'" y2="'+F(y2)+'" stroke="'+SVG_COL.cero+'" stroke-width="1.3"/>';
}
// Rótulo de una fuerza detrás de su extremo libre (la cola si llega al nudo, la
// punta si sale), con la misma búsqueda que _rotuloTrasExtremo de 12-: en la
// prolongación de la flecha; si choca, girado alrededor del extremo (±30°, ±60°,
// ±90°); después junto al fuste; y solo si nada cabe, más lejos con una guía.
function _svgRotuloTrasExtremo(reg, ex, ey, ux, uy, r, col, largo, fs){
  fs = fs || 11.5;
  const m = _svgMedida(r, fs), w = m.w, h = m.h, hol = 3, marg = 1.5, F = _svgNum;
  const dist = (cx, cy) => (Math.abs(cx)*w + Math.abs(cy)*h)/2 + hol;
  const libre = (x, y) => !reg.choca(_polCaja(x, y, w, h), marg);
  const fijar = (x, y, guia) => { reg.caja(x, y, w, h, 'rotulo'); return (guia || '') + _svgTextoRotulo(r, x, y, fs, col); };
  const base = Math.atan2(uy, ux), rad = Math.PI/180, cands = [];
  [0, 30, -30, 60, -60, 90, -90].forEach(g => {
    const cx = Math.cos(base + g*rad), cy = Math.sin(base + g*rad), d = dist(cx, cy);
    cands.push([ex + cx*d, ey + cy*d]);
  });
  if(largo){
    const nx = -uy, ny = ux, dn = dist(nx, ny);
    [0.25, 0.5].forEach(t => [1, -1].forEach(sg => cands.push([ex - ux*largo*t + sg*nx*dn, ey - uy*largo*t + sg*ny*dn])));
  }
  for(const c of cands) if(libre(c[0], c[1])) return fijar(c[0], c[1]);
  for(const mas of [10, 20, 32, 46]){
    for(const g of [0, 30, -30, 60, -60, 90, -90, 120, -120]){
      const cx = Math.cos(base + g*rad), cy = Math.sin(base + g*rad), d = dist(cx, cy) + mas;
      const x = ex + cx*d, y = ey + cy*d;
      if(!libre(x, y)) continue;
      const ax = ex + cx*2, ay = ey + cy*2, fin = _finGuiaRotulo(ax, ay, x, y, w, h);
      let t = '';
      if(fin){
        t = '<line x1="'+F(ax)+'" y1="'+F(ay)+'" x2="'+F(fin[0])+'" y2="'+F(fin[1])+'" stroke="'+col+'" stroke-width="0.6" opacity=".6"/>';
        reg.seg(ax, ay, fin[0], fin[1], 0.4, 'guia');
      }
      return fijar(x, y, t);
    }
  }
  // Nada libre (un nudo muy concurrido): el candidato que menos se mete en lo
  // demás. El halo blanco del texto lo mantiene legible.
  const mejor = _svgMenosOcupado(reg, cands, w, h, marg);
  return fijar(mejor[0], mejor[1]);
}
// De unos centros candidatos para una caja w×h, el que menos invade lo registrado.
function _svgMenosOcupado(reg, cands, w, h, marg){
  const pen = c => { const pol = _polCaja(c[0], c[1], w, h);
    return reg.items.reduce((acc, it) => acc + Math.max(0, marg - _separacion(pol, it.pol)), 0); };
  let mejor = cands[0], pm = pen(mejor);
  cands.forEach(c => { const q = pen(c); if(q < pm){ mejor = c; pm = q; } });
  return mejor;
}
// Nombre de un nudo, en la primera esquina libre alrededor del punto (arriba a
// la derecha si cabe), como _rotuloNudo de 12-.
// `radio`: el del punto del nudo, para que el nombre no lo toque.
function _svgNombreNudo(reg, px, py, nombre, nudoId, fs, col, radio){
  fs = fs || 12.5;
  const r = {t:nombre}, m = _svgMedida(r, fs, 700), w = m.w, h = m.h, d0 = (radio || 3.6) + 1;
  const noPropio = it => !(it.tipo === 'punto' && it.nudo === nudoId);
  for(const d of [d0, d0 + 4, d0 + 9]){
    for(const [sx, sy] of [[1,-1], [-1,-1], [1,1], [-1,1], [0,-1], [1,0], [-1,0], [0,1]]){
      const x = px + sx*(w/2 + d), y = py + sy*(h/2 + d), pol = _polCaja(x, y, w, h);
      if(reg.choca(pol, 1.2, noPropio)) continue;
      reg.poner(pol, 'nombre');
      return _svgTextoRotulo(r, x, y, fs, col || SVG_COL.nudo, 700);
    }
  }
  const x = px + w/2 + 2.5, y = py - h/2 - 2.5;
  reg.caja(x, y, w, h, 'nombre');
  return _svgTextoRotulo(r, x, y, fs, col || SVG_COL.nudo, 700);
}
// Arco del ángulo agudo de la dirección (ux, uy) —en coordenadas del SVG—
// desde el eje más cercano, con vértice en (ox, oy): trazo a trazos del eje,
// arco y rótulo. Con `gen` (letrasGriegas) el rótulo es la letra; sin él, el
// valor en grados. Con menos de 4° no dibuja nada ni gasta letra: el mismo
// umbral que arcoAngulo de 12-, para que las letras coincidan con las del PDF.
function _svgArco(reg, ox, oy, ux, uy, col, gen, radio){
  const ag = bsaAnguloAgudoEje(ux, uy);
  if(ag.grados < 4) return {svg:'', letra:null, valor:null};
  const R = radio || 22, rad = Math.PI/180, F = _svgNum;
  const rayDeg = ag.desdeV ? (uy >= 0 ? 90 : -90) : (ux >= 0 ? 0 : 180);
  let endDeg = Math.atan2(uy, ux)/rad;
  while(endDeg - rayDeg > 180) endDeg -= 360;      // el arco va siempre por el lado corto
  while(endDeg - rayDeg < -180) endDeg += 360;
  const tick = R + 6, cr = Math.cos(rayDeg*rad), sr = Math.sin(rayDeg*rad);
  let s = '<line x1="'+F(ox)+'" y1="'+F(oy)+'" x2="'+F(ox + tick*cr)+'" y2="'+F(oy + tick*sr)+'" stroke="'+col
        + '" stroke-width="0.9" stroke-dasharray="2.5,2.5" opacity=".75"/>';
  s += '<path d="M'+F(ox + R*cr)+' '+F(oy + R*sr)+' A'+R+' '+R+' 0 0 '+(endDeg > rayDeg ? 1 : 0)+' '
     + F(ox + R*Math.cos(endDeg*rad))+' '+F(oy + R*Math.sin(endDeg*rad))+'" fill="none" stroke="'+col+'" stroke-width="1.1"/>';
  reg.seg(ox, oy, ox + tick*cr, oy + tick*sr, 0.6, 'arco');
  for(let i = 0; i < 6; i++){
    const a0 = (rayDeg + (endDeg-rayDeg)*i/6)*rad, a1 = (rayDeg + (endDeg-rayDeg)*(i+1)/6)*rad;
    reg.seg(ox + R*Math.cos(a0), oy + R*Math.sin(a0), ox + R*Math.cos(a1), oy + R*Math.sin(a1), 0.6, 'arco');
  }
  const letra = gen ? gen.para(ag.grados) : null;
  const r = letra ? {v: SVG_GRIEGA[letra] || '\u03b8'} : {t: dec(ag.grados,'f') + '\u00b0'};
  const fs = letra ? 12.5 : 10, m = _svgMedida(r, fs);
  const midDeg = (rayDeg + endDeg)/2, sg = endDeg >= rayDeg ? 1 : -1;
  const enDir = (deg, rr) => {
    const cx = Math.cos(deg*rad), cy = Math.sin(deg*rad), d = rr + (Math.abs(cx)*m.w + Math.abs(cy)*m.h)/2 + 1.5;
    return [ox + cx*d, oy + cy*d];
  };
  const libre = c => !reg.choca(_polCaja(c[0], c[1], m.w, m.h), 1);
  // Primero en la bisectriz; con ángulos pequeños, fuera, junto al eje o a la flecha.
  const cands = [enDir(midDeg, R), enDir(midDeg, R + 6)];
  [0, 6, 14, 24].forEach(mm => {
    cands.push(enDir(rayDeg - sg*25, R*0.75 + mm));
    cands.push(enDir(endDeg + sg*25, R*0.75 + mm));
    if(mm) cands.push(enDir(midDeg, R + 8 + mm));
  });
  [90, -90, 180].forEach(gg => cands.push(enDir(midDeg + gg, R*0.6)));
  const pos = cands.find(libre) || _svgMenosOcupado(reg, cands, m.w, m.h, 1);
  reg.caja(pos[0], pos[1], m.w, m.h, 'rotulo');
  s += _svgTextoRotulo(r, pos[0], pos[1], fs, col);
  return {svg:s, letra, valor:ag.grados};
}
// Símbolo de un apoyo de svgArmadura, ya girado, en el registro.
function _svgRegApoyo(reg, n, px, py){
  const pts = n.apoyo === 'movil'
    ? [[0,1], [-12,15], [12,15], [-17,15], [17,15], [-17,24.5], [17,24.5]]
    : [[0,1], [-12,18], [12,18], [-17,17], [17,17], [-17,19.5], [17,19.5]];
  const g = normalizarAnguloArm(90 - anguloDibujoApoyo(n))*Math.PI/180, c = Math.cos(g), sn = Math.sin(g);
  reg.poner(_envolvente(pts.map(([x, y]) => [px + x*c - y*sn, py + x*sn + y*c])), 'apoyo', {nudo:n.id});
}
// Cierra un SVG con fondo blanco y un viewBox que abarca lo dibujado: el
// recuadro mínimo `min` {x0,y0,x1,y1} y, si algo se sale, lo que haga falta
// (sin contar la línea del corte, que se recorta).
function _svgEnvolver(cuerpo, reg, min, pad){
  const B = reg.limites(it => it.tipo !== 'corte'), F = _svgNum;
  let x0 = min.x0, y0 = min.y0, x1 = min.x1, y1 = min.y1;
  if(B){ x0 = Math.min(x0, B.x0 - pad); y0 = Math.min(y0, B.y0 - pad); x1 = Math.max(x1, B.x1 + pad); y1 = Math.max(y1, B.y1 + pad); }
  return '<svg viewBox="'+F(x0)+' '+F(y0)+' '+F(x1-x0)+' '+F(y1-y0)+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">'
    + '<rect x="'+F(x0)+'" y="'+F(y0)+'" width="'+F(x1-x0)+'" height="'+F(y1-y0)+'" fill="#fff"/>' + cuerpo + '</svg>';
}
// Valores de los ángulos de una figura, en una línea: «θ = 56.31° · α = 33.69°».
function _svgLineaAngulos(angulos){
  const vistos = [];
  angulos.forEach(a => { if(a.letra && !vistos.some(v => v.letra === a.letra)) vistos.push(a); });
  return vistos.map(a => '<i>' + (SVG_GRIEGA[a.letra] || '\u03b8') + '</i>\u00a0=\u00a0' + dec(a.valor,'f') + '\u00b0').join(' \u00b7 ');
}

// ── DCL del nudo en SVG ──
// Se dibujan las fuerzas que actúan SOBRE el nudo, con los criterios de arriba.
// `incognitas`: las barras que se despejan en este nudo (a trazos, saliendo);
// las demás barras ya se conocen de nudos anteriores y van en su sentido real.
// Primero las barras, después las reacciones (conocidas: se hallan antes, con
// el equilibrio global) y por último la carga, que esquiva todo lo anterior y
// el eje del apoyo. Las letras de los ángulos se reparten en el mismo orden que
// tikzDCLNudo (12-) —barras, reacción del rodillo inclinado, carga—, así que
// coinciden con las del informe; sus valores van en #<svgId>-ang, bajo el SVG.
function dibujarDCL(svgId, n, incognitas){
  const svg = document.getElementById(svgId);
  if(!svg) return;
  incognitas = incognitas || [];
  const res = resultado;
  const reg = crearRegistro(SVG_ESC);
  const L = 50, g = 6, R = g + L;
  const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
  const gen = letrasGriegas(), arcos = [], pend = [], ocup = [];
  const valorF = v => '\u00a0=\u00a0' + dec(Math.abs(v),'f') + '\u00a0' + unitFor;
  let s = '<circle cx="0" cy="0" r="3.6" fill="'+SVG_COL.nudo+'"/>';
  reg.caja(0, 0, 7.6, 7.6, 'punto', {nudo:n.id, radialDe:[n.id]});

  conec.forEach(b=>{
    const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
    const dx = o.x-n.x, dy = o.y-n.y, Lb = Math.hypot(dx,dy);
    const ux = dx/Lb, uy = -dy/Lb;                 // y invertida en SVG
    ocup.push(Math.atan2(uy, ux)*180/Math.PI);
    const nom = nombreBarra(b), radial = {radialDe:[n.id]};
    const val = res ? (res.fuerzas[b.id] || 0) : 0;
    let col, rot;
    if(!res || incognitas.indexOf(b.id) >= 0){
      col = SVG_COL.incog;
      s += _svgFlecha(reg, ux*g, uy*g, ux*R, uy*R, col, {trazos:'5,3', extra:radial});
      rot = {v:'F', s:nom};
    } else if(esCero(val)){
      col = SVG_COL.cero;
      s += _svgTrazoCero(reg, ux*g, uy*g, ux*R, uy*R, radial);
      rot = {v:'F', s:nom, t:'\u00a0=\u00a00'};
    } else {
      // Tracción: la barra tira del nudo (sale). Compresión: lo empuja (llega).
      col = val > 0 ? SVG_COL.ten : SVG_COL.com;
      s += val > 0 ? _svgFlecha(reg, ux*g, uy*g, ux*R, uy*R, col, {extra:radial})
                   : _svgFlecha(reg, ux*R, uy*R, ux*g, uy*g, col, {extra:radial});
      rot = {v:'F', s:nom, t:'\u00a0=\u00a0' + dec(Math.abs(val),'f') + '\u00a0' + (val > 0 ? 'T' : 'C')};
    }
    pend.push({ex:ux*R, ey:uy*R, dx:ux, dy:uy, r:rot, col, largo:L});
    arcos.push({ux, uy, col, radio:24, ox:0, oy:0});
  });

  const fuerza = (ux, uy, col, rot, ocupados) => {
    const c = ladoCarga(n, 0, 0, ux, uy, {reg, L, hueco:g, ocupados, lateral:16*Math.sqrt(SVG_ESC)});
    s += _svgFlecha(reg, c.x1, c.y1, c.x2, c.y2, col, {extra: c.lateral === 0 ? {radialDe:[n.id]} : {nudo:n.id}});
    ocup.push(c.ang);
    pend.push({ex:c.ex, ey:c.ey, dx:c.rx, dy:c.ry, r:rot, col, largo:L});
    arcos.push({ux, uy, col, radio:18, ox:c.x1, oy:c.y1});
  };
  const rr = res ? res.reacciones[n.id] : null;
  if(rr){
    if(rr.inclinado){
      // Un rodillo inclinado tiene UNA reacción: una flecha, en su sentido real.
      if(!esCero(rr.mag)){
        const ar = rr.ang*Math.PI/180, sg = rr.mag > 0 ? 1 : -1;
        fuerza(sg*Math.cos(ar), -sg*Math.sin(ar), SVG_COL.reac, {v:'R', s:n.nombre, t:valorF(rr.mag)}, ocup);
      }
    } else {
      if(rr.ry !== undefined && !esCero(rr.ry)) fuerza(0, rr.ry > 0 ? -1 : 1, SVG_COL.reac, {v:'R', s:'y' + n.nombre, t:valorF(rr.ry)}, ocup);
      if(rr.rx !== undefined && !esCero(rr.rx)) fuerza(rr.rx > 0 ? 1 : -1, 0, SVG_COL.reac, {v:'R', s:'x' + n.nombre, t:valorF(rr.rx)}, ocup);
    }
  }
  if(!esCero(n.fx) || !esCero(n.fy)){
    const mag = Math.hypot(n.fx, n.fy);
    // La carga no va por donde está el apoyo (aunque aquí no se dibuje) ni por
    // la línea de una reacción ya puesta.
    const eje = n.apoyo ? [{ang:180 - anguloDibujoApoyo(n), tol:30}] : [];
    fuerza(n.fx/mag, -n.fy/mag, SVG_COL.carga, {t:dec(mag,'f') + '\u00a0' + unitFor}, ocup.concat(eje));
  }

  const angulos = [];
  arcos.forEach(a=>{
    const ar = _svgArco(reg, a.ox, a.oy, a.ux, a.uy, a.col, gen, a.radio);
    if(ar.svg){ s += ar.svg; angulos.push({letra:ar.letra, valor:ar.valor}); }
  });
  s += _svgNombreNudo(reg, 0, 0, n.nombre, n.id);
  pend.forEach(p=>{ s += _svgRotuloTrasExtremo(reg, p.ex, p.ey, p.dx, p.dy, p.r, p.col, p.largo); });

  // viewBox de al menos 240 × 210, centrado en lo dibujado.
  const B = reg.limites() || {x0:0, y0:0, x1:0, y1:0}, mx = (B.x0 + B.x1)/2, my = (B.y0 + B.y1)/2;
  const env = _svgEnvolver(s, reg, {x0:mx - 120, y0:my - 105, x1:mx + 120, y1:my + 105}, 6);
  const vb = env.match(/viewBox="([^"]+)"/)[1];
  svg.setAttribute('viewBox', vb);
  svg.innerHTML = env.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const lin = document.getElementById(svgId + '-ang');
  if(lin){
    const t = _svgLineaAngulos(angulos);
    lin.innerHTML = t;
    lin.style.display = t ? '' : 'none';
  }
}
