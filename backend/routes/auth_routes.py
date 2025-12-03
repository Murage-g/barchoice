# backend/routes/auth_routes.py
from flask import Blueprint, request, jsonify
from backend.extensions import db, bcrypt
from backend.models.user import User
from backend.utils.decorators import role_required
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from datetime import timedelta

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# --------------------
# REGISTER
# --------------------
@auth_bp.route("/register", methods=["POST"])
@role_required("admin")  # <-- only admins allowed
@jwt_required() 
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "cashier")

    if not all([username, email, password]):
        return jsonify({"msg": "All fields are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400

    new_user = User(username=username, email=email, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User registered successfully"}), 201


# --------------------
# LOGIN
# --------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"msg": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
        expires_delta=timedelta(hours=12)
    )

    return jsonify({
        "token": token,
        "user": {"id": user.id, "username": user.username, "role": user.role}
    }), 200


# --------------------
# LOGOUT
# --------------------
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # JWT is stateless, so we just instruct client to delete token
    return jsonify({"msg": "Logout successful (delete token client-side)"}), 200


# --------------------
# ROLE-BASED ROUTES
# --------------------
@auth_bp.route("/admin-data", methods=["GET"])
@role_required(["admin"])
def admin_data():
    return jsonify({"data": "Admin-only content"}), 200


@auth_bp.route("/cashier-data", methods=["GET"])
@role_required(["admin", "cashier"])
def cashier_data():
    return jsonify({"data": "Cashier or Admin content"}), 200


# --------------------
# USER PROFILE
# --------------------
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify(user.to_dict()), 200
