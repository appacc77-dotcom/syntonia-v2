import { defineConfig } from 'astro/config';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dshUrl = process.env.DSH_URL ?? 'http://127.0.0.1:57686';
const pagesBase = (process.env.PAGES_BASE ?? (process.env.GITHUB_ACTIONS === 'true' ? '/syntonia-v2' : '')).replace(/\/+$/, '');
const site = pagesBase ? 'https://appacc77-dotcom.github.io' : undefined;

/**
 * GitHub Pages отдаёт проект по /<repo>/, а в исходниках пути абсолютные.
 * После сборки переписываем только корневые пути в HTML/CSS на base.
 */
function rootRewriteIntegration(base) {
  return {
    name: 'syntonia-root-rewrite',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (!base) return;
        const prefix = base.replace(/^\/+/, '').replace(/\/+$/, '');
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const attrRe = new RegExp(`((?:href|src|action|poster)=["'])\\/(?!\\/|${escaped}\\/)`, 'g');
        const cssRe = new RegExp(`(url\\(\\s*["']?)\\/(?!\\/|${escaped}\\/)`, 'g');
        const liveRe = /(["'`])\/(kanban|structure\/pages)\//g;

        const visit = async (folder) => {
          for (const entry of await readdir(folder, { withFileTypes: true })) {
            const full = join(folder, entry.name);
            if (entry.isDirectory()) {
              await visit(full);
              continue;
            }
            if (!/\.(html|css)$/.test(entry.name)) continue;
            const before = await readFile(full, 'utf8');
            const after = before
              .replace(attrRe, `$1/${prefix}/`)
              .replace(cssRe, `$1/${prefix}/`)
              .replace(liveRe, `$1/${prefix}/$2/`);
            if (before !== after) await writeFile(full, after);
          }
        };

        await visit(fileURLToPath(dir));
      },
    },
  };
}

export default defineConfig({
  site,
  base: pagesBase || undefined,
  build: {
    format: 'file',
  },
  integrations: pagesBase ? [rootRewriteIntegration(pagesBase)] : [],
  devToolbar: {
    enabled: false,
  },
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    server: {
      proxy: {
        '/kanban': {
          target: dshUrl,
          changeOrigin: true,
        },
      },
    },
  },
});
