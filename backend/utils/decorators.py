# backend/utils/decorators.py
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import jsonify
from backend.models.user import User

def role_required(*roles):
    """
    Restricts route access to specified roles.
    Usage: @role_required("admin"), @role_required("cashier", "admin"), etc.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            if user and user.role in roles:
                return fn(*args, **kwargs)
            return jsonify({"error": "Access denied"}), 403
        return wrapper
    return decorator
