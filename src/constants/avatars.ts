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