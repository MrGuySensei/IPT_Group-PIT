from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from groq import Groq
import json
import os
from dotenv import load_dotenv

load_dotenv(override=True)

@csrf_exempt
def chatbot_response(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get('message', '')

            if not user_message:
                return JsonResponse({'error': 'No message provided'}, status=400)

            # Initialize client here instead of module level
            client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

            system_prompt = """You are a friendly and helpful librarian assistant for an online library system. 
            Help users with book recommendations, searching books, borrowing rules, due dates, and general library information."""

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