// ═══════════════════════════════════════════════════════════
//  VISTA
// ═══════════════════════════════════════════════════════════
function zoomIn(){ escala=Math.min(escala*1.25,4000); dibujar(); }
function zoomOut(){ escala=Math.max(escala/1.25,0.02); dibujar(); }
function centrar(){
  if(!nodos.length){ vx=0; vy=0; escala=60; dibujar(); return; }
  const xs=nodos.map(n=>n.x), ys=nodos.map(n=>n.y);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  vx=(x0+x1)/2; vy=(y0+y1)/2;
  const dx=Math.max(x1-x0,1), dy=Math.max(y1-y0,1);
  escala=Math.max(3, Math.min(Math.min((W-260)/dx,(H-180)/dy), 400));
  dibujar();
}
