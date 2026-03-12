import json
import re
import logging
from typing import Dict, Any

from google.genai import types as genai_types

from services.question_generator import _get_gemini_client, _GEMINI_MODELS

logger = logging.getLogger(__name__)


def evaluate_student_answer(question: str, correct_answer: str, student_answer: str) -> Dict[str, Any]:
    """
    Evaluates a student's open-ended answer using Gemini.
    Returns: {"is_correct": bool, "feedback": str}
    """
    client = _get_gemini_client()

    # If no Gemini API key or it fails to initialize, fallback to naive check
    if not client:
        is_val = len(student_answer.strip()) > 10
        return {
            "is_correct": is_val,
            "feedback": "AI evaluation unavailable. Answer accepted." if is_val else "Answer too short or invalid."
        }

    # Truncate very long texts to avoid exceeding model input limits
    q_text      = question[:1000]
    model_ans   = correct_answer[:3000]   # long_answer model answers can be ~500 chars
    student_ans = student_answer[:2000]

    prompt = f"""You are an expert academic tutor grading a student's written answer.

QUESTION: {q_text}

MODEL ANSWER (for reference only — student does NOT need to match word-for-word):
{model_ans}

STUDENT'S ANSWER:
{student_ans}

GRADING RULES:
1. Focus on SEMANTIC correctness — does the student demonstrate understanding of the core concept?
2. Partial credit: if the student covers the main idea but misses secondary details, mark is_correct = true with constructive feedback.
3. Mark is_correct = false only if: the answer is fundamentally wrong, irrelevant, too short to judge, or contradicts the concept.
4. Feedback must be 1-2 sentences: encouraging, specific, and mention what was correct or what was missing.
5. NEVER give is_correct = false just because wording differs from the model answer.

Respond with ONLY valid JSON (no markdown, no explanation):
{{"is_correct": true, "feedback": "Your feedback here."}}"""

    for model_name in _GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.15,
                    max_output_tokens=600,   # enough for JSON + 2-sentence feedback
                ),
            )
            raw = response.text.strip()

            # Strip markdown fences
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            raw = raw.strip()

            # Try direct parse first
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                # Attempt to extract JSON object with regex fallback
                match = re.search(r'\{[^{}]*"is_correct"\s*:\s*(true|false)[^{}]*\}', raw, re.DOTALL)
                if match:
                    result = json.loads(match.group(0))
                else:
                    logger.warning(f"JSON parse failed for model {model_name}, raw: {raw[:200]}")
                    continue

            return {
                "is_correct": bool(result.get("is_correct", False)),
                "feedback": str(result.get("feedback", "No feedback provided."))
            }
        except Exception as e:
            logger.warning(f"Evaluation failed with {model_name}: {e}")
            continue

    # All models failed — generous fallback
    is_val = len(student_answer.strip()) > 20
    return {
        "is_correct": is_val,
        "feedback": "AI grading unavailable. Your answer has been reviewed and tentatively accepted." if is_val else "Your answer appears too short. Please try again with more detail."
    }
