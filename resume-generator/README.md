# Resume Generator

Cole o texto de um currículo gerado por IA, clique em **Gerar PDF** (ou
`Ctrl+Enter`) e pronto: o PDF é baixado imediatamente. Sem login, sem
cadastro, sem banco de dados, sem formulários.

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

> A geração do PDF depende de internet no momento da chamada, pois as fontes
> (Inter/Manrope/IBM Plex Sans) são carregadas via Google Fonts dentro do
> template. Sem internet, o Puppeteer usa a fonte de fallback do sistema —
> o PDF continua sendo gerado normalmente, apenas com tipografia diferente.

## Build de produção

```bash
npm run build
npm start
```

## Qualidade

```bash
npm test     # testes unitários (node:test, via tsx — sem dependências extras)
npm run lint # ESLint
npm run format
```

Testes cobrem o parser inteiro (normalização, dicionário de seções, contato,
construtores de conteúdo e o fluxo completo, incluindo o fallback seguro) e
o utilitário de escape de HTML — a lógica mais crítica e mais fácil de
quebrar silenciosamente do projeto.

**Decisões de performance/robustez relevantes:**
- O Puppeteer mantém **um único browser Chromium reutilizado** entre
  requisições (`pdf/pdfGenerator.ts`) em vez de abrir um processo novo a
  cada PDF — evita centenas de ms de overhead por requisição. O browser é
  fechado de forma graciosa em `SIGINT`/`SIGTERM`.
- O texto colado tem um limite defensivo de 20.000 caracteres na rota, para
  que um input patológico não trave a renderização.
- `page.setContent` tem timeout explícito (15s) para falhar rápido caso o
  carregamento das fontes do Google Fonts trave por instabilidade de rede.

## Estrutura

```
src/server/
  index.ts                     # bootstrap do Express
  routes/                      # contrato HTTP (apenas rotas)
  services/                    # orquestra parser -> template -> pdf
  parser/                      # interpreta o texto colado
    types.ts                   # modelo de domínio (ParsedResume, ContactInfo...)
    normalize.ts                # normalização de texto para comparação tolerante
    sectionDictionary.ts        # variantes de título -> SectionType canônico
    contactParser.ts            # extrai telefone/email/linkedin/github/site/local
    contentBuilders.ts          # linhas -> parágrafos | lista | entradas
    resumeParser.ts             # orquestra o parsing + fallback à prova de falhas
  templates/                    # um template por pasta, HTML compartilhado + CSS próprio
    types.ts                    # interface ResumeTemplate
    registry.ts                 # registro de templates disponíveis
    shared/                     # renderer de documento, seções, contato e ícones
    modern/  minimal/  executive/  ats/
      renderer.ts                # identifica o template (a marcação vem do shared/)
  pdf/                          # gera o PDF com Puppeteer
  utils/                        # helpers (escape de HTML, leitura de CSS)
public/
  index.html                    # textarea + botão "Gerar PDF"
  css/                           # estilo da interface web (tokens.css + app.css)
  js/app.js                      # chama a API, atalho Ctrl+Enter, drag&drop, toast
  templates/                     # CSS de cada template de currículo (renderizado no PDF)
    shared/tokens.css            # tokens de design compartilhados (cor, fonte, espaçamento...)
    modern/ minimal/ executive/ ats/
      template.css
```

## Como o parser funciona

O texto colado é dividido em:

1. **Nome** — primeira linha.
2. **Cargo** (opcional) — linha seguinte, se for curta e não parecer
   contato nem cabeçalho de seção (ex.: "Desenvolvedora Full Stack Sênior").
3. **Contato** (opcional) — linha com e-mail, telefone, LinkedIn, GitHub,
   site ou separador `|`/`•`, dividida em campos estruturados.
4. **Seções** — reconhecidas por um dicionário tolerante a acentuação,
   maiúsculas/minúsculas e variações de redação em PT/EN (ex.: "Formação",
   "Formação Acadêmica", "Education" caem todas em `education`).

Cada seção é renderizada de um jeito diferente conforme o tipo:

- `summary` → parágrafos de texto corrido.
- `skills`, `certifications`, `languages` → lista de itens (tags).
- `experience`, `projects`, `education` → blocos com título, período e
  bullets/descrição.

Se o parsing falhar por qualquer motivo inesperado, um fallback seguro
transforma todo o texto em um currículo mínimo (nome + resumo) — a geração
do PDF nunca quebra.

## Templates

Quatro templates ficam prontos em `public/templates/`: `modern` (padrão),
`minimal`, `executive` e `ats`. Todos compartilham a mesma estrutura HTML
(gerada uma única vez em `templates/shared/documentRenderer.ts`); a
diferença visual entre eles é inteiramente definida pelo respectivo
`template.css`. Isso evita duplicar marcação para cada template e mantém
qualquer novo template a um único arquivo CSS de distância.

A interface atual sempre usa o template `modern`, mas a rota já aceita um
campo opcional `template` no corpo da requisição (`"modern"`, `"minimal"`,
`"executive"` ou `"ats"`) para o dia em que um seletor for adicionado à UI.
