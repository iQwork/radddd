import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so relative URLs like
      // "./src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds and GitHub Pages subpaths. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        transformIndexHtml(html: string): string {
          return html.replace(
            /<!--\s*gh-pages-static-only-start\s*-->[\s\S]*?<!--\s*gh-pages-static-only-end\s*-->/g,
            ''
          );
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
            const distAssetsDir = path.join(distDir, 'assets');
            const rootAssetsDir = path.resolve(__dirname, 'assets');
            fs.mkdirSync(rootAssetsDir, {recursive: true});
            if (fs.existsSync(distAssetsDir)) {
              const files = fs.readdirSync(distAssetsDir);
              const jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
              const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));
              if (jsFile) {
                const rawJs = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf8');
                fs.writeFileSync(
                  path.join(rootAssetsDir, 'app.js'),
                  '(function () {\n' + rawJs + '\n})();\n'
                );
              }
              if (cssFile) {
                fs.copyFileSync(path.join(distAssetsDir, cssFile), path.join(rootAssetsDir, 'app.css'));
              }
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
