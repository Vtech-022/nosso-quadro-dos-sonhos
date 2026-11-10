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
