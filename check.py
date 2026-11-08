import sqlite3
conn = sqlite3.connect('backend/db.sqlite3')
cur = conn.cursor()
cur.execute('SELECT sql FROM sqlite_master WHERE type=\'table\' AND name=\'dashboard_timeblock\'')
row = cur.fetchone()
if row:
    print(row[0])
else:
    print('NOT FOUND')
conn.close()
