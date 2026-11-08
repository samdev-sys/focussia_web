# -*- coding: utf-8 -*-
from django.db import migrations, models
from datetime import date


def add_fecha_column(apps, schema_editor):
    connection = schema_editor.connection
    cursor = connection.cursor()
    
    # Check if column exists
    table_name = 'dashboard_timeblock'
    try:
        if connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            if 'fecha' in columns:
                return
            # Add column
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
            cursor.execute(f"UPDATE {table_name} SET fecha = date('now') WHERE fecha IS NULL")
        elif connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='dashboard_timeblock' AND column_name='fecha'
            """)
            if cursor.fetchone():
                return
            cursor.execute("ALTER TABLE dashboard_timeblock ADD COLUMN fecha date")
            cursor.execute("UPDATE dashboard_timeblock SET fecha = CURRENT_DATE WHERE fecha IS NULL")
            cursor.execute("ALTER TABLE dashboard_timeblock ALTER COLUMN fecha SET NOT NULL")
        else:
            # Try generic approach
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
    finally:
        cursor.close()


def reverse_add_fecha_column(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0091_fase2_api_v1_models'),
    ]

    operations = [
        migrations.RunPython(add_fecha_column, reverse_add_fecha_column),
    ]
