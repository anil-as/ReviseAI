import json
import logging
from typing import Dict, Any

from google import genai
from google.genai import types as genai_types

# Reusing the initialized client from question_generator if possible, 
# but for simplicity we can just rely on the same lazy init logic.
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
        is_val = len(student_answer.strip()) > 5  # Naive fallback
        return {
            "is_correct": is_val,
            "feedback": "AI evaluation unavailable. Answer accepted." if is_val else "Answer too short or invalid."
        }

    prompt = f"""You are an expert academic tutor grading a student's answer.
    
QUESTION: {question}
MODEL ANSWER: {correct_answer}
STUDENT ANSWER: {student_answer}

EVALUATION RULES:
1. Determine if the student's answer is semantically correct and captures the core meaning of the model answer.
2. The student doesn't need to use the exact words, focus on understanding.
3. If they give a partial answer that misses a critical component, or if it contains factual errors, mark it as incorrect.
4. Provide a brief, encouraging 1-2 sentence feedback explaining why it's correct/incorrect.

Output MUST be exactly valid JSON, no markdown fences:
{{
  "is_correct": true/false,
  "feedback": "Your brief feedback here..."
}}
"""

    for model_name in _GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.2, # Low temperature for more deterministic grading
                    max_output_tokens=200,
                ),
            )
            raw = response.text.strip()
            # Strip markdown fences just in case
            if raw.startswith("```json"): raw = raw[7:]
            elif raw.startswith("```"): raw = raw[3:]
            if raw.endswith("```"): raw = raw[:-3]
            raw = raw.strip()
            
            result = json.loads(raw)
            return {
                "is_correct": bool(result.get("is_correct", False)),
                "feedback": result.get("feedback", "No feedback provided.")
            }
        except Exception as e:
            logger.warning(f"Failed to evaluate answer with {model_name}: {e}")
            continue
            
    # Ultimate fallback if API quota exhausted
    return {
        "is_correct": True,
        "feedback": "Unable to grade automatically due to system limitations. Marked as correct."
    }
