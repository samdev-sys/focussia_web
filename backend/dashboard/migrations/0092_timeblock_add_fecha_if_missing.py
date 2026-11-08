# -*- coding: utf-8 -*-
from django.db import migrations


def add_fecha_column(apps, schema_editor):
    connection = schema_editor.connection
    cursor = connection.cursor()
    
    table_name = 'dashboard_timeblock'
    try:
        if connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            if 'fecha' not in columns:
                try:
                    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
                except Exception:
                    pass
                try:
                    cursor.execute(f"UPDATE {table_name} SET fecha = date('now') WHERE fecha IS NULL")
                except Exception:
                    pass
        elif connection.vendor == 'postgresql':
            try:
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='dashboard_timeblock' AND column_name='fecha'
                """)
                exists = cursor.fetchone()
                if not exists:
                    try:
                        cursor.execute("ALTER TABLE dashboard_timeblock ADD COLUMN fecha date")
                    except Exception:
                        pass
                    try:
                        cursor.execute("UPDATE dashboard_timeblock SET fecha = CURRENT_DATE WHERE fecha IS NULL")
                    except Exception:
                        pass
                    try:
                        cursor.execute("ALTER TABLE dashboard_timeblock ALTER COLUMN fecha SET NOT NULL")
                    except Exception:
                        pass
            except Exception:
                pass
        else:
            try:
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
            except Exception:
                pass
    finally:
        try:
            cursor.close()
        except Exception:
            pass


def reverse_add_fecha_column(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0091_fase2_api_v1_models'),
    ]

    operations = [
        migrations.RunPython(add_fecha_column, reverse_add_fecha_column),
    ]
