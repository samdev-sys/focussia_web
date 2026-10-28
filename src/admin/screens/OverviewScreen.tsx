import { Link2 } from 'lucide-react';
import { adminService } from '../lib/adminApi';
import { Card, PageHeader, Cargando, Aviso, Vacio, useCarga } from '../components/ui';
import type { Seccion } from '../components/AdminLayout';

function Stat({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
}: {
  etiqueta: string;
  valor: number | string;
  detalle?: string;
  tono?: 'neutro' | 'alerta' | 'ok';
}) {
  const tonos = {
    neutro: 'text-slate-900 dark:text-white',
    alerta: 'text-amber-600 dark:text-amber-400',
    ok: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="bg-white dark:bg-[#14142e] rounded-2xl border border-gray-100 dark:border-white/10 p-4 shadow-sm">
      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{etiqueta}</p>
      <p className={`text-2xl font-extrabold mt-1.5 ${tonos[tono]}`}>{valor}</p>
      {detalle && <p className="text-[10px] text-gray-400 mt-1">{detalle}</p>}
    </div>
  );
}

export default function OverviewScreen({ onIr }: { onIr: (s: Seccion) => void }) {
  const { datos, cargando, error, recargar } = useCarga(() => adminService.overview(), []);

  if (cargando) return <Cargando />;
  if (error || !datos) {
    return (
      <>
        <PageHeader titulo="Resumen" descripcion="Estado del contenido publicado." />
        <div className="space-y-3">
          <Aviso tipo="error">{error ?? 'No se pudo cargar el resumen.'}</Aviso>
          <button
            onClick={recargar}
            className="text-xs font-semibold text-[#6236FF] hover:underline"
          >
            Reintentar
          </button>
        </div>
      </>
    );
  }

  const { programa, tribu, aprendizaje, avatares, juegos, usuarios } = datos;
  const sinVideo = programa.capacitaciones_sin_video;

  return (
    <>
      <PageHeader
        titulo="Resumen"
        descripcion="Qué hay publicado hoy y qué falta por completar."
        acciones={
          <button
            onClick={recargar}
            className="text-xs font-semibold text-[#6236FF] hover:underline"
          >
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat
          etiqueta="Personas usuarias"
          valor={usuarios.total}
          detalle={`${usuarios.completaron_mes_actual} completaron la capacitación del mes 1`}
        />
        <Stat
          etiqueta="Meses del programa"
          valor={programa.meses}
          detalle={`${programa.meses_completos} con los 30 días cargados`}
        />
        <Stat
          etiqueta="Juegos activos"
          valor={juegos.activos}
          detalle={`${juegos.total} en total`}
        />
        <Stat
          etiqueta="Avatares activos"
          valor={avatares.activos}
          detalle={`${avatares.total} en total`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card
          titulo="Tabla maestra del programa"
          descripcion="Los 12 meses que sostienen el módulo de cursos."
          acciones={
            <button
              onClick={() => onIr('programa')}
              className="text-[11px] font-semibold text-[#6236FF] hover:underline"
            >
              Abrir
            </button>
          }
        >
          <dl className="space-y-2.5 text-xs">
            <Fila etiqueta="Días cargados" valor={programa.dias} />
            <Fila
              etiqueta="Meses sin capacitación"
              valor={programa.meses_sin_capacitacion.length}
              detalle={
                programa.meses_sin_capacitacion.length
                  ? `Meses ${programa.meses_sin_capacitacion.join(', ')}`
                  : 'Todo bien'
              }
              alerta={programa.meses_sin_capacitacion.length > 0}
            />
            <Fila
              etiqueta="Capacitaciones sin video"
              valor={sinVideo.length}
              detalle={
                sinVideo.length ? `Meses ${sinVideo.join(', ')}` : 'Todas tienen video'
              }
              alerta={sinVideo.length > 0}
            />
          </dl>
        </Card>

        <Card
          titulo="Tema de Tribu"
          descripcion="Solo hay un tema activo a la vez."
          acciones={
            <button
              onClick={() => onIr('tribu')}
              className="text-[11px] font-semibold text-[#6236FF] hover:underline"
            >
              Abrir
            </button>
          }
        >
          {tribu.tema_activo ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {tribu.tema_activo.titulo}
              </p>
              {tribu.tema_activo.descripcion && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {tribu.tema_activo.descripcion}
                </p>
              )}
              {tribu.tema_activo.imagen_resuelta && (
                <img
                  src={tribu.tema_activo.imagen_resuelta}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg mt-2"
                />
              )}
              <p className="text-[10px] text-gray-400">Total de temas: {tribu.temas}</p>
            </div>
          ) : (
            <Vacio>No hay ningún tema de Tribu activo.</Vacio>
          )}
        </Card>

        <Card
          titulo="Aprendizaje e INICIO"
          acciones={
            <button
              onClick={() => onIr('aprendizaje')}
              className="text-[11px] font-semibold text-[#6236FF] hover:underline"
            >
              Abrir
            </button>
          }
        >
          <dl className="space-y-2.5 text-xs">
            <Fila etiqueta="Categorías" valor={aprendizaje.categorias} />
            <Fila etiqueta="Módulos de referencia" valor={aprendizaje.modulos} />
            <Fila etiqueta="Bloques de la visita guiada" valor={aprendizaje.bloques_guia} />
          </dl>
        </Card>

        <Card
          titulo="Atajos"
          descripcion="Lo que más se toca día a día."
        >
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['programa', 'Editar消息称'],
                ['tribu', 'Cambiar tema'],
                ['juegos', 'Subir un juego'],
                ['avatares', 'Ajustar avatares'],
              ] as [Seccion, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => onIr(id)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5 text-[#6236FF]" />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Fila({
  etiqueta,
  valor,
  detalle,
  alerta,
}: {
  etiqueta: string;
  valor: number;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{etiqueta}</dt>
      <dd className="text-right">
        <span
          className={`font-bold ${alerta ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}
        >
          {valor}
        </span>
        {detalle && <span className="block text-[10px] text-gray-400">{detalle}</span>}
      </dd>
    </div>
  );
}
