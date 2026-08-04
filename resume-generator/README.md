# Resume Generator

Este documento descreve apenas como executar, testar, manter e realizar o deploy da aplicação.

---

# Requisitos

Antes de iniciar, certifique-se de possuir instalado:

- Node.js 20+
- npm
- Git

---

# Instalação

Clone o projeto.

```bash
git clone <repositorio>
```

Entre na pasta.

```bash
cd resume-generator
```

Instale as dependências.

```bash
npm install
```

---

# Executando localmente

Modo de desenvolvimento (simula o ambiente Serverless do Vercel, incluindo
as funções em `/api` e os arquivos estáticos de `public/`):

```bash
npm run dev
```

Este projeto não possui mais um servidor Node persistente (Express foi
removido) — não existe `npm start`. Para publicar, veja a seção **Deploy**.

---

# Estrutura do projeto

```
api/
    generate-pdf.ts  (Serverless Function — substitui o antigo routes/)

src/
  server/
    parser/
    templates/
    pdf/
    services/
    utils/

public/
```

Cada diretório possui apenas uma responsabilidade.

Nunca misture responsabilidades entre parser, templates e geração de PDF.

---

# Fluxo da aplicação

1. O usuário cola o currículo gerado por uma IA.
2. O parser identifica automaticamente as seções.
3. Os dados são transformados em um modelo interno.
4. O template gera o HTML.
5. O Puppeteer converte o HTML em PDF.
6. O navegador realiza o download automaticamente.

---

# Manutenção

Sempre que alterar qualquer parte do projeto execute os testes abaixo antes de realizar um commit.

## Instalar dependências

```bash
npm install
```

---

## Executar testes

```bash
npm test
```

Todos os testes devem finalizar com sucesso.

---

## Executar o lint

```bash
npm run lint
```

Não deve existir nenhum erro.

---

## Corrigir formatação automaticamente

```bash
npm run format
```

---

## Verificar tipos do TypeScript

```bash
npx tsc --noEmit
```

Não deve existir nenhum erro de tipagem.

---

## Gerar a versão de produção

```bash
npm run build
```

A compilação deve finalizar sem erros.

---

## Testar localmente

Após todas as verificações:

```bash
npm run dev
```

Realize testes manuais.

Verifique:

- geração do PDF;
- parser;
- layout;
- quebra de páginas;
- templates;
- download do arquivo.

---

# Fluxo recomendado após qualquer alteração

Execute sempre nesta ordem.

```bash
npm install

npm run lint

npm run format

npm test

npx tsc --noEmit

npm run build

npm run dev
```

Somente após todas essas etapas considere a alteração concluída.

---

# Deploy

O projeto é publicado no Vercel como Serverless Functions (não há mais um
processo Node persistente para hospedar).

1. Faça `git push` para o repositório conectado ao Vercel.
2. O Vercel detecta `api/generate-pdf.ts` automaticamente e publica os
   arquivos estáticos de `public/` (configurado em `vercel.json`).
3. Abra a aplicação publicada.
4. Cole um currículo.
5. Clique em **Gerar PDF**.
6. Confirme que o download do PDF ocorre corretamente.
7. Valide visualmente o documento gerado.

Sempre realize um teste completo após cada novo deploy.

---

# Boas práticas

Ao modificar o parser:

- execute toda a suíte de testes;
- valide currículos em português e inglês;
- valide currículos com seções ausentes;
- valide textos longos.

Ao modificar templates:

- confira alinhamentos;
- confira quebras de página;
- confira espaçamentos;
- confira impressão em PDF.

Ao modificar a geração do PDF:

- valide diferentes navegadores;
- confira margens;
- confira qualidade da impressão;
- confira fontes.

---

# Não modificar sem necessidade

Evite alterar:

- arquitetura do parser;
- pipeline de geração;
- estrutura do modelo interno;
- templates existentes.

Qualquer alteração estrutural deve preservar a separação de responsabilidades do projeto.

---

# Objetivo da aplicação

A aplicação possui um único objetivo:

Receber um currículo em texto gerado por uma IA e convertê-lo automaticamente em um PDF profissional.

Qualquer nova funcionalidade deve respeitar esse princípio e não aumentar desnecessariamente a complexidade do projeto.
