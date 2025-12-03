# backend/routes/role_routes.py
from flask import Blueprint, jsonify, request
from backend.models.user import User
from backend.utils.decorators import role_required
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.extensions import db

role_bp = Blueprint("roles", __name__, url_prefix="/api")

# -------- Protected Routes --------
@role_bp.route("/dashboard/admin")
@role_required("admin")
def admin_dashboard():
    return jsonify({"message": "Welcome, Admin!"}), 200


@role_bp.route("/cashier/dashboard")
@role_required("cashier", "admin")
def cashier_dashboard():
    return jsonify({"message": "Welcome, Cashier or Admin!"}), 200


@role_bp.route("/me")
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify(user.to_dict()), 200


@role_bp.route("/admin/create-user", methods=["POST"])
@role_required("admin")
def create_user():
    data = request.get_json()

    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing username or password"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "User already exists"}), 400

    user = User(username=data["username"], role=data.get("role", "cashier"))
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201
