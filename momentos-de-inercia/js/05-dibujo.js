// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function render(){
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0,0,W,H);
  // Fondo OPACO: sin esto el canvas queda transparente y al exportarlo a PDF
  // (toDataURL) la transparencia se imprime en negro.
  ctx.save();
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0,0,W,H);
  ctx.restore();

  // Grid
  if(VIS.grilla) drawGrid(W,H);

  // Axes
  if(VIS.ejes) drawAxes(W,H);

  // Figures
  for(const fig of figures){
    // Una figura se resalta si es la activa O si está marcada con la
    // herramienta Mover / editar.
    drawFigure(fig, fig.id === selectedFigId || selFiguras.indexOf(fig.id) >= 0);
  }

  // Ghost (figure being placed)
  if(selectedFigType && ghostPos){
    drawGhost(selectedFigType, ghostPos);
  }

  // Results overlay (centroid, principal axes)
  if(VIS.cotas){ try{ dibujarCotasGenerales(); }catch(e){} }
  if(results && VIS.centroide){ drawResultsOverlay(); }
}

function drawGrid(W,H){
  const gridColor = 'rgba(4,29,86,.07)';
  const gridColorMajor = 'rgba(4,29,86,.16)';
  // Determine step in world units
  const rawStep = 50 / viewScale; // target ~50px between lines
  const exp = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10,exp);
  const step = rawStep/base < 2 ? base : rawStep/base < 5 ? 2*base : 5*base;
  const majorEvery = 5;

  const originW = screenToWorld(0,0);
  const endW = screenToWorld(W,H);
  const x0 = Math.floor(originW.x/step)*step;
  const y0 = Math.floor(endW.y/step)*step;

  ctx.lineWidth = 0.5;
  let gi = 0;
  for(let wx = x0; wx <= endW.x+step; wx+=step){
    const sx = worldToScreen(wx,0).x;
    ctx.strokeStyle = (Math.round(wx/step)%majorEvery===0) ? gridColorMajor : gridColor;
    ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,H); ctx.stroke();
    gi++;
  }
  for(let wy = y0; wy <= originW.y+step; wy+=step){
    const sy = worldToScreen(0,wy).y;
    ctx.strokeStyle = (Math.round(wy/step)%majorEvery===0) ? gridColorMajor : gridColor;
    ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W,sy); ctx.stroke();
  }
}

function drawAxes(W,H){
  const ox = worldToScreen(0,0);
  ctx.strokeStyle = 'rgba(30,33,38,.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  // X axis
  if(ox.y >= 0 && ox.y <= H){
    ctx.beginPath(); ctx.moveTo(0,ox.y); ctx.lineTo(W,ox.y); ctx.stroke();
    // Arrow
    ctx.fillStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(W-8,ox.y-4); ctx.lineTo(W,ox.y); ctx.lineTo(W-8,ox.y+4); ctx.fill();
    ctx.fillStyle = 'rgba(30,33,38,.35)';
    ctx.font = 'bold 12px Inter'; ctx.fillText('X',W-16,ox.y-6);
  }
  // Y axis
  if(ox.x >= 0 && ox.x <= W){
    ctx.strokeStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(ox.x,H); ctx.lineTo(ox.x,0); ctx.stroke();
    ctx.fillStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(ox.x-4,8); ctx.lineTo(ox.x,0); ctx.lineTo(ox.x+4,8); ctx.fill();
    ctx.fillStyle = 'rgba(30,33,38,.35)';
    ctx.font = 'bold 12px Inter'; ctx.fillText('Y',ox.x+6,16);
  }
  // Origin label
  ctx.fillStyle = 'rgba(30,33,38,.3)'; ctx.font = '10px Inter';
  if(ox.x>=0&&ox.x<=W&&ox.y>=0&&ox.y<=H) ctx.fillText('O',ox.x+3,ox.y-3);
}

function drawFigure(fig, selected){
  const def = FIG_DEFS[fig.type];
  if(!def) return;
  const sp = worldToScreen(fig.cx,fig.cy);
  const color = fig.color;
  const alpha = fig.sign===1 ? 0.25 : 0.12;
  const borderAlpha = fig.sign===1 ? 0.9 : 0.6;

  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(-fig.rotation*Math.PI/180); // negative because Y is flipped
  ctx.scale(viewScale, -viewScale); // flip Y for math coords

  // Fill
  ctx.beginPath();
  def.draw(ctx, fig.dims, selected);
  if(fig.type === 'annulus'){
    // Outer circle
    ctx.beginPath();
    ctx.arc(0,0,fig.dims.R,0,2*Math.PI);
    ctx.fillStyle = hexAlpha(color, alpha);
    ctx.fill();
    // Inner hole
    ctx.beginPath();
    ctx.arc(0,0,fig.dims.r,0,2*Math.PI);
    ctx.fillStyle = 'rgba(6,18,16,1)'; // cut out hole
    ctx.fill();
    // Outer stroke
    ctx.beginPath();
    ctx.arc(0,0,fig.dims.R,0,2*Math.PI);
    ctx.strokeStyle = selected ? '#fff' : hexAlpha(color, borderAlpha);
    ctx.lineWidth = selected ? 2.5/viewScale : 1.5/viewScale;
    ctx.stroke();
    // Inner stroke
    ctx.beginPath();
    ctx.arc(0,0,fig.dims.r,0,2*Math.PI);
    ctx.stroke();
  } else {
    ctx.fillStyle = hexAlpha(color, alpha);
    ctx.fill();
    ctx.strokeStyle = selected ? '#fff' : hexAlpha(color, borderAlpha);
    ctx.lineWidth = selected ? 2.5/viewScale : 1.5/viewScale;
    ctx.stroke();
  }
  // Hatch for negative
  if(fig.sign === -1){
    ctx.beginPath(); def.draw(ctx,fig.dims,selected);
    ctx.clip();
    ctx.strokeStyle = hexAlpha(color,0.3);
    ctx.lineWidth = 1/viewScale;
    for(let i=-200;i<200;i+=8){ ctx.beginPath();ctx.moveTo(i,-200);ctx.lineTo(i+200,200-i);ctx.stroke(); }
  }

  ctx.restore();

  // Centroid dot + label (in screen space)
  ctx.beginPath(); ctx.arc(sp.x,sp.y,4,0,Math.PI*2);
  ctx.fillStyle = selected?'#fff':hexAlpha(color,0.9);
  ctx.fill();

  // Anchor handles — always show on selected figures
  if(selected){
    const anc = def.anchors || ['C'];
    const rot = (fig.rotation||0)*Math.PI/180;
    for(const a of anc){
      const off = def.anchorOffset(fig.dims,a);
      const rdx = off.dx*Math.cos(rot)-off.dy*Math.sin(rot);
      const rdy = off.dx*Math.sin(rot)+off.dy*Math.cos(rot);
      const ap = worldToScreen(fig.cx+rdx, fig.cy+rdy);
      const isActive = a===(fig.activeAnchor||'C');
      ctx.beginPath(); ctx.arc(ap.x,ap.y,isActive?6:4.5,0,Math.PI*2);
      ctx.fillStyle = isActive?'#ffffff':(a==='C'?'#f0c040':'rgba(255,180,60,.85)');
      ctx.strokeStyle = isActive?'#0d3a8f':'rgba(30,33,38,.42)';
      ctx.lineWidth = isActive?2:1;
      ctx.fill(); ctx.stroke();
      if(isActive){ctx.fillStyle='#0d3a8f';ctx.font='bold 9px Inter';ctx.fillText(a==='C'?'G':a,ap.x+7,ap.y-4);}
    }
  }

  // Dimension hint near centroid
  ctx.fillStyle = hexAlpha(color, 0.7);
  ctx.font = '9px Inter';
  ctx.fillText(`(${r2(fig.cx)}, ${r2(fig.cy)})`, sp.x+6, sp.y-6);
}

function drawGhost(type, wpos){
  const def = FIG_DEFS[type];
  if(!def) return;
  const sp = worldToScreen(wpos.x,wpos.y);
  ctx.save();
  ctx.translate(sp.x,sp.y);
  ctx.scale(viewScale,-viewScale);
  ctx.beginPath(); def.draw(ctx, getDefaultDims(type), false);
  ctx.fillStyle = 'rgba(228,172,23,.18)';
  ctx.strokeStyle = 'rgba(228,172,23,.8)';
  ctx.setLineDash([4,3]);
  ctx.lineWidth = 1.5/viewScale;
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
}

function drawResultsOverlay(){
  if(!results) return;
  const sp = worldToScreen(results.xbar,results.ybar);
  // Centroid
  ctx.beginPath(); ctx.arc(sp.x,sp.y,7,0,Math.PI*2);
  ctx.fillStyle = '#f0c040'; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#f0c040'; ctx.font='bold 10px Inter';
  ctx.fillText('C',sp.x+9,sp.y-6);

  // Principal axes
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const theta = results.thetaP * Math.PI/180;
  const len = Math.max(W,H)*0.6;
  ctx.save();
  ctx.translate(sp.x,sp.y);
  ctx.strokeStyle='rgba(240,192,64,.7)'; ctx.lineWidth=1.5;
  ctx.setLineDash([6,4]);
  for(const t of [theta, theta+Math.PI/2]){
    ctx.beginPath();
    ctx.moveTo(-len*Math.cos(t), len*Math.sin(t));
    ctx.lineTo(len*Math.cos(t), -len*Math.sin(t));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── Punto de análisis P y sus ejes principales (color cian) ──
  const ep = computeExtraPoint(results);
  if(ep){
    const pp = worldToScreen(ep.x, ep.y);
    const thP = ep.thetaP * Math.PI/180;
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.strokeStyle='rgba(62,207,180,.85)'; ctx.lineWidth=1.5; ctx.setLineDash([7,4]);
    for(const t of [thP, thP+Math.PI/2]){
      ctx.beginPath();
      ctx.moveTo(-len*Math.cos(t), len*Math.sin(t));
      ctx.lineTo(len*Math.cos(t), -len*Math.sin(t));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    // ── Ejes u-v girados un ángulo θ definido por el usuario (rojo) ──
    if(ep.rot){
      const thR = ep.rot.ang * Math.PI/180;
      ctx.save();
      ctx.translate(pp.x, pp.y);
      ctx.strokeStyle='#c0392b'; ctx.lineWidth=2; ctx.setLineDash([]);
      for(const [ang,lab] of [[thR,'u'],[thR+Math.PI/2,'v']]){
        ctx.beginPath();
        ctx.moveTo(-len*Math.cos(ang), len*Math.sin(ang));
        ctx.lineTo( len*Math.cos(ang),-len*Math.sin(ang));
        ctx.stroke();
        // rótulo del eje en su extremo positivo
        const lx=140*Math.cos(ang), ly=-140*Math.sin(ang);
        ctx.font='bold 13px Inter'; ctx.textAlign='center';
        ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillRect(lx-9, ly-11, 18, 16);
        ctx.fillStyle='#c0392b'; ctx.fillText(lab, lx, ly+1);
      }
      // arco del ángulo θ desde el eje X hasta el eje u
      const ra=52;
      ctx.strokeStyle='#c0392b'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,ra, 0, -thR, thR>0); ctx.stroke();
      const am=-thR/2;
      ctx.font='bold 12px Inter'; ctx.textAlign='left';
      const tx='θ='+decFix(ep.rot.ang,'ang')+'°';
      const wt=ctx.measureText(tx).width+8;
      ctx.fillStyle='rgba(255,255,255,.92)';
      ctx.fillRect((ra+8)*Math.cos(am)-3, (ra+8)*Math.sin(am)-11, wt, 16);
      ctx.fillStyle='#c0392b'; ctx.fillText(tx, (ra+8)*Math.cos(am), (ra+8)*Math.sin(am));
      ctx.restore();
    }
    // marcador del punto P
    ctx.beginPath(); ctx.arc(pp.x,pp.y,6,0,Math.PI*2);
    ctx.fillStyle='#0d3a8f'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#0d3a8f'; ctx.font='bold 10px Inter';
    ctx.fillText('P', pp.x+9, pp.y-6);
  }
}

function hexAlpha(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function r2(v){ return typeof v==='number' ? (Math.abs(v)<0.001?0:decFix(v,'len')) : v; }
