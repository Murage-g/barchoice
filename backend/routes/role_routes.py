# backend/routes/role_routes.py
from flask import Blueprint, jsonify, request
from ..models.user import User
from ..utils.decorators import role_required
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db

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
    data = request.get_json() or {}

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "cashier")

    # Validate required fields
    if not username or not password or not email:
        return jsonify({"error": "Missing username, email, or password"}), 400

    # Check duplicates
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    # Create user
    user = User(username=username, email=email, role=role)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201

