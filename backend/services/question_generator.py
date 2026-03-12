"""
AI-Powered Contextual Question Generator  (v3 — RAG Edition)
=============================================================
Improvements over v2:
  • RAG pipeline: LangChain text chunking → FAISS in-memory index →
    Google Embeddings semantic retrieval → top-K chunks fed to Gemini.
  • Questions now drawn from the richest, most topically relevant
    sections of the PDF, not just the first/last 7 000 chars.
  • Graceful fallback to old slicing if LangChain/FAISS unavailable.
  • All v2 improvements (domain detection, prompt engineering, NLTK
    fallback, 8 question types) remain intact.
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

# ─────────────────────────────────────────────────────────────────────────────
# RAG dependencies — optional, graceful degradation if not installed
# ─────────────────────────────────────────────────────────────────────────────
try:
    # LangChain v1.x — splitter lives in its own package
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from langchain_community.vectorstores import FAISS
    _RAG_AVAILABLE = True
except ImportError:
    try:
        # Older LangChain fallback
        from langchain.text_splitter import RecursiveCharacterTextSplitter  # type: ignore
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        from langchain_community.vectorstores import FAISS
        _RAG_AVAILABLE = True
    except ImportError:
        _RAG_AVAILABLE = False

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
QUESTION TYPE DEFINITIONS:

OPEN-RESPONSE (4 out of {num_questions} questions MUST be these types — no options, student types own answer):
  A. short_answer  — Tests understanding with a concise 2-4 sentence response.
                     The `answer` field MUST be a complete model answer of at least 2 sentences using exact topic vocabulary.
                     Example Q: "What is the role of the process control block in an OS?"
                     Example A: "A process control block (PCB) is a data structure maintained by the OS for each process. It stores the process state, program counter, CPU registers, memory limits, and scheduling information, enabling the OS to save and restore process context during context switches."
  B. long_answer   — Tests deep comprehension. Requires a multi-paragraph explanation (3-6 sentences minimum).
                     The `answer` field MUST be a thorough model answer covering the concept's definition, mechanism, significance, and example.
                     Options: [] (empty).
                     Example Q: "Explain in detail how deadlock occurs and what conditions must ALL be satisfied simultaneously for a deadlock to arise."
                     Example A: "Deadlock is a situation in which a set of processes are permanently blocked because each is waiting for a resource held by another. Four conditions must hold simultaneously: (1) Mutual Exclusion — resources cannot be shared; (2) Hold and Wait — a process holds resources while requesting more; (3) No Preemption — resources cannot be forcibly taken; (4) Circular Wait — a circular chain of processes each waits for a resource held by the next. Removing any one condition breaks deadlock. For example, allowing preemption lets the OS reclaim resources when needed, preventing indefinite blocking."

MULTIPLE-CHOICE (up to 8 out of {num_questions} questions):
  1. mcq            — Classic 4-option MCQ. Ask DIRECT questions (e.g. "What is...", "Which of...").
                      ALL 4 options MUST be from the same conceptual category. MCQ ANSWERS should be a phrase (4+ words), not a single word.
                      Bad: answer="T" | Good: answer="True, because Mutex prevents concurrent access"
  2. true_false      — A factual statement that is True or False. Options: ["True", "False"].
  3. diagram_question— Requires a `figure_svg` field with valid SVG code. Options: [A, B, C, D].
  4. code_question   — (PROGRAMMING ONLY) Incomplete/buggy code snippet. Wrap in triple backticks.
  5. application     — Real-world scenario: which concept applies? Options: [A, B, C, D].
  6. cunning         — Catches surface-level knowledge. Uses closely related but subtly wrong options.
"""

_SHARED_RULES = """
ABSOLUTE RULES:
• Every question MUST be answerable from the provided content alone.
• Questions MUST be clearly structured and meaningful — no unreadable or vague prompts.
• NO single-word answers anywhere. MCQ options and answers must be phrases; open-response answers must be full sentences.
• NO simple recall like "What does X stand for?" or "What year was Y?". Test UNDERSTANDING and APPLICATION.
• For programming topics, ALWAYS include at least one code_question with real code.
• For diagram questions, include valid SVG in the `figure_svg` field.
• NO duplicate questions. NO two questions that test the same concept.

SEMANTIC DEPTH RULES (most important):
• BEFORE generating each question, identify the KEY CONCEPT being tested (from the keyword list above).
• Questions must test the MECHANISM, REASON, or CONSEQUENCE of a concept, NOT just its name.
  ✔ GOOD: "Why does increasing the time quantum in Round Robin scheduling increase its resemblance to FCFS?"
  ✘ BAD:  "What is Round Robin scheduling?"
• At least 4 of the {num_questions} questions MUST be open-response (short_answer or long_answer) requiring typed answers in the student's own words. Place these LAST in the array.
• short_answer answers: minimum 2 complete sentences using exact topic vocabulary.
• long_answer answers: minimum 4 sentences covering definition, mechanism, significance, and at least one example from the content.

DISTRACTOR ENGINEERING FOR MCQs:
• All options MUST be from the same conceptual family as the correct answer.
• Use: SAME CATEGORY | COMMON CONFUSION | PARTIAL TRUTH | NUMERIC NEAR-MISS | DEFINITION SWAP
• NEVER use generic, unrelated, or single-word distractors.
• NEVER make the correct answer obviously different in length or format.
"""

_DOMAIN_HINTS: dict[str, str] = {
    "programming": (
        "Include at least one code_question with a real code snippet. "
        "For MCQ distractors: use sibling algorithms, data structures, or closely related methods "
        "(e.g., if answer is 'merge sort', distractors should be 'quick sort', 'heap sort', 'insertion sort'). "
        "Include a cunning question about common misconceptions (e.g., pass-by-value vs ref, off-by-one)."
    ),
    "biology": (
        "Use precise scientific terms. Include a true_false about a common bio misconception. "
        "For MCQ distractors: use organelles/processes/molecules from the SAME biological system "
        "(e.g., if answer is 'mitochondria', distractors are 'chloroplast', 'nucleus', 'endoplasmic reticulum')."
    ),
    "chemistry": (
        "Include at least one application about a reaction scenario. "
        "For MCQ distractors: use chemicals/processes that react similarly or belong to the same group "
        "(e.g., if answer is 'oxidation', distractors are 'reduction', 'combustion', 'hydrolysis')."
    ),
    "physics": (
        "Include at least one formula-identification MCQ using symbols. "
        "For MCQ distractors: use related physical quantities or laws from the same branch "
        "(e.g., if answer is 'Newton's Second Law', distractors are 'Newton's Third Law', 'Law of Conservation', 'Hooke's Law'). "
        "Include a cunning question that confuses two related concepts."
    ),
    "mathematics": (
        "Include at least one definition MCQ. "
        "For MCQ distractors: use sibling theorems, formulas, or definitions from the same chapter "
        "(e.g., if answer is 'Bayes Theorem', distractors are 'Law of Total Probability', 'Conditional Probability', 'Binomial Theorem')."
    ),
    "history": (
        "Include a cause-and-effect application question. "
        "For MCQ distractors: use events, figures, or dates from the same era or region. "
        "Include a cunning question with similar dates, names, or places."
    ),
    "general": "Ensure variety across all 8 types. For distractors, always pick terms from the SAME conceptual family as the answer.",
}

_OUTPUT_EXAMPLE = '''
Return ONLY a valid JSON array — no markdown fences, no prose. Example structure:
[
  {"question": "Which scheduling algorithm minimises average waiting time for processes with known burst times?",
   "type": "mcq",
   "options": ["First Come First Served (FCFS)", "Round Robin with fixed quantum", "Shortest Job First (SJF)", "Priority Scheduling (non-preemptive)"],
   "answer": "Shortest Job First (SJF)"},

  {"question": "Which of the following is NOT a necessary condition for deadlock to arise?",
   "type": "cunning",
   "options": ["Mutual Exclusion — only one process can use a resource at a time", "Hold and Wait — a process holds resources while requesting more", "Preemption allowed — resources can be forcibly taken from processes", "Circular Wait — a circular chain of waiting processes exists"],
   "answer": "Preemption allowed — resources can be forcibly taken from processes"},

  {"question": "Explain in your own words what differentiates preemptive scheduling from non-preemptive scheduling, and why this distinction matters for real-time systems.",
   "type": "short_answer",
   "options": [],
   "answer": "In preemptive scheduling, the OS can interrupt a running process mid-execution to allocate the CPU to a higher-priority process, whereas non-preemptive scheduling allows a process to run to completion once it has the CPU. This distinction is critical for real-time systems because time-sensitive tasks must be guaranteed CPU access within strict deadlines, which only preemption can ensure."},

  {"question": "In detail, explain the concept of virtual memory, how it works through paging, and what problems it solves compared to physical memory management.",
   "type": "long_answer",
   "options": [],
   "answer": "Virtual memory is a memory management technique that gives each process the illusion of having a large, contiguous address space independent of physical RAM. It works through paging: the virtual address space is divided into fixed-size pages, and physical memory is divided into frames of the same size. The OS maintains a page table per process that maps virtual pages to physical frames. When a process accesses a page not in RAM, a page fault occurs and the OS loads the required page from disk into a free frame. Virtual memory solves two key problems: (1) programs larger than physical RAM can run because only active pages need to be in RAM at any time; (2) process isolation is enforced since each process has its own page table, preventing one process from accessing another's memory."}
]
'''


def _extract_keywords(text: str, n: int = 20) -> list[str]:
    """
    Extract the top-N significant keywords from the context text using
    TF-style scoring: prefer longer, capitalised, frequently-occurring noun
    phrases. Used to inject focused topic terms into the Gemini prompt.
    """
    # Find all multi-word noun-like phrases (2-3 capitalised words) and single significant words
    phrases = re.findall(r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b', text)
    single  = re.findall(r'\b([a-zA-Z]{5,})\b', text.lower())

    # Common stopwords to filter out
    stops = {
        'this','that','with','from','they','have','been','will','when',
        'which','their','there','these','those','some','such','also',
        'each','only','other','into','over','after','before','about',
        'used','using','called','known','based','given','defined','allows',
        'provides','consists','referred','process','system','method',
    }

    freq: dict[str, int] = {}
    for p in phrases:
        key = p.strip()
        if len(key) >= 4 and key not in stops:
            freq[key] = freq.get(key, 0) + 2  # capitalised phrases score higher
    for w in single:
        if w not in stops and len(w) >= 5:
            freq[w] = freq.get(w, 0) + 1

    # Sort by frequency × length (prefer informative longer terms)
    ranked = sorted(freq.items(), key=lambda x: x[1] * len(x[0]), reverse=True)
    return [k for k, _ in ranked[:n]]


# ─────────────────────────────────────────────────────────────────────────────
# RAG Context Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_rag_context(text: str, title: str, k: int = 5) -> str:
    """
    Build a high-quality context string for Gemini using a RAG pipeline:
      1. Chunk the PDF text (3 000 chars, 300 overlap) with LangChain.
      2. Embed chunks with Google's embedding-001 model into in-memory FAISS.
      3. Retrieve the top-K chunks most semantically similar to the topic title.
      4. Return the concatenated chunks as the Gemini context.

    Falls back to simple front+back slicing if LangChain/FAISS unavailable.
    """
    if not _RAG_AVAILABLE:
        logger.warning("RAG libraries not available — using legacy text slicing")
        max_chars = 14000
        if len(text) > max_chars:
            half = max_chars // 2
            return text[:half] + "\n\n[… content continues …]\n\n" + text[-half:]
        return text

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — RAG embedding skipped, using slicing")
        max_chars = 14000
        if len(text) > max_chars:
            half = max_chars // 2
            return text[:half] + "\n\n[… content continues …]\n\n" + text[-half:]
        return text

    try:
        # Step 1 — Chunk
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=300,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_text(text)
        if not chunks:
            return text

        logger.info(f"RAG: {len(chunks)} chunks created from {len(text)} chars")

        # Step 2 — Embed & Index (in-memory FAISS, no disk writes)
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key,
        )
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)

        # Step 3 — Retrieve top-K chunks relevant to the topic title
        query = f"{title} key concepts definitions examples applications"
        retrieved_docs = vector_store.similarity_search(query, k=min(k, len(chunks)))
        retrieved_chunks = [doc.page_content for doc in retrieved_docs]

        context = "\n\n---\n\n".join(retrieved_chunks)
        logger.info(
            f"RAG context built: {len(retrieved_docs)} chunks retrieved, "
            f"total chars = {len(context)}"
        )
        return context

    except Exception as e:
        logger.error(f"RAG pipeline failed ({type(e).__name__}: {e}) — falling back to slicing")
        max_chars = 14000
        if len(text) > max_chars:
            half = max_chars // 2
            return text[:half] + "\n\n[… content continues …]\n\n" + text[-half:]
        return text


def _build_prompt(text: str, domain: str, num_questions: int, topic_type: str, title: str) -> str:
    type_desc = {
        "coding": "Programming / Coding — Focus heavily on code comprehension, debugging, and real code writing.",
        "theory": "Theory / General — Focus on conceptual understanding, mechanisms, and flowcharts.",
    }.get(topic_type, "Theory / General")

    domain_hint = _DOMAIN_HINTS.get(domain, _DOMAIN_HINTS["general"])

    # Context is pre-processed by the RAG pipeline before reaching here.
    # Soft-cap at 18 000 chars as a final safety net for very large retrievals.
    context = text[:18000] if len(text) > 18000 else text

    # ── Keyword extraction: focus Gemini on the most significant topic terms ──
    keywords = _extract_keywords(context, n=20)
    keyword_str = ", ".join(keywords) if keywords else title

    # Open-response quota: at least 1/3 of questions must be open-response
    open_quota = max(3, num_questions // 3)
    mcq_quota  = num_questions - open_quota

    # Resolve {num_questions} placeholder in template strings at runtime
    q_types_resolved = _Q_TYPE_EXPLANATIONS.replace("{num_questions}", str(num_questions))
    shared_resolved  = _SHARED_RULES.replace("{num_questions}", str(num_questions))

    # Random session tag → ensures Gemini generates a unique set every call
    seed_words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta",
                  "theta", "iota", "kappa", "lambda", "sigma", "omega", "rho"]
    session_tag = f"[Session-{random.choice(seed_words)}-{random.randint(1000,9999)}]"

    type_hint = ""
    if topic_type == "coding":
        type_hint = (
            f"CRITICAL CODING INSTRUCTION:\n"
            f"Because this is a CODING topic, at least HALF of the {open_quota} open-response questions MUST be 'code_question' types, "
            f"where the student must write code. The 'question' field should explain the task, and the 'answer' field should contain the correct code solution.\n\n"
        )
    else:
        type_hint = (
            f"CRITICAL THEORY INSTRUCTION:\n"
            f"Because this is a THEORY topic, you MUST include at least ONE 'diagram_question' or 'figure_explain' type question.\n"
            f"For this question, you MUST provide a visual representation in the `figure_svg` field by writing a beautiful, valid SVG flowchart or diagram that illustrates a concept from the text. "
            f"If an SVG is not suitable, you may instead provide a highly relevant, publicly accessible internet image URL in the `figure_svg` field (e.g., from Wikimedia Commons). "
            f"The student will be asked to interpret or explain this figure.\n\n"
        )

    return (
        f'You are an expert academic examiner {session_tag} '
        f'deeply familiar with the topic: "{title}".\n'
        f'Domain: {domain.upper()}. Topic Type: {type_desc}.\n\n'
        f'STEP 1 — COMPREHEND THE CONTENT:\n'
        f'Read the content below carefully. Identify the core concepts, their definitions, '
        f'mechanisms, causes, consequences, and relationships.\n\n'
        f'KEY TOPIC TERMS TO PRIORITISE IN YOUR QUESTIONS '
        f'(derived from the content — these are the most important ideas):\n'
        f'{keyword_str}\n\n'
        f'{type_hint}'
        f'STEP 2 — GENERATE {num_questions} QUESTIONS WITH THIS MANDATORY DISTRIBUTION:\n'
        f'  \u2022 {open_quota} open-response questions (short_answer or long_answer) '
        f'— student types answer in own words — place these LAST in the array\n'
        f'  \u2022 {mcq_quota} multiple-choice questions '
        f'(mcq, true_false, cunning, application, code_question, diagram_question)\n\n'
        f'=== CONTENT ===\n{context}\n=== END CONTENT ===\n\n'
        f'{q_types_resolved}\n'
        f'DOMAIN-SPECIFIC HINT:\n{domain_hint}\n\n'
        f'{shared_resolved}\n'
        f'Generate exactly {num_questions} questions now. '
        f'Every question must feel like it was written by a human examiner '
        f'who thoroughly read the content — not a generic template.\n'
        f'{_OUTPUT_EXAMPLE}'
    )



# ─────────────────────────────────────────────────────────────────────────────
# Gemini Generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_with_gemini(
    text: str, domain: str, num_questions: int, topic_type: str, title: str
) -> list[dict]:
    client = _get_gemini_client()
    if client is None:
        return []

    prompt = _build_prompt(text, domain, num_questions, topic_type, title)

    for model_name in _GEMINI_MODELS:
        raw = ""
        try:
            logger.info(f"Trying Gemini model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.82,
                    max_output_tokens=8000,
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

        # — Context-aware distractor pool —
        # Build a sentence index so we can pick terms from nearby sentences
        # (semantically much more relevant than random full-document caps words).
        domain_dists = _DOMAIN_DISTRACTORS.get(domain, _DOMAIN_DISTRACTORS["general"])

        def _get_contextual_distractors(exclude: str, sent_idx: int, n: int = 3) -> list[str]:
            """
            Preference order:
              1. Capitalised noun-like terms from the same + ±3 adjacent sentences
              2. Same + ±10 sentences (broader paragraph)
              3. Domain-specific fallback distractors
            Terms must be ≥4 chars and different from exclude.
            """
            for window in [3, 10, len(good_sents)]:
                lo = max(0, sent_idx - window)
                hi = min(len(good_sents), sent_idx + window + 1)
                nearby_text = " ".join(good_sents[lo:hi])
                candidates = list(set(re.findall(r"\b([A-Z][a-zA-Z]{3,})\b", nearby_text)))
                candidates = [c for c in candidates if c.lower() != exclude.lower() and len(c) >= 4]
                if len(candidates) >= n:
                    random.shuffle(candidates)
                    return candidates[:n]
            # Last resort: domain distractors
            return [d for d in domain_dists if d.lower() != exclude.lower()][:n]


        questions = []

        # ── Tier 1: "What is X?" MCQs ─────────────────────────────────────
        for sent_idx, sent in enumerate(good_sents):
            if len(questions) >= num_questions:
                break
            for pat in (_IS_PATTERN, _DEF_PATTERN):
                m = pat.match(sent)
                if m:
                    subject   = m.group("subject").strip()
                    predicate = m.group("predicate").strip().rstrip(".,;").capitalize()
                    if len(subject) < 3 or len(predicate) < 4:
                        continue
                    distractors = _get_contextual_distractors(predicate, sent_idx)
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
        for sent_idx, sent in enumerate(good_sents):
            if len(questions) >= num_questions:
                break
            # Find meaningful capitalised inner words (not first word)
            inner = re.findall(r"(?<=\s)([A-Z][a-zA-Z]{4,})\b", sent)
            if inner:
                target = random.choice(inner)
                blanked = sent.replace(target, "_____", 1)
                distractors = _get_contextual_distractors(target, sent_idx)
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
    topic_type: str = "theory",
    title: str = "General Topic"
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

    # ── RAG: build semantically-rich context from the best PDF chunks ─────────
    rag_context = _build_rag_context(text, title=title, k=5)
    logger.info(f"RAG context ready ({len(rag_context)} chars) for Gemini")

    # Try Gemini with the RAG-enhanced context
    questions = _generate_with_gemini(
        text=rag_context,
        domain=domain,
        num_questions=num_questions,
        topic_type=topic_type,
        title=title
    )
    if questions:
        logger.info(f"Generated {len(questions)} questions via Gemini (domain={domain})")
        return questions[:num_questions]

    logger.warning("Gemini unavailable — using rule-based MCQ fallback")

    # Smart rule-based fallback (no API needed)
    questions = _rule_based_mcq_fallback(text, num_questions, domain)
    logger.info(f"Generated {len(questions)} questions via rule-based fallback")
    return questions