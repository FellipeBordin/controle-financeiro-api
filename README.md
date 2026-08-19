# 💰 FinanControl API

API REST desenvolvida para o **FinanControl**, uma aplicação de controle financeiro pessoal.

O backend é responsável pela autenticação dos usuários, gerenciamento de receitas e despesas, metas financeiras, planejamento mensal e geração de insights financeiros com inteligência artificial.

---

## 🚀 Funcionalidades

- 🔐 Cadastro e autenticação de usuários
- 🔑 Autenticação com JWT
- 🔒 Senhas protegidas com bcrypt
- 💰 Cadastro de receitas e despesas
- ✏️ Edição e exclusão de lançamentos
- 📊 Cálculo de receitas, despesas e saldo
- 🎯 Metas financeiras mensais
- 📅 Planejamento de gastos por categoria
- 🤖 Insights financeiros com OpenAI
- 🗄️ Persistência de dados com PostgreSQL e Prisma
- 🌐 API preparada para consumo Web e Mobile

---

## 🛠️ Tecnologias

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod
- JWT
- bcryptjs
- OpenAI API
- REST API
- Vercel

---

## 🧱 Estrutura do projeto

```text
src/
├── app/
│   └── api/
│       ├── ai/
│       ├── auth/
│       ├── goals/
│       ├── monthly-plan/
│       └── transactions/
│
└── lib/
    ├── auth.ts
    ├── cors.ts
    ├── get-user-from-token.ts
    ├── hash.ts
    ├── insights.ts
    ├── money.ts
    ├── month.ts
    ├── openai.ts
    └── prisma.ts
```

---

## 🔗 Principais endpoints

### Autenticação

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Transações

```text
GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

### Metas

```text
GET  /api/goals
POST /api/goals
```

### Planejamento mensal

```text
GET    /api/monthly-plan
POST   /api/monthly-plan
DELETE /api/monthly-plan
```

### Inteligência Artificial

```text
GET /api/ai/insights
```

---

## 🤖 Insights financeiros

A API utiliza a **OpenAI API** para analisar o resumo financeiro mensal do usuário e gerar um insight curto e prático com base nas receitas, despesas, saldo e categorias de gastos.

---

## ⚙️ Como executar

### Clone o repositório

```bash
git clone https://github.com/FellipeBordin/controle-financeiro-api
```

### Entre no projeto

```bash
cd controle-financeiro-api
```

### Instale as dependências

```bash
npm install
```

### Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="sua_url_do_banco"
JWT_SECRET="seu_segredo_jwt"
OPENAI_API_KEY="sua_chave_openai"
```

> Nunca envie o arquivo `.env` ou suas chaves privadas para o GitHub.

### Inicie o projeto

```bash
npm run dev
```

A API ficará disponível por padrão em:

```text
http://localhost:3000
```

---

## 🧪 Verificações

TypeScript:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

---

## 📱 Frontend

Esta API foi desenvolvida para trabalhar em conjunto com o aplicativo **FinanControl**, construído com React Native, Expo e TypeScript.

Frontend:

https://github.com/FellipeBordin/controle-financeiro-front-end

---

## 👨‍💻 Autor

**Fellipe Bordin**

Projeto desenvolvido para estudo e portfólio, aplicando conceitos de desenvolvimento Full Stack, APIs REST, autenticação, banco de dados, TypeScript e integração com inteligência artificial.

---

## 📄 Licença

Projeto desenvolvido para fins de estudo e portfólio.
