async function renderCapabilities(){
  setHeader('Shared Capabilities','Motores compartilhados que aumentam a capacidade de várias ventures sem duplicar infraestrutura.');
  root.innerHTML='<div class="empty">Carregando AV Document Intelligence…</div>';
  let data={metrics:{configured:false,documents:0,failures:0,averageProcessingMs:0,averageConfidence:0,byConsumer:{},byProvider:{}},providers:[],consumers:{}};
  try{const r=await apiFetch('/api/document-intelligence/metrics');if(r.ok)data=await r.json()}catch{}
  const m=data.metrics||{};
  const consumers=Object.entries(data.consumers||{});
  const providers=data.providers||[];
  const providerCards=providers.map(p=>`<div class="connector"><div><strong>${esc(p.name)}</strong><p>${esc(p.description||'')}</p></div><span class="${p.configured?'ok':'warn'}">${p.configured?'ATIVO':'CONFIGURAR'}</span></div>`).join('');
  const consumerRows=consumers.map(([slug,c])=>`<tr><td><b>${esc(c.name)}</b></td><td><span class="pill">${esc(c.status)}</span></td><td>${Number(m.byConsumer?.[slug]||0)}</td><td class="muted">${(c.types||[]).slice(0,5).map(esc).join(', ')}${(c.types||[]).length>5?'…':''}</td></tr>`).join('');
  root.innerHTML=`
    <div class="grid4">
      ${kpi('Documentos processados',m.documents||0,m.configured?'últimos 500 registros':'Data Hub ainda não conectado')}
      ${kpi('Falhas',m.failures||0,'jobs registrados')}
      ${kpi('Tempo médio',m.averageProcessingMs?m.averageProcessingMs+' ms':'—','processamento')}
      ${kpi('Confiança média',m.averageConfidence?Math.round(m.averageConfidence*100)+'%':'—','extração estruturada')}
    </div>
    <div class="grid2" style="margin-top:16px">
      <section class="panel">
        <p class="eyebrow">AV DOCUMENT INTELLIGENCE</p>
        <div class="hero-note"><b>Documento → entendimento → dados estruturados → ação.</b><br><br>Motor comum para NextGen, DocWallet, SindCopilot, NexJud, Staff, TaxAgent, MindCompliance e demais produtos.</div>
        <div class="metric-strip" style="margin-top:16px"><span>Ingestion</span><span>Classify</span><span>Extract</span><span>Normalize</span><span>Validate</span><span>Act</span></div>
        <div class="source-note">Conteúdo documental não é enviado ao AV OS. O painel recebe apenas métricas operacionais agregadas.</div>
      </section>
      <section class="panel">
        <div class="section-head" style="margin-top:0"><h2>Providers</h2><p>routing desacoplado</p></div>
        <div class="grid" style="gap:10px">${providerCards||'<div class="empty">Nenhum provider disponível.</div>'}</div>
      </section>
    </div>
    <div class="section-head"><h2>Consumers</h2><p>uma capacidade, várias ventures</p></div>
    <section class="panel table-wrap"><table class="table"><thead><tr><th>Venture</th><th>Status</th><th>Docs</th><th>Tipos habilitados</th></tr></thead><tbody>${consumerRows}</tbody></table></section>
    <div class="section-head"><h2>Testar motor interno</h2><p>usa a sua sessão do AV OS</p></div>
    <section class="panel">
      <div class="form-grid">
        <label>Consumer<select class="input" id="di-consumer">${consumers.map(([slug,c])=>`<option value="${esc(slug)}">${esc(c.name)}</option>`).join('')}</select></label>
        <label>Tipo<select class="input" id="di-type"><option value="auto">detectar automaticamente</option><option value="receipt">receipt</option><option value="invoice">invoice</option><option value="contract">contract</option><option value="meeting_minutes">meeting_minutes</option><option value="quotation">quotation</option><option value="proof_of_payment">proof_of_payment</option><option value="fiscal_document">fiscal_document</option><option value="other">other</option></select></label>
        <label class="full">Texto do documento<textarea class="input" id="di-text" rows="9" placeholder="Cole aqui texto de uma nota, recibo, contrato, ata ou comprovante para validar o pipeline."></textarea></label>
      </div>
      <div class="form-actions"><button class="btn primary" id="di-run" type="button">Analisar documento</button></div>
      <div id="di-output" class="callout" style="margin-top:16px;display:none;white-space:pre-wrap;overflow:auto"></div>
    </section>
    <div class="callout" style="margin-top:16px">Próxima etapa: conectar OCR/Document AI para foto e PDF bruto via provider externo. O adapter já está pronto e exige consentimento explícito antes de enviar conteúdo para fora da Alternative Ventures.</div>`;
  const btn=document.getElementById('di-run');
  if(btn)btn.onclick=async()=>{
    const text=document.getElementById('di-text').value.trim();
    const out=document.getElementById('di-output');
    if(!text){out.style.display='block';out.textContent='Cole um texto de documento para testar.';return}
    btn.disabled=true;btn.textContent='Analisando…';out.style.display='block';out.textContent='Processando…';
    try{
      const r=await apiFetch('/api/document-intelligence/extract',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consumer:document.getElementById('di-consumer').value,documentType:document.getElementById('di-type').value,provider:'internal',text})});
      const j=await r.json();out.textContent=JSON.stringify(j,null,2);
    }catch(e){out.textContent='Falha ao executar o motor: '+(e?.message||e)}
    finally{btn.disabled=false;btn.textContent='Analisar documento'}
  };
}
