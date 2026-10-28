import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { adminApi, adminService, leerError, type TribuTema } from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Textarea, Modal, Aviso,
  Cargando, Vacio, Checkbox, MediaField, useConfirmacion, useCarga,
} from '../components/ui';

/**
 * Temas semanales de Tribu.
 *
 * Solo puede haber uno activo (lo garantiza `TribuTemaSemana.save()`), así que
 * la pantalla lo trata como un estado único: activar uno desactiva el resto
 * sin que haya que perseguir al resto de la lista.
 */
export default function TribuScreen() {
  const [editando, setEditando] = useState<TribuTema | null>(null);
  const { datos: temas, cargando, error, recargar } = useCarga(
    () => adminService.listarTemasTribu(),
    [],
  );
  const confirmar = useConfirmacion();

  const activar = async (tema: TribuTema) => {
    try {
      await adminService.activarTemaTribu(tema.id);
      recargar();
    } catch (e) {
      alert(leerError(e));
    }
  };

  if (cargando) return <Cargando texto="Cargando los temas de Tribu…" />;
  if (error) {
    return (
      <>
        <PageHeader titulo="Tribu" descripcion="El tema de la semana." />
        <Aviso tipo="error">{error}</Aviso>
      </>
    );
  }

  const lista = temas ?? [];
  const activos = lista.filter((t) => t.activo);
  const inactivos = lista.filter((t) => !t.activo);

  return (
    <>
      <PageHeader
        titulo="Tribu"
        descripcion="El tema de la semana que ve toda la comunidad. Solo uno está activo a la vez."
        acciones={
          <Button
            onClick={() =>
              setEditando({
                id: 0,
                titulo: '',
                descripcion: '',
                reflexion: '',
                pregunta: '',
                imagen_url: '',
                imagen_file: null,
                imagen_file_url: '',
                imagen_resuelta: '',
                activo: true,
                creado: '',
                actualizado: '',
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo tema
          </Button>
        }
      />

      {activos.length === 0 && (
        <div className="mb-5">
          <Aviso tipo="error">
            No hay ningún tema activo. La pantalla de Tribu de la app no va a tener con qué
            trabajar esta semana.
          </Aviso>
        </div>
      )}

      {activos.length > 1 && (
        <div className="mb-5">
          <Aviso tipo="error">
            Hay {activos.length} temas marcados como activos. Esto no debería pasar: el servidor
            deja uno solo, pero conviene revisar.
          </Aviso>
        </div>
      )}

      {activos.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">
            Activo ahora
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            {activos.map((tema) => (
              <TemaCard
                key={tema.id}
                tema={tema}
                onEditar={() => setEditando(tema)}
                onActivar={activos.length === 1 ? undefined : () => activar(tema)}
                onBorrar={() =>
                  confirmar.pedir(
                    `Eliminar “${tema.titulo}”`,
                    'Este es el tema activo de la semana. La pantalla de Tribu se quedará sin contenido.',
                    async () => {
                      await adminService.borrarTemaTribu(tema.id);
                      recargar();
                    },
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">
          Historial · {inactivos.length}
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          {inactivos.map((tema) => (
            <TemaCard
              key={tema.id}
              tema={tema}
              onEditar={() => setEditando(tema)}
              onActivar={() => activar(tema)}
              onBorrar={() =>
                confirmar.pedir(
                  `Eliminar “${tema.titulo}”`,
                  'Este tema ya no está activo, pero se va a borrar igual.',
                  async () => {
                    await adminService.borrarTemaTribu(tema.id);
                    recargar();
                  },
                )
              }
            />
          ))}
        </div>
        {lista.length === 0 && <Vacio>Todavía no hay temas de Tribu cargados.</Vacio>}
      </div>

      {editando && (
        <EditorTema
          tema={editando}
          hayActivo={activos.length > 0}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
      {confirmar.dialogo}
    </>
  );
}

function TemaCard({
  tema,
  onEditar,
  onActivar,
  onBorrar,
}: {
  tema: TribuTema;
  onEditar: () => void;
  onActivar?: () => void;
  onBorrar: () => void;
}) {
  return (
    <Card
      titulo={tema.titulo}
      descripcion={tema.activo ? 'Visible en la app' : 'En el historial'}
      acciones={
        <>
          {onActivar && (
            <Button variant="suave" onClick={onActivar} titulo="Activar este tema">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Activar
            </Button>
          )}
          <Button variant="suave" onClick={onEditar}>
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
          <Button variant="danger" onClick={onBorrar}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        {tema.imagen_resuelta && (
          <img
            src={tema.imagen_resuelta}
            alt=""
            className="w-28 h-28 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-white/5"
          />
        )}
        <div className="flex-1 min-w-0 space-y-2 text-xs">
          {tema.descripcion && (
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed line-clamp-3">
              {tema.descripcion}
            </p>
          )}
          {tema.reflexion && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Reflexión
              </p>
              <p className="text-slate-600 dark:text-gray-300 leading-relaxed line-clamp-3 mt-0.5">
                {tema.reflexion}
              </p>
            </div>
          )}
          {tema.pregunta && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Pregunta
              </p>
              <p className="text-[#6236FF] dark:text-purple-300 leading-relaxed mt-0.5">
                {tema.pregunta}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Editor ──

function EditorTema({
  tema,
  hayActivo,
  onCerrar,
  onGuardado,
}: {
  tema: TribuTema;
  hayActivo: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = tema.id === 0;
  const [form, setForm] = useState({
    titulo: tema.titulo,
    descripcion: tema.descripcion,
    reflexion: tema.reflexion,
    pregunta: tema.pregunta,
    imagen_url: tema.imagen_url,
    activo: tema.activo,
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      // El archivo va por multipart porque `imagen_file` es un ImageField y
      // Django valida el formato; mandarlo como texto se perdería.
      const datos = new FormData();
      datos.set('titulo', form.titulo);
      datos.set('descripcion', form.descripcion);
      datos.set('reflexion', form.reflexion);
      datos.set('pregunta', form.pregunta);
      datos.set('imagen_url', form.imagen_url);
      datos.set('activo', String(form.activo));
      if (archivo) datos.set('imagen_file', archivo);

      if (esNuevo) await adminApi.post('/api/admin/tribu-themes/', datos);
      else await adminApi.patch(`/api/admin/tribu-themes/${tema.id}/`, datos);

      onGuardado();
    } catch (e) {
      setError(leerError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={esNuevo ? 'Nuevo tema de Tribu' : tema.titulo}
      descripcion="Lo que ve la comunidad durante la semana."
      pie={
        <>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={guardando}>
            <Save className="w-3.5 h-3.5" />
            Guardar
          </Button>
        </>
      }
    >
      {error && <Aviso tipo="error">{error}</Aviso>}

      <Field etiqueta="Título" requerido>
        <Input
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder="p. ej. Gestión del tiempo"
        />
      </Field>

      <MediaField
        etiqueta="Imagen del tema"
        url={form.imagen_url}
        archivo={archivo}
        urlResuelta={tema.imagen_resuelta}
        onUrl={(v) => setForm({ ...form, imagen_url: v })}
        onArchivo={setArchivo}
        ayuda="Se muestra como portada del tema."
      />

      <Field etiqueta="Descripción" ayuda="El texto corto que resume el tema.">
        <Textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </Field>

      <Field etiqueta="Reflexión" ayuda="El párrafo largo de la semana.">
        <Textarea
          value={form.reflexion}
          rows={5}
          onChange={(e) => setForm({ ...form, reflexion: e.target.value })}
        />
      </Field>

      <Field etiqueta="Pregunta de la semana" ayuda="La pregunta que se le hace a cada persona.">
        <Textarea
          value={form.pregunta}
          onChange={(e) => setForm({ ...form, pregunta: e.target.value })}
        />
      </Field>

      <Checkbox
        etiqueta="Activar este tema"
        ayuda={
          hayActivo
            ? 'Al activarlo, el tema activo de esta semana pasa a inactivo automáticamente.'
            : 'Quedará como el tema de la semana en curso.'
        }
        checked={form.activo}
        onChange={(v) => setForm({ ...form, activo: v })}
      />
    </Modal>
  );
}
