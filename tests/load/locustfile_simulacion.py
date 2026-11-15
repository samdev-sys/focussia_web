"""
Simulación de usuarios conectados (polling + acciones básicas) para medir latencia.

USO (recomendado contra local/staging, NO contra producción sin coordinación):
  pip install locust
  locust -f tests/load/locustfile_simulacion.py --host http://localhost:8000

  # Ejemplo ~1000 usuarios, subida gradual (headless, 10 min):
  locust -f tests/load/locustfile_simulacion.py --host http://localhost:8000 ^
         --headless -u 1000 -r 20 -t 10m --csv=load_1000

Credenciales (opcional, para endpoints autenticados):
  set LOCUST_USERNAME=<usuario>
  set LOCUST_PASSWORD=<clave>

Sin credenciales solo se ejercitan endpoints públicos (/api/health/, /api/csrf/).
Con credenciales también: /api/users/me/, /api/notifications/, /api/focus-sessions/activa/
(lecturas) que aproximan el polling real de un usuario conectado.
"""
import os
from locust import HttpUser, task, between


USERNAME = os.getenv("LOCUST_USERNAME", "")
PASSWORD = os.getenv("LOCUST_PASSWORD", "")


class ConnectedUser(HttpUser):
    # Pausa entre acciones: simula polling (~60s) mezclado con algo de actividad.
    # Ajusta para el patrón que quieras medir.
    wait_time = between(5, 30)

    def on_start(self):
        self.authed = False
        if not USERNAME or not PASSWORD:
            return
        with self.client.post(
            "/api/token/",
            json={"username": USERNAME, "password": PASSWORD},
            name="/api/token/",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                try:
                    access = resp.json().get("access")
                except Exception:
                    access = None
                if access:
                    self.client.headers.update({"Authorization": f"Bearer {access}"})
                    self.authed = True
                    resp.success()
                else:
                    resp.failure("sin access token")
            else:
                resp.failure(f"login {resp.status_code}")

    @task(3)
    def health(self):
        self.client.get("/api/health/", name="/api/health/")

    @task(2)
    def csrf(self):
        self.client.get("/api/csrf/", name="/api/csrf/")

    @task(5)
    def notifications(self):
        if self.authed:
            self.client.get("/api/notifications/", name="/api/notifications/")
        else:
            self.client.get("/api/csrf/", name="/api/csrf/ (anon)")

    @task(4)
    def me(self):
        if self.authed:
            self.client.get("/api/users/me/", name="/api/users/me/")

    @task(4)
    def focus_activa(self):
        if self.authed:
            self.client.get("/api/focus-sessions/activa/", name="/api/focus-sessions/activa/")
