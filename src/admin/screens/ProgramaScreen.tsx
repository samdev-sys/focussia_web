import { useState } from 'react';
import { Plus, Pencil, Trash2, Play, Save, CalendarDays, ArrowLeft } from 'lucide-react';
import {
  adminApi,
  adminService,
  leerError,
  type ProgramMonth,
  type MonthlyTraining,
  type ProgramDay,
  type Objetivo,
} from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Textarea, Select, Modal, Aviso,
  Cargando, Vacio, Checkbox, MediaField, useConfirmacion, useCarga,
} from '../components/ui';

const INTENCIONES = [
  ['reflexion', 'Reflexión'],
  ['accion', 'Acción'],
  ['disciplina', 'Disciplina'],
  ['calma', 'Calma'],
  ['foco', 'Foco'],
  ['decision', 'Decisión'],
  ['energia', 'Energía'],
  ['cierre', 'Cierre'],
] as const;

export default function ProgramaScreen() {
  const [mesAbierto, setMesAbierto] = useState<ProgramMonth | null>(null);
  const [mesFrases, setMesFrases] = useState<ProgramMonth | null>(null);
  const { datos: meses, cargando, error, recargar } = useCarga(
    () => adminService.listarMeses(),
    [],
  );
  const confirmar = useConfirmacion();

  // Las frases son la otra mitad del módulo de cursos: van en vista propia
  // en vez de dentro de un modal, para que la lista larga respire.
  if (mesFrases) {
    return (
      <>
        <button
          onClick={() => setMesFrases(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#6236FF] dark:text-purple-300 hover:underline mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a la tabla maestra
        </button>
        <DiasScreen mes={mesFrases} />
      </>
    );
  }

  if (cargando) return <Cargando texto="Cargando la tabla maestra…" />;
  if (error) {
    return (
      <>
        <PageHeader titulo="Tabla maestra" descripcion="Los 12 meses del programa." />
        <Aviso tipo="error">{error}</Aviso>
      </>
    );
  }

  const sinCapacitacion = (meses ?? []).filter((m) => !m.training);

  return (
    <>
      <PageHeader
        titulo="Tabla maestra"
        descripcion="Los 12 meses del programa: tema, capacitación del mes y frases diarias."
        acciones={
          <Button
            onClick={() => {
              const usado = (meses ?? []).map((m) => m.month_number);
              const siguiente = Array.from({ length: 12 }, (_, i) => i + 1).find(
                (n) => !usado.includes(n),
              );
              if (siguiente === undefined) {
                alert('Ya están los 12 meses cargados.');
                return;
              }
              const nuevo: ProgramMonth = {
                id: 0,
                month_number: siguiente,
                theme_name: '',
                training_theme: '',
                formative_objective: '',
                training: null,
              };
              setMesAbierto(nuevo);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo mes
          </Button>
        }
      />

      {sinCapacitacion.length > 0 && (
        <div className="mb-5">
          <Aviso tipo="error">
            {sinCapacitacion.length === 1 ? 'El mes' : 'Los meses'}{' '}
            {sinCapacitacion.map((m) => m.month_number).join(', ')}{' '}
            {sinCapacitacion.length === 1 ? 'no tiene' : 'no tienen'} capacitación. La pantalla de
            cursos le dirá “Video próximamente” a la persona usuaria.
          </Aviso>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(meses ?? []).map((mes) => (
          <Card
            key={mes.id}
            titulo={`Mes ${mes.month_number}`}
            descripcion={mes.theme_name || 'Sin tema definido'}
            acciones={
              <>
                <Button
                  variant="suave"
                  onClick={() => setMesFrases(mes)}
                  titulo="Ver y editar las frases de este mes"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Frases
                </Button>
                <Button variant="suave" onClick={() => setMesAbierto(mes)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirmar.pedir(
                      `Eliminar el mes ${mes.month_number}`,
                      `Se va a borrar “${mes.theme_name}” junto con su capacitación y sus frases.`,
                      async () => {
                        await adminService.borrarMes(mes.id);
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
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Tema de capacitación
                </p>
                <p className="text-slate-700 dark:text-gray-200 mt-0.5">
                  {mes.training_theme || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Objetivo formativo
                </p>
                <p className="text-slate-700 dark:text-gray-200 mt-0.5 leading-relaxed line-clamp-3">
                  {mes.formative_objective || '—'}
                </p>
              </div>

              {mes.training ? (
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Microcapacitación
                  </p>
                  <p className="text-slate-800 dark:text-gray-100 font-semibold mt-0.5">
                    {mes.training.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {mes.training.video_resuelto ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <Play className="w-3 h-3" />
                        {mes.training.video_file ? 'Video subido' : 'Video por URL'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Sin video
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      · {mes.training.duracion_minutos} min
                    </span>
                  </div>
                  {mes.training.objetivos?.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {mes.training.objetivos.length} objetivo
                      {mes.training.objetivos.length === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="pt-3 border-t border-gray-100 dark:border-white/10 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Sin capacitación
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {(meses ?? []).length === 0 && <Vacio>Todavía no hay meses cargados.</Vacio>}

      {mesAbierto && (
        <EditorMes
          mes={mesAbierto}
          onCerrar={() => setMesAbierto(null)}
          onGuardado={() => {
            setMesAbierto(null);
            recargar();
          }}
        />
      )}

      {confirmar.dialogo}
    </>
  );
}

// ── Editor de un mes (tema + capacitación) ──

function EditorMes({
  mes,
  onCerrar,
  onGuardado,
}: {
  mes: ProgramMonth;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = mes.id === 0;
  const existeCapacitacion = !!mes.training;

  const [mesForm, setMesForm] = useState({
    month_number: mes.month_number,
    theme_name: mes.theme_name,
    training_theme: mes.training_theme,
    formative_objective: mes.formative_objective,
  });
  const [conCapacitacion, setConCapacitacion] = useState(existeCapacitacion);
  const [cap, setCap] = useState<Partial<MonthlyTraining>>(
    mes.training ?? {
      title: '',
      content: '',
      duracion_minutos: 5,
      video_url: '',
      media_url: '',
      objetivos: [],
    },
  );
  const [videoArchivo, setVideoArchivo] = useState<File | null>(null);
  const [mediaArchivo, setMediaArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      // 1) El mes primero: la capacitación cuelga de él.
      const mesGuardado = esNuevo
        ? await adminService.crearMes(mesForm)
        : await adminService.editarMes(mes.id, mesForm);

      // 2) La capacitación, como mucho una por mes (unique en el backend).
      if (conCapacitacion) {
        const datos = new FormData();
        datos.set('month', String(mesGuardado.id));
        datos.set('title', cap.title ?? '');
        datos.set('content', cap.content ?? '');
        datos.set('duracion_minutos', String(cap.duracion_minutos ?? 5));
        datos.set('video_url', cap.video_url ?? '');
        datos.set('media_url', cap.media_url ?? '');
        datos.set('objetivos', JSON.stringify(cap.objetivos ?? []));
        if (videoArchivo) datos.set('video_file', videoArchivo);
        if (mediaArchivo) datos.set('media_file', mediaArchivo);

        if (mesGuardado.training?.id) {
          await adminApi.patch(`/api/admin/trainings/${mesGuardado.training.id}/`, datos);
        } else {
          await adminApi.post('/api/admin/trainings/', datos);
        }
      }

      setOk('Guardado. La app ya lo está sirviendo.');
      setTimeout(onGuardado, 700);
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
      ancho="max-w-3xl"
      titulo={esNuevo ? `Nuevo mes ${mes.month_number}` : `Mes ${mes.month_number}`}
      descripcion="El tema y la capacitación que ve la persona usuaria en Cursos."
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
      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      <div className="grid sm:grid-cols-[100px_1fr] gap-3">
        <Field etiqueta="Mes" requerido ayuda="1 a 12">
          <Input
            type="number"
            min={1}
            max={12}
            value={mesForm.month_number}
            disabled={!esNuevo}
            onChange={(e) => setMesForm({ ...mesForm, month_number: Number(e.target.value) })}
          />
        </Field>
        <Field etiqueta="Tema del mes" requerido>
          <Input
            value={mesForm.theme_name}
            onChange={(e) => setMesForm({ ...mesForm, theme_name: e.target.value })}
            placeholder="p. ej. Identidad y enfoque"
          />
        </Field>
      </div>

      <Field etiqueta="Tema de la capacitación">
        <Input
          value={mesForm.training_theme}
          onChange={(e) => setMesForm({ ...mesForm, training_theme: e.target.value })}
          placeholder="p. ej. Protege tu tiempo"
        />
      </Field>

      <Field
        etiqueta="Objetivo formativo"
        ayuda="Lo que la persona debería llevarse de este mes."
      >
        <Textarea
          value={mesForm.formative_objective}
          onChange={(e) => setMesForm({ ...mesForm, formative_objective: e.target.value })}
        />
      </Field>

      <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-4">
        <Checkbox
          etiqueta="Este mes tiene capacitación"
          ayuda="Desmarcá esto si el mes todavía no tiene video ni contenido."
          checked={conCapacitacion}
          onChange={setConCapacitacion}
        />

        {conCapacitacion && (
          <>
            <Field etiqueta="Título de la capacitación" requerido>
              <Input
                value={cap.title ?? ''}
                onChange={(e) => setCap({ ...cap, title: e.target.value })}
                placeholder="p. ej. Protege tu tiempo y dirige tu atención"
              />
            </Field>

            <Field etiqueta="Descripción" ayuda="Se muestra en la tarjeta del curso.">
              <Textarea
                value={cap.content ?? ''}
                onChange={(e) => setCap({ ...cap, content: e.target.value })}
              />
            </Field>

            <div className="grid sm:grid-cols-[140px_1fr] gap-3">
              <Field etiqueta="Duración (min)">
                <Input
                  type="number"
                  min={1}
                  value={cap.duracion_minutos ?? 5}
                  onChange={(e) =>
                    setCap({ ...cap, duracion_minutos: Number(e.target.value) })
                  }
                />
              </Field>
              <div className="space-y-3">
                <MediaField
                  etiqueta="Video"
                  url={cap.video_url ?? ''}
                  archivo={videoArchivo}
                  urlResuelta={mes.training?.video_resuelto}
                  onUrl={(v) => setCap({ ...cap, video_url: v })}
                  onArchivo={setVideoArchivo}
                  acepta="video/*"
                  ayuda="Pegá la URL de YouTube o subí el archivo. Si hay URL, gana la URL."
                />
                <MediaField
                  etiqueta="Imagen de portada"
                  url={cap.media_url ?? ''}
                  archivo={mediaArchivo}
                  urlResuelta={mes.training?.media_resuelto}
                  onUrl={(v) => setCap({ ...cap, media_url: v })}
                  onArchivo={setMediaArchivo}
                  ayuda="Se usa si no hay video para poner."
                />
              </div>
            </div>

            <EditorObjetivos
              objetivos={cap.objetivos ?? []}
              onChange={(objetivos) => setCap({ ...cap, objetivos })}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Objetivos de aprendizaje ──

function EditorObjetivos({
  objetivos,
  onChange,
}: {
  objetivos: Objetivo[];
  onChange: (v: Objetivo[]) => void;
}) {
  const actualizar = (i: number, campo: 'titulo' | 'descripcion', valor: string) => {
    const copia = objetivos.map((o, idx) => (idx === i ? { ...o, [campo]: valor } : o));
    onChange(copia);
  };

  return (
    <Field
      etiqueta="¿Qué aprenderá este mes?"
      ayuda="Aparecen como las tres tarjetas de la pantalla de Cursos."
    >
      <div className="space-y-2">
        {objetivos.map((o, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Input
                value={o.titulo ?? ''}
                onChange={(e) => actualizar(i, 'titulo', e.target.value)}
                placeholder={`Objetivo ${i + 1}`}
              />
              <Input
                value={o.descripcion ?? ''}
                onChange={(e) => actualizar(i, 'descripcion', e.target.value)}
                placeholder="Descripción corta"
              />
            </div>
            <Button
              variant="ghost"
              titulo="Quitar objetivo"
              onClick={() => onChange(objetivos.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="suave"
          onClick={() => onChange([...objetivos, { titulo: '', descripcion: '' }])}
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar objetivo
        </Button>
      </div>
    </Field>
  );
}

// ── Frases diarias ──

export function DiasScreen({ mes }: { mes: ProgramMonth }) {
  const [editando, setEditando] = useState<ProgramDay | null>(null);
  const { datos: dias, cargando, error, recargar } = useCarga(
    () => adminService.listarDias(mes.id),
    [mes.id],
  );
  const confirmar = useConfirmacion();

  if (cargando) return <Cargando texto="Cargando las frases…" />;
  if (error) return <Aviso tipo="error">{error}</Aviso>;

  const porDia = new Map((dias ?? []).map((d) => [d.day_number, d]));

  return (
    <>
      <PageHeader
        titulo={`Frases del mes ${mes.month_number}`}
        descripcion={`“${mes.theme_name}”. Cada día sale una frase y una pregunta de coaching.`}
        acciones={
          <Button
            onClick={() =>
              setEditando({
                id: 0,
                month: mes.id,
                month_number: mes.month_number,
                month_theme: mes.theme_name,
                day_number: primerVacio(porDia),
                phrase: '',
                intention: 'reflexion',
                technical_note: '',
                coaching_question: '',
                es_integracion: false,
                origen_integracion: '',
              })
            }
            disabled={porDia.size >= 31}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva frase
          </Button>
        }
      />

      {porDia.size === 0 && (
        <div className="mb-4">
          <Aviso tipo="error">
            Este mes no tiene frases. La pantalla de frases motivacionales va a mostrar
            “No hay contenido disponible”.
          </Aviso>
        </div>
      )}

      <Card>
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {(dias ?? []).map((dia) => (
            <div
              key={dia.id}
              className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-white/5 text-[#6236FF] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {dia.day_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 dark:text-gray-100">{dia.phrase}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">
                    {INTENCIONES.find(([v]) => v === dia.intention)?.[1] ?? dia.intention}
                  </span>
                  {dia.coaching_question && (
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400">
                      · tiene pregunta de coaching
                    </span>
                  )}
                  {dia.es_integracion && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      · día de integración
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="suave" onClick={() => setEditando(dia)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirmar.pedir(
                      `Borrar el día ${dia.day_number}`,
                      `Se va a borrar la frase “${dia.phrase.slice(0, 40)}…”.`,
                      async () => {
                        await adminService.borrarDia(dia.id);
                        recargar();
                      },
                    )
                  }
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {(dias ?? []).length === 0 && <Vacio>Sin frases cargadas para este mes.</Vacio>}
      </Card>

      {editando && (
        <EditorDia
          dia={editando}
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

function primerVacio(porDia: Map<number, ProgramDay>) {
  for (let n = 1; n <= 31; n++) if (!porDia.has(n)) return n;
  return 31;
}

function EditorDia({
  dia,
  onCerrar,
  onGuardado,
}: {
  dia: ProgramDay;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = dia.id === 0;
  const [form, setForm] = useState(dia);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = {
        month: form.month,
        day_number: form.day_number,
        phrase: form.phrase,
        intention: form.intention,
        technical_note: form.technical_note,
        coaching_question: form.coaching_question,
        es_integracion: form.es_integracion,
        origen_integracion: form.origen_integracion,
      };
      if (esNuevo) await adminService.crearDia(datos);
      else await adminService.editarDia(dia.id, datos);
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
      titulo={esNuevo ? `Nuevo día · mes ${dia.month_number}` : `Día ${dia.day_number}`}
      descripcion="La frase motivacional y la pregunta de coaching salen de este mismo registro."
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

      <div className="grid sm:grid-cols-[100px_1fr] gap-3">
        <Field etiqueta="Día" requerido>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.day_number}
            onChange={(e) => setForm({ ...form, day_number: Number(e.target.value) })}
          />
        </Field>
        <Field etiqueta="Intención">
          <Select
            value={form.intention}
            onChange={(e) => setForm({ ...form, intention: e.target.value })}
          >
            {INTENCIONES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field etiqueta="Frase del día" requerido ayuda="Máximo 280 caracteres.">
        <Textarea
          value={form.phrase}
          onChange={(e) => setForm({ ...form, phrase: e.target.value.slice(0, 280) })}
        />
        <span className="block text-[10px] text-gray-400 mt-1 text-right">
          {form.phrase.length}/280
        </span>
      </Field>

      <Field
        etiqueta="Pregunta de coaching"
        ayuda="Vacío = se usa la pregunta por defecto del módulo Coaching."
      >
        <Textarea
          value={form.coaching_question}
          onChange={(e) => setForm({ ...form, coaching_question: e.target.value })}
        />
      </Field>

      <Field etiqueta="Nota técnica" ayuda="Uso interno. No se muestra en la app.">
        <Textarea
          value={form.technical_note}
          onChange={(e) => setForm({ ...form, technical_note: e.target.value })}
        />
      </Field>

      <Checkbox
        etiqueta="Es un día de integración"
        ayuda="Contrasta las prioridades con acciones reales."
        checked={form.es_integracion}
        onChange={(v) => setForm({ ...form, es_integracion: v })}
      />

      {form.es_integracion && (
        <Field etiqueta="Módulo de origen" ayuda="p. ej. RUEDA_DE_VIDA">
          <Input
            value={form.origen_integracion}
            onChange={(e) => setForm({ ...form, origen_integracion: e.target.value })}
          />
        </Field>
      )}
    </Modal>
  );
}

