# Alternative Ventures + AV OS

Repositório oficial do site `alternativeventures.com.br` e do **Alternative Ventures Office / AV OS**.

## Rotas

- `/` — site institucional / portfólio
- `/manifesto/` — manifesto
- `/dev/` — Alternative Digital Products Studio
- `/login/` — acesso privado
- `/office/` — AV OS / Founder Command Center

## Estrutura

```text
site/
  index.html
  manifesto/index.html
  dev/index.html
  login/index.html
  office/
netlify/functions/
infra/supabase/
docs/
netlify.toml
```

## Deploy no Netlify

Conecte este repositório ao site Netlify que atende `alternativeventures.com.br`.

- Build command: vazio
- Publish directory: `site`
- Functions directory: `netlify/functions`

O `netlify.toml` já contém essas configurações.

### Variáveis obrigatórias para /login

Cadastre no Netlify, sem commitar os valores:

- `AVOS_ACCESS_EMAIL` — e-mail autorizado
- `AVOS_ACCESS_CODE` — código de acesso forte
- `AVOS_SESSION_SECRET` — segredo aleatório longo para assinar sessões

A sessão do Office expira em 12 horas.

## AV OS Data Hub

Quando criarmos um Supabase dedicado ao AV OS, execute `infra/supabase/schema.sql` e cadastre no Netlify:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AVOS_INGEST_KEY`

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Segurança

Arquivos `.env` ficam ignorados. O AV OS registra **onde** uma credencial está guardada, mas não deve guardar senhas, tokens, seeds, private keys ou dados sensíveis dos clientes das ventures.
