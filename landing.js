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