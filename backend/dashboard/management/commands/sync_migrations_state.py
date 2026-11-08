# -*- coding: utf-8 -*-
"""Repara el desfase entre el registro de migraciones (django_migrations) y el
esquema real de la base de datos.

Contexto: en produccion el esquema ya contenia tablas/columnas cuya migracion
no quedo registrada como aplicada (p. ej. dashboard_timeblock.fecha), asi que
`migrate` intentaba recrearlas y moria con DuplicateColumn / relation already
exists en cada despliegue.

Estrategia, migracion a migracion en orden de la cadena:
  - Si TODO su resultado esquematizable (tablas por CreateModel, columnas por
    AddField) ya existe  ->  se marca como aplicada (fake).
  - Si falta algo        ->  modo reparacion: las operaciones cuyo resultado ya
    existe se registran solo en el estado (SeparateDatabaseAndState) y las que
    faltan se aplican de verdad. Nunca se borran datos; los RunPython/RunSQL se
    omiten (la semilla ya deberia existir en la BD con historia).

Uso:
    python manage.py sync_migrations_state            # vista previa
    python manage.py sync_migrations_state --apply    # ejecuta el plan
"""
import os

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.operations.special import SeparateDatabaseAndState
from django.db.migrations.recorder import MigrationRecorder


class Command(BaseCommand):
    help = 'Sincroniza django_migrations con el esquema real (fake de lo ya existente).'

    def add_arguments(self, parser):
        parser.add_argument('--app', default='dashboard',
                            help='App cuyas migraciones pendientes se revisan.')
        parser.add_argument('--apply', action='store_true',
                            help='Ejecuta el plan (por defecto solo lo imprime).')

    # ------------------------------------------------------------------ #
    # Introspeccion del esquema real
    # ------------------------------------------------------------------ #
    def _snapshot(self):
        with connection.cursor() as cursor:
            tables = set(connection.introspection.table_names(cursor))
            columns = {}
            for table in tables:
                try:
                    columns[table] = {
                        c.name for c in connection.introspection.get_table_description(cursor, table)
                    }
                except Exception:  # pragma: no cover - tabla opaca
                    columns[table] = set()
        debug = os.environ.get('SYNC_DEBUG')
        if debug and 'dashboard_accionsugerida' in columns:
            self.stdout.write(f'DEBUG accionsugerida: {sorted(columns["dashboard_accionsugerida"])}')
        return tables, columns

    @staticmethod
    def _table_name(app_label, model_name):
        # Django: <app_label>_<model_name.lower()> sin separadores.
        try:
            from django.apps import apps
            return apps.get_model(app_label, model_name)._meta.db_table
        except LookupError:
            return f'{app_label}_{model_name.lower()}'

    @staticmethod
    def _attname(name, field):
        # ForeignKey/OneToOne crean la columna con sufijo _id; el campo de la
        # migracion todavia no esta ligado a un modelo (.column no sirve).
        try:
            from django.db.models import ForeignKey
            if isinstance(field, ForeignKey):
                return f'{name}_id'
        except Exception:
            pass
        return name

    def _checks(self, app, migration, tables, columns):
        """[(satisfecho, descripcion)] de lo esquematizable que exige la migracion."""
        result = []
        for op in migration.operations:
            kind = type(op).__name__
            if kind == 'CreateModel':
                table = self._table_name(app, op.name)
                esta = table in tables
                result.append((esta, f'tabla {op.name}' + ('' if esta else ': NO existe')))
            elif kind == 'AddField':
                table = self._table_name(app, op.model_name)
                column = self._attname(op.name, op.field)
                esta = table in columns and column in columns[table]
                result.append((esta,
                               f'columna {op.model_name}.{column}' + ('' if esta else ': NO existe')))
            elif kind == 'RemoveField':
                table = self._table_name(app, op.model_name)
                column = self._attname(op.name, op.field)
                esta = table not in columns or column not in columns.get(table, set())
                result.append((esta,
                               f'(ausencia de columna) {op.model_name}.{column}'
                               + ('' if esta else ': AUN existe')))
        return result

    def _repair_operations(self, app, migration, tables, columns, notes):
        """Modo reparacion: por operacion, deja solo el DDL de lo que falta y
        registra el resto en el estado. Muta `migration.operations`."""
        nuevas = []
        for op in migration.operations:
            kind = type(op).__name__
            if kind == 'CreateModel':
                if self._table_name(app, op.name) in tables:
                    notes.append(f'CreateModel {op.name}: tabla ya existe -> solo estado')
                    nuevas.append(SeparateDatabaseAndState(state_operations=[op]))
                    continue
                nuevas.append(op)
            elif kind == 'AddField':
                table = self._table_name(app, op.model_name)
                column = self._attname(op.name, op.field)
                if table in columns and column in columns[table]:
                    notes.append(f'AddField {op.model_name}.{column}: ya existe -> solo estado')
                    nuevas.append(SeparateDatabaseAndState(state_operations=[op]))
                    continue
                nuevas.append(op)
            elif kind == 'RemoveField':
                table = self._table_name(app, op.model_name)
                column = self._attname(op.name, op.field)
                if table in columns and column in columns[table]:
                    nuevas.append(op)  # retirar de verdad la columna residual
                else:
                    notes.append(f'RemoveField {op.model_name}.{column}: no existe -> solo estado')
                    nuevas.append(SeparateDatabaseAndState(state_operations=[op]))
            elif kind == 'RunPython':
                notes.append('RunPython omitido (modo reparacion): el contenido ya debio sembrarse')
                continue
            elif kind == 'RunSQL':
                notes.append('RunSQL omitido (modo reparacion)')
                continue
            elif kind == 'AlterModelOptions':
                nuevas.append(op)  # ya es solo estado
            elif kind in ('AlterField', 'AlterUniqueTogether', 'AlterIndexTogether',
                          'AddConstraint', 'AddIndex'):
                # El DDL ya existe (o es fragil de repetir en PG); se registra
                # en el estado sin tocar la BD.
                notes.append(f'{kind} -> solo estado (modo reparacion)')
                nuevas.append(SeparateDatabaseAndState(state_operations=[op]))
            else:
                nuevas.append(op)
        migration.operations = nuevas

    # ------------------------------------------------------------------ #
    def handle(self, *args, **options):
        app = options['app']
        run = options['apply']

        executor = MigrationExecutor(connection)
        loader = executor.loader
        disk = {key: mig for key, mig in loader.disk_migrations.items() if key[0] == app}
        recorder = MigrationRecorder(connection)
        applied = set(recorder.applied_migrations())
        pending = sorted(
            [(key, mig) for key, mig in disk.items() if key not in applied],
            key=lambda km: km[0][1],
        )

        tables, columns = self._snapshot()
        self.stdout.write(self.style.MIGRATE_HEADING(
            f'{len(pending)} migracion(es) pendientes de "{app}"'))

        plan = []
        for key, mig in pending:
            checks = self._checks(app, mig, tables, columns)
            ok = all(s for s, _ in checks)
            modo = 'fake' if ok else 'apply'
            plan.append((key, modo, [d for _, d in checks]))

        for key, modo, details in plan:
            color = self.style.SUCCESS if modo == 'fake' else self.style.WARNING
            etiqueta = 'FAKE ' if modo == 'fake' else 'APPLY'
            self.stdout.write(f'{color(etiqueta)} {key[1]}')
            for line in details:
                self.stdout.write(f'        {line}')

        if not run:
            self.stdout.write(self.style.NOTICE(
                'Vista previa. Ejecuta de nuevo con --apply para sincronizar.'))
            return

        self.stdout.write(self.style.MIGRATE_HEADING('Aplicando plan...'))
        for key, modo, _ in plan:
            name = key[1]
            self.stdout.write(f'  migrate {app} {name}{" --fake" if modo == "fake" else ""}')
            try:
                # Executor fresco en cada paso: su loader debe ver el registro
                # actualizado por los pasos anteriores.
                step_executor = MigrationExecutor(connection)
                if modo == 'fake':
                    step_executor.migrate([key], fake=True)
                else:
                    tables_ok, columns_ok = self._snapshot()
                    notas = []
                    mig = step_executor.loader.disk_migrations[key]
                    self._repair_operations(app, mig, tables_ok, columns_ok, notas)
                    for nota in notas:
                        self.stdout.write(f'        ~ {nota}')
                    step_executor.migrate([key], plan=None)
            except Exception as exc:
                self.stderr.write(self.style.ERROR(
                    f'El paso {name} (modo {modo}) fallo: {exc!r}\n'
                    'Revisa la traza; la sync se detuvo en ese punto.'))
                raise
            self.stdout.write(self.style.SUCCESS(f'  OK {name}'))

        # Cualquier resto (otras apps o pasos posteriores) aplica normal.
        final_executor = MigrationExecutor(connection)
        final_executor.migrate(final_executor.loader.graph.leaf_nodes())
        self.stdout.write(self.style.SUCCESS('Registro sincronizado.'))
