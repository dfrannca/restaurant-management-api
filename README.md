# Sistema de Controle de Mesas e Pedidos - Backend

Sistema de gerenciamento de restaurante/lanchonete desenvolvido com .NET 10, seguindo os princípios de Clean Architecture.

## Tecnologias

- **C# / .NET 10**
- **ASP.NET Core Web API**
- **Entity Framework Core**
- **SQLite (desenvolvimento) / PostgreSQL (produção)**
- **FluentValidation**
- **Swagger/OpenAPI**

## Arquitetura

O projeto segue a arquitetura em camadas (Clean Architecture):

- **Domain**: Entidades, enums e interfaces de repositório
- **Application**: DTOs, validadores, serviços e lógica de negócio
- **Infrastructure**: Implementação de repositórios, DbContext e configuração do EF Core
- **API**: Controllers, configuração da aplicação e middleware

## Estrutura do Projeto

```
Restaurante.sln
├── Restaurante.Domain/          # Camada de Domínio
├── Restaurante.Application/     # Camada de Aplicação
├── Restaurante.Infrastructure/ # Camada de Infraestrutura
└── Restaurante.API/             # Camada de API
```

## Configuração

### Pré-requisitos

- .NET 10 SDK
- SQLite

### Execução

1. Restaurar dependências:
```bash
dotnet restore
```

2. Criar e aplicar migrations:
```bash
dotnet ef migrations add InitialCreate --project Restaurante.Infrastructure --startup-project Restaurante.API
dotnet ef database update --project Restaurante.Infrastructure --startup-project Restaurante.API
```

3. Executar a API:
```bash
dotnet run --project Restaurante.API
```

A API estará disponível em `https://localhost:5001`

### Swagger

A documentação da API está disponível em:
- Development: `https://localhost:5001/swagger`

## Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login de usuário

### Usuários
- `GET /api/users` - Listar todos os usuários
- `GET /api/users/{id}` - Obter usuário por ID
- `POST /api/users` - Criar novo usuário
- `PUT /api/users/{id}` - Atualizar usuário
- `DELETE /api/users/{id}` - Deletar usuário

### Categorias
- `GET /api/categories` - Listar todas as categorias
- `GET /api/categories/{id}` - Obter categoria por ID
- `POST /api/categories` - Criar nova categoria
- `PUT /api/categories/{id}` - Atualizar categoria
- `DELETE /api/categories/{id}` - Deletar categoria

### Produtos
- `GET /api/products` - Listar todos os produtos
- `GET /api/products/{id}` - Obter produto por ID
- `GET /api/products/category/{categoryId}` - Listar produtos por categoria
- `GET /api/products/active` - Listar produtos ativos
- `POST /api/products` - Criar novo produto
- `PUT /api/products/{id}` - Atualizar produto
- `DELETE /api/products/{id}` - Deletar produto

### Mesas
- `GET /api/tables` - Listar todas as mesas
- `GET /api/tables/{id}` - Obter mesa por ID
- `POST /api/tables` - Criar nova mesa
- `PUT /api/tables/{id}` - Atualizar mesa
- `DELETE /api/tables/{id}` - Deletar mesa
- `POST /api/tables/{id}/open` - Abrir mesa
- `POST /api/tables/{id}/close` - Fechar mesa

### Pedidos
- `GET /api/orders` - Listar todos os pedidos
- `GET /api/orders/{id}` - Obter pedido por ID
- `GET /api/orders/closed` - Listar pedidos fechados
- `GET /api/orders/table/{tableId}` - Obter pedido ativo da mesa
- `POST /api/orders` - Criar novo pedido
- `POST /api/orders/{orderId}/items` - Adicionar item ao pedido
- `PUT /api/orders/{orderId}/items/{itemId}` - Atualizar item do pedido
- `DELETE /api/orders/{orderId}/items/{itemId}` - Remover item do pedido
- `POST /api/orders/{id}/close` - Fechar pedido

### Caixa
- `GET /api/cashregister/open` - Obter caixa aberto
- `POST /api/cashregister/open` - Abrir caixa
- `POST /api/cashregister/close` - Fechar caixa

### Fechamento de Caixa
- `GET /api/cashclosing` - Listar todos os fechamentos
- `GET /api/cashclosing/{id}` - Obter fechamento por ID
- `GET /api/cashclosing/range` - Listar fechamentos por período

## Banco de Dados

O sistema utiliza SQLite com o arquivo `pedidos.db` criado automaticamente na pasta do projeto API.

### Entidades

- **User**: Usuários do sistema
- **Category**: Categorias de produtos
- **Product**: Produtos do cardápio
- **Table**: Mesas do restaurante
- **Order**: Pedidos
- **OrderItem**: Itens dos pedidos
- **CashRegister**: Caixas
- **CashClosing**: Fechamentos de caixa

## Validação

Todos os DTOs são validados usando FluentValidation, garantindo integridade dos dados.

## CORS

A API está configurada para aceitar requisições de qualquer origem (configuração para desenvolvimento).

## Deploy

### API no Render

Use a raiz do repositório como contexto Docker. O arquivo `Dockerfile` já publica a API e expõe a porta `10000`.

Configure estas variáveis de ambiente no serviço:

```text
ConnectionStrings__DefaultConnection=<connection string do PostgreSQL>
Jwt__Secret=<uma chave longa e aleatória>
Cors__AllowedOrigin=https://<seu-projeto>.vercel.app
ASPNETCORE_ENVIRONMENT=Production
```

Em produção, a API aplica as migrations do PostgreSQL automaticamente na inicialização. O SQLite continua disponível para desenvolvimento local.

### Frontend na Vercel

Configure o diretório raiz do projeto como `restaurante-frontend` e defina:

```text
NEXT_PUBLIC_API_URL=https://<sua-api>.onrender.com/api
```

O comando de build é `npm run build` e o comando de produção é `npm start`.
