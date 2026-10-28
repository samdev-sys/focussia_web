import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, ExternalLink, Search } from 'lucide-react';
import { adminApi, adminService, leerError, type Juego, type LearningCategory } from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Textarea, Select, Modal, Aviso,
  Cargando, Vacio, Checkbox, MediaField, useConfirmacion, useCarga,
} from '../components/ui';

const TIPOS: [Juego['tipo'], string][] = [
  ['juego', 'Juego'],
  ['reto', 'Reto'],
  ['video', 'Video'],
  ['interactivo', 'Interactivo'],
];

/**
 * Catálogo de juegos y retos.
 *
 * A propósito es solo una lista de enlaces: la persona abre el juego en otra
 * pestaña y el panel no guarda progreso ni puntajes. Lo que sí se gestiona acá
 * es el orden, la categoría y la portada.
 */
export default function GamesScreen() {
  const [editando, setEditando] = useState<Juego | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const { datos: juegos, cargando, error, recargar } = useCarga(
    () => adminService.listarJuegos(),
    [],
  );
  const categorias = useCarga(() => adminService.listarCategorias(), []);
  const confirmar = useConfirmacion();

  const lista = juegos ?? [];

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return lista.filter((j) => {
      if (filtro === 'activos' && !j.activo) return false;
      if (filtro === 'inactivos' && j.activo) return false;
      if (!texto) return true;
      return (
        j.titulo.toLowerCase().includes(texto) ||
        j.descripcion.toLowerCase().includes(texto) ||
        j.url.toLowerCase().includes(texto)
      );
    });
  }, [lista, busqueda, filtro]);

  if (cargando) return <Cargando texto="Cargando los juegos…" />;
  if (error) {
    return (
      <>
        <PageHeader titulo="Juegos y retos" descripcion="El catálogo de enlaces." />
        <Aviso tipo="error">{error}</Aviso>
      </>
    );
  }

  const inactivos = lista.filter((j) => !j.activo).length;

  return (
    <>
      <PageHeader
        titulo="Juegos y retos"
        descripcion="Enlaces a juegos y retos. La persona abre el enlace; acá solo se ordena y se publica."
        acciones={
          <Button onClick={() => setEditando(nuevoJuego(lista))}>
            <Plus className="w-3.5 h-3.5" />
            Nuevo juego
          </Button>
        }
      />

      {lista.length === 0 && (
        <div className="mb-5">
          <Aviso tipo="error">
            Todavía no hay juegos en el catálogo. Si la app ya muestra una sección de juegos,
            va a salir vacía.
          </Aviso>
        </div>
      )}

      {lista.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título, descripción o URL"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
            {(
              [
                ['todos', `Todos (${lista.length})`],
                ['activos', `Publicados (${lista.length - inactivos})`],
                ['inactivos', `Ocultos (${inactivos})`],
              ] as ['todos' | 'activos' | 'inactivos', string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFiltro(id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  filtro === id
                    ? 'bg-white dark:bg-[#14142e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map((juego) => (
          <Card
            key={juego.id}
            titulo={juego.titulo}
            descripcion={TIPOS.find(([v]) => v === juego.tipo)?.[1] ?? juego.tipo}
            acciones={
              <>
                <Button variant="suave" onClick={() => setEditando(juego)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirmar.pedir(
                      `Eliminar “${juego.titulo}”`,
                      'El enlace desaparece del catálogo de la app.',
                      async () => {
                        await adminService.borrarJuego(juego.id);
                        recargar();
                      },
                    )
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              {juego.imagen_resuelta && (
                <img
                  src={juego.imagen_resuelta}
                  alt=""
                  className="w-full h-28 object-cover rounded-lg bg-gray-100 dark:bg-white/5"
                />
              )}

              {juego.descripcion && (
                <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {juego.descripcion}
                </p>
              )}

              <a
                href={juego.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{juego.url}</span>
              </a>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/10 text-[10px]">
                <span
                  className={`font-bold px-2 py-0.5 rounded-full ${
                    juego.activo
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {juego.activo ? 'Publicado' : 'Oculto'}
                </span>
                <span className="text-gray-400">orden {juego.orden}</span>
                {juego.categoria_nombre && (
                  <span className="text-gray-400 truncate">{juego.categoria_nombre}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {lista.length > 0 && filtrados.length === 0 && (
        <Vacio>Ningún juego coincide con esa búsqueda.</Vacio>
      )}
      {lista.length === 0 && <Vacio>El catálogo está vacío.</Vacio>}

      {editando && (
        <EditorJuego
          juego={editando}
          categorias={categorias.datos ?? []}
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

function nuevoJuego(lista: Juego[]): Juego {
  return {
    id: 0,
    titulo: '',
    descripcion: '',
    tipo: 'juego',
    url: '',
    imagen_url: '',
    imagen_file: null,
    imagen_file_url: '',
    imagen_resuelta: '',
    categoria: null,
    categoria_nombre: null,
    activo: true,
    orden: (lista[lista.length - 1]?.orden ?? 0) + 1,
    creado: '',
    actualizado: '',
  };
}

// ── Editor ──

function EditorJuego({
  juego,
  categorias,
  onCerrar,
  onGuardado,
}: {
  juego: Juego;
  categorias: LearningCategory[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = juego.id === 0;
  const [form, setForm] = useState({
    titulo: juego.titulo,
    descripcion: juego.descripcion,
    tipo: juego.tipo as string,
    url: juego.url,
    imagen_url: juego.imagen_url,
    categoria: juego.categoria,
    activo: juego.activo,
    orden: juego.orden,
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.set('titulo', form.titulo);
      datos.set('descripcion', form.descripcion);
      datos.set('tipo', form.tipo);
      datos.set('url', form.url);
      datos.set('imagen_url', form.imagen_url);
      // El backend espera el PK o null; mandarlo vacío no sería un null válido.
      datos.set('categoria', form.categoria === null ? '' : String(form.categoria));
      datos.set('activo', String(form.activo));
      datos.set('orden', String(form.orden));
      if (archivo) datos.set('imagen_file', archivo);

      if (esNuevo) await adminApi.post('/api/admin/juegos/', datos);
      else await adminApi.patch(`/api/admin/juegos/${juego.id}/`, datos);

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
      titulo={esNuevo ? 'Nuevo juego o reto' : juego.titulo}
      descripcion="Un enlace, una portada y a qué categoría pertenece."
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
          placeholder="p. ej. El sudoku del enfoque"
        />
      </Field>

      <Field etiqueta="Enlace" requerido ayuda="Se abre en una pestaña nueva desde la app.">
        <Input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://…"
        />
      </Field>

      <Field etiqueta="Descripción" ayuda="Dos líneas alcanzan. Es lo que se lee en la tarjeta.">
        <Textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </Field>

      <MediaField
        etiqueta="Portada"
        url={form.imagen_url}
        archivo={archivo}
        urlResuelta={juego.imagen_resuelta}
        onUrl={(v) => setForm({ ...form, imagen_url: v })}
        onArchivo={setArchivo}
        ayuda="Si hay URL, gana la URL sobre el archivo."
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <Field etiqueta="Tipo">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field etiqueta="Orden" ayuda="Menor = más arriba.">
          <Input
            type="number"
            min={0}
            value={form.orden}
            onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
          />
        </Field>
        <Field etiqueta="Categoría" ayuda="Opcional.">
          <Select
            value={form.categoria ?? ''}
            onChange={(e) =>
              setForm({ ...form, categoria: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.order}. {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Checkbox
        etiqueta="Publicado"
        ayuda="Si lo desmarcás, el juego sigue guardado pero no le aparece a nadie."
        checked={form.activo}
        onChange={(v) => setForm({ ...form, activo: v })}
      />
    </Modal>
  );
}
