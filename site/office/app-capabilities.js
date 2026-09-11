async function renderCapabilities(){
  setHeader('Shared Capabilities','Motores compartilhados que aumentam a capacidade de várias ventures sem duplicar infraestrutura.');
  root.innerHTML='<div class="empty">Carregando AV Document Intelligence…</div>';
  let data={metrics:{configured:false,documents:0,failures:0,averageProcessingMs:0,averageConfidence:0,byConsumer:{},byProvider:{}},providers:[],consumers:{}};
  let intake={configured:false,maxBytes:5000000,providers:{directText:true,openaiOcr:false,externalAdapter:false},privacy:{rawFilePersisted:false,extractedTextPersisted:false}};
  try{const r=await apiFetch('/api/document-intelligence/metrics');if(r.ok)data=await r.json()}catch{}
  try{const r=await apiFetch('/api/document-intelligence/intake');if(r.ok)intake=await r.json()}catch{}
  const m=data.metrics||{};
  const consumers=Object.entries(data.consumers||{});
  const providers=data.providers||[];
  const providerCards=providers.map(p=>`<div class="connector"><div><strong>${esc(p.name)}</strong><p>${esc(p.description||'')}</p></div><span class="${p.configured?'ok':'warn'}">${p.configured?'ATIVO':'CONFIGURAR'}</span></div>`).join('');
  const consumerRows=consumers.map(([slug,c])=>`<tr><td><b>${esc(c.name)}</b></td><td><span class="pill">${esc(c.status)}</span></td><td>${Number(m.byConsumer?.[slug]||0)}</td><td class="muted">${(c.types||[]).slice(0,5).map(esc).join(', ')}${(c.types||[]).length>5?'…':''}</td></tr>`).join('');
  const intakeProviders=intake.providers||{};
  const maxMb=(Number(intake.maxBytes||5000000)/1000000).toFixed(1).replace('.0','');
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
        <div class="metric-strip" style="margin-top:16px"><span>Intake</span><span>OCR</span><span>Classify</span><span>Extract</span><span>Normalize</span><span>Validate</span><span>Act</span></div>
        <div class="source-note">O arquivo passa pelo Intake somente durante o processamento. O AV OS não persiste o arquivo bruto nem o texto extraído; registra apenas métricas operacionais.</div>
      </section>
      <section class="panel">
        <div class="section-head" style="margin-top:0"><h2>Document Intake</h2><p>entrada única para todo o portfólio</p></div>
        <div class="connector"><div><strong>Texto direto</strong><p>TXT, CSV, JSON, XML e texto enviado por API.</p></div><span class="ok">ATIVO</span></div>
        <div class="connector"><div><strong>OCR central</strong><p>PDF, imagem e documentos binários via provider configurado.</p></div><span class="${intakeProviders.openaiOcr?'ok':'warn'}">${intakeProviders.openaiOcr?'ATIVO':'CONFIGURAR'}</span></div>
        <div class="connector"><div><strong>Adapter externo</strong><p>Rota alternativa para OCR/Document AI desacoplado.</p></div><span class="${intakeProviders.externalAdapter?'ok':'warn'}">${intakeProviders.externalAdapter?'ATIVO':'OPCIONAL'}</span></div>
        <div class="source-note">Limite atual por chamada: ${esc(maxMb)} MB.</div>
      </section>
    </div>
    <div class="section-head"><h2>Providers de estruturação</h2><p>routing desacoplado</p></div>
    <section class="panel"><div class="grid" style="gap:10px">${providerCards||'<div class="empty">Nenhum provider disponível.</div>'}</div></section>
    <div class="section-head"><h2>Consumers</h2><p>uma capacidade, várias ventures</p></div>
    <section class="panel table-wrap"><table class="table"><thead><tr><th>Venture</th><th>Status</th><th>Docs</th><th>Tipos habilitados</th></tr></thead><tbody>${consumerRows}</tbody></table></section>
    <div class="section-head"><h2>Testar AV Document Intake</h2><p>PDF, imagem, documento ou texto</p></div>
    <section class="panel">
      <div class="form-grid">
        <label>Consumer<select class="input" id="di-consumer">${consumers.map(([slug,c])=>`<option value="${esc(slug)}">${esc(c.name)}</option>`).join('')}</select></label>
        <label>Tipo<select class="input" id="di-type"><option value="auto">detectar automaticamente</option><option value="receipt">receipt</option><option value="invoice">invoice</option><option value="contract">contract</option><option value="legal_document">legal_document</option><option value="corporate_document">corporate_document</option><option value="power_of_attorney">power_of_attorney</option><option value="meeting_minutes">meeting_minutes</option><option value="quotation">quotation</option><option value="proof_of_payment">proof_of_payment</option><option value="fiscal_document">fiscal_document</option><option value="other">other</option></select></label>
        <label class="full">Arquivo<input class="input" id="di-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.xml,.doc,.docx"/><span class="muted">PDF, foto, DOC/DOCX ou arquivo textual. O binário não é persistido pelo Intake.</span></label>
        <label class="full">Ou cole texto<textarea class="input" id="di-text" rows="7" placeholder="Você também pode testar colando o texto de uma nota, recibo, contrato, ata ou comprovante."></textarea></label>
        <label class="full" style="display:flex;gap:10px;align-items:flex-start"><input id="di-consent" type="checkbox" style="margin-top:4px"><span>Permitir processamento externo quando o arquivo precisar de OCR/visão. Para texto direto, essa permissão não é necessária.</span></label>
      </div>
      <div class="form-actions"><button class="btn primary" id="di-run" type="button">Processar no Intake</button></div>
      <div id="di-output" class="callout" style="margin-top:16px;display:none;white-space:pre-wrap;overflow:auto"></div>
    </section>`;
  const btn=document.getElementById('di-run');
  if(btn)btn.onclick=async()=>{
    const text=document.getElementById('di-text').value.trim();
    const file=document.getElementById('di-file').files?.[0];
    const out=document.getElementById('di-output');
    if(!text&&!file){out.style.display='block';out.textContent='Selecione um arquivo ou cole um texto.';return}
    btn.disabled=true;btn.textContent='Processando…';out.style.display='block';out.textContent='Intake → extração → normalização → validação…';
    try{
      let r;
      const base={consumer:document.getElementById('di-consumer').value,documentType:document.getElementById('di-type').value,allowExternalProcessing:document.getElementById('di-consent').checked};
      if(file){
        const form=new FormData();
        form.append('consumer',base.consumer);form.append('documentType',base.documentType);form.append('allowExternalProcessing',String(base.allowExternalProcessing));form.append('intakeProvider','auto');form.append('file',file);if(text)form.append('text',text);
        r=await apiFetch('/api/document-intelligence/intake',{method:'POST',body:form});
      }else{
        r=await apiFetch('/api/document-intelligence/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...base,intakeProvider:'auto',text})});
      }
      const j=await r.json();
      if(!r.ok){
        const hints={openai_ocr_not_configured:'Configure OPENAI_API_KEY no Netlify da Alternative Ventures para habilitar OCR central.',binary_extractor_not_configured:'O Intake está pronto, mas falta configurar um provider de OCR para PDF/imagem.',external_processing_requires_explicit_consent:'Marque a permissão de processamento externo para usar OCR em PDF/imagem.',file_too_large:'O arquivo ultrapassa o limite atual do Intake.'};
        out.textContent=`Falha: ${j.error||r.status}\n${hints[j.error]||''}\n\n${JSON.stringify(j,null,2)}`;
      }else{
        const result=j.result||{};
        out.textContent=`INTAKE CONCLUÍDO\nConsumer: ${j.consumer}\nEntrada: ${j.intakeProvider}\nEstruturação: ${j.structuringProvider}\nTipo: ${result.documentType||'—'}\nConfiança: ${Math.round(Number(result.confidence||0)*100)}%\nTempo: ${j.processingMs||0} ms\n\n${result.summary||''}\n\n${JSON.stringify({issuer:result.issuer,recipient:result.recipient,documentNumber:result.documentNumber,dates:result.dates,amounts:result.amounts,parties:result.parties,identifiers:result.identifiers,obligations:result.obligations,validation:j.validation},null,2)}`;
      }
    }catch(e){out.textContent='Falha ao executar o Intake: '+(e?.message||e)}
    finally{btn.disabled=false;btn.textContent='Processar no Intake'}
  };
}
