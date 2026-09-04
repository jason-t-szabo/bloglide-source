// src/lib/config.ts
import raw from '../../bloglide.config.json';

export interface BloglideConfig {
  blogId: string;
  idSaltVersion: number;
  site: { title: string; description: string; url: string; base: string; timezone: string };
  features: { topics: boolean; rss: boolean; gatedPosts: boolean; comments: boolean };
  backend: { apiBaseUrl: string | null };
}

export const bloglide = raw as BloglideConfig;