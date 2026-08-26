# Sistema de Controle de Mesas - Frontend

Frontend do sistema de gerenciamento de restaurante/lanchonete desenvolvido com Next.js, TypeScript, Tailwind CSS e Shadcn/ui.

## Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes UI
- **React Hooks** - Gerenciamento de estado

## Funcionalidades

- **Dashboard**: Visualização do status de todas as mesas em tempo real
- **Gestão de Mesas**: Abrir e fechar mesas com informações do cliente
- **Gestão de Pedidos**: Adicionar, remover e modificar itens do pedido
- **Totalização em Tempo Real**: Cálculo automático do total do pedido
- **Fechamento de Pedido**: Seleção de forma de pagamento (Dinheiro, Pix, Cartão de Débito/Crédito)

## Estrutura do Projeto

```
restaurante-frontend/
├── src/
│   ├── app/              # Páginas da aplicação
│   │   ├── page.tsx      # Dashboard
│   │   └── orders/       # Páginas de pedidos
│   ├── components/       # Componentes reutilizáveis
│   │   └── ui/          # Componentes Shadcn/ui
│   ├── lib/             # Utilitários
│   │   ├── api.ts       # Cliente API
│   │   └── utils.ts     # Funções auxiliares
│   └── types/           # Definições de tipos TypeScript
└── public/              # Arquivos estáticos
```

## Configuração

### Pré-requisitos

- Node.js 18+
- npm, yarn, pnpm ou bun

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=https://localhost:5001/api
```

### Execução

1. Instalar dependências:
```bash
npm install
```

2. Executar o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## Uso

### Dashboard

- Visualiza todas as mesas do restaurante
- Mostra status (Livre, Ocupada, Fechando Conta)
- Exibe cliente, total e tempo aberto para mesas ocupadas
- Botão para abrir mesa (mesas livres)
- Botão para gerenciar pedido (mesas ocupadas)

### Gestão de Pedidos

- Adicionar produtos ao pedido
- Modificar quantidade de itens
- Adicionar observações aos itens
- Remover itens do pedido
- Visualizar total em tempo real
- Fechar pedido com seleção de forma de pagamento

## Integração com Backend

O frontend se comunica com a API backend através do cliente API configurado em `src/lib/api.ts`. Certifique-se de que o backend esteja rodando antes de iniciar o frontend.

## Build para Produção

```bash
npm run build
npm start
```

## Deploy

A aplicação pode ser facilmente implantada em plataformas como:
- Vercel (recomendado)
- Netlify
- AWS Amplify
- Qualquer plataforma que suporte Next.js
