FROM python:3.12-slim

WORKDIR /app

COPY . /app

RUN pip install flask openai jsmin rcssmin minify_html supabase

EXPOSE 2929

CMD ["python", "app.py"]