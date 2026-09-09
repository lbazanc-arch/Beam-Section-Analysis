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

function abrirCorteEn(t, mx, my){
  if(!R || R.error || !R.internas){ aviso('Primero pulsa Calcular: el corte se lee sobre la viga resuelta.', 'error'); return; }
  const ti = R.internas.find(x=>x.tramo.id === t.id);
  if(!ti){ aviso('Ese tramo no forma parte de la cadena resuelta.', 'error'); return; }
  const [wx,wy] = aMundo(mx, my);
  // ux, uy ya vienen orientados en el sentido del recorrido de la cadena
  const ux = ti.ux, uy = ti.uy;
  let s = (wx - ti.desde.x)*ux + (wy - ti.desde.y)*uy;
  // nunca exactamente sobre un nudo: ahí la sección no está definida
  s = Math.max(0.03*ti.L, Math.min(0.97*ti.L, s));
  _corteActual = {tramoId:t.id, s};
  const m = document.getElementById('corteModal');
  if(!m) return;
  const sub = document.getElementById('corteSub');
  const cuerpo = document.getElementById('corteCuerpo');
  const info = datosCorte(R, ti, s);
  if(sub) sub.innerHTML = 'Sección a <b>' + dec(s,'len') + ' ' + unitLen + '</b> de ' + ti.desde.nombre
    + ' sobre el tramo ' + ti.desde.nombre + ti.hasta.nombre + ' (abscisa global ' + dec(ti.s0 + s,'len') + ' ' + unitLen + '). '
    + 'Se conserva el trozo a la izquierda del corte y en la cara cortada se ponen N, V y M en el sentido positivo del convenio; '
    + 'el signo del valor dice el sentido real.';
  if(cuerpo) cuerpo.innerHTML = svgDCLCorte(R, ti, s, info) + htmlEcuacionesCorte(info);
  try{ renderKatex(cuerpo); }catch(e){}
  m.classList.add('show');
}
function cerrarCorte(){ const m = document.getElementById('corteModal'); if(m) m.classList.remove('show'); }

// ── Todo lo que actúa sobre el trozo izquierdo, en coordenadas del mundo ──
function datosCorte(r, ti, s){
  const ux = ti.ux, uy = ti.uy;
  const nx = -uy, ny = ux;
  const P = {x:ti.desde.x + ux*s, y:ti.desde.y + uy*s};
  const sGlobal = ti.s0 + s;
  // N, V, M en la sección, del polinomio del subtramo que la contiene
  const sub = ti.subs.find(q=>s >= q.sa - 1e-9 && s <= q.sb + 1e-9) || ti.subs[ti.subs.length-1];
  const N = polyVal(sub.cN, s), V = polyVal(sub.cV, s), M = polyVal(sub.cM, s);
  // acciones puntuales (cargas, pares y reacciones) antes del corte
  const puntuales = (r.internas.puntuales || []).filter(o=>o.s !== null && o.s < sGlobal - 1e-9).map(o=>o.a);
  // cargas repartidas: la parte del trozo cargado que queda antes del corte
  const posActual = r.cad.findIndex(x=>x.t.id === ti.tramo.id);
  const repartidas = [];
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const posTramo = r.cad.findIndex(x=>x.t.id===c.tramo);
    if(posTramo < 0 || posTramo > posActual) return;
    const gc = z.g;
    const inv = (r.cad[posTramo].desde.id !== gc.a.id);
    let r1 = inv ? (gc.L - z.s2) : z.s1;
    let r2 = inv ? (gc.L - z.s1) : z.s2;
    const hasta = (posTramo < posActual) ? gc.L : s;
    const corte = Math.min(r2, hasta);
    if(corte <= r1 + 1e-12) return;
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const wIni = inv ? w2 : w1, wFinT = inv ? w1 : w2;
    const largo = r2 - r1;
    const wEn = u => wIni + (wFinT-wIni)*((u-r1)/largo);
    const wa = wEn(r1), wb = wEn(corte);
    const trozo = corte - r1;
    const Fp = (wa+wb)/2*trozo;
    const I1 = r1*Fp + trozo*trozo*(wa+2*wb)/6;
    const origen = r.cad[posTramo].desde;
    const dirx = inv ? -gc.ux : gc.ux, diry = inv ? -gc.uy : gc.uy;
    const dd = dirCarga(c, gc);
    const uc = (Math.abs(Fp) > 1e-12) ? I1/Fp : (r1 + corte)/2;
    repartidas.push({a:{x:origen.x + dirx*r1, y:origen.y + diry*r1}, b:{x:origen.x + dirx*corte, y:origen.y + diry*corte},
      wa, wb, dd, Fp, esT:c.tipo==='T', recortada: corte < r2 - 1e-9,
      res:{x:origen.x + dirx*uc, y:origen.y + diry*uc}, dirx, diry});
  });
  // comprobación: ΣF_u, ΣF_n y ΣM_P del trozo con las fuerzas de la cara
  let Fx = 0, Fy = 0, Mo = 0;
  puntuales.forEach(a=>{ Fx += a.fx; Fy += a.fy; Mo += (a.x-P.x)*a.fy - (a.y-P.y)*a.fx + (a.m||0); });
  repartidas.forEach(q=>{ const fx = q.Fp*q.dd.x, fy = q.Fp*q.dd.y; Fx += fx; Fy += fy; Mo += (q.res.x-P.x)*fy - (q.res.y-P.y)*fx; });
  // fuerzas de la cara: N a lo largo de +u, V a lo largo de −n (convenio) y M antihorario
  const resU = Fx*ux + Fy*uy + N, resN = Fx*nx + Fy*ny - V, resM = Mo + M;
  return {P, ux, uy, nx, ny, s, sGlobal, N, V, M, puntuales, repartidas, resU, resN, resM, ti};
}

// ── El DCL del trozo, en SVG (mismo trazo que el DCL global de la ventana de diagramas) ──
function svgDCLCorte(r, ti, s, info){
  const F1 = n => n.toFixed(1);
  const P = info.P;
  // ámbito: los nudos del trozo, el corte y las cargas
  const posActual = r.cad.findIndex(x=>x.t.id === ti.tramo.id);
  const nudosTrozo = [];
  r.cad.forEach((e,i)=>{ if(i <= posActual){ if(!nudosTrozo.some(n=>n.id===e.desde.id)) nudosTrozo.push(e.desde); } });
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  const mete = (x,y)=>{ minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); };
  nudosTrozo.forEach(n=>mete(n.x,n.y)); mete(P.x,P.y);
  info.puntuales.forEach(a=>mete(a.x,a.y));
  const span = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 0);
  const W2 = 700, MX = 90, MTOP = 96, MBOT = 96;
  let kk = (W2 - 2*MX)/span;
  const H2 = Math.max(250, Math.min(380, MTOP + MBOT + spanY*kk));
  if(spanY > 1e-9) kk = Math.min(kk, (H2 - MTOP - MBOT)/spanY);
  const cx0 = (W2 - 2*MX - span*kk)/2;
  const SX = x => MX + cx0 + (x - minx)*kk;
  const SY = y => H2 - MBOT - (y - miny)*kk;
  const linea = (x1,y1,x2,y2,col,w,dash)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)+'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha = (x1,y1,x2,y2,col,w)=>{
    const dx=x2-x1, dy=y2-y1, L3=Math.hypot(dx,dy)||1, ex=dx/L3, ey=dy/L3;
    const hx=x2-ex*9, hy=y2-ey*9, px=-ey, py=ex;
    return linea(x1,y1,hx,hy,col,w)+'<path d="M '+F1(x2)+' '+F1(y2)+' L '+F1(hx+px*4)+' '+F1(hy+py*4)+' L '+F1(hx-px*4)+' '+F1(hy-py*4)+' Z" fill="'+col+'"/>';
  };
  const texto = (x,y,txt,col,sz,peso,anc,it)=>'<text x="'+F1(x)+'" y="'+F1(y)+'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="'+(peso||600)+'" fill="'+col+'"'+(anc?' text-anchor="'+anc+'"':'')+(it?' font-style="italic"':'')+'>'+txt+'</text>';
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
  let sv = '<svg viewBox="0 0 '+W2+' '+H2+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">';
  sv += '<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';
  // repartidas recortadas, detrás de la barra
  const wmax = Math.max(1e-9, ...info.repartidas.map(d=>Math.max(Math.abs(d.wa),Math.abs(d.wb))));
  info.repartidas.forEach(d=>{
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
  r.cad.forEach((e,i)=>{
    if(i > posActual) return;
    const fin = (i === posActual) ? P : e.hasta;
    sv += linea(SX(e.desde.x), SY(e.desde.y), SX(fin.x), SY(fin.y), '#26415e', 4.6);
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
    const col = a.reac ? '#1a7f37' : '#c62828';
    if(Fm > 1e-12){
      const ex=a.fx/Fm, ey=-a.fy/Fm;
      sv += flecha(X-ex*38, Y-ey*38, X-ex*5, Y-ey*5, col, 2.2);
      const nom = a.reac ? (a.inc ? nombreAccion(a).tex.replace(/[{}]/g,'').replace('_','') : 'R') + ' = ' : '';
      sv += texto(X-ex*50 + (Math.abs(ex)<0.3 ? 16 : 0), Y-ey*50+3, nom + dec(Fm,'f'), col, 10, 800, 'middle');
      // brazo desde el corte: perpendicular de P a la línea de acción
      const dx=a.x-P.x, dy=a.y-P.y, ux2=a.fx/Fm, uy2=a.fy/Fm;
      const t2 = dx*ux2 + dy*uy2;
      const Qx = a.x - ux2*t2, Qy = a.y - uy2*t2;      // pie de la perpendicular
      const brazo = Math.hypot(Qx-P.x, Qy-P.y);
      if(brazo > 1e-6){
        const qx = SX(Qx), qy = SY(Qy);
        sv += linea(X, Y, qx, qy, col, .9, '3 3');
        sv += linea(cx, cy, qx, qy, '#4a5460', 1, '4 2');
        sv += texto((cx+qx)/2, (cy+qy)/2 - 5, 'd = ' + dec(brazo,'len'), '#4a5460', 9, 700, 'middle');
      }
    }
    if(Math.abs(a.m) > 1e-12){
      const colM = a.reac ? '#1a7f37' : '#8b5cf6';
      sv += arcoM(X, Y, 15, colM, a.m < 0);
      sv += texto(X+22, Y-18, (a.reac ? 'M = ' : '') + dec(Math.abs(a.m),'mom'), colM, 10, 800);
    }
  });
  // N, V, M en la cara, en el sentido positivo del convenio
  const Lf = 42;
  sv += flecha(cx+pux*8, cy+puy*8, cx+pux*Lf, cy+puy*Lf, '#0e9f6e', 2.4);
  sv += texto(cx+pux*(Lf+16), cy+puy*(Lf+16)+4, 'N', '#0e9f6e', 12, 800, 'middle', true);
  sv += flecha(cx+pux*4-pnx*6, cy+puy*4-pny*6, cx+pux*4-pnx*Lf, cy+puy*4-pny*Lf, '#d94f5c', 2.4);
  sv += texto(cx+pux*4-pnx*(Lf+14), cy+puy*4-pny*(Lf+14)+4, 'V', '#d94f5c', 12, 800, 'middle', true);
  sv += arcoM(cx+pux*22, cy+puy*22, 16, '#8b5cf6', false);
  sv += texto(cx+pux*22+22, cy+puy*22-20, 'M', '#8b5cf6', 12, 800, 'middle', true);
  // marco û, n̂ en una esquina (R18)
  const ox0 = W2 - 80, oy0 = 40;
  sv += flecha(ox0, oy0, ox0+pux*30, oy0+puy*30, '#6b7684', 1.2) + texto(ox0+pux*40, oy0+puy*40+4, 'û', '#6b7684', 10, 700, 'middle');
  sv += flecha(ox0, oy0, ox0+pnx*30, oy0+pny*30, '#6b7684', 1.2) + texto(ox0+pnx*40, oy0+pny*40+4, 'n̂', '#6b7684', 10, 700, 'middle');
  sv += '</svg>';
  return sv;
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
