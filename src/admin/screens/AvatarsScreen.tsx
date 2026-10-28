import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, Volume2, UserRound } from 'lucide-react';
import { adminApi, adminService, leerError, type Avatar } from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Textarea, Select, Modal, Aviso,
  Cargando, Vacio, Checkbox, MediaField, useConfirmacion, useCarga,
} from '../components/ui';

/**
 * Avatares del onboarding: la imagen que ve la persona, la voz que habla y el
 * mensaje de presentación.
 *
 * `image` e `intro_message_audio` son rutas en texto (lo que ya usaba la app)
 * y `image_file` / `intro_message_audio_file` son las subidas desde el panel.
 * El backend resuelve cuál gana: siempre la ruta en texto si existe.
 */
export default function AvatarsScreen() {
  const [editando, setEditando] = useState<Avatar | null>(null);
  const { datos: avatares, cargando, error, recargar } = useCarga(
    () => adminService.listarAvatares(),
    [],
  );
  const confirmar = useConfirmacion();

  if (cargando) return <Cargando texto="Cargando los avatares…" />;
  if (error) {
    return (
      <>
        <PageHeader titulo="Avatares" descripcion="Imágenes, voces y mensajes de presentación." />
        <Aviso tipo="error">{error}</Aviso>
      </>
    );
  }

  const lista = avatares ?? [];

  return (
    <>
      <PageHeader
        titulo="Avatares"
        descripcion="Con quién conversa la persona al empezar. Solo los activos aparecen en el onboarding."
        acciones={
          <Button
            onClick={() =>
              setEditando({
                id: 0,
                name: '',
                gender: 'female',
                image: '',
                image_file: null,
                image_file_url: '',
                image_resuelta: '',
                voice_id: '',
                intro_message_text: '',
                intro_message_audio: '',
                intro_message_audio_file: null,
                audio_file_url: '',
                audio_resuelto: '',
                is_active: true,
                created_at: '',
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo avatar
          </Button>
        }
      />

      {lista.length === 0 && (
        <div className="mb-5">
          <Aviso tipo="error">
            No hay avatares cargados. El onboarding no tiene con quién arrancar.
          </Aviso>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {lista.map((avatar) => (
          <Card
            key={avatar.id}
            titulo={avatar.name}
            descripcion={avatar.gender === 'male' ? 'Masculino' : 'Femenino'}
            acciones={
              <>
                <Button variant="suave" onClick={() => setEditando(avatar)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirmar.pedir(
                      `Eliminar “${avatar.name}”`,
                      'Si alguna persona ya eligió este avatar, su registro va a quedar apuntando a algo que ya no existe.',
                      async () => {
                        await adminService.borrarAvatar(avatar.id);
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
              <div className="flex items-center gap-3">
                {avatar.image_resuelta ? (
                  <img
                    src={avatar.image_resuelta}
                    alt={avatar.name}
                    className="w-14 h-14 rounded-full object-cover bg-gray-100 dark:bg-white/5 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <UserRound className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      avatar.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {avatar.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {avatar.voice_id && (
                    <p className="text-[10px] text-gray-400 mt-1.5 font-mono truncate">
                      voz: {avatar.voice_id}
                    </p>
                  )}
                </div>
              </div>

              {avatar.intro_message_text && (
                <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                  “{avatar.intro_message_text}”
                </p>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-white/10 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  {avatar.image_resuelta ? 'Con imagen' : 'Sin imagen'}
                </span>
                {avatar.audio_resuelto ? (
                  <a
                    href={avatar.audio_resuelto}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Volume2 className="w-3 h-3" />
                    Escuchar
                  </a>
                ) : (
                  <span>Sin audio</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {lista.length === 0 && <Vacio>Todavía no hay avatares.</Vacio>}

      {editando && (
        <EditorAvatar
          avatar={editando}
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

// ── Editor ──

function EditorAvatar({
  avatar,
  onCerrar,
  onGuardado,
}: {
  avatar: Avatar;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = avatar.id === 0;
  const [form, setForm] = useState({
    name: avatar.name,
    gender: avatar.gender as string,
    image: avatar.image,
    intro_message_text: avatar.intro_message_text,
    intro_message_audio: avatar.intro_message_audio,
    voice_id: avatar.voice_id,
    is_active: avatar.is_active,
  });
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [audioArchivo, setAudioArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.set('name', form.name);
      datos.set('gender', form.gender);
      datos.set('image', form.image);
      datos.set('intro_message_text', form.intro_message_text);
      datos.set('intro_message_audio', form.intro_message_audio);
      datos.set('voice_id', form.voice_id);
      datos.set('is_active', String(form.is_active));
      if (imagenArchivo) datos.set('image_file', imagenArchivo);
      if (audioArchivo) datos.set('intro_message_audio_file', audioArchivo);

      if (esNuevo) await adminApi.post('/api/admin/avatars/', datos);
      else await adminApi.patch(`/api/admin/avatars/${avatar.id}/`, datos);

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
      titulo={esNuevo ? 'Nuevo avatar' : avatar.name}
      descripcion="Cómo se presenta y qué dice al llegar la persona."
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

      <div className="grid sm:grid-cols-[1fr_140px] gap-3">
        <Field etiqueta="Nombre" requerido>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="p. ej. Aura"
          />
        </Field>
        <Field etiqueta="Género">
          <Select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
          </Select>
        </Field>
      </div>

      <MediaField
        etiqueta="Imagen"
        url={form.image}
        archivo={imagenArchivo}
        urlResuelta={avatar.image_resuelta}
        onUrl={(v) => setForm({ ...form, image: v })}
        onArchivo={setImagenArchivo}
        ayuda="Ruta (como la usa la app) o archivo subido. Si hay ruta, gana la ruta."
      />

      <Field
        etiqueta="Mensaje de presentación"
        requerido
        ayuda="Es lo que el avatar dice al iniciar. Se puede mostrar como texto o como audio."
      >
        <Textarea
          rows={4}
          value={form.intro_message_text}
          onChange={(e) => setForm({ ...form, intro_message_text: e.target.value })}
        />
      </Field>

      <MediaField
        etiqueta="Audio del mensaje"
        url={form.intro_message_audio}
        archivo={audioArchivo}
        urlResuelta={avatar.audio_resuelto}
        onUrl={(v) => setForm({ ...form, intro_message_audio: v })}
        onArchivo={setAudioArchivo}
        acepta="audio/*"
        ayuda="MP3 o similar. Si hay ruta, gana la ruta."
      />

      <Field
        etiqueta="ID de la voz"
        ayuda="Referencia al motor de texto a voz, si la app lo usa."
      >
        <Input
          value={form.voice_id}
          onChange={(e) => setForm({ ...form, voice_id: e.target.value })}
          placeholder="p. ej. es-CO-AuraNeural"
        />
      </Field>

      <Checkbox
        etiqueta="Avatar activo"
        ayuda="Solo los activos se ofrecen en el onboarding."
        checked={form.is_active}
        onChange={(v) => setForm({ ...form, is_active: v })}
      />
    </Modal>
  );
}
