// ═══════════════════════════════════════════════════════════
//  RESULTADOS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  MÉTODOS DE RESOLUCIÓN: ecuaciones (con DCL por subtramo) y áreas
// ═══════════════════════════════════════════════════════════
let metodo7 = 'ecuaciones';
function setMetodo7(m){
  metodo7 = m;
  // El método se puede elegir desde la columna de control o desde las
  // pestañas de la sección de resultados: los dos sitios se sincronizan.
  const be = document.getElementById('metEcu'), ba = document.getElementById('metAre');
  if(be) be.classList.toggle('active', m === 'ecuaciones');
  if(ba) ba.classList.toggle('active', m === 'areas');
  const hint = document.getElementById('metHint7');
  if(hint) hint.innerHTML = (m === 'ecuaciones')
    ? 'Se corta en una sección genérica a distancia <i>x</i> y se plantea el equilibrio del trozo anterior.'
    : 'Se construyen los diagramas acumulando áreas: el área de la carga da el salto de V, y el área de V da el salto de M.';
  // refrescar() solo redibuja el lienzo; para que el cambio de método se vea
  // hay que volver a pintar la sección de resultados.
  const rp = document.getElementById('resultsPanel');
  if(R && !R.error && rp && rp.style.display !== 'none'){
    rp.innerHTML = renderResultados(R);
    try{ renderKatex(rp); }catch(e){}
  }
  dibujar();
}

function polyVal(c,x){ return (((c[3]||0)*x + (c[2]||0))*x + (c[1]||0))*x + (c[0]||0); }
function polyIntDef(c,a,b){
  const F = x => (c[0]||0)*x + (c[1]||0)*x*x/2 + (c[2]||0)*x*x*x/3 + (c[3]||0)*x*x*x*x/4;
  return F(b) - F(a);
}
function polyTex(c, dt, sim){
  // sim: símbolo de la abscisa. En un tramo inclinado no es x ni y, sino la
  // resultante de ambos catetos, y se escribe r.
  const v0 = sim || 'x';
  const out = [];
  c.forEach((v,i)=>{
    if(Math.abs(v) < 5e-9) return;
    const sg = out.length===0 ? (v<0?'-':'') : (v<0?' - ':' + ');
    const pot = i===0 ? '' : (i===1 ? '\\,'+v0 : '\\,'+v0+'^{'+i+'}');
    out.push(sg + dec(Math.abs(v), dt) + pot);
  });
  return out.length ? out.join('') : '0';
}

// ── DCL del subtramo: el trozo de cadena anterior al corte con TODAS las
//    cargas que interactúan (reacciones, puntuales, momentos y los trozos de
//    distribuida recortados en la sección), más N, V y M como incógnitas.
// Polinomio en texto plano, para rotularlo dentro de un SVG.
function polyPlano(c, dt, sim){
  const v0 = sim || 'x';
  const out = [];
  c.forEach((v,i)=>{
    if(Math.abs(v) < 5e-9) return;
    const sg = out.length===0 ? (v<0?'\u2212':'') : (v<0?' \u2212 ':' + ');
    const pot = i===0 ? '' : (i===1 ? v0 : v0+'\u00b2');
    out.push(sg + dec(Math.abs(v), dt) + pot);
  });
  return out.length ? out.join('') : '0';
}

// ── Rótulos del DCL sin solape ──
// El DCL se pinta en SVG, no en el lienzo, así que necesita su propio
// registro de cajas ocupadas. Cada rótulo se aparta en la dirección
// indicada hasta encontrar hueco; si no cabe en ningún escalón, se omite
// antes que pintarlo encima de otro.
function _cajasDCL(){ return _dclCajas || (_dclCajas = []); }
let _dclCajas = null;
let _dclW = 0, _dclH = 0;      // tamaño del lienzo del DCL, para no salirse
function txtDCL(fx, x, y, txt, col, tam, peso, anchor, ital, dirX, dirY){
  const w = String(txt).length * tam * 0.58 + 4, h = tam + 3;
  let cx = (anchor === 'middle') ? x : x + w/2;
  // Un rótulo que se sale del recuadro no se lee: se empuja hacia dentro
  // antes de buscarle hueco.
  if(_dclW){
    if(cx + w/2 > _dclW - 4) cx = _dclW - 4 - w/2;
    if(cx - w/2 < 4)         cx = 4 + w/2;
  }
  x = (anchor === 'middle') ? cx : cx - w/2;
  const dx0 = (dirX === undefined) ? 0 : dirX;
  const dy0 = (dirY === undefined) ? -1 : dirY;
  const cajas = _cajasDCL();
  // Se prueba primero alejándose en la dirección natural; si esa columna
  // está ocupada, se prueba desplazándose de lado, que casi siempre libera.
  for(let k = 0; k < 9; k++){
    for(const lado of (k === 0 ? [0] : [0, -1, 1, -2, 2])){
      const ox = dx0*(h+3)*k + lado*(w*0.55);
      const oy = dy0*(h+3)*k;
      const c = {x0:cx+ox-w/2, x1:cx+ox+w/2, y0:y+oy-h*0.8, y1:y+oy+h*0.3};
      if(_dclW && (c.x0 < 2 || c.x1 > _dclW-2)) continue;
      if(_dclH && (c.y0 < 2 || c.y1 > _dclH-2)) continue;
      const choca = cajas.some(q => c.x0 < q.x1 && c.x1 > q.x0 && c.y0 < q.y1 && c.y1 > q.y0);
      if(!choca){
        cajas.push(c);
        return fx(x+ox, y+oy, txt, col, tam, peso, anchor, ital);
      }
    }
  }
  return '';
}

function svgDCL(r, ti, sub){
  _dclCajas = [];
  _dclW = 0; _dclH = 0;        // se fijan en cuanto se conoce el viewBox
  // Ley de la carga variable de este subtramo, en la abscisa del grupo.
  const _seg = r.internas[ti];
  const _gg  = gruposDireccion(r).find(g=>g.tramos.indexOf(_seg) >= 0);
  const _simDCL = _gg ? _gg.simbolo : 'x';
  const _off = _gg ? (_seg.s0 - _gg.s0) : 0;
  const _leyes = _seg ? leyesDeCarga(_seg, sub, _off) : [];
  const _leyDCL = _leyes.length ? _leyes[0].c : null;
  // Reserva previa: los nombres de los nudos y el eje de la barra son
  // intocables. Al registrarlos antes que ningún rótulo, las etiquetas de
  // carga se ven obligadas a buscar hueco en otro sitio.
  const _reservar = (x0,y0,x1,y1)=>_cajasDCL().push(
    {x0:Math.min(x0,x1), x1:Math.max(x0,x1), y0:Math.min(y0,y1), y1:Math.max(y0,y1)});
  // Un trazo se reserva como una cadena de cajitas a lo largo de él: así el
  // colocador lo esquiva igual que esquiva otro rótulo.
  const _reservarTrazo = (x1,y1,x2,y2,ancho)=>{
    const w = ancho || 5, n = 8;
    for(let m=0;m<n;m++){
      const f0=m/n, f1=(m+1)/n;
      const ax=x1+(x2-x1)*f0, ay=y1+(y2-y1)*f0;
      const bx=x1+(x2-x1)*f1, by=y1+(y2-y1)*f1;
      _reservar(Math.min(ax,bx)-w, Math.min(ay,by)-w,
                Math.max(ax,bx)+w, Math.max(ay,by)+w);
    }
  };
  const _reservarArco = (cx,cy,rr)=>_reservar(cx-rr-3, cy-rr-3, cx+rr+3, cy+rr+3);
  const t = r.internas[ti];
  const sCut = sub.sa + 0.62*(sub.sb - sub.sa);
  const P = {x:t.desde.x + t.ux*sCut, y:t.desde.y + t.uy*sCut};
  const sCutG = t.s0 + sCut;

  const cadPts = [];
  for(let k2=0;k2<=ti;k2++) cadPts.push({x:r.internas[k2].desde.x, y:r.internas[k2].desde.y,
                                         nom:r.internas[k2].desde.nombre});
  const nodosInc = cadPts.slice();
  cadPts.push({x:P.x, y:P.y});

  const acciones = (r.internas.puntuales||[]).filter(o=>o.s!==null && o.s < sCutG - 1e-9);

  const distr = [];
  cargas.filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const pos = r.cad.findIndex(z=>z.t.id===c.tramo);
    if(pos < 0 || pos > ti) return;
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const el = r.internas[pos];
    const inv = (r.cad[pos].desde.id !== z.g.a.id);
    const r1 = inv ? (z.g.L - z.s2) : z.s1;
    const r2 = inv ? (z.g.L - z.s1) : z.s2;
    const hasta = (pos < ti) ? el.L : sCut;
    const corte = Math.min(r2, hasta);
    if(corte <= r1 + 1e-12) return;
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const wIni = inv ? w2 : w1, wFin0 = inv ? w1 : w2;
    const wEn = u => wIni + (wFin0-wIni)*((u-r1)/(r2-r1));
    const dd = dirCarga(c, z.g);   // sentido de la carga positiva, en el mundo
    distr.push({a:{x:el.desde.x+el.ux*r1, y:el.desde.y+el.uy*r1},
                b:{x:el.desde.x+el.ux*corte, y:el.desde.y+el.uy*corte},
                wa:wEn(r1), wb:wEn(corte), nwx:-dd.x, nwy:-dd.y, esT:c.tipo==='T',
                pos:pos});
  });

  // ── mundo → pantalla
  let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
  const mete = p => { minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x);
                      miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); };
  cadPts.forEach(mete); distr.forEach(d=>{ mete(d.a); mete(d.b); });
  const span = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 0);
  const W2=540, MX=64, MTOP=88, MBOT=108;   // sitio para las cotas escalonadas
  let kk = (W2-2*MX)/span;
  const H2 = Math.max(200, Math.min(320, MTOP+MBOT+spanY*kk));
  _dclW = W2; _dclH = H2;   // límites para que ningún rótulo se salga
  if(spanY > 1e-9) kk = Math.min(kk, (H2-MTOP-MBOT)/spanY);
  const cx0 = (W2-2*MX-span*kk)/2;
  const SX = x => MX + cx0 + (x-minx)*kk;
  const SY = y => H2 - MBOT - (y-miny)*kk;

  const AL = 34;
  const linea=(x1,y1,x2,y2,col,w,dash)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)
    +'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="'+w+'"'
    +(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha=(x1,y1,x2,y2,col,w)=>{
    const dx=x2-x1, dy=y2-y1, L3=Math.hypot(dx,dy)||1, ex=dx/L3, ey=dy/L3;
    const hx=x2-ex*9, hy=y2-ey*9, px=-ey, py=ex;
    return linea(x1,y1,hx,hy,col,w)
      +'<path d="M '+x2.toFixed(1)+' '+y2.toFixed(1)+' L '+(hx+px*4).toFixed(1)+' '+(hy+py*4).toFixed(1)
      +' L '+(hx-px*4).toFixed(1)+' '+(hy-py*4).toFixed(1)+' Z" fill="'+col+'"/>';
  };
  const texto=(x,y,txt,col,sz,peso,anc,it)=>'<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)
    +'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="'+(peso||600)
    +'" fill="'+col+'"'+(anc?' text-anchor="'+anc+'"':'')+(it?' font-style="italic"':'')+'>'+txt+'</text>';
  const arcoM=(cx,cy,rr,col,horario)=>{
    const a0=-35*Math.PI/180, a1=215*Math.PI/180;
    const x1=cx+rr*Math.cos(a0), y1=cy-rr*Math.sin(a0);
    const x2=cx+rr*Math.cos(a1), y2=cy-rr*Math.sin(a1);
    const sweep = horario ? 1 : 0;
    const fin = horario ? {x:x1,y:y1,tx:-Math.sin(a0),ty:-Math.cos(a0)}
                        : {x:x2,y:y2,tx:-Math.sin(a1),ty:-Math.cos(a1)};
    const ini = horario ? {x:x2,y:y2} : {x:x1,y:y1};
    let p='<path d="M '+ini.x.toFixed(1)+' '+ini.y.toFixed(1)+' A '+rr+' '+rr+' 0 1 '+sweep+' '
      +fin.x.toFixed(1)+' '+fin.y.toFixed(1)+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
    const s2 = horario ? -1 : 1;
    p += '<path d="M '+(fin.x+s2*fin.tx*8).toFixed(1)+' '+(fin.y-s2*fin.ty*8).toFixed(1)
      +' L '+(fin.x+3.5*fin.ty*s2).toFixed(1)+' '+(fin.y+3.5*fin.tx*s2).toFixed(1)
      +' L '+(fin.x-3.5*fin.ty*s2).toFixed(1)+' '+(fin.y-3.5*fin.tx*s2).toFixed(1)+' Z" fill="'+col+'"/>';
    return p;
  };

  let sv='<svg class="dcl-svg" viewBox="0 0 '+W2+' '+H2+'" xmlns="http://www.w3.org/2000/svg">';
  sv += '<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';

  // Reservas: nombre de cada nudo y franja del eje de la barra.
  nodosInc.forEach(nn=>{
    const cx = SX(nn.x), cy = SY(nn.y);
    _reservar(cx-13, cy+5, cx+7, cy+22);      // hueco del nombre, bajo el nudo
    _reservar(cx-7, cy-7, cx+7, cy+7);        // el propio círculo del nudo
  });
  for(let q=0;q<cadPts.length-1;q++){
    const x1=SX(cadPts[q].x), y1=SY(cadPts[q].y);
    const x2=SX(cadPts[q+1].x), y2=SY(cadPts[q+1].y);
    // franja estrecha a lo largo del eje: evita rótulos montados en la barra
    const pasos = 6;
    for(let m=0;m<pasos;m++){
      const f0=m/pasos, f1=(m+1)/pasos;
      _reservar(x1+(x2-x1)*f0, y1+(y2-y1)*f0 - 4,
                x1+(x2-x1)*f1, y1+(y2-y1)*f1 + 4);
    }
  }

  // ── distribuidas (detrás)
  const wmax = Math.max(1e-9, ...distr.map(d=>Math.max(Math.abs(d.wa),Math.abs(d.wb))));
  distr.forEach(d=>{
    const A={x:SX(d.a.x),y:SY(d.a.y)}, B={x:SX(d.b.x),y:SY(d.b.y)};
    const ox=d.nwx, oy=-d.nwy;   // contra-carga en pantalla (y invertida)
    // altura CON SIGNO: una intensidad negativa levanta el bloque al otro
    // lado y las flechas se invierten solas; si la ley cruza el cero, el
    // trapecio cruza la barra, que es exactamente lo que ocurre físicamente
    const ha=26*d.wa/wmax, hb=26*d.wb/wmax;
    const A2={x:A.x+ox*ha, y:A.y+oy*ha}, B2={x:B.x+ox*hb, y:B.y+oy*hb};
    sv += '<path d="M '+A.x.toFixed(1)+' '+A.y.toFixed(1)+' L '+B.x.toFixed(1)+' '+B.y.toFixed(1)
      +' L '+B2.x.toFixed(1)+' '+B2.y.toFixed(1)+' L '+A2.x.toFixed(1)+' '+A2.y.toFixed(1)
      +' Z" fill="#b8860b" fill-opacity=".14"/>';
    sv += linea(A2.x,A2.y,B2.x,B2.y,'#b8860b',1.8);
    const nf = 4;
    for(let q=0;q<=nf;q++){
      const f=q/nf;
      const bx=A.x+(B.x-A.x)*f, by=A.y+(B.y-A.y)*f;
      const hh=ha+(hb-ha)*f, sg=Math.sign(hh)||1;
      if(Math.abs(hh)>4) sv += flecha(bx+ox*hh, by+oy*hh, bx+ox*3*sg, by+oy*3*sg, '#b8860b', 1.6);
    }
    // Extremo de arranque: su valor numérico. Extremo del CORTE: si la carga
    // es variable se rotula la LEY w(r), que es el dato del que salen V y M;
    // un número suelto ahí no dice de dónde viene. Cada rótulo se aleja de
    // la barra por el lado en el que quedó su borde del bloque.
    const va = Math.sign(d.wa)||1, vb = Math.sign(d.wb)||1;
    sv += txtDCL(texto, A2.x, A2.y + (oy*va<0 ? -5 : 13), dec(Math.abs(d.wa),'f'),
                 '#8a6508', 9.5, 700, 'middle', false, 0, oy*va<0?-1:1);
    if(d.esT || Math.abs(d.wb-d.wa)>1e-9){
      const ley = _leyDCL && _leyDCL.length
        ? 'w('+_simDCL+') = '+polyPlano(_leyDCL, 'f', _simDCL)
        : dec(Math.abs(d.wb),'f');
      sv += txtDCL(texto, B2.x, B2.y + (oy*vb<0 ? -6 : 13), ley,
                   '#8a6508', 9.5, 700, 'middle', false, 0, oy*vb<0?-1:1);
    }
  });

  // ── barra
  for(let k2=0;k2<cadPts.length-1;k2++)
    sv += linea(SX(cadPts[k2].x),SY(cadPts[k2].y),SX(cadPts[k2+1].x),SY(cadPts[k2+1].y),'#26415e',4.6);

  // ── nudos incluidos
  nodosInc.forEach(nn=>{
    sv += '<circle cx="'+SX(nn.x).toFixed(1)+'" cy="'+SY(nn.y).toFixed(1)
      +'" r="4.4" fill="#fff" stroke="#26415e" stroke-width="2"/>';
    sv += texto(SX(nn.x)-9, SY(nn.y)+16, nn.nom, '#1b1f24', 11, 800);
  });

  // ── acciones puntuales
  acciones.forEach(o=>{
    const a=o.a, X=SX(a.x), Y=SY(a.y);
    const col = a.reac ? '#1a7f37' : (Math.abs(a.fx)+Math.abs(a.fy) < 1e-12 ? '#8b5cf6' : '#c62828');
    const Fm = Math.hypot(a.fx, a.fy);
    if(Fm > 1e-12){
      const ex=a.fx/Fm, ey=-a.fy/Fm;    // dirección de la fuerza en pantalla
      sv += flecha(X-ex*AL, Y-ey*AL, X-ex*4, Y-ey*4, col, 2.2);
      _reservarTrazo(X-ex*AL, Y-ey*AL, X-ex*4, Y-ey*4, 5);
      sv += txtDCL(texto, X-ex*(AL+8), Y-ey*(AL+8)+3, dec(Fm,'f'), col, 10, 800, 'middle', false, -ex, -ey);
    }
    if(Math.abs(a.m) > 1e-12){
      sv += arcoM(X, Y, 15, col, a.m < 0);
      _reservarArco(X, Y, 15);
      sv += txtDCL(texto, X+24, Y-18, dec(Math.abs(a.m),'mom'), col, 10, 800, undefined, false, 1, -1);
    }
  });

  // ── sección de corte: doble tick + N, V, M
  const uxs=t.ux, uys=-t.uy;                 // eje del tramo en pantalla
  const nxs=-t.uy, nys=-t.ux;                // normal n̂ en pantalla
  const PX=SX(P.x), PY=SY(P.y);
  sv += linea(PX+nxs*9+uxs*3, PY+nys*9+uys*3, PX-nxs*9+uxs*3, PY-nys*9+uys*3, '#0b57d0', 2);
  sv += linea(PX+nxs*9+uxs*7, PY+nys*9+uys*7, PX-nxs*9+uxs*7, PY-nys*9+uys*7, '#0b57d0', 2);
  sv += flecha(PX+uxs*10, PY+uys*10, PX+uxs*40, PY+uys*40, '#0b57d0', 2.2);
  _reservarTrazo(PX+uxs*10, PY+uys*10, PX+uxs*40, PY+uys*40, 5);
  sv += txtDCL(texto, PX+uxs*50, PY+uys*50+3, 'N', '#0b57d0', 12, 800, 'middle', true, uxs, uys);
  sv += flecha(PX, PY, PX-nxs*32, PY-nys*32, '#0b57d0', 2.2);
  _reservarTrazo(PX, PY, PX-nxs*32, PY-nys*32, 5);
  sv += txtDCL(texto, PX-nxs*44, PY-nys*44+3, 'V', '#0b57d0', 12, 800, 'middle', true, -nxs, -nys);
  sv += arcoM(PX-uxs*16, PY-uys*16, 12, '#0b57d0', false);
  _reservarArco(PX-uxs*16, PY-uys*16, 12);
  sv += txtDCL(texto, PX-uxs*16-20, PY-uys*16-16, 'M', '#0b57d0', 12, 800, 'middle', true, -uxs, -uys);

  // ══ Acotación del DCL, en niveles ══
  // Mismo criterio que el panel de dibujo: las cotas de las cargas se
  // reparten en escalones para que ninguna etiqueta pise a otra, y la
  // abscisa (r o x) va SIEMPRE en el nivel más exterior, porque es la que
  // resume todo el subtramo.
  const _g = gruposDireccion(r).find(g=>g.tramos.indexOf(t) >= 0);
  const orig = _g ? _g.desde : t.desde;
  const D0 = {x:SX(orig.x), y:SY(orig.y)};
  const dxU = PX - D0.x, dyU = PY - D0.y;
  const lU = Math.hypot(dxU, dyU) || 1;
  const ux = dxU/lU, uy = dyU/lU;
  // normal que apunta hacia abajo en pantalla (fuera de la viga)
  let nx = -uy, ny = ux;
  if(ny < 0){ nx = -nx; ny = -ny; }

  const SALTO = 13;                 // separación entre niveles
  const BASE_CARGAS = 24;           // primera cadena, pegada al eje
  let nivelesCargas = -1;           // -1 = no se dibujó cadena de cargas

  // ── Cadena de cargas (niveles interiores) ──
  const _s0g = _g ? _g.s0 : 0;
  const _rCut = sCutG - _s0g;
  const _pxPorU = lU / (_rCut || 1);
  const _marcas = [0, _rCut];
  acciones.forEach(o=>{
    if(o.s === null) return;
    const rr = o.s - _s0g;
    if(rr > 1e-6 && rr < _rCut - 1e-6) _marcas.push(rr);
  });
  distr.forEach(d=>{
    if(d.pos !== ti) return;        // solo las cargas de ESTE tramo
    [d.a, d.b].forEach(pt=>{
      const rr = Math.hypot(pt.x - orig.x, pt.y - orig.y);
      if(rr > 1e-6 && rr < _rCut - 1e-6) _marcas.push(rr);
    });
  });
  const _uniq = [...new Set(_marcas.map(v=>+v.toFixed(4)))].sort((p,q)=>p-q);

  if(_uniq.length > 2 && _rCut > 1e-6){
    // El planificador de cotas del panel sirve igual aquí: se le da la
    // posición en píxeles a lo largo del eje y el ancho del texto.
    const medir = txt => String(txt).length * 8.5 * 0.58 + 8;
    const plan = planCotas(_uniq, v => v*_pxPorU, medir,
                           {maxNiveles:3, minSeg:14, fusion:6, holgura:8});
    if(plan){
      nivelesCargas = plan.nMax;
      // Mismo lado que la cota de la abscisa, para que se escalonen: las
      // cargas en los niveles interiores y r/x en el exterior.
      const q = (vpx, sep)=>({x:D0.x + ux*vpx + nx*sep, y:D0.y + uy*vpx + ny*sep});
      const c0 = plan.coords[0]*_pxPorU, c1 = plan.coords[plan.coords.length-1]*_pxPorU;
      const e0 = q(c0, BASE_CARGAS), e1 = q(c1, BASE_CARGAS);
      sv += linea(e0.x, e0.y, e1.x, e1.y, '#b07d1a', 1.1);
      _reservarTrazo(e0.x, e0.y, e1.x, e1.y, 3);
      plan.coords.forEach(v=>{
        const p2 = q(v*_pxPorU, BASE_CARGAS);
        sv += linea(p2.x-(ux-nx)*4, p2.y-(uy-ny)*4, p2.x+(ux-nx)*4, p2.y+(uy-ny)*4, '#b07d1a', 1.2);
      });
      const _sim = _g ? _g.simbolo : 'x';
      plan.segs.forEach((sg, m)=>{
        if(!sg.visible) return;
        // El corte está en una posición GENÉRICA, así que la última cota no
        // puede ser un número: es lo que queda hasta el corte, o sea
        // r menos lo ya recorrido. Antes se rotulaba el valor numérico del
        // corte de muestra, que solo vale para esa posición concreta.
        const esUltima = (m === plan.segs.length - 1);
        const d0 = plan.coords[m];
        const txtSeg = esUltima
          ? (Math.abs(d0) < 1e-6 ? _sim : _sim + ' \u2212 ' + dec(d0,'len'))
          : sg.txt;
        const sep = BASE_CARGAS + 10 + sg.nivel*SALTO;
        const pm = q(sg.centro, sep);
        // línea guía fina cuando la etiqueta se aleja a un nivel superior
        if(sg.nivel > 0){
          const pa = q(sg.centro, BASE_CARGAS+3);
          sv += linea(pa.x, pa.y, pm.x-nx*5, pm.y-ny*5, 'rgba(176,125,26,.45)', .8);
        }
        // Pasa por el colocador: el reparto en niveles evita que choquen
        // entre sí, pero aún pueden tropezar con flechas o con otros rótulos.
        sv += txtDCL(texto, pm.x, pm.y+3, txtSeg, '#8a6508', 8.5, 700, 'middle',
                     false, nx, ny);
      });
    }
  }

  // ── Cota de la abscisa: SIEMPRE en el nivel más exterior ──
  const SEP = (nivelesCargas >= 0)
      ? BASE_CARGAS + 12 + (nivelesCargas+1)*SALTO + 20
      : 42;
  const tick = (qx, qy) => {
    const tx = (ux - nx)*5, ty = (uy - ny)*5;
    return linea(qx - tx, qy - ty, qx + tx, qy + ty, '#3c4652', 1.5);
  };
  const A1 = {x:D0.x + nx*SEP, y:D0.y + ny*SEP};
  const B1 = {x:PX  + nx*SEP, y:PY  + ny*SEP};
  sv += linea(D0.x + nx*8, D0.y + ny*8, A1.x + nx*5, A1.y + ny*5, '#8892a0', 1, '3,3');
  sv += linea(PX + nx*8, PY + ny*8, B1.x + nx*5, B1.y + ny*5, '#8892a0', 1, '3,3');
  sv += linea(A1.x, A1.y, B1.x, B1.y, '#3c4652', 1.3);
  sv += tick(A1.x, A1.y); sv += tick(B1.x, B1.y);
  _reservarTrazo(A1.x, A1.y, B1.x, B1.y, 4);
  const mx = (A1.x+B1.x)/2, my = (A1.y+B1.y)/2;
  sv += '<rect x="'+(mx-9).toFixed(1)+'" y="'+(my-8).toFixed(1)
      + '" width="18" height="16" fill="#fff"/>';
  sv += texto(mx, my+4, _g ? _g.simbolo : 'x', '#3c4652', 12, 700, 'middle', true);

  return sv;
}

// ── x global ──
// Los polinomios se obtienen con x medida desde el arranque del TRAMO. Para
// mostrarlos con la x global de la viga hay que sustituir x -> (X - s0) y
// volver a desarrollar; si solo se cambiara el rango, la ecuación mostrada
// no correspondería a ese rango.
function desplazarPoly(c, s0){
  const n = c.length, out = new Array(n).fill(0);
  const comb = (a,b)=>{ let r=1; for(let i=0;i<b;i++) r = r*(a-i)/(i+1); return r; };
  for(let k=0;k<n;k++){
    if(!c[k]) continue;
    // c[k]·(X - s0)^k  =  c[k]·Σ_j C(k,j)·X^j·(-s0)^(k-j)
    for(let j=0;j<=k;j++)
      out[j] += c[k]*comb(k,j)*Math.pow(-s0, k-j);
  }
  const m = Math.max(1, ...out.map(v=>Math.abs(v)));
  return out.map(v => Math.abs(v) < 1e-9*m ? 0 : v);
}

// Raíces reales de un polinomio (grado <= 3) dentro de [a,b].
// Se localizan por cambio de signo sobre un muestreo fino y se afinan por
// bisección: es robusto para los grados que aparecen aquí y no depende de
// fórmulas cerradas que se degradan numéricamente.
function raicesEn(c, a, b){
  const f = x => polyVal(c, x);
  const esCero = c.every(v=>Math.abs(v) < 1e-12);
  if(esCero) return [];
  const raices = [], N = 400;
  const tol = 1e-7 * Math.max(1, Math.abs(b-a));
  let xa = a, fa = f(a);
  if(Math.abs(fa) < 1e-9) raices.push(a);
  for(let i=1;i<=N;i++){
    const xb = a + (b-a)*i/N, fb = f(xb);
    if(fa === 0 || fb === 0 || fa*fb < 0){
      let lo = xa, hi = xb, flo = fa;
      for(let k=0;k<80 && (hi-lo) > tol;k++){
        const mid = (lo+hi)/2, fm = f(mid);
        if(flo*fm <= 0) hi = mid; else { lo = mid; flo = fm; }
      }
      const raiz = (lo+hi)/2;
      if(!raices.some(v=>Math.abs(v-raiz) < 1e-6*Math.max(1,Math.abs(b-a)))) raices.push(raiz);
    }
    xa = xb; fa = fb;
  }
  return raices.filter(v => v >= a-tol && v <= b+tol);
}

// ── Punto donde el momento se anula dentro del subtramo ──
// Se informa en la MISMA x global que el resto del bloque. Los extremos que
// ya valen cero no se anuncian como "corte": son el arranque o el final del
// subtramo y el alumno ya los ve en la línea de arriba.
function ceroDeMomento(sub, off, sb){
  const raices = raicesEn(sub.cM, sub.sa, sub.sb);
  const dentro = raices.filter(x =>
    x > sub.sa + 1e-6*(sub.sb-sub.sa) && x < sub.sb - 1e-6*(sub.sb-sub.sa));
  const extremoCero = [sub.sa, sub.sb].filter(x => Math.abs(polyVal(sub.cM,x)) < 1e-7);
  if(!dentro.length){
    if(extremoCero.length)
      return '<br><span style="color:#8b5cf6">M se anula en el '
        + (Math.abs(extremoCero[0]-sub.sa)<1e-9 ? 'inicio' : 'final')
        + ' del subtramo · ' + sb + ' = <b>' + dec(off + extremoCero[0],'len') + '</b> ' + unitLen + '</span>';
    return '<br><span style="color:#66727e">El momento no se anula dentro de este subtramo.</span>';
  }
  return '<br><span style="color:#8b5cf6">M = 0 en ' + sb + ' = <b>'
    + dentro.map(x=>dec(off + x,'len')).join('</b> y <b>')
    + '</b> ' + unitLen + ' (medida desde el punto de quiebre del tramo)</span>';
}
