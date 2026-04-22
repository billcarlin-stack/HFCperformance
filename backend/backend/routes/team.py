"""
Team Builder — Version-based routes.

Versions live in saved_squads. Each round has multiple versions,
one of which is the active draft. Drag-and-drop auto-saves to
the active version's data column.
"""

import logging
from flask import Blueprint, jsonify, request
from models.team import (
    get_versions_for_round,
    get_version,
    create_version,
    set_active_version,
    update_version_data,
    rename_version,
    duplicate_version,
    copy_version_to_round,
    delete_version,
)

logger = logging.getLogger(__name__)
team_bp = Blueprint("team", __name__)


@team_bp.route("/versions", methods=["GET"])
def list_versions():
    """GET /api/team/versions?round_id=6"""
    round_id = request.args.get("round_id", type=int)
    if round_id is None:
        return jsonify({"error": "round_id query parameter is required"}), 400
    try:
        versions = get_versions_for_round(round_id)
        return jsonify(versions), 200
    except Exception as e:
        logger.error(f"Error listing versions: {e}")
        return jsonify({"error": "Failed to list versions"}), 500


@team_bp.route("/versions", methods=["POST"])
def create_new_version():
    """POST /api/team/versions — create a new version for a round."""
    data = request.json
    round_id = data.get("round_id")
    if round_id is None:
        return jsonify({"error": "round_id is required"}), 400
    name = data.get("name", "New Version")
    initial_data = data.get("data", "[]")

    try:
        version = create_version(round_id, name, initial_data)
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        return jsonify({"error": "Failed to create version"}), 500


@team_bp.route("/versions/<int:version_id>", methods=["GET"])
def get_single_version(version_id):
    """GET /api/team/versions/:id"""
    try:
        version = get_version(version_id)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error getting version: {e}")
        return jsonify({"error": "Failed to get version"}), 500


@team_bp.route("/versions/<int:version_id>/activate", methods=["POST"])
def activate_version(version_id):
    """POST /api/team/versions/:id/activate — set as active draft."""
    try:
        version = set_active_version(version_id)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error activating version: {e}")
        return jsonify({"error": "Failed to activate version"}), 500


@team_bp.route("/versions/<int:version_id>/data", methods=["PUT"])
def save_version_data(version_id):
    """PUT /api/team/versions/:id/data — auto-save field state."""
    data = request.json
    field_data = data.get("data", "[]")

    try:
        success = update_version_data(version_id, field_data)
        if not success:
            return jsonify({"error": "Version not found"}), 404
        return jsonify({"status": "saved"}), 200
    except Exception as e:
        logger.error(f"Error saving version data: {e}")
        return jsonify({"error": "Failed to save"}), 500


@team_bp.route("/versions/<int:version_id>/rename", methods=["PUT"])
def rename_version_route(version_id):
    """PUT /api/team/versions/:id/rename"""
    data = request.json
    name = data.get("name", "")
    if not name.strip():
        return jsonify({"error": "Name is required"}), 400

    try:
        version = rename_version(version_id, name.strip())
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error renaming version: {e}")
        return jsonify({"error": "Failed to rename"}), 500


@team_bp.route("/versions/<int:version_id>/duplicate", methods=["POST"])
def duplicate_version_route(version_id):
    """POST /api/team/versions/:id/duplicate"""
    data = request.json or {}
    new_name = data.get("name")

    try:
        version = duplicate_version(version_id, new_name)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error duplicating version: {e}")
        return jsonify({"error": "Failed to duplicate"}), 500


@team_bp.route("/versions/<int:version_id>/copy-to-round", methods=["POST"])
def copy_to_round_route(version_id):
    """POST /api/team/versions/:id/copy-to-round"""
    data = request.json
    target_round_id = data.get("target_round_id")
    new_name = data.get("name")

    if target_round_id is None:
        return jsonify({"error": "target_round_id is required"}), 400

    try:
        version = copy_version_to_round(version_id, target_round_id, new_name)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error copying version: {e}")
        return jsonify({"error": "Failed to copy"}), 500


@team_bp.route("/versions/<int:version_id>", methods=["DELETE"])
def delete_version_route(version_id):
    """DELETE /api/team/versions/:id"""
    try:
        success = delete_version(version_id)
        if not success:
            return jsonify({"error": "Version not found"}), 404
        return jsonify({"status": "deleted"}), 200
    except Exception as e:
        logger.error(f"Error deleting version: {e}")
        return jsonify({"error": "Failed to delete"}), 500
