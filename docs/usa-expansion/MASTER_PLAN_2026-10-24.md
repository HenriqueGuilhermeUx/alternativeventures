# Alternative Ventures USA — Plano Mestre
**Data:** 24/10/2026  
**Estado:** planejamento técnico-comercial; nenhuma solução USA homologada ou implantada por este documento  
**Branch:** `plan/alternative-ventures-usa-2026-10` (isolada, sem merge/deploy)

## Decisão de portfólio
### Oito produtos prioritários
1. **Health Wallet USA** — experiência **completa**, preservando o núcleo do produto: Passport, Timeline, exames, medicações, compartilhamento/consentimento, perfis familiares quando aplicável, dispositivos e recursos que passem nos gates clínico e de privacidade. Não reduzir a um MVP genérico.
2. **MyDataMed USA** — **escopo inicial simples de acompanhamento médico**: profissional autenticado, vínculo autorizado com paciente, lista de pacientes, histórico com fonte/data, resumo revisável por médico, plano de acompanhamento, pendências e alertas operacionais. Telemedicina, faturamento, prescrição e integração com seguradoras são evoluções posteriores, não pré-requisitos.
3. **DocWallet USA** — armazenamento/compartilhamento, contratos, fluxo de assinatura eletrônica baseado em E-SIGN/UETA, identidade e trilha auditável; notarização e exceções por documento em fluxos próprios.
4. **SmartBots USA** — automações para SMB, webchat, e-mail, SMS/voz condicionados ao provedor e permissões, triagem, agenda e transbordo humano.
5. **MODO USA** — diagnóstico, estratégia, criação, agendamento, campanhas e inteligência, integrando canais comerciais americanos; não anunciar automação de mídia como disponível antes de validação.
6. **NexOffices USA** — CRM, propostas, documentos, tarefas, vendas, agentes e Command Center; financial/ERP e impostos sob configurações locais com conectores próprios, sem reaproveitar lógica PIX.
7. **MindSteps USA** — tutor socrático + longitudinal learner tracking; currículo/idioma/idades, acessibilidade e gates COPPA/FERPA para menores.
8. **F-Insight USA** — dados e analytics financeiros, relatórios, painel para advisors, com dados licenciados e escopo não-personalizado até parecer jurídico sobre investment advice.

### Pesquisa e preparação (não lançar na primeira onda)
- **NexJud USA** — motor de análise/IA jurídica, pesquisar dados e cobertura: tribunais federais via PACER/PCL e tribunais estaduais; criar avaliação de calibração, vieses e explicabilidade; uso inicial por advogados, revisão humana.
- **EcoTracker USA** — verificar lastro, direitos sobre ativo, registros, verificação de créditos, restrições ambientais/securities e parceiros.
### Expressamente excluídos desta frente
- **Nexa Global** (outra conversa/equipe);
- **NextGen** (arquitetura PIX requer redesenho);
- **TaxAgent** (demanda núcleo tributário IRS/estados);
- **SindCopilot/condomínios** e **MindCompliance** (fora por ora).

## Mapeamento preliminar do GitHub (somente existência e estrutura; não equivale a auditoria final)
| Produto | Repositórios observados | Reutilização candidata | Pendência de descoberta |
|---|---|---|---|
| Alternative Ventures | `HenriqueGuilhermeUx/alternativeventures` | site, AV OS/Office, Studio, Netlify APIs | políticas de deploy e permissões |
| Health Wallet | `healthwallet`; `healthwallet-site`; `healthwallet-ocr-api` | Passport, Timeline, Exams, Medications, Sharing, Dashboard, consent; portal profissional | inventário de componentes reais, fluxos, endpoints e dependências BR |
| MyDataMed | principalmente `healthwallet-site` (rotas `mydatamed`, `meus-pacientes`, `prontuario`); `mydatamed` contém um arquivo ZIP | portal profissional existente | confirmar arquitetura atual, tabelas e RBAC |
| DocWallet | `docwallet`, `docwallet-backend`, `docwallet-native` | hash, participantes, assinatura, e-mail OTP, eventos e registros | verificar eficácia do signed PDF, evidências, retention, identidade e identidade/localização BR |
| SmartBots | `zapsmart`, `zapsmart-bot` e/ou componentes `MODO`/`smart-bot-staff` | IA conversacional | identificar repositório canônico e dependências, sem assumir que ZapSmart = SmartBots |
| MODO | `modo` | monorepo web/API, campanhas, conteúdo, integração Canva, IA | validar integrações reais por canal e execução |
| NexOffices | `nexoffice` | workspace, CRM, ERP lite, agentes, approvals, integration hub | mapear versão deployada vs main, identificar impostos/PIX BR |
| MindSteps | `mindsteps-tutoria`, `mindsteps-backend` | tutor socrático, gamificação, acompanhamento | validação direitos/consentimento e dados de menores |
| F-Insight | `f-insight`, `f-insight-api` (`finsight` aparentemente site mínimo) | Radar, Advisor Workspace, relatórios, mercado, alertas | mapear provedores dados, licenças, fontes e conteúdo |
| NexJud (pesquisa) | `nexjud` | frontend, workflows, análise | fontes PACER/tribunais estaduais, treinamento/calibração |
| EcoTracker (pesquisa) | `ecotracker` | rastreabilidade, frontend, backend, smart contracts | lastro/verificação/jurídico dos créditos |

## Arquitetura de internacionalização: proibido duplicar o produto inteiro
1. **Configs por jurisdição**: `market=BR|US`, `locale=pt-BR|en-US`, moeda, timezone, formatos de data/número/endereço, permissões e provedores.
2. **Isolamento de ambiente/dados**: staging US independente; bases, storage, credenciais, templates, índices de busca e logs separados; proibir reutilização e importação automática de PII/PHI brasileiros.
3. **Adaptadores por capacidade**: assinatura, billing, email, SMS, geocoding, EHR/FHIR, market data, calendários, LLM; interfaces estáveis e testes.
4. **Feature flags** por produto/país/contrato; rotas e funções BR permanecem iguais.
5. **Sistemas sensíveis**: criptografia em trânsito/repouso, RLS/RBAC, minimum privilege, consent versionado, audit logs, retenção/exclusão, incident response, fornecedores e DPA/BAA conforme papel.
6. **AI safety**: revisão humana nos casos médico/jurídico/financeiro; nenhum agente executa ações de alto impacto sem controles e autorização.
7. **Release gates**: análise diff BR, build/test, segurança, privacidade/regulação, testes end-to-end US com dados sintéticos, rollbacks, smoke tests; sem merge e deploy no BR sem decisão independente.

## Plano operacional e critérios de aceite

### Frente A: DocWallet USA (primeira onda)
**MVP comercial**: cadastro empresa, upload, contrato, coleta de assinatura, consentimento, autenticidade, PDF final e evidências, exportação, verificação independente.
**Proposta de fluxo**:
1. Emitente gera snapshot imutável do documento e seu SHA-256.
2. Destinatário verifica documento, consentimento para conduzir a transação por meio eletrônico, direito de obter cópia não-eletrônica quando exigido, e declara intenção de assinar.
3. Signatário é autenticado por mecanismo proporcional ao risco (e-mail OTP; MFA ou identity verification mais forte para documentos sensíveis).
4. Assinatura ligada inequivocamente a versão/documento e participante, com timestamp confiável e log imutável/apend-only.
5. Documento/recibo final legível e reproduzível e exportação da trilha.
6. Verificador valida integridade e assinatura; o portal não publica PII por padrão.
**Gates**: counsel confirma exceções por tipo de documento/estado, consentimento do consumidor onde aplicável, retenção/reprodução, notarização/e-notary em fluxo separado, acessibilidade, tratamento das leis UETA estaduais. Blockchain é evidência de integridade, não prova suficiente de identidade ou anuência.
**Base jurídica**: E-SIGN Act, 15 USC §7001 https://www.law.cornell.edu/uscode/text/15/7001.

### Frente B: Health Wallet FULL + MyDataMed SIMPLE (paralela com gate antes de dados reais)
**Health Wallet**: manter e mapear Passport, Timeline, Exams/OCR, Medications, Family, Consent, ShareQR, Devices, Prescriptions, MedScore, Concierge e demais módulos atuais. Cada módulo classificar `reusable`, `localize`, `restricted`, `defer-only-when-legally-required` — sem eliminar funcionalidades por conveniência.
**MyDataMed V1 US**:
- login profissional + organização;
- convite/vínculo médico-paciente sob consentimento granular; revogação e expiração;
- painel por pacientes com último contato, pendências, próximos passos;
- resumo longitudinal com fontes e data, leitura de exames e anexos;
- notas internas, plano de seguimento, alertas não-diagnósticos, auditoria de quem acessou;
- nenhum diagnóstico autônomo por IA; saída IA identificada e revisável por profissional.
**Gates clínico/privacidade**: avaliar se Health Wallet atua fora de HIPAA e sujeita à FTC Health Breach Notification Rule; MyDataMed ao prestar serviço à clínica pode ser business associate e requerer BAA, HIPAA Security/Privacy/Breach Rules conforme enquadramento. Implementar governança antes de PHI real; FHIR/SMART on FHIR para integrações EHR apenas mediante aprovação e acordos. Revisar alegações de saúde e eventual incidência de FDA para suporte à decisão clínica.
**Referências**:
- HHS BAA: https://www.hhs.gov/hipaa/for-professionals/faq/does-hipaa-require-a-covered-entity-to-enter-into-a-business-associate-agreement.html
- FTC HBNR: https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0
- HealthIT API: https://healthit.gov/test-method/standardized-api-for-patient-and-population-services-acb-atl

### Frente C: SmartBots USA (primeira onda)
- webchat, knowledge-base/RAG por negócio, coleta de lead, transbordo, agenda e trilha;
- inglês americano, telefones +1, horários/timezones, consentimento e opt-out;
- marketing por e-mail sujeito à CAN-SPAM; SMS/voz comercial sujeito à análise TCPA/FCC e regras estaduais;
- proibir envio automatizado a terceiros sem base de consentimento/supressão;
- confirmar repositório canônico antes de programar.
**Aceite**: FAQ + captura de lead + encaminhamento humano + logs, opt-out funcional, testes de idempotência, métricas por cliente.
Referência: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

### Frente D: MODO USA (primeira onda)
- configuração idioma/mercado USD, perfis de marcas US, exemplos e templates americanos;
- canais Instagram, Google, Meta, LinkedIn conforme integração efetivamente aprovada;
- disponibilizar assistente de campanha e aprovação humana;
- rastrear crédito, limites, custos de provedores e origem dos dados;
- compliance de publicidades e divulgação de conteúdo patrocinado;
- proibir claims de automação integral sem evidência end-to-end.
**Aceite**: onboarding US, criação/edição, revisão, export/publicação quando autorizada, captura de resultados com fontes verificáveis.

### Frente E: F-Insight USA (primeira onda)
- dados financeiros US com contratos/licenciamento de provedores (equities/ETF/Treasuries) e horários de mercado;
- radar, carteiras demonstrativas, relatórios e workspace do assessor;
- termos e disclaimers consistentes; distinguir visualização/analytics impessoais de aconselhamento de investimento personalizado;
- bloquear recomendações individualizadas e execução de ordens até revisão SEC/estados e desenho regulatório.
**Aceite**: dados rastreáveis e atualizados, licenças de redistribuição, latência indicada, histórico auditável, transparência sobre limitações.
Referência: https://www.sec.gov/files/divisions/investment/iaregulation/memoia.htm

### Frente F: MindSteps USA
- mapear currículo por estado/série e standards (ex. Common Core somente onde adotado), idade, acessibilidade;
- consentimento parental e retenção curta para menores sob COPPA; FERPA e acordos distritais quando houver dados escolares;
- preservar filosofia socrática e metas de aprendizagem, não otimizar tempo de tela;
- controles parent/teacher, autorização escolar, export/delete, prevenção de contato inadequado.
**Aceite**: piloto com contas sintéticas (aluno, responsável, professor), relatórios de progresso verificáveis, isolamento entre escolas e governança de dados.
Referência: https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa

### Frente G: NexOffices USA
- preservar Command Center, CRM, tarefas, propostas, contratos, agentes e Approval Engine;
- preparar adaptadores para Stripe/billing e integrações contábeis US em momento apropriado; não portar Pix, CPF/CNPJ ou obrigações fiscais brasileiras como regra geral;
- validação da primeira release com 1 organização teste, papéis segregados, contabilidade somente se adaptada.

### Frente H: NexJud + EcoTracker (research)
- NexJud: disponibilidade/termos/licenças PACER federal e dados estaduais, benchmarks base-rate, calibração e limites, sem decisão judicial automatizada; **não prometer probabilidade de ganho sem dados calibrados**.
- EcoTracker: ativos lastreados, MRV, anti-double counting, titularidade, custódia, regulamentação das ofertas e tokenização; nenhum crédito financeiro fictício.
Referência PACER PCL API: https://pacer.uscourts.gov/sites/default/files/files/PCL-API-08-2026-1.pdf

## Cronograma orientativo, não promessa de deploy
- **0–14 dias:** auditoria funcional, dependências BR, threat models, inventário dos serviços, selecionar 1 vertical/ICP US, homologação legal preliminar; criar `US staging`.
- **15–45 dias:** SmartBots/MODO/DocWallet/F-Insight em staging, configuração en-US; plano jurídico; Health Wallet/MyDataMed em ambiente sintético.
- **46–90 dias:** pilotos aprovados, KPIs aquisição/ativação/conversão/retention/support, revisão de release de cada produto. MindSteps e NexOffices em staging com gates próprios.
- Lançar somente quando aceites, contratos e segurança estiverem concluídos; datas são metas de planejamento, não confirmações.

## Quadro de controle por produto (status inicial em 24/10/2026)
| Produto | Repositório identificado | Escopo definido | Auditoria integral | Staging USA | Regulação/legal | Produção USA |
|---|---:|---:|---:|---:|---:|---:|
| Health Wallet | sim | sim | pendente | não | pendente | não |
| MyDataMed | parcialmente | sim | pendente | não | pendente | não |
| DocWallet | sim | sim | pendente | não | pendente | não |
| SmartBots | candidato, confirmar | sim | pendente | não | pendente | não |
| MODO | sim | sim | pendente | não | pendente | não |
| NexOffices | sim | sim | pendente | não | pendente | não |
| MindSteps | sim | sim | pendente | não | pendente | não |
| F-Insight | sim | sim | pendente | não | pendente | não |

## Não quebrar produção: controles obrigatórios
- Desenvolvimento exclusivo em branches isoladas de cada repositório; a branch deste plano não modifica BR.
- Nunca copiar tokens, credenciais, dados reais ou segredos para docs ou PR.
- Nenhum merge, alteração de ambiente de produção, migração de DB, faturamento ou envio de mensagens reais sem revisão e release autorizado.
- Não substituir os produtos brasileiros: manter configuração BR como default e testes de regressão obrigatórios.
- Auditar quais repositórios e branches são efetivamente usados em produção antes de decidir cherry-pick/merge.
- Registrar decisões, owner por frente, KPIs, custos, evidência de homologação e aprovação de release.
