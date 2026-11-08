# -*- coding: utf-8 -*-
"""Ajusta las tablas existentes a la definicion ACTUAL de los modelos.

En produccion algunas tablas quedaron con una definicion antigua (falta algo
como dashboard_focusiareport.period_start): el esquema existe pero no refleja
el modelo del codigo, con lo cual cualquier query sobre esas columnas casca
(500 en focusia-reports, DELETE en cascada de usuarios, etc.).

Para cada modelo de la app, compara las columnas reales con los campos del
modelo y agrega SOLO las que faltan usando el propio schema_editor de Django
(tipos, FKs, defaults identicos a una migracion).

Uso:
    python manage.py repair_schema_columns                # informe
    python manage.py repair_schema_columns --apply        # ejecuta
    python manage.py repair_schema_columns --app dashboard --apply
"""
import os

from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps


class Command(BaseCommand):
    help = 'Agrega a las tablas existentes las columnas que faltan segun los modelos actuales.'

    def add_arguments(self, parser):
        parser.add_argument('--app', default='dashboard')
        parser.add_argument('--apply', action='store_true')

    def _columns(self, cursor, table):
        try:
            return {
                c.name for c in connection.introspection.get_table_description(cursor, table)
            }
        except Exception:
            return set()

    def handle(self, *args, **options):
        app = options['app']
        run = options['apply']

        modelos = list(apps.get_app_config(app).get_models())
        plan = []
        with connection.cursor() as cursor:
            for model in modelos:
                table = model._meta.db_table
                existentes = self._columns(cursor, table)
                if not existentes:
                    continue  # la tabla no existe: eso lo cubre el flujo de migraciones
                faltantes = []
                for field in model._meta.concrete_fields:
                    if field.column in existentes:
                        continue
                    # M2M no vive en esta tabla (tabla intermedia)
                    if field.many_to_many:
                        continue
                    faltantes.append(field)
                if faltantes:
                    plan.append((model, table, faltantes))

        if not plan:
            self.stdout.write(self.style.SUCCESS('Todo sincronizado: ninguna columna faltante.'))
            return

        for model, table, faltantes in plan:
            self.stdout.write(self.style.WARNING(
                f'{table}: faltan {len(faltantes)} columna(s): '
                + ', '.join(f.column for f in faltantes)))

        if not run:
            self.stdout.write(self.style.NOTICE(
                'Informe solo. Ejecuta de nuevo con --apply.'))
            return

        self.stdout.write(self.style.MIGRATE_HEADING('Agregando columnas faltantes...'))
        from django.db.utils import ProgrammingError, OperationalError
        agregadas = 0
        with connection.schema_editor() as editor:
            for model, table, faltantes in plan:
                for field in faltantes:
                    try:
                        editor.add_field(model, field)
                        agregadas += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  + {table}.{field.column}'))
                    except (ProgrammingError, OperationalError) as exc:
                        self.stdout.write(self.style.ERROR(
                            f'  x {table}.{field.column}: {exc}'))
        self.stdout.write(self.style.SUCCESS(
            f'Listo. {agregadas} columna(s) agregadas.'))