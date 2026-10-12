export interface WallpaperOption {
  id: string;
  name: string;
  category: 'illustration' | 'pattern' | 'gradient' | 'solid';
  type: 'image' | 'pattern' | 'css' | 'solid';
  url?: string;
  css?: string;
  repeat?: boolean;
  size?: string;
  description: string;
  previewThumbnail?: string;
}

export const DEFAULT_WALLPAPER_ID = 'sarissa-honeycomb';

export const CHAT_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'sarissa-honeycomb',
    name: 'Sarissa Honeycomb',
    category: 'pattern',
    type: 'pattern',
    url: '/wallpapers/sarissa-honeycomb.svg',
    repeat: true,
    size: '115px auto',
    description: 'Soft pastel pink geometric honeycomb (Default)',
  },
  {
    id: 'default-cats',
    name: 'Midnight Cats',
    category: 'illustration',
    type: 'image',
    url: '/wallpapers/default-cats.jpg',
    repeat: true,
    size: '420px auto',
    description: 'Playful cat doodles on dark canvas',
  },
  {
    id: 'whatsapp-doodle',
    name: 'Classic Doodle',
    category: 'pattern',
    type: 'pattern',
    url: '/wallpapers/whatsapp-doodle.svg',
    repeat: true,
    size: '360px auto',
    description: 'WhatsApp-style chat doodle icons',
  },
  {
    id: 'constellations',
    name: 'Constellations',
    category: 'pattern',
    type: 'pattern',
    url: '/wallpapers/constellations.svg',
    repeat: true,
    size: '320px auto',
    description: 'Celestial stars and crescent moon map',
  },
  {
    id: 'botanical',
    name: 'Sage Botanical',
    category: 'pattern',
    type: 'pattern',
    url: '/wallpapers/botanical.svg',
    repeat: true,
    size: '320px auto',
    description: 'Natural foliage and delicate leaves',
  },
  {
    id: 'gradient-emerald',
    name: 'Deep Emerald',
    category: 'gradient',
    type: 'css',
    css: 'radial-gradient(circle at 50% 0%, rgba(52, 211, 153, 0.18), transparent 50%), linear-gradient(140deg, #061e12 0%, #0d2818 50%, #03140b 100%)',
    description: 'Velvet dark botanical forest aura',
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Aura',
    category: 'gradient',
    type: 'css',
    css: 'radial-gradient(circle at 80% 20%, rgba(244, 114, 182, 0.22), transparent 40%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.25), transparent 40%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    description: 'Twilight purple and soft dusk glow',
  },
  {
    id: 'gradient-ocean',
    name: 'Pacific Deep',
    category: 'gradient',
    type: 'css',
    css: 'radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.2), transparent 45%), linear-gradient(145deg, #071927 0%, #0c2b42 60%, #04101b 100%)',
    description: 'Calm oceanic blue gradient',
  },
  {
    id: 'minimal-dots',
    name: 'Micro Dots',
    category: 'pattern',
    type: 'css',
    css: 'radial-gradient(rgba(148, 163, 184, 0.25) 1.2px, transparent 1.2px)',
    repeat: true,
    size: '22px 22px',
    description: 'Clean architectural minimalist dot grid',
  },
  {
    id: 'solid-none',
    name: 'Clean Slate (None)',
    category: 'solid',
    type: 'solid',
    css: 'transparent',
    description: 'Plain clean canvas matching app theme',
  },
];
