const P = window.AV_PORTFOLIO;
const root = document.getElementById('view-root');
const title = document.getElementById('view-title');
const subtitle = document.getElementById('view-subtitle');
const nav = document.getElementById('main-nav');
const modalRoot = document.getElementById('modal-root');

const state = { snapshot:null, tech:null, view:'overview' };
function apiFetch(url, options = {}){
  const token = localStorage.getItem('avos_session') || '';
  const headers = {...(options.headers||{}), Authorization: 'Bearer '+token};
  return fetch(url,{...options,headers,cache:options.cache||'no-store'});
}

const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const status = s => `<span class="status ${s||'unknown'}">${s==='healthy'?'Operacional':s==='degraded'?'Atenção':s==='down'?'Indisponível':'Não verificado'}</span>`;
const kpi = (label,value,detail='') => `<div class="kpi"><div class="kpi-head"><span>${label}</span><span>◦</span></div><strong>${value}</strong><small>${detail}</small></div>`;

function setHeader(t,s){title.textContent=t;subtitle.textContent=s}
function ventureCard(v){return `<article class="venture-card" data-venture="${v.slug}" style="--accent:${v.accent}"><div class="venture-top"><span class="venture-icon">${esc(v.name.slice(0,2).toUpperCase())}</span><span class="priority ${v.priority}">${v.priority}</span></div><h3>${esc(v.name)}</h3><p>${esc(v.category)}</p><div class="venture-thesis">${esc(v.thesis)}</div><div class="tags">${v.cash.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div></article>`}

async function fetchSnapshot(){
  if(state.snapshot) return state.snapshot;
  try{const r=await apiFetch('/api/snapshot');state.snapshot=await r.json()}catch{state.snapshot={cash:[],deals:[],contracts:[],eventCount:0,configured:false}}
  return state.snapshot;
}

function bindVentureCards(){document.querySelectorAll('[data-venture]').forEach(el=>el.addEventListener('click',()=>openVenture(el.dataset.venture)))}
function openVenture(slug){
  const v=P.find(x=>x.slug===slug); if(!v)return;
  const tech=(state.tech?.items||[]).find(x=>x.slug===slug);
  modalRoot.innerHTML=`<div class="modal-backdrop" id="modal-bg"><div class="modal"><div class="modal-head"><div><p class="eyebrow">${esc(v.category)}</p><h2>${esc(v.name)}</h2><p class="muted">${esc(v.thesis)}</p></div><button class="close" id="modal-close">×</button></div><div class="detail-grid"><section class="panel"><div class="section-head" style="margin-top:0"><h2>Motores de caixa</h2><p>hipóteses comerciais</p></div><div class="tags">${v.cash.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="section-head"><h2>Repositórios</h2><p>GitHub</p></div><div class="repo-list list">${v.repos.length?v.repos.map(r=>`<div class="list-item"><b>${esc(r)}</b><a target="_blank" href="https://github.com/${esc(r)}">abrir ↗</a></div>`).join(''):'<div class="empty">Repositório ainda não mapeado.</div>'}</div></section><aside class="panel"><div class="list"><div class="list-item"><b>Prioridade</b><span>${v.priority.toUpperCase()}</span></div><div class="list-item"><b>Estágio</b><span>${v.stage}</span></div><div class="list-item"><b>Saúde</b>${tech?status(tech.health):status('unknown')}</div><div class="list-item"><b>Latência</b><span>${tech?.latencyMs?tech.latencyMs+' ms':'—'}</span></div></div>${v.web?`<div class="section-head"><h2>Produto</h2></div><a class="btn primary" href="${v.web}" target="_blank">Abrir produto ↗</a>`:''}</aside></div></div></div>`;
  document.getElementById('modal-close').onclick=closeModal;document.getElementById('modal-bg').addEventListener('click',e=>{if(e.target.id==='modal-bg')closeModal()});
}
function closeModal(){modalRoot.innerHTML=''}

async function renderOverview(){
 setHeader('Founder Command Center','Uma visão única de produto, receita, distribuição e tecnologia para todo o portfólio.');
 const snap=await fetchSnapshot();
 const rev=(snap.cash||[]).filter(x=>x.kind==='revenue').reduce((a,x)=>a+Number(x.amount_brl||0),0);
 const cost=(snap.cash||[]).filter(x=>x.kind==='cost').reduce((a,x)=>a+Number(x.amount_brl||0),0);
 const pipe=(snap.deals||[]).filter(x=>!['won','lost'].includes(x.stage)).reduce((a,x)=>a+Number(x.value_brl||0),0);
 root.innerHTML=`<div class="grid4">${kpi('Ventures monitoradas',P.length,'Portfólio pré-carregado')}${kpi('Receita registrada',money(rev),snap.configured?'Caixa realizado':'Conecte as fontes financeiras')}${kpi('Pipeline aberto',money(pipe),(snap.deals||[]).length?'Oportunidades em aberto':'Conecte o Growth Desk')}${kpi('Eventos 24h',snap.eventCount||0,snap.eventCount?'Telemetria recebida':'SDK ainda não conectado')}</div><div class="grid2" style="margin-top:16px"><section class="panel"><div class="section-head" style="margin-top:0"><h2>Radar do fundador</h2><p>prioridades estruturais</p></div><div class="list"><div class="list-item"><div><b>Distribuição</b><div class="muted">MODO + Prospector como motor comercial compartilhado</div></div><span>Growth Engine</span></div><div class="list-item"><div><b>Observabilidade</b><div class="muted">GitHub, endpoints, deploys e incidentes</div></div><span>Tech Layer</span></div><div class="list-item"><div><b>Dados</b><div class="muted">Eventos padronizados sem copiar dados sensíveis</div></div><span>Data Hub</span></div><div class="list-item"><div><b>Caixa</b><div class="muted">Separar realizado, custos e pipeline</div></div><span>Finance</span></div></div></section><section class="panel"><p class="eyebrow">PRINCÍPIO</p><div class="hero-note">O AV OS é o <b>control plane</b> da Alternative Ventures — não o banco central de dados sensíveis de cada produto.</div><div class="metric-strip" style="margin-top:16px"><span>Produto</span><span>Receita</span><span>Growth</span><span>GitHub</span><span>Deploy</span><span>Uptime</span><span>Contratos</span><span>Founder AI</span></div><div class="source-note">${snap.configured?'Data Hub conectado':'Modo seguro: sem dados financeiros persistidos'}</div></section></div><div class="section-head"><h2>Portfólio</h2><p>Clique para abrir a visão executiva</p></div><div class="venture-grid">${P.map(ventureCard).join('')}</div>`;
 bindVentureCards();
 const ctl=loadControl(),cm=completeness(ctl);
 root.insertAdjacentHTML('afterbegin',`<div class="grid4 governance-kpis">${kpi('Contas mapeadas',cm.emails+' / '+cm.accounts,'com e-mail/login identificado')}${kpi('Domínios controlados',cm.domains,cm.renewals+' com renovação registrada')}${kpi('Pendências operacionais',cm.tasks,'roadmap aberto')}${kpi('Inventário AV OS','v0.2','exportável e editável')}</div>`);
}

function renderVentures(){setHeader('Ventures','Mapa consolidado das teses, estágios, prioridades e motores de geração de caixa.');root.innerHTML=`<div class="venture-grid">${P.map(ventureCard).join('')}</div>`;bindVentureCards()}
