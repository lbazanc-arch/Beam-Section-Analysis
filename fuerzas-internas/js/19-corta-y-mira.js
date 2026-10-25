// ═══════════════════════════════════════════════════════════
//  CORTA Y MIRA (propuesta 3, 2026-09-08)
//  Con la herramienta «Corta y mira», tocar un punto de la viga aísla el
//  trozo que queda a la IZQUIERDA del corte (en el sentido del recorrido de
//  la cadena) y dibuja su DCL: las cargas y reacciones de ese trozo, N, V y
//  M en la sección en el sentido positivo del convenio, y el brazo de cada
//  fuerza acotado desde el corte (R10). Es la maniobra que el libro enseña
//  primero (Hibbeler §7.1) y la que el alumno repite en el examen. Los
//  valores salen de los mismos polinomios que los diagramas.
// ═══════════════════════════════════════════════════════════
let _corteActual = null;

// Un toque en el lienzo (herramienta 'corte'): se lleva al tramo y se corta.
function abrirCorteEn(t, mx, my){
  const [wx,wy] = aMundo(mx, my);
  abrirCorteMundo(t, wx, wy, false);
}
// El corte en un punto del mundo sobre el tramo t. Con «exacto» (punto escrito
// en la ventana) la sección queda donde se pidió; con un toque se aparta un 3 %
// de los nudos, que la punta del dedo no distingue.
function abrirCorteMundo(t, wx, wy, exacto){
  // Si la viga aún no está calculada (o cambió), se calcula aquí: el corte se
  // lee sobre la viga resuelta y pedir antes Calcular era un paso de más.
  if(!R || R.error || !R.internas) calcular();
  if(!R || R.error || !R.internas){ aviso('La viga no se puede resolver todavía: revisa el mensaje de Calcular.', 'error'); return; }
  const ti = R.internas.find(x=>x.tramo.id === t.id);
  if(!ti){ aviso('Ese tramo no forma parte de la cadena resuelta.', 'error'); return; }
  // ux, uy ya vienen orientados en el sentido del recorrido de la cadena
  const ux = ti.ux, uy = ti.uy;
  let s = (wx - ti.desde.x)*ux + (wy - ti.desde.y)*uy;
  // En un tramo curvo, el punto se lleva al arco por su ángulo desde el centro.
  if(ti.arco){
    const ar = ti.arco;
    let phi = ar.sg*(Math.atan2(wy - ar.cy, wx - ar.cx) - ar.a0);
    phi = ((phi % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    const tot = ti.L/ar.R;
    if(phi > tot) phi = (phi - tot < 2*Math.PI - phi) ? tot : 0;   // fuera del arco: al extremo más cercano
    s = ar.R*phi;
  }
  // nunca exactamente sobre un nudo: ahí la sección no está definida
  const m0 = exacto ? 1e-9 : 0.03;
  s = Math.max(m0*ti.L, Math.min((1-m0)*ti.L, s));
  // El lado elegido se conserva de un corte al siguiente.
  _corteActual = {tramoId:t.id, s, lado:(_corteActual && _corteActual.lado) || 'izq'};
  pintarCorte();
  const m = document.getElementById('corteModal');
  if(m) m.classList.add('show');
}
// «Lado izquierdo» / «Lado derecho» de la ventana del DCL.
function corteLado(l){
  if(!_corteActual) return;
  _corteActual.lado = l;
  pintarCorte();
}
function pintarCorte(){
  const c = _corteActual;
  if(!c || !R || !R.internas) return;
  const ti = R.internas.find(x=>x.tramo.id === c.tramoId);
  if(!ti) return;
  const s = c.s, der = (c.lado === 'der');
  const sub = document.getElementById('corteSub');
  const cuerpo = document.getElementById('corteCuerpo');
  const info = datosCorte(R, ti, s, c.lado);
  // Los botones dicen qué trozo es cada lado: del arranque de la cadena al
  // corte, y del corte a su final (en un tramo vertical «izquierda» no dice nada).
  const cadC = cadDe(R, ti);
  const ini = cadC[0].desde.nombre, fin = cadC[cadC.length-1].hasta.nombre;
  const bi = document.getElementById('corteLadoIzq'), bd = document.getElementById('corteLadoDer');
  if(bi){ bi.innerHTML = 'Lado izquierdo <small>(' + ini + ' → corte)</small>'; bi.classList.toggle('active', !der); }
  if(bd){ bd.innerHTML = 'Lado derecho <small>(corte → ' + fin + ')</small>'; bd.classList.toggle('active', der); }
  const cc = cadenaDe(R, ti);
  if(sub) sub.innerHTML = 'Sección en <b>(' + dec(info.P.x,'len') + '; ' + dec(info.P.y,'len') + ')</b>, '
    + (ti.arco ? 'en <b>θ = ' + dec(s/ti.arco.R*180/Math.PI,'ang') + '°</b> desde ' + ti.desde.nombre + ' sobre el arco '
               : 'a <b>' + dec(s,'len') + ' ' + unitLen + '</b> de ' + ti.desde.nombre + ' sobre el tramo ')
    + ti.desde.nombre + ti.hasta.nombre
    + (ti.cadena ? '. ' : ' (abscisa global ' + dec(ti.s0 + s,'len') + ' ' + unitLen + '). ')
    + 'Se conserva el trozo ' + (der ? 'a la derecha' : 'a la izquierda') + ' del corte y en la cara cortada se ponen N, V y M en el sentido positivo del convenio; '
    + 'el signo del valor dice el sentido real.'
    + (der && cc.union ? ' En ' + cc.union.nombre + ' actúa el resto de la estructura (naranja).' : '');
  if(cuerpo) cuerpo.innerHTML = svgDCLCorte(R, ti, s, info) + htmlEcuacionesCorte(info);
  try{ renderKatex(cuerpo); }catch(e){}
}
function cerrarCorte(){ const m = document.getElementById('corteModal'); if(m) m.classList.remove('show'); }

// ── Todo lo que actúa sobre el trozo elegido, en coordenadas del mundo ──
// lado 'izq': de donde arranca la cadena hasta el corte (el trozo con el que
// el motor calcula N, V y M); lado 'der': del corte al final de la cadena. Si
// la cadena es una rama (01-), su final es el nudo de unión y ahí actúa el
// resto de la estructura: lo contrario de lo que la rama le transmite.
function datosCorte(r, ti, s, lado){
  const der = (lado === 'der');
  // Ejes del corte: los del tramo o, en un arco (23-), la tangente y la normal
  // de ese punto.
  const PA = ti.arco ? puntoArcoRec(ti.arco, s) : null;
  const ux = PA ? PA.ux : ti.ux, uy = PA ? PA.uy : ti.uy;
  const nx = -uy, ny = ux;
  const P = PA ? {x:PA.x, y:PA.y} : {x:ti.desde.x + ux*s, y:ti.desde.y + uy*s};
  const sGlobal = ti.s0 + s;
  // N, V, M en la sección, de la ley del subtramo que la contiene
  const sub = ti.subs.find(q=>s >= q.sa - 1e-9 && s <= q.sb + 1e-9) || ti.subs[ti.subs.length-1];
  const N = valorSub(sub, 'N', s), V = valorSub(sub, 'V', s), M = valorSub(sub, 'M', s);
  // acciones puntuales (cargas, pares y reacciones) del trozo
  // Todo dentro de la cadena del tramo (01-): una rama llega como la acción que
  // transmite en su nudo de unión, que está entre los puntuales.
  const cadC = cadDe(r, ti);
  const puntuales = puntualesDe(r, ti).filter(o=>o.s !== null && (der ? o.s >= sGlobal - 1e-9 : o.s < sGlobal - 1e-9)).map(o=>o.a);
  const cc = cadenaDe(r, ti);
  if(der && cc.union && cc.equivalente){
    const q = cc.equivalente;
    puntuales.push({x:q.x, y:q.y, fx:-q.fx, fy:-q.fy, m:-q.m, resto:{nudo:cc.union, tramo:q.rama.nombre}});
  }
  // cargas repartidas: la parte del trozo cargado que cae en el trozo
  const posActual = cadC.findIndex(x=>x.t.id === ti.tramo.id);
  const repartidas = [];
  let Fx = 0, Fy = 0, Mo = 0;
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const posTramo = cadC.findIndex(x=>x.t.id===c.tramo);
    if(posTramo < 0 || (der ? posTramo < posActual : posTramo > posActual)) return;
    const gc = z.g;
    const inv = (cadC[posTramo].desde.id !== gc.a.id);
    const r1 = inv ? (gc.L - z.s2) : z.s1;
    const r2 = inv ? (gc.L - z.s1) : z.s2;
    // la parte del tramo que es del trozo, en la abscisa del recorrido
    const lo = (der && posTramo === posActual) ? s : 0;
    const hi = (!der && posTramo === posActual) ? s : gc.L;
    const ua = Math.max(r1, lo), ub = Math.min(r2, hi);
    if(ub <= ua + 1e-12) return;
    // Sobre un arco (23-): se integra la parte del trozo y se dibuja muestreada.
    if(gc.arco){
      const a = inv ? gc.L - ub : ua, b = inv ? gc.L - ua : ub;
      const rr = fuerzaRepartidaArco(c, z, a, b, P);
      Fx += rr.Fx; Fy += rr.Fy; Mo += rr.Mo;
      const pts = [];
      for(let i=0;i<=8;i++){
        const sT = a + (b - a)*i/8, Q = puntoEnTramo(gc, sT), d = dirRepartidaArco(c, gc, sT);
        pts.push({x:Q.x, y:Q.y, dx:d.x, dy:d.y, w:wRepartidaEn(c, z, sT)});
      }
      const Fm = Math.hypot(rr.Fx, rr.Fy);
      repartidas.push({arco:true, pts, a:pts[0], b:pts[pts.length-1], wa:pts[0].w, wb:pts[pts.length-1].w,
        dd:Fm > 1e-12 ? {x:rr.Fx/Fm, y:rr.Fy/Fm} : {x:0, y:-1}, Fp:Fm, esT:c.tipo==='T',
        recortada: der ? ua > r1 + 1e-9 : ub < r2 - 1e-9, res:_puntoResultanteArco(gc, a, b, P, rr)});
      return;
    }
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const wIni = inv ? w2 : w1, wFinT = inv ? w1 : w2;
    const largo = r2 - r1;
    const wEn = u => wIni + (wFinT-wIni)*((u-r1)/largo);
    const wa = wEn(ua), wb = wEn(ub);
    const trozo = ub - ua;
    const Fp = (wa+wb)/2*trozo;                        // ∫w du
    const I1 = ua*Fp + trozo*trozo*(wa+2*wb)/6;        // ∫u·w du
    const origen = cadC[posTramo].desde;
    const dirx = inv ? -gc.ux : gc.ux, diry = inv ? -gc.uy : gc.uy;
    const dd = dirCarga(c, gc);
    // Momento respecto del corte con las integrales, como el motor (03-): con
    // un trapecio que cambia de signo el área puede ser nula y el par no.
    Fx += Fp*dd.x; Fy += Fp*dd.y;
    Mo += ((origen.x-P.x)*dd.y - (origen.y-P.y)*dd.x)*Fp + (dirx*dd.y - diry*dd.x)*I1;
    const uc = (Math.abs(Fp) > 1e-12) ? I1/Fp : (ua + ub)/2;
    repartidas.push({a:{x:origen.x + dirx*ua, y:origen.y + diry*ua}, b:{x:origen.x + dirx*ub, y:origen.y + diry*ub},
      wa, wb, dd, Fp, esT:c.tipo==='T', recortada: der ? ua > r1 + 1e-9 : ub < r2 - 1e-9,
      res:{x:origen.x + dirx*uc, y:origen.y + diry*uc}, dirx, diry});
  });
  // comprobación: ΣF_u, ΣF_n y ΣM_P del trozo con las fuerzas de la cara
  puntuales.forEach(a=>{ Fx += a.fx; Fy += a.fy; Mo += (a.x-P.x)*a.fy - (a.y-P.y)*a.fx + (a.m||0); });
  // Fuerzas de la cara en el sentido positivo del convenio. Trozo izquierdo:
  // N a lo largo de +u, V de −n y M antihorario. Trozo derecho, lo contrario.
  const sg = der ? -1 : 1;
  const resU = Fx*ux + Fy*uy + sg*N, resN = Fx*nx + Fy*ny - sg*V, resM = Mo + sg*M;
  // F: la suma de lo que actúa sobre el trozo (Mo respecto de P), sin la cara.
  return {P, ux, uy, nx, ny, s, sGlobal, N, V, M, puntuales, repartidas, resU, resN, resM, ti, lado:der ? 'der' : 'izq',
          F:{x:Fx, y:Fy, M:Mo}};
}

// Dónde se dibuja la resultante de la parte [a, b] de una repartida sobre un
// arco: el punto del arco por el que pasa su línea de acción (la que da su
// momento Mo respecto de P) o, si no lo corta, el pie de la perpendicular desde
// el punto medio de la parte. Cualquiera de los dos da el mismo momento.
function _puntoResultanteArco(g, a, b, P, rr){
  const F = Math.hypot(rr.Fx, rr.Fy), Pm = puntoEnTramo(g, (a + b)/2);
  if(F < 1e-12) return {x:Pm.x, y:Pm.y};
  // distancia con signo de un punto a la línea de acción
  const dist = Q => ((Q.x - P.x)*rr.Fy - (Q.y - P.y)*rr.Fx - rr.Mo)/F;
  let mejor = null, dPrev = null, sPrev = a;
  for(let i=0;i<=48;i++){
    const sT = a + (b - a)*i/48, Q = puntoEnTramo(g, sT), d = dist(Q);
    if(dPrev !== null && dPrev*d <= 0){
      // bisección entre sPrev y sT
      let s1 = sPrev, s2 = sT, d1 = dPrev;
      for(let k=0;k<40;k++){ const sm = (s1 + s2)/2, dm = dist(puntoEnTramo(g, sm)); if(d1*dm <= 0) s2 = sm; else { s1 = sm; d1 = dm; } }
      const Qm = puntoEnTramo(g, (s1 + s2)/2);
      mejor = {x:Qm.x, y:Qm.y}; break;
    }
    dPrev = d; sPrev = sT;
  }
  if(mejor) return mejor;
  const d = dist(Pm);
  return {x:Pm.x - d*rr.Fy/F, y:Pm.y + d*rr.Fx/F};
}

// ── El DCL del trozo, en SVG (mismo trazo que el DCL global de la ventana de diagramas) ──
function svgDCLCorte(r, ti, s, info){
  const F1 = n => n.toFixed(1);
  const P = info.P;
  const der = (info.lado === 'der');
  // ámbito: los nudos del trozo, el corte y las cargas
  const cadC = cadDe(r, ti);
  const posActual = cadC.findIndex(x=>x.t.id === ti.tramo.id);
  const enTrozo = i => der ? i >= posActual : i <= posActual;
  const nudosTrozo = [];
  cadC.forEach((e,i)=>{
    if(!enTrozo(i)) return;
    const n = der ? e.hasta : e.desde;
    if(!nudosTrozo.some(q=>q.id===n.id)) nudosTrozo.push(n);
  });
  // Las cotas miden, en horizontal y en vertical, los puntos que intervienen
  // en ΣM del corte: el corte, los nudos, el punto de cada fuerza y los bordes
  // y la resultante de cada repartida (como las cotas del lienzo).
  const ptsCota = cotaPuntosCorte(info, nudosTrozo);
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  const mete = (x,y)=>{ minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); };
  ptsCota.forEach(q=>mete(q.x,q.y));
  info.puntuales.forEach(a=>mete(a.x,a.y));
  // un arco puede salirse de sus nudos: entra entero en el encuadre
  const segsA = cadenaDe(r, ti);
  cadC.forEach((e,i)=>{
    const sg2 = segsA[i];
    if(!enTrozo(i) || !sg2 || !sg2.arco) return;
    const u0 = (der && i === posActual) ? s : 0, u1 = (!der && i === posActual) ? s : sg2.L;
    for(let k=0;k<=24;k++){ const q = puntoArcoRec(sg2.arco, u0 + (u1 - u0)*k/24); mete(q.x, q.y); }
  });
  info.repartidas.forEach(d=>{ if(d.arco) d.pts.forEach(q=>mete(q.x, q.y)); });
  const span0 = Math.max(maxx-minx, maxy-miny, 1e-6);
  const unicos = v => { const o = v.slice().sort((p,q)=>p-q), u = [];
    o.forEach(z=>{ if(!u.length || z - u[u.length-1] > 1e-6*span0) u.push(z); }); return u; };
  const cotX = unicos(ptsCota.map(q=>q.x)), cotY = unicos(ptsCota.map(q=>q.y));
  const span = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 0);
  // Margen de las cotas: abajo la horizontal y su total; a la derecha la vertical.
  const wLabY = (cotY.length > 1) ? Math.max(...cotY.map((y,i)=>_anchoCota(dec(i ? y - cotY[i-1] : cotY[cotY.length-1] - cotY[0],'len')))) : 0;
  const W2 = 700, MX = 90, MXD = (cotY.length > 1) ? 100 + 3*wLabY : 90, MTOP = 96, MBOT = (cotX.length > 1) ? 150 : 96;
  let kk = (W2 - MX - MXD)/span;
  const H2 = Math.max(250, Math.min((cotX.length > 1) ? 440 : 380, MTOP + MBOT + spanY*kk));
  if(spanY > 1e-9) kk = Math.min(kk, (H2 - MTOP - MBOT)/spanY);
  const cx0 = (W2 - MX - MXD - span*kk)/2;
  const SX = x => MX + cx0 + (x - minx)*kk;
  const SY = y => H2 - MBOT - (y - miny)*kk;
  const linea = (x1,y1,x2,y2,col,w,dash)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)+'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha = (x1,y1,x2,y2,col,w)=>{
    const dx=x2-x1, dy=y2-y1, L3=Math.hypot(dx,dy)||1, ex=dx/L3, ey=dy/L3;
    const hx=x2-ex*9, hy=y2-ey*9, px=-ey, py=ex;
    return linea(x1,y1,hx,hy,col,w)+'<path d="M '+F1(x2)+' '+F1(y2)+' L '+F1(hx+px*4)+' '+F1(hy+py*4)+' L '+F1(hx-px*4)+' '+F1(hy-py*4)+' Z" fill="'+col+'"/>';
  };
  const textoSVG = (x,y,txt,col,sz,peso,anc,it)=>'<text x="'+F1(x)+'" y="'+F1(y)+'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="'+(peso||600)+'" fill="'+col+'"'+(anc?' text-anchor="'+anc+'"':'')+(it?' font-style="italic"':'')+'>'+txt+'</text>';
  // Cada rótulo anota hasta dónde llega (a la derecha y abajo): las cotas se
  // ponen pasado todo lo escrito, para que su línea no cruce un valor.
  const ext = {der:-Infinity, abajo:-Infinity};
  const texto = (x,y,txt,col,sz,peso,anc,it)=>{
    const w = 0.6*(sz||10)*String(txt).length;
    ext.der = Math.max(ext.der, anc === 'end' ? x : (anc === 'middle' ? x + w/2 : x + w));
    ext.abajo = Math.max(ext.abajo, y + 3);
    return textoSVG(x,y,txt,col,sz,peso,anc,it);
  };
  const arcoM = (cx,cy,rr,col,horario)=>{
    const a0=-35*Math.PI/180, a1=215*Math.PI/180;
    const x1=cx+rr*Math.cos(a0), y1=cy-rr*Math.sin(a0);
    const x2=cx+rr*Math.cos(a1), y2=cy-rr*Math.sin(a1);
    const sweep = horario ? 1 : 0;
    const fin = horario ? {x:x1,y:y1,tx:-Math.sin(a0),ty:-Math.cos(a0)} : {x:x2,y:y2,tx:-Math.sin(a1),ty:-Math.cos(a1)};
    const ini = horario ? {x:x2,y:y2} : {x:x1,y:y1};
    let p='<path d="M '+F1(ini.x)+' '+F1(ini.y)+' A '+rr+' '+rr+' 0 1 '+sweep+' '+F1(fin.x)+' '+F1(fin.y)+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
    const s2 = horario ? -1 : 1;
    p += '<path d="M '+F1(fin.x+s2*fin.tx*8)+' '+F1(fin.y-s2*fin.ty*8)+' L '+F1(fin.x+3.5*fin.ty*s2)+' '+F1(fin.y+3.5*fin.tx*s2)+' L '+F1(fin.x-3.5*fin.ty*s2)+' '+F1(fin.y-3.5*fin.tx*s2)+' Z" fill="'+col+'"/>';
    return p;
  };
  let sv = '';
  // repartidas recortadas, detrás de la barra
  const wmax = Math.max(1e-9, ...info.repartidas.map(d=>Math.max(Math.abs(d.wa),Math.abs(d.wb))));
  info.repartidas.forEach(d=>{
    if(d.arco){
      // sobre un arco: flechas en cada punto muestreado y la línea de sus colas
      const base = d.pts.map(p=>({x:SX(p.x), y:SY(p.y)}));
      const colas = d.pts.map((p,i)=>{ const h = 26*p.w/wmax; return {x:base[i].x - p.dx*h, y:base[i].y + p.dy*h}; });
      sv += '<path d="M '+base.map(q=>F1(q.x)+' '+F1(q.y)).join(' L ')+' L '+colas.slice().reverse().map(q=>F1(q.x)+' '+F1(q.y)).join(' L ')+' Z" fill="#b8860b" fill-opacity=".14"/>';
      sv += '<polyline points="'+colas.map(q=>F1(q.x)+','+F1(q.y)).join(' ')+'" fill="none" stroke="#b8860b" stroke-width="1.8"/>';
      d.pts.forEach((p,i)=>{
        if(i % 2) return;
        const c = colas[i], X = base[i].x, Y = base[i].y, h = Math.hypot(c.x - X, c.y - Y);
        if(h > 4) sv += flecha(c.x, c.y, X + (c.x - X)/h*3, Y + (c.y - Y)/h*3, '#b8860b', 1.6);
      });
      const ca = colas[0], cb = colas[colas.length-1];
      if(Math.abs(d.wa) > 5e-9) sv += texto(ca.x, ca.y - 5, dec(Math.abs(d.wa),'f'), '#8a6508', 9.5, 700, 'middle');
      if(Math.abs(d.wb) > 5e-9 && (d.esT || d.recortada || Math.abs(d.wb-d.wa) > 1e-9)) sv += texto(cb.x, cb.y - 5, dec(Math.abs(d.wb),'f'), '#8a6508', 9.5, 700, 'middle');
      if(d.Fp > 1e-12){
        const Rx = SX(d.res.x), Ry = SY(d.res.y), ex = d.dd.x, ey = -d.dd.y;
        sv += flecha(Rx-ex*40, Ry-ey*40, Rx-ex*4, Ry-ey*4, '#8a6508', 1.4);
        sv += texto(Rx-ex*50, Ry-ey*50+3, dec(d.Fp,'f'), '#8a6508', 9.5, 700, 'middle', true);
      }
      return;
    }
    const A={x:SX(d.a.x),y:SY(d.a.y)}, B={x:SX(d.b.x),y:SY(d.b.y)};
    const ox=-d.dd.x, oy=d.dd.y;
    const ha=26*d.wa/wmax, hb=26*d.wb/wmax;
    const A2={x:A.x+ox*ha, y:A.y+oy*ha}, B2={x:B.x+ox*hb, y:B.y+oy*hb};
    sv += '<path d="M '+F1(A.x)+' '+F1(A.y)+' L '+F1(B.x)+' '+F1(B.y)+' L '+F1(B2.x)+' '+F1(B2.y)+' L '+F1(A2.x)+' '+F1(A2.y)+' Z" fill="#b8860b" fill-opacity=".14"/>';
    sv += linea(A2.x,A2.y,B2.x,B2.y,'#b8860b',1.8);
    for(let q=0;q<=4;q++){
      const f=q/4, bx=A.x+(B.x-A.x)*f, by=A.y+(B.y-A.y)*f, hh=ha+(hb-ha)*f, sg=Math.sign(hh)||1;
      if(Math.abs(hh)>4) sv += flecha(bx+ox*hh, by+oy*hh, bx+ox*3*sg, by+oy*3*sg, '#b8860b', 1.6);
    }
    if(Math.abs(d.wa) > 5e-9) sv += texto(A2.x, A2.y + (oy<0 ? -5 : 13), dec(Math.abs(d.wa),'f'), '#8a6508', 9.5, 700, 'middle');
    if(Math.abs(d.wb) > 5e-9 && (d.esT || d.recortada || Math.abs(d.wb-d.wa) > 1e-9)) sv += texto(B2.x, B2.y + (oy<0 ? -5 : 13), dec(Math.abs(d.wb),'f'), '#8a6508', 9.5, 700, 'middle');
    // resultante del bloque (a trazos) y su brazo desde el corte
    const Rx = SX(d.res.x), Ry = SY(d.res.y);
    const ex = d.dd.x*Math.sign(d.Fp||1), ey = -d.dd.y*Math.sign(d.Fp||1);
    sv += flecha(Rx-ex*40, Ry-ey*40, Rx-ex*4, Ry-ey*4, '#8a6508', 1.4);
    sv += texto(Rx-ex*50, Ry-ey*50+3, dec(Math.abs(d.Fp),'f'), '#8a6508', 9.5, 700, 'middle', true);
  });
  // barra del trozo
  const segsC = cadenaDe(r, ti);
  cadC.forEach((e,i)=>{
    if(!enTrozo(i)) return;
    const sg2 = segsC[i];
    if(sg2 && sg2.arco){
      // el arco, muestreado, entre los extremos que son del trozo
      const u0 = (der && i === posActual) ? s : 0, u1 = (!der && i === posActual) ? s : sg2.L;
      const n = Math.max(2, Math.ceil(32*(u1 - u0)/Math.max(sg2.L, 1e-9)));
      const pts = Array.from({length:n + 1}, (_, k)=>puntoArcoRec(sg2.arco, u0 + (u1 - u0)*k/n));
      sv += '<polyline points="'+pts.map(q=>F1(SX(q.x))+','+F1(SY(q.y))).join(' ')+'" fill="none" stroke="#26415e" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>';
      return;
    }
    const ini = (der && i === posActual) ? P : e.desde;
    const fin = (!der && i === posActual) ? P : e.hasta;
    sv += linea(SX(ini.x), SY(ini.y), SX(fin.x), SY(fin.y), '#26415e', 4.6);
  });
  // cara cortada: marca perpendicular
  const cx = SX(P.x), cy = SY(P.y);
  const pnx = info.nx, pny = -info.ny;       // normal n̂ en pantalla
  const pux = info.ux, puy = -info.uy;       // eje u en pantalla
  sv += linea(cx+pnx*12, cy+pny*12, cx-pnx*12, cy-pny*12, '#d94f5c', 3);
  // nudos
  nudosTrozo.forEach(n=>{
    sv += '<circle cx="'+F1(SX(n.x))+'" cy="'+F1(SY(n.y))+'" r="4.4" fill="'+(n.rotula?'#fff':'#26415e')+'" stroke="#26415e" stroke-width="2"/>';
    sv += texto(SX(n.x)-9, SY(n.y)+17, n.nombre, '#1b1f24', 11, 800);
  });
  // cargas puntuales, pares y reacciones (sentido real, nombre completo)
  info.puntuales.forEach(a=>{
    const X = SX(a.x), Y = SY(a.y);
    const Fm = Math.hypot(a.fx, a.fy);
    // Lo que transmite una rama (01-) va en naranja y con su nombre; también
    // lo que el resto de la estructura hace sobre una rama (lado derecho).
    const col = a.reac ? '#1a7f37' : ((a.rama || a.resto) ? COL_RAMA : '#c62828');
    if(Fm > 1e-12){
      const ex=a.fx/Fm, ey=-a.fy/Fm;
      sv += flecha(X-ex*38, Y-ey*38, X-ex*5, Y-ey*5, col, 2.2);
      const nom = a.reac ? (a.inc ? nombreAccion(a).tex.replace(/[{}]/g,'').replace('_','') : 'R') + ' = '
                : (a.rama ? 'F' + a.rama.nombre + ' = ' : (a.resto ? 'F' + a.resto.nudo.nombre + ' (resto) = ' : ''));
      // El rótulo, pasada la cola: si la flecha es más bien horizontal va al
      // lado (centrado encima de ella la tapaba); si es vertical, centrado.
      if(Math.abs(ex) >= 0.3) sv += texto(X-ex*44, Y-ey*44+3.5, nom + dec(Fm,'f'), col, 10, 800, ex > 0 ? 'end' : 'start');
      else sv += texto(X-ex*50 + 16, Y-ey*50+3, nom + dec(Fm,'f'), col, 10, 800, 'middle');
    }
    if(Math.abs(a.m) > 1e-12){
      const colM = a.reac ? '#1a7f37' : ((a.rama || a.resto) ? COL_RAMA : '#8b5cf6');
      sv += arcoM(X, Y, 15, colM, a.m < 0);
      sv += texto(X+22, Y-18, (a.reac ? 'M = ' : (a.rama ? 'M' + a.rama.nombre + ' = ' : (a.resto ? 'M' + a.resto.nudo.nombre + ' (resto) = ' : ''))) + dec(Math.abs(a.m),'mom'), colM, 10, 800);
    }
  });
  // N, V, M en la cara, en el sentido positivo del convenio. El trozo derecho
  // queda del lado +û, así que su cara mira a −û: N hacia −û, V hacia +n̂ y M
  // horario (las mismas fuerzas internas, vistas desde el otro lado).
  const Lf = 42, sg = der ? -1 : 1;
  const fu = sg*pux, fv = sg*puy;              // hacia fuera de la cara
  sv += flecha(cx+fu*8, cy+fv*8, cx+fu*Lf, cy+fv*Lf, '#0e9f6e', 2.4);
  sv += texto(cx+fu*(Lf+16), cy+fv*(Lf+16)+4, 'N', '#0e9f6e', 12, 800, 'middle', true);
  sv += flecha(cx+fu*4-sg*pnx*6, cy+fv*4-sg*pny*6, cx+fu*4-sg*pnx*Lf, cy+fv*4-sg*pny*Lf, '#d94f5c', 2.4);
  sv += texto(cx+fu*4-sg*pnx*(Lf+14), cy+fv*4-sg*pny*(Lf+14)+4, 'V', '#d94f5c', 12, 800, 'middle', true);
  sv += arcoM(cx+fu*22, cy+fv*22, 16, '#8b5cf6', der);
  sv += texto(cx+fu*22+22, cy+fv*22-20, 'M', '#8b5cf6', 12, 800, 'middle', true);
  const cot = cotasCorteSVG(ptsCota, cotX, cotY, SX, SY, F1, texto, ext);
  sv += cot.s;
  // marco û, n̂ en una esquina (R18); las cotas verticales empiezan más abajo
  // Se encaja en la franja de arriba (por encima de MTOP), apunte a donde apunte.
  const ox0 = W2 - 16 - Math.max(0, 44*pux, 44*pnx), oy0 = 14 - Math.min(0, 44*puy, 44*pny);
  sv += flecha(ox0, oy0, ox0+pux*30, oy0+puy*30, '#6b7684', 1.2) + texto(ox0+pux*40, oy0+puy*40+4, 'û', '#6b7684', 10, 700, 'middle');
  sv += flecha(ox0, oy0, ox0+pnx*30, oy0+pny*30, '#6b7684', 1.2) + texto(ox0+pnx*40, oy0+pny*40+4, 'n̂', '#6b7684', 10, 700, 'middle');
  // El lienzo crece si las cotas lo piden: el SVG se escala al ancho de la ventana.
  const Wf = Math.max(W2, Math.ceil(cot.der + 12)), Hf = Math.max(H2, Math.ceil(cot.abajo + 12));
  return '<svg viewBox="0 0 '+Wf+' '+Hf+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">'
    + '<rect width="'+Wf+'" height="'+Hf+'" fill="#fff"/>' + sv + '</svg>';
}

// Los puntos del trozo que se acotan: el corte, los nudos, el punto de cada
// fuerza (un par puro no tiene brazo) y los bordes y la resultante de cada
// repartida.
function cotaPuntosCorte(info, nudosTrozo){
  const pts = [{x:info.P.x, y:info.P.y}];
  nudosTrozo.forEach(n=>pts.push({x:n.x, y:n.y}));
  info.puntuales.forEach(a=>{ if(Math.hypot(a.fx, a.fy) > 1e-12) pts.push({x:a.x, y:a.y}); });
  info.repartidas.forEach(d=>pts.push(d.a, d.b, d.res));
  return pts;
}
const _anchoCota = t => 5.8*String(t).length + 8;
// Cotas del DCL del corte, como las del lienzo: una cadena horizontal bajo el
// dibujo y una vertical a su derecha, cada una con su total, líneas de
// extensión a trazos desde cada punto y punta en los dos extremos de cada tramo.
function cotasCorteSVG(pts, cotX, cotY, SX, SY, F1, texto, ext){
  const COL = '#4a5460', EXT = '#a3adb8';
  const lin = (x1,y1,x2,y2,c,w,d)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)+'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+c+'" stroke-width="'+w+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const punta = (x,y,ex,ey)=>'<path d="M '+F1(x)+' '+F1(y)+' L '+F1(x-ex*6-ey*2.6)+' '+F1(y-ey*6+ex*2.6)+' L '+F1(x-ex*6+ey*2.6)+' '+F1(y-ey*6-ex*2.6)+' Z" fill="'+COL+'"/>';
  const tramo = (x1,y1,x2,y2)=>{
    const L = Math.hypot(x2-x1, y2-y1) || 1, ex = (x2-x1)/L, ey = (y2-y1)/L;
    return lin(x1,y1,x2,y2,COL,1) + (L > 14 ? punta(x2,y2,ex,ey) + punta(x1,y1,-ex,-ey) : '');
  };
  let yMax = -Infinity, xMax = -Infinity;
  pts.forEach(q=>{ yMax = Math.max(yMax, SY(q.y)); xMax = Math.max(xMax, SX(q.x)); });
  // Pasado todo lo ya escrito (rótulos de fuerzas, N, V, M).
  const derPrev = ext.der, abajoPrev = ext.abajo;
  let s = '', fin = {der:0, abajo:0};
  if(cotX.length > 1){
    const y0 = Math.max(yMax + 70, abajoPrev + 16), y1 = y0 + 30;   // la cadena y, debajo, el total
    // Una línea por abscisa, desde el punto más cercano a la cadena.
    const bajo = {};
    pts.forEach(q=>{ const k = SX(q.x).toFixed(0); if(!bajo[k] || SY(q.y) > SY(bajo[k].y)) bajo[k] = q; });
    Object.values(bajo).forEach(q=>{ s += lin(SX(q.x), SY(q.y) + 6, SX(q.x), y0 + 4, EXT, .8, '3 3'); });
    const xa0 = SX(cotX[0]), xb0 = SX(cotX[cotX.length-1]);
    if(cotX.length > 2) s += lin(xa0, y0 + 4, xa0, y1 + 4, EXT, .8, '3 3') + lin(xb0, y0 + 4, xb0, y1 + 4, EXT, .8, '3 3');
    let arriba = false;
    for(let i=1;i<cotX.length;i++){
      const xa = SX(cotX[i-1]), xb = SX(cotX[i]), t = dec(cotX[i]-cotX[i-1],'len');
      s += tramo(xa, y0, xb, y0);
      // Si el valor no cabe entre sus dos líneas, se alterna por encima.
      arriba = ((xb - xa) >= _anchoCota(t)) ? false : !arriba;
      s += texto((xa+xb)/2, arriba ? y0 - 5 : y0 + 13, t, COL, 9.5, 700, 'middle');
    }
    if(cotX.length > 2){
      s += tramo(xa0, y1, xb0, y1);
      s += texto((xa0 + xb0)/2, y1 + 13, dec(cotX[cotX.length-1]-cotX[0],'len'), COL, 9.5, 800, 'middle');
    }
  }
  if(cotY.length > 1){
    const wl = Math.max(...cotY.slice(1).map((y,i)=>_anchoCota(dec(y - cotY[i],'len'))));
    const x0 = Math.max(xMax + 70, derPrev + 14), x1 = x0 + 2*wl + 8;   // la cadena y, por fuera, el total
    const dcho = {};
    pts.forEach(q=>{ const k = SY(q.y).toFixed(0); if(!dcho[k] || SX(q.x) > SX(dcho[k].x)) dcho[k] = q; });
    Object.values(dcho).forEach(q=>{ s += lin(SX(q.x) + 6, SY(q.y), x0 + 4, SY(q.y), EXT, .8, '3 3'); });
    const ya0 = SY(cotY[0]), yb0 = SY(cotY[cotY.length-1]);
    if(cotY.length > 2) s += lin(x0 + 4, ya0, x1 + 4, ya0, EXT, .8, '3 3') + lin(x0 + 4, yb0, x1 + 4, yb0, EXT, .8, '3 3');
    let lejos = false;
    for(let i=1;i<cotY.length;i++){
      const ya = SY(cotY[i-1]), yb = SY(cotY[i]), t = dec(cotY[i]-cotY[i-1],'len');
      s += tramo(x0, ya, x0, yb);
      // Valores derechos, al lado de la línea; si el tramo es corto, se alternan.
      lejos = (Math.abs(ya - yb) >= 13) ? false : !lejos;
      s += texto(x0 + 5 + (lejos ? wl : 0), (ya+yb)/2 + 3.5, t, COL, 9.5, 700, 'start');
    }
    if(cotY.length > 2){
      s += tramo(x1, ya0, x1, yb0);
      s += texto(x1 + 5, (ya0 + yb0)/2 + 3.5, dec(cotY[cotY.length-1]-cotY[0],'len'), COL, 9.5, 800, 'start');
    }
  }
  return {s, der:ext.der, abajo:ext.abajo};
}

function htmlEcuacionesCorte(info){
  const f = v=>dec(v,'f'), fm = v=>dec(v,'mom');
  const ok = v => Math.abs(v) < 1e-6*Math.max(1, Math.abs(info.N), Math.abs(info.V), Math.abs(info.M));
  return '<div class="proc-block" style="margin-top:10px">'
    + '<div class="proc-sub">En la sección</div>'
    + '<div class="eq-row"><div class="eq-body">' + kx('N = ' + f(info.N) + '\\ \\text{' + unitFor + '}\\qquad V = ' + f(info.V) + '\\ \\text{' + unitFor + '}\\qquad M = ' + fm(info.M) + '\\ \\text{' + uMom() + '}') + '</div></div>'
    + '<div class="hint-sm">Convenio: N positiva tira de la cara (tracción); V positiva hace girar el trozo en sentido horario; M positivo lo curva cóncavo hacia arriba. '
    + 'Un valor negativo significa que la fuerza real va al revés de la flecha dibujada.</div>'
    + '<div class="proc-sub" style="margin-top:8px">Comprobación del trozo (cargas + reacciones + cara cortada)</div>'
    + '<div class="eq-row"><div class="eq-body">' + kx('\\sum F_u = ' + (ok(info.resU) ? '0' : f(info.resU)) + '\\qquad \\sum F_n = ' + (ok(info.resN) ? '0' : f(info.resN)) + '\\qquad \\sum M_{\\text{corte}} = ' + (ok(info.resM) ? '0' : fm(info.resM))) + '</div></div>'
    + '<div class="hint-sm" style="color:' + (ok(info.resU) && ok(info.resN) && ok(info.resM) ? '#15803d' : '#c0392b') + '">'
    + (ok(info.resU) && ok(info.resN) && ok(info.resM) ? '✓ El trozo queda en equilibrio con N, V y M en la sección.' : '⚠ El equilibrio del trozo no cierra.') + '</div>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════
//  VENTANA «PUNTO DE CORTE» (2026-10-22, petición del profesor)
//  El botón Corta y mira ya no arma la herramienta sin más: abre esta
//  ventana, que pide el punto o manda a tocarlo en el dibujo. El punto se
//  da por coordenadas (x, y) desde el origen, o eligiendo un tramo y su
//  distancia desde el PRIMER nudo (t.a, el que se dibujó primero); en un
//  tramo inclinado esa distancia puede ser sobre el eje, Δx o Δy, una sola.
// ═══════════════════════════════════════════════════════════
// Lo último que se escribió se conserva mientras dura la sesión.
const _pc = {modo:'punto', via:'coord', x:'', y:'', tramo:null, medida:'s', valor:''};

function _pcModal(){
  let ov = document.getElementById('puntoCorteModal');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'puntoCorteModal';
  ov.className = 'modal-ov';
  const seg = (grupo, val, txt) => '<button type="button" class="seg-btn" data-' + grupo + '="' + val + '" onclick="pcCambiar(\'' + grupo + '\',\'' + val + '\')">' + txt + '</button>';
  const campo = (id, lab) => '<div class="modal-field"><label id="' + id + 'Lab">' + lab + '</label>'
    + '<input type="number" step="any" id="' + id + '" oninput="pcLeerCampos()" onkeydown="if(event.key===\'Enter\')confirmarPuntoCorte()"></div>';
  ov.innerHTML =
      '<div class="modal pc">'
    +   '<h3>Corta y mira: punto de corte</h3>'
    +   '<p class="sub">Indica dónde cortar o tócalo en el dibujo.</p>'
    +   '<div class="cg-grupo"><div class="cg-seg" id="pcModo">'
    +     seg('modo', 'punto', 'Indicar el punto') + seg('modo', 'dibujo', 'Seleccionar en el dibujo')
    +   '</div></div>'
    +   '<div id="pcPunto">'
    +     '<div class="cg-grupo"><div class="cg-seg" id="pcVia">'
    +       seg('via', 'coord', 'Por coordenadas (x, y)') + seg('via', 'tramo', 'Por tramo')
    +     '</div></div>'
    +     '<div id="pcCoord">'
    +       '<div class="pc-campos">' + campo('pcX', 'x') + campo('pcY', 'y') + '</div>'
    +       '<div class="pc-nota" id="pcOrigen"></div>'
    +     '</div>'
    +     '<div id="pcTramo">'
    +       '<div class="pc-nota">Toca el tramo en el croquis; la distancia se mide desde su primer nudo.</div>'
    +       '<div class="pc-info" id="pcTramoInfo"></div>'
    +       '<div class="cg-grupo" id="pcMedidaGrupo"><div class="cg-seg" id="pcMedida">'
    +         seg('medida', 's', 'Sobre el eje') + seg('medida', 'dx', 'Δx') + seg('medida', 'dy', 'Δy') + seg('medida', 'th', 'Ángulo θ')
    +       '</div></div>'
    +       campo('pcValor', 'Distancia')
    +     '</div>'
    +     '<div class="pc-croquis" id="pcCroquis"></div>'
    +     '<div class="pc-res" id="pcRes"></div>'
    +   '</div>'
    +   '<div class="pc-nota" id="pcDibujo">Se cierra la ventana: toca un punto de la viga.</div>'
    +   '<div class="modal-btns">'
    +     '<button class="mbtn ghost" onclick="cerrarPuntoCorte()">Cancelar</button>'
    +     '<button class="mbtn" id="pcIr" onclick="confirmarPuntoCorte()">Cortar</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}

// Lo que llama el botón Corta y mira de la barra.
function abrirPuntoCorte(){
  if(!tramos.length){ aviso('Todavía no hay ningún tramo que cortar.', 'error'); return; }
  if(!tramos.some(t=>t.id === _pc.tramo)) _pc.tramo = tramos[0].id;
  _pcModal().classList.add('show');
  document.getElementById('pcX').value = _pc.x;
  document.getElementById('pcY').value = _pc.y;
  document.getElementById('pcValor').value = _pc.valor;
  pintarPuntoCorte();
}
function cerrarPuntoCorte(){
  const ov = document.getElementById('puntoCorteModal');
  if(ov) ov.classList.remove('show');
}
function pcCambiar(grupo, val){
  _pc[grupo] = val;
  pintarPuntoCorte();
}
function pcElegirTramo(id){
  _pc.tramo = id;
  pintarPuntoCorte();
}
function pcLeerCampos(){
  _pc.x = document.getElementById('pcX').value;
  _pc.y = document.getElementById('pcY').value;
  _pc.valor = document.getElementById('pcValor').value;
  pintarPuntoCorte();
}

// Geometría del tramo tal como se dibujó: de su primer nudo (a) al segundo (b).
// Un tramo curvo (23-) lleva además su arco: L es entonces la longitud del arco
// y la posición se da por el ángulo θ en su centro o por la longitud de arco.
function _pcGeo(t){
  const A = nodo(t.a), B = nodo(t.b);
  const dx = B.x - A.x, dy = B.y - A.y;
  const gt = geoTramo(t), arco = gt && gt.arco ? gt.arco : null;
  const L = arco ? gt.L : (Math.hypot(dx, dy) || 1e-12);
  const horiz = !arco && Math.abs(dy) <= 1e-9*L, vert = !arco && Math.abs(dx) <= 1e-9*L;
  return {A, B, dx, dy, L, horiz, vert, incl:!arco && !horiz && !vert, arco, gt};
}
// El punto a la distancia s (desde el primer nudo, sobre el eje) de un tramo.
function _pcPunto(g, s){
  if(g.arco){ const Q = puntoEnTramo(g.gt, s); return {x:Q.x, y:Q.y, ux:Q.ux, uy:Q.uy}; }
  return {x:g.A.x + g.dx*s/g.L, y:g.A.y + g.dy*s/g.L, ux:g.dx/g.L, uy:g.dy/g.L};
}
// Distancia de (x, y) al tramo y la s de su punto más cercano (dentro de [0, L]).
function _pcProyectar(g, x, y){
  if(g.arco){
    const A = g.arco, sg = A.d >= 0 ? 1 : -1, tot = Math.abs(A.d);
    let phi = sg*(Math.atan2(y - A.cy, x - A.cx) - A.t1);
    phi = ((phi % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    const dentro = phi <= tot;
    if(!dentro) phi = (phi - tot < 2*Math.PI - phi) ? tot : 0;
    const s = A.R*phi, Q = _pcPunto(g, s);
    return {s, dentro: dentro && s > 0 && s < g.L, d:Math.hypot(Q.x - x, Q.y - y)};
  }
  const s = ((x - g.A.x)*g.dx + (y - g.A.y)*g.dy)/g.L;
  const sc = Math.max(0, Math.min(g.L, s)), Q = _pcPunto(g, sc);
  return {s, dentro: s > 0 && s < g.L, d:Math.hypot(Q.x - x, Q.y - y)};
}
const _pcNombre = t => nodo(t.a).nombre + nodo(t.b).nombre;

// El punto que dice la ventana: {t, x, y, s} con s desde el primer nudo, o {err}.
function puntoCorteVentana(){
  const num = v => (String(v).trim() === '' ? NaN : Number(v));
  if(_pc.via === 'coord'){
    const x = num(_pc.x), y = num(_pc.y);
    if(!isFinite(x) || !isFinite(y)) return {err:'Escribe x e y.', vacio:true};
    // ¿Es un nudo? Ahí la sección no está definida.
    const Lmax = Math.max(...tramos.map(t=>_pcGeo(t).L));
    const nn = nodos.find(n=>Math.hypot(n.x - x, n.y - y) <= 1e-6*Lmax);
    if(nn) return {err:'(' + dec(x,'len') + '; ' + dec(y,'len') + ') es el nudo ' + nn.nombre + ': ahí la sección no está definida. Corta un poco antes o después.'};
    // El tramo que pasa por el punto (holgura del 0,5 % de su largo, para
    // coordenadas escritas con pocos decimales en un tramo inclinado).
    let mejor = null, cerca = null;
    tramos.forEach(t=>{
      const g = _pcGeo(t), q = _pcProyectar(g, x, y);
      if(!cerca || q.d < cerca.d) cerca = {t, d:q.d};
      if(q.dentro && q.d <= 0.005*g.L && (!mejor || q.d < mejor.d)) mejor = {t, s:q.s, d:q.d, g};
    });
    if(!mejor) return {err:'Ese punto no está sobre ningún tramo. El más cercano es ' + _pcNombre(cerca.t) + ', a ' + dec(cerca.d,'len') + ' ' + unitLen + '.'};
    const Q = _pcPunto(mejor.g, mejor.s);
    return {t:mejor.t, s:mejor.s, x:Q.x, y:Q.y};
  }
  const t = tramos.find(z=>z.id === _pc.tramo);
  if(!t) return {err:'Toca un tramo en el croquis.', vacio:true};
  const g = _pcGeo(t);
  const med = _pcMedida(g);
  const v = num(_pc.valor);
  if(!isFinite(v)) return {t, err:med === 'th' ? 'Escribe el ángulo.' : 'Escribe la distancia.', vacio:true};
  const tot = g.arco ? Math.abs(g.arco.d)*180/Math.PI : 0;
  const total = med === 'dx' ? Math.abs(g.dx) : (med === 'dy' ? Math.abs(g.dy) : (med === 'th' ? tot : g.L));
  const va = Math.abs(v);
  if(va <= 1e-9*total || va >= total*(1 - 1e-9))
    return {t, err:'Debe quedar entre 0 y ' + (med === 'th' ? dec(total,'ang') + '°' : dec(total,'len') + ' ' + unitLen) + ', sin llegar a los nudos.'};
  const s = va*g.L/total;
  const Q = _pcPunto(g, s);
  return {t, s, x:Q.x, y:Q.y};
}
// La medida con la que se da la posición en el tramo: en un arco, θ o la
// longitud de arco; en uno inclinado, la elegida; si no, sobre el eje.
function _pcMedida(g){
  if(g.arco) return _pc.medida === 'th' ? 'th' : 's';
  return g.incl && _pc.medida !== 'th' ? _pc.medida : 's';
}

function pintarPuntoCorte(){
  const ov = document.getElementById('puntoCorteModal');
  if(!ov) return;
  ov.querySelectorAll('.seg-btn').forEach(b=>{
    const k = Object.keys(b.dataset)[0];
    b.classList.toggle('active', _pc[k] === b.dataset[k]);
  });
  const punto = _pc.modo === 'punto';
  document.getElementById('pcPunto').style.display = punto ? '' : 'none';
  document.getElementById('pcDibujo').style.display = punto ? 'none' : '';
  document.getElementById('pcIr').textContent = punto ? 'Cortar' : 'Ir al dibujo';
  document.getElementById('pcCoord').style.display = _pc.via === 'coord' ? '' : 'none';
  document.getElementById('pcTramo').style.display = _pc.via === 'tramo' ? '' : 'none';
  document.getElementById('pcXLab').textContent = 'x (' + unitLen + ')';
  document.getElementById('pcYLab').textContent = 'y (' + unitLen + ')';
  const n0 = nodos.find(n=>Math.abs(n.x) < 1e-9 && Math.abs(n.y) < 1e-9);
  document.getElementById('pcOrigen').textContent = 'Desde el origen (0; 0)' + (n0 ? ', que es el nudo ' + n0.nombre : '') + '.';
  const t = tramos.find(z=>z.id === _pc.tramo);
  if(t){
    const g = _pcGeo(t);
    const ang = Math.atan2(Math.abs(g.dy), Math.abs(g.dx))*180/Math.PI;
    document.getElementById('pcTramoInfo').innerHTML = 'Tramo <b>' + _pcNombre(t) + '</b> · '
      + (g.arco ? 'curvo · R = ' + dec(g.arco.R,'len') + ' ' + unitLen + ' · arco de ' + dec(Math.abs(g.arco.d)*180/Math.PI,'ang') + '°'
                : (g.horiz ? 'horizontal' : (g.vert ? 'vertical' : 'inclinado ' + dec(ang,'ang') + '°')))
      + ' · L = ' + dec(g.L,'len') + ' ' + unitLen
      + (g.incl ? ' · Δx = ' + dec(Math.abs(g.dx),'len') + ' · Δy = ' + dec(Math.abs(g.dy),'len') : '');
    document.getElementById('pcMedidaGrupo').style.display = (g.incl || g.arco) ? '' : 'none';
    // En un arco: θ o la longitud de arco; en uno inclinado: el eje, Δx o Δy.
    ov.querySelectorAll('#pcMedida .seg-btn').forEach(b=>{
      const m = b.dataset.medida;
      b.style.display = (g.arco ? (m === 's' || m === 'th') : m !== 'th') ? '' : 'none';
      if(m === 's') b.textContent = g.arco ? 'Longitud de arco' : 'Sobre el eje';
      b.classList.toggle('active', m === _pcMedida(g));
    });
    const med = _pcMedida(g);
    document.getElementById('pcValorLab').textContent = med === 'th'
      ? 'θ desde ' + g.A.nombre + ', en el centro del arco (°)'
      : (med === 'dx' ? 'Δx desde ' : (med === 'dy' ? 'Δy desde ' : (g.arco ? 'Longitud de arco desde ' : 'Distancia desde '))) + g.A.nombre + ' (' + unitLen + ')';
  }
  if(!punto) return;
  const p = puntoCorteVentana();
  const res = document.getElementById('pcRes');
  if(p.err) res.innerHTML = p.vacio ? p.err : '<span class="pc-err">' + p.err + '</span>';
  else {
    const g = _pcGeo(p.t);
    res.innerHTML = 'Corte en <b>(' + dec(p.x,'len') + '; ' + dec(p.y,'len') + ')</b>, tramo <b>' + _pcNombre(p.t) + '</b>, '
      + (g.arco ? 'en θ = ' + dec(p.s/g.arco.R*180/Math.PI,'ang') + '° desde ' + g.A.nombre + ' (arco de ' + dec(p.s,'len') + ' ' + unitLen + ').'
                : 'a ' + dec(p.s,'len') + ' ' + unitLen + ' de ' + g.A.nombre + ' sobre su eje.');
  }
  dibujarCroquisPuntoCorte(p);
}

// La estructura con el punto de corte. Por tramo, cada tramo se toca para
// elegirlo y su primer nudo va marcado; por coordenadas se ve el origen.
function dibujarCroquisPuntoCorte(p){
  const caja = document.getElementById('pcCroquis');
  if(!caja) return;
  const porTramo = _pc.via === 'tramo';
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  const mete = (x,y)=>{ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); };
  puntosDelModelo().forEach(n=>mete(n.x, n.y));
  if(!porTramo) mete(0, 0);
  // con un arco elegido, también su centro O, desde el que se mide θ
  const tA = porTramo ? tramos.find(z=>z.id === _pc.tramo) : null, gA = tA ? _pcGeo(tA) : null;
  if(gA && gA.arco) mete(gA.arco.cx, gA.arco.cy);
  const W = Math.round(Math.max(300, Math.min(560, (caja.clientWidth || 560) - 10))), M = porTramo ? 62 : 42;
  const sx = Math.max(x1-x0, 1e-6), sy = Math.max(y1-y0, 0);
  let k = (W-2*M)/sx;
  const H = Math.max(170, Math.min(330, 2*M + sy*k));
  if(sy > 1e-9) k = Math.min(k, (H-2*M)/sy);
  const ox = (W - sx*k)/2, oy = (H - sy*k)/2;
  const X = x => ox + (x-x0)*k, Y = y => H - oy - (y-y0)*k;
  const f = v => v.toFixed(1);
  const sel = porTramo ? _pc.tramo : (p && p.t ? p.t.id : null);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Estructura y punto de corte">';
  // Origen (0; 0), solo por coordenadas: es la referencia de x e y.
  if(!porTramo){
    const cx = X(0), cy = Y(0);
    const enNudo = nodos.some(n=>Math.abs(n.x) < 1e-9 && Math.abs(n.y) < 1e-9);
    s += '<line x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(cx+26) + '" y2="' + f(cy) + '" stroke="#8a94a3" stroke-width="1.2"/>'
      + '<line x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(cx) + '" y2="' + f(cy-26) + '" stroke="#8a94a3" stroke-width="1.2"/>'
      + '<path d="M ' + f(cx+30) + ' ' + f(cy) + ' l -6 -3 v 6 Z M ' + f(cx) + ' ' + f(cy-30) + ' l -3 6 h 6 Z" fill="#8a94a3"/>'
      + '<text x="' + f(cx+27) + '" y="' + f(cy+15) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="700" fill="#6b7684" font-style="italic">x</text>'
      + '<text x="' + f(cx+5) + '" y="' + f(cy-31) + '" font-family="Inter,sans-serif" font-size="10.5" font-weight="700" fill="#6b7684" font-style="italic">y</text>'
      // Si el origen es un nudo, su nombre ya está ahí: la nota lo dice.
      + (enNudo ? '' : '<text x="' + f(cx-4) + '" y="' + f(cy+15) + '" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#6b7684" text-anchor="end">(0; 0)</text>');
  }
  tramos.forEach(t=>{
    const a = nodo(t.a), b = nodo(t.b);
    if(!a || !b) return;
    const on = t.id === sel;
    const gt = geoTramo(t);
    const pts = (gt && gt.arco ? ejeTramo(gt, 40) : [a, b]).map(q=>f(X(q.x)) + ',' + f(Y(q.y))).join(' ');
    s += '<g' + (porTramo ? ' class="selT-tramo' + (on ? ' on' : '') + '" onclick="pcElegirTramo(' + t.id + ')"' : '') + '>'
      + (porTramo ? '<polyline points="' + pts + '" fill="none" stroke="transparent" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>' : '')
      + '<polyline points="' + pts + '" fill="none" stroke="' + (on ? 'var(--acc)' : '#c3cad3')
      + '" stroke-width="' + (on ? 6 : 4) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  });
  // El primer nudo del tramo elegido, con un anillo: desde ahí se mide.
  const tSel = porTramo ? tramos.find(z=>z.id === sel) : null;
  if(tSel){
    const A = nodo(tSel.a);
    s += '<circle cx="' + f(X(A.x)) + '" cy="' + f(Y(A.y)) + '" r="9" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s += _pcGuiaMedida(tSel, p, X, Y, f);
  }
  nodos.forEach(n=>{
    const cx = X(n.x), cy = Y(n.y);
    let dx = 0, dy = 0;
    tramos.forEach(t=>{
      if(t.a !== n.id && t.b !== n.id) return;
      const o = nodo(t.a === n.id ? t.b : t.a);
      if(!o) return;
      const ex = X(o.x) - cx, ey = Y(o.y) - cy, l = Math.hypot(ex, ey) || 1;
      dx += ex/l; dy += ey/l;
    });
    let l = Math.hypot(dx, dy);
    if(l < 0.3){ dx = 0; dy = 1; l = 1; }
    const lx = cx - dx/l*18, ly = cy - dy/l*18 + 4.5;
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="4.5" fill="' + (n.rotula ? '#fff' : '#26415e') + '" stroke="#26415e" stroke-width="1.8"/>'
      + '<text x="' + f(lx) + '" y="' + f(ly) + '" font-family="Inter,sans-serif" font-size="13" font-weight="800" fill="#1b1f24" text-anchor="middle">' + n.nombre + '</text>';
  });
  // El corte: una raya roja perpendicular al tramo, como en el DCL.
  if(p && !p.err){
    const Q = _pcPunto(_pcGeo(p.t), p.s);
    const cx = X(p.x), cy = Y(p.y), nx = -Q.uy, ny = -Q.ux;   // normal en pantalla
    s += '<line x1="' + f(cx+nx*13) + '" y1="' + f(cy+ny*13) + '" x2="' + f(cx-nx*13) + '" y2="' + f(cy-ny*13) + '" stroke="#d94f5c" stroke-width="3" stroke-linecap="round"/>';
  }
  s += '</svg>';
  caja.innerHTML = s;
}

// Cómo se da la distancia: ejes x, y en el primer nudo y la cota de lo que se
// escribe (s sobre el eje, Δx o Δy) hasta el punto de corte; sin valor válido,
// hasta el centro del tramo, como ejemplo.
function _pcGuiaMedida(t, p, X, Y, f){
  const g = _pcGeo(t), A = g.A;
  const med = _pcMedida(g);
  const ok = p && !p.err && p.t && p.t.id === t.id;
  const Q = ok ? {x:p.x, y:p.y} : _pcPunto(g, g.L/2);
  const ax = X(A.x), ay = Y(A.y), qx = X(Q.x), qy = Y(Q.y);
  const GUIA = '#0f766e', EJE = '#7b8794';
  const lin = (x1,y1,x2,y2,c,w,d)=>'<line x1="'+f(x1)+'" y1="'+f(y1)+'" x2="'+f(x2)+'" y2="'+f(y2)+'" stroke="'+c+'" stroke-width="'+w+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const punta = (x,y,ex,ey,c)=>'<path d="M '+f(x)+' '+f(y)+' L '+f(x-ex*6-ey*2.8)+' '+f(y-ey*6+ex*2.8)+' L '+f(x-ex*6+ey*2.8)+' '+f(y-ey*6-ex*2.8)+' Z" fill="'+c+'"/>';
  const txt = (x,y,t,c,anc)=>'<text x="'+f(x)+'" y="'+f(y)+'" font-family="Inter,sans-serif" font-size="11" font-weight="800" fill="'+c+'" text-anchor="'+(anc||'middle')+'" font-style="italic">'+t+'</text>';
  if(g.arco){
    // Un arco: los radios de O al primer nudo y al punto, y θ entre ellos; o,
    // con la longitud de arco, la cota curva por fuera del arco.
    const Ar = g.arco, ox = X(Ar.cx), oy = Y(Ar.cy), sQ = ok ? p.s : g.L/2;
    let s = lin(ox, oy, ax, ay, EJE, 1.1, '4 3') + lin(ox, oy, qx, qy, EJE, 1.1, '4 3')
          + '<path d="M'+f(ox-5)+' '+f(oy)+'h10M'+f(ox)+' '+f(oy-5)+'v10" stroke="#0f5c56" stroke-width="1.4"/>'
          + txt(ox + 10, oy + 15, 'O', '#0f5c56', 'start');
    if(med === 'th'){
      const rTh = Math.min(34, 0.45*Math.hypot(ax - ox, ay - oy)), n = 24, pts = [];
      for(let i=0;i<=n;i++){ const P = _pcPunto(g, sQ*i/n), L2 = Math.hypot(X(P.x) - ox, Y(P.y) - oy) || 1; pts.push([ox + (X(P.x) - ox)/L2*rTh, oy + (Y(P.y) - oy)/L2*rTh]); }
      s += '<polyline points="' + pts.map(q=>f(q[0]) + ',' + f(q[1])).join(' ') + '" fill="none" stroke="' + GUIA + '" stroke-width="1.4"/>';
      const e = pts[n], e2 = pts[n-1], el = Math.hypot(e[0]-e2[0], e[1]-e2[1]) || 1;
      s += punta(e[0], e[1], (e[0]-e2[0])/el, (e[1]-e2[1])/el, GUIA);
      const m = pts[n >> 1], dm = Math.hypot(m[0] - ox, m[1] - oy) || 1;
      s += txt(ox + (m[0] - ox)/dm*(rTh + 14), oy + (m[1] - oy)/dm*(rTh + 14) + 4,
               'θ' + (ok ? ' = ' + dec(sQ/Ar.R*180/Math.PI,'ang') + '°' : ''), GUIA);
    } else {
      const n = 32, pts = [];
      for(let i=0;i<=n;i++){ const P = _pcPunto(g, sQ*i/n), L2 = Math.hypot(X(P.x) - ox, Y(P.y) - oy) || 1; pts.push([ox + (X(P.x) - ox)/L2*(L2 + 16), oy + (Y(P.y) - oy)/L2*(L2 + 16)]); }
      s += '<polyline points="' + pts.map(q=>f(q[0]) + ',' + f(q[1])).join(' ') + '" fill="none" stroke="' + GUIA + '" stroke-width="1.3"/>';
      const e = pts[n], e2 = pts[n-1], el = Math.hypot(e[0]-e2[0], e[1]-e2[1]) || 1;
      const b = pts[0], b2 = pts[1], bl = Math.hypot(b[0]-b2[0], b[1]-b2[1]) || 1;
      s += punta(e[0], e[1], (e[0]-e2[0])/el, (e[1]-e2[1])/el, GUIA) + punta(b[0], b[1], (b[0]-b2[0])/bl, (b[1]-b2[1])/bl, GUIA);
      const m = pts[n >> 1], dm = Math.hypot(m[0] - ox, m[1] - oy) || 1;
      s += txt(m[0] + (m[0] - ox)/dm*14, m[1] + (m[1] - oy)/dm*14 + 4, 's' + (ok ? ' = ' + dec(sQ,'len') : ''), GUIA);
    }
    return s;
  }
  const cota = (x1,y1,x2,y2)=>{
    const L = Math.hypot(x2-x1, y2-y1) || 1, ex = (x2-x1)/L, ey = (y2-y1)/L;
    return lin(x1,y1,x2,y2,GUIA,1.3) + (L > 14 ? punta(x2,y2,ex,ey,GUIA) + punta(x1,y1,-ex,-ey,GUIA) : '');
  };
  // Ejes x, y en el primer nudo, hacia +x y +y, que es como se leen x e y.
  const sx = 1, sy = 1;
  let s = lin(ax, ay, ax + sx*44, ay, EJE, 1.1, '4 3') + punta(ax + sx*48, ay, sx, 0, EJE)
        + txt(ax + sx*56, ay + 4, 'x', EJE)
        + lin(ax, ay, ax, ay - sy*44, EJE, 1.1, '4 3') + punta(ax, ay - sy*48, 0, -sy, EJE)
        + txt(ax, ay - sy*56 + 4, 'y', EJE);
  const val = v => ok ? ' = ' + dec(v,'len') : '';
  if(med === 'dx'){
    // Cota horizontal pasado el punto (lejos del nombre del nudo), con las
    // líneas de referencia desde el nudo y desde el punto.
    const oy = (qy >= ay) ? 16 : -16, yc = qy + oy;
    s += lin(ax, ay, ax, yc + Math.sign(oy)*4, GUIA, .8, '3 3') + lin(qx, qy, qx, yc + Math.sign(oy)*4, GUIA, .8, '3 3')
       + cota(ax, yc, qx, yc) + txt((ax+qx)/2, yc + (oy > 0 ? 14 : -5), 'Δx' + val(Math.abs(Q.x - A.x)), GUIA);
  } else if(med === 'dy'){
    const ox = (qx >= ax) ? 16 : -16, xc = qx + ox;
    s += lin(ax, ay, xc + Math.sign(ox)*4, ay, GUIA, .8, '3 3') + lin(qx, qy, xc + Math.sign(ox)*4, qy, GUIA, .8, '3 3')
       + cota(xc, ay, xc, qy) + txt(xc + (ox > 0 ? 6 : -6), (ay+qy)/2 + 4, 'Δy' + val(Math.abs(Q.y - A.y)), GUIA, ox > 0 ? 'start' : 'end');
  } else {
    // Sobre el eje: cota paralela al tramo, del lado contrario al nombre del
    // nudo (que va opuesto a los tramos que llegan a él).
    const L = Math.hypot(qx-ax, qy-ay) || 1, nx = -(qy-ay)/L, ny = (qx-ax)/L;
    let lx = 0, ly = 0;
    tramos.forEach(z=>{
      if(z.a !== A.id && z.b !== A.id) return;
      const o2 = nodo(z.a === A.id ? z.b : z.a);
      const ex = X(o2.x) - ax, ey = Y(o2.y) - ay, l = Math.hypot(ex, ey) || 1;
      lx -= ex/l; ly -= ey/l;
    });
    if(Math.hypot(lx, ly) < 0.3){ lx = 0; ly = -1; }
    const o = (nx*lx + ny*ly > 0) ? -16 : 16;
    s += cota(ax + nx*o, ay + ny*o, qx + nx*o, qy + ny*o)
       + txt((ax+qx)/2 + nx*o*2, (ay+qy)/2 + ny*o*2 + 4, 's' + val(Math.hypot(Q.x - A.x, Q.y - A.y)), GUIA);
  }
  return s;
}

function confirmarPuntoCorte(){
  if(_pc.modo === 'dibujo'){
    cerrarPuntoCorte();
    setTool('corte');
    return;
  }
  const p = puntoCorteVentana();
  if(p.err){ aviso(p.err, 'error'); return; }
  cerrarPuntoCorte();
  abrirCorteMundo(p.t, p.x, p.y, true);
}
// «Otro corte» de la ventana del DCL: vuelve a la del punto.
function otroCorte(){ cerrarCorte(); abrirPuntoCorte(); }

// Figuras de resultados legibles en el teléfono (core/comun.js, 2026-10-11).
bsaVigilarFigurasMovil('#resultsArea');
bsaVigilarFigurasMovil('#corteModal');
