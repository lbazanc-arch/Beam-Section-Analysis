// ── Análisis de inercia en un punto arbitrario P (ejes ∥ a X-Y) ──

// Rotación de ejes: transforma (Ix, Iy, Ixy) un ángulo θ respecto al eje X.
//   Iu  = (Ix+Iy)/2 + (Ix−Iy)/2·cos2θ − Ixy·sen2θ
//   Iv  = (Ix+Iy)/2 − (Ix−Iy)/2·cos2θ + Ixy·sen2θ
//   Iuv = (Ix−Iy)/2·sen2θ + Ixy·cos2θ
// En θ = ±90° y ±270° los ejes intercambian papeles: el eje u queda sobre Y,
// por lo que Iu pasa a valer Iy (y viceversa). El cálculo lo refleja de forma exacta.
function rotateInertia(Ix, Iy, Ixy, thetaDeg){
  const th = thetaDeg*Math.PI/180;
  const c2 = Math.cos(2*th), s2 = Math.sin(2*th);
  const avg = (Ix+Iy)/2, dif = (Ix-Iy)/2;
  let Iu  = avg + dif*c2 - Ixy*s2;
  let Iv  = avg - dif*c2 + Ixy*s2;
  let Iuv = dif*s2 + Ixy*c2;
  // limpieza de residuos numéricos en múltiplos exactos de 90°
  const m = ((thetaDeg % 180)+180)%180;
  const near = (a,b)=>Math.abs(a-b)<1e-9;
  if(near(m,0)){   Iu=Ix; Iv=Iy; Iuv=Ixy; }
  if(near(m,90)){  Iu=Iy; Iv=Ix; Iuv=-Ixy; }   // ejes intercambiados: Iu ≡ Iy
  return {Iu, Iv, Iuv, swapped: near(m,90)};
}

function computeExtraPoint(res){
  if(!extraPoint || !res) return null;
  const dx = res.xbar - extraPoint.x;   // centroide relativo a P
  const dy = res.ybar - extraPoint.y;
  const IxP  = res.Ix  + res.A*dy*dy;
  const IyP  = res.Iy  + res.A*dx*dx;
  const IxyP = res.Ixy + res.A*dx*dy;
  const avg=(IxP+IyP)/2;
  const R=Math.sqrt(Math.pow((IxP-IyP)/2,2)+IxyP*IxyP);
  const thetaP = -0.5*Math.atan2(2*IxyP, IxP-IyP)*180/Math.PI;
  const out = {x:extraPoint.x, y:extraPoint.y, dx, dy, IxP, IyP, IxyP, avg, R, Imax:avg+R, Imin:avg-R, thetaP};
  if(axisAngle!==null && isFinite(axisAngle)){
    const rot = rotateInertia(IxP, IyP, IxyP, axisAngle);
    const norm = ((axisAngle % 360)+360)%360;   // 0..360
    out.rot = {
      ang: axisAngle,
      norm,
      Iu: rot.Iu, Iv: rot.Iv, Iuv: rot.Iuv,
      swapped: rot.swapped,
      c2: Math.cos(2*axisAngle*Math.PI/180),
      s2: Math.sin(2*axisAngle*Math.PI/180)
    };
  }
  return out;
}
function analyzeAxisAngle(){
  if(!results||!extraPoint){ return; }
  const ai=document.getElementById('epAng');
  const a=parseFloat(ai&&ai.value);
  if(!isFinite(a)){ aviso('Ingresa el ángulo de rotación de los ejes (en grados, respecto al eje X).'); return; }
  axisAngle = a;
  renderResults(results, currentU4, currentU2, currentU1);
  render();
}
function clearAxisAngle(){
  axisAngle = null;
  if(results){ renderResults(results, currentU4, currentU2, currentU1); render(); }
}
function analyzePoint(){
  if(!results){ return; }
  const xi=document.getElementById('epX'), yi=document.getElementById('epY');
  const x=parseFloat(xi&&xi.value), y=parseFloat(yi&&yi.value);
  if(!isFinite(x)||!isFinite(y)){ aviso('Ingresa las coordenadas X e Y del punto a analizar.'); return; }
  extraPoint = {x, y};
  renderResults(results, currentU4, currentU2, currentU1);
  render();
}
function clearExtraPoint(){
  extraPoint = null; axisAngle = null;
  if(results){ renderResults(results, currentU4, currentU2, currentU1); render(); }
}


function drawMohr(data, target, override){
  target = target || 'mohrCanvas';
  const c = (typeof target==='string') ? document.getElementById(target) : target;
  if(!c) return;
  override = override || {};
  const dpr = override.res || window.devicePixelRatio || 1;
  const W = override.W || c.clientWidth || 800;
  const H = override.H || c.clientHeight || 320;
  c.width=W*dpr; c.height=H*dpr;
  const cx2=c.getContext('2d'); cx2.setTransform(dpr,0,0,dpr,0,0);

  const PAD=48; // padding for axis labels
  const cw=W-PAD, ch=H-PAD; // drawable area
  const ox=PAD, oy=H-PAD; // origin screen position (bottom-left of drawable area)

  const avg=(data.Ix+data.Iy)/2;
  const R=Math.sqrt(Math.pow((data.Ix-data.Iy)/2,2)+data.Ixy*data.Ixy);

  // World extent: center = avg on X, 0 on Y, radius R
  // Add 15% margin so circle doesn't touch edges
  // R = 0 es el círculo de Mohr degenerado (Ix = Iy, Ixy = 0): un cuadrado o
  // un círculo. Aquí ponía 'res', que no existe en esta función; el parámetro
  // es 'data'. Saltaba ReferenceError y calculate() no llegaba a mostrar nada.
  const xRange = R>0 ? R*2.3 : Math.max(Math.abs(data.Ix-avg),Math.abs(data.Iy-avg))*2.3||100;
  const yRange = R>0 ? R*2.3 : Math.max(Math.abs(data.Ixy),1)*2.3||100;
  const scaleX = cw/xRange;
  const scaleY = ch/yRange;
  const scale = Math.min(scaleX,scaleY);

  // Screen transform: world(I, Ixy) -> screen(sx, sy)
  const sx = (I) => ox + (I-avg)*scale + cw/2;
  const sy = (Ixy) => oy - Ixy*scale - ch/2 + ch/2; // flip Y

  // Redefine: center of drawable area
  const cx_s = ox + cw/2;   // screen x of avg
  const cy_s = oy - ch/2;   // screen y of 0

  // Helper
  const toScreen = (I, Ixy) => ({x: cx_s + (I-avg)*scale, y: cy_s - Ixy*scale});

  // Auto format for axis labels
  const fmtAxis = (v) => {
    const abs=Math.abs(v); if(abs===0) return '0';
    if(abs>=1e6) return (v/1e6).toFixed(1)+'M';
    if(abs>=1e3) return (v/1e3).toFixed(1)+'k';
    if(abs<0.001) return v.toExponential(1);
    return parseFloat(v.toPrecision(3)).toString();
  };

  cx2.clearRect(0,0,W,H);
  cx2.fillStyle='#ffffff'; cx2.fillRect(0,0,W,H);

  // Grid lines & axis ticks
  cx2.font='bold 11px Inter'; cx2.fillStyle='rgba(30,33,38,.72)'; cx2.textAlign='center';

  // X axis ticks: Imin, avg, Imax
  const xTicks = [avg-R, avg, avg+R];
  const xLabels = ['Iₘᵢₙ', 'avg', 'Iₘₐₓ'];
  cx2.strokeStyle='rgba(30,33,38,.08)'; cx2.lineWidth=0.5;
  for(let i=0;i<xTicks.length;i++){
    const spx = toScreen(xTicks[i],0).x;
    // vertical grid line
    cx2.beginPath(); cx2.moveTo(spx, PAD/2); cx2.lineTo(spx, cy_s+ch/2+4); cx2.stroke();
    // tick label
    cx2.fillStyle='rgba(30,33,38,.42)';
    cx2.fillText(fmtAxis(xTicks[i]), spx, cy_s+ch/2+14);
  }
  // Y axis ticks: -R, 0, R (Ixy values)
  const yTicks = R>0 ? [-R,0,R] : [-1,0,1];
  cx2.textAlign='right';
  for(const ytick of yTicks){
    const spy = toScreen(avg, ytick).y;
    cx2.strokeStyle='rgba(30,33,38,.08)'; cx2.lineWidth=0.5;
    cx2.beginPath(); cx2.moveTo(ox-4, spy); cx2.lineTo(cx_s+cw/2, spy); cx2.stroke();
    cx2.fillStyle='rgba(30,33,38,.42)';
    cx2.fillText(fmtAxis(ytick), ox-6, spy+3);
  }

  // Axis lines
  cx2.strokeStyle='rgba(30,33,38,.25)'; cx2.lineWidth=1;
  // X axis (Ixy=0)
  cx2.beginPath(); cx2.moveTo(ox-4, cy_s); cx2.lineTo(ox+cw, cy_s); cx2.stroke();
  // Y axis (I=avg) — center vertical
  cx2.beginPath(); cx2.moveTo(cx_s, PAD/2); cx2.lineTo(cx_s, oy+4); cx2.stroke();

  // Axis labels
  cx2.fillStyle='#1e2126'; cx2.font='bold 13px Inter';
  cx2.textAlign='right';
  cx2.fillText('I  (Ix , Iy) →', ox+cw-4, cy_s-8);
  cx2.textAlign='center';
  cx2.fillText('Ixy', cx_s, PAD/2-2);

  // Circle
  if(R>0){
    cx2.strokeStyle='rgba(228,172,23,.9)'; cx2.lineWidth=1.5;
    cx2.beginPath(); cx2.arc(cx_s, cy_s, R*scale, 0, 2*Math.PI); cx2.stroke();
  }

  // Data points (Ix, Ixy) and (Iy, -Ixy)
  const p1 = toScreen(data.Ix, data.Ixy);
  const p2 = toScreen(data.Iy, -data.Ixy);
  cx2.fillStyle='#0d3a8f';
  cx2.beginPath(); cx2.arc(p1.x,p1.y,4,0,Math.PI*2); cx2.fill();
  cx2.beginPath(); cx2.arc(p2.x,p2.y,4,0,Math.PI*2); cx2.fill();

  // Labels for data points
  // Etiquetas con contraste real (antes eran rosa claro sobre blanco: ilegibles)
  const tag=(txt,X,Y,color,align)=>{
    cx2.font='bold 12px Inter'; cx2.textAlign=align||'left';
    const w=cx2.measureText(txt).width+8;
    const bx = align==='right' ? X-w : X;
    cx2.fillStyle='rgba(255,255,255,.88)';
    cx2.fillRect(bx-2, Y-12, w, 16);
    cx2.fillStyle=color; cx2.fillText(txt, X, Y);
  };
  // A = eje X  ·  B = eje Y
  cx2.strokeStyle='#0d3a8f'; cx2.lineWidth=2;
  tag('A ( Ix , Ixy )  ← eje X', p1.x+8, p1.y-6, '#0d3a8f','left');
  tag('B ( Iy , −Ixy )  ← eje Y', p2.x+8, p2.y+16, '#0d3a8f','left');

  // Diameter line
  cx2.strokeStyle='rgba(240,192,64,.35)'; cx2.lineWidth=1; cx2.setLineDash([4,3]);
  cx2.beginPath(); cx2.moveTo(p1.x,p1.y); cx2.lineTo(p2.x,p2.y); cx2.stroke();
  cx2.setLineDash([]);

  // Principal points
  const pmax = toScreen(avg+R, 0);
  const pmin = toScreen(avg-R, 0);
  cx2.fillStyle='#f0c040';
  cx2.beginPath(); cx2.arc(pmax.x,cy_s,5,0,Math.PI*2); cx2.fill();
  cx2.beginPath(); cx2.arc(pmin.x,cy_s,5,0,Math.PI*2); cx2.fill();
  cx2.fillStyle='#a9791f'; cx2.font='bold 12px Inter';
  cx2.textAlign='left';  cx2.fillText('Imax',pmax.x+8,cy_s+18);
  cx2.textAlign='right'; cx2.fillText('Imin',pmin.x-8,cy_s+18);

  // ── Ángulo de giro de los ejes (2θp en el círculo → θp en la sección) ──
  if(R>0){
    const a1=Math.atan2(-(p1.y-cy_s), p1.x-cx_s);   // ángulo del radio C→A (Y hacia arriba)
    const ar=R*scale;
    // radio C→A y radio C→Imax
    cx2.strokeStyle='rgba(13,58,143,.55)'; cx2.lineWidth=1.5; cx2.setLineDash([5,3]);
    cx2.beginPath(); cx2.moveTo(cx_s,cy_s); cx2.lineTo(p1.x,p1.y); cx2.stroke();
    cx2.setLineDash([]);
    cx2.strokeStyle='#c0392b'; cx2.lineWidth=2;
    cx2.beginPath(); cx2.moveTo(cx_s,cy_s); cx2.lineTo(pmax.x,cy_s); cx2.stroke();
    // arco de 2θp entre ambos radios
    const rr=Math.max(22, Math.min(ar*0.45, 52));
    cx2.strokeStyle='#c0392b'; cx2.lineWidth=2.5;
    cx2.beginPath(); cx2.arc(cx_s, cy_s, rr, -a1, 0, a1<0); cx2.stroke();
    // punta de flecha del arco
    const aMid=-a1/2;
    const hx=cx_s+rr*Math.cos(aMid), hy=cy_s+rr*Math.sin(aMid);
    // rótulo 2θp y θp
    // SIGNO. a1 es el angulo del radio C->A. El solucionador define
    //     theta_p = -0.5*atan2(2*Pxy, Ix-Iy) = -a1/2,
    // luego 2*theta_p = -a1. Aqui se rotulaba twoTheta = +a1, es decir el
    // OPUESTO: para Ix=100, Iy=40, Pxy=20 el panel imprimia theta_p = -16.85
    // y el dibujo, justo debajo, rotulaba +16.85. El trazado del arco ya era
    // correcto; solo fallaban los dos numeros.
    const twoTheta = -a1*180/Math.PI;
    const thetaP   = twoTheta/2;
    const lx=cx_s+(rr+16)*Math.cos(aMid), ly=cy_s+(rr+16)*Math.sin(aMid);
    cx2.font='bold 13px Inter'; cx2.textAlign='left';
    const txt='2θp = '+twoTheta.toFixed(DEC.ang)+'°';
    const wl=cx2.measureText(txt).width+10;
    cx2.fillStyle='rgba(255,255,255,.92)'; cx2.fillRect(lx-4, ly-13, wl, 18);
    cx2.fillStyle='#c0392b'; cx2.fillText(txt, lx, ly);
    // nota inferior: giro real de los ejes en la sección
    cx2.font='bold 12px Inter'; cx2.textAlign='left';
    cx2.fillStyle='#c0392b';
    cx2.fillText('Giro de los ejes en la sección:  θp = '+thetaP.toFixed(DEC.ang)+'°   (2θp en el círculo)', ox-8, H-8);
  }

  // ── Rotación de ejes solicitada por el usuario: punto U(Iu,Iuv) y su radio ──
  if(R>0 && override.rot && isFinite(override.rot.ang)){
    const rt=override.rot;
    const pu = toScreen(rt.Iu,  rt.Iuv);
    const pv = toScreen(rt.Iv, -rt.Iuv);
    // el giro en el círculo es el DOBLE del giro de los ejes
    const aA=Math.atan2(-(p1.y-cy_s), p1.x-cx_s);
    const aU=Math.atan2(-(pu.y-cy_s), pu.x-cx_s);
    const rr2=Math.max(30, Math.min(R*scale*0.72, 74));
    cx2.strokeStyle='#c0392b'; cx2.lineWidth=2.5;
    cx2.beginPath(); cx2.arc(cx_s, cy_s, rr2, -aA, -aU, (aU-aA)>0); cx2.stroke();
    // diámetro girado U–V
    cx2.strokeStyle='rgba(192,57,43,.55)'; cx2.lineWidth=2; cx2.setLineDash([6,4]);
    cx2.beginPath(); cx2.moveTo(pu.x,pu.y); cx2.lineTo(pv.x,pv.y); cx2.stroke();
    cx2.setLineDash([]);
    // puntos U y V
    cx2.fillStyle='#c0392b';
    cx2.beginPath(); cx2.arc(pu.x,pu.y,5,0,Math.PI*2); cx2.fill();
    cx2.beginPath(); cx2.arc(pv.x,pv.y,5,0,Math.PI*2); cx2.fill();
    const box=(txt,X,Y)=>{ cx2.font='bold 12px Inter'; cx2.textAlign='left';
      const w=cx2.measureText(txt).width+8;
      cx2.fillStyle='rgba(255,255,255,.9)'; cx2.fillRect(X-2,Y-12,w,16);
      cx2.fillStyle='#c0392b'; cx2.fillText(txt,X,Y); };
    box('U ( Iu , Puv )  ← eje u', pu.x+8, pu.y-6);
    box('V ( Iv , −Puv ) ← eje v', pv.x+8, pv.y+16);
    // rótulo del arco 2θ
    const am2=-(aA+aU)/2;
    const lx2=cx_s+(rr2+14)*Math.cos(am2), ly2=cy_s+(rr2+14)*Math.sin(am2);
    box('2θ = '+decFix(2*rt.ang,'ang')+'°', lx2, ly2);
    cx2.font='bold 12px Inter'; cx2.textAlign='right'; cx2.fillStyle='#c0392b';
    cx2.fillText('Ejes girados θ = '+decFix(rt.ang,'ang')+'°', ox+cw, H-8);
  }

  // Center dot
  cx2.fillStyle='rgba(30,33,38,.75)'; cx2.beginPath(); cx2.arc(cx_s,cy_s,4,0,Math.PI*2); cx2.fill();
  cx2.font='bold 11px Inter'; cx2.fillStyle='rgba(30,33,38,.75)'; cx2.textAlign='center';
  cx2.fillText('C', cx_s, cy_s-9);
}
