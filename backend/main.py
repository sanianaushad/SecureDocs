import os
import secrets
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from supabase import Client, create_client

from database import SessionLocal
from models import Document, Folder, Share


load_dotenv()


app = FastAPI(title="SecureDocs API", version="0.5.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://securedocs-frontend.onrender.com",
    "https://securedocs-web.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
SUPABASE_BUCKET = "documents"


if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the .env file"
    )


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


security = HTTPBearer()


MAX_FILE_SIZE = 20 * 1024 * 1024


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg"
}


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class FolderRequest(BaseModel):
    name: str


class ShareRequest(BaseModel):
    expires_in_hours: int = Field(
        default=24,
        ge=1,
        le=168
    )


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        user = db.execute(
            text("""
                SELECT id, email
                FROM users
                WHERE id = :id
            """),
            {"id": int(user_id)}
        ).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return {
            "id": user.id,
            "email": user.email
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )


@app.get("/api/health")
def health_check():
    return {"message": "SecureDocs API: ok"}


@app.get("/api/db-test")
def database_test():
    try:
        db = SessionLocal()

        result = db.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "test_result": result.scalar()
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        db.close()


@app.get("/api/users")
def get_users():
    db = SessionLocal()

    try:
        result = db.execute(
            text("""
                SELECT id, email
                FROM users
                ORDER BY id
            """)
        )

        return [
            {
                "id": row.id,
                "email": row.email
            }
            for row in result
        ]

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        db.close()


@app.post("/api/signup")
def signup(request: SignupRequest):
    db = SessionLocal()

    try:
        existing_user = db.execute(
            text("""
                SELECT id
                FROM users
                WHERE email = :email
            """),
            {"email": request.email}
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        hashed_password = pwd_context.hash(request.password)

        db.execute(
            text("""
                INSERT INTO users (email, password)
                VALUES (:email, :password)
            """),
            {
                "email": request.email,
                "password": hashed_password
            }
        )

        db.commit()

        return {
            "message": "User registered successfully"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        db.close()


@app.post("/api/login")
def login(request: LoginRequest):
    db = SessionLocal()

    try:
        user = db.execute(
            text("""
                SELECT id, email, password
                FROM users
                WHERE email = :email
            """),
            {"email": request.email}
        ).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not pwd_context.verify(
            request.password,
            user.password
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = jwt.encode(
            {
                "sub": str(user.id),
                "email": user.email
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        return {
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer"
        }

    finally:
        db.close()


@app.get("/api/me")
def get_me(
    current_user=Depends(get_current_user)
):
    return current_user


@app.post("/api/folders")
def create_folder(
    request: FolderRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder_name = request.name.strip()

    if not folder_name:
        raise HTTPException(
            status_code=400,
            detail="Folder name cannot be empty"
        )

    existing_folder = (
        db.query(Folder)
        .filter(
            Folder.owner_id == current_user["id"],
            Folder.name == folder_name
        )
        .first()
    )

    if existing_folder:
        raise HTTPException(
            status_code=400,
            detail="A folder with this name already exists"
        )

    folder = Folder(
        name=folder_name,
        owner_id=current_user["id"]
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return {
        "id": folder.id,
        "name": folder.name,
        "owner_id": folder.owner_id,
        "created_at": folder.created_at
    }


@app.get("/api/folders")
def get_folders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folders = (
        db.query(Folder)
        .filter(Folder.owner_id == current_user["id"])
        .order_by(Folder.created_at.desc())
        .all()
    )

    return [
        {
            "id": folder.id,
            "name": folder.name,
            "created_at": folder.created_at
        }
        for folder in folders
    ]


@app.delete("/api/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.owner_id == current_user["id"]
        )
        .first()
    )

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    documents = (
        db.query(Document)
        .filter(
            Document.folder_id == folder.id,
            Document.owner_id == current_user["id"]
        )
        .all()
    )

    for document in documents:
        document.folder_id = None

    db.delete(folder)
    db.commit()

    return {
        "message": "Folder deleted successfully"
    }


@app.get("/api/documents")
def get_documents(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    documents = (
        db.query(Document)
        .filter(Document.owner_id == current_user["id"])
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "id": document.id,
            "filename": document.filename,
            "mime_type": document.mime_type,
            "size_bytes": document.size_bytes,
            "folder_id": document.folder_id,
            "created_at": document.created_at
        }
        for document in documents
    ]


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    folder_id: int | None = Form(default=None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided"
        )

    original_filename = Path(file.filename).name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="File type is not supported"
        )

    if folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder_id,
                Folder.owner_id == current_user["id"]
            )
            .first()
        )

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

    stored_filename = f"{uuid.uuid4()}{extension}"
    storage_path = f"{current_user['id']}/{stored_filename}"

    total_size = 0
    file_data = bytearray()

    try:
        while True:
            chunk = await file.read(1024 * 1024)

            if not chunk:
                break

            total_size += len(chunk)

            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail="File size cannot exceed 20 MB"
                )

            file_data.extend(chunk)

        upload_options = {
            "content-type": file.content_type or "application/octet-stream",
            "cache-control": "3600",
            "upsert": "false"
        }

        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=storage_path,
            file=bytes(file_data),
            file_options=upload_options
        )

        document = Document(
            filename=original_filename,
            storage_key=storage_path,
            mime_type=file.content_type,
            size_bytes=total_size,
            owner_id=current_user["id"],
            folder_id=folder_id
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return {
            "id": document.id,
            "filename": document.filename,
            "size_bytes": document.size_bytes,
            "folder_id": document.folder_id,
            "message": "Document uploaded successfully"
        }

    except HTTPException:
        raise

    except Exception as error:
        try:
            supabase.storage.from_(SUPABASE_BUCKET).remove(
                [storage_path]
            )
        except Exception:
            pass

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(error)}"
        )

    finally:
        await file.close()


@app.get("/api/documents/{document_id}/download")
def download_document(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user["id"]
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:
        file_data = (
            supabase.storage
            .from_(SUPABASE_BUCKET)
            .download(document.storage_key)
        )

        encoded_filename = quote(
            document.filename,
            safe=""
        )

        return Response(
            content=file_data,
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{encoded_filename}"'
                )
            }
        )

    except Exception as error:
        raise HTTPException(
            status_code=404,
            detail=f"Stored file not found: {str(error)}"
        )


@app.delete("/api/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user["id"]
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:
        supabase.storage.from_(SUPABASE_BUCKET).remove(
            [document.storage_key]
        )

        db.delete(document)
        db.commit()

        return {
            "message": "Document deleted successfully"
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"File deletion failed: {str(error)}"
        )


@app.post("/api/documents/{document_id}/share")
def create_share(
    document_id: int,
    request: ShareRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user["id"]
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    token = secrets.token_urlsafe(48)

    expires_at = datetime.utcnow()

    from datetime import timedelta
    expires_at += timedelta(hours=request.expires_in_hours)

    share = Share(
        token=token,
        document_id=document.id,
        owner_id=current_user["id"],
        expires_at=expires_at,
        revoked=False
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return {
        "id": share.id,
        "document_id": document.id,
        "filename": document.filename,
        "token": share.token,
        "expires_at": share.expires_at,
        "share_url": f"/share/{share.token}"
    }


@app.get("/api/documents/{document_id}/shares")
def get_document_shares(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user["id"]
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    shares = (
        db.query(Share)
        .filter(
            Share.document_id == document.id,
            Share.owner_id == current_user["id"]
        )
        .order_by(Share.created_at.desc())
        .all()
    )

    return [
        {
            "id": share.id,
            "document_id": share.document_id,
            "filename": document.filename,
            "expires_at": share.expires_at,
            "revoked": share.revoked,
            "active": (
                not share.revoked
                and share.expires_at > datetime.utcnow()
            ),
            "share_url": f"/share/{share.token}"
        }
        for share in shares
    ]


@app.delete("/api/shares/{share_id}")
def revoke_share(
    share_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    share = (
        db.query(Share)
        .filter(
            Share.id == share_id,
            Share.owner_id == current_user["id"]
        )
        .first()
    )

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Share link not found"
        )

    share.revoked = True
    db.commit()

    return {
        "message": "Share link revoked successfully"
    }


@app.get("/share/{token}")
def access_shared_document(
    token: str,
    db: Session = Depends(get_db)
):
    share = (
        db.query(Share)
        .filter(Share.token == token)
        .first()
    )

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Share link not found"
        )

    if share.revoked:
        raise HTTPException(
            status_code=403,
            detail="This share link has been revoked"
        )

    if share.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=403,
            detail="This share link has expired"
        )

    document = (
        db.query(Document)
        .filter(Document.id == share.document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:
        file_data = (
            supabase.storage
            .from_(SUPABASE_BUCKET)
            .download(document.storage_key)
        )

        encoded_filename = quote(
            document.filename,
            safe=""
        )

        return Response(
            content=file_data,
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": (
                    f'inline; filename="{encoded_filename}"'
                )
            }
        )

    except Exception as error:
        raise HTTPException(
            status_code=404,
            detail=f"Shared file not found: {str(error)}"
        )