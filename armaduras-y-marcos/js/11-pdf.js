// ═══════════════════════════════════════════════════════════
//  PDF
// ═══════════════════════════════════════════════════════════
function recortarLienzo(c){
  if(!c) return null;
  try{
    const w = c.width, h = c.height;
    if(!w || !h) return null;
    const d = c.getContext('2d').getImageData(0,0,w,h).data;
    let x0=w, y0=h, x1=-1, y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(d[i+3]<8) continue;
      const r=d[i], g=d[i+1], b=d[i+2];
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      if((mx-mn)<=18 && mn>=190) continue;   // descarta la retícula gris
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    }
    if(x1<0) return c.toDataURL('image/png');
    const m = Math.round(Math.min(w,h)*0.02)+6;
    x0=Math.max(0,x0-m); y0=Math.max(0,y0-m);
    x1=Math.min(w-1,x1+m); y1=Math.min(h-1,y1+m);
    const cw=x1-x0+1, ch=y1-y0+1;
    const t=document.createElement('canvas'); t.width=cw; t.height=ch;
    const tc=t.getContext('2d');
    tc.fillStyle='#fff'; tc.fillRect(0,0,cw,ch);
    tc.drawImage(c, x0,y0,cw,ch, 0,0,cw,ch);
    return t.toDataURL('image/png');
  }catch(e){ return c.toDataURL('image/png'); }
}
