# alembic/env.py
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
import logging
from backend.config import Config

# Import your Flask app factory and db
from backend import app as flask_app
from backend.extensions import db
from backend import models  # ensure all models are imported

# Alembic config and logging
config = context.config
fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")

# Target metadata for autogenerate
target_metadata = db.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = Config.SQLALCHEMY_DATABASE_URI
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    # Use Flask app context
    flask_app_instance = flask_app.create_app()
    with flask_app_instance.app_context():
        # Create connectable from Flask-SQLAlchemy db engine
        connectable = db.engine
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
            )
            with context.begin_transaction():
                context.run_migrations()

# Run the correct mode
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()