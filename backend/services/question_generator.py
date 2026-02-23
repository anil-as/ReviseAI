import random

def generate_questions_from_text(text: str):

    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]

    questions = []

    for sentence in sentences[:5]:

        # 1️⃣ Understanding Question
        questions.append({
            "question": f"Explain in your own words: {sentence}?",
            "type": "understanding",
            "answer": sentence
        })

        # 2️⃣ MCQ
        words = sentence.split()
        if len(words) > 5:
            keyword = random.choice(words)
            questions.append({
                "question": f"What is related to '{keyword}' in the topic?",
                "type": "mcq",
                "answer": sentence
            })

        # 3️⃣ Trap Question
        questions.append({
            "question": f"Is it always true that {sentence}?",
            "type": "trap",
            "answer": "Depends on context"
        })

        # 4️⃣ Application Question
        questions.append({
            "question": f"How would you apply this concept in real life: {sentence}?",
            "type": "application",
            "answer": sentence
        })

    random.shuffle(questions)

    return questions[:10]