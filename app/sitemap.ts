import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sliptrack.app/',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://sliptrack.app/login',
      lastModified: new Date('2026-05-21'),
      changeFrequency: 'yearly',
      priority: 0.9,
    },
  ]
}
