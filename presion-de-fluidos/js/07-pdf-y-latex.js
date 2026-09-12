// ═══════════════════════════════════════════════════════════
//  PDF
// ═══════════════════════════════════════════════════════════
function recortarLienzo(c){
  if(!c) return null;
  try{
    const w = c.width, h = c.height;
    const dd = c.getContext('2d').getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4; if(dd[i+3]<8) continue;
      const r2=dd[i],g2=dd[i+1],b2=dd[i+2];
      const mx=Math.max(r2,g2,b2), mn=Math.min(r2,g2,b2);
      if((mx-mn)<=18 && mn>=190) continue;
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    }
    if(x1<0) return c.toDataURL('image/png');
    const m=Math.round(Math.min(w,h)*0.02)+6;
    x0=Math.max(0,x0-m); y0=Math.max(0,y0-m); x1=Math.min(w-1,x1+m); y1=Math.min(h-1,y1+m);
    const cw=x1-x0+1, ch=y1-y0+1;
    const t=document.createElement('canvas'); t.width=cw; t.height=ch;
    const tc=t.getContext('2d'); tc.fillStyle='#fff'; tc.fillRect(0,0,cw,ch);
    tc.drawImage(c,x0,y0,cw,ch,0,0,cw,ch);
    return t.toDataURL('image/png');
  }catch(e){ return c.toDataURL('image/png'); }
}

// ═══════════════════════════════════════════════════════════
//  INFORME EN LATEX (texlive.net)
//  Sigue las reglas R1–R22 de fuerzas-internas/LEEME.md: cada concepto una
//  sola vez, los números en tabla y los desarrollos en texto, cada reacción
//  con su nombre completo y su sentido real, brazos acotados desde el punto
//  de momentos, ecuaciones numeradas y citadas, pies de figura breves.
//  Parte de los mismos datos que renderResultados (R) y se autocomprueba.
// ═══════════════════════════════════════════════════════════
function escLatex(s){
  return String(s).replace(/([%&_#{}$])/g, '\\$1');
}
// Unidad de presión en texto plano (fuerza/longitud²), apta para \text{}.
function uPresLatex(){ return escLatex(unitFor) + '/' + escLatex(unitLen) + '$^2$'; }

let _yaDichoPres = {};
function _primeraVezPres(clave){
  if(_yaDichoPres[clave]) return false;
  _yaDichoPres[clave] = true;
  return true;
}

// ── Rótulos que no se pisan en TikZ ──
// Cada texto reserva una caja (en cm); el siguiente que chocaría se corre en
// la dirección pedida hasta encontrar hueco, y si se aleja lleva una guía.
let _tkpCajas = [];
function tkpReiniciar(){ _tkpCajas = []; }
function tkpOcupar(x0,y0,x1,y1){ _tkpCajas.push({x0:Math.min(x0,x1), y0:Math.min(y0,y1), x1:Math.max(x0,x1), y1:Math.max(y0,y1)}); }
// Caja de un símbolo girado: el rectángulo local (x0,y0)-(x1,y1) después de
// girarlo `grados` (antihorario) alrededor de (cx,cy).
function tkpOcuparGirado(cx,cy,grados,x0,y0,x1,y1){
  const a = grados*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].forEach(p=>{
    const X = cx + p[0]*c - p[1]*s, Y = cy + p[0]*s + p[1]*c;
    mnx = Math.min(mnx,X); mxx = Math.max(mxx,X);
    mny = Math.min(mny,Y); mxy = Math.max(mxy,Y);
  });
  tkpOcupar(mnx, mny, mxx, mxy);
}
function tkpChoca(c){ return _tkpCajas.some(q=>c.x0 < q.x1 && c.x1 > q.x0 && c.y0 < q.y1 && c.y1 > q.y0); }
function tkpOcuparTrazo(x1,y1,x2,y2,w){
  const g = w || 0.08, n = 6;
  for(let m=0;m<n;m++){
    const f0=m/n, f1=(m+1)/n;
    tkpOcupar(x1+(x2-x1)*f0-g, y1+(y2-y1)*f0-g, x1+(x2-x1)*f1+g, y1+(y2-y1)*f1+g);
  }
}
function tkpAncho(txt, opts){
  const w = /tiny/.test(opts||'') ? 0.115 : (/scriptsize/.test(opts||'') ? 0.135 : 0.16);
  const limpio = String(txt).replace(/\\[a-zA-Z]+/g, 'x').replace(/[$\\{}^_,]/g, '');
  return Math.max(1, limpio.length)*w + 0.12;
}
function tkpAlto(opts){ return /tiny/.test(opts||'') ? 0.24 : 0.30; }
function tkpTexto(x, y, txt, opts, dirX, dirY){
  const w = tkpAncho(txt, opts), h = tkpAlto(opts);
  const dx0 = (dirX === undefined) ? 0 : dirX, dy0 = (dirY === undefined) ? 1 : dirY;
  const nn = Math.hypot(dx0, dy0) || 1;
  const ex = dx0/nn, ey = dy0/nn, lx = -ey, ly = ex;
  const paso = h + 0.06;
  const F = v => v.toFixed(3);
  for(let k=0;k<12;k++){
    for(const lado of (k===0 ? [0] : [0,-1,1,-2,2])){
      const ox = ex*paso*k + lx*lado*w*0.55, oy = ey*paso*k + ly*lado*w*0.55;
      const c = {x0:x+ox-w/2, y0:y+oy-h/2, x1:x+ox+w/2, y1:y+oy+h/2};
      if(!tkpChoca(c) || k === 11){
        _tkpCajas.push(c);
        let s = '';
        const d = Math.hypot(ox, oy);
        if(d > 0.55){
          const fx = x + ox - (ox/d)*(w*0.32), fy = y + oy - (oy/d)*(h*0.55);
          s += '\\draw[gray!55, line width=.25pt] (' + F(x) + ',' + F(y) + ') -- (' + F(fx) + ',' + F(fy) + ');\n';
        }
        s += '\\node[' + (opts || 'font=\\scriptsize') + ', inner sep=1pt] at (' + F(x+ox) + ',' + F(y+oy) + ') {' + txt + '};\n';
        return s;
      }
    }
  }
  return '';
}
function tkpTextoFijo(x, y, txt, opts){
  const w = tkpAncho(txt, opts), h = tkpAlto(opts);
  tkpOcupar(x-w/2, y-h/2, x+w/2, y+h/2);
  return '\\node[' + (opts || 'font=\\scriptsize') + ', fill=white, inner sep=1pt] at (' + x.toFixed(3) + ',' + y.toFixed(3) + ') {' + txt + '};\n';
}

// ── Letras griegas para los ángulos: dos ángulos iguales comparten letra ──
const _LETRAS = ['\\theta', '\\varphi', '\\alpha', '\\beta', '\\psi', '\\omega', '\\lambda', '\\mu'];
let _LETRAS_ANG = {};
function asignarLetrasAngulos(r){
  _LETRAS_ANG = {};
  const vals = [];
  const mete = d => {
    if(Math.abs(Math.abs(d.x)-1) < 1e-9 || Math.abs(d.x) < 1e-9) return;
    const a = Math.acos(Math.min(1, Math.abs(d.x)))*180/Math.PI;
    const clave = a.toFixed(2);
    if(vals.indexOf(clave) < 0) vals.push(clave);
  };
  r.cargas.forEach(c=>mete(c.dir));
  r.inc.forEach(u=>mete(u.dir));
  vals.forEach((clave,i)=>{ _LETRAS_ANG[clave] = _LETRAS[i % _LETRAS.length] + (i >= _LETRAS.length ? "'" : ''); });
  return _LETRAS_ANG;
}
function letraAngulo(d){
  const a = Math.acos(Math.min(1, Math.abs(d.x)))*180/Math.PI;
  return _LETRAS_ANG[a.toFixed(2)] || '\\theta';
}
function valorAngulo(d){ return Math.acos(Math.min(1, Math.abs(d.x)))*180/Math.PI; }

// ── Marco de referencia x, y en una esquina ──
function tkpMarcoXY(x, y){
  const F = v => v.toFixed(3);
  return '\\draw[->, >=stealth, bsaMuted, line width=0.7pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x+0.7) + ',' + F(y) + ') node[right, font=\\scriptsize, inner sep=1pt] {$x$};\n'
       + '\\draw[->, >=stealth, bsaMuted, line width=0.7pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x) + ',' + F(y+0.7) + ') node[above, font=\\scriptsize, inner sep=1pt] {$y$};\n'
       + '\\fill[bsaMuted] (' + F(x) + ',' + F(y) + ') circle (0.8pt);\n';
}

// ── Escala común de las láminas: caja de la compuerta y los niveles ──
function _cajaModelo(extra){
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  const mete = (x,y)=>{ minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); };
  nodos.forEach(n=>mete(n.x,n.y));
  tramos.forEach(t=>puntosTramo(t, 24).forEach(p=>mete(p.x,p.y)));
  [1,2].forEach(z=>{ const nv = nivelZona(z); if(isFinite(nv)) mete(minx, nv); });
  (extra||[]).forEach(p=>mete(p.x,p.y));
  const spanX = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 1e-6);
  const k = Math.min(9.5/spanX, 6.5/spanY, 2.4);
  return {minx, maxx, miny, maxy, k, X: x => (x-minx)*k, Y: y => (y-miny)*k};
}

// ── Símbolos de apoyo y tope ──
function tkpApoyo(n, X, Y, k){
  const F = v => v.toFixed(3);
  const x = X(n.x), y = Y(n.y);
  let out = '';
  if(n.apoyo === 'fijo'){
    // Mismo giro que en el lienzo, y por el mismo motivo: es presentación y no
    // interviene en el cálculo. Con 90° queda el triángulo debajo del nudo.
    const gf = anguloDibujoApoyoFijo(n) - 90;
    out += '\\begin{scope}[shift={(' + F(x) + ',' + F(y) + ')}, rotate=' + gf.toFixed(2) + ']\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (0,0) -- (-0.260,-0.420) -- (0.260,-0.420) -- cycle;\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (-0.400,-0.420) -- (0.400,-0.420);\n';
    for(let i=-3;i<=3;i++) out += '\\draw[bsaAcc2, line width=.5pt] (' + F(i*0.12) + ',-0.420) -- (' + F(i*0.12-0.1) + ',-0.560);\n';
    out += '\\end{scope}\n';
    tkpOcuparGirado(x, y, gf, -0.45, -0.6, 0.45, 0);
  } else if(n.apoyo === 'movil'){
    const d = direccionIncognita({n, tipo:'R'});
    const ang = Math.atan2(d.y, d.x)*180/Math.PI - 90;
    out += '\\begin{scope}[shift={(' + F(x) + ',' + F(y) + ')}, rotate=' + ang.toFixed(2) + ']\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (0,0) -- (-0.24,-0.36) -- (0.24,-0.36) -- cycle;\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (-0.12,-0.44) circle (0.07); \\draw[line width=1pt, color=bsaAcc2] (0.12,-0.44) circle (0.07);\n';
    out += '\\draw[line width=1pt, color=bsaAcc2] (-0.40,-0.52) -- (0.40,-0.52);\n';
    out += '\\end{scope}\n';
    tkpOcupar(x-0.45, y-0.6, x+0.45, y+0.1);
  }
  if(n.tope){
    const d = direccionIncognita({n, tipo:'T'});
    const ang = Math.atan2(d.y, d.x)*180/Math.PI;
    out += '\\begin{scope}[shift={(' + F(x) + ',' + F(y) + ')}, rotate=' + ang.toFixed(2) + ']\n';
    out += '\\filldraw[fill=bsaTope!15, draw=bsaTope, line width=.9pt] (-0.62,-0.22) rectangle (-0.16,0.22);\n';
    for(let i=-2;i<=2;i++) out += '\\draw[bsaTope, line width=.5pt] (-0.62,' + F(i*0.09) + ') -- (-0.76,' + F(i*0.09-0.12) + ');\n';
    out += '\\end{scope}\n';
    tkpOcupar(x - d.x*0.5 - 0.3, y + d.y*0.5 - 0.3, x - d.x*0.5 + 0.3, y + d.y*0.5 + 0.3);
  }
  return out;
}

// ── Lámina general: compuerta, zonas de líquido recortadas por la frontera,
//    superficies libres rotuladas, γ de cada capa, nudos, apoyos y topes ──
function tkpCompuerta(opts){
  opts = opts || {};
  if(!nodos.length) return '';
  tkpReiniciar();
  const caja = _cajaModelo();
  const {X, Y, k, minx, maxx, miny, maxy} = caja;
  const F = v => v.toFixed(3);
  let out = '';
  const cad = cadenaCompuerta();
  const bx0 = X(minx) - 1.3, bx1 = X(maxx) + 1.3;
  const by0 = Y(miny) - 0.7, by1 = Y(maxy) + 0.6;
  // zonas de líquido, recortadas a su lado de la frontera
  [1,2].forEach(z=>{
    const capas = capasOrdenadas(z);
    if(!capas.length) return;
    out += '\\begin{scope}\n';
    if(cad){
      const P = cad.pts;
      let camino = '(' + F(X(P[0].x)) + ',' + F(by1) + ')';
      P.forEach(p=>{ camino += ' -- (' + F(X(p.x)) + ',' + F(Y(p.y)) + ')'; });
      const ult = P[P.length-1];
      camino += ' -- (' + F(X(ult.x)) + ',' + F(by0) + ')';
      const lado = (z===1) ? bx0 : bx1;
      camino += ' -- (' + F(lado) + ',' + F(by0) + ') -- (' + F(lado) + ',' + F(by1) + ') -- cycle';
      out += '\\clip ' + camino + ';\n';
    } else {
      const lado = (z===1) ? bx0 : bx1, mid = (bx0+bx1)/2;
      out += '\\clip (' + F(mid) + ',' + F(by0) + ') rectangle (' + F(lado) + ',' + F(by1) + ');\n';
    }
    capas.forEach((c,i)=>{
      const abajo = (i+1<capas.length) ? capas[i+1].niv : (miny - 2);
      const yTop = Y(Math.min(c.niv, maxy + 0.4)), yBot = Math.max(by0, Y(abajo));
      const tono = 12 + 8*i;
      out += '\\fill[bsaAgua!' + tono + '] (' + F(bx0) + ',' + F(yBot) + ') rectangle (' + F(bx1) + ',' + F(yTop) + ');\n';
      out += '\\draw[bsaAgua, line width=' + (i===0 ? '1pt' : '.6pt') + (i===0 ? '' : ', dashed') + '] (' + F(bx0) + ',' + F(yTop) + ') -- (' + F(bx1) + ',' + F(yTop) + ');\n';
    });
    out += '\\end{scope}\n';
    // rótulos de la superficie libre y de las capas, en el borde exterior
    const xEtq = (z===1) ? bx0 + 0.06 : bx1 - 0.06;
    const anc = (z===1) ? 'above right' : 'above left';
    capas.forEach((c,i)=>{
      const yTop = Y(Math.min(c.niv, maxy + 0.4));
      const txt = (i===0 ? 'Zona ' + z + ' \\textperiodcentered\\ nivel $' + dec(c.niv,'len') + '$\\,' + escLatex(unitLen) + ' \\textperiodcentered\\ ' : '')
                + '$\\gamma = ' + dec(c.g,'f') + '$\\,' + escLatex(unitFor) + '/' + escLatex(unitLen) + '$^3$';
      out += '\\node[' + anc + ', font=\\tiny, color=bsaAgua!80!black, inner sep=1.5pt] at (' + F(xEtq) + ',' + F(yTop) + ') {' + txt + '};\n';
      const w = tkpAncho(txt.replace(/\\textperiodcentered/g,'.'), 'tiny');
      tkpOcupar(z===1 ? xEtq : xEtq - w, yTop, z===1 ? xEtq + w : xEtq, yTop + 0.28);
    });
  });
  // frontera vertical punteada (subida sobre el primer nudo y bajada desde el último)
  if(cad && (capasOrdenadas(1).length || capasOrdenadas(2).length)){
    const P0 = cad.pts[0], P1 = cad.pts[cad.pts.length-1];
    out += '\\draw[bsaMuted, dashed, line width=.5pt] (' + F(X(P0.x)) + ',' + F(Y(P0.y)) + ') -- (' + F(X(P0.x)) + ',' + F(by1) + ');\n';
    out += '\\draw[bsaMuted, dashed, line width=.5pt] (' + F(X(P1.x)) + ',' + F(Y(P1.y)) + ') -- (' + F(X(P1.x)) + ',' + F(by0) + ');\n';
  }
  // tramos
  tramos.forEach(t=>{
    const pts = puntosTramo(t, 40);
    if(pts.length < 2) return;
    const seq = pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ');
    const estilo = (t.activo === false) ? 'bsaMuted, dashed, line width=1pt' : 'bsaAcc2, line width=1.8pt';
    out += '\\draw[' + estilo + '] ' + seq + ';\n';
    pts.forEach((p,i)=>{ if(i%4===0) tkpOcupar(X(p.x)-0.06, Y(p.y)-0.06, X(p.x)+0.06, Y(p.y)+0.06); });
  });
  // apoyos y topes
  nodos.forEach(n=>{ out += tkpApoyo(n, X, Y, k); });
  // nudos y nombres
  nodos.forEach(n=>{
    const x = X(n.x), y = Y(n.y);
    if(n.rotula) out += '\\filldraw[fill=white, draw=bsaPres, line width=.9pt] (' + F(x) + ',' + F(y) + ') circle (0.09);\n';
    else out += '\\filldraw[color=bsaAcc2] (' + F(x) + ',' + F(y) + ') circle (0.05);\n';
    out += tkpTexto(x + 0.22, y + 0.22, '\\textbf{' + escLatex(n.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, 1);
  });
  // cotas de profundidad: de la superficie de cada zona al punto mojado más hondo
  if(opts.cotas !== false){
    [1,2].forEach(z=>{
      const niv = nivelZona(z);
      if(!isFinite(niv)) return;
      const mojados = nodos.filter(n=>n.y < niv - 1e-9);
      if(!mojados.length) return;
      const xc = (z===1) ? bx0 + 0.55 : bx1 - 0.55;
      const hondo = mojados.reduce((m,n)=>n.y < m.y ? n : m, mojados[0]);
      const alto = mojados.reduce((m,n)=>n.y > m.y ? n : m, mojados[0]);
      const puntos = [hondo];
      if(alto !== hondo) puntos.push(alto);
      puntos.forEach((n,i)=>{
        const xq = xc + (z===1 ? 1 : -1)*0.45*i;
        out += '\\draw[bsaMuted, line width=.5pt] (' + F(xq) + ',' + F(Y(niv)) + ') -- (' + F(xq) + ',' + F(Y(n.y)) + ');\n';
        out += '\\draw[bsaMuted, line width=.5pt] (' + F(xq-0.07) + ',' + F(Y(niv)-0.07) + ') -- (' + F(xq+0.07) + ',' + F(Y(niv)+0.07) + ');\n';
        out += '\\draw[bsaMuted, line width=.5pt] (' + F(xq-0.07) + ',' + F(Y(n.y)-0.07) + ') -- (' + F(xq+0.07) + ',' + F(Y(n.y)+0.07) + ');\n';
        out += '\\draw[bsaMuted, dashed, line width=.4pt] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') -- (' + F(xq) + ',' + F(Y(n.y)) + ');\n';
        out += tkpTexto(xq + (z===1 ? -0.1 : 0.1), (Y(niv)+Y(n.y))/2, '$' + dec(niv - n.y,'len') + '$', 'font=\\tiny, rotate=90', z===1 ? -1 : 1, 0);
      });
    });
  }
  return out;
}

// ── Croquis de una fuerza: parte mojada del tramo, diagrama del lado del
//    líquido, F_k en P y la cota z_P desde la superficie libre ──
function tkpCroquisCarga(c, d){
  tkpReiniciar();
  const F = v => v.toFixed(3);
  const pts = (d.tipo === 'curvo') ? d.pts : [d.T, d.D];
  const niv = c.niv;
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y).concat([niv]);
  const span = Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys), 1e-6);
  const dia = 0.42*span;
  const pMax = Math.max(1e-12, ...pts.map(p=>presionZona(c.z, p.y)));
  const ptsT = puntosTramo(c.t, 48);
  const desp = pts.map((p,i)=>{
    const idx = Math.max(0, Math.min(ptsT.length-2, Math.round(i/(pts.length-1)*(ptsT.length-1))));
    const nv = normalHaciaZona(c.t, idx, ptsT, c.z);
    const h = presionZona(c.z, p.y)/pMax*dia;
    return {x:p.x + nv.x*h, y:p.y + nv.y*h};
  });
  const todos = pts.concat(desp).concat([{x:Math.min(...xs), y:niv}, {x:Math.max(...xs), y:niv}]);
  if(d.tipo === 'curvo') todos.push({x:d.arc.cx, y:d.arc.cy});
  const x0 = Math.min(...todos.map(p=>p.x)), x1 = Math.max(...todos.map(p=>p.x));
  const y0 = Math.min(...todos.map(p=>p.y)), y1 = Math.max(...todos.map(p=>p.y));
  const k = Math.min(6.4/Math.max(x1-x0,1e-6), 5.2/Math.max(y1-y0,1e-6), 3);
  const X = x => (x-x0)*k + 1.0, Y = y => (y-y0)*k + 0.4;
  let out = '';
  const xl = X(x0) - 0.9, xr = X(x1) + 0.9;
  // superficie libre
  out += '\\draw[bsaAgua, line width=1pt] (' + F(xl) + ',' + F(Y(niv)) + ') -- (' + F(xr) + ',' + F(Y(niv)) + ');\n';
  out += '\\node[' + (c.z===1 ? 'above right' : 'above left') + ', font=\\tiny, color=bsaAgua!80!black, inner sep=1.5pt] at (' + F(c.z===1 ? xl : xr) + ',' + F(Y(niv)) + ') {superficie libre \\textperiodcentered\\ zona ' + c.z + '};\n';
  tkpOcupar(xl, Y(niv), xr, Y(niv)+0.3);
  if(d.tipo === 'curvo'){
    // bloque de líquido entre el arco y la superficie
    let cam = pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ');
    const D0 = pts[pts.length-1], T0 = pts[0];
    cam += ' -- (' + F(X(D0.x)) + ',' + F(Y(niv)) + ') -- (' + F(X(T0.x)) + ',' + F(Y(niv)) + ') -- cycle';
    out += '\\fill[bsaAgua!22] ' + cam + ';\n';
    out += '\\draw[bsaAgua!60!black, dashed, line width=.5pt] ' + cam + ';\n';
    out += tkpTexto(X(d.xFv), (Y(niv) + Y((T0.y+D0.y)/2))/2, '$W_{\\text{bloque}}$', 'font=\\tiny, color=bsaAgua!70!black', 0, 0);
  }
  // diagrama de presión
  const poly = pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').concat(desp.slice().reverse().map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')')).join(' -- ');
  out += '\\draw[bsaPres, line width=.8pt, fill=bsaPres!12] ' + poly + ' -- cycle;\n';
  const nfl = Math.min(6, pts.length-1);
  for(let i=1;i<=nfl;i++){
    const q = Math.round(i/(nfl+1)*(pts.length-1));
    const a = desp[q], b = pts[q];
    if(Math.hypot(X(a.x)-X(b.x), Y(a.y)-Y(b.y)) < 0.3) continue;
    out += '\\draw[-{Latex[length=1.4mm]}, bsaPres, line width=.5pt] (' + F(X(a.x)) + ',' + F(Y(a.y)) + ') -- (' + F(X(b.x)) + ',' + F(Y(b.y)) + ');\n';
  }
  desp.forEach((p,i)=>{ if(i%3===0) tkpOcupar(X(p.x)-0.08, Y(p.y)-0.08, X(p.x)+0.08, Y(p.y)+0.08); });
  // valores de p en los extremos
  const pT = presionZona(c.z, pts[0].y), pD = presionZona(c.z, pts[pts.length-1].y);
  const nT = desp[0], nD = desp[desp.length-1];
  if(pT > 1e-9) out += tkpTexto(X(nT.x), Y(nT.y), '$' + dec(pT,'f') + '$', 'font=\\tiny, color=bsaPres', nT.x - pts[0].x, nT.y - pts[0].y);
  if(pD > 1e-9) out += tkpTexto(X(nD.x), Y(nD.y), '$' + dec(pD,'f') + '$', 'font=\\tiny, color=bsaPres', nD.x - pts[pts.length-1].x, nD.y - pts[pts.length-1].y);
  // tramo
  out += '\\draw[bsaAcc2, line width=1.8pt] ' + pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ') + ';\n';
  pts.forEach((p,i)=>{ if(i%3===0) tkpOcupar(X(p.x)-0.06, Y(p.y)-0.06, X(p.x)+0.06, Y(p.y)+0.06); });
  if(d.T && d.T.nombre) out += tkpTexto(X(d.T.x) + 0.2, Y(d.T.y) + 0.2, '\\textbf{' + escLatex(d.T.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, 1);
  if(d.D && d.D.nombre) out += tkpTexto(X(d.D.x) + 0.2, Y(d.D.y) - 0.2, '\\textbf{' + escLatex(d.D.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, -1);
  if(d.tipo === 'recto' && d.bandas.length === 1 && d.bandas[0].Fr > 1e-9 && d.bandas[0].Ft > 1e-9){
    // separación rectángulo / triángulo: línea a la altura de p_min
    const bd = d.bandas[0];
    const hmin = Math.min(bd.p0, bd.p1)/pMax*dia;
    const idx0 = 0, idx1 = ptsT.length-2;
    const n0 = normalHaciaZona(c.t, idx0, ptsT, c.z);
    out += '\\draw[bsaPres, dashed, line width=.4pt] (' + F(X(pts[0].x + n0.x*hmin)) + ',' + F(Y(pts[0].y + n0.y*hmin)) + ') -- (' + F(X(pts[1].x + n0.x*hmin)) + ',' + F(Y(pts[1].y + n0.y*hmin)) + ');\n';
  }
  // componentes en placa curva
  if(d.tipo === 'curvo'){
    const yh = Y(d.yFh), xh = X(d.Fh >= 0 ? Math.min(...xs) : Math.max(...xs));
    const sh = d.Fh >= 0 ? 1 : -1;
    out += '\\draw[-{Latex[length=2mm]}, bsaAcc, line width=1pt] (' + F(xh - sh*1.4) + ',' + F(yh) + ') -- (' + F(xh - sh*0.1) + ',' + F(yh) + ');\n';
    out += tkpTexto(xh - sh*1.5, yh, '$F_h$', 'font=\\scriptsize, color=bsaAcc', -sh, 0);
    const xv = X(d.xFv), yv = Y(d.Fv >= 0 ? Math.min(...ys) : niv);
    const sv = d.Fv >= 0 ? 1 : -1;
    out += '\\draw[-{Latex[length=2mm]}, bsaAcc, line width=1pt] (' + F(xv) + ',' + F(yv - sv*1.4) + ') -- (' + F(xv) + ',' + F(yv - sv*0.1) + ');\n';
    out += tkpTexto(xv, yv - sv*1.55, '$F_v$', 'font=\\scriptsize, color=bsaAcc', 0, -sv);
    // centro del arco y línea de acción
    out += '\\filldraw[bsaMuted] (' + F(X(d.arc.cx)) + ',' + F(Y(d.arc.cy)) + ') circle (0.04);\n';
    out += tkpTexto(X(d.arc.cx) + 0.2, Y(d.arc.cy) - 0.2, '$O_c$', 'font=\\tiny, color=bsaMuted', 1, -1);
    out += '\\draw[bsaMuted, dashed, line width=.4pt] (' + F(X(d.arc.cx)) + ',' + F(Y(d.arc.cy)) + ') -- (' + F(X(c.P.x)) + ',' + F(Y(c.P.y)) + ');\n';
  }
  // resultante en P
  const Px = X(c.P.x), Py = Y(c.P.y), Lf = 1.5;
  out += '\\draw[-{Latex[length=2.2mm]}, bsaPres!80!black, line width=1.3pt] (' + F(Px - c.dir.x*Lf) + ',' + F(Py - c.dir.y*Lf) + ') -- (' + F(Px - c.dir.x*0.08) + ',' + F(Py - c.dir.y*0.08) + ');\n';
  tkpOcuparTrazo(Px - c.dir.x*Lf, Py - c.dir.y*Lf, Px, Py, 0.08);
  out += '\\filldraw[bsaPres!80!black] (' + F(Px) + ',' + F(Py) + ') circle (0.05);\n';
  out += tkpTexto(Px - c.dir.x*(Lf+0.35), Py - c.dir.y*(Lf+0.35), '$' + c.nombre + '$', 'font=\\scriptsize, color=bsaPres!80!black', -c.dir.x, -c.dir.y);
  out += tkpTexto(Px + 0.22*(c.dir.y >= 0 ? 1 : 1), Py - 0.22, '$P$', 'font=\\scriptsize\\itshape, color=bsaPres!80!black', 1, -1);
  // cota z_P
  const lado = (c.z === 1) ? -1 : 1;
  const xc = (lado < 0) ? xl + 0.35 : xr - 0.35;
  out += '\\draw[line width=.5pt] (' + F(xc) + ',' + F(Y(niv)) + ') -- (' + F(xc) + ',' + F(Py) + ');\n';
  out += '\\draw[line width=.5pt] (' + F(xc-0.07) + ',' + F(Y(niv)-0.07) + ') -- (' + F(xc+0.07) + ',' + F(Y(niv)+0.07) + ');\n';
  out += '\\draw[line width=.5pt] (' + F(xc-0.07) + ',' + F(Py-0.07) + ') -- (' + F(xc+0.07) + ',' + F(Py+0.07) + ');\n';
  out += '\\draw[dashed, line width=.4pt] (' + F(Px) + ',' + F(Py) + ') -- (' + F(xc) + ',' + F(Py) + ');\n';
  out += tkpTexto(xc - lado*0.16, (Y(niv)+Py)/2, '$z_P = ' + dec(c.zP,'len') + '$', 'font=\\tiny, rotate=90', -lado, 0);
  return out;
}

// ── DCL de la compuerta: cada F_k en su centro de presión, reacciones con
//    su nombre llegando al nudo en su sentido real, marco x,y en la esquina.
//    `sel` recorta al lado de una rótula: {tramos, nodos, rotula} ──
function tkpDCL(r, sel){
  tkpReiniciar();
  const caja = _cajaModelo();
  const {X, Y, k, minx, maxx, miny, maxy} = caja;
  const F = v => v.toFixed(3);
  let out = '';
  const trVis = sel ? tramos.filter(t=>sel.tramos.indexOf(t.id) >= 0) : tramos;
  const ndIds = new Set(); trVis.forEach(t=>{ ndIds.add(t.a); ndIds.add(t.b); });
  const ndVis = nodos.filter(n=>ndIds.has(n.id));
  // compuerta
  trVis.forEach(t=>{
    const pts = puntosTramo(t, 40);
    if(pts.length < 2) return;
    out += '\\draw[bsaAcc2, line width=1.8pt] ' + pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ') + ';\n';
    pts.forEach((p,i)=>{ if(i%4===0) tkpOcupar(X(p.x)-0.06, Y(p.y)-0.06, X(p.x)+0.06, Y(p.y)+0.06); });
  });
  ndVis.forEach(n=>{
    const x = X(n.x), y = Y(n.y);
    if(n.rotula) out += '\\filldraw[fill=white, draw=bsaPres, line width=.9pt] (' + F(x) + ',' + F(y) + ') circle (0.09);\n';
    else out += '\\filldraw[color=bsaAcc2] (' + F(x) + ',' + F(y) + ') circle (0.05);\n';
    out += tkpTexto(x + 0.22, y + 0.22, '\\textbf{' + escLatex(n.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, 1);
  });
  const ocupados = [];
  // fuerzas del líquido, llegando a P desde el lado del líquido
  const cargasVis = sel ? r.cargas.filter(c=>sel.tramos.indexOf(c.t.id) >= 0) : r.cargas;
  cargasVis.forEach(c=>{
    const Px = X(c.P.x), Py = Y(c.P.y), Lf = 1.35;
    const x1 = Px - c.dir.x*Lf, y1 = Py - c.dir.y*Lf;
    out += '\\draw[-{Latex[length=2.2mm]}, bsaPres, line width=1.2pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(Px - c.dir.x*0.06) + ',' + F(Py - c.dir.y*0.06) + ');\n';
    tkpOcuparTrazo(x1, y1, Px, Py, 0.08);
    out += '\\filldraw[bsaPres] (' + F(Px) + ',' + F(Py) + ') circle (0.045);\n';
    out += tkpTexto(x1 - c.dir.x*0.32, y1 - c.dir.y*0.32, '$' + c.nombre + '$', 'font=\\scriptsize, color=bsaPres', -c.dir.x, -c.dir.y);
    ocupados.push([x1, y1]);
    // ángulo con la horizontal, si la fuerza es inclinada (R17): arco en la cola
    if(Math.abs(c.dir.x) > 1e-9 && Math.abs(Math.abs(c.dir.x)-1) > 1e-9){
      const sx = c.dir.x >= 0 ? 1 : -1, sy = c.dir.y >= 0 ? 1 : -1;
      const a0 = sx > 0 ? 0 : 180, a1 = Math.atan2(c.dir.y, c.dir.x)*180/Math.PI;
      out += '\\draw[bsaMuted, dashed, line width=.4pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x1 + sx*0.8) + ',' + F(y1) + ');\n';
      const am = (a0 + a1)/2*Math.PI/180;
      out += '\\draw[bsaMuted, line width=.5pt] (' + F(x1 + sx*0.45) + ',' + F(y1) + ') arc (' + F(a0) + ':' + F(a1) + ':0.45);\n';
      out += tkpTexto(x1 + 0.68*Math.cos(am), y1 + 0.68*Math.sin(am), '$' + letraAngulo(c.dir) + '$', 'font=\\scriptsize, color=bsaMuted', Math.cos(am), Math.sin(am));
    }
  });
  // reacciones e incógnitas: llegan al nudo en su sentido real, solo el nombre
  const incVis = sel ? r.inc.filter(u=>sel.nodos.indexOf(u.n.id) >= 0) : r.inc;
  incVis.forEach((u)=>{
    const j = r.inc.indexOf(u);
    const v = r.val[j];
    const d = sentidoRealIncognita(u, v);
    let x = X(u.n.x), y = Y(u.n.y);
    const L = 1.15;
    const col = u.tipo === 'T' ? 'bsaTope' : 'bsaReac';
    // Una reacción paralela a la compuerta en ese nudo (R_yA en una placa
    // vertical) caería SOBRE la placa: se aparta un poco hacia un lado y
    // lleva un halo blanco, como las cargas paralelas de fuerzas internas.
    const nv = normalCompuertaEnNudo(u.n, 2);
    const paralela = nv && Math.abs(d.x*nv.x + d.y*nv.y) < 0.3;
    if(paralela){ x += nv.x*0.26; y += nv.y*0.26; }
    const x1 = x - d.x*L, y1 = y - d.y*L;
    const nulo = Math.abs(v) < 1e-9*Math.max(1, r.residuo.ref);
    if(paralela) out += '\\draw[white, line width=3pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x - d.x*0.12) + ',' + F(y - d.y*0.12) + ');\n';
    out += '\\draw[-{Latex[length=2.2mm]}, ' + col + ', line width=1.1pt' + (nulo ? ', dashed' : '') + '] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x - d.x*0.12) + ',' + F(y - d.y*0.12) + ');\n';
    tkpOcuparTrazo(x1, y1, x, y, 0.08);
    out += tkpTexto(x1 - d.x*0.3, y1 - d.y*0.3, '$' + simbIncognita(u) + '$', 'font=\\scriptsize, color=' + col, -d.x, -d.y);
    ocupados.push([x1, y1]);
    if(u.tipo !== 'Rx' && u.tipo !== 'Ry' && Math.abs(Math.abs(d.x)-1) > 1e-9 && Math.abs(d.x) > 1e-9){
      const sx = d.x >= 0 ? 1 : -1;
      const a0 = sx > 0 ? 0 : 180, a1 = Math.atan2(d.y, d.x)*180/Math.PI;
      out += '\\draw[bsaMuted, dashed, line width=.4pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x1 + sx*0.8) + ',' + F(y1) + ');\n';
      const am = (a0 + a1)/2*Math.PI/180;
      out += '\\draw[bsaMuted, line width=.5pt] (' + F(x1 + sx*0.45) + ',' + F(y1) + ') arc (' + F(a0) + ':' + F(a1) + ':0.45);\n';
      out += tkpTexto(x1 + 0.68*Math.cos(am), y1 + 0.68*Math.sin(am), '$' + letraAngulo(u.dir) + '$', 'font=\\scriptsize, color=bsaMuted', Math.cos(am), Math.sin(am));
    }
  });
  // fuerzas del pasador de la rótula, a trazos (existen, pero su brazo es nulo)
  if(sel && sel.rotula){
    const x = X(sel.rotula.x), y = Y(sel.rotula.y);
    const nm = escLatex(sel.rotula.nombre);
    out += '\\draw[-{Latex[length=1.8mm]}, bsaMuted, dashed, line width=.8pt] (' + F(x - 0.9) + ',' + F(y) + ') -- (' + F(x - 0.12) + ',' + F(y) + ');\n';
    out += '\\draw[-{Latex[length=1.8mm]}, bsaMuted, dashed, line width=.8pt] (' + F(x) + ',' + F(y - 0.9) + ') -- (' + F(x) + ',' + F(y - 0.12) + ');\n';
    out += tkpTexto(x - 1.15, y, '$' + nm + '_x$', 'font=\\scriptsize, color=bsaMuted', -1, 0);
    out += tkpTexto(x, y - 1.15, '$' + nm + '_y$', 'font=\\scriptsize, color=bsaMuted', 0, -1);
  }
  // marco x, y en la esquina más despejada
  const ext = _tkpCajas.reduce((e,c)=>({x0:Math.min(e.x0,c.x0), y0:Math.min(e.y0,c.y0), x1:Math.max(e.x1,c.x1), y1:Math.max(e.y1,c.y1)}), {x0:X(minx), y0:Y(miny), x1:X(maxx), y1:Y(maxy)});
  const cands = [[ext.x1 + 0.4, ext.y0], [ext.x0 - 1.2, ext.y0], [ext.x1 + 0.4, ext.y1 - 0.8], [ext.x0 - 1.2, ext.y1 - 0.8]];
  const dCaja = (q, c) => Math.hypot(Math.max(c[0]-q[0], 0, q[0]-(c[0]+0.9)), Math.max(c[1]-q[1], 0, q[1]-(c[1]+0.9)));
  const mejor = cands.reduce((m, c)=>{ const s = ocupados.length ? Math.min(...ocupados.map(q=>dCaja(q, c))) : 99; return s > m.s ? {c, s} : m; }, {c:cands[0], s:-1}).c;
  out += tkpMarcoXY(mejor[0], mejor[1]);
  return out;
}

// ── Figura de brazos de una ecuación de momentos (R10): el centro marcado y,
//    para cada fuerza que produce momento, su línea de acción a trazos y la
//    perpendicular desde el centro con su cota ──
function tkpBrazos(r, ec, sel){
  tkpReiniciar();
  const caja = _cajaModelo();
  const {X, Y} = caja;
  const F = v => v.toFixed(3);
  let out = '';
  const trVis = sel ? tramos.filter(t=>sel.tramos.indexOf(t.id) >= 0) : tramos;
  trVis.forEach(t=>{
    const pts = puntosTramo(t, 40);
    if(pts.length < 2) return;
    out += '\\draw[bsaMuted!70, line width=1.2pt] ' + pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ') + ';\n';
  });
  const C = ec.centro;
  out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.9pt] (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') circle (0.11);\n';
  out += tkpTexto(X(C.x) + 0.3, Y(C.y) + 0.3, '\\textbf{' + escLatex(C.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, 1);
  const filas = [];
  ec.ts.forEach(t=>filas.push({P:t.carga.P, dir:t.carga.dir, nombre:t.carga.nombre, sub:String(t.carga.k), col:'bsaPres', brazo:t.brazo}));
  ec.us.forEach(u=>{ const q = r.inc[u.j]; filas.push({P:{x:q.n.x, y:q.n.y}, dir:sentidoRealIncognita(q, r.val[u.j]), nombre:simbIncognita(q), sub:q.n.nombre, col:(q.tipo==='T' ? 'bsaTope' : 'bsaReac'), brazo:u.brazo}); });
  filas.forEach(f=>{
    const px = X(f.P.x), py = Y(f.P.y);
    // pie de la perpendicular desde C a la línea de acción
    const dx = f.P.x - C.x, dy = f.P.y - C.y;
    const s = dx*f.dir.x + dy*f.dir.y;
    const Qx = f.P.x - f.dir.x*s, Qy = f.P.y - f.dir.y*s;      // pie, en el mundo
    const qx = X(Qx), qy = Y(Qy);
    // línea de acción prolongada hasta el pie, a trazos
    out += '\\draw[' + f.col + '!70, dashed, line width=.5pt] (' + F(px) + ',' + F(py) + ') -- (' + F(qx) + ',' + F(qy) + ');\n';
    // flecha corta de la fuerza en su punto
    out += '\\draw[-{Latex[length=1.8mm]}, ' + f.col + ', line width=1pt] (' + F(px - f.dir.x*0.9) + ',' + F(py - f.dir.y*0.9) + ') -- (' + F(px - f.dir.x*0.05) + ',' + F(py - f.dir.y*0.05) + ');\n';
    tkpOcuparTrazo(px - f.dir.x*0.9, py - f.dir.y*0.9, px, py, 0.08);
    out += tkpTexto(px - f.dir.x*1.15, py - f.dir.y*1.15, '$' + f.nombre + '$', 'font=\\scriptsize, color=' + f.col, -f.dir.x, -f.dir.y);
    // brazo: del centro al pie, con cota
    out += '\\draw[bsaAcc2, line width=.6pt] (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') -- (' + F(qx) + ',' + F(qy) + ');\n';
    const mx = (X(C.x)+qx)/2, my = (Y(C.y)+qy)/2;
    const nx = -(qy - Y(C.y)), ny = (qx - X(C.x)); const nn = Math.hypot(nx,ny) || 1;
    out += tkpTexto(mx + nx/nn*0.22, my + ny/nn*0.22, '$d_{' + f.sub + '} = ' + dec(f.brazo,'len') + '$', 'font=\\tiny, color=bsaAcc2', nx/nn, ny/nn);
    // marca de perpendicular
    out += '\\draw[bsaAcc2, line width=.4pt] (' + F(qx) + ',' + F(qy) + ') circle (0.03);\n';
  });
  return out;
}

// ── Fila de align* con los términos de una ecuación, partida cada N términos ──
function _filaPres(izq, terms, cola, porFila){
  const n = porFila || 4;
  if(!terms.length) return izq + ' & ' + (cola || '0');
  let s = izq + ' & ';
  terms.forEach((t,i)=>{
    const sg = (i===0) ? (t.v<0?'-':'') : (t.v<0?' - ':' + ');
    if(i > 0 && i % n === 0) s += ' \\\\\n & \\qquad ';
    s += sg + t.tex;
  });
  return s + (cola || '');
}

function construirLatex(){
  if(!R || R.error){
    aviso('Primero pulsa Resolver (o revisa el equilibrio de la compuerta).');
    return null;
  }
  const r = R;
  _yaDichoPres = {};
  asignarLetrasAngulos(r);
  r.cargas.forEach(c=>{ if(!c.des) c.des = desarrolloCarga(c); });
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  const uL = escLatex(unitLen), uF = escLatex(unitFor);
  const UL = '\\,\\text{' + uL + '}', UF = '\\,\\text{' + uF + '}';
  const UP = '\\,\\text{' + uF + '/' + uL + '}^2';
  const f = v => dec(v,'f'), nl = v => dec(v,'len');
  const b = anchoB();
  const hayCapas = [1,2].some(z=>capasOrdenadas(z).length > 1);
  const hayCurvo = r.cargas.some(c=>c.des && c.des.tipo === 'curvo');
  const dosLados = r.cargas.some(c=>c.z===1) && r.cargas.some(c=>c.z===2);

  // ── Autocomprobación: la tabla del paso 2 debe reproducir la resultante del motor ──
  {
    let ok = true;
    r.cargas.forEach(c=>{ if(!c.des || !c.des.coincide) ok = false; });
    if(!ok) console.warn('Informe LaTeX: la tabla no reproduce la resultante');
    r.plan.pasos.forEach(p=>{
      if(p.tipo !== 'despeje') return;
      const q = ecuacionDelPaso(r, p);
      if(!q.despeje) return;
      const vv = -q.despeje.sumaConocida/q.despeje.coef;
      if(Math.abs(vv - r.val[p.j]) > 1e-6*Math.max(1, Math.abs(r.val[p.j]))) console.warn('Informe LaTeX: el despeje no reproduce el valor de ' + q.despeje.simb);
    });
  }

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n'
    + '\\usepackage{amsmath,amssymb}\n'
    + '\\usepackage{tikz}\n'
    + '\\usetikzlibrary{patterns,arrows.meta,calc}\n'
    + '\\usepackage{xcolor}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{0F5C56}\n'
    + '\\definecolor{bsaAcc2}{HTML}{0B3F3A}\n'
    + '\\definecolor{bsaMuted}{HTML}{66727E}\n'
    + '\\definecolor{bsaAgua}{HTML}{2F7FB5}\n'
    + '\\definecolor{bsaPres}{HTML}{C0392B}\n'
    + '\\definecolor{bsaTope}{HTML}{B45309}\n'
    + '\\definecolor{bsaReac}{HTML}{15803D}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    + '\\setlength{\\parskip}{2pt}\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Presi\\\'on de Fluidos}\\hfill\\footnotesize\\color{bsaMuted}Compuertas y placas sumergidas}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ p\\\'ag.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\newcommand{\\sen}{\\operatorname{sen}}\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\par\\addvspace{10pt}\\penalty-250\n'
    + '  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n'
    + '  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n'
    + '\\newcommand{\\subpaso}[1]{\\vspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\vspace{3pt}}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc2!40}{bsaAcc2!5}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}¿Por qué?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\veredicto}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaAcc}{bsaAcc!7}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\makeatletter\n'
    + '\\newenvironment{tablacentrada}{\\par\\nopagebreak\\begingroup\\@beginparpenalty=10000\\relax\\begin{center}}{\\end{center}\\endgroup}\n'
    + '\\makeatother\n'
    + '\\raggedbottom\n\n'
    + '\\begin{document}\n\n';

  let figN = 0, tablaN = 0;
  const lamina = (cuerpo, txt, escala) => { figN++;
    return '\\begin{center}\n\\begin{tikzpicture}[scale=' + (escala || 1) + ']\n' + cuerpo
      + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n'
      + '{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\n\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezPres(clave) ? '\\porque{' + txt + '}\n' : '';
  const nombreZona = z => 'zona ' + z + ' (' + (z===1 ? 'izquierda' : 'derecha') + ')';

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Presi\\\'on de un fluido sobre una compuerta}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ═══ 1. Planteamiento ═══
  tex += '\\seccion{1. Planteamiento}\n';
  tex += lamina(tkpCompuerta(), 'Compuerta, l\\\'iquido de cada zona con su superficie libre, apoyos y topes. Ancho $b = ' + nl(b) + '$' + UL + '.');
  const apoyosTxt = r.inc.map(u=>'$' + simbIncognita(u) + '$ (' + descIncognita(u) + ' en ' + escLatex(u.n.nombre) + ')');
  tex += '\\noindent\\textbf{Objetivo.} Hallar la resultante del l\\\'iquido sobre cada tramo mojado de la compuerta, '
    + 'su punto de aplicaci\\\'on (el centro de presi\\\'on) y, con ellas, las inc\\\'ognitas del equilibrio: '
    + apoyosTxt.join(', ') + '.\\\\[3pt]\n';
  tex += porque('presion', 'En un l\\\'iquido en reposo la presi\\\'on manom\\\'etrica crece con la profundidad, $p = \\gamma h$ '
    + '(ley de Pascal; Hibbeler, 2027), y act\\\'ua siempre \\textbf{perpendicular} a la superficie que la recibe. '
    + 'Por eso una compuerta inclinada o curva recibe la misma $p$ que una vertical a igual profundidad: lo que cambia es la direcci\\\'on. '
    + (dosLados ? 'Con l\\\'iquido a los dos lados, cada zona empuja sobre su cara; son dos fuerzas distintas y se tratan por separado. ' : '')
    + (hayCapas ? 'Con varias capas, la presi\\\'on se acumula capa a capa, $p = \\sum \\gamma_i h_i$: cada capa apoya su peso sobre la de abajo.' : ''));
  tex += '\\noindent\\textbf{Procedimiento.} (1) Presi\\\'on en los puntos clave de cada tramo mojado; (2) resultante de cada tramo y su centro de presi\\\'on; '
    + '(3) diagrama de cuerpo libre de la compuerta; (4) ecuaciones de equilibrio en el orden en que se despejan; (5) comprobaciones.\\\\[4pt]\n';
  tex += '\\noindent\\textbf{Convenio.} $x$ hacia la derecha, $y$ hacia arriba, momentos positivos en sentido antihorario. Las profundidades $h$ se miden desde la superficie libre de la zona correspondiente.\n';

  // ═══ 2. Paso 1: presiones ═══
  tex += '\\seccion{2. Paso 1 --- Presi\\\'on en los puntos clave}\n';
  tex += '\\noindent En cada extremo mojado de cada tramo, $p = \\gamma h$' + (hayCapas ? ' sumando las capas que quedan encima' : '') + '. La presi\\\'on es siempre positiva: el sentido lo lleva la fuerza, no el n\\\'umero.\\\\[3pt]\n';
  tex += tablaCaption('Presi\\\'on en los extremos de la parte mojada de cada tramo, en ' + uPresLatex() + '.');
  tex += '\\begin{tablacentrada}\\begin{tabular}{lllrr}\n\\hline\n'
    + 'Fuerza & Tramo \\textperiodcentered\\ zona & Punto & $h$ (' + uL + ') & $p$ \\\\\n\\hline\n';
  r.cargas.forEach(c=>{
    const d = c.des;
    const filas = [];
    if(d && d.tipo === 'recto'){
      filas.push({nom: d.T.nombre ? escLatex(d.T.nombre) : 'corte con la superficie', hh: d.bandas[0].h0, p: d.bandas[0].p0, expr: _exprPresion(c.z, d.bandas[0].y0)});
      d.bandas.forEach((bd,i)=>{ if(i>0) filas.push({nom:'cambio de capa', hh:bd.h0, p:bd.p0, expr:_exprPresion(c.z, bd.y0)}); });
      const ult = d.bandas[d.bandas.length-1];
      filas.push({nom: d.D.nombre ? escLatex(d.D.nombre) : '', hh: ult.h1, p: ult.p1, expr:_exprPresion(c.z, ult.y1)});
    } else if(d){
      filas.push({nom: d.T.nombre ? escLatex(d.T.nombre) : 'corte con la superficie', hh: c.niv - d.yTop, p: presionZona(c.z, d.yTop), expr:_exprPresion(c.z, d.yTop)});
      filas.push({nom: 'punto m\\\'as profundo', hh: c.niv - d.yBot, p: presionZona(c.z, d.yBot), expr:_exprPresion(c.z, d.yBot)});
    }
    filas.forEach((fl,i)=>{
      tex += (i===0 ? '$' + c.nombre + '$ & ' + escLatex(nomTramo(c.t)) + ' \\textperiodcentered\\ ' + c.z : ' & ') + ' & ' + fl.nom + ' & ' + nl(fl.hh) + ' & $' + fl.expr + ' = ' + f(fl.p) + '$ \\\\\n';
    });
  });
  tex += '\\hline\n\\end{tabular}\\end{tablacentrada}\n';

  // ═══ 3. Paso 2: resultantes ═══
  tex += '\\seccion{3. Paso 2 --- Resultante de cada tramo mojado y su centro de presi\\\'on}\n';
  tex += porque('centro-presion', 'La resultante de una presi\\\'on repartida es el \\textbf{\\\'area del diagrama} de presi\\\'on (por el ancho $b$) '
    + 'y pasa por su centroide (Hibbeler, 2027). Como abajo la presi\\\'on es mayor, ese centroide ---el \\textbf{centro de presi\\\'on} $P$--- '
    + 'queda \\textbf{por debajo del centro de la placa}: $F_R = \\gamma\\,\\bar z\\,A$ da la magnitud, pero $P$ no es el centroide de la placa. '
    + 'En una placa plana el diagrama es un trapecio; se reparte en un rect\\\'angulo, aplicado a $L/2$, y un tri\\\'angulo, aplicado a $2L/3$ del extremo menos cargado (ej. 9.14, soluci\\\'on II), y $P$ sale de sumar momentos.');
  r.cargas.forEach(c=>{
    const d = c.des;
    tex += '\\subpaso{Fuerza $' + c.nombre + '$: tramo ' + escLatex(nomTramo(c.t)) + ', ' + nombreZona(c.z) + '}\n';
    if(!d){
      tex += '\\noindent Resultante por integraci\\\'on num\\\'erica: $' + c.nombre + ' = ' + f(c.F) + '$' + UF + '.\\\\\n';
      return;
    }
    tex += lamina(tkpCroquisCarga(c, d), (d.tipo === 'curvo' ? 'Placa curva: bloque de l\\\'iquido sobre la placa, $F_h$, $F_v$ y $' + c.nombre + '$ en $P$.' : 'Diagrama de presi\\\'on del tramo y $' + c.nombre + '$ en su centro de presi\\\'on $P$.'), 0.95);
    if(d.tipo === 'recto'){
      const origen = d.T.nombre ? 'el nudo ' + escLatex(d.T.nombre) : 'el corte con la superficie libre';
      tex += '\\noindent Placa ' + (d.horizontal ? 'horizontal' : (Math.abs(d.angPlaca-90) < 1e-6 ? 'vertical' : 'inclinada $' + d.angPlaca.toFixed(2) + '^\\circ$')) + ', longitud mojada $L = ' + nl(d.L) + '$' + UL + ', ancho $b = ' + nl(b) + '$' + UL + '. Las distancias $s$ se miden sobre la placa desde ' + origen + '.\n';
      const filas = [];
      d.bandas.forEach((bd,i)=>{
        const cab = d.bandas.length > 1 ? '\\text{capa ' + (i+1) + ' } (\\gamma = ' + f(bd.g) + ',\\ L_' + (i+1) + ' = ' + nl(bd.l) + '):\\ ' : '';
        if(bd.Fr > 1e-12) filas.push(cab + 'F_{\\square} &= b\\,L\\,p_{\\min} = ' + nl(b) + '\\,(' + nl(bd.l) + ')(' + f(Math.min(bd.p0,bd.p1)) + ') = ' + f(bd.Fr) + UF + '\\quad\\text{en } s = ' + nl(bd.s0) + ' + L/2 = ' + nl(bd.s0 + bd.sR));
        if(bd.Ft > 1e-12) filas.push((bd.Fr > 1e-12 ? '' : cab) + 'F_{\\triangle} &= \\tfrac12\\,b\\,L\\,(p_{\\max}-p_{\\min}) = \\tfrac12\\,' + nl(b) + '\\,(' + nl(bd.l) + ')(' + f(Math.abs(bd.p1-bd.p0)) + ') = ' + f(bd.Ft) + UF + '\\quad\\text{en } s = ' + nl(bd.s0) + ' + ' + (bd.p1 >= bd.p0 ? '2L/3' : 'L/3') + ' = ' + nl(bd.s0 + bd.sT));
      });
      const partes = [];
      d.bandas.forEach(bd=>{ if(bd.Fr>1e-12) partes.push({F:bd.Fr, s:bd.s0+bd.sR}); if(bd.Ft>1e-12) partes.push({F:bd.Ft, s:bd.s0+bd.sT}); });
      filas.push(c.nombre + ' &= ' + partes.map(p=>f(p.F)).join(' + ') + ' = ' + f(d.F) + UF);
      filas.push('s_P &= \\frac{\\sum F_i\\,s_i}{' + c.nombre + '} = \\frac{' + partes.map(p=>f(p.F) + '(' + nl(p.s) + ')').join(' + ') + '}{' + f(d.F) + '} = ' + nl(d.sP) + UL);
      tex += '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
      tex += '\\resultado{$' + c.nombre + ' = ' + f(d.F) + '$' + UF + ', perpendicular a la placa, aplicada en $P$ a $s_P = ' + nl(d.sP) + '$' + UL + ' de ' + origen + ', es decir a $z_P = ' + nl(d.zP) + '$' + UL + ' bajo la superficie libre'
        + (d.gzA ? '. Comprobaci\\\'on: $\\gamma\\,\\bar z\\,A = ' + f(d.gzA.g) + '\\,(' + nl(d.gzA.zBar) + ')(' + nl(d.gzA.A) + ') = ' + f(d.gzA.F) + '$' + UF + (d.horizontal ? '' : ' y $z_P = ' + nl(d.zP) + ' > \\bar z = ' + nl(d.gzA.zBar) + '$') : '') + '.}\n';
    } else {
      tex += porque('curva', 'En una placa curva la presi\\\'on cambia de direcci\\\'on punto a punto. En vez de integrar se trabaja por componentes (Hibbeler, 2027; Beer et al., 2024): '
        + '$F_h$ es la resultante de la presi\\\'on sobre la \\textbf{proyecci\\\'on vertical} de la placa (un trapecio de presiones como el de una placa vertical) y '
        + '$F_v$ es el \\textbf{peso del l\\\'iquido} comprendido entre la placa y la superficie libre (real si el l\\\'iquido est\\\'a sobre la placa; el mismo bloque, hacia arriba, si est\\\'a debajo). '
        + 'Como en un arco de c\\\'irculo todas las presiones son radiales, la resultante pasa por el centro del arco, y as\\\'i se sit\\\'ua $P$.');
      tex += '\\noindent Arco de radio $R = ' + nl(d.arc.R) + '$' + UL + ' con centro $O_c = (' + nl(d.arc.cx) + ';\\ ' + nl(d.arc.cy) + ')$; parte mojada entre las cotas $' + nl(d.yTop) + '$ y $' + nl(d.yBot) + '$' + UL + ' (proyecci\\\'on vertical $' + nl(d.yTop - d.yBot) + '$' + UL + ').\n';
      const filas = [];
      d.bandasH.forEach((bd,i)=>{
        const cab = d.bandasH.length > 1 ? '\\text{capa ' + (i+1) + '}:\\ ' : '';
        if(bd.Fr > 1e-12) filas.push(cab + 'F_{h\\square} &= b\\,h\\,p_{\\text{sup}} = ' + nl(b) + '(' + nl(bd.h) + ')(' + f(bd.p0) + ') = ' + f(bd.Fr) + UF);
        if(bd.Ft > 1e-12) filas.push((bd.Fr > 1e-12 ? '' : cab) + 'F_{h\\triangle} &= \\tfrac12\\,b\\,h\\,(p_{\\text{inf}}-p_{\\text{sup}}) = \\tfrac12\\,' + nl(b) + '(' + nl(bd.h) + ')(' + f(bd.p1-bd.p0) + ') = ' + f(bd.Ft) + UF);
      });
      filas.push('F_h &= ' + f(Math.abs(d.Fh)) + UF + '\\ (\\text{hacia la ' + d.sentidoH + '})');
      if(d.segmento){
        filas.push('A_{\\text{bloque}} &= A_{\\text{trapecio}} ' + (d.segmento.haciaArriba ? '-' : '+') + ' A_{\\text{segmento}} = ' + nl(d.segmento.Atrap) + (d.segmento.haciaArriba ? ' - ' : ' + ') + '\\tfrac{R^2}{2}(\\varphi - \\sen\\varphi) = ' + nl(d.segmento.Atrap) + (d.segmento.haciaArriba ? ' - ' : ' + ') + nl(d.segmento.Aseg) + ' = ' + nl(d.segmento.A) + UL + '^2');
      }
      filas.push('F_v &= b\\sum\\gamma_i A_i = ' + nl(b) + '\\,(' + d.areas.filter(a=>a.A>1e-12).map(a=>f(a.g) + '\\cdot' + nl(a.A)).join(' + ') + ') = ' + f(Math.abs(d.FvBloque)) + UF + '\\ (\\text{hacia ' + d.sentidoV + '})');
      filas.push(c.nombre + ' &= \\sqrt{F_h^2 + F_v^2} = \\sqrt{' + f(Math.abs(d.Fh)) + '^2 + ' + f(Math.abs(d.Fv)) + '^2} = ' + f(d.F) + UF + ',\\qquad \\tan\\theta = \\frac{F_v}{F_h}\\ \\Rightarrow\\ \\theta = ' + d.theta.toFixed(2) + '^\\circ');
      tex += '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
      if(d.segmento) tex += '{\\footnotesize El segmento circular es el que queda entre la cuerda mojada ($' + nl(d.cuerda) + '$' + UL + ') y el arco, con $\\varphi = ' + (d.segmento.phi*180/Math.PI).toFixed(2) + '^\\circ$.}\\\\[2pt]\n';
      if(!d.monoX || !d.monoY) tex += '{\\footnotesize La parte mojada se repliega sobre s\\\'i misma en horizontal o en vertical: las componentes se han integrado directamente sobre el arco.}\\\\[2pt]\n';
      tex += '\\resultado{$' + c.nombre + ' = ' + f(d.F) + '$' + UF + ' a $' + d.theta.toFixed(2) + '^\\circ$ de la horizontal, por el centro del arco; corta la placa en $P$, a $z_P = ' + nl(d.zP) + '$' + UL + ' bajo la superficie libre.}\n';
    }
  });
  // tabla resumen del paso 2
  let SX = 0, SY = 0;
  tex += tablaCaption('Resultante de cada tramo mojado. $L$ mojada y $z_P$ en ' + uL + '; fuerzas en ' + uF + '.');
  tex += '\\begin{tablacentrada}\\begin{tabular}{llrrrrrrc}\n\\hline\n'
    + 'Fuerza & Tramo \\textperiodcentered\\ zona & $L$ & $p_{\\max}$ & $F$ & $z_P$ & $F_x$ & $F_y$ & Sentido \\\\\n\\hline\n';
  r.cargas.forEach(c=>{
    SX += c.Fx; SY += c.Fy;
    tex += '$' + c.nombre + '$ & ' + escLatex(nomTramo(c.t)) + ' \\textperiodcentered\\ ' + c.z + ' & ' + nl(c.len) + ' & ' + f(c.pMax) + ' & ' + f(c.F) + ' & ' + nl(c.zP) + ' & ' + f(c.Fx) + ' & ' + f(c.Fy) + ' & ' + iconoSentidoTex(c.dir.x, c.dir.y) + ' \\\\\n';
  });
  tex += '\\hline\n\\multicolumn{6}{l}{$\\Sigma$ del l\\\'iquido} & ' + f(SX) + ' & ' + f(SY) + ' & \\\\\n\\hline\n\\end{tabular}\\end{tablacentrada}\n';
  tex += '{\\footnotesize El programa integra la presi\\\'on punto a punto sobre cada tramo; el desarrollo de este paso reproduce esa integral.}\\\\[2pt]\n';

  // ═══ 4. Paso 3: DCL ═══
  tex += '\\seccion{4. Paso 3 --- Diagrama de cuerpo libre de la compuerta}\n';
  tex += '\\noindent Sobre la compuerta act\\\'uan las resultantes del l\\\'iquido, cada una en su centro de presi\\\'on, y las inc\\\'ognitas de los apoyos'
    + (r.inc.some(u=>u.tipo==='T') ? ' y del tope' : '') + '. Cada fuerza se dibuja en su sentido real y se rotula solo con su nombre; los valores est\\\'an en las tablas.\n';
  const letras = Object.keys(_LETRAS_ANG);
  const listaAng = letras.map(k=>'$' + _LETRAS_ANG[k] + ' = ' + k + '^\\circ$');
  tex += lamina(tkpDCL(r, null), 'DCL de la compuerta.' + (listaAng.length ? ' ' + listaAng.join(', ') + '.' : ''));
  if(r.topesSueltos.length === 0 && r.inc.some(u=>u.tipo==='T'))
    tex += porque('tope', 'Un tope liso solo puede \\textbf{empujar}: su fuerza es normal a la compuerta y se supone hacia ella. Si del equilibrio saliera negativa, la compuerta se separar\\\'ia del tope (se abrir\\\'ia); con valor cero est\\\'a \\emph{a punto de abrirse}, que es la situaci\\\'on l\\\'imite de muchos problemas.');

  // ═══ 5. Paso 4: equilibrio ═══
  tex += '\\seccion{5. Paso 4 --- Ecuaciones de equilibrio}\n';
  const plan = r.plan;
  tex += '\\noindent Hay ' + r.inc.length + ' inc\\\'ognita' + (r.inc.length>1?'s':'') + ' y ' + r.diag.eq + ' ecuaci' + (r.diag.eq>1?'ones':'\\\'on')
    + (r.diag.rot ? ' (tres del conjunto y una por cada r\\\'otula, tomando momentos en ella con las fuerzas de un solo lado)' : '')
    + ': el problema es est\\\'aticamente determinado. Los momentos se toman respecto de \\textbf{' + escLatex(plan.centro.nombre) + '}'
    + (plan.ecs[0].us.length < r.inc.length ? ', por donde pasan las l\\\'ineas de acci\\\'on de ' + (r.inc.length - plan.ecs[0].us.length) + ' inc\\\'ognita' + ((r.inc.length - plan.ecs[0].us.length)>1?'s':'') + ', que as\\\'i no aparecen' : '')
    + '. Cada ecuaci\\\'on se escribe con su convenio, se sustituye y se despeja la inc\\\'ognita que deja sola; las ya halladas se citan por su n\\\'umero.\n';
  const cita = ns => ns.length === 1 ? '(' + ns[0] + ')' : '(' + ns.slice(0,-1).join('), (') + ') y (' + ns[ns.length-1] + ')';
  const deQuien = {};
  const terminos = (q, clave) => {
    const lista = [];
    q.incT.forEach(t=>lista.push({v:t.coef, tex:t.lit}));
    q.cargasT.forEach(t=>lista.push({v:t.v, tex:t.lit}));
    return lista;
  };
  const terminosSus = (q, paso) => {
    const lista = [];
    const pendiente = j => (paso.tipo === 'despeje' && j === paso.j) || (paso.tipo === 'sistema' && paso.libres && paso.libres.indexOf(j) >= 0);
    q.incT.forEach(t=>{
      if(pendiente(t.j)){ lista.push({v:t.coef, tex:t.sus}); return; }
      const v = r.val[t.j];
      lista.push({v:t.coef*v, tex: dec(Math.abs(v),'f') + (t.factor === '1' ? '' : t.factor)});
    });
    q.cargasT.forEach(t=>lista.push({v:t.v, tex:t.sus}));
    return lista;
  };
  plan.pasos.forEach(paso=>{
    if(paso.tipo === 'despeje' || paso.tipo === 'comprobacion'){
      const q = ecuacionDelPaso(r, paso);
      const ec = q.ec;
      if(ec.tipo === 'Mrot'){
        const sel = {tramos: ec.lado.tramos, nodos: ec.lado.nodos, rotula: ec.centro};
        tex += lamina(tkpDCL(r, sel), 'DCL de la parte de la compuerta a un lado de la r\\\'otula ' + escLatex(ec.centro.nombre) + '; las fuerzas del pasador, a trazos, no dan momento en ' + escLatex(ec.centro.nombre) + '.');
      }
      if(ec.tipo === 'M' || ec.tipo === 'Mrot'){
        tex += lamina(tkpBrazos(r, ec, ec.tipo === 'Mrot' ? {tramos: ec.lado.tramos} : null), 'Brazos de $\\sum M_{' + escLatex(ec.centro.nombre) + '}$, medidos desde ' + escLatex(ec.centro.nombre) + '.', 0.9);
      }
      if(paso.tipo === 'comprobacion'){ deQuien['comp' + paso.num] = paso; return; }
      const previas = paso.previas.map(j=>deQuien[j]).filter(Boolean);
      const filas = [];
      filas.push(_filaPres(q.icono + ec.nombre.replace(' = 0','') + ':', terminos(q), ' = 0\\qquad(' + paso.num + ')', 4));
      const sus = terminosSus(q, paso);
      if(sus.length) filas.push(_filaPres('', sus, ' = 0' + (previas.length ? '\\qquad{\\footnotesize\\text{con ' + cita(previas) + '}}' : ''), 4));
      const dp = q.despeje;
      const factor = dp.factor === '1' ? '' : '\\,' + dp.factor;
      filas.push(' & ' + dp.simb + factor + ' = ' + f(-dp.sumaConocida) + '\\ \\Rightarrow\\ \\boxed{' + dp.simb + ' = ' + f(dp.valor) + UF + '}');
      tex += '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
      if(dp.valor < 0) tex += '{\\footnotesize El signo negativo indica que $' + dp.simb + '$ act\\\'ua en sentido contrario al supuesto' + (r.inc[paso.j].tipo === 'T' ? ': el tope no puede tirar, la compuerta se separa de \\\'el' : '') + '.}\\\\[2pt]\n';
      deQuien[paso.j] = paso.num;
    } else if(paso.tipo === 'sistema'){
      const filas = [];
      paso.grupo.forEach(g=>{
        const q = ecuacionDelPaso(r, {tipo:'sistema', e:g.e, libres:paso.libres});
        filas.push(_filaPres(q.icono + q.ec.nombre.replace(' = 0','') + ':', terminosSus(q, {tipo:'sistema', libres:paso.libres}), ' = 0\\qquad(' + g.num + ')', 4));
      });
      tex += '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
      tex += '\\noindent{\\footnotesize Las ecuaciones ' + cita(paso.grupo.map(g=>g.num)) + ' no se despejan por separado: forman un sistema. Resolvi\\\'endolo:}\\\\[2pt]\n';
      tex += '$$' + paso.libres.map(j=>'\\boxed{' + simbIncognita(r.inc[j]) + ' = ' + f(r.val[j]) + UF + '}').join('\\qquad') + '$$\n';
      paso.libres.forEach(j=>{ deQuien[j] = paso.grupo[paso.grupo.length-1].num; });
    }
  });
  // resumen de reacciones (R6, R8)
  tex += '\\resultado{\\textbf{Resultado.} ' + r.inc.map((u,j)=>{
      const v = r.val[j]; const sr = sentidoRealIncognita(u, v);
      const nulo = Math.abs(v) < 1e-9*Math.max(1, r.residuo.ref);
      return '$' + simbIncognita(u) + ' = ' + f(Math.abs(v)) + '$' + UF + (nulo ? '' : ' ' + iconoSentidoTex(sr.x, sr.y));
    }).join(', ') + '. La flecha es el sentido real; el valor, su magnitud.}\n';
  if(r.topesSueltos.length)
    tex += '\\veredicto{\\textbf{Tope que no trabaja.} El equilibrio exige que ' + r.topesSueltos.map(u=>'$' + simbIncognita(u) + '$').join(', ') + ' tire de la compuerta, y un tope solo puede empujar: \\textbf{la compuerta se abre} (se separa del tope). Para que se mantenga cerrada hace falta otro apoyo o cambiar los niveles.}\n';

  // ═══ 6. Paso 5: comprobaciones ═══
  tex += '\\seccion{6. Paso 5 --- Comprobaciones}\n';
  const comps = plan.pasos.filter(p=>p.tipo === 'comprobacion');
  if(comps.length){
    comps.forEach(p=>{
      const q = ecuacionDelPaso(r, p);
      const sus = terminosSus(q, p);
      let suma = 0; sus.forEach(t=>{ suma += t.v; });
      tex += '\\noindent La ecuaci\\\'on que no se us\\\'o para despejar debe cumplirse con los valores hallados:\n';
      tex += '\\begin{align*}\n' + _filaPres(q.icono + q.ec.nombre.replace(' = 0','') + ':', sus, ' = ' + (Math.abs(suma) < 1e-6*r.residuo.ref ? '0' : f(suma)) + '\\ \\checkmark', 4) + '\n\\end{align*}\n';
    });
  }
  const rs = r.residuo;
  const cero = v => (Math.abs(v) < 1e-6*rs.ref) ? '0' : f(v);
  tex += '\\noindent Con todas las fuerzas (l\\\'iquido, reacciones' + (r.inc.some(u=>u.tipo==='T') ? ' y tope' : '') + '):\n'
    + '$$\\sum F_x = ' + cero(rs.cx) + ' \\qquad \\sum F_y = ' + cero(rs.cy) + ' \\qquad \\sum M_O = ' + cero(rs.cm) + '$$\n';
  const planas = r.cargas.filter(c=>c.des && c.des.tipo==='recto' && !c.des.horizontal);
  if(planas.length)
    tex += '\\noindent Sentido com\\\'un: en cada placa plana el centro de presi\\\'on est\\\'a por debajo del centro de la parte mojada, '
      + planas.map(c=>'$z_{P' + c.k + '} = ' + nl(c.zP) + ' > \\bar z = ' + nl(c.des.zBar) + '$').join(', ') + '.\\\\[3pt]\n';
  tex += '\\begin{center}{\\small\\color{' + (r.cierra ? 'bsaVerde' : 'bsaPres') + '}'
    + (r.cierra ? 'Las tres sumas son nulas: la compuerta queda en equilibrio con estas reacciones.'
                : 'El equilibrio no cierra; revisa los apoyos y las caras mojadas.')
    + '}\\end{center}\n';

  // ═══ Referencias y colofón ═══
  tex += bsaReferenciasLatex();
  tex += colofonLatexBSA();
  tex += '\n\\end{document}\n';
  return tex;
}
// Expresión de la presión en una cota: γ h, o la suma por capas.
function _exprPresion(z, y){
  const capas = capasOrdenadas(z);
  const partes = [];
  for(let i=0;i<capas.length;i++){
    const arriba = capas[i].niv;
    const abajo = (i+1 < capas.length) ? capas[i+1].niv : -Infinity;
    if(y >= arriba) continue;
    const base = Math.max(y, abajo);
    partes.push(dec(capas[i].g,'f') + '(' + dec(arriba - base,'len') + ')');
    if(y >= abajo) break;
  }
  return partes.length ? partes.join(' + ') : '0';
}

// ── Compilación con texlive.net (mismo mecanismo que Cap. 6, 7 y 9) ──
const TEXLIVE_NET_URL = 'https://texlive.net/cgi-bin/latexcgi';
function _panelLatexPDF(){
  let panel = document.getElementById('panelLatexPDF');
  if(panel) return panel;
  panel = document.createElement('div');
  panel.id = 'panelLatexPDF';
  panel.style.cssText = 'display:none; position:fixed; inset:0; z-index:9000; '
    + 'background:rgba(15,20,28,.72); align-items:center; justify-content:center; padding:16px;';
  panel.innerHTML =
      '<div style="background:#fff; border-radius:10px; width:100%; max-width:900px; '
    +   'height:92vh; display:flex; flex-direction:column; overflow:hidden; position:relative;">'
    +   '<div style="display:flex; align-items:center; justify-content:space-between; '
    +     'padding:10px 14px; border-bottom:1px solid #d7e3e0;">'
    +     '<strong style="color:#0f5c56">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#66727e;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#66727e;">'
    +     'Enviando a texlive.net…</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #eef2f1;">Si en lugar del PDF aparece texto, es el registro '
    +     'de LaTeX: c\u00f3pialo y av\u00edsanos.</div>'
    +   '<div id="latexCargando" style="position:absolute; inset:0; background:#fff; '
    +     'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;">'
    +     '<div style="display:flex; gap:10px; align-items:flex-end; height:64px;">'
    +       '<span class="bsa-let" style="color:#CDA953; animation-delay:0s">B</span>'
    +       '<span class="bsa-let" style="color:#8AB4CA; animation-delay:.22s">S</span>'
    +       '<span class="bsa-let" style="color:#22584B; animation-delay:.44s">A</span>'
    +     '</div>'
    +     '<div style="font-size:12px;color:#66727e">Compilando el informe…</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(panel);
  return panel;
}
function descargarTex(){
  const tex = construirLatex();
  if(!tex) return;
  const blob = new Blob([tex], {type:'text/x-tex'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'presion-fluidos-bsa.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function generarPDFLatex(){
  const btn = document.getElementById('btnLatex');
  if(btn && btn.dataset.ocupado === '1') return;

  const tex = construirLatex();
  if(!tex) return;

  try {
    if(btn) btn.dataset.ocupado = '1';
    const panel = _panelLatexPDF();
    const estado = document.getElementById('latexEstado');
    const frame = document.getElementById('latexFrame');
    estado.textContent = 'Enviando a texlive.net…';
    const cargando = document.getElementById('latexCargando');
    if(cargando) cargando.style.display = 'flex';
    panel.style.display = 'flex';

    // El envio vive en core/comun.js porque es identico en los cinco temas.
    // En telefono y tableta el PDF va a una pestana nueva: el navegador no lo
    // pinta dentro de un iframe.
    const enIframe = bsaEnviarTex(tex, TEXLIVE_NET_URL);
    if(!enIframe) bsaPanelMovil();

    frame.addEventListener('load', function(){
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
      estado.textContent = 'Informe generado.';
      estado.style.color = '#15803D';
    }, {once:true});

    setTimeout(()=>{
      if(estado.textContent.indexOf('Enviando') === 0){
        estado.textContent = 'Sigue esperando respuesta de texlive.net. '
          + 'Si tarda demasiado, cierra este panel y vuelve a intentar.';
      }
    }, 45000);
    setTimeout(()=>{
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
    }, 90000);
  } catch(e){
    console.error('Error al enviar a texlive.net:', e);
    aviso('Ocurri\u00f3 un error al preparar el env\u00edo: ' + e.message, 'error');
  } finally {
    if(btn) btn.dataset.ocupado = '0';
  }
}

function downloadPDF(){
  const rp = document.getElementById('resultsPanel');
  if(!rp || !rp.innerHTML.trim()){ aviso('Primero pulsa Resolver.', 'error'); return; }
  const img = recortarLienzo(document.getElementById('mainCanvas'));
  const dt = new Date().toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'});
  const kEl = document.getElementById('katex-css');
  const katexCss = kEl ? kEl.textContent : '';
  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--math:'STIX Two Text','Times New Roman',Georgia,serif;
          --sans:Inter,'Helvetica Neue',Arial,sans-serif;
          --acc:#0f5c56;--acc2:#0b3f3a;--card:#e8f4f1;--border:#c8e0d8;
          --text:#1a1a1a;--muted:#5a7570;}
    body{font-family:var(--sans);font-size:10.5px;background:#fff;color:var(--text);
      padding:12mm 9mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .pdf-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--acc2);
      padding-bottom:7px;margin-bottom:10px;}
    .pdf-title{font-size:17px;font-weight:800;color:var(--acc);}
    .pdf-sub{font-size:10px;color:var(--muted);}
    .pdf-date{margin-left:auto;font-size:9px;color:var(--muted);}
    .res-section{margin-bottom:8px;}
    .res-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
      color:var(--acc);border-bottom:1.5px solid var(--acc2);padding-bottom:4px;margin:9px 0 6px;}
    .res-title .num{width:18px;height:18px;border-radius:50%;background:var(--acc2);
      display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;
      color:#fff;flex:none;}
    .proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;
      padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;}
    .proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
    .proc-sub{font-size:9px;font-weight:700;color:var(--acc);text-transform:uppercase;
      letter-spacing:.5px;margin-bottom:4px;}
    .eq-body{font-family:var(--math);font-size:11px;line-height:1.5;}
    .verdict{border-left:3px solid var(--acc);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:6px;font-size:10px;page-break-inside:avoid;}
    .verdict-t{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
      color:var(--muted);margin-bottom:3px;}
    .tabla{width:100%;border-collapse:collapse;font-family:var(--math);font-size:11px;
      page-break-inside:avoid;margin-bottom:6px;}
    .tabla th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;color:var(--acc);
      text-transform:uppercase;background:var(--card);border-bottom:1.5px solid var(--border);
      font-family:var(--sans);}
    .tabla td{padding:2px 6px;border-bottom:1px solid var(--border);}
    .tabla .r{text-align:right;}
    .tabla .fila-total td{font-weight:700;background:var(--card);color:var(--acc);}
    .fig-card{display:flex;gap:10px;border:1px solid var(--border);border-radius:6px;padding:6px 8px;margin-bottom:6px;page-break-inside:avoid;}
    .fig-card-datos{flex:1;min-width:0;}
    .fig-card-dib{flex:0 0 190px;}
    .fig-card-h{font-size:10.5px;margin-bottom:4px;}
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;
      page-break-inside:avoid;}
    .summary-box{border:1px solid var(--border);border-radius:5px;padding:5px 8px;}
    .summary-box.hl{background:var(--card);}
    .s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;
      font-family:var(--sans);font-weight:700;}
    .s-val{font-size:13px;font-weight:700;color:var(--acc);font-style:italic;font-family:var(--math);}
    .s-unit{font-size:8px;color:var(--muted);}
    .hint-sm{font-size:9.5px;color:var(--muted);}
    svg{max-width:100%;height:auto;}
    img{max-width:100%;}
    .wm-seal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:340px;height:340px;opacity:.07;z-index:9999;pointer-events:none;}
    .pdf-foot{margin-top:10px;text-align:center;font-size:8.5px;color:var(--muted);
      border-top:1px solid var(--border);padding-top:6px;}
    @page{size:A4 portrait;margin:0;}
    @media print{ body{padding:12mm 9mm 14mm;} }
  `;
  const wmSeal = '<div class="wm-seal"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><path id="stp" d="M 26,100 A 74,74 0 0 1 174,100"/><path id="sbt" d="M 26,100 A 74,74 0 0 0 174,100"/></defs>'
    + '<circle cx="100" cy="100" r="94" fill="none" stroke="#0b3f3a" stroke-width="2.5"/>'
    + '<circle cx="100" cy="100" r="80" fill="none" stroke="#0b3f3a" stroke-width="1"/>'
    + '<text font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="#0b3f3a" letter-spacing="1">'
    + '<textPath href="#stp" startOffset="50%" text-anchor="middle">BEAM &amp; SECTION ANALYSIS</textPath></text>'
    + '<text font-family="Inter,sans-serif" font-size="10.5" font-weight="600" fill="#0b3f3a" letter-spacing="1">'
    + '<textPath href="#sbt" startOffset="50%" text-anchor="middle">by Luis Alejandro Bazán Campos</textPath></text>'
    + '<text x="100" y="106" font-family="Inter,sans-serif" font-size="16" font-weight="800" fill="#0b3f3a" text-anchor="middle">BSA</text>'
    + '<line x1="62" y1="118" x2="138" y2="118" stroke="#0b3f3a" stroke-width="1"/>'
    + '<text x="100" y="133" font-family="Inter,sans-serif" font-size="9" fill="#0b3f3a" text-anchor="middle" letter-spacing="1">EST\u00c1TICA</text>'
    + '</svg></div>';
  let html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
  html += '<title>BSA \u2014 Presi\u00f3n de Fluidos</title>';
  html += '<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>'+katexCss+'</style><style>'+printCss+'</style></head><body>'+wmSeal;
  html += '<div class="pdf-header"><div><div class="pdf-title">BSA \u2014 Presi\u00f3n de Fluidos</div>'
        + '<div class="pdf-sub">by Luis Alejandro Baz\u00e1n Campos</div></div>'
        + '<div class="pdf-date">Generado: '+dt+'</div></div>';
  if(img) html += '<div style="margin-bottom:12px;page-break-inside:avoid;">'
    + '<h3 style="font-size:11px;font-weight:700;color:#0f5c56;margin-bottom:5px;font-family:Inter,sans-serif;'
    + 'text-transform:uppercase;letter-spacing:.5px;">Situaci\u00f3n analizada</h3>'
    + '<img src="'+img+'" style="max-width:100%;width:auto;max-height:290px;border-radius:8px;'
    + 'border:1px solid #c8e0d8;display:block;margin:6px auto;"></div>';
  html += rp.innerHTML;
  html += '<div class="pdf-foot">Beam &amp; Section Analysis \u00b7 beamsectionanalysis.com</div>';
  html += '<script>window.onload=function(){setTimeout(function(){window.print();},900);}<\/script></body></html>';
  const w = window.open('','_blank','width=980,height=760');
  if(!w){ aviso('El navegador bloque\u00f3 la ventana emergente.', 'error'); return; }
  w.document.write(html); w.document.close();
}
