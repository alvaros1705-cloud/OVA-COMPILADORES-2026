(()=>{const body=document.body,theme=document.getElementById('themeToggle'),lang=document.getElementById('langToggle'),menu=document.getElementById('menuToggle'),nav=document.querySelector('.main-nav'),headerLogo=document.getElementById('header-university-logo');let language=localStorage.getItem('compiler-language')||'es';const applyTheme=(value)=>{body.classList.toggle('dark',value==='dark');const dark=value==='dark';if(headerLogo)headerLogo.src=dark?headerLogo.dataset.logoDark:headerLogo.dataset.logoLight;theme.setAttribute('aria-label',dark?'Activar modo claro':'Activar modo oscuro');theme.title=dark?'Modo claro':'Modo oscuro';const label=theme.querySelector('.theme-label');if(label)label.textContent=dark?'Modo claro':'Modo oscuro';localStorage.setItem('compiler-theme',value)};applyTheme(localStorage.getItem('compiler-theme')||'light');const applyLanguage=(value)=>{language=value;document.documentElement.lang=value;lang.textContent=value==='es'?'EN':'ES';document.querySelectorAll('[data-es][data-en]').forEach(el=>{const v=el.dataset[value];if(v!==undefined){if(v.includes('<'))el.innerHTML=v;else el.textContent=v}});localStorage.setItem('compiler-language',value)};applyLanguage(language);theme.addEventListener('click',()=>applyTheme(body.classList.contains('dark')?'light':'dark'));lang.addEventListener('click',()=>applyLanguage(language==='es'?'en':'es'));menu.addEventListener('click',()=>nav.classList.toggle('mobile-open'));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('mobile-open')));
// Animaciones de entrada al desplazarse: se desactivan si el usuario prefiere movimiento reducido.
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion){
  const revealTargets=document.querySelectorAll('.section,.stats-strip,.feature-card,.path-card,.pac-week,.teacher-profile,.labs-section');
  revealTargets.forEach((el,index)=>{el.classList.add('js-reveal');el.style.transitionDelay=(index%4)*75+'ms';});
  if('IntersectionObserver' in window){
    const revealObserver=new IntersectionObserver((entries,observer)=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
    },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
    revealTargets.forEach(el=>revealObserver.observe(el));
  }else{revealTargets.forEach(el=>el.classList.add('is-visible'));}
}
})();

// Refuerzo por Web Animations API: garantiza movimiento visible en la ilustración principal.
(()=>{
 const stage=document.querySelector('.hero-art');
 if(!stage || !stage.animate) return;
 const card=stage.querySelector('.code-window');
 const lexer=stage.querySelector('.chip-lexer');
 const ast=stage.querySelector('.chip-ast');
 const tac=stage.querySelector('.chip-code');
 const ring=stage.querySelector('.ring-two');
 const run=(el,frames,duration,delay=0)=>{
   if(!el) return;
   el.animate(frames,{duration,delay,iterations:Infinity,easing:'ease-in-out'});
 };
 run(stage,[{transform:'translateY(0) rotate(0deg)'},{transform:'translateY(-14px) rotate(-1deg)'},{transform:'translateY(5px) rotate(1deg)'},{transform:'translateY(-9px) rotate(-.6deg)'},{transform:'translateY(0) rotate(0deg)'}],5200);
 run(card,[{transform:'perspective(900px) rotateY(-5deg) translateY(0)',filter:'drop-shadow(0 15px 18px #001e1680)'},{transform:'perspective(900px) rotateY(6deg) translateY(-24px)',filter:'drop-shadow(0 28px 25px #001e16a8) drop-shadow(0 0 18px #65f4ba)'},{transform:'perspective(900px) rotateY(-4deg) translateY(8px)',filter:'drop-shadow(0 12px 16px #001e1680)'},{transform:'perspective(900px) rotateY(-5deg) translateY(0)'}],4600);
 run(lexer,[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(-20px,-27px) rotate(-10deg) scale(1.1)'},{transform:'translate(12px,5px) rotate(8deg) scale(.96)'},{transform:'translate(0,0) rotate(0) scale(1)'}],2600);
 run(ast,[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(20px,-25px) rotate(10deg) scale(1.1)'},{transform:'translate(-12px,8px) rotate(-8deg) scale(.96)'},{transform:'translate(0,0) rotate(0) scale(1)'}],2900,300);
 run(tac,[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(-14px,19px) rotate(8deg) scale(1.1)'},{transform:'translate(16px,-14px) rotate(-9deg) scale(.96)'},{transform:'translate(0,0) rotate(0) scale(1)'}],2700,600);
 run(ring,[{transform:'rotate(0deg) scale(1)',opacity:.45},{transform:'rotate(180deg) scale(1.07)',opacity:1},{transform:'rotate(360deg) scale(1)',opacity:.5}],14000);
})();


// Refuerzo final: activa animación real en el hero incluso si el sistema solicita reducir movimiento.
(()=>{
  const stage=document.querySelector('.hero-art');
  if(!stage) return;
  stage.classList.add('motion-live');
  const animate=(selector,keyframes,duration,delay=0)=>{
    const el=stage.querySelector(selector);
    if(!el || typeof el.animate!=='function') return;
    el.animate(keyframes,{duration,delay,iterations:Infinity,easing:'ease-in-out',fill:'both'});
  };
  animate('.code-window',[
    {transform:'perspective(900px) rotateY(-6deg) translateY(0) scale(1)',filter:'drop-shadow(0 18px 22px #001e1680)'},
    {transform:'perspective(900px) rotateY(6deg) translateY(-22px) scale(1.025)',filter:'drop-shadow(0 28px 28px #001e16a8) drop-shadow(0 0 22px #65f4ba)'},
    {transform:'perspective(900px) rotateY(-4deg) translateY(8px) scale(.99)',filter:'drop-shadow(0 12px 16px #001e1680)'},
    {transform:'perspective(900px) rotateY(-6deg) translateY(0) scale(1)'}
  ],4400);
  animate('.chip-lexer',[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(-20px,-26px) rotate(-9deg) scale(1.12)'},{transform:'translate(12px,7px) rotate(7deg) scale(.97)'},{transform:'translate(0,0)'}],2500);
  animate('.chip-ast',[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(20px,-24px) rotate(9deg) scale(1.12)'},{transform:'translate(-12px,8px) rotate(-7deg) scale(.97)'},{transform:'translate(0,0)'}],2700,250);
  animate('.chip-code',[{transform:'translate(0,0) rotate(0) scale(1)'},{transform:'translate(-14px,19px) rotate(8deg) scale(1.12)'},{transform:'translate(16px,-14px) rotate(-9deg) scale(.97)'},{transform:'translate(0,0)'}],2600,500);
})();
