#!/bin/bash
# Start Django backend
echo "Starting Django backend on http://localhost:8000 ..."
cd "$(dirname "$0")/library_backend"
python manage.py runserver &
DJANGO_PID=$!

# Start Vite frontend
echo "Starting Vite frontend on http://localhost:5173 ..."
cd "$(dirname "$0")/library-frontend"
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Both servers running:"
echo "   Backend:  http://localhost:8000/api/"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $DJANGO_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
