# 🦇 VampireBase API 🩸

Bem-vindo à **VampireBase API**! Um sistema RESTful sinistro para cadastro, gerenciamento e monitoramento de vampiros e criaturas da noite ao redor do mundo. Ideal para caçadores, arquivistas do submundo ou apenas sugadores de sangue recém-transformados procurando sua galera.

---

## 🛠 Tecnologias Utilizadas no Submundo

- **Node.js** - Magia negra em forma de JavaScript
- **JSON** - Pergaminhos digitais para armazenamento de dados
- **JWT (JSON Web Tokens)** - Amuletos de proteção para Autenticação

---

## Estrutura do Castelo (Projeto)

```text
vampire-base-api/
├── caixao/
│   ├── vampiros.json         # Registros dos sugadores de sangue
│   └── cacadores.json        # Dados dos usuários (caçadores/arquivistas)
├── sangue.js                 # Módulo de acesso aos dados vitais
├── amuleto.js                # Autenticação JWT
├── package.json              # Pactos de dependências do projeto
├── server.js                 # Ponto de entrada / O despertar
└── README.md                 # Este pergaminho
```

---

## Autenticação (Amuletos de Acesso)

### Como Funciona

- **Endpoints GET** são **PÚBLICOS** - Qualquer mortal pode espiar.
- **Endpoints POST/PUT/PATCH/DELETE** requerem um Amuleto de Acesso (Token JWT).
- Exceção: `auth/cadastro` e `auth/login` são abertos para novos mortais.

### Obtendo um Amuleto (Token)

1. Faça o pacto (Cadastro): `POST /api/v1/auth/cadastro`
2. Desperte (Login): `POST /api/v1/auth/login`

### Usando o Amuleto

Para modificar registros, inclua o header `Authorization` com sua estaca digital:

```http
Authorization: Bearer SEU_AMULETO_TOKEN_AQUI
```

### Usuários Padrão (Os Anciões)

| Email | Senha | Nome Oculto |
|-------|-------|-------------|
| dracula@vampbase.com | transilvania123 | Conde Drácula (Admin) |
| blade@vampbase.com | andarinho | Blade (Caçador) |
| bella@vampbase.com | leao_ovelha | Bella Swan |

---

## Tipos Sanguíneos Favoritos

| Sangue | Sabor |
|--------|-------|
| **O-** | Raro e requintado (O favorito dos nobres) |
| **A+** | Comum, fast-food |
| **AB-** | Exótico e picante |
| **Sintético**| Para os vampiros "vegetarianos" e modernos |

## Clãs Conhecidos

| Clã | Características |
|--------|-----------|
| **Nosferatu** | Clássicos, feios, vivem nos esgotos. |
| **Dracul** | Nobres, sedutores, donos de castelos. |
| **Cullen** | Brilham no sol, jogam beisebol, andam de Volvo. |
| **Carmilla** | Vampiras góticas originais. |

---

## Instalação (Despertando o Servidor)

### 1. Invocando o Node.js
Certifique-se de que o feitiço (Node.js) está ativo:
```bash
node -v
```

### 2. Preparando os rituais
```bash
npm install
```

### 3. Acordando do caixão (Iniciar)
```bash
npm start
```
*Ou para desenvolvimento com magia de recarga automática:*
```bash
npm run dev
```

---

## Endpoints da API

### Autenticação (Aberto aos Mortais)

| Método | Endpoint | Descrição | Autenticado? |
|--------|----------|-----------|--------------|
| POST | `/api/v1/auth/cadastro` | Registrar novo caçador/vampiro | Não |
| POST | `/api/v1/auth/login` | Login (gera o Token Amuleto) | Não |
| GET | `/api/v1/auth/me` | Ver no espelho (Dados do user) | Sim |

### Arquivos dos Vampiros - Consultas (Públicas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/vampiros` | Listar todas as criaturas da noite |
| GET | `/api/v1/vampiros/{id}` | Buscar vampiro específico |
| GET | `/api/v1/vampiros/cla/{cla}` | Filtrar pela família/clã |
| GET | `/api/v1/vampiros/fraqueza/{fraqueza}` | Buscar alvos fáceis (ex: alho, sol) |
| GET | `/api/v1/vampiros/buscar?q={termo}` | Busca em pergaminhos |

### Ações Noturnas - Cadastro e Punição (Requer Amuleto JWT)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/vampiros` | O Abraço (Criar novo vampiro) |
| PUT | `/api/v1/vampiros/{id}` | Metamorfose (Atualizar dados completos) |
| PATCH | `/api/v1/vampiros/{id}/status`| Alterar status (ex: "Acordado" para "Em Torpor") |
| DELETE | `/api/v1/vampiros/{id}` | Estaca no coração! (Deletar vampiro) |

---

## Exemplos de Uso (Feitiços Práticos)

### Login (Pegando seu Token)

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dracula@vampbase.com",
    "senha": "transilvania123"
  }'
```

### Listar Vampiros (GET - Público)

```bash
# Espiar todos
curl "http://localhost:8080/api/v1/vampiros"

# Buscar os que brilham no sol
curl "http://localhost:8080/api/v1/vampiros/cla/cullen"

# Buscar os alérgicos a alho
curl "http://localhost:8080/api/v1/vampiros/fraqueza/alho"
```

### Criar um Novo Vampiro (POST - Autenticado)

```bash
curl -X POST http://localhost:8080/api/v1/vampiros \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AMULETO_AQUI" \
  -d '{
    "nome": "Edward Cullen",
    "idade_humana": 17,
    "idade_vampirica": 122,
    "cla": "Cullen",
    "sangue_favorito": "Sintético (Animais)",
    "fraqueza": "Brilha no sol (purpurina cósmica)",
    "habilidade_especial": "Ler mentes (menos da Bella)",
    "status": "Acordado",
    "foto_perfil": "https://url-para-foto-do-robert-pattinson.jpg"
  }'
```

### Atualizar Arquivo Completo (PUT - Autenticado)

```bash
curl -X PUT http://localhost:8080/api/v1/vampiros/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AMULETO_AQUI" \
  -d '{
    "nome": "Conde Drácula",
    "idade_humana": 45,
    "idade_vampirica": 593,
    "cla": "Dracul",
    "sangue_favorito": "O-",
    "fraqueza": "Sol, Alho, Estacas, Água Benta, Boletos",
    "habilidade_especial": "Virar um morcego fofinho",
    "status": "Acordado"
  }'
```

### Atualizar Apenas o Status (PATCH - Autenticado)

Usado para atualizações rápidas, como quando um vampiro vai dormir por 100 anos.

```bash
curl -X PATCH http://localhost:8080/api/v1/vampiros/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AMULETO_AQUI" \
  -d '{
    "status": "Em Torpor (Dormindo no Caixão)"
  }'
```

### Eliminar um Vampiro (DELETE - Autenticado)

*Aviso: Use com cuidado. Não tem volta depois que viram pó.*

```bash
curl -X DELETE http://localhost:8080/api/v1/vampiros/2 \
  -H "Authorization: Bearer SEU_AMULETO_AQUI"
```

---

## Status Codes do Submundo

| Código | O que significa nas Trevas |
|--------|-----------|
| **200** | OK - Sucesso, a noite é uma criança! |
| **201** | Created - Uma nova criatura da noite foi abraçada. |
| **400** | Bad Request - Você recitou o feitiço errado. |
| **401** | Unauthorized - Pare aí, mortal! Cadê seu Amuleto JWT? |
| **403** | Forbidden - Você não tem nível de vampirismo para isso. |
| **404** | Not Found - Vampiro não encontrado (provavelmente virou pó). |
| **500** | Server Error - Um caçador invadiu nosso servidor! |

---
*Lembre-se: Fique longe do sol, evite pratos italianos muito temperados e feliz codificação! 🧛‍♂️💻*
