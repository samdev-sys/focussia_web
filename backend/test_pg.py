from django.db import connection
with connection.cursor() as c:
    c.execute('SELECT count(*) FROM dashboard_suplemento')
    print(c.fetchone()[0])
print('OK')
