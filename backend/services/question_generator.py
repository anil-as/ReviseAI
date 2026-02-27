"""
AI-Powered Contextual Question Generator  (v2)
================================================
Improvements over v1:
  • Front-matter / ToC stripping so questions come from actual content.
  • Topic TITLE fed into domain detection for stronger signal.
  • 8 rich question types per domain:
      mcq | true_false | fill_blank | short_answer |
      figure_explain | code_question | application | cunning
  • Prompt engineering forces specificity – no "What is the main idea?" style.
  • Generates 12 questions (caller may trim) for better variety.
  • NLTK fallback still works when Gemini is unavailable.
"""

import os
import re
import json
import random
import logging
from typing import Optional
from datetime import datetime

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

# Load .env here directly — safeguards against import-order issues
load_dotenv()

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Gemini — lazy initialisation (runs on first request, not at import time)
# ─────────────────────────────────────────────────────────────────────────────

_GEMINI_CLIENT: Optional[genai.Client] = None
_GEMINI_READY  = False
# Ordered fallback chain — tries each model until one succeeds
_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
]


def _get_gemini_client() -> Optional[genai.Client]:
    """Return a live Gemini client, initialising on first call."""
    global _GEMINI_CLIENT, _GEMINI_READY
    if _GEMINI_READY and _GEMINI_CLIENT is not None:
        return _GEMINI_CLIENT

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — will use NLTK fallback")
        return None

    try:
        _GEMINI_CLIENT = genai.Client(api_key=api_key)
        _GEMINI_READY  = True
        logger.info("Gemini client initialised successfully")
        return _GEMINI_CLIENT
    except Exception as e:
        logger.error(f"Gemini client init failed: {e}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# Front-Matter / ToC Stripping
# ─────────────────────────────────────────────────────────────────────────────

# Patterns that typically signal non-content sections at the START of a PDF
_FRONTMATTER_HEADERS = re.compile(
    r"^(table of contents|contents|preface|foreword|acknowledgements?|"
    r"copyright|all rights reserved|published by|isbn|edition|dedication|"
    r"about (the )?author|introduction(?!\s+to\s+\w)|index|glossary|"
    r"bibliography|references|appendix)[^\n]*$",
    re.IGNORECASE | re.MULTILINE,
)

_CHAPTER_START = re.compile(
    r"^(chapter\s+\d+|unit\s+\d+|module\s+\d+|section\s+\d+|lesson\s+\d+|"
    r"part\s+\d+|\d+\.\s+\w)",
    re.IGNORECASE | re.MULTILINE,
)

_TOC_ENTRY = re.compile(r"^.{3,60}\.{3,}\s*\d{1,4}\s*$", re.MULTILINE)


def _strip_front_matter(text: str) -> str:
    """
    Remove table of contents, copyright pages, and other front-matter.
    Strategy:
      1. Remove lines that are classic TOC entries (title … page-number).
      2. Skip content before the first real chapter/unit heading.
      3. Also drop anything after 'Index', 'Bibliography', 'References'
         sections that appear NEAR THE END.
    """
    # Strip TOC entries (lines like "2.3  Process Scheduling ............. 47")
    text = _TOC_ENTRY.sub("", text)

    # Try to find first "Chapter N" or "Unit N" style heading
    match = _CHAPTER_START.search(text)
    if match and match.start() > 200:
        # Meaningful content likely starts here; drop everything before
        text = text[match.start():]

    # Strip trailing index/bibliography sections (keep main body only)
    for marker in ("\\bIndex\\b", "\\bBibliography\\b", "\\bReferences\\b",
                   "\\bGlossary\\b", "\\bAppendix\\b"):
        end_match = re.search(marker, text, re.IGNORECASE)
        if end_match and end_match.start() > len(text) * 0.6:
            text = text[: end_match.start()]
            break

    return text.strip()


def _clean_text(text: str) -> str:
    """Normalise whitespace and remove junk characters."""
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", "", text)  # remove control chars
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Domain Detection (text + title combined)
# ─────────────────────────────────────────────────────────────────────────────

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "programming": [
        "function", "variable", "loop", "array", "class", "object", "algorithm",
        "code", "syntax", "compile", "runtime", "debug", "data structure",
        "python", "java", "javascript", "c++", "html", "css", "sql", "api",
        "recursion", "iteration", "exception", "import", "library", "framework",
        "def ", "return", "print(", "console.log", "#include", "public static",
        "flowchart", "pseudocode", "binary", "boolean", "stack", "queue", "pointer",
        "operating system", "process", "thread", "scheduling", "memory management",
        "deadlock", "semaphore", "database", "normalization", "networking",
    ],
    "biology": [
        "cell", "nucleus", "organism", "protein", "dna", "rna", "chromosome",
        "mitosis", "meiosis", "photosynthesis", "respiration", "enzyme",
        "evolution", "genetics", "ecosystem", "species", "bacteria", "virus",
        "anatomy", "physiology", "tissue", "organ", "biomolecule", "mutation",
        "membrane", "chloroplast", "mitochondria", "nervous system", "gene",
        "hormone", "antibody", "lymphocyte", "osmosis", "diffusion",
    ],
    "chemistry": [
        "element", "compound", "molecule", "atom", "periodic table", "reaction",
        "bond", "covalent", "ionic", "oxidation", "reduction", "acid", "base",
        "solution", "solvent", "solute", "electrolyte", "catalyst", "mole",
        "valence", "electron", "proton", "neutron", "alloy", "polymer",
    ],
    "physics": [
        "force", "velocity", "acceleration", "momentum", "energy", "gravity",
        "newton", "wave", "frequency", "amplitude", "electromagnetic", "circuit",
        "resistance", "current", "voltage", "power", "thermodynamics", "quantum",
        "relativity", "optics", "refraction", "reflection", "inertia",
    ],
    "mathematics": [
        "equation", "theorem", "proof", "matrix", "vector", "derivative",
        "integral", "function", "polynomial", "trigonometry", "sine", "cosine",
        "logarithm", "probability", "statistics", "geometry", "algebra",
        "calculus", "limit", "sequence", "series", "prime", "factorial",
    ],
    "history": [
        "revolution", "war", "empire", "dynasty", "century", "civilization",
        "treaty", "parliament", "monarch", "colony", "independence", "democracy",
        "president", "government", "battle", "ancient", "medieval", "renaissance",
        "industrial revolution", "world war", "constitution", "slavery",
    ],
    "geography": [
        "continent", "country", "capital", "climate", "river", "mountain",
        "ocean", "population", "latitude", "longitude", "earthquake", "volcano",
        "tectonic", "biome", "ecosystem", "rainfall", "drought", "migration",
    ],
    "economics": [
        "supply", "demand", "market", "gdp", "inflation", "recession",
        "monetary", "fiscal", "tax", "trade", "export", "import", "investment",
        "interest rate", "unemployment", "equilibrium", "elasticity", "profit",
    ],
    "medicine": [
        "diagnosis", "symptom", "treatment", "disease", "patient", "clinical",
        "therapy", "surgery", "pharmacology", "pathology", "radiology",
        "cardiovascular", "neurology", "immunology", "oncology", "pediatrics",
    ],
    "law": [
        "statute", "legislation", "court", "judgment", "plaintiff", "defendant",
        "contract", "liability", "jurisdiction", "constitution", "rights",
        "criminal", "civil", "appeal", "evidence", "witness",
    ],
}


def _detect_domain(text: str, title: str = "") -> str:
    """
    Score all domains against the document text AND the topic title.
    Title keywords get a 5× weight bonus to leverage the instructor's intent.
    """
    combined_lower = (title + " " + text[:8000]).lower()
    title_lower = title.lower()

    scores: dict[str, float] = {d: 0.0 for d in DOMAIN_KEYWORDS}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            in_body = combined_lower.count(kw)
            in_title = 5 if kw in title_lower else 0
            scores[domain] += in_body + in_title

    best = max(scores, key=lambda d: scores[d])
    return best if scores[best] > 0 else "general"


# ─────────────────────────────────────────────────────────────────────────────
# Prompt Construction
# ─────────────────────────────────────────────────────────────────────────────

_Q_TYPE_EXPLANATIONS = """
QUESTION TYPE DEFINITIONS — use ALL types, spread across all 12 questions:

1. mcq            — Classic 4-option MCQ. Ask DIRECT questions (e.g. "What is...", "Which of...") rather than using a "complete the sentence" format. All 4 options must be plausible; only one is correct.
2. true_false      — A precise factual statement that is either clearly True or clearly False. Options: ["True", "False"].
3. short_answer    — An open-ended subjective question requiring a 1-3 sentence written response. YOU MUST PLACE THESE AT THE VERY END OF YOUR OUTPUT ARRAY. Options: [] (empty list). answer: the ideal model answer.
4. diagram_question— Generate a question based on a diagram, flowchart, or visual representation. You MUST generate valid HTML-compatible SVG code representing the flowchart/diagram and place it in the `figure_svg` field. Options: [A, B, C, D] or empty for a written answer.
5. code_question   — (FOR PROGRAMMING TOPICS) Provide an incomplete or buggy code snippet and ask the student to complete the code, fix the bug, or predict the output. Wrap code in triple backticks. Options: [A, B, C, D] or empty for written answer.
6. application     — Present a short real-world scenario and ask which concept / law / process applies, or what would happen next. Options: [A, B, C, D].
7. cunning         — A question designed to catch students who have only surface-level understanding. Extremely tricky, sharp, and sensible. Options: [A, B, C, D].
"""

_SHARED_RULES = """
ABSOLUTE RULES (violating any of these makes the output useless):
• Every question MUST be answerable from the provided content alone.
• Questions MUST be clearly structured, highly sensible, and meaningful. Do NOT generate unstructured or unreadable questions. 
• NO "fill in the blanks" or simple "complete the sentence" MCQs. Formulate direct, thoughtful question prompts.
• If quoting or showing code of ANY kind, you MUST format it properly with newlines and indentation inside triple backticks (```). DO NOT output code bunched up in a single line.
• For programming topics, ALWAYS include a 'code_question' asking to complete an incomplete code snippet.
• Whenever relevant, include a 'diagram_question' with a custom generated flowchart or diagram using the `figure_svg` field. The SVG must be standard, scalable, and use `currentColor`.
• Distractors for MCQs must be EXTREMELY similar and confusing (cunning and sharp) to thoroughly test the student's mastery and prevent guessing.
• DO NOT make the correct answer obviously different in length or format.
• Ensure the final 1-2 questions in the JSON array are ALWAYS 'short_answer' types requiring a typed sentence response.
• NO duplicate questions. NO two questions that test the same fact.
"""

_DOMAIN_HINTS: dict[str, str] = {
    "programming": "Include at least one code_question with a real code snippet. "
                   "Include a cunning question about common misconceptions (e.g., pass-by-value vs ref, off-by-one). ",
    "biology": "Use precise scientific terms. Include a figure_explain if a diagram is described. "
               "Include a true_false about a common bio misconception.",
    "chemistry": "Include at least one application about a reaction scenario. "
                 "Include a fill_blank with a key chemical term blanked.",
    "physics": "Include at least one formula-identification MCQ using symbols. "
               "Include a cunning question that confuses two related concepts.",
    "mathematics": "Include at least one definition MCQ and one fill_blank with a theorem.",
    "history": "Include a cause-and-effect application question. "
               "Include a cunning question with similar dates or names.",
    "general": "Ensure variety across all 8 types where applicable.",
}

_OUTPUT_EXAMPLE = '''
Return ONLY a valid JSON array — no markdown fences, no prose. Example structure:
[
  {"question": "Which scheduling algorithm minimises average waiting time for a set of processes with known burst times?",
   "type": "mcq",
   "options": ["FCFS", "Round Robin", "Shortest Job First", "Priority"],
   "answer": "Shortest Job First"},

  {"question": "Based on the flowchart provided, what condition causes the loop to terminate?",
   "type": "diagram_question",
   "options": ["When count equals 10", "When count is less than 0", "When count exceeds 100", "When count is exactly 5"],
   "answer": "When count equals 10",
   "figure_svg": "<svg viewBox=\\"0 0 100 50\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path d=\\"M10 25h20M70 25h20M30 10h40M30 40h40\\" stroke=\\"currentColor\\" stroke-width=\\"2\\" fill=\\"none\\"/></svg>"},

  {"question": "Complete the following Python code snippet to initialize an empty list.\\n```python\\nmy_list = _____\\n```",
   "type": "code_question",
   "options": ["{}", "[]", "()", "list"],
   "answer": "[]"},

  {"question": "Which of the following is NOT a necessary condition for deadlock?",
   "type": "cunning",
   "options": ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
   "answer": "Preemption"},

  {"question": "Explain in your own words why Round Robin scheduling is considered fair but may lead to high turnaround time.",
   "type": "short_answer",
   "options": [],
   "answer": "Round Robin gives every process an equal time quantum so no process starves. However, because the CPU switches frequently, each process may spend a long time waiting for its next slice when many processes compete, leading to high turnaround time."}
]
'''


def _build_prompt(text: str, domain: str, num_questions: int, difficulty: int, title: str) -> str:
    difficulty_desc = {1: "Easy — test recall and basic definitions",
                       2: "Medium — test understanding, application, and connections",
                       3: "Hard — test analysis, edge cases, and common misconceptions"}[difficulty]

    domain_hint = _DOMAIN_HINTS.get(domain, _DOMAIN_HINTS["general"])

    # Trim text to token-safe size while keeping both start and end
    max_chars = 14000
    if len(text) > max_chars:
        half = max_chars // 2
        context = text[:half] + "\n\n[… content continues …]\n\n" + text[-half:]
    else:
        context = text

    # Random session tag → ensures Gemini generates a unique set every call
    seed_words = ["alpha","beta","gamma","delta","epsilon","zeta","eta",
                  "theta","iota","kappa","lambda","sigma","omega","rho"]
    session_tag = f"[Session-{random.choice(seed_words)}-{random.randint(1000,9999)}]"

    return f"""You are an expert academic examiner {session_tag} creating HIGH-QUALITY assessment questions for the topic: "{title}".
Domain: {domain.upper()}. Difficulty: {difficulty_desc}.
IMPORTANT: Generate COMPLETELY DIFFERENT and UNIQUE questions — never repeat questions you may have generated before.

=== CONTENT ===
{context}
=== END CONTENT ===

{_Q_TYPE_EXPLANATIONS}

DOMAIN-SPECIFIC HINT:
{domain_hint}

{_SHARED_RULES}

Generate exactly {num_questions} questions now.
{_OUTPUT_EXAMPLE}"""


# ─────────────────────────────────────────────────────────────────────────────
# Gemini Generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_with_gemini(
    text: str, domain: str, num_questions: int, difficulty: int, title: str
) -> list[dict]:
    client = _get_gemini_client()
    if client is None:
        return []

    prompt = _build_prompt(text, domain, num_questions, difficulty, title)

    for model_name in _GEMINI_MODELS:
        raw = ""
        try:
            logger.info(f"Trying Gemini model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.82,
                    max_output_tokens=6000,
                ),
            )
            raw = response.text.strip()
            logger.debug(f"Gemini raw (first 400 chars): {raw[:400]}")

            # Strip markdown fences
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            raw = raw.strip()

            questions = json.loads(raw)

            validated = []
            for q in questions:
                if not isinstance(q, dict):
                    continue
                if "question" not in q or "answer" not in q:
                    continue
                q.setdefault("options", [])
                q.setdefault("type", "mcq")
                q.setdefault("figure_svg", None)
                q["type"] = q["type"].lower().replace(" ", "_")
                validated.append(q)

            if validated:
                logger.info(f"Gemini [{model_name}] returned {len(validated)} questions")
                return validated

            logger.warning(f"Gemini [{model_name}] returned empty/invalid list — trying next model")

        except json.JSONDecodeError as e:
            logger.error(f"Gemini [{model_name}] invalid JSON: {e}\nRaw: {raw[:400]}")
            # Don't try next model for JSON errors — prompt issue, not quota
            break
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                logger.warning(f"Gemini [{model_name}] quota exhausted — trying next model")
                continue
            elif "404" in err_str or "NOT_FOUND" in err_str:
                logger.warning(f"Gemini [{model_name}] not found — trying next model")
                continue
            else:
                logger.error(f"Gemini [{model_name}] error [{type(e).__name__}]: {e}")
                break

    logger.warning("All Gemini models exhausted or failed — using smart fallback")
    return []


# ─────────────────────────────────────────────────────────────────────────────
# NLTK Fallback  (only runs when Gemini is unavailable)
# ─────────────────────────────────────────────────────────────────────────────

# Sentences from textbook exercise sections — never use these as questions
_EXERCISE_RE = re.compile(
    r"^\s*(\d+[\.\)\:]|[a-fA-F][\.\)\:]|Q\.?\s*\d|Question\s+\d|\([a-z]\)|"
    r"explain|describe|list|define|state|derive|prove|show\s|compare|"
    r"differentiate|discuss|mention|write\s|find\s|calculate|what\s+(is|are|do|does)|"
    r"how\s+does|why\s+does|illustrate|give\s+example|true\s+or\s+false|"
    r"short\s+(note|answer)|answer\s+the\s+following)",
    re.IGNORECASE,
)

# "X is [a/an/the] Y" or "X are Y"  (for "What is X?" MCQ)
_IS_PATTERN = re.compile(
    r"^(?P<subject>[A-Z][^.]{3,50}?)\s+(?:is|are)\s+(?:a|an|the)?\s*"
    r"(?P<predicate>[a-zA-Z\-\s]{4,60}?)[\.,]",
)

# "X is defined as Y" / "X refers to Y" / "X means Y"
_DEF_PATTERN = re.compile(
    r"^(?P<subject>[A-Z][^.]{3,50}?)\s+(?:is defined as|refers to|means|denotes|"
    r"represents|is known as|is called)\s+(?P<predicate>[^.]{4,80}?)[\.,]",
    re.IGNORECASE,
)

# Generic domain distractors by domain (used when no local terms found)
_DOMAIN_DISTRACTORS = {
    "physics":      ["Velocity", "Momentum", "Entropy", "Resistance", "Capacitance"],
    "chemistry":    ["Molarity", "Valence", "Catalyst", "Polymer", "Isotope"],
    "biology":      ["Mitosis", "Chromosome", "Enzyme", "Osmosis", "Antibody"],
    "programming":  ["Recursion", "Pointer", "Segment", "Interrupt", "Register"],
    "mathematics":  ["Derivative", "Integral", "Eigenvalue", "Tangent", "Permutation"],
    "history":      ["Revolution", "Dynasty", "Parliament", "Colony", "Treaty"],
    "economics":    ["Inflation", "Monopoly", "Deficit", "Subsidy", "Dividend"],
    "general":      ["Module", "Component", "Parameter", "Framework", "Protocol"],
}


def _rule_based_mcq_fallback(text: str, num_questions: int, domain: str) -> list[dict]:
    """
    Smart rule-based fallback when Gemini is unavailable.
    Generates three tiers of questions from declarative content:
      1. "What is X?" MCQs from "X is a Y" patterns
      2. Fill-in-the-blank from key sentences
      3. True/False as last resort
    """
    try:
        import nltk
        try:
            sents = nltk.sent_tokenize(text)
        except Exception:
            sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text)]

        # Filter to good declarative sentences only
        good_sents = []
        for s in sents:
            s = s.strip()
            if s.endswith("?") or _EXERCISE_RE.match(s):
                continue
            if len(s) < 60 or len(s) > 450:
                continue
            if not re.search(
                r"\b(is|are|was|were|has|have|called|known|used|defined|"
                r"consists|refers|represents|allows|enables|provides|denotes)\b",
                s, re.I
            ):
                continue
            good_sents.append(s)

        random.shuffle(good_sents)

        # Collect all capitalised terms from the FULL text as distractor pool
        all_terms = list(set(
            re.findall(r"\b([A-Z][a-zA-Z]{3,})\b", text)
        ))
        domain_dists = _DOMAIN_DISTRACTORS.get(domain, _DOMAIN_DISTRACTORS["general"])

        def _get_distractors(exclude: str, n: int = 3) -> list[str]:
            pool = [t for t in all_terms if t.lower() != exclude.lower()]
            random.shuffle(pool)
            chosen = pool[:n]
            if len(chosen) < n:
                chosen += [d for d in domain_dists if d.lower() != exclude.lower()]
            return chosen[:n]

        questions = []

        # ── Tier 1: "What is X?" MCQs ─────────────────────────────────────
        for sent in good_sents:
            if len(questions) >= num_questions:
                break
            for pat in (_IS_PATTERN, _DEF_PATTERN):
                m = pat.match(sent)
                if m:
                    subject   = m.group("subject").strip()
                    predicate = m.group("predicate").strip().rstrip(".,;").capitalize()
                    if len(subject) < 3 or len(predicate) < 4:
                        continue
                    distractors = _get_distractors(predicate)
                    if len(distractors) < 3:
                        continue
                    opts = [predicate] + distractors[:3]
                    random.shuffle(opts)
                    questions.append({
                        "question": f"Which of the following best describes '{subject}'?",
                        "type":     "mcq",
                        "answer":   predicate,
                        "options":  opts,
                    })
                    break

        # ── Tier 2: Fill-in-the-blank ─────────────────────────────────────
        for sent in good_sents:
            if len(questions) >= num_questions:
                break
            # Find meaningful capitalised inner words (not first word)
            inner = re.findall(r"(?<=\s)([A-Z][a-zA-Z]{4,})\b", sent)
            if inner:
                target = random.choice(inner)
                blanked = sent.replace(target, "_____", 1)
                distractors = _get_distractors(target)
                opts = [target] + distractors[:3]
                random.shuffle(opts)
                questions.append({
                    "question": f"Fill in the blank: {blanked}",
                    "type":     "fill_blank",
                    "answer":   target,
                    "options":  opts,
                })

        # ── Tier 3: True/False (only for clean declarative statements) ────
        for sent in good_sents:
            if len(questions) >= num_questions:
                break
            short = sent if len(sent) <= 200 else sent[:197] + "…"
            questions.append({
                "question": f"True or False: {short}",
                "type":     "true_false",
                "answer":   "True",
                "options":  ["True", "False"],
            })

        # Shuffle the final list so question types are mixed
        random.shuffle(questions)
        logger.info(f"Rule-based fallback generated {len(questions[:num_questions])} questions")
        return questions[:num_questions]

    except Exception as e:
        logger.error(f"Rule-based fallback error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def generate_questions_from_text(
    text: str,
    num_questions: int = 12,
    difficulty: int = 1,
    title: str = "",
) -> list[dict]:
    """
    Generate assessment questions from extracted PDF text.

    Args:
        text:          Raw text extracted from the PDF.
        num_questions: How many questions to return (default 12).
        difficulty:    1=Easy, 2=Medium, 3=Hard.
        title:         Topic title — used to boost domain detection accuracy.

    Returns:
        List of question dicts with keys:
            question : str
            type     : str  (mcq | true_false | fill_blank | short_answer |
                             figure_explain | code_question | application | cunning)
            answer   : str
            options  : list[str]  (empty for short_answer / figure_explain)
    """
    if not text or not text.strip():
        return []

    # Preprocess
    text = _clean_text(text)
    text = _strip_front_matter(text)

    if len(text) < 200:
        logger.warning("Text too short after stripping front matter — using original")
        text = _clean_text(text)  # use original but cleaned

    # Domain detection (title gives extra weight)
    domain = _detect_domain(text, title=title)
    logger.info(f"Domain detected: {domain} (title='{title}')")

    # Try Gemini (lazy-init — always attempts even if module-level init was skipped)
    questions = _generate_with_gemini(text, domain, num_questions, difficulty, title)
    if questions:
        logger.info(f"Generated {len(questions)} questions via Gemini (domain={domain})")
        return questions[:num_questions]

    logger.warning("Gemini unavailable — using rule-based MCQ fallback")

    # Smart rule-based fallback (no API needed)
    questions = _rule_based_mcq_fallback(text, num_questions, domain)
    logger.info(f"Generated {len(questions)} questions via rule-based fallback")
    return questions