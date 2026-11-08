FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Usuario sin privilegios para runtime (hardening). Los volúmenes montados
# (media/static en prod) deben ser escribibles por UID 10001 o gestionarse en el entrypoint.
RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin appuser

# Build-time env para collectstatic (se sobrescriben en runtime con secrets reales)
ARG SECRET_KEY=dummy-build-key-para-collectstatic-no-para-produccion
ARG ALLOWED_HOSTS=localhost
ARG DEBUG=False
ENV SECRET_KEY=$SECRET_KEY \
    ALLOWED_HOSTS=$ALLOWED_HOSTS \
    DEBUG=$DEBUG

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=10001:10001 backend/ .

RUN python manage.py collectstatic --noinput \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R 10001:10001 /app

USER 10001:10001

EXPOSE 8000

CMD ["gunicorn", "focusia_api.wsgi:application", "--bind", "0.0.0.0:$PORT"]
