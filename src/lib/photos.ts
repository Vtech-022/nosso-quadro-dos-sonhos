/** Fotografias reais (Unsplash) usadas na tela de acesso. */
const u = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`

export interface Scene { id: string; place: string; line: string }

export const SCENES: Scene[] = [
  { id: '1476514525535-07fb3b4ae5f1', place: 'Lago di Braies, Itália', line: 'A viagem que vocês vivem adiando.' },
  { id: '1502602898657-3e91760cbb34', place: 'Paris, França', line: 'Aquele lugar que os dois querem ver juntos.' },
  { id: '1493976040374-85c8e12f0c0e', place: 'Quioto, Japão', line: 'O outro lado do mundo, a dois.' },
  { id: '1506905925346-21bda4d32df4', place: 'Alpes', line: 'Os planos grandes, um passo de cada vez.' },
  { id: '1507525428034-b723cf961d3e', place: 'Beira do mar', line: 'Uma semana inteira sem pressa.' },
]

export const sceneUrl = (s: Scene, w = 2000) => u(s.id, w)

/** Imagem do destaque da tela inicial. */
export const HERO_PHOTO = u('1506905925346-21bda4d32df4', 1800)

/** Referências visuais para quando ainda não há sonhos. Não são gravadas. */
export const EXAMPLES = [
  { title: 'Conhecer o mundo', tag: 'Viagens', src: u('1502602898657-3e91760cbb34', 700) },
  { title: 'Nossa casa', tag: 'Casa própria', src: u('1512917774080-9991f1c4c750', 700) },
  { title: 'Pé na estrada', tag: 'Experiências', src: u('1500530855697-b586d89ba3ee', 700) },
  { title: 'Um refúgio na natureza', tag: 'Estilo de vida', src: u('1501785888041-af3ef285b470', 700) },
]
