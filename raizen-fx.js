(function(){
"use strict";
function init(){if(document.getElementById("rz-fx-layer"))return;let l=document.createElement("div");l.id="rz-fx-layer";l.innerHTML='<div class="rz-fx-flash"></div>';document.body.appendChild(l)}
function E(tag,cls){let e=document.createElement(tag);e.className=cls;document.getElementById("rz-fx-layer").appendChild(e);return e}
function particles(n=35,purple=false){init();for(let i=0;i<n;i++){let p=E("i","rz-particle "+(purple?"purple":""));p.style.left=(10+Math.random()*80)+"%";p.style.top=(45+Math.random()*25)+"%";p.style.setProperty("--x",((Math.random()-.5)*260)+"px");p.style.setProperty("--y",(-80-Math.random()*260)+"px");p.style.setProperty("--d",(.7+Math.random()*1.1)+"s");setTimeout(()=>p.remove(),2200)}}
function flash(){init();let f=document.querySelector(".rz-fx-flash");f.classList.remove("show");void f.offsetWidth;f.classList.add("show")}
function ring(){init();let r=E("div","rz-energy-ring show");setTimeout(()=>r.remove(),1100)}
function cursedEnergy(){init();let c=E("div","rz-cursed show");particles(42,true);ring();setTimeout(()=>c.remove(),1300)}
function barrier(){init();let b=E("div","rz-barrier show");particles(28);setTimeout(()=>b.remove(),1300)}
function domain(name="DOMAIN EXPANSION"){init();let d=E("div","rz-domain show");d.innerHTML='<div class="rz-domain-inner"><div class="rz-domain-title"><small>DOMAIN EXPANSION</small>'+String(name).replace(/[<>&]/g,"")+'</div></div>';flash();particles(70,true);setTimeout(()=>d.remove(),2150)}
function levelUp(level){cursedEnergy();flash();let r=E("div","rz-reward show");r.textContent="LEVEL UP • LV."+level;setTimeout(()=>r.remove(),1500)}
function reward(t="+ REWARD"){particles(25);let r=E("div","rz-reward show");r.textContent=t;setTimeout(()=>r.remove(),1500)}
function damage(a,x=50,y=55,crit=false){let d=E("div","rz-damage "+(crit?"crit":""));d.textContent=(crit?"CRITICAL ":"")+a;d.style.left=x+"%";d.style.top=y+"%";setTimeout(()=>d.remove(),850)}
function shake(){document.documentElement.classList.remove("rz-shake");void document.documentElement.offsetWidth;document.documentElement.classList.add("rz-shake");setTimeout(()=>document.documentElement.classList.remove("rz-shake"),350)}
function techName(name){
  init();
  let old=document.querySelector(".tech-banner");if(old)old.remove();
  let b=document.createElement("div");b.className="tech-banner show";b.textContent=name;
  document.body.appendChild(b);setTimeout(()=>b.remove(),1200);
}
function shockwave(x,y){
  init();
  let s=document.createElement("div");s.className="shockwave";
  s.style.left=(x||window.innerWidth*0.7)+"px";s.style.top=(y||window.innerHeight*0.35)+"px";
  document.body.appendChild(s);setTimeout(()=>s.remove(),600);
}
function slash(x,y){
  init();
  let s=document.createElement("div");s.className="slash-fx";
  s.style.left=(x||window.innerWidth*0.65)+"px";s.style.top=(y||window.innerHeight*0.38)+"px";
  document.body.appendChild(s);setTimeout(()=>s.remove(),400);
}
function combo(n){
  let old=document.querySelector(".combo-counter");if(old)old.remove();
  let c=document.createElement("div");c.className="combo-counter show";c.textContent=n+" HIT COMBO";
  document.body.appendChild(c);setTimeout(()=>c.remove(),1100);
}
window.RaizenFX={init,particles,flash,ring,cursedEnergy,barrier,domain,levelUp,reward,damage,shake,techName,shockwave,slash,combo};
document.addEventListener("click",function(e){let b=e.target.closest("button,[role='button'],a");if(!b)return;let t=(b.innerText||"").toLowerCase();if(t.includes("domain"))domain("DOMAIN EXPANSION");else if(t.includes("level up")||t.includes("level-up"))levelUp("UP");else if(t.includes("summon")||t.includes("reveal")){ring();particles(45,true);flash()}else if(t.includes("ultimate")){cursedEnergy();flash();shake()}else if(t.includes("attack")||t.includes("skill")||t.includes("basic")){ring();particles(22);shake()}else if(t.includes("defend")||t.includes("barrier"))barrier();else if(t.includes("claim")||t.includes("reward"))reward("+ REWARD")});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
