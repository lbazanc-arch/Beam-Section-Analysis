// ═══════════════════════════════════════════════════════════
//  DIBUJO
// ═══════════════════════════════════════════════════════════
function ajustarCanvas(){
  const a = document.getElementById('canvasArea');
  if(!a || !cv) return;
  const r = a.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = r.width; H = r.height;
  cv.width = Math.max(1, Math.round(W*dpr));
  cv.height = Math.max(1, Math.round(H*dpr));
  cv.style.width = W+'px'; cv.style.height = H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dibujar();
}

function pasoRejilla(){
  // Paso "bonito" (1,2,5,10,20,50...) para que las líneas queden a unos 30 px
  // sin importar la unidad. Con un paso fijo de 1, en centímetros se dibujaban
  // cientos de líneas y la vista se saturaba.
  const objetivo = 34 / escala;
  const exp = Math.floor(Math.log10(Math.max(objetivo, 1e-9)));
  const base = Math.pow(10, exp);
  const m = objetivo / base;
  const mult = m <= 1 ? 1 : (m <= 2 ? 2 : (m <= 5 ? 5 : 10));
  return mult * base;
}

function dibujarRejilla(){
  const paso = pasoRejilla();
  ctx.lineWidth = 1;
  const [x0,y0] = aMundo(0,H), [x1,y1] = aMundo(W,0);
  const i0 = Math.floor(x0/paso), i1 = Math.ceil(x1/paso);
  const j0 = Math.floor(y0/paso), j1 = Math.ceil(y1/paso);
  for(let i=i0;i<=i1;i++){
    const [px] = aPantalla(i*paso, 0);
    ctx.strokeStyle = (i%5===0) ? 'rgba(120,132,148,.20)' : 'rgba(120,132,148,.09)';
    ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
  }
  for(let j=j0;j<=j1;j++){
    const [,py] = aPantalla(0, j*paso);
    ctx.strokeStyle = (j%5===0) ? 'rgba(120,132,148,.20)' : 'rgba(120,132,148,.09)';
    ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
  }
}

// Los ejes X/Y se dibujan aparte de la rejilla: son dos capas distintas y
// cada una tiene su propio interruptor en Configuración.
function dibujarEjes(){
  const [ox,oy] = aPantalla(0,0);
  ctx.strokeStyle = 'rgba(80,92,108,.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(W,oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,H); ctx.stroke();
}

// Sin colores de tracción/compresión: la barra se ve igual antes y después de
// calcular; el signo está en el panel de resultados y en el informe. Solo las
// de fuerza cero se distinguen (gris y a trazos), que no es un color de T/C.
function colorBarra(f){
  if(f === undefined || f === null) return '#7c3a06';
  if(esCero(f)) return '#9aa3ad';
  return '#7c3a06';
}

function dibujarApoyo(n){
  const [px,py] = aPantalla(n.x, n.y);
  ctx.strokeStyle = '#7c3a06'; ctx.fillStyle = '#7c3a06'; ctx.lineWidth = 2;
  if(n.apoyo === 'fijo'){
    ctx.beginPath();
    ctx.moveTo(px, py+2); ctx.lineTo(px-13, py+21); ctx.lineTo(px+13, py+21); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px-19, py+21); ctx.lineTo(px+19, py+21); ctx.stroke();
    for(let i=-3;i<=3;i++){
      ctx.beginPath(); ctx.moveTo(px+i*5.5, py+21); ctx.lineTo(px+i*5.5-4, py+27); ctx.stroke();
    }
  } else if(n.apoyo === 'movil'){
    const horizontal = n.apAng === 0;
    ctx.save();
    ctx.translate(px, py);
    if(horizontal) ctx.rotate(-Math.PI/2);   // de costado, contra una superficie vertical
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(-13, 18); ctx.lineTo(13, 18); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(-7, 22.5, 4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(7, 22.5, 4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-19, 27.5); ctx.lineTo(19, 27.5); ctx.stroke();
    ctx.restore();
  }
}

function dibujarCarga(n){
  // Fuente de verdad: n.cargas (una o varias fuerzas). Si el nudo viene de un
  // formato antiguo sin ese arreglo, se usa la resultante fx/fy como una
  // única carga implícita, para no perder dibujos guardados previamente.
  const lista = (n.cargas && n.cargas.length) ? n.cargas
              : ((!esCero(n.fx||0) || !esCero(n.fy||0)) ? [{fx:n.fx||0, fy:n.fy||0}] : []);
  if(!lista.length) return;
  const [px,py] = aPantalla(n.x, n.y);
  const L = 46;
  lista.forEach(c=>{
    if(esCero(c.fx||0) && esCero(c.fy||0)) return;
    const mag = Math.hypot(c.fx||0, c.fy||0);
    const ux = c.fx/mag, uy = c.fy/mag;
    // la flecha apunta hacia el nudo, terminando en él; con varias cargas
    // todas parten del mismo punto y se distinguen por su propia dirección
    const sx = px - ux*L, sy = py + uy*L;
    ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px - ux*11, py + uy*11); ctx.stroke();
    const ang = Math.atan2(-uy, ux);
    ctx.save(); ctx.translate(px - ux*10, py + uy*10); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11,-5); ctx.lineTo(-11,5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#c0392b';
    ctx.textAlign = 'center';
    ctx.fillText(dec(mag,'f')+' '+unitFor, sx, sy - 5);
    ctx.textAlign = 'start';
  });
}

function dibujarCorte(){
  if(!corte) return;
  const [x1,y1] = aPantalla(corte.x1, corte.y1);
  const [x2,y2] = aPantalla(corte.x2, corte.y2);
  // barras que atraviesa
  barras.forEach(b=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    if(!na||!nb) return;
    if(!cortanSegmentos(na.x,na.y,nb.x,nb.y, corte.x1,corte.y1,corte.x2,corte.y2)) return;
    const [ax,ay] = aPantalla(na.x,na.y), [bx,by] = aPantalla(nb.x,nb.y);
    ctx.strokeStyle = 'rgba(192,57,43,.22)'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  });
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.4; ctx.setLineDash([9,6]);
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c0392b';
  [[x1,y1],[x2,y2]].forEach(p=>{
    ctx.beginPath(); ctx.arc(p[0],p[1],4,0,Math.PI*2); ctx.fill();
  });
  ctx.font = '700 10.5px Inter, sans-serif';
  ctx.fillText('corte a–a', (x1+x2)/2 + 8, (y1+y2)/2 - 8);
}

function dibujarCuadroNodo(){
  if(selNodoInfo === null) return;
  const n = nodos.find(z=>z.id===selNodoInfo);
  if(!n) return;
  const [px,py] = aPantalla(n.x, n.y);
  const l1 = 'Nudo ' + n.nombre;
  const l2 = 'x = ' + dec(n.x,'len') + '   y = ' + dec(n.y,'len') + ' ' + unitLen;
  const tieneCarga = !esCero(n.fx) || !esCero(n.fy);
  const l3 = tieneCarga
    ? 'Fx = ' + dec(n.fx,'f') + '   Fy = ' + dec(n.fy,'f') + ' ' + unitFor
    : 'Sin carga aplicada';
  const l4 = n.apoyo ? (descApoyoLargo(n)[0].toUpperCase() + descApoyoLargo(n).slice(1)) : 'Sin apoyo';
  const l5 = 'Doble clic para editar';
  const col = '#7c3a06';
  ctx.font = '800 12px Inter, sans-serif';
  let w = ctx.measureText(l1).width;
  ctx.font = '600 11.5px Inter, sans-serif';
  [l2,l3,l4,l5].forEach(t=>{ w = Math.max(w, ctx.measureText(t).width); });
  w += 22;
  const h = 84;
  let bx = px + 16, by = py - h - 12;
  if(bx + w > W - 6) bx = px - w - 16;
  if(bx < 6) bx = 6;
  if(by < 6) by = py + 16;
  ctx.fillStyle = 'rgba(255,255,255,.97)';
  ctx.strokeStyle = col; ctx.lineWidth = 1.7;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx, by, w, h, 9); else ctx.rect(bx, by, w, h);
  ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1b1f24'; ctx.font = '800 12px Inter, sans-serif';
  ctx.fillText(l1, bx+11, by+18);
  ctx.fillStyle = '#1b1f24'; ctx.font = '600 11.5px Inter, sans-serif';
  ctx.fillText(l2, bx+11, by+34);
  ctx.fillStyle = tieneCarga ? '#c0392b' : '#68727f';
  ctx.fillText(l3, bx+11, by+49);
  ctx.fillStyle = n.apoyo ? '#15803d' : '#68727f';
  ctx.fillText(l4, bx+11, by+64);
  ctx.fillStyle = '#9aa3ad'; ctx.font = '500 10px Inter, sans-serif';
  ctx.fillText(l5, bx+11, by+77);
  ctx.textAlign = 'start';
}

function dibujarCuadroBarra(){
  if(selBarra === null) return;
  const b = barras.find(z=>z.id===selBarra);
  if(!b) return;
  const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
  if(!na || !nb) return;
  const [x1,y1] = aPantalla(na.x,na.y), [x2,y2] = aPantalla(nb.x,nb.y);
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const f = resultado ? resultado.fuerzas[b.id] : null;
  const L = Math.hypot(nb.x-na.x, nb.y-na.y);
  let l2, col = '#7c3a06';
  if(f === null || f === undefined) l2 = 'Sin resolver';
  else if(esCero(f)){ l2 = 'Fuerza cero'; col = '#9aa3ad'; }
  else { l2 = dec(Math.abs(f),'f')+' '+unitFor+(f>0?'  (tracción)':'  (compresión)');
         col = f>0 ? '#1d4ed8' : '#c0392b'; }
  const l1 = 'Barra ' + nombreBarra(b);
  const l3 = 'L = '+dec(L,'len')+' '+unitLen;
  ctx.font = '800 12px Inter, sans-serif';
  let w = ctx.measureText(l1).width;
  ctx.font = '700 12px Inter, sans-serif';
  w = Math.max(w, ctx.measureText(l2).width, ctx.measureText(l3).width) + 22;
  const h = 58;
  let bx = mx - w/2, by = my - h - 16;
  bx = Math.max(6, Math.min(bx, W - w - 6));
  if(by < 6) by = my + 18;
  ctx.fillStyle = 'rgba(255,255,255,.97)';
  ctx.strokeStyle = col; ctx.lineWidth = 1.7;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx, by, w, h, 9); else ctx.rect(bx, by, w, h);
  ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1b1f24'; ctx.font = '800 12px Inter, sans-serif';
  ctx.fillText(l1, bx+11, by+19);
  ctx.fillStyle = col; ctx.font = '700 12px Inter, sans-serif';
  ctx.fillText(l2, bx+11, by+36);
  ctx.fillStyle = '#68727f'; ctx.font = '500 11px Inter, sans-serif';
  ctx.fillText(l3, bx+11, by+51);
  ctx.textAlign = 'start';
}

// ── Visibilidad de capas del dibujo ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, ejes:true, cotas:true, cargas:true, apoyos:true};
function setVis(cual, valor){
  VIS[cual] = !!valor;
  dibujar();
}

// ── Cotas encadenadas de la armadura ──
// Mismo criterio que el Cap. 9 y el Cap. 7: cadenas fuera del dibujo
// (horizontales abajo, verticales a la derecha) tomadas de las coordenadas
// distintas de los nudos, con reparto en niveles para que las etiquetas no
// se solapen cuando dos nudos quedan muy juntos.
function dibujarCotasArmadura(){
  if(nodos.length < 2) return;
  const unicos = (vals)=>{
    const out = [];
    vals.slice().sort((a,b)=>a-b).forEach(v=>{
      if(!out.length || Math.abs(v-out[out.length-1]) > 1e-9) out.push(v);
    });
    return out;
  };
  const xs = unicos(nodos.map(n=>n.x));
  const ys = unicos(nodos.map(n=>n.y));
  if(xs.length < 2 && ys.length < 2) return;

  const NIVEL = 15, HOLGURA = 4;
  ctx.save();
  ctx.strokeStyle = '#1b1f24'; ctx.fillStyle = '#1b1f24'; ctx.lineWidth = 1;
  ctx.font = '600 9px Inter, sans-serif';
  const marca = (x,y)=>{ ctx.beginPath(); ctx.moveTo(x-4,y+4); ctx.lineTo(x+4,y-4); ctx.stroke(); };

  function repartirNiveles(tramos){
    const ocupado = [];
    return tramos.map(t=>{
      const semi = Math.max(t.ancho, 14)/2 + HOLGURA;
      const a = t.centro - semi, b = t.centro + semi;
      let n = 0;
      while(true){
        const lista = ocupado[n] || (ocupado[n] = []);
        if(!lista.some(iv => a < iv[1] && b > iv[0])){ lista.push([a,b]); break; }
        n++; if(n > 6) break;
      }
      return Object.assign({}, t, {nivel:n});
    });
  }

  // cadena horizontal, debajo del punto más bajo
  if(xs.length > 1){
    const yMin = Math.min(...nodos.map(n=>n.y));
    const yb = aPantalla(0, yMin)[1];
    const tramos = [];
    for(let i=0;i<xs.length-1;i++){
      const x1 = aPantalla(xs[i],0)[0], x2 = aPantalla(xs[i+1],0)[0];
      if(Math.abs(x2-x1) < 3) continue;
      const txt = dec(xs[i+1]-xs[i],'len')+' '+unitLen;
      tramos.push({x1,x2,txt,centro:(x1+x2)/2,ancho:ctx.measureText(txt).width});
    }
    const conNivel = repartirNiveles(tramos);
    const nMax = conNivel.reduce((m,t)=>Math.max(m,t.nivel),0);
    const base = Math.min(yb + 34, H - 12 - nMax*NIVEL);
    conNivel.forEach(t=>{
      const y = base + t.nivel*NIVEL;
      ctx.beginPath(); ctx.moveTo(t.x1,y); ctx.lineTo(t.x2,y); ctx.stroke();
      marca(t.x1,y); marca(t.x2,y);
      ctx.textAlign='center'; ctx.fillText(t.txt, t.centro, y-4);
    });
    ctx.save(); ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(27,31,36,.30)';
    const hasta = base + nMax*NIVEL + 4;
    xs.forEach(x=>{ const px = aPantalla(x,0)[0];
      ctx.beginPath(); ctx.moveTo(px, yb+6); ctx.lineTo(px, hasta); ctx.stroke(); });
    ctx.restore();
  }

  // cadena vertical, a la derecha del punto más a la derecha
  if(ys.length > 1){
    const xMax = Math.max(...nodos.map(n=>n.x));
    const xr = aPantalla(xMax,0)[0];
    const tramos = [];
    for(let i=0;i<ys.length-1;i++){
      const y1 = aPantalla(0,ys[i])[1], y2 = aPantalla(0,ys[i+1])[1];
      if(Math.abs(y2-y1) < 3) continue;
      const txt = dec(ys[i+1]-ys[i],'len')+' '+unitLen;
      tramos.push({x1:y1,x2:y2,txt,centro:(y1+y2)/2,ancho:ctx.measureText(txt).width});
    }
    const conNivel = repartirNiveles(tramos);
    const nMax = conNivel.reduce((m,t)=>Math.max(m,t.nivel),0);
    const base = Math.min(xr + 38, W - 14 - nMax*NIVEL);
    conNivel.forEach(t=>{
      const x = base + t.nivel*NIVEL;
      ctx.beginPath(); ctx.moveTo(x,t.x1); ctx.lineTo(x,t.x2); ctx.stroke();
      marca(x,t.x1); marca(x,t.x2);
      ctx.save(); ctx.translate(x+10, t.centro); ctx.rotate(-Math.PI/2);
      ctx.textAlign='center'; ctx.fillText(t.txt, 0, 0); ctx.restore();
    });
    ctx.save(); ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(27,31,36,.30)';
    const hasta = base + nMax*NIVEL + 4;
    ys.forEach(y=>{ const py = aPantalla(0,y)[1];
      ctx.beginPath(); ctx.moveTo(xr+6, py); ctx.lineTo(hasta, py); ctx.stroke(); });
    ctx.restore();
  }
  ctx.textAlign='start';
  ctx.restore();
}

function dibujar(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
  if(VIS.grilla) dibujarRejilla();
  if(VIS.ejes) dibujarEjes();

  // barras
  barras.forEach(b=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    if(!na || !nb) return;
    const [x1,y1] = aPantalla(na.x, na.y), [x2,y2] = aPantalla(nb.x, nb.y);
    const f = resultado ? resultado.fuerzas[b.id] : null;
    ctx.strokeStyle = colorBarra(f);
    ctx.lineWidth = resultado ? (esCero(f) ? 2 : 3.4) : 3;
    if(resultado && esCero(f)) ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.setLineDash([]);
    // Resalte de la barra seleccionada. Los valores ya NO se rotulan todos a la
    // vez: se encabalgaban. Solo se muestra el recuadro de la barra elegida.
    if(selBarra === b.id || selBarras.indexOf(b.id) >= 0){
      ctx.strokeStyle = 'rgba(180,83,9,.30)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
  });
  dibujarCorte();

  // barra en curso
  if(tool==='barra' && selNodo!==null){
    const na = nodos.find(n=>n.id===selNodo);
    if(na && mouseW){
      const [x1,y1] = aPantalla(na.x, na.y), [x2,y2] = aPantalla(mouseW[0], mouseW[1]);
      ctx.strokeStyle = 'rgba(180,83,9,.45)'; ctx.lineWidth = 2.4; ctx.setLineDash([7,5]);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  if(VIS.apoyos) nodos.forEach(n=>{ if(n.apoyo) dibujarApoyo(n); });
  if(VIS.cargas) nodos.forEach(n=>dibujarCarga(n));
  if(VIS.cotas) dibujarCotasArmadura();

  // nudos
  nodos.forEach(n=>{
    const [px,py] = aPantalla(n.x, n.y);
    // halo de selección múltiple
    if(selNodos.indexOf(n.id) >= 0){
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(180,83,9,.26)'; ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI*2);
    ctx.fillStyle = (selNodo===n.id) ? '#b45309' : '#7c3a06';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '700 10.5px Inter, sans-serif'; ctx.fillStyle = '#1b1f24';
    ctx.fillText(n.nombre, px+10, py-8);
  });

  // reacciones resueltas
  if(resultado){
    nodos.forEach(n=>{
      const R = resultado.reacciones[n.id];
      if(!R) return;
      const [px,py] = aPantalla(n.x, n.y);
      ctx.font = '700 10.5px Inter, sans-serif'; ctx.fillStyle = '#15803d';
      let t = [];
      if(R.rx !== undefined) t.push('Rx='+dec(R.rx,'f'));
      if(R.ry !== undefined) t.push('Ry='+dec(R.ry,'f'));
      ctx.textAlign = 'center';
      ctx.fillText(t.join('  '), px, py+44);
      ctx.textAlign = 'start';
    });
  }

  // Recuadro de selección múltiple o de borrado en curso (según herramienta)
  if(gesto && (gesto.tipo === 'rubber' || gesto.tipo === 'rubber-borrar')){
    const x1 = Math.min(gesto.x0, gesto.x1), x2 = Math.max(gesto.x0, gesto.x1);
    const y1 = Math.min(gesto.y0, gesto.y1), y2 = Math.max(gesto.y0, gesto.y1);
    const esBorrado = gesto.tipo === 'rubber-borrar';
    ctx.save();
    ctx.fillStyle = esBorrado ? 'rgba(220,50,50,.10)' : 'rgba(37,99,255,.10)';
    ctx.strokeStyle = esBorrado ? 'rgba(220,50,50,.70)' : 'rgba(37,99,255,.65)';
    ctx.lineWidth = 1; ctx.setLineDash([5,3]);
    ctx.fillRect(x1,y1,x2-x1,y2-y1);
    ctx.strokeRect(x1,y1,x2-x1,y2-y1);
    ctx.restore();
  }

  // El recuadro de información se dibuja al final, por encima de cargas,
  // barras, nudos y cotas, para que se pueda leer con detalle sin que nada
  // se lo tape.
  dibujarCuadroBarra();
  dibujarCuadroNodo();
}
