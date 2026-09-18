# SecureDocs

SecureDocs is a secure document management and file sharing web application that allows users to upload, organize, manage, and securely share documents through expiring and revocable links.

## Live Demo

[SecureDocs](https://securedocs-web.onrender.com)

## Features

- User registration and secure login
- JWT-based authentication
- Upload, download, and delete documents
- Create and manage folders
- Search and filter documents
- Private cloud file storage
- Secure document sharing through unique links
- Expiring share links
- Ability to revoke shared access
- User-level document isolation
- File validation and error handling

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- JWT

### Database & Storage

- PostgreSQL
- Supabase
- Supabase Storage

### Deployment

- Render

## Architecture

```text
User
  │
  ▼
React + TypeScript Frontend
  │
  │ HTTP / REST API
  ▼
FastAPI Backend
  │
  ├── JWT Authentication
  ├── Document Management
  ├── Folder Management
  └── Secure File Sharing
       │
       ├──────────────► PostgreSQL Database
       │
       └──────────────► Supabase Private Storage
````

## How Secure Sharing Works

1. The document owner creates a share link.
2. SecureDocs generates a unique sharing token.
3. The owner sets an expiration time for the link.
4. The recipient can access the document through the generated link without requiring an account.
5. The link becomes invalid after expiration or when the owner revokes access.

## Security

SecureDocs protects user documents through:

- JWT-based authentication for protected API endpoints
- User-level authorization for document operations
- Private cloud storage
- Unique tokens for shared document links
- Expiration and revocation of shared access
- Backend authorization checks before document access

## Project Structure

```text
SecureDocs/
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
```

## Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/sanianaushad/SecureDocs.git
cd SecureDocs
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows (PowerShell):**

```bash
.\venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and add your database, Supabase, and JWT environment variables.

Start the backend:

```bash
uvicorn main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

## Future Improvements

- File previews for additional document types
- User profile management
- More advanced file-sharing permissions
- Activity and access history
- Improved file-management interface

## Author

**Sania Naushad**

Computer Science and Communication Engineering

KIIT University