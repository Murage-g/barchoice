import os

class Config:
    db_url = os.getenv("DATABASE_URL")

    # Render always provides postgres:// — convert to postgresql:// for SQLAlchemy
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Enforce SSL ONLY for Render
    if db_url and "render.com" in db_url and "sslmode" not in db_url:
        db_url = f"{db_url}?sslmode=require"

    SQLALCHEMY_DATABASE_URI = db_url or \
        "postgresql://postgres:openpgpwd@localhost:5432/barpos"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
