function downloadPDF(){
  if(!results){aviso('Primero calcula el centro de gravedad.');return;}

  // La ventana debe abrirse ANTES de cualquier operación async, o el
  // bloqueador de pop-ups del navegador la cancela.
  const pdfWin = window.open('', '_blank');
  if(!pdfWin){ aviso('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes para este sitio.', 'error'); return; }

  // Se capturan los tres lienzos del desarrollo: editor, sección con cotas
  // y sección resuelta. (Este capítulo no usa círculos de Mohr.)
  // Los lienzos son mucho más grandes que el dibujo (el editor mide más de
  // 1000 px de ancho y la sección ocupa una parte pequeña). Copiarlos enteros
  // deja franjas blancas enormes en el papel, así que se recortan al contenido.
  function recortarLienzo(cv){
    if(!cv) return null;
    try{
      const w=cv.width, h=cv.height;
      if(!w || !h) return null;
      const ctx=cv.getContext('2d');
      const d=ctx.getImageData(0,0,w,h).data;
      let x0=w, y0=h, x1=-1, y1=-1;
      // Un píxel cuenta como dibujo si no es transparente y no es casi blanco
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          const i=(y*w+x)*4, a=d[i+3];
          if(a<8) continue;
          const r=d[i], g=d[i+1], bl=d[i+2];
          const max=Math.max(r,g,bl), min=Math.min(r,g,bl);
          // La retícula del editor es gris azulado muy claro y sin saturación:
          // se descarta. Cuenta como dibujo lo que tiene color (saturación) o
          // es oscuro (ejes, cotas, texto).
          if((max-min)<=18 && min>=190) continue;
          if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
        }
      }
      if(x1<0) return cv.toDataURL('image/png');   // lienzo vacío: se deja igual
      const m=Math.round(Math.min(w,h)*0.02)+6;    // margen para que no quede pegado
      x0=Math.max(0,x0-m); y0=Math.max(0,y0-m);
      x1=Math.min(w-1,x1+m); y1=Math.min(h-1,y1+m);
      const cw=x1-x0+1, ch=y1-y0+1;
      const tmp=document.createElement('canvas');
      tmp.width=cw; tmp.height=ch;
      const tc=tmp.getContext('2d');
      tc.fillStyle='#ffffff'; tc.fillRect(0,0,cw,ch);   // fondo blanco para el papel
      tc.drawImage(cv, x0,y0,cw,ch, 0,0,cw,ch);
      return tmp.toDataURL('image/png');
    }catch(e){ return cv.toDataURL('image/png'); }
  }

  const mainCv  = document.getElementById('mainCanvas');
  const compCv  = document.getElementById('compositeCanvas');
  const finalCv = document.getElementById('finalCanvas');
  const mainImg  = recortarLienzo(mainCv);
  const compImg  = recortarLienzo(compCv);
  const finalImg = recortarLienzo(finalCv);

  const resultsPanel = document.getElementById('resultsPanel');
  let body = resultsPanel ? resultsPanel.innerHTML : '';
  const imgStyle='max-width:100%;width:auto;height:auto;max-height:290px;border-radius:8px;border:1px solid #ddd;display:block;margin:6px auto;';
  if(compImg) body=body.replace(/<canvas id="compositeCanvas"[^>]*><\/canvas>/,
    '<img src="'+compImg+'" style="'+imgStyle+'">');
  if(finalImg) body=body.replace(/<canvas id="finalCanvas"[^>]*><\/canvas>/,
    '<img src="'+finalImg+'" style="'+imgStyle+'">');
  // cualquier lienzo restante se elimina: en papel quedaría en blanco
  body=body.replace(/<canvas[^>]*><\/canvas>/g,'');

  const encabezadoImg = mainImg
    ? '<div style="margin-bottom:12px;page-break-inside:avoid;"><h3 style="font-size:11px;font-weight:700;'
      +'color:#0f5c56;margin-bottom:5px;font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:.5px;">'
      +'Secci\u00f3n analizada</h3>'
      +'<img src="'+mainImg+'" style="'+imgStyle+'"></div>'
    : '';

  const dt = new Date().toLocaleString('es-PE',{dateStyle:'medium', timeStyle:'short'});

  // El HTML de resultsArea incluye fórmulas renderizadas por KaTeX (spans .katex, .mfrac, etc.).
  // La ventana de impresión es un documento nuevo y no hereda ese CSS, así que hay que
  // copiarlo explícitamente o las fórmulas salen sin estilo (números y símbolos amontonados).
  const katexStyleEl = document.getElementById('katex-css');
  const katexCss = katexStyleEl ? katexStyleEl.textContent : '';

  // Mismo lenguaje visual que el Cap. 10: Inter para rótulos y STIX Two Text
  // para números y fórmulas, igual que en pantalla. @page sin margen + padding
  // en mm para que el contenido use todo el ancho útil de la hoja.
  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--math:'STIX Two Text','Times New Roman',Georgia,serif;
          --sans:Inter,'Helvetica Neue',Arial,sans-serif;
          --grn:#0f5c56;--grn2:#0b3f3a;--card:#f4f9f7;--border:#c8e0d8;
          --text:#1a1a1a;--muted:#5a7570;}
    body{font-family:var(--sans);font-size:10.5px;background:#fff;color:var(--text);
      padding:12mm 9mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .pdf-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--grn2);
      padding-bottom:7px;margin-bottom:10px;}
    .pdf-title{font-size:17px;font-weight:800;color:var(--grn);}
    .pdf-sub{font-size:10px;color:var(--muted);}
    .pdf-date{margin-left:auto;font-size:9px;color:var(--muted);}
    .res-section{margin-bottom:8px;}
    .res-section-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
      color:var(--grn);border-bottom:1.5px solid var(--grn2);padding-bottom:4px;margin:9px 0 6px;}
    .res-section-title .num{width:18px;height:18px;border-radius:50%;background:var(--grn2);
      display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;
      color:#fff;flex:none;}
    .proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;
      padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;}
    .proc-block.proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
    .proc-col{min-width:0;}
    .proc-sub{font-size:9px;font-weight:700;color:var(--grn);text-transform:uppercase;
      letter-spacing:.5px;margin-bottom:4px;}
    .eq-row{margin:1px 0;}
    .eq-body{font-family:var(--math);font-size:11px;color:var(--text);line-height:1.5;margin:1px 0;}
    .eq-body .katex{font-size:1.05em;color:var(--text);}
    .eq-body .v{color:var(--grn);font-weight:700;}
    /* ── Tablas: mismo diseño que el Cap. 10 ── */
    .fig-tabla,.tabla-res{width:100%;border-collapse:collapse;font-family:var(--math);
      font-size:11px;page-break-inside:avoid;}
    .fig-tabla th,.tabla-res th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;
      color:var(--grn);text-transform:uppercase;letter-spacing:.4px;
      border-bottom:1.5px solid var(--border);background:var(--card);font-family:var(--sans);}
    .fig-tabla td,.tabla-res td{padding:2px 6px;border-bottom:1px solid var(--border);
      font-family:var(--math);vertical-align:middle;}
    .tabla-res .fila-total td,.fig-tabla tfoot td,.tabla-res tfoot td{font-weight:700;
      border-top:2px solid var(--border);background:var(--card);color:var(--grn);}
    .num-cell,.v{color:var(--grn);font-style:italic;font-family:var(--math);}
    /* ── Tarjeta por figura: tabla a la izquierda, croquis a la derecha ── */
    .fig-card{display:flex;gap:12px;align-items:stretch;background:var(--card);
      border:1px solid var(--border);border-radius:6px;padding:7px 10px;margin-bottom:7px;
      page-break-inside:avoid;break-inside:avoid;}
    .fig-card-datos{flex:1;min-width:0;display:flex;flex-direction:column;}
    .fig-card-h{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;
      font-family:var(--sans);margin-bottom:6px;flex-wrap:wrap;}
    .fig-card-dib{flex:0 0 175px;display:flex;align-items:stretch;}
    .fig-card-dib .croq{width:100%;margin:0;padding:5px 7px 4px;border:1px solid var(--border);
      border-radius:6px;background:#fff;display:flex;flex-direction:column;justify-content:center;}
    .croq-h{display:flex;align-items:center;gap:6px;margin-bottom:3px;}
    .croq-n{width:14px;height:14px;border-radius:50%;background:var(--grn2);color:#fff;
      font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none;}
    .croq-t{font-size:9px;font-weight:700;line-height:1.2;font-family:var(--sans);}
    .croq-t i{color:#c0392b;font-style:normal;font-size:8px;}
    .croq-svg{width:100%;max-width:165px;height:auto;display:block;margin:0 auto;}
    .croq-d{display:flex;justify-content:space-between;gap:6px;font-size:8px;color:var(--muted);
      border-top:1px solid var(--border);padding-top:3px;margin-top:3px;font-family:var(--math);}
    /* ── Cajas resumen ── */
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;
      page-break-inside:avoid;}
    .summary-box{border:1px solid var(--border);border-radius:5px;padding:5px 8px;}
    .summary-box.highlight{background:var(--card);border-color:var(--grn2);}
    .s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;
      margin-bottom:2px;font-family:var(--sans);}
    .s-val{font-size:13px;font-weight:700;color:var(--grn);font-style:italic;font-family:var(--math);}
    .s-unit{font-size:8px;color:var(--muted);}
    .teoria{border-left:3px solid var(--grn);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:7px;page-break-inside:avoid;}
    .teoria-t{font-size:9px;font-weight:700;color:var(--grn);text-transform:uppercase;
      letter-spacing:.4px;margin-bottom:3px;}
    .fig-color-dot{display:inline-block!important;width:8px!important;height:8px!important;
      min-width:8px!important;border-radius:50%!important;margin-right:5px!important;
      vertical-align:middle!important;flex-shrink:0!important;}
    img{max-width:100%;}
    .wm-seal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:340px;height:340px;opacity:.07;z-index:9999;pointer-events:none;}
    .wm-seal svg{width:100%;height:100%;}
    .pdf-foot{margin-top:10px;text-align:center;font-size:8.5px;color:var(--muted);
      border-top:1px solid var(--border);padding-top:6px;letter-spacing:.3px;}
    @page{size:A4 portrait;margin:0;}
    @media print{ body{padding:12mm 9mm 14mm;} }
  `;

  // Sello de agua, idéntico al del Cap. 10 salvo el color de acento del capítulo.
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
    + '<text x="100" y="133" font-family="Inter,sans-serif" font-size="9" fill="#0b3f3a" text-anchor="middle" letter-spacing="1">ESTÁTICA</text>'
    + '</svg></div>';

  let html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>BSA \u2014 Centro de Gravedad y Centroide</title>';
  html += '<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>'+katexCss+'</style><style>'+printCss+'</style></head><body>';
  html += wmSeal;
  html += '<div class="pdf-header"><div><div class="pdf-title">BSA \u2014 Centro de Gravedad y Centroide</div><div class="pdf-sub">by Luis Alejandro Baz\u00e1n Campos</div></div><div class="pdf-date">Generado: '+dt+'</div></div>';
  html += encabezadoImg + body;
  html += '<div class="pdf-foot">BSA \u00b7 by Luis Alejandro Baz\u00e1n Campos</div>';
  html += '</body></html>';

  pdfWin.document.write(html);
  pdfWin.document.close();
  pdfWin.focus();
  setTimeout(function(){ pdfWin.print(); }, 700);
}

function drawCompositeFigure(canvasId) {
  const cv=document.getElementById(canvasId);
  if(!cv||!figures.length) return;
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||600, H=cv.clientHeight||350;
  cv.width=W*dpr; cv.height=H*dpr;
  const c=cv.getContext('2d'); c.scale(dpr,dpr);
  c.fillStyle='#ffffff'; c.fillRect(0,0,W,H);
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const b=def.bounds(fig.dims),rot=(fig.rotation||0)*Math.PI/180;
    const corners=[{x:b.left,y:b.bottom},{x:b.right,y:b.bottom},{x:b.right,y:b.top},{x:b.left,y:b.top}];
    for(const cor of corners){
      const rx=fig.cx+cor.x*Math.cos(rot)-cor.y*Math.sin(rot);
      const ry=fig.cy+cor.x*Math.sin(rot)+cor.y*Math.cos(rot);
      xMin=Math.min(xMin,rx);xMax=Math.max(xMax,rx);yMin=Math.min(yMin,ry);yMax=Math.max(yMax,ry);
    }
  }
  // ── Encaje en DOS PASADAS ──
  // La acotación no ocupa lo mismo arriba que abajo: la cadena y la cota total
  // van debajo y a la derecha. Con un margen simétrico la cota total del eje X
  // se salía del lienzo y aparecía cortada. Así que primero se encaja con un
  // margen provisional, se pregunta cuánto espacio pide la acotación con esa
  // escala, y se vuelve a encajar reservándolo de verdad.
  const fw=Math.max(xMax-xMin,.001), fh=Math.max(yMax-yMin,.001);
  const cfgCotas = base => ({
    px: x => base.toSx(x), py: y => base.toSy(y),
    fuente:'600 9px Inter, sans-serif', fuenteTotal:'700 9.5px Inter, sans-serif',
    tick:3.8, salto:13, sepX:26, sepY:30, angulos:false
  });
  // El dibujo se centra en el hueco libre. Antes se anclaba al margen
  // izquierdo: como la escala la manda la altura, en una pantalla ancha el
  // dibujo quedaba pegado a la izquierda con medio lienzo en blanco.
  const encajar = (mIzq, mDer, mSup, mInf)=>{
    const dispW = W - mIzq - mDer, dispH = H - mSup - mInf;
    const sc = Math.min(dispW/fw, dispH/fh);
    const sobraX = dispW - fw*sc, sobraY = dispH - fh*sc;
    return {
      toSx: wx => mIzq + sobraX/2 + (wx-xMin)*sc,
      toSy: wy => H - mInf - sobraY/2 - (wy-yMin)*sc,
      scale: sc
    };
  };
  // Los rótulos de radio y ángulo se colocan junto a su figura, así que no hay
  // que reservar una banda lateral; sí un margen holgado para que las cajas
  // quepan alrededor del dibujo.
  const MARGEN_ROT = 62;
  let T = encajar(MARGEN_ROT, 70, 30, 70);           // provisional
  let esp = {abajo:70, derecha:70};
  try{ esp = espacioCotas(c, cfgCotas(T)); }catch(e){}
  T = encajar(MARGEN_ROT,
              Math.min(esp.derecha+10, W*0.42),
              30,
              Math.min(esp.abajo+8, H*0.42));
  const scale=T.scale, toSx=T.toSx, toSy=T.toSy;
  // Grid
  c.strokeStyle='rgba(228,172,23,.07)'; c.lineWidth=0.5;
  const gs=Math.pow(10,Math.round(Math.log10(fw/5)));
  for(let gx=Math.floor(xMin/gs)*gs;gx<=xMax+gs;gx+=gs){c.beginPath();c.moveTo(toSx(gx),0);c.lineTo(toSx(gx),H);c.stroke();}
  for(let gy=Math.floor(yMin/gs)*gs;gy<=yMax+gs;gy+=gs){c.beginPath();c.moveTo(0,toSy(gy));c.lineTo(W,toSy(gy));c.stroke();}
  // Axes
  c.strokeStyle='rgba(30,33,38,.2)'; c.lineWidth=1;
  const ox0=toSx(0),oy0=toSy(0);
  if(ox0>0&&ox0<W){c.beginPath();c.moveTo(ox0,0);c.lineTo(ox0,H);c.stroke();}
  if(oy0>0&&oy0<H){c.beginPath();c.moveTo(0,oy0);c.lineTo(W,oy0);c.stroke();}
  function figPath(fig,ctx2){
    const def=FIG_DEFS[fig.type]; if(!def) return;
    ctx2.save();ctx2.translate(toSx(fig.cx),toSy(fig.cy));
    ctx2.rotate(-fig.rotation*Math.PI/180);ctx2.scale(scale,-scale);
    ctx2.beginPath();def.draw(ctx2,fig.dims,false);ctx2.restore();
  }
  for(const fig of figures.filter(f=>f.sign===1)){
    figPath(fig,c);c.fillStyle=hexAlpha(fig.color,.28);c.fill();
    figPath(fig,c);c.strokeStyle=hexAlpha(fig.color,.9);c.lineWidth=1.8;c.stroke();
  }
  for(const fig of figures.filter(f=>f.sign===-1)){
    figPath(fig,c);c.fillStyle='#ffffff';c.fill();
    c.save();figPath(fig,c);c.clip();
    c.strokeStyle=hexAlpha(fig.color,.4);c.lineWidth=1;
    for(let i=-H;i<W+H;i+=7){c.beginPath();c.moveTo(i,0);c.lineTo(i+H,H);c.stroke();}
    c.restore();
    figPath(fig,c);c.strokeStyle=hexAlpha(fig.color,.85);c.lineWidth=1.5;
    c.setLineDash([4,3]);c.stroke();c.setLineDash([]);
  }
  if(results){
    const gsx=toSx(results.xbar),gsy=toSy(results.ybar);
    c.beginPath();c.arc(gsx,gsy,5.5,0,Math.PI*2);
    c.fillStyle='#f0c040';c.fill();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();
    c.fillStyle='#f0c040';c.font='bold 10px Inter';c.textAlign='left';c.fillText('G',gsx+8,gsy-5);
  }
  c.textAlign='center';
  const etiq = crearColocador(c, {x0:4, y0:4, x1:W-4, y1:H-4});
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const b=def.bounds(fig.dims),d=fig.dims,rot=(fig.rotation||0)*Math.PI/180;
    const cosr=Math.cos(rot),sinr=Math.sin(rot);
    const S=(lx,ly)=>({x:toSx(fig.cx+lx*cosr-ly*sinr),y:toSy(fig.cy+lx*sinr+ly*cosr)});
    const clr=hexAlpha(fig.color,.9);
    // Las cotas b= y h= por figura eran el sistema de acotación ANTIGUO. Ahora
    // conviven con las cotas generales encadenadas y se leían como restos
    // superpuestos, así que se retiran: la cadena general ya da todas las
    // distancias entre bordes. Sólo se conservan los radios, que la cadena
    // ortogonal no puede expresar.

    // ── Radio: se traza SIEMPRE desde el centro real del arco hasta la
    // superficie. El origen local de cada figura es su centroide, que sólo
    // coincide con el centro del arco en el círculo completo; en el resto hay
    // que descontar la distancia al centroide, o la línea nace desplazada.
    if(d.r!==undefined){
      let co=null, ext=null;                    // centro del arco y punto en la superficie
      if(fig.type==='circle'){
        co={x:0,y:0};             ext={x:d.r,y:0};
      } else if(fig.type==='quarter'){
        const dc=4*d.r/(3*Math.PI);
        co={x:-dc,y:-dc};         ext={x:-dc+d.r,y:-dc};
      } else if(fig.type==='semicircle'){
        const yc=4*d.r/(3*Math.PI);
        co={x:0,y:-yc};           ext={x:d.r,y:-yc};
      } else if(fig.type==='sector'){
        const t=d.alpha*Math.PI/180, yc=2*d.r*Math.sin(t)/(3*t);
        co={x:0,y:-yc};           ext={x:0,y:-yc+d.r};   // sobre la bisectriz
      }
      if(co){
        const p0=S(co.x,co.y), p1=S(ext.x,ext.y);
        c.save();
        c.strokeStyle=clr; c.lineWidth=1.1; c.setLineDash([]);
        c.beginPath(); c.moveTo(p0.x,p0.y); c.lineTo(p1.x,p1.y); c.stroke();
        // marca del centro y punta en la superficie
        c.fillStyle=clr;
        c.beginPath(); c.arc(p0.x,p0.y,2.2,0,Math.PI*2); c.fill();
        const ang=Math.atan2(p1.y-p0.y,p1.x-p0.x);
        c.beginPath();
        c.moveTo(p1.x,p1.y);
        c.lineTo(p1.x-7*Math.cos(ang-0.38), p1.y-7*Math.sin(ang-0.38));
        c.lineTo(p1.x-7*Math.cos(ang+0.38), p1.y-7*Math.sin(ang+0.38));
        c.closePath(); c.fill();
        // Las etiquetas NO se escriben aquí: se encolan en el colocador y se
        // pintan al final, para que puedan apartarse unas de otras.
        const mx=(p0.x+p1.x)/2, my=(p0.y+p1.y)/2;
        etiq.add('R='+d.r+unit, mx-8*Math.sin(ang), my+8*Math.cos(ang)-2, clr, 'bold 9px Inter');
        if(fig.type==='sector'){
          etiq.add('\u03b8='+d.alpha+'\u00b0', p0.x, p0.y+13, clr, '9px Inter');
        }
        c.restore();
      }
    }
  }
  // Huecos prohibidos para los rótulos: la caja de cada figura (con algo de
  // aire) y las bandas donde van las cotas, abajo y a la derecha.
  const obstaculos = figures.map(f=>{
    const b = figuraBoundsMundo(f);
    const x0 = toSx(b.left), x1 = toSx(b.right);
    const y0 = toSy(b.top),  y1 = toSy(b.bottom);
    return {x:x0-4, y:y0-4, w:(x1-x0)+8, h:(y1-y0)+8};
  });
  {
    const yb = toSy(yMin), xr = toSx(xMax);
    obstaculos.push({x:0, y:yb+6, w:W, h:H});          // banda inferior de cotas
    obstaculos.push({x:xr+6, y:0, w:W, h:H});          // banda derecha de cotas
  }
  etiq.pintar(obstaculos);   // cada valor en su recuadro, junto a su figura
  // Cotas generales encadenadas de toda la sección (criterio del Cap. 7)
  try{ cotasCompuestaGenerales(c, toSx, toSy, W, H, scale); }catch(e){}
  c.textAlign='left';c.fillStyle='rgba(30,33,38,.35)';c.font='8px Inter';
  c.fillText('G = centroide global de la secci\u00f3n', 12, H-8);
}

// ── Cotas generales de la sección compuesta ──
// Mismo criterio que el lienzo principal y que el Cap. 7: cadenas de cotas
// fuera del dibujo (horizontales abajo, verticales a la derecha) tomadas de los
// BORDES reales de las figuras. Recibe la transformación del lienzo destino
// para poder usarse también en el PDF.
// Cotas de la sección compuesta en la vista de resultados. Usa EXACTAMENTE el
// mismo motor que el lienzo del editor (planCotas + pintarCadenaCotas), solo
// cambia la proyección y el tamaño de letra: antes eran dos implementaciones
// distintas del mismo criterio y se veían diferentes.
function cotasCompuestaGenerales(c, toSx, toSy, W, H, esc){
  if(!figures.length) return;
  dibujarCotasSobre(c, {
    px: x => toSx(x), py: y => toSy(y),
    fuente: '600 9px Inter, sans-serif',
    fuenteTotal: '700 9.5px Inter, sans-serif',
    tick: 3.8, salto: 13, sepX: 26, sepY: 30, angulos: false
  });
}
// ── Acotación general de la sección (mismo criterio que el Cap. 7) ──
// Cotas encadenadas fuera del dibujo: horizontales debajo y verticales a la
// derecha, en las coordenadas donde hay bordes de figura.
