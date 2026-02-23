from backend.app import create_app
from backend.extensions import db

app = create_app()
app.app_context().push()

target_metadata = db.metadata