# backend/routes/utils.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User

utils_bp = Blueprint("utils_bp", __name__, url_prefix="/api/utils")

@utils_bp.route("/decorators/check", methods=["GET"])
@jwt_required()
def check_auth():
    """
    Simple auth check to verify valid token and return user role
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Invalid token"}), 401

    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role
    }), 200
