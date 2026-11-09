import {
  Plane, House, Car, TrendingUp, Sofa, Gem, GraduationCap, Heart, Globe, Star,
  Camera, Briefcase, Baby, Dumbbell, Utensils, Palmtree, Mountain, Music, Laptop, Sprout,
  PawPrint, Palette, BookOpen, Wallet, Ship, Bike, Wine, Gift, type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

export const ICONS: Record<string, ComponentType<LucideProps>> = {
  plane: Plane, house: House, car: Car, 'trending-up': TrendingUp, sofa: Sofa, gem: Gem,
  'graduation-cap': GraduationCap, heart: Heart, globe: Globe, star: Star, camera: Camera,
  briefcase: Briefcase, baby: Baby, dumbbell: Dumbbell, utensils: Utensils, palmtree: Palmtree,
  mountain: Mountain, music: Music, laptop: Laptop, sprout: Sprout, 'paw-print': PawPrint,
  palette: Palette, 'book-open': BookOpen, wallet: Wallet, ship: Ship, bike: Bike, wine: Wine, gift: Gift,
}
export const ICON_KEYS = Object.keys(ICONS)

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = ICONS[name] ?? Star
  return <Cmp strokeWidth={1.6} {...props} />
}

/** Tons discretos para as categorias (classe .tone-N em index.css). */
export const TONES = [0, 1, 2, 3, 4, 5, 6, 7]
