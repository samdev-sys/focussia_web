FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Build-time env para collectstatic (se sobrescriben en runtime con secrets reales)
ARG SECRET_KEY=dummy-build-key
ARG DEBUG=False
ENV SECRET_KEY=$SECRET_KEY \
    DEBUG=$DEBUG

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "focusia_api.wsgi:application", "--bind", "0.0.0.0:$PORT"]
