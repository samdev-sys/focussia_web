from locust import HttpUser, task, between

class FocusiaUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def health_check(self):
        self.client.get("/api/health/")

    @task
    def get_notifications(self):
        self.client.get("/api/notifications/")
