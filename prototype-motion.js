const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// One moving marker preserves selection continuity; controls remain ordinary buttons.
for(const selector of ['.scenario-selector','.part-selector']){
  const track=document.querySelector(selector);track.classList.add('selection-track');
  const marker=document.createElement('span');marker.className='selection-marker';marker.setAttribute('aria-hidden','true');track.append(marker);
  const buttons=[...track.querySelectorAll('button')];
  function position(){
    const active=buttons.find(b=>!b.hidden&&b.getAttribute('aria-pressed')==='true');if(!active)return;
    const a=active.getBoundingClientRect(),r=track.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(active);
    const text=range.getBoundingClientRect();
    const horizontal=selector==='.part-selector'||innerWidth<=700;
    const isPart=selector==='.part-selector';
    marker.classList.toggle('selection-marker-bar',isPart);if(isPart)marker.style.width=a.width+'px';
    const x=isPart?a.left-r.left+track.scrollLeft:horizontal?a.left-r.left+track.scrollLeft+a.width/2-4:text.right-r.left+track.scrollLeft+16;
    const y=horizontal?a.bottom-r.top+track.scrollTop-5:a.top-r.top+a.height/2-4;
    marker.style.transform=`translate(${x}px,${y}px)`;
  }
  new MutationObserver(position).observe(track,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
  new ResizeObserver(position).observe(track);document.fonts.ready.then(position);position();
  track.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    const visibleButtons=buttons.filter(button=>!button.hidden);
    const index=visibleButtons.indexOf(document.activeElement);if(index<0)return;
    const next=visibleButtons[Math.max(0,Math.min(visibleButtons.length-1,index+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)))];
    e.preventDefault();next.click();next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced.matches?'instant':'smooth'});
  });
  let accumulated=0,last=0,lastInput=0;
  const area=document.querySelector(selector==='.scenario-selector'?'.scenario-airspace':'.machine-airspace');
  const wheel=e=>{
    if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)<Math.abs(e.deltaX)||innerWidth<=700)return;
    // A map has its own task: never change equipment while interacting with it.
    if(area.dataset.navigation==='true'||e.target.closest('.navigation-viewer'))return;
    const index=buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true'),direction=Math.sign(e.deltaY),next=index+direction;
    if(next<0||next>=buttons.length)return; // At either end, page scrolling is untouched.
    e.preventDefault();const now=performance.now();
    if(now-lastInput>180)accumulated=0;lastInput=now;
    if(now-last<650)return;accumulated+=e.deltaY;
    if(Math.abs(accumulated)<70)return;accumulated=0;last=now;
    buttons[next].click();buttons[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  };
  if(selector==='.scenario-selector'){
    track.addEventListener('wheel',wheel,{passive:false});area.addEventListener('wheel',wheel,{passive:false});
  }
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){
    observer.unobserve(entry.target);
    if(!reduced.matches)entry.target.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'});
  }
},{threshold:.5});
document.querySelectorAll('#uses .section-top h2,#machine .section-top h2').forEach(e=>observer.observe(e));
for(const event of ['drone:part','drone:scenario'])window.addEventListener(event,()=>{
  if(reduced.matches)return;
  const panel=document.querySelector(event==='drone:part'?'#part-panel':'.scenario-panel');
  panel.getAnimations().forEach(a=>a.cancel());panel.animate([{opacity:.4},{opacity:1}],{duration:220,easing:'ease-out'});
});
