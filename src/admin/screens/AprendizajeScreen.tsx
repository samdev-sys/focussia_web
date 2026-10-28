import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, Layers, ListOrdered, Compass } from 'lucide-react';
import {
  adminService,
  leerError,
  type LearningCategory,
  type LearningModule,
  type GuidedTourBlock,
} from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Textarea, Modal, Aviso,
  Cargando, Vacio, useConfirmacion, useCarga,
} from '../components/ui';

/**
 * Contenido de aprendizaje: categorías con sus módulos de referencia y los
 * bloques de la visita guiada de INICIO.
 *
 * Las categorías devuelven sus módulos anidados, así que una sola llamada
 * alcanza para pintar las dos listas.
 */
export default function AprendizajeScreen() {
  const [editandoModulo, setEditandoModulo] = useState<LearningModule | null>(null);
  const [editandoBloque, setEditandoBloque] = useState<GuidedTourBlock | null>(null);
  const [editandoCategoria, setEditandoCategoria] = useState<LearningCategory | null>(null);
  const confirmar = useConfirmacion();

  const categorias = useCarga(() => adminService.listarCategorias(), []);
  const bloques = useCarga(() => adminService.listarBloques(), []);

  const recargarTodo = () => {
    categorias.recargar();
    bloques.recargar();
  };

  if (categorias.cargando) return <Cargando texto="Cargando el contenido de aprendizaje…" />;
  if (categorias.error) {
    return (
      <>
        <PageHeader titulo="Aprendizaje" descripcion="Categorías, módulos y visita guiada." />
        <Aviso tipo="error">{categorias.error}</Aviso>
      </>
    );
  }

  const lista = categorias.datos ?? [];

  return (
    <>
      <PageHeader
        titulo="Aprendizaje e INICIO"
        descripcion="Categorías, módulos de referencia y los bloques de la visita guiada."
      />

      <div className="space-y-6">
        {/* ── Categorías y módulos ── */}
        <Card
          titulo="Categorías de aprendizaje"
          descripcion="Cada categoría agrupa sus módulos de referencia en orden."
          acciones={
            <Button
              onClick={() =>
                setEditandoCategoria({
                  id: 0,
                  slug: '',
                  name: '',
                  order: (lista[lista.length - 1]?.order ?? 0) + 1,
                  modules: [],
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva categoría
            </Button>
          }
        >
          {lista.length === 0 ? (
            <Vacio>No hay categorías cargadas.</Vacio>
          ) : (
            <div className="space-y-4">
              {lista.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden"
                >
                  <header className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/5">
                    <span className="w-7 h-7 rounded-lg bg-[#6236FF] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {cat.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{cat.slug}</p>
                    </div>
                    <Button variant="suave" onClick={() => setEditandoCategoria(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        confirmar.pedir(
                          `Eliminar “${cat.name}”`,
                          `Se borran también sus ${cat.modules.length} módulo(s) de referencia.`,
                          async () => {
                            await adminService.borrarCategoria(cat.id);
                            recargarTodo();
                          },
                        )
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </header>

                  <ul className="divide-y divide-gray-100 dark:divide-white/5">
                    {cat.modules.map((mod) => (
                      <li key={mod.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[10px] text-gray-400 w-6 shrink-0 text-right">
                          {mod.order}
                        </span>
                        <span className="flex-1 min-w-0 text-xs text-slate-700 dark:text-gray-200 truncate">
                          {mod.name}
                        </span>
                        <Button
                          variant="suave"
                          onClick={() => setEditandoModulo(mod)}
                          titulo="Editar módulo"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="danger"
                          titulo="Eliminar módulo"
                          onClick={() =>
                            confirmar.pedir(
                              `Eliminar “${mod.name}”`,
                              `Este módulo pertenece a la categoría ${cat.name}.`,
                              async () => {
                                await adminService.borrarModulo(mod.id);
                                recargarTodo();
                              },
                            )
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </li>
                    ))}
                    {cat.modules.length === 0 && (
                      <li className="px-4 py-3">
                        <p className="text-[11px] text-gray-400">Sin módulos todavía.</p>
                      </li>
                    )}
                  </ul>

                  <footer className="px-4 py-2 bg-gray-50/50 dark:bg-white/[0.03]">
                    <Button
                      variant="suave"
                      onClick={() =>
                        setEditandoModulo({
                          id: 0,
                          category: cat.id,
                          name: '',
                          order: (cat.modules[cat.modules.length - 1]?.order ?? 0) + 1,
                        })
                      }
                    >
                      <Plus className="w-3 h-3" />
                      Agregar módulo
                    </Button>
                  </footer>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Visita guiada ── */}
        <Card
          titulo="Bloques de la visita guiada"
          descripcion="El recorrido de INICIO. El orden es el orden en pantalla."
          acciones={
            <Button
              onClick={() =>
                setEditandoBloque({
                  id: 0,
                  slug: '',
                  title: '',
                  avatar_message: '',
                  order: (bloques.datos ?? []).length + 1,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo bloque
            </Button>
          }
        >
          {bloques.cargando ? (
            <Cargando texto="Cargando los bloques…" />
          ) : bloques.error ? (
            <Aviso tipo="error">{bloques.error}</Aviso>
          ) : (bloques.datos ?? []).length === 0 ? (
            <Vacio>No hay bloques de visita guiada.</Vacio>
          ) : (
            <ul className="space-y-2">
              {(bloques.datos ?? []).map((bloque) => (
                <li
                  key={bloque.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10"
                >
                  <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-white/5 text-[#6236FF] dark:text-purple-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {bloque.order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      {bloque.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">{bloque.slug}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed line-clamp-2">
                      {bloque.avatar_message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="suave" onClick={() => setEditandoBloque(bloque)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        confirmar.pedir(
                          `Eliminar “${bloque.title}”`,
                          'Este bloque desaparece de la visita guiada de INICIO.',
                          async () => {
                            await adminService.borrarBloque(bloque.id);
                            recargarTodo();
                          },
                        )
                      }
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {editandoCategoria && (
        <EditorCategoria
          categoria={editandoCategoria}
          onCerrar={() => setEditandoCategoria(null)}
          onGuardado={() => {
            setEditandoCategoria(null);
            recargarTodo();
          }}
        />
      )}
      {editandoModulo && (
        <EditorModulo
          modulo={editandoModulo}
          categorias={lista}
          onCerrar={() => setEditandoModulo(null)}
          onGuardado={() => {
            setEditandoModulo(null);
            recargarTodo();
          }}
        />
      )}
      {editandoBloque && (
        <EditorBloque
          bloque={editandoBloque}
          onCerrar={() => setEditandoBloque(null)}
          onGuardado={() => {
            setEditandoBloque(null);
            recargarTodo();
          }}
        />
      )}
      {confirmar.dialogo}
    </>
  );
}

// ── Editores ──

function EditorCategoria({
  categoria,
  onCerrar,
  onGuardado,
}: {
  categoria: LearningCategory;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = categoria.id === 0;
  const [form, setForm] = useState({
    name: categoria.name,
    slug: categoria.slug,
    order: categoria.order,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Si no escriben el slug a mano, se lo sacamos del nombre. */
  const onNombre = (nombre: string) => {
    const auto = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setForm({ name: nombre, slug: auto, order: form.order });
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = { name: form.name, slug: form.slug, order: form.order };
      if (esNuevo) await adminService.crearCategoria(datos);
      else await adminService.editarCategoria(categoria.id, datos);
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
      titulo={esNuevo ? 'Nueva categoría' : categoria.name}
      descripcion="El nombre es lo que ve la persona; el slug es la clave interna."
      ancho="max-w-lg"
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

      <Field etiqueta="Nombre" requerido>
        <Input
          value={form.name}
          onChange={(e) => onNombre(e.target.value)}
          placeholder="p. ej. Comunicación"
        />
      </Field>

      <div className="grid sm:grid-cols-[1fr_100px] gap-3">
        <Field etiqueta="Slug" requerido ayuda="Se genera solo a partir del nombre.">
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="comunicacion"
          />
        </Field>
        <Field etiqueta="Orden">
          <Input
            type="number"
            min={1}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </Field>
      </div>
    </Modal>
  );
}

function EditorModulo({
  modulo,
  categorias,
  onCerrar,
  onGuardado,
}: {
  modulo: LearningModule;
  categorias: LearningCategory[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = modulo.id === 0;
  const [form, setForm] = useState({
    name: modulo.name,
    order: modulo.order,
    category: modulo.category,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = { name: form.name, order: form.order, category: form.category };
      if (esNuevo) await adminService.crearModulo(datos);
      else await adminService.editarModulo(modulo.id, datos);
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
      titulo={esNuevo ? 'Nuevo módulo' : 'Editar módulo'}
      descripcion="Un módulo es una referencia de contenido, no un registro de progreso."
      ancho="max-w-lg"
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

      <Field etiqueta="Nombre del módulo" requerido>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="p. ej. Escucha activa"
        />
      </Field>

      <div className="grid sm:grid-cols-[1fr_100px] gap-3">
        <Field etiqueta="Categoría" requerido>
          <select
            value={form.category}
            disabled={!esNuevo}
            onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-gray-100 outline-none focus:border-[#6236FF]"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.order}. {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field etiqueta="Orden">
          <Input
            type="number"
            min={1}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </Field>
      </div>

      {!esNuevo && (
        <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          Para mover el módulo a otra categoría, eliminálo y creálo de nuevo.
        </p>
      )}
    </Modal>
  );
}

function EditorBloque({
  bloque,
  onCerrar,
  onGuardado,
}: {
  bloque: GuidedTourBlock;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = bloque.id === 0;
  const [form, setForm] = useState({
    title: bloque.title,
    slug: bloque.slug,
    order: bloque.order,
    avatar_message: bloque.avatar_message,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = {
        title: form.title,
        slug: form.slug,
        order: form.order,
        avatar_message: form.avatar_message,
      };
      if (esNuevo) await adminService.crearBloque(datos);
      else await adminService.editarBloque(bloque.id, datos);
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
      titulo={esNuevo ? 'Nuevo bloque' : 'Editar bloque'}
      descripcion="Cada bloque es una pantalla de la visita guiada con lo que dice el avatar."
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

      <div className="grid sm:grid-cols-[1fr_100px] gap-3">
        <Field etiqueta="Título" requerido>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="p. ej. Tu primer paso"
          />
        </Field>
        <Field etiqueta="Orden">
          <Input
            type="number"
            min={1}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field etiqueta="Slug" requerido ayuda="Identificador interno, único. Ej. BIENVENIDA.">
        <Input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="BIENVENIDA"
        />
      </Field>

      <Field etiqueta="Lo que dice el avatar" requerido>
        <Textarea
          rows={5}
          value={form.avatar_message}
          onChange={(e) => setForm({ ...form, avatar_message: e.target.value })}
        />
      </Field>

      <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
        <ListOrdered className="w-3 h-3" />
        Cambiar el orden mueve el bloque en la visita guiada de INICIO.
        <Compass className="w-3 h-3 ml-1" />
      </p>
    </Modal>
  );
}
