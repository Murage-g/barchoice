# backend/routes/admin.py
from flask import Blueprint, jsonify, request
from ..extensions import db
from ..models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..utils.decorators import role_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# ------------------------------
# Get all users
# ------------------------------
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_users():
    users = User.query.all()
    return jsonify([
        {"id": u.id, "username": u.username, "email": u.email, "role": u.role}
        for u in users
    ]), 200


# ------------------------------
# Delete a user
# ------------------------------
@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if int(user_id) == int(current_user_id):
        return jsonify({"msg": "You cannot delete your own account"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": f"User '{user.username}' deleted"}), 200


# ------------------------------
# Update user role (upgrade/demote)
# ------------------------------
@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_user_role(user_id):
    data = request.get_json()
    new_role = data.get("role")

    if new_role not in ["admin", "cashier"]:
        return jsonify({"msg": "Invalid role"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    user.role = new_role
    db.session.commit()

    return jsonify({"msg": f"User '{user.username}' role updated to '{new_role}'"}), 200