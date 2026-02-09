import os

class Config:
    # Get database URL from environment or fallback to local
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:openpgpwd@localhost:5432/barpos"
    )

    # Fix "postgres://" → "postgresql://"
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Only enforce SSL if we're on Render (DATABASE_URL is set)
    if "DATABASE_URL" in os.environ:
        if "sslmode" not in db_url:
            db_url = f"{db_url}?sslmode=require"

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
