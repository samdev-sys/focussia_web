export const AVATAR_FILES: Record<number, string> = {
  1: '/avatars/John.jpeg',
  2: '/avatars/conrad.jpeg',
  3: '/avatars/Ashley.jpeg',
  4: '/avatars/Lia.jpeg',
  5: '/avatars/Monroe.jpeg',
  6: '/avatars/Sophya.jpeg',
};

// Fotos de los avatares (carpeta public/Variaciones) para pantallas de presentación
export const AVATAR_VARIACIONES: Record<number, string> = {
  1: '/Variaciones/JOHN_VARIACION_01.png',
  2: '/Variaciones/CONRAD_VARIACION_01.png',
  3: '/Variaciones/ASHLEY_VARIACION_01.png',
  4: '/Variaciones/LIA_VARIACION_01.png',
  5: '/Variaciones/MONROE_VARIACION_01.png',
  6: '/Variaciones/SOFIA_VARIACION_01.png',
};

// Resolución por nombre del avatar (los ids de BD pueden variar según el orden
// de creación; el nombre es lo que el usuario eligió en el onboarding)
export const AVATAR_VARIACION_POR_NOMBRE: Record<string, string> = {
  john: '/Variaciones/JOHN_VARIACION_01.png',
  conrad: '/Variaciones/CONRAD_VARIACION_01.png',
  ashley: '/Variaciones/ASHLEY_VARIACION_01.png',
  lia: '/Variaciones/LIA_VARIACION_01.png',
  monroe: '/Variaciones/MONROE_VARIACION_01.png',
  sophya: '/Variaciones/SOFIA_VARIACION_01.png',
  sofia: '/Variaciones/SOFIA_VARIACION_01.png',
};

export const AVATARS = [
  { index: 1, name: 'John', file: '/avatar_en_blanco/John.jpeg', genero: 'masculino', voz: '/voces avatar/john -mejorado.mp3' },
  { index: 2, name: 'Conrad', file: '/avatar_en_blanco/conrad.jpeg', genero: 'masculino', voz: '/voces avatar/conrad-mejorado.mp3' },
  { index: 3, name: 'Ashley', file: '/avatar_en_blanco/Ashley.jpeg', genero: 'femenino', voz: '/voces avatar/ashley-mejorado.mp3' },
  { index: 4, name: 'Lia', file: '/avatar_en_blanco/Lia.jpeg', genero: 'femenino', voz: '/voces avatar/lia-mejorado.mp3' },
  { index: 5, name: 'Monroe', file: '/avatar_en_blanco/Monroe.jpeg', genero: 'masculino', voz: '/voces avatar/monroe-mejorado.mp3' },
  { index: 6, name: 'Sophya', file: '/avatar_en_blanco/Sophya.jpeg', genero: 'femenino', voz: '/voces avatar/sophya-mejorado.mp3' },
];
export const AVATARS_DARK = [
  { index: 1, name: 'John', file: '/avatars/John.jpeg', genero: 'masculino', },
  { index: 2, name: 'Conrad', file: '/avatars/conrad.jpeg', genero: 'masculino',  },
  { index: 3, name: 'Ashley', file: '/avatars/Ashley.jpeg', genero: 'femenino',  },
  { index: 4, name: 'Lia', file: '/avatars/Lia.jpeg', genero: 'femenino' },
  { index: 5, name: 'Monroe', file: '/avatars/Monroe.jpeg', genero: 'masculino',  },
  { index: 6, name: 'Sophya', file: '/avatars/Sophya.jpeg', genero: 'femenino',},
]

// Fotos de estilo "ciber" (carpeta public/Avatars_ciber) para las pantallas
// oscuras de configuración, como Notificaciones.
export const AVATARS_CIBER: Record<number, string> = {
  1: '/Avatars_ciber/John (2).jpeg',
  2: '/Avatars_ciber/Conrad.jpeg',
  3: '/Avatars_ciber/Ashley.jpeg',
  4: '/Avatars_ciber/Lia (3).jpeg',
  5: '/Avatars_ciber/Monroe (2).jpeg',
  6: '/Avatars_ciber/Sophya (2).jpeg',
};

// ── Fotos de avatares para el módulo de Reportes (Doc 27) ──────────────────
export type ReportAvatarPose = 'bottom' | 'tab2' | 'person' | 'tab' | 'pc' | 'book';

export const AVATARS_REPORT_POSES: Record<ReportAvatarPose, Record<number, string>> = {
  // Lista principal de Reportes y Reporte semanal cerrado / sin acciones
  bottom: {
    1: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_49d3190a.jpg',
    2: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_82c1b1f7.jpg',
    3: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_a39f63c5.jpg',
    4: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_61f069a5.jpg',
    5: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_b7b92c8a.jpg',
    6: '/Avatars_bottom/Captura_de_pantalla_2026-10-26_202348.png_5f2c7ddc.jpg',
  },
  // Reporte mensual (tablet con lápiz sobre el escritorio)
  tab2: {
    1: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_85fba29e.jpg',
    2: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_3f7ae67c.jpg',
    3: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_182240b5.jpg',
    4: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_34872584.jpg',
    5: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_615047c6.jpg',
    6: '/Avatars_tab2/Captura_de_pantalla_2026-10-26_202426.png_27250f75.jpg',
  },
  // Reporte anual (frente al escritorio)
  person: {
    1: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_9465d66c.jpg',
    2: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_f23fcb79.jpg',
    3: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_154c0f65.jpg',
    4: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_1880f9f7.jpg',
    5: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_2c1056ec.jpg',
    6: '/Avatars_rep-person/Captura_de_pantalla_2026-10-26_202434.png_dd135e77.jpg',
  },
  // Historial de reportes anteriores (de pie con tablet)
  tab: {
    1: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_74fb50e7.jpg',
    2: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_0e3c0ea9.jpg',
    3: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_751b6fc7.jpg',
    4: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_9988f2ad.jpg',
    5: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_3c643d1d.jpg',
    6: '/Avatars_tab/Captura_de_pantalla_2026-10-26_202355.png_f2236135.jpg',
  },
  // Reporte en actualización (frente al computador)
  pc: {
    1: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_6e5607ad.jpg',
    2: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_3bf32998.jpg',
    3: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_16897061.jpg',
    4: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_aa797534.jpg',
    5: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_030c2bb1.jpg',
    6: '/Avatars_pc/Captura_de_pantalla_2026-10-26_202335.png_84b66c3b.jpg',
  },
  // Análisis pendiente, error, Focus activo y Notificaciones (escribiendo en cuaderno)
  book: {
    1: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_8aba668a.jpg',
    2: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_06f0665a.jpg',
    3: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_4ae19daf.jpg',
    4: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_ab712343.jpg',
    5: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_50ab1b45.jpg',
    6: '/Avatars_book/Captura_de_pantalla_2026-10-26_202443.png_2a3015df.jpg',
  },
};

export const AVATAR_DISPLAY_NAMES: Record<number, string> = {
  1: 'JOHN',
  2: 'CONRAD',
  3: 'ASHLEY',
  4: 'LÍA',
  5: 'MONROE',
  6: 'SOPHYA',
};

export function getReportAvatarHero(pose: ReportAvatarPose, avatarIndex?: number): string {
  const idx = avatarIndex && avatarIndex >= 1 && avatarIndex <= 6 ? avatarIndex : 4;
  return AVATARS_REPORT_POSES[pose][idx] || AVATARS_REPORT_POSES[pose][4];
}

export function getReportAvatarThumb(avatarIndex?: number): string {
  const idx = avatarIndex && avatarIndex >= 1 && avatarIndex <= 6 ? avatarIndex : 4;
  return AVATAR_FILES[idx] || AVATAR_FILES[4];
}

export function getReportAvatarName(avatarIndex?: number): string {
  const idx = avatarIndex && avatarIndex >= 1 && avatarIndex <= 6 ? avatarIndex : 4;
  return AVATAR_DISPLAY_NAMES[idx] || 'LÍA';
}