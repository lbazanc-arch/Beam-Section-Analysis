function vdGiro(campo, valor){
  const c = cargas.find(z=>z.id === _vdCarga);
  if(!c) return;
  const v = parseFloat(valor);
  if(!isFinite(v)) return;
  if(campo === 'mag') c.mag = v; else c.mag2 = v;
  const u = (c.tipo==='M') ? uMom() : (c.tipo==='U'||c.tipo==='T') ? uDist() : unitFor;
  const et = document.getElementById('vdVal_' + campo);
  if(et) et.textContent = dec(v, c.tipo==='M'?'mom':'f') + ' ' + u;
  const nn = document.getElementById('vdN_' + campo);
  if(nn) nn.value = +v.toFixed(4);
  // Un giro rápido dispara decenas de eventos: el recálculo se agrupa por
  // frame para que la ventana siga fluida también en móvil.
  if(_vdRaf) return;
  _vdRaf = requestAnimationFrame(()=>{ _vdRaf = 0; vdRender(); });
}

function vdValorExacto(campo, valor){
  const c = cargas.find(z=>z.id === _vdCarga);
  const v = parseFloat(valor);
  if(!c || !isFinite(v)) return;
  const lim = _vdLim[c.id];
  // un valor tecleado fuera del rango ensancha el propio rango: el usuario manda
  if(campo === 'mag'){
    if(v < lim.min) lim.min = v;
    if(v > lim.max) lim.max = v;
    c.mag = v;
  } else {
    if(v < lim.min2) lim.min2 = v;
    if(v > lim.max2) lim.max2 = v;
    c.mag2 = v;
  }
  vdPintarRuedas();
  vdRender();
}

function vdLimite(campo, extremo, valor){
  const c = cargas.find(z=>z.id === _vdCarga);
  const v = parseFloat(valor);
  if(!c || !isFinite(v)) return;
  const lim = _vdLim[c.id];
  const kMin = campo === 'mag' ? 'min' : 'min2';
  const kMax = campo === 'mag' ? 'max' : 'max2';
  if(extremo === 'min') lim[kMin] = v; else lim[kMax] = v;
  if(lim[kMin] > lim[kMax]){ const t = lim[kMin]; lim[kMin] = lim[kMax]; lim[kMax] = t; }
  // el valor vigente se recorta al nuevo rango
  const actual = campo === 'mag' ? c.mag : (c.mag2 || 0);
  const rec = Math.min(lim[kMax], Math.max(lim[kMin], actual));
  if(campo === 'mag') c.mag = rec; else c.mag2 = rec;
  vdPintarRuedas();
  vdRender();
}

// ── Extremos exactos de una serie en un grupo ──
// Candidatos: extremos de cada subtramo y raíces de la derivada del
// polinomio; con ellos el máximo y el mínimo son exactos, no muestreados.
function extremosSerie(gg, clave){
  const campo = {N:'cN', V:'cV', M:'cM'}[clave];
  let mx = null, mn = null;
  gg.tramos.forEach(t=>{
    const off = t.s0 - gg.s0;
    t.subs.forEach(su=>{
      const c = su[campo];
      const cand = [su.sa, su.sb];
      const der = [c[1]||0, 2*(c[2]||0), 3*(c[3]||0)];
      raicesEn(der, su.sa, su.sb).forEach(v=>{
        if(v > su.sa + 1e-9 && v < su.sb - 1e-9) cand.push(v);
      });
      cand.forEach(v=>{
        const val = polyVal(c, v), X = off + v;
        if(!mx || val > mx.v + 1e-12) mx = {v:val, x:X};
        if(!mn || val < mn.v - 1e-12) mn = {v:val, x:X};
      });
    });
  });
  return {mx, mn};
}

// Recuadro de máximos y mínimos, uno por diagrama, con la posición en la
// abscisa del grupo (x en los rectos, r en los inclinados).
function htmlExtremosGrupo(r, gg){
  const series = [
    {k:'N', col:'#0e9f6e', nom:'DFN', tU:()=>unitFor},
    {k:'V', col:'#d94f5c', nom:'DFC', tU:()=>unitFor},
    {k:'M', col:'#8b5cf6', nom:'DMF', tU:()=>uMom()}
  ];
  const sb = gg.simbolo;
  return '<div class="vd-stats">' + series.map(se=>{
    const e = extremosSerie(gg, se.k);
    if(!e.mx) return '';
    const dt = se.k === 'M' ? 'mom' : 'f';
    return '<div class="vd-stat" style="border-left-color:' + se.col + '">'
      + '<div class="vd-stat-t" style="color:' + se.col + '">' + se.nom + '</div>'
      + '<div>máx = <b>' + dec(e.mx.v, dt) + '</b> ' + se.tU()
      + ' en <i>' + sb + '</i> = ' + dec(e.mx.x, 'len') + ' ' + unitLen + '</div>'
      + '<div>mín = <b>' + dec(e.mn.v, dt) + '</b> ' + se.tU()
      + ' en <i>' + sb + '</i> = ' + dec(e.mn.x, 'len') + ' ' + unitLen + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

// ── DCL global de la estructura ──
// El cuerpo libre completo: barras, nudos, cargas con sus valores,
// reacciones en verde y cadena de cotas por cada tramo de dirección.
function svgDCLGlobal(r){
  const F1 = n => n.toFixed(1);
  // ámbito del dibujo
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  nodos.forEach(n=>{ minx=Math.min(minx,n.x); maxx=Math.max(maxx,n.x);
                     miny=Math.min(miny,n.y); maxy=Math.max(maxy,n.y); });
  if(!isFinite(minx)) return '';
  const span = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 0);
  const W2 = 660, MX = 70, MTOP = 84, MBOT = 96;
  let kk = (W2 - 2*MX)/span;
  const H2 = Math.max(210, Math.min(340, MTOP + MBOT + spanY*kk));
  if(spanY > 1e-9) kk = Math.min(kk, (H2 - MTOP - MBOT)/spanY);
  const cx0 = (W2 - 2*MX - span*kk)/2;
  const SX = x => MX + cx0 + (x - minx)*kk;
  const SY = y => H2 - MBOT - (y - miny)*kk;

  const linea = (x1,y1,x2,y2,col,w,dash)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)
    +'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+col+'" stroke-width="'+w+'"'
    +(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha = (x1,y1,x2,y2,col,w)=>{
    const dx=x2-x1, dy=y2-y1, L3=Math.hypot(dx,dy)||1, ex=dx/L3, ey=dy/L3;
    const hx=x2-ex*9, hy=y2-ey*9, px=-ey, py=ex;
    return linea(x1,y1,hx,hy,col,w)
      +'<path d="M '+F1(x2)+' '+F1(y2)+' L '+F1(hx+px*4)+' '+F1(hy+py*4)
      +' L '+F1(hx-px*4)+' '+F1(hy-py*4)+' Z" fill="'+col+'"/>';
  };
  const texto = (x,y,txt,col,sz,peso,anc,it)=>'<text x="'+F1(x)+'" y="'+F1(y)
    +'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="'+(peso||600)
    +'" fill="'+col+'"'+(anc?' text-anchor="'+anc+'"':'')+(it?' font-style="italic"':'')+'>'+txt+'</text>';
  const arcoM = (cx,cy,rr,col,horario)=>{
    const a0=-35*Math.PI/180, a1=215*Math.PI/180;
    const x1=cx+rr*Math.cos(a0), y1=cy-rr*Math.sin(a0);
    const x2=cx+rr*Math.cos(a1), y2=cy-rr*Math.sin(a1);
    const sweep = horario ? 1 : 0;
    const fin = horario ? {x:x1,y:y1,tx:-Math.sin(a0),ty:-Math.cos(a0)}
                        : {x:x2,y:y2,tx:-Math.sin(a1),ty:-Math.cos(a1)};
    const ini = horario ? {x:x2,y:y2} : {x:x1,y:y1};
    let p='<path d="M '+F1(ini.x)+' '+F1(ini.y)+' A '+rr+' '+rr+' 0 1 '+sweep+' '
      +F1(fin.x)+' '+F1(fin.y)+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
    const s2 = horario ? -1 : 1;
    p += '<path d="M '+F1(fin.x+s2*fin.tx*8)+' '+F1(fin.y-s2*fin.ty*8)
      +' L '+F1(fin.x+3.5*fin.ty*s2)+' '+F1(fin.y+3.5*fin.tx*s2)
      +' L '+F1(fin.x-3.5*fin.ty*s2)+' '+F1(fin.y-3.5*fin.tx*s2)+' Z" fill="'+col+'"/>';
    return p;
  };

  let sv = '<svg viewBox="0 0 '+W2+' '+H2+'" xmlns="http://www.w3.org/2000/svg" '
         + 'style="width:100%;height:auto;display:block">';
  sv += '<rect width="'+W2+'" height="'+H2+'" fill="#fff"/>';

  // ── cargas distribuidas, detrás de la barra
  const distr = [];
  cargas.filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const g = z.g;
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const dd = dirCarga(c, g);   // sentido de la carga positiva, en el mundo
    distr.push({a:{x:g.a.x+g.ux*z.s1, y:g.a.y+g.uy*z.s1},
                b:{x:g.a.x+g.ux*z.s2, y:g.a.y+g.uy*z.s2},
                wa:w1, wb:w2, nwx:-dd.x, nwy:-dd.y, esT:c.tipo==='T'});
  });
  const wmax = Math.max(1e-9, ...distr.map(d=>Math.max(Math.abs(d.wa),Math.abs(d.wb))));
  distr.forEach(d=>{
    const A={x:SX(d.a.x),y:SY(d.a.y)}, B={x:SX(d.b.x),y:SY(d.b.y)};
    const ox=d.nwx, oy=-d.nwy;
    // altura CON SIGNO: la carga negativa cambia de lado y de sentido
    const ha=26*d.wa/wmax, hb=26*d.wb/wmax;
    const A2={x:A.x+ox*ha, y:A.y+oy*ha}, B2={x:B.x+ox*hb, y:B.y+oy*hb};
    sv += '<path d="M '+F1(A.x)+' '+F1(A.y)+' L '+F1(B.x)+' '+F1(B.y)
      +' L '+F1(B2.x)+' '+F1(B2.y)+' L '+F1(A2.x)+' '+F1(A2.y)
      +' Z" fill="#b8860b" fill-opacity=".14"/>';
    sv += linea(A2.x,A2.y,B2.x,B2.y,'#b8860b',1.8);
    const nf = 4;
    for(let q=0;q<=nf;q++){
      const f=q/nf;
      const bx=A.x+(B.x-A.x)*f, by=A.y+(B.y-A.y)*f;
      const hh=ha+(hb-ha)*f, sg=Math.sign(hh)||1;
      if(Math.abs(hh)>4) sv += flecha(bx+ox*hh, by+oy*hh, bx+ox*3*sg, by+oy*3*sg, '#b8860b', 1.6);
    }
    const va=Math.sign(d.wa)||1, vb=Math.sign(d.wb)||1;
    if(Math.abs(d.wa) > 5e-9)
      sv += texto(A2.x, A2.y + (oy*va<0 ? -5 : 13), dec(Math.abs(d.wa),'f'), '#8a6508', 9.5, 700, 'middle');
    if((d.esT || Math.abs(d.wb-d.wa) > 1e-9) && Math.abs(d.wb) > 5e-9)
      sv += texto(B2.x, B2.y + (oy*vb<0 ? -5 : 13), dec(Math.abs(d.wb),'f'), '#8a6508', 9.5, 700, 'middle');
  });

  // ── barras
  tramos.forEach(t=>{
    const g = geoTramo(t); if(!g) return;
    sv += linea(SX(g.a.x), SY(g.a.y), SX(g.b.x), SY(g.b.y), '#26415e', 4.6);
  });

  // ── nudos con su nombre (la rótula se distingue con círculo abierto)
  nodos.forEach(n=>{
    sv += '<circle cx="'+F1(SX(n.x))+'" cy="'+F1(SY(n.y))
      +'" r="4.4" fill="'+(n.rotula?'#fff':'#26415e')+'" stroke="#26415e" stroke-width="2"/>';
    sv += texto(SX(n.x)-9, SY(n.y)+17, n.nombre, '#1b1f24', 11, 800);
  });

  // ── cargas puntuales y momentos aplicados (del modelo, no del resultado:
  //    así la ventana los redibuja con el valor vigente de la rueda)
  (r.acc || []).forEach(a=>{
    if(a.carga && (a.carga.tipo==='U' || a.carga.tipo==='T')) return;
    const X = SX(a.x), Y = SY(a.y);
    const Fm = Math.hypot(a.fx, a.fy);
    if(Fm > 1e-12){
      const ex=a.fx/Fm, ey=-a.fy/Fm;
      sv += flecha(X-ex*34, Y-ey*34, X-ex*4, Y-ey*4, '#c62828', 2.2);
      // con la flecha casi vertical el rótulo se corre a un lado del asta,
      // que es donde suelen estar los valores de las repartidas
      const dxr = Math.abs(ex) < 0.3 ? 15 : 0;
      sv += texto(X-ex*46+dxr, Y-ey*46+3, dec(Fm,'f'), '#c62828', 10, 800, 'middle');
    }
    if(Math.abs(a.m) > 1e-12){
      sv += arcoM(X, Y, 15, '#8b5cf6', a.m < 0);
      sv += texto(X+24, Y-18, dec(Math.abs(a.m),'mom'), '#8b5cf6', 10, 800);
    }
  });

  // ── reacciones en verde con sus valores
  r.inc.forEach((u,j)=>{
    const v = r.val[j];
    if(Math.abs(v) < 5e-9) return;   // una reacción nula solo añade ruido
    const X = SX(u.n.x), Y = SY(u.n.y);
    if(u.tipo === 'M'){
      sv += arcoM(X, Y, 19, '#1a7f37', v < 0);
      sv += texto(X+27, Y+24, dec(Math.abs(v),'mom'), '#1a7f37', 10, 800);
      return;
    }
    let dx, dy;
    if(u.ang !== undefined){ dx = Math.cos(u.ang); dy = Math.sin(u.ang); }
    else if(u.tipo === 'Rx'){ dx = 1; dy = 0; }
    else { dx = 0; dy = 1; }
    // sentido real: la flecha apunta hacia donde empuja la reacción
    const s = v >= 0 ? 1 : -1;
    const ex = dx*s, ey = -dy*s;
    sv += flecha(X-ex*36, Y-ey*36, X-ex*5, Y-ey*5, '#1a7f37', 2.4);
    sv += texto(X-ex*48, Y-ey*48+3, dec(Math.abs(v),'f'), '#1a7f37', 10, 800, 'middle');
  });

  // ── cadena de cotas por cada grupo de dirección, del lado libre
  const gs = gruposDireccion(r);
  gs.forEach(gg=>{
    const ux = Math.cos(gg.ang*Math.PI/180), uy = Math.sin(gg.ang*Math.PI/180);
    // normal en pantalla: hacia abajo/afuera del cuerpo
    const nx = -uy, ny = ux;                 // normal en mundo
    const pnx = nx, pny = -ny;               // normal en pantalla (y invertida)
    // Los bloques de carga repartida se dibujan del lado +n: la cadena de
    // cotas va al lado contrario para no montarse sobre ellos.
    const lado = -1;
    // Separación holgada: los rótulos de las reacciones quedan a 48 px del
    // nudo y la cadena no debe pisarlos.
    const SEP = 66;
    const ptos = gg.tramos.map(t=>t.desde).concat([gg.hasta]);
    const q = p => ({x:SX(p.x)+pnx*lado*SEP, y:SY(p.y)+pny*lado*SEP});
    const q0 = q(ptos[0]), q1 = q(ptos[ptos.length-1]);
    sv += linea(q0.x, q0.y, q1.x, q1.y, '#6b7684', 1.2);
    ptos.forEach(p=>{
      const b0 = {x:SX(p.x)+pnx*lado*8, y:SY(p.y)+pny*lado*8};
      const b1 = q(p);
      sv += linea(b0.x, b0.y, b1.x, b1.y, '#9aa4b1', .9, '3 3');   // extensión
      sv += linea(b1.x-3, b1.y+3, b1.x+3, b1.y-3, '#6b7684', 1.4); // tick
    });
    gg.tramos.forEach((t,i)=>{
      const a2 = q(ptos[i]), b2 = q(ptos[i+1]);
      sv += texto((a2.x+b2.x)/2, (a2.y+b2.y)/2 + (lado>0?13:-6),
                  dec(t.L,'len') + ' ' + unitLen, '#4a5460', 9.5, 700, 'middle');
    });
  });

  sv += '</svg>';
  return sv;
}

// ── Recalcula y repinta toda la ventana ──
function vdRender(){
  const dclW = document.getElementById('vdDCL');
  const diagW = document.getElementById('vdDiag');
  if(!dclW || !diagW) return;
  const r = analizar();
  if(r.error){
    diagW.innerHTML = '<div class="verdict bad"><div class="verdict-t">Estructura no resoluble'
      + '</div>Con estos valores el sistema no tiene solución única.</div>';
    return;
  }
  r.internas = fuerzasInternas(r);
  const gs = gruposDireccion(r);
  if(_vdGrupo >= gs.length) _vdGrupo = 0;
  const g = gs[_vdGrupo];
  dclW.innerHTML = svgDCLGlobal(r);
  diagW.innerHTML = '<div class="proc-block">' + svgDiagramas(r, g) + '</div>'
                  + htmlExtremosGrupo(r, g);
}


// ── Grupos por cambio de dirección ──
// Los tramos consecutivos que siguen la MISMA recta forman un solo grupo:
// para el alumno "ABC recto" es un único elemento aunque internamente sean
// dos tramos. Cada quiebre abre un grupo nuevo, y cada grupo tiene sus tres
// diagramas con su propia abscisa medida desde el punto de quiebre.
const TOL_ANG_GRUPO = 0.5;   // grados; por debajo se considera la misma recta

function gruposDireccion(r){
  const g = [];
  r.internas.forEach(t=>{
    const ult = g[g.length-1];
    // Diferencia de ángulos normalizada a (-180, 180]. Dos tramos siguen la
    // misma recta si esa diferencia es casi nula.
    const d = ult ? ((t.ang - ult.ang + 540) % 360) - 180 : 999;
    const mismaRecta = ult && Math.abs(d) < TOL_ANG_GRUPO;
    if(mismaRecta){
      ult.tramos.push(t); ult.L += t.L; ult.hasta = t.hasta;
    } else {
      g.push({tramos:[t], ang:t.ang, L:t.L, s0:t.s0, desde:t.desde, hasta:t.hasta});
    }
  });
  g.forEach((gr,i)=>{
    gr.idx = i;
    gr.inclinado = Math.abs(gr.ang) > TOL_ANG_GRUPO;
    // En un tramo inclinado la abscisa no es x ni y, sino la resultante de
    // ambos catetos: se llama r para dejarlo claro.
    gr.simbolo = gr.inclinado ? 'r' : 'x';
    gr.nombre = gr.desde.nombre + gr.hasta.nombre;
    gr.recorrido = gr.tramos.map(t=>t.desde.nombre).join('') + gr.hasta.nombre;
  });
  return g;
}

function svgDiagramas(r, grupo){
  const lista = grupo ? grupo.tramos : r.internas;
  const base0 = grupo ? grupo.s0 : 0;
  const simb  = grupo ? grupo.simbolo : 'x';
  const total = lista.reduce((s,t)=>s+t.L, 0) || 1;
  const W2 = 700, alto = 118, sep = 34, M = 58;
  const H = 3*alto + 2*sep + 56;
  let s = '<svg viewBox="0 0 '+W2+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">';
  s += '<rect width="'+W2+'" height="'+H+'" fill="#fff"/>';
  const anchoUtil = W2 - 2*M;
  const series = [
    {k:'N', col:'#0e9f6e', tit:'DFN — Fuerza normal',   u:'f'},
    {k:'V', col:'#d94f5c', tit:'DFC — Fuerza cortante', u:'f'},
    {k:'M', col:'#8b5cf6', tit:'DMF — Momento flector', u:'mom'}
  ];
  const PX = x => M + x/total*anchoUtil;

  series.forEach((se, si)=>{
    const y0 = 26 + si*(alto+sep);
    const yc = y0 + alto/2;
    const ramas = muestrearSerie(r, se.k, lista, base0);
    let vmax = 1e-9;
    ramas.forEach(rm=>{
      if(rm.salto){ vmax = Math.max(vmax, Math.abs(rm.de), Math.abs(rm.a)); }
      else rm.pts.forEach(p=>{ vmax = Math.max(vmax, Math.abs(p.v)); });
    });
    const esc = (alto/2 - 20)/vmax;
    const PY = v => yc - v*esc;

    s += '<text x="'+M+'" y="'+(y0-8)+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="'+se.col+'">'+se.tit+'</text>';

    // marcas verticales de los nudos
    let ac = 0;
    lista.forEach(t=>{
      const X = PX(ac);
      s += '<line x1="'+X.toFixed(1)+'" y1="'+y0+'" x2="'+X.toFixed(1)+'" y2="'+(y0+alto)+'" stroke="#dfe4ea" stroke-width="1" stroke-dasharray="3,3"/>';
      ac += t.L;
    });
    s += '<line x1="'+PX(total).toFixed(1)+'" y1="'+y0+'" x2="'+PX(total).toFixed(1)+'" y2="'+(y0+alto)+'" stroke="#dfe4ea" stroke-width="1" stroke-dasharray="3,3"/>';

    // relleno + contorno, rama a rama; los saltos son segmentos verticales
    let d = '', trazo = '';
    ramas.forEach(rm=>{
      if(rm.salto){
        // relleno: se cierra la rama anterior y se abre la siguiente en la
        // misma abscisa, así el área no queda cosida en diagonal
        trazo += ' L '+PX(rm.x).toFixed(1)+' '+PY(rm.a).toFixed(1);
        d += ' L '+PX(rm.x).toFixed(1)+' '+PY(rm.a).toFixed(1);
        return;
      }
      const p = rm.pts;
      if(!trazo){
        d = 'M '+PX(p[0].x).toFixed(1)+' '+yc.toFixed(1)
          + ' L '+PX(p[0].x).toFixed(1)+' '+PY(p[0].v).toFixed(1);
        trazo = 'M '+PX(p[0].x).toFixed(1)+' '+PY(p[0].v).toFixed(1);
      } else {
        trazo += ' L '+PX(p[0].x).toFixed(1)+' '+PY(p[0].v).toFixed(1);
        d     += ' L '+PX(p[0].x).toFixed(1)+' '+PY(p[0].v).toFixed(1);
      }
      for(let i=1;i<p.length;i++){
        trazo += ' L '+PX(p[i].x).toFixed(1)+' '+PY(p[i].v).toFixed(1);
        d     += ' L '+PX(p[i].x).toFixed(1)+' '+PY(p[i].v).toFixed(1);
      }
    });
    d += ' L '+PX(total).toFixed(1)+' '+yc.toFixed(1)+' Z';
    s += '<path d="'+d+'" fill="'+se.col+'" fill-opacity=".14" stroke="none"/>';
    s += '<path d="'+trazo+'" fill="none" stroke="'+se.col+'" stroke-width="1.9" stroke-linejoin="round"/>';

    // eje de referencia por encima del relleno
    s += '<line x1="'+M+'" y1="'+yc+'" x2="'+(W2-M)+'" y2="'+yc+'" stroke="#5b6672" stroke-width="1.2"/>';

    // ── valores anotados ──
    let et = etiquetasSerie(ramas).filter(e=>Math.abs(e.v) > 1e-7);
    // Dos puntos muy próximos con el MISMO valor son el mismo dato leído a
    // ambos lados de una frontera de subtramo: basta una etiqueta.
    et = et.filter((e,i)=> !et.some((q,j)=>
      j < i && Math.abs(q.x-e.x) < 0.06*total &&
      Math.abs(q.v-e.v) < 5e-3*Math.max(1,Math.abs(e.v))));
    // se descartan etiquetas que se pisarían, dando prioridad a saltos y vértices
    const puestas = [];
    et.sort((a,b)=>b.prio-a.prio).forEach(e=>{
      const X = PX(e.x), Y = PY(e.v);
      const txt = dec(e.v, se.u);
      // 5.2 px por carácter aproxima mejor Inter a 9 px que el 3.9 anterior,
      // que subestimaba el ancho y dejaba pasar solapes.
      const w = 5.2*txt.length + 7;
      const arriba = e.v >= 0;
      let ty = arriba ? Y - 5 : Y + 12;
      // si no cabe, se prueba al otro lado antes de renunciar
      const cabe = yy => {
        const caja = {x0:X-w/2, x1:X+w/2, y0:yy-9, y1:yy+4};
        return !puestas.some(q => caja.x0 < q.x1 && caja.x1 > q.x0 && caja.y0 < q.y1 && caja.y1 > q.y0)
               ? caja : null;
      };
      let caja = cabe(ty);
      if(!caja){ ty = arriba ? Y + 12 : Y - 5; caja = cabe(ty); }
      if(!caja) return;
      puestas.push(caja);
      s += '<circle cx="'+X.toFixed(1)+'" cy="'+Y.toFixed(1)+'" r="2" fill="'+se.col+'"/>'
        + '<text x="'+X.toFixed(1)+'" y="'+ty.toFixed(1)+'" font-family="Inter,sans-serif" '
        + 'font-size="9" font-weight="700" fill="'+se.col+'" text-anchor="middle">'+txt+'</text>';
    });
    s += '<text x="'+(M-8)+'" y="'+(yc+3)+'" font-family="Inter,sans-serif" font-size="9" fill="#66727e" text-anchor="end">0</text>';
    s += '<text x="'+(M-8)+'" y="'+(y0+11)+'" font-family="Inter,sans-serif" font-size="8.5" fill="#8892a0" text-anchor="end">'
      + (se.k==='M' ? uMom() : unitFor) + '</text>';
  });

  // etiquetas de nudo y su abscisa, abajo
  let ac3 = 0;
  const yTxt = H - 16, yPos = H - 4;
  lista.forEach((t,i)=>{
    const X = PX(ac3);
    const nd = t.desde ? t.desde.nombre : '';
    s += '<text x="'+X.toFixed(1)+'" y="'+yTxt+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="700" fill="#1b1f24" text-anchor="middle">'+nd+'</text>'
      + '<text x="'+X.toFixed(1)+'" y="'+yPos+'" font-family="Inter,sans-serif" font-size="8" fill="#8892a0" text-anchor="middle">'+dec(ac3,'len')+'</text>';
    ac3 += t.L;
  });
  const ultimo = lista[lista.length-1];
  if(ultimo){
    const X = PX(total);
    s += '<text x="'+X.toFixed(1)+'" y="'+yTxt+'" font-family="Inter,sans-serif" font-size="10.5" font-weight="700" fill="#1b1f24" text-anchor="middle">'+ultimo.hasta.nombre+'</text>'
      + '<text x="'+X.toFixed(1)+'" y="'+yPos+'" font-family="Inter,sans-serif" font-size="8" fill="#8892a0" text-anchor="middle">'+dec(total,'len')+'</text>';
  }
  s += '<text x="'+(W2-M+18)+'" y="'+yTxt+'" font-family="Inter,sans-serif" font-size="10.5" '
    + 'font-style="italic" font-weight="700" fill="#3c4652">'+simb+'</text>';
  s += '</svg>';
  return s;
}

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  met:{titulo:'Método', btn:'rbMet'},
  car:{titulo:'Cargas', btn:'rbCar'},
  ele:{titulo:'Elementos', btn:'rbEle'}
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
