"""
The Hawk Hub — AI Route

Proxies natural language questions to the BI Agent service (ADK)
and returns formatted answers to the frontend.
"""

import json
import logging
import uuid

import requests
from flask import Blueprint, jsonify, request, g

from auth.middleware import require_role
from config import get_config

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__)

_config = get_config()
BI_AGENT_URL = _config.BI_AGENT_URL if hasattr(_config, "BI_AGENT_URL") else "http://localhost:8080"


@ai_bp.route("/ask", methods=["POST"])
@require_role("coach", "player", "admin")
def ask_hawk():
    """
    Forward a natural language question to the BI Agent service.

    Expects JSON: {"question": "Who had the lowest sleep this week?"}
    Returns JSON: {"answer": "...", "suggestions": [...]}
    """
    data = request.json
    if not data or not data.get("question", "").strip():
        return jsonify({"answer": "Please ask a question.", "suggestions": []}), 400

    question = data["question"].strip()
    user_id = getattr(g, "user_email", "anonymous")
    session_id = data.get("session_id")

    try:
        # Create a session if one wasn't provided
        if not session_id:
            session_resp = requests.post(
                f"{BI_AGENT_URL}/apps/hfc_bi_agent/users/{user_id}/sessions",
                json={},
                timeout=10,
            )
            session_resp.raise_for_status()
            session_id = session_resp.json()["id"]

        # Call ADK agent's SSE endpoint
        resp = requests.post(
            f"{BI_AGENT_URL}/run_sse",
            json={
                "app_name": "hfc_bi_agent",
                "user_id": user_id,
                "session_id": session_id,
                "new_message": {
                    "role": "user",
                    "parts": [{"text": question}],
                },
            },
            timeout=90,
            stream=True,
        )
        resp.raise_for_status()

        # Parse SSE stream for the final agent response
        answer = _parse_sse_response(resp)

        if not answer:
            answer = (
                "I had trouble processing that question. "
                "Could you try rephrasing it?"
            )

        # Extract chart spec and suggestions from the answer text
        answer, chart = _extract_chart(answer)
        answer, suggestions = _extract_suggestions(answer)

        return jsonify({"answer": answer, "suggestions": suggestions, "chart": chart})

    except requests.Timeout:
        logger.warning("BI Agent timeout for question: %s", question)
        return jsonify({
            "answer": (
                "That query is taking longer than expected. "
                "Try narrowing your question to a specific date range or player."
            ),
            "suggestions": [
                "Who had the lowest sleep today?",
                "How many active injuries do we have?",
                "Top 5 players by disposals?",
            ],
        })
    except requests.ConnectionError:
        logger.error("BI Agent service unreachable at %s", BI_AGENT_URL)
        return jsonify({
            "answer": (
                "The analytics engine is currently starting up. "
                "Please try again in a moment."
            ),
            "suggestions": [],
        }), 503
    except Exception as e:
        logger.error("BI Agent error: %s", e, exc_info=True)
        return jsonify({
            "answer": (
                "Something went wrong while analysing your question. "
                "Please try again."
            ),
            "suggestions": [],
        }), 500


def _parse_sse_response(resp) -> str:
    """
    Parse Server-Sent Events stream from the ADK agent.
    Returns the text content of the final response event.
    """
    last_text = ""

    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue

        data_str = line[6:]  # Strip "data: " prefix
        try:
            event = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        # ADK SSE events have content.parts[].text for agent responses
        content = event.get("content", {})
        parts = content.get("parts", [])
        for part in parts:
            text = part.get("text", "")
            if text:
                last_text = text

    return last_text


def _extract_chart(answer: str) -> tuple[str, dict | None]:
    """
    Extract a Vega-Lite chart spec from the agent's response.
    The agent wraps it in ```vega-lite ... ``` fenced code blocks.
    Returns (cleaned_answer, chart_spec_or_None).
    """
    import re

    pattern = r"```vega-lite\s*\n?(.*?)\n?```"
    match = re.search(pattern, answer, re.DOTALL)

    if not match:
        return answer, None

    spec_str = match.group(1).strip()
    # Remove the chart block from the answer text
    cleaned = answer[:match.start()].rstrip() + answer[match.end():]

    try:
        chart = json.loads(spec_str)
        return cleaned, chart
    except json.JSONDecodeError:
        logger.warning("Failed to parse Vega-Lite spec from agent response")
        return cleaned, None


def _extract_suggestions(answer: str) -> tuple[str, list[str]]:
    """
    Extract follow-up question suggestions from the agent's response
    and remove them from the answer text.
    Returns (cleaned_answer, suggestions).
    """
    suggestions = []
    cleaned_lines = []
    in_suggestions = False

    lines = answer.split("\n")
    for line in lines:
        lower = line.strip().lower()
        # Detect the "you might also want to ask" header
        if "might also want to ask" in lower or "follow-up" in lower:
            in_suggestions = True
            continue

        if in_suggestions:
            stripped = line.strip().lstrip("- ").lstrip("* ").strip()
            if stripped.endswith("?") and len(stripped) > 10:
                suggestions.append(stripped)
                continue
            elif stripped == "":
                continue
            else:
                # Non-suggestion line after the header — stop
                in_suggestions = False
                cleaned_lines.append(line)
        else:
            cleaned_lines.append(line)

    cleaned = "\n".join(cleaned_lines).rstrip()

    # Fallback defaults
    if not suggestions:
        suggestions = [
            "Who had the lowest sleep this week?",
            "Show me all active injuries",
            "Top 5 players by coach rating?",
        ]

    return cleaned, suggestions[:5]
