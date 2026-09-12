# AV OS — Leads / CRM Ingest

O AV OS recebe leads de ventures externas por um endpoint server-to-server e grava cada entrada em `av_deals` com estágio inicial `lead`.

## Endpoint

`POST https://alternativeventures.com.br/api/leads-ingest`

## Autenticação

Enviar o segredo configurado no AV OS no header:

```http
x-av-os-key: <AVOS_INGEST_KEY>
content-type: application/json
```

Nunca colocar `AVOS_INGEST_KEY` em frontend, app mobile, bundle público ou repositório. A chamada deve sair de backend, serverless function, worker ou automação privada.

## Payload

```json
{
  "venture": "smartbots",
  "company": "Empresa Exemplo Ltda",
  "contactName": "Maria Silva",
  "contactEmail": "maria@empresa.com.br",
  "source": "website_chat",
  "value": 2500,
  "metadata": {
    "campaign": "smartbots-site",
    "phone": "+5513999999999",
    "notes": "Pediu demonstração"
  }
}
```

Campos:

- `venture` — obrigatório; deve ser um slug conhecido do AV OS.
- `company` — obrigatório.
- `contactName` — opcional.
- `contactEmail` — opcional.
- `source` — opcional; origem do lead, por exemplo `website_chat`, `whatsapp`, `modo_prospector`, `manual`, `event`.
- `value` — opcional; valor estimado em BRL. Se omitido, entra como `0`.
- `metadata` — opcional; JSON com contexto adicional que não deve conter segredos.

O endpoint define automaticamente `stage = "lead"`.

## Slugs aceitos

`nexa`, `ecotracker`, `nexjud`, `docwallet`, `mindcompliance`, `sindcopilot`, `health-wallet`, `mydatamed`, `f-insight`, `nextgen`, `modo`, `smartbots`, `staff`, `mindsteps`, `taxagent`, `connexio`.

## Exemplo — SmartBots

Quando um visitante for qualificado no site ou WhatsApp, o backend do SmartBots pode registrar o lead assim:

```js
await fetch('https://alternativeventures.com.br/api/leads-ingest', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-av-os-key': process.env.AVOS_INGEST_KEY,
  },
  body: JSON.stringify({
    venture: 'smartbots',
    company: lead.company,
    contactName: lead.name,
    contactEmail: lead.email,
    source: 'smartbots',
    value: lead.estimatedValue || 0,
    metadata: {
      channel: lead.channel,
      qualification: lead.qualification,
      externalLeadId: lead.id,
    },
  }),
});
```

## Exemplo — MODO

Um lead gerado pelo Prospector / outbound da MODO pode entrar no CRM da venture-alvo. Exemplo para NexJud:

```js
await fetch('https://alternativeventures.com.br/api/leads-ingest', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-av-os-key': process.env.AVOS_INGEST_KEY,
  },
  body: JSON.stringify({
    venture: 'nexjud',
    company: prospect.company,
    contactName: prospect.name,
    contactEmail: prospect.email,
    source: 'modo_prospector',
    value: prospect.estimatedValue || 0,
    metadata: {
      campaignId: prospect.campaignId,
      icpScore: prospect.icpScore,
      modoLeadId: prospect.id,
    },
  }),
});
```

A propriedade `venture` representa a venture que receberá a oportunidade comercial, não necessariamente o sistema que originou o lead.

## Respostas

Sucesso persistido:

```json
{
  "accepted": true,
  "persisted": true,
  "deal": {
    "stage": "lead"
  }
}
```

Data Hub ainda não configurado:

```json
{
  "accepted": true,
  "persisted": false,
  "reason": "supabase_not_configured"
}
```

Erros relevantes:

- `400 invalid_json`
- `400 invalid_lead`
- `401 unauthorized`
- `405 method_not_allowed`
- `500` em falha de persistência no Data Hub

## CRM interno

O AV OS consulta os registros autenticados em `GET /api/leads` e altera estágio/owner/próxima ação por `PATCH /api/leads-update`.

Estágios válidos:

`lead → qualified → meeting → proposal → won | lost`

O endpoint público de ingestão não permite escolher o estágio inicial. Isso evita que uma fonte externa injete diretamente oportunidades como `won`.
