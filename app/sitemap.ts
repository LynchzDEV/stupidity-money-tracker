import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sliptrack.app/login',
      lastModified: new Date('2026-05-21'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
