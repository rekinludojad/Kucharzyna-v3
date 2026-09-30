const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
const now=()=>new Date().toISOString();
let state={route:"start",recipes:[],categories:[],shopping:[],settings:{theme:"system",profile:"pro"},history:[],cook:{},selectedCat:"Wszystkie",query:"",sort:"recent"};
const baseCats=["Pizza","Pasta","Sosy","Mięso","Ryby","Owoce morza","Warzywa","Desery","Pieczywo","Zupy","Sałatki","Cocktaile","Prep","Sosy bazowe","Inne"];

const seed=[
{name:"Pizza Napoletana",category:"Pizza",description:"Klasyczne ciasto pizza; dane przykładowe do własnej edycji.",yield:10,yieldUnit:"szt.",prep:20,cook:2,ferment:24,temp:450,tags:["pizza","ciasto"],traditional:true,flag:"🇮🇹",servings:10,ingredients:[["Mąka",1000,"g",100],["Woda",650,"g",65],["Sól",30,"g",3],["Drożdże",2,"g",0.2]],steps:["Wymieszaj mąkę z większością wody.","Dodaj sól i resztę wody, następnie drożdże.","Wyrób do uzyskania gładkiego ciasta.","Fermentuj według własnego procesu i podziel na kulki.","Wypiekaj w bardzo gorącym piecu."],notes:"Przykładowa receptura — dostosuj do własnej mąki i procesu.",source:"Tradycyjna receptura / przykład",sourceUrl:""},
{name:"Carbonara",category:"Pasta",description:"Klasyczna pasta z guanciale, żółtek, pecorino i pieprzu.",yield:4,yieldUnit:"porcja",prep:10,cook:12,ferment:0,temp:0,tags:["pasta","rzym"],traditional:true,flag:"🇮🇹",servings:4,ingredients:[["Spaghetti",400,"g",""],["Guanciale",180,"g",""],["Żółtka",6,"szt.",""],["Pecorino Romano",120,"g",""],["Pieprz czarny",5,"g",""]],steps:["Podsmaż guanciale i zachowaj tłuszcz.","Utrzyj żółtka z pecorino i dużą ilością pieprzu.","Ugotuj makaron al dente, zachowaj wodę.","Połącz makaron poza ogniem, regulując wodą z gotowania.","Dodaj guanciale i podawaj natychmiast."],notes:"Pieprz dopiero na końcu, jeśli taki jest Twój proces.",source:"Tradycyjna receptura / przykład",sourceUrl:""},
{name:"Sos pomidorowy",category:"Sosy bazowe",description:"Prosty sos z pomidorów San Marzano.",yield:2500,yieldUnit:"g",prep:10,cook:30,ferment:0,temp:0,tags:["sos","pomidor"],traditional:true,flag:"🇮🇹",servings:10,ingredients:[["Pomidory San Marzano",2500,"g",""],["Sól",25,"g",""],["Oliwa",40,"ml",""],["Bazylia",20,"g",""]],steps:["Rozgrzej oliwę.","Dodaj pomidory i sól.","Gotuj spokojnie do pożądanej konsystencji.","Dodaj bazylię pod koniec.","Ostudź lub użyj od razu."],notes:"Dane przykładowe; dopasuj sól i redukcję do produktu.",source:"Tradycyjna receptura / przykład",sourceUrl:""}
];

async function init(){
 state.recipes=await getAll("recipes"); state.categories=await getAll("categories"); state.shopping=await getAll("shoppingItems"); state.history=await getAll("history");
 const sets=await getAll("settings"); state.settings=sets[0]||state.settings;
 state.cook=Object.fromEntries((await getAll("cookState")).map(x=>[x.id,x]));
 if(!state.categories.length){for(const name of baseCats)await put("categories",{id:uid(),name});state.categories=await getAll("categories")}
 if(!state.recipes.length){for(const x of seed){const r=makeRecipe(x);await put("recipes",r)}state.recipes=await getAll("recipes")}
 applyTheme(); setupSW(); render();
}
function makeRecipe(x){const r={id:uid(),createdAt:now(),updatedAt:now(),favorite:false,lastUsedAt:null,sections:[{id:uid(),name:"Główna",ingredients:x.ingredients.map(a=>({id:uid(),name:a[0],qty:a[1],unit:a[2],percent:a[3]??"",price:"",packQty:"",packUnit:a[2]}))}],steps:x.steps.map((text,i)=>({id:uid(),text})),...x};delete r.ingredients;return r}
function applyTheme(){document.body.classList.toggle("amateur",state.settings.profile==="amateur");let t=state.settings.theme;if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}
function setupSW(){if(!("serviceWorker" in navigator))return;navigator.serviceWorker.register("./service-worker.js").then(reg=>{reg.addEventListener("updatefound",()=>{const w=reg.installing;if(w)w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)toast("Nowa wersja Kucharzyny jest dostępna — Odśwież",true)})})}).catch(()=>{})}
function toast(msg,action=false){const t=$("#toast");t.textContent=action?msg+"  → Odśwież":msg;t.classList.add("show");if(action)t.onclick=()=>location.reload();setTimeout(()=>t.classList.remove("show"),3500)}
function nav(route){state.route=route;render();$(".main-scroll").scrollTop=0}
function saveSetting(){put("settings",{id:"settings",...state.settings})}
function fmt(n){return Number.isInteger(Number(n))?String(n):Number(n).toFixed(2).replace(/\.?0+$/,"")}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function recipeCard(r){return `<article class="card recipe-card" data-open="${r.id}"><div class="recipe-thumb">${r.image?`<img src="${r.image}">`:"🍳"}</div><div class="grow"><div class="row between"><h3>${escapeHtml(r.name)} ${r.traditional?`<span class="star">★</span>`:""} ${r.flag||""}</h3><button class="icon-btn small fav" data-fav="${r.id}" aria-label="Ulubione">${r.favorite?"★":"☆"}</button></div><div class="recipe-meta">${escapeHtml(r.category||"Inne")} · ${r.yield?fmt(r.yield)+" "+escapeHtml(r.yieldUnit||""):""} ${r.lastUsedAt?"· ostatnio używana":""}</div></div></article>`}
function render(){
 $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.route===state.route));
 const views={start:viewStart,recipes:viewRecipes,calculators:viewCalculators,shopping:viewShopping,settings:viewSettings};
 $("#main").innerHTML=(views[state.route]||viewStart)();
 bind();
}
function viewStart(){const recent=[...state.recipes].filter(r=>r.lastUsedAt).sort((a,b)=>b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(0,4);const fav=state.recipes.filter(r=>r.favorite).slice(0,4);
return `<section class="hero"><div class="kicker">DOBRY WIECZÓR, KUCHARZU</div><h1>No Elo kurwa, Kucharzyno za pięć złotych👨‍🍳</h1><p>Szybkie narzędzie do receptur, kalkulacji i pracy przy garach. Wszystko lokalnie.</p></section>
<section class="section"><h2>Szybkie akcje</h2><div class="grid">
${[["＋","Nowa receptura","new"],["▤","Moje receptury","recipes"],["↺","Ostatnio używane","recent"],["★","Ulubione","fav"],["∑","Kalkulatory","calculators"],["✓","Lista zakupów","shopping"]].map(x=>`<button class="action-card" data-action="${x[2]}"><span>${x[0]}</span><b>${x[1]}</b></button>`).join("")}</div></section>
${recent.length?`<section class="section"><div class="row between"><h2>Ostatnio używane</h2><button class="btn small ghost" data-route2="recipes">Wszystkie</button></div>${recent.map(recipeCard).join("")}</section>`:""}
${fav.length?`<section class="section"><h2>Ulubione</h2>${fav.map(recipeCard).join("")}</section>`:""}`}

function viewRecipes(){let rs=[...state.recipes];if(state.query)rs=rs.filter(r=>(r.name+" "+r.description+" "+r.tags.join(" ")).toLowerCase().includes(state.query.toLowerCase()));if(state.selectedCat!=="Wszystkie")rs=rs.filter(r=>r.category===state.selectedCat);if(state.sort==="name")rs.sort((a,b)=>a.name.localeCompare(b.name));else if(state.sort==="fav")rs.sort((a,b)=>Number(b.favorite)-Number(a.favorite));else rs.sort((a,b)=>(b.lastUsedAt||b.updatedAt).localeCompare(a.lastUsedAt||a.updatedAt));
return `<div class="row between"><div><div class="kicker">BAZA KUCHNI</div><h1>Receptury</h1></div><button class="btn primary" data-action="new">＋ Nowa</button></div>
<input class="search" id="recipeSearch" placeholder="Szukaj receptury…" value="${escapeHtml(state.query)}">
<div class="chips">${["Wszystkie",...state.categories.map(c=>c.name)].map(c=>`<button class="chip ${state.selectedCat===c?"active":""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>
<div class="row" style="margin:10px 0 15px"><select id="sort" class="grow"><option value="recent" ${state.sort==="recent"?"selected":""}>Ostatnio zmienione/używane</option><option value="name" ${state.sort==="name"?"selected":""}>Nazwa A–Z</option><option value="fav" ${state.sort==="fav"?"selected":""}>Ulubione</option></select><button class="btn" data-action="import">Importuj</button></div>
${rs.length?rs.map(recipeCard).join(""):`<div class="empty">Brak receptur dla tego filtra.</div>`}`}

function viewRecipe(id){
 const r=state.recipes.find(x=>x.id===id); if(!r)return viewRecipes();
 const totalIng=r.sections.reduce((n,s)=>n+s.ingredients.length,0);
 const totalSteps=r.steps.length;
 const tags=(r.tags||[]).map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join("");
 return `<div class="row between">
   <button class="btn" data-back>‹ Receptury</button>
   <button class="btn" data-fav="${r.id}">${r.favorite?"★ Ulubiona":"☆ Ulubiona"}</button>
 </div>
 <section class="hero" style="margin-top:12px">
   <div class="kicker">${escapeHtml(r.category||"Inne")} ${r.flag||""} ${r.traditional?`<span class="star">★ TRADYCYJNA</span>`:""}</div>
   <h1>${escapeHtml(r.name)}</h1>
   <p>${escapeHtml(r.description||"")}</p>
   <div class="grid3" style="margin-top:15px">
     <div class="detail-stat"><div class="kicker">WYDAJNOŚĆ</div><b>${fmt(r.yield||0)} ${escapeHtml(r.yieldUnit||"")}</b></div>
     <div class="detail-stat"><div class="kicker">CZAS</div><b>${fmt((r.prep||0)+(r.cook||0))} min</b></div>
     <div class="detail-stat"><div class="kicker">SKŁADNIKI</div><b>${totalIng}</b></div>
   </div>
 </section>
 <section class="section recipe-toolbar">
   <button class="btn primary big-action" data-cook="${r.id}">▶ GOTUJĘ</button>
   <button class="btn big-action" data-scale="${r.id}">⇄ PRZELICZ</button>
   <button class="btn big-action" data-edit="${r.id}">✎ EDYTUJ</button>
 </section>
 ${r.image?`<img src="${r.image}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:20px;margin-bottom:12px">`:""}
 ${tags?`<div class="chips" style="margin-bottom:12px">${tags}</div>`:""}
 <section class="section">
   <div class="section-title-row"><h2>Składniki</h2><button class="btn small" data-shop-recipe="${r.id}">＋ Zakupy</button></div>
   ${r.sections.map(s=>`<div class="card">
     <div class="section-head"><h3>${escapeHtml(s.name)}</h3><span class="kicker">${s.ingredients.length} poz.</span></div>
     ${s.ingredients.map(i=>`<div class="row between" style="padding:12px 0;border-bottom:1px solid var(--line)">
       <span>${escapeHtml(i.name)}</span><b>${fmt(i.qty)} ${escapeHtml(i.unit)} ${i.percent!==""&&i.percent!=null?`<small class="muted">${fmt(i.percent)}%</small>`:""}</b>
     </div>`).join("")}
   </div>`).join("")}
 </section>
 <section class="section"><div class="section-title-row"><h2>Wykonanie</h2><span class="kicker">${totalSteps} kroków</span></div>
   <div class="card">${r.steps.map((s,i)=>`<div class="cook-step" style="${i<r.steps.length-1?"border-bottom:1px solid var(--line)":""}"><div class="kicker">KROK ${i+1}</div><div style="font-size:16px;line-height:1.45;margin-top:4px">${escapeHtml(s.text)}</div></div>`).join("")}</div>
 </section>
 <section class="section"><h2>Parametry</h2><div class="card">
   <div class="grid3">
    <div class="detail-stat"><div class="kicker">PREP</div><b>${r.prep||0} min</b></div>
    <div class="detail-stat"><div class="kicker">GOTOWANIE</div><b>${r.cook||0} min</b></div>
    <div class="detail-stat"><div class="kicker">FERMENTACJA</div><b>${r.ferment||0} h</b></div>
   </div>
   ${r.temp?`<p><b>🔥 ${r.temp}°C</b></p>`:""}
 </div></section>
 <section class="section"><h2>Własne uwagi</h2><div class="card"><p style="white-space:pre-wrap;margin:0">${escapeHtml(r.notes||"Brak własnych uwag.")}</p></div></section>
 <section class="section"><div class="row">
   <button class="btn" data-history="${r.id}">Historia zmian</button><button class="btn" data-clear-cook="${r.id}">Resetuj „Gotuję”</button>
   <button class="btn danger" data-delete="${r.id}">Usuń</button>
 </div></section>`;
}
function editor(id){const r=id?state.recipes.find(x=>x.id===id):(state.editTemp||makeRecipe({name:"",category:"Inne",description:"",yield:"",yieldUnit:"porcja",prep:"",cook:"",ferment:"",temp:"",tags:[],traditional:false,flag:"",servings:1,ingredients:[],steps:[],notes:"",source:"",sourceUrl:""}));if(!id)state.editTemp=r;
return `<div class="row between"><button class="btn" data-back>‹ Anuluj</button><button class="btn primary" id="saveRecipe">Zapisz</button></div><h1>${id?"Edytuj recepturę":"Nowa receptura"}</h1><p class="muted">Zmiany są zapisywane dopiero po „Zapisz”, a poprzednia wersja trafia do historii.</p>
<div class="card"><div class="form-grid">
<div class="full"><label>Nazwa</label><input id="f-name" value="${escapeHtml(r.name)}"></div>
<div><label>Kategoria</label><select id="f-cat">${state.categories.map(c=>`<option ${c.name===r.category?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
<div><label>Wydajność</label><input id="f-yield" type="number" step="any" value="${r.yield??""}"></div>
<div><label>Jednostka wydajności</label><input id="f-yieldUnit" value="${escapeHtml(r.yieldUnit||"porcja")}"></div>
<div><label>Porcje</label><input id="f-servings" type="number" step="any" value="${r.servings??""}"></div>
<div><label>Temperatura °C</label><input id="f-temp" type="number" value="${r.temp??""}"></div>
<div><label>Przygotowanie min</label><input id="f-prep" type="number" value="${r.prep??""}"></div>
<div><label>Gotowanie min</label><input id="f-cook" type="number" value="${r.cook??""}"></div>
<div><label>Fermentacja h</label><input id="f-ferment" type="number" step="any" value="${r.ferment??""}"></div>
<div><label>Tagi (przecinki)</label><input id="f-tags" value="${escapeHtml((r.tags||[]).join(", "))}"></div>
<div class="full"><label>Opis</label><textarea id="f-desc">${escapeHtml(r.description||"")}</textarea></div>
<div class="full"><label>Własne uwagi</label><textarea id="f-notes">${escapeHtml(r.notes||"")}</textarea></div>
<div><label>Źródło</label><input id="f-source" value="${escapeHtml(r.source||"")}"></div><div><label>URL źródła</label><input id="f-url" type="url" value="${escapeHtml(r.sourceUrl||"")}"></div>
<div class="full"><label>Zdjęcie</label><input id="f-image" type="file" accept="image/*"></div>
</div></div>
<div id="sections-editor">${r.sections.map((s,si)=>sectionEditor(s,si)).join("")}</div>
<button class="btn" id="addSection">＋ Dodaj sekcję</button>
<section class="section"><h2>Instrukcja</h2><div id="steps-editor">${r.steps.map((s,i)=>stepEditor(s,i)).join("")}</div><button class="btn" id="addStep">＋ Dodaj krok</button></section>
<div class="sticky-actions"><button class="btn primary" style="width:100%" id="saveRecipe2">Zapisz recepturę</button></div>`}
function sectionEditor(s,si){return `<div class="card section-editor" data-section="${s.id}"><div class="section-head"><input class="sec-name" value="${escapeHtml(s.name)}"><button class="btn small danger remove-sec">Usuń</button></div><div class="ings">${s.ingredients.map((i,ii)=>ingEditor(i)).join("")}</div><button class="btn small add-ing">＋ Składnik</button></div>`}
function ingEditor(i){return `<div class="ingredient-row ing"><div><label>Składnik</label><input class="i-name" value="${escapeHtml(i.name)}"></div><div><label>Ilość</label><input class="i-qty" type="number" step="any" value="${i.qty??""}"></div><div><label>Jednostka</label><input class="i-unit" value="${escapeHtml(i.unit||"g")}"></div><button class="btn small danger remove-ing" aria-label="Usuń składnik">×</button></div>`}
function stepEditor(s,i){return `<div class="step-row step"><div class="step-num">${i+1}</div><textarea class="step-text" placeholder="Co robimy?">${escapeHtml(s.text||"")}</textarea><button class="btn small danger remove-step">×</button></div>`}

function viewCalculators(){return `<div class="kicker">NARZĘDZIA</div><h1>Kalkulatory</h1>
<section class="section card"><h2>🍕 Kalkulator pizzy</h2><div class="form-grid"><div><label>Liczba kulek</label><input id="pc-balls" type="number" value="10"></div><div><label>Masa kulki (g)</label><input id="pc-ball" type="number" value="250"></div><div><label>Hydracja %</label><input id="pc-hyd" type="number" value="65"></div><div><label>Sól %</label><input id="pc-salt" type="number" step=".1" value="3"></div><div><label>Oliwa %</label><input id="pc-oil" type="number" step=".1" value="0"></div><div><label>Drożdże %</label><input id="pc-yeast" type="number" step=".01" value=".2"></div><div><label>Temperatura °C</label><input id="pc-temp" type="number" value="22"></div><div><label>Fermentacja h</label><input id="pc-time" type="number" value="24"></div></div><div id="pizza-result" class="calc-result"></div></section>
<section class="section card"><h2>⚖️ Kalkulator procentów</h2><p class="muted">Wpisz masę mąki i składniki, aby obliczyć procent piekarski.</p><div><label>Mąka (g)</label><input id="bp-flour" type="number" value="1000"></div><div style="margin-top:10px"><label>Składnik / masa g</label><input id="bp-item" value="Woda / 650"></div><button class="btn primary" style="margin-top:10px" id="bp-calc">Oblicz</button><div id="bp-result" class="calc-result"></div></section>
<section class="section card"><h2>💰 Food cost</h2><p class="muted">Szybkie liczenie kosztu z ceny opakowania.</p><div class="form-grid"><div><label>Waga opakowania</label><input id="fc-pack" type="number" value="1000"></div><div><label>Cena opakowania (zł)</label><input id="fc-price" type="number" step=".01" value="10"></div><div><label>Zużycie (g/ml)</label><input id="fc-use" type="number" value="250"></div><div><label>Cena sprzedaży</label><input id="fc-sale" type="number" step=".01" value="40"></div></div><div id="fc-result" class="calc-result"></div></section>`}

function viewShopping(){return `<div class="row between"><div><div class="kicker">MAGAZYN W GŁOWIE</div><h1>Zakupy</h1></div><button class="btn primary" id="add-shopping">＋ Dodaj</button></div>
<div class="row" style="margin-bottom:12px"><button class="btn small" id="clear-done">Usuń ukończone</button><button class="btn small" id="clear-all-shop">Wyczyść wszystko</button></div>
${state.shopping.length?state.shopping.map(x=>`<div class="card checkbox-row ${x.done?"done":""}"><input type="checkbox" data-shop-check="${x.id}" ${x.done?"checked":""}><span class="grow">${escapeHtml(x.name)} <b>${fmt(x.qty||0)} ${escapeHtml(x.unit||"")}</b></span><button class="btn small danger" data-shop-del="${x.id}">×</button></div>`).join(""):`<div class="empty">Lista jest pusta. Dodaj składniki z receptury albo ręcznie.</div>`}`}

function viewSettings(){return `<div class="kicker">KONFIGURACJA</div><h1>Ustawienia</h1>
<div class="card"><div class="row between"><div><b>Motyw</b><div class="muted">Jasny / ciemny / systemowy</div></div><select id="theme"><option value="system">Automatyczny</option><option value="light">Jasny</option><option value="dark">Ciemny</option></select></div></div>
<div class="card"><div class="row between"><div><b>Profil interfejsu</b><div class="muted">Amator = większe elementy i prostszy układ</div></div><select id="profile"><option value="pro">Profesjonalny</option><option value="amateur">Amator</option></select></div></div>
<div class="card"><h2>Dane</h2><div class="grid"><button class="btn" id="export">Eksportuj JSON</button><button class="btn" id="importBackup">Importuj backup</button><button class="btn" id="addCategory">＋ Dodaj kategorię</button></div><p class="muted">Dane są przechowywane lokalnie w IndexedDB na tym urządzeniu. Backup JSON jest Twoją kopią bezpieczeństwa.</p></div>
<div class="card"><h2>Import receptury</h2><button class="btn primary" id="openImporter">Importuj recepturę z tekstu</button><button class="btn" style="margin-left:8px" id="googleSearch">Znajdź przepis w Google</button></div>
<div class="card"><h2>Prywatność</h2><p class="muted">Kucharzyna nie wysyła receptur, notatek, zakupów ani zdjęć na serwer. Nie używa reklam, analityki ani trackerów.</p></div>`}

function bind(){
 $$(".nav-btn").forEach(b=>b.onclick=()=>nav(b.dataset.route));
 $$("#main [data-route2]").forEach(b=>b.onclick=()=>nav("recipes"));
 $$("#main [data-action]").forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==="new"){state.route="edit";state.editId=null;render()}else if(a==="recipes"){nav("recipes")}else if(a==="calculators"){nav("calculators")}else if(a==="shopping"){nav("shopping")}else if(a==="fav"){state.query="";state.selectedCat="Wszystkie";state.sort="fav";nav("recipes")}else if(a==="recent"){state.query="";state.selectedCat="Wszystkie";state.sort="recent";nav("recipes")}else if(a==="import")openImporter()});
 $$("#main [data-open]").forEach(b=>b.onclick=e=>{if(e.target.closest("[data-fav]"))return;const id=b.dataset.open;const r=state.recipes.find(x=>x.id===id);r.lastUsedAt=now();put("recipes",r);state.route="recipe";state.selectedId=id;render()});
 $$("#main [data-fav]").forEach(b=>b.onclick=async e=>{e.stopPropagation();const id=b.dataset.fav;const r=state.recipes.find(x=>x.id===id);r.favorite=!r.favorite;r.updatedAt=now();await put("recipes",r);render();toast(r.favorite?"Dodano do ulubionych":"Usunięto z ulubionych")});
 const q=$("#recipeSearch");if(q)q.oninput=()=>{state.query=q.value;render();$("#recipeSearch")?.focus()};
 $$("#main [data-cat]").forEach(b=>b.onclick=()=>{state.selectedCat=b.dataset.cat;render()});
 const sort=$("#sort");if(sort)sort.onchange=()=>{state.sort=sort.value;render()};
 $$("#main [data-edit]").forEach(b=>b.onclick=()=>{state.route="edit";state.editId=b.dataset.edit;render()});
 $$("#main [data-cook]").forEach(b=>b.onclick=()=>{state.route="cook";state.selectedId=b.dataset.cook;render()});
 $$("#main [data-scale]").forEach(b=>b.onclick=()=>scaleModal(b.dataset.scale));
 $$("#main [data-shop-recipe]").forEach(b=>b.onclick=()=>addRecipeShopping(b.dataset.shopRecipe));
 $$("#main [data-delete]").forEach(b=>b.onclick=()=>confirmDelete(b.dataset.delete));
 $$("#main [data-history]").forEach(b=>b.onclick=()=>historyModal(b.dataset.history));
 $$("#main [data-clear-cook]").forEach(b=>b.onclick=()=>confirmGeneric("Wyczyścić postęp trybu GOTUJĘ dla tej receptury?",async()=>{await del("cookState",b.dataset.clearCook);delete state.cook[b.dataset.clearCook];toast("Postęp wyczyszczony")}));
 $$("#main [data-back]").forEach(b=>b.onclick=()=>nav("recipes"));
 if($("#saveRecipe")||$("#saveRecipe2")){$("#saveRecipe")?.addEventListener("click",saveEdited);$("#saveRecipe2")?.addEventListener("click",saveEdited);$("#addSection").onclick=()=>{$("#sections-editor").insertAdjacentHTML("beforeend",sectionEditor({id:uid(),name:"Nowa sekcja",ingredients:[]},0));bindEditor()};$("#addStep").onclick=()=>{$("#steps-editor").insertAdjacentHTML("beforeend",stepEditor({id:uid(),text:""},$$("#steps-editor .step").length));bindEditor()};bindEditor()}
 if($("#pizza-result"))calcPizza(); $$("#main #pc-balls,#main #pc-ball,#main #pc-hyd,#main #pc-salt,#main #pc-oil,#main #pc-yeast").forEach(x=>x.oninput=calcPizza);
 if($("#bp-calc"))$("#bp-calc").onclick=()=>{const f=+$("#bp-flour").value||0;const m=parseFloat($("#bp-item").value.split("/").pop())||0;$("#bp-result").innerHTML=`<div class="big">${fmt(f?m/f*100:0)}%</div><div class="muted">Procent piekarski względem ${fmt(f)} g mąki.</div>`};
 if($("#fc-result")){$$("#fc-pack,#fc-price,#fc-use,#fc-sale").forEach(x=>x.oninput=calcFood);calcFood()}
 if($("#add-shopping"))$("#add-shopping").onclick=()=>manualShop();
 $$("#main [data-shop-check]").forEach(x=>x.onchange=async()=>{const s=state.shopping.find(a=>a.id===x.dataset.shopCheck);s.done=x.checked;await put("shoppingItems",s);render()});
 $$("#main [data-shop-del]").forEach(x=>x.onclick=async()=>{await del("shoppingItems",x.dataset.shopDel);state.shopping=await getAll("shoppingItems");render();toast("Usunięto")});
 if($("#clear-done"))$("#clear-done").onclick=async()=>{for(const x of state.shopping.filter(a=>a.done))await del("shoppingItems",x.id);state.shopping=await getAll("shoppingItems");render();toast("Usunięto ukończone")};
 if($("#clear-all-shop"))$("#clear-all-shop").onclick=()=>confirmGeneric("Wyczyścić całą listę zakupów?",async()=>{await clearStore("shoppingItems");state.shopping=[];render();toast("Lista wyczyszczona")});
 if($("#theme")){$("#theme").value=state.settings.theme;$("#theme").onchange=()=>{state.settings.theme=$("#theme").value;saveSetting();applyTheme()}};
 if($("#profile")){$("#profile").value=state.settings.profile;$("#profile").onchange=()=>{state.settings.profile=$("#profile").value;saveSetting();toast("Ustawienie zapisane")}};
 $("#export")?.addEventListener("click",exportBackup);$("#importBackup")?.addEventListener("click",()=>backupInput());
 $("#addCategory")?.addEventListener("click",()=>{openModal(`<h2>Nowa kategoria</h2><input id="cat-name" placeholder="Np. Fermenty"><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-close>Anuluj</button><button class="btn primary" id="cat-ok">Dodaj</button></div>`);$("#cat-ok").onclick=async()=>{const name=$("#cat-name").value.trim();if(!name)return;if(state.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast("Taka kategoria już istnieje");return}await put("categories",{id:uid(),name});state.categories=await getAll("categories");closeModal();render();toast("Dodano kategorię")}});$("#openImporter")?.addEventListener("click",openImporter);$("#googleSearch")?.addEventListener("click",()=>window.open("https://www.google.com/search?q=przepis+kuchnia","_blank","noopener,noreferrer"));
 bindCook();
}
function bindEditor(){ $$("#main .remove-sec").forEach(b=>b.onclick=()=>b.closest(".section-editor").remove());$$("#main .add-ing").forEach(b=>b.onclick=()=>{b.closest(".section-editor").querySelector(".ings").insertAdjacentHTML("beforeend",ingEditor({id:uid(),name:"",qty:"",unit:"g"}));bindEditor()});$$("#main .remove-ing").forEach(b=>b.onclick=()=>b.closest(".ing").remove());$$("#main .remove-step").forEach(b=>b.onclick=()=>b.closest(".step").remove())}
function collectRecipe(){const old=state.editId?state.recipes.find(r=>r.id===state.editId):state.editTemp;const r={...old,name:$("#f-name").value.trim()||"Bez nazwy",category:$("#f-cat").value,yield:+$("#f-yield").value||0,yieldUnit:$("#f-yieldUnit").value.trim(),servings:+$("#f-servings").value||1,temp:+$("#f-temp").value||0,prep:+$("#f-prep").value||0,cook:+$("#f-cook").value||0,ferment:+$("#f-ferment").value||0,tags:$("#f-tags").value.split(",").map(x=>x.trim()).filter(Boolean),description:$("#f-desc").value,notes:$("#f-notes").value,source:$("#f-source").value,sourceUrl:$("#f-url").value,updatedAt:now()};
r.sections=$$("#main .section-editor").map(sec=>({id:sec.dataset.section,name:sec.querySelector(".sec-name").value.trim()||"Sekcja",ingredients:[...sec.querySelectorAll(".ing")].map(el=>({id:uid(),name:el.querySelector(".i-name").value.trim(),qty:+el.querySelector(".i-qty").value||0,unit:el.querySelector(".i-unit").value.trim()||"g",percent:"",price:"",packQty:"",packUnit:""})).filter(i=>i.name)}));
r.steps=$$("#main .step").map(el=>({id:uid(),text:el.querySelector(".step-text").value.trim()})).filter(s=>s.text);
return r}
async function saveEdited(){const r=collectRecipe();const old=state.editId?state.recipes.find(x=>x.id===state.editId):null;if(old)await put("history",{id:uid(),recipeId:r.id,date:now(),snapshot:JSON.parse(JSON.stringify(old)),summary:"Zapisano zmianę receptury"});await put("recipes",r);if($("#f-image").files[0]){r.image=await compressImage($("#f-image").files[0]);await put("recipes",r)}state.recipes=await getAll("recipes");state.route="recipe";state.selectedId=r.id;delete state.editTemp;render();toast("Receptura zapisana")}
function compressImage(file){return new Promise((res,rej)=>{const im=new Image(),c=document.createElement("canvas");im.onload=()=>{const max=1000,sc=Math.min(1,max/Math.max(im.width,im.height));c.width=im.width*sc;c.height=im.height*sc;c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.78))};im.onerror=rej;im.src=URL.createObjectURL(file)})}
function calcPizza(){const balls=+$("#pc-balls").value||0,ball=+$("#pc-ball").value||0,h=+$("#pc-hyd").value||0,s=+$("#pc-salt").value||0,o=+$("#pc-oil").value||0,y=+$("#pc-yeast").value||0,total=balls*ball,flour=total/(1+h/100+s/100+o/100+y/100);$("#pizza-result").innerHTML=`<div class="big">${fmt(total)} g ciasta</div><div class="grid" style="margin-top:10px"><div><b>Mąka</b><br>${fmt(flour)} g</div><div><b>Woda</b><br>${fmt(flour*h/100)} g</div><div><b>Sól</b><br>${fmt(flour*s/100)} g</div><div><b>Oliwa</b><br>${fmt(flour*o/100)} g</div><div><b>Drożdże</b><br>${fmt(flour*y/100)} g</div><div><b>Hydracja</b><br>${fmt(h)}%</div></div>`}
function calcFood(){const p=+$("#fc-pack").value||0,c=+$("#fc-price").value||0,u=+$("#fc-use").value||0,s=+$("#fc-sale").value||0,cost=p?c*u/p:0;$("#fc-result").innerHTML=`<div class="big">${cost.toFixed(2)} zł</div><div>Food cost: <b>${s?(cost/s*100).toFixed(1):"0"}%</b></div>`}
function addRecipeShopping(id){const r=state.recipes.find(x=>x.id===id);(async()=>{for(const s of r.sections)for(const i of s.ingredients)if(i.name)await put("shoppingItems",{id:uid(),name:i.name,qty:i.qty,unit:i.unit,done:false});state.shopping=await getAll("shoppingItems");toast("Dodano składniki do zakupów")})()}
function manualShop(){openModal(`<h2>Dodaj produkt</h2><div class="form-grid"><div class="full"><label>Nazwa</label><input id="shop-name"></div><div><label>Ilość</label><input id="shop-qty" type="number" step="any" value="1"></div><div><label>Jednostka</label><input id="shop-unit" value="szt."></div></div><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-close>Anuluj</button><button class="btn primary" id="shop-ok">Dodaj</button></div>`);$("#shop-ok").onclick=async()=>{const name=$("#shop-name").value.trim();if(!name)return;await put("shoppingItems",{id:uid(),name,qty:+$("#shop-qty").value||1,unit:$("#shop-unit").value.trim()||"szt.",done:false});state.shopping=await getAll("shoppingItems");closeModal();render();toast("Dodano do zakupów")}}
function openModal(html){$("#modal-root").innerHTML=`<div class="modal-backdrop" id="backdrop"><div class="modal">${html}</div></div>`;$("#backdrop").addEventListener("click",e=>{if(e.target.id==="backdrop")closeModal()});$("#modal-root [data-close]")?.addEventListener("click",closeModal)}
function closeModal(){$("#modal-root").innerHTML=""}
function confirmGeneric(text,fn){openModal(`<h2>Potwierdź</h2><p>${text}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Anuluj</button><button class="btn danger" id="yes">Potwierdź</button></div>`);$("#yes").onclick=async()=>{closeModal();await fn()}}
function confirmDelete(id){const r=state.recipes.find(x=>x.id===id);confirmGeneric(`Usunąć „${escapeHtml(r.name)}”?`,async()=>{await del("recipes",id);state.recipes=await getAll("recipes");nav("recipes");toast("Receptura usunięta")})}
function scaleModal(id){const r=state.recipes.find(x=>x.id===id);openModal(`<h2>Przelicz recepturę</h2><p class="muted">Bazowo: ${fmt(r.yield)} ${r.yieldUnit}</p><label>Nowa wartość</label><input id="scale-value" type="number" step="any" value="${r.yield}"><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-close>Anuluj</button><button class="btn primary" id="scale-ok">Przelicz</button></div><div id="scale-out" style="margin-top:12px"></div>`);$("#scale-ok").onclick=()=>{const v=+$("#scale-value").value||r.yield,f=r.yield?v/r.yield:1;$("#scale-out").innerHTML=r.sections.flatMap(s=>s.ingredients).map(i=>`<div class="row between"><span>${escapeHtml(i.name)}</span><b>${fmt(i.qty*f)} ${escapeHtml(i.unit)}</b></div>`).join("")}}
function historyModal(id){const hs=state.history.filter(x=>x.recipeId===id).sort((a,b)=>b.date.localeCompare(a.date));openModal(`<h2>Historia zmian</h2>${hs.length?hs.map(h=>`<div class="card"><b>${new Date(h.date).toLocaleString("pl-PL")}</b><p class="muted">${escapeHtml(h.summary)}</p><button class="btn small" data-restore="${h.id}">Przywróć</button></div>`).join(""):`<p class="muted">Brak zapisanych poprzednich wersji.</p>`}`);$$("#modal-root [data-restore]").forEach(b=>b.onclick=async()=>{const h=hs.find(x=>x.id===b.dataset.restore);await put("recipes",h.snapshot);state.recipes=await getAll("recipes");closeModal();toast("Przywrócono wersję")})}
function bindCook(){if(state.route!=="cook")return;const r=state.recipes.find(x=>x.id===state.selectedId);if(!r)return;const st=state.cook[r.id]||{id:r.id,ingredients:{},steps:{}}; $$("#main [data-cook-ing]").forEach(x=>x.onchange=async()=>{st.ingredients[x.dataset.cookIng]=x.checked;await put("cookState",st);state.cook[r.id]=st;render()});$$("#main [data-cook-step]").forEach(x=>x.onchange=async()=>{st.steps[x.dataset.cookStep]=x.checked;await put("cookState",st);state.cook[r.id]=st;render()})}
function viewCook(){
 const r=state.recipes.find(x=>x.id===state.selectedId),st=state.cook[r.id]||{id:r.id,ingredients:{},steps:{}};
 const ingredients=r.sections.flatMap(s=>s.ingredients);
 const all=[...ingredients.map(i=>st.ingredients[i.id]),...r.steps.map(s=>st.steps[s.id])];
 const done=all.filter(Boolean).length,total=all.length,pct=total?Math.round(done/total*100):0;
 return `<div class="cook-header">
   <div class="row between"><button class="btn" data-back>‹ Receptura</button><b>${pct}%</b></div>
   <h1 style="margin-top:14px">GOTUJĘ</h1><div class="muted">${escapeHtml(r.name)}</div>
   <div class="progress" style="margin-top:12px"><div style="width:${pct}%"></div></div>
 </div>
 <section class="section"><div class="section-title-row"><h2>Składniki</h2><span class="kicker">${ingredients.length}</span></div>
   <div class="card">${r.sections.map(s=>`<div class="form-section-title">${escapeHtml(s.name)}</div>${s.ingredients.map(i=>`<label class="checkbox-row cook-check ${st.ingredients[i.id]?"done":""}"><input type="checkbox" data-cook-ing="${i.id}" ${st.ingredients[i.id]?"checked":""}><span>${escapeHtml(i.name)}<br><b>${fmt(i.qty)} ${escapeHtml(i.unit)}</b></span></label>`).join("")}`).join("")}</div>
 </section>
 <section class="section"><div class="section-title-row"><h2>Instrukcja</h2><span class="kicker">${r.steps.length} kroków</span></div>
   <div class="card">${r.steps.map((s,i)=>`<label class="checkbox-row cook-check cook-step ${st.steps[s.id]?"done":""}"><input type="checkbox" data-cook-step="${s.id}" ${st.steps[s.id]?"checked":""}><span><b>Krok ${i+1}</b><br>${escapeHtml(s.text)}</span></label>`).join("")}</div>
 </section>
 <section class="section"><div class="card"><h2>Parametry</h2><div class="grid3">
   <div class="detail-stat"><div class="kicker">TEMP.</div><b>${r.temp?r.temp+"°C":"—"}</b></div>
   <div class="detail-stat"><div class="kicker">CZAS</div><b>${(r.prep||0)+(r.cook||0)} min</b></div>
   <div class="detail-stat"><div class="kicker">FERM.</div><b>${r.ferment||0} h</b></div>
 </div><p style="white-space:pre-wrap">${escapeHtml(r.notes||"Brak własnych uwag.")}</p></div></section>`;
}
function openImporter(){openModal(`<h2>Importuj recepturę</h2><p class="muted">Wklej tekst przepisu. Parser rozpozna popularne ilości/jednostki i sekcję składników. Nic nie jest wysyłane na serwer.</p><textarea id="import-text" style="min-height:260px" placeholder="Nazwa przepisu\n\nSkładniki:\n500 g mąki\n325 g wody\n10 g soli\n\nPrzygotowanie:\n..."></textarea><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-close>Anuluj</button><button class="btn primary" id="parse-import">Rozpoznaj</button></div>`);$("#parse-import").onclick=()=>parseImport($("#import-text").value)}
function parseImport(text){const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const ing=[];let mode="ing";const steps=[];for(const line of lines.slice(1)){if(/^(składniki|ingredients)\s*:?\s*$/i.test(line)){mode="ing";continue}if(/^(przygotowanie|instructions?|method)\s*:?\s*$/i.test(line)){mode="steps";continue}if(mode==="ing"){const m=line.match(/^(.+?)\s+([\d.,]+)\s*(g|kg|ml|l|szt\.?|łyżeczka|łyżka|szczypta|porcja|%)\b/i);if(m)ing.push([m[1].replace(/^[-•*]\s*/,""),parseFloat(m[2].replace(",",".")),m[3], ""])}else steps.push(line.replace(/^[-•*\d.)\s]+/,""))}const temp=text.match(/(\d{2,3})\s*°?C/i)?.[1]||"";const r=makeRecipe({name:lines[0]||"Importowana receptura",category:"Inne",description:"Zaimportowana lokalnie z tekstu.",yield:1,yieldUnit:"porcja",prep:0,cook:0,ferment:0,temp:+temp,tags:["import"],traditional:false,flag:"",servings:1,ingredients:ing,steps:steps.length?steps:["Uzupełnij instrukcję.",],notes:"Zaimportowano z tekstu.",source:"Wklejony tekst",sourceUrl:""});closeModal();state.editTemp=r;state.editId=null;state.route="edit";render();toast("Rozpoznano recepturę — sprawdź i zapisz")}
function backupInput(){const i=document.createElement("input");i.type="file";i.accept=".json,application/json";i.onchange=()=>importBackup(i.files[0]);i.click()}
async function exportBackup(){const data={version:1,exportedAt:now(),recipes:await getAll("recipes"),categories:await getAll("categories"),shoppingItems:await getAll("shoppingItems"),settings:await getAll("settings"),history:await getAll("history"),cookState:await getAll("cookState")};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kucharzyna-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);toast("Backup wyeksportowany")}
async function importBackup(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.recipes))throw Error("Nieprawidłowy backup");openModal(`<h2>Import backup</h2><p>Co zrobić z obecnymi danymi?</p><div class="row"><button class="btn danger" id="replace-backup">Zastąp</button><button class="btn primary" id="merge-backup">Połącz</button><button class="btn" data-close>Anuluj</button></div>`);$("#replace-backup").onclick=()=>applyBackup(data,true);$("#merge-backup").onclick=()=>applyBackup(data,false)}catch(e){toast("Nieprawidłowy plik backupu")}}
async function applyBackup(data,replace){if(replace)await clearAll();for(const key of ["recipes","categories","shoppingItems","settings","history","cookState"])for(const x of (data[key]||[]))await put(key,x);state.recipes=await getAll("recipes");state.categories=await getAll("categories");state.shopping=await getAll("shoppingItems");state.settings=(await getAll("settings"))[0]||state.settings;closeModal();applyTheme();render();toast("Backup zaimportowany")}
$("#themeBtn").onclick=()=>{state.settings.theme=state.settings.theme==="dark"?"light":"dark";saveSetting();applyTheme()};
window.addEventListener("popstate",()=>nav("start"));
const baseRender=render; render=function(){if(state.route==="recipe"){$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.route==="recipes"));$("#main").innerHTML=viewRecipe(state.selectedId)}else if(state.route==="edit"){$$(".nav-btn").forEach(b=>b.classList.remove("active"));$("#main").innerHTML=editor(state.editId)}else if(state.route==="cook"){$$(".nav-btn").forEach(b=>b.classList.remove("active"));$("#main").innerHTML=viewCook()}else baseRender();bind()};
init();
