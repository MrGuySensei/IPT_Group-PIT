from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from groq import Groq
import json
import os

# Lazy initialization - don't create client at module load
_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise Exception("GROQ_API_KEY environment variable is not set")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

@csrf_exempt
def chatbot_response(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get('message', '')

            if not user_message:
                return JsonResponse({'error': 'No message provided'}, status=400)

             system_prompt = """You are a friendly, helpful, and knowledgeable librarian assistant for the IPT Library System.

Your role is to help users with:
- Book recommendations based on genre, author, or topic
- Searching for books (title, author, ISBN)
- Borrowing and returning books procedures
- Due dates and overdue information
- Library rules and policies
- Account-related questions
- Finding similar books or popular titles

Tone: Friendly, patient, professional but approachable. Use simple language.

You can answer general questions about the library. If the user asks something you don't have information about, politely say you can help with library-related topics.

Current date is May 2026.

Be helpful and encourage users to explore the library system."""

            client = get_groq_client()

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=800,
            )

            return JsonResponse({
                'reply': response.choices[0].message.content
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Only POST method allowed'}, status=405)