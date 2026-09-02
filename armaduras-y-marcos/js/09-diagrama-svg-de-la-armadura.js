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
//         color:'natural'|'util', cap:{T,C}, rotas:[ids], w, h}
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
  const W2 = opts.w || 560, H2 = opts.h || 300, M = 46;
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
  let s = '<svg viewBox="0 0 '+W2+' '+H2+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">';
  s += '<rect x="0" y="0" width="'+W2+'" height="'+H2+'" fill="#fff"/>';

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
      col = (f===undefined||f===null) ? '#7c3a06'
          : (esCero(f) ? '#9aa3ad' : (f>0 ? '#1d4ed8' : '#c0392b'));
      if(esCero(f)) gw = 2;
    }
    s += '<line x1="'+ax.toFixed(1)+'" y1="'+ay.toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+by.toFixed(1)
       + '" stroke="'+col+'" stroke-width="'+gw.toFixed(1)+'" stroke-linecap="round"'
       + (rota ? ' stroke-dasharray="7,6" opacity=".55"' : (esCero(f)&&opts.color!=='util' ? ' stroke-dasharray="6,4"' : '')) + '/>';
    if(rota){
      const mx = (ax+bx)/2, my = (ay+by)/2;
      s += '<g transform="translate('+mx.toFixed(1)+','+my.toFixed(1)+')">'
         + '<circle r="10" fill="#fff" stroke="#7f1d1d" stroke-width="2"/>'
         + '<line x1="-5" y1="-5" x2="5" y2="5" stroke="#7f1d1d" stroke-width="2.4"/>'
         + '<line x1="5" y1="-5" x2="-5" y2="5" stroke="#7f1d1d" stroke-width="2.4"/></g>';
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
    }
  });

  // apoyos, cargas y nudos
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    if(n.apoyo === 'fijo'){
      s += '<path d="M'+px+' '+(py+2)+' L'+(px-11)+' '+(py+18)+' L'+(px+11)+' '+(py+18)+' Z" fill="none" stroke="#7c3a06" stroke-width="1.8"/>'
         + '<line x1="'+(px-16)+'" y1="'+(py+18)+'" x2="'+(px+16)+'" y2="'+(py+18)+'" stroke="#7c3a06" stroke-width="1.8"/>';
    } else if(n.apoyo === 'movil'){
      const horizontal = n.apAng === 0;
      const abre = horizontal ? '<g transform="rotate(-90 '+px+' '+py+')">' : '';
      const cierra = horizontal ? '</g>' : '';
      s += abre
         + '<path d="M'+px+' '+(py+2)+' L'+(px-11)+' '+(py+15)+' L'+(px+11)+' '+(py+15)+' Z" fill="none" stroke="#7c3a06" stroke-width="1.8"/>'
         + '<circle cx="'+(px-6)+'" cy="'+(py+19)+'" r="3.4" fill="none" stroke="#7c3a06" stroke-width="1.6"/>'
         + '<circle cx="'+(px+6)+'" cy="'+(py+19)+'" r="3.4" fill="none" stroke="#7c3a06" stroke-width="1.6"/>'
         + '<line x1="'+(px-16)+'" y1="'+(py+23)+'" x2="'+(px+16)+'" y2="'+(py+23)+'" stroke="#7c3a06" stroke-width="1.8"/>'
         + cierra;
    }
    // Las cargas se pueden sustituir para el dibujo (módulo dinámico), así la
    // flecha y su rótulo acompañan al deslizador en vez de quedarse fijos.
    const cg = (opts.cargas && opts.cargas[n.id]) ? opts.cargas[n.id] : {fx:n.fx, fy:n.fy};
    if(!esCero(cg.fx) || !esCero(cg.fy)){
      const mag = Math.hypot(cg.fx, cg.fy);
      const ux = cg.fx/mag, uy = -cg.fy/mag;
      const sx = px-ux*36, sy = py-uy*36;
      s += '<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(px-ux*9).toFixed(1)+'" y2="'+(py-uy*9).toFixed(1)+'" stroke="#c0392b" stroke-width="2.2"/>'
         + '<polygon points="0,0 -9,-4 -9,4" fill="#c0392b" transform="translate('+(px-ux*8).toFixed(1)+','+(py-uy*8).toFixed(1)
         + ') rotate('+(Math.atan2(uy,ux)*180/Math.PI).toFixed(1)+')"/>'
         + '<text x="'+sx.toFixed(1)+'" y="'+(sy-6).toFixed(1)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">'
         + dec(mag,'f')+' '+unitFor+'</text>';
    }
  });
  nodos.forEach(n=>{
    const [px,py] = P(n.x,n.y);
    s += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="5" fill="#7c3a06" stroke="#fff" stroke-width="1.6"/>'
       + '<text x="'+(px+8).toFixed(1)+'" y="'+(py-8).toFixed(1)+'" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="#1b1f24">'+n.nombre+'</text>';
  });
  s += '</svg>';
  return s;
}

function fmtCoef(c){
  if(Math.abs(c-1) < 1e-9) return '';
  if(Math.abs(c+1) < 1e-9) return '-';
  return (Math.round(c*10000)/10000) + '\\,';
}
function fmtNum(v){ return (Math.round(v*10000)/10000).toString(); }

// ── DCL del nudo en SVG ──
// Convenio: se dibujan las fuerzas que actúan SOBRE el nudo.
//  · Tracción  → la barra tira del nudo: flecha hacia AFUERA (hacia la barra).
//  · Compresión→ la barra empuja al nudo: flecha hacia el NUDO.
function dibujarDCL(svgId, n, incognitas){
  const svg = document.getElementById(svgId);
  if(!svg) return;
  incognitas = incognitas || [];
  const cx = 95, cy = 78, R = 50;
  let s = '<rect x="0" y="0" width="190" height="168" fill="#fff"/>';
  const conec = barras.filter(b=>b.a===n.id||b.b===n.id);

  function flecha(x, y, angDeg, col){
    return '<polygon points="0,0 -9,-4 -9,4" fill="'+col+'" transform="translate('
      + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + angDeg.toFixed(1) + ')"/>';
  }

  conec.forEach(b=>{
    const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
    const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
    const ux = dx/L, uy = -dy/L;                 // y invertida en SVG
    const val = resultado ? resultado.fuerzas[b.id] : 0;
    const incog = incognitas.indexOf(b.id) >= 0;
    const cero = esCero(val);
    const col = cero ? '#9aa3ad' : (val>0 ? '#1d4ed8' : '#c0392b');
    const x2 = cx+ux*R, y2 = cy+uy*R;
    // eje de la barra
    s += '<line x1="'+cx+'" y1="'+cy+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col
       + '" stroke-width="2.3"' + (cero||incog ? ' stroke-dasharray="4,3"' : '') + '/>';
    if(!cero){
      const angFuera = Math.atan2(uy, ux)*180/Math.PI;
      if(val > 0){
        // tracción: punta en el extremo, apuntando hacia afuera
        s += flecha(cx+ux*(R-2), cy+uy*(R-2), angFuera, col);
      } else {
        // compresión: punta junto al nudo, apuntando hacia el nudo
        s += flecha(cx+ux*11, cy+uy*11, angFuera+180, col);
      }
    }
    const lx = cx+ux*(R+15), ly = cy+uy*(R+15);
    s += '<text x="'+lx.toFixed(1)+'" y="'+(ly+3).toFixed(1)+'" font-family="Inter,sans-serif" font-size="9.5" font-weight="700" fill="'
       + col + '" text-anchor="middle">' + (incog ? '?' : '') + nombreBarra(b) + '</text>';
  });

  // carga externa
  if(!esCero(n.fx) || !esCero(n.fy)){
    const mag = Math.hypot(n.fx, n.fy);
    const ux = n.fx/mag, uy = -n.fy/mag;
    const sx = cx-ux*44, sy = cy-uy*44;
    s += '<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(cx-ux*11).toFixed(1)+'" y2="'+(cy-uy*11).toFixed(1)+'" stroke="#c0392b" stroke-width="2.6"/>';
    s += flecha(cx-ux*10, cy-uy*10, Math.atan2(uy,ux)*180/Math.PI, '#c0392b');
    s += '<text x="'+sx.toFixed(1)+'" y="'+(sy-5).toFixed(1)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#c0392b" text-anchor="middle">'
       + dec(mag,'f') + '</text>';
  }

  // reacciones
  const R2 = resultado ? resultado.reacciones[n.id] : null;
  if(R2){
    if(R2.ry !== undefined && !esCero(R2.ry)){
      const dir = R2.ry > 0 ? 1 : -1;   // hacia arriba si es positiva
      s += '<line x1="'+cx+'" y1="'+(cy+dir*44)+'" x2="'+cx+'" y2="'+(cy+dir*12)+'" stroke="#15803d" stroke-width="2.6"/>';
      s += flecha(cx, cy+dir*11, dir>0 ? -90 : 90, '#15803d');
      s += '<text x="'+(cx+15)+'" y="'+(cy+dir*38)+'" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="#15803d">R'
         + n.nombre + '</text>';
    }
    if(R2.rx !== undefined && !esCero(R2.rx)){
      const dir = R2.rx > 0 ? 1 : -1;
      s += '<line x1="'+(cx-dir*44)+'" y1="'+cy+'" x2="'+(cx-dir*12)+'" y2="'+cy+'" stroke="#15803d" stroke-width="2.6"/>';
      s += flecha(cx-dir*11, cy, dir>0 ? 0 : 180, '#15803d');
    }
  }

  s += '<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="#7c3a06"/>';
  s += '<text x="'+(cx+11)+'" y="'+(cy-9)+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="#1b1f24">'+n.nombre+'</text>';

  // pie: incógnitas de este nudo
  s += '<line x1="8" y1="140" x2="182" y2="140" stroke="#e7d3ba" stroke-width="1"/>';
  let pie;
  if(incognitas.length){
    const nombres = incognitas.map(id=>{
      const b = barras.find(z=>z.id===id); return b ? nombreBarra(b) : '?';
    });
    pie = 'Incógnitas: ' + nombres.join(', ');
  } else {
    pie = 'Sin incógnitas: comprobación';
  }
  s += '<text x="95" y="154" font-family="Inter,sans-serif" font-size="8.8" font-weight="700" fill="#68727f" text-anchor="middle">'
     + pie + '</text>';
  s += '<text x="95" y="164" font-family="Inter,sans-serif" font-size="7.6" fill="#9aa3ad" text-anchor="middle">'
     + '→ afuera = tracción · → al nudo = compresión</text>';
  svg.innerHTML = s;
}
