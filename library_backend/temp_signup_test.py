import os
import json
import random
import string
import urllib.request
import urllib.error

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_backend.settings')
import django

django.setup()

fields = {
    'username': 'testuser_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)),
    'email': 'bejigacalotesreven+' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + '@gmail.com',
    'password': 'Testpass123!',
    'confirm_password': 'Testpass123!',
    'date_of_birth': '2000-01-01',
}

url = 'http://127.0.0.1:8000/api/auth/member/signup/'
data = json.dumps(fields).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=20) as r:
        print('STATUS', r.status)
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERROR', e)
