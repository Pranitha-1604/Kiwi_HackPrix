# KIWI - Knowledge Interface With Interactions

KIWI is a backend API for multi-user, multi-branch LLM conversations with a to-do system, Notion-style blocks, and a shared memory zone.

## Tech Stack

- **Node.js + Express**: Backend API framework
- **Supabase (PostgreSQL)**: Database
- **LLM Integration**: OpenAI and Google Gemini API

## Features

- Multi-user, multi-branch conversations
- LLM integration with OpenAI and Google Gemini
- To-do system
- Notion-style blocks (text, code, image, heading, etc.)
- Shared memory zone
- Branch forking and merging

## Project Structure

```
kiwi-backend/
├── routes/
│   ├── messages.js - Conversation and branching endpoints
│   ├── todos.js - To-do system endpoints
│   ├── blocks.js - Notion-like blocks endpoints
│   ├── memory.js - Shared memory endpoints
│   └── llm.js - LLM integration endpoints
├── services/
│   ├── openaiService.js - OpenAI API integration
│   ├── geminiService.js - Google Gemini API integration
├── supabase/
│   └── client.js - Supabase client configuration
├── .env - Environment variables
├── schema.sql - Database schema
├── index.js - Main application entry point
└── package.json - Project dependencies
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- OpenAI API key
- Google Gemini API key

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd kiwi-backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Copy the `.env.example` file to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your Supabase URL, Supabase key, OpenAI API key, and Gemini API key.

4. Set up the database

Create a new Supabase project and run the SQL commands in `schema.sql` to set up the database schema.

5. Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Conversations & Branching

- `POST /message` - Add a message to a branch (LLM or user)
- `GET /conversation/:branchId` - Fetch full conversation
- `POST /fork` - Create a new branch from an existing one
- `POST /merge` - Merge two branches into a new one
- `GET /branches/:userId` - List all user branches

### LLM Handling

- `POST /llm` - Send messages to LLM (OpenAI or Gemini)

### To-Do System

- `POST /todo` - Add a to-do item to a branch
- `GET /todo/:branchId` - List all todos in a branch
- `PATCH /todo/:id` - Toggle complete/incomplete
- `DELETE /todo/:id` - Remove to-do

### Notion-Like Blocks

- `POST /block` - Add block (text/code/image/heading)
- `GET /block/:branchId` - Get all blocks for a branch
- `PATCH /block/:id` - Update a block
- `DELETE /block/:id` - Delete a block
- `PATCH /block/reorder` - Reorder blocks

### Shared Memory

- `POST /memory` - Add a memory item (quote, link, insight)
- `GET /memory/:branchId` - Get all memory items
- `PATCH /memory/:id` - Update a memory item
- `DELETE /memory/:id` - Delete a memory item
- `GET /memory/search/:query` - Search memory items

### Misc

- `POST /pin` - Pin a message
- `POST /bookmark` - Bookmark a reply for future fork
- `GET /insights/:branchId` - AI-generated branch summary

## Testing

You can test the API endpoints using the provided test scripts, Postman collection, or with cURL commands.

### Automated Tests

The project includes automated test scripts to verify all API endpoints:

```bash
# Run all tests (starts server, runs Node.js, cURL, and fetch tests)
npm run run-tests

# Run only Node.js tests (server must be running)
npm run test-api

# Run only cURL tests (server must be running)
npm run test-api-curl

# Run only fetch tests (server must be running)
npm run test-api-fetch
```

### Testing with cURL

#### Create a new branch with a message

```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-1","content":"Hello, KIWI!","role":"user","userId":"user-1"}'
```

#### Get conversation for a branch

```bash
curl -X GET http://localhost:3000/api/conversation/branch-1
```

#### Send a message to LLM

```bash
curl -X POST http://localhost:3000/api/llm \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello, AI!"}],"llmType":"openai","branchId":"branch-1"}'
```

#### Add a to-do item

```bash
curl -X POST http://localhost:3000/api/todo \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-1","content":"Implement KIWI backend","userId":"user-1","priority":"high"}'
```

#### Add a block

```bash
curl -X POST http://localhost:3000/api/block \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-1","type":"text","content":"This is a text block","userId":"user-1"}'
```

#### Add a memory item

```bash
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-1","type":"quote","content":"Knowledge is power","source":"Francis Bacon","userId":"user-1"}'
```

### Testing with Postman

Import the `KIWI_API_Postman_Collection.json` file into Postman to test all endpoints.

## License

ISC