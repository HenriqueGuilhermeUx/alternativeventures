# AV Prospecting Automation

Objetivo: alimentar automaticamente o `av_deals` do AV OS sem duplicar CRMs por venture.

## Arquitetura

```text
Fonte de prospecção
  -> Actor / coletor agendado
  -> POST https://alternativeventures.com.br/api/leads-ingest
  -> av_deals
  -> AV OS / Ventures / botão Leads
  -> revisão humana
  -> WhatsApp / e-mail / SMS
  -> follow-up
```

O endpoint usa o header `x-av-os-key` com `AVOS_INGEST_KEY`. Nunca colocar essa chave no frontend ou em código público.

O primeiro contato deve continuar com aprovação humana. A coleta, deduplicação, gravação e fila de follow-up podem ser automáticas.

## Um Actor, várias Tasks

O Actor de Google Maps é genérico. Não criar um Actor por venture. Criar uma Task por perfil de prospecção, alterando `venture`, `regions` e `keywords`.

Cada item encontrado deve ser enviado diretamente pelo Actor para `/api/leads-ingest` com o payload documentado em `AV_LEADS_INGEST.md`.

Exemplo de envio dentro do Actor:

```js
await fetch(process.env.AV_OS_LEADS_URL, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-av-os-key': process.env.AV_OS_INGEST_KEY,
  },
  body: JSON.stringify(lead),
});
```

Guardar `AV_OS_INGEST_KEY` como secret do Actor/Task. Não colocar a chave no input público.

## Perfis iniciais

### SindCopilot
Fonte: Google Maps / Apify.

Keywords:
- administradora de condomínios
- administração condominial
- síndico profissional
- síndica profissional

### NexJud
Fonte: Google Maps + fontes jurídicas públicas quando necessário.

Keywords:
- escritório de advocacia
- advogado trabalhista
- advogado empresarial
- advogado tributário
- advocacia empresarial

### MindSteps
Fonte: Google Maps, prospectando a instituição, não indivíduos.

Keywords:
- escola particular
- colégio particular
- escola de educação infantil
- escola ensino fundamental
- escola ensino médio

Contato inicial deve pedir direcionamento para direção ou coordenação pedagógica.

### Health Wallet / MyDataMed
Fonte: Google Maps.

Keywords:
- clínica médica
- consultório médico
- clínica de especialidades
- centro médico
- clínica de diagnóstico

Criar Tasks separadas para `health-wallet` e `mydatamed` quando a oferta for diferente.

### MindCompliance / NR1Check
Duas fontes.

Google Maps:
- escritório de contabilidade
- contabilidade empresarial
- contador para empresas

CNPJ público, em uma etapa posterior:
- PMEs com empregados
- segmentação por porte, CNAE e região

Escritórios contábeis são canal prioritário porque podem distribuir a solução para várias empresas clientes.

### F-Insight
Fonte prioritária: registros públicos da CVM para assessores/escritórios de assessoria.

Google Maps pode ser usado como fonte complementar:
- assessoria de investimentos
- escritório de assessoria de investimentos

### SmartBots
Fonte: Google Maps / negócios locais com alto volume de atendimento.

Keywords iniciais:
- salão de beleza
- barbearia
- clínica de estética
- consultório odontológico
- clínica veterinária
- pet shop
- ótica
- oficina mecânica
- funilaria
- imobiliária
- academia
- estúdio de pilates
- estúdio de yoga
- restaurante
- buffet de eventos
- escola de idiomas
- assistência técnica

### MODO
Fase 1: compartilhar parte do universo SmartBots, mas com oferta de marketing.

Keywords iniciais:
- salão de beleza
- barbearia
- clínica de estética
- clínica odontológica
- imobiliária
- academia
- restaurante
- pet shop
- loja de roupas
- loja de decoração
- loja de móveis
- empresa de serviços

Fase 2: enriquecer com fontes de Instagram/social para pequenas marcas e empresas que já publicam, mas sem consistência.

Não duplicar automaticamente todo lead SmartBots no MODO. Aplicar fit por segmento/metadata para evitar spam e ofertas irrelevantes.

## Frequência recomendada

Começar semanalmente por Task. Exemplo: segunda-feira pela manhã, com lotes pequenos. Depois ajustar volume com base em taxa de contato, resposta e reunião.

O AV OS não deve gerar centenas de leads sem capacidade de abordagem. A meta é manter uma fila acionável.

## Dados úteis em metadata

```json
{
  "phone": "+5513999999999",
  "website": "https://empresa.com.br",
  "address": "...",
  "rating": 4.8,
  "region": "Santos, SP",
  "keyword": "síndico profissional",
  "sourceId": "google-place-id"
}
```

O CRM usa `phone`/`whatsapp` para abrir WhatsApp/SMS e guarda `lastContactAt`, `lastChannel`, `nextContactAt` e `lastMessageVariant` no metadata depois que o fundador marca um contato como enviado.

## Próximos conectores

1. Apify Google Maps: SindCopilot, NexJud, MindSteps, Health/MyDataMed, contabilidades, SmartBots e MODO.
2. CNPJ público: MindCompliance.
3. CVM: F-Insight.
4. Enriquecimento de e-mail corporativo: opcional, somente de fontes adequadas e respeitando políticas/legislação aplicáveis.
5. Social/Instagram: MODO fase 2, depois de validar ICP e mensagem na fase 1.
