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
          return html
            .replace(
              /<!--\s*gh-pages-css-start\s*-->[\s\S]*?<!--\s*gh-pages-css-end\s*-->/g,
              ''
            )
            .replace(
              /<!--\s*gh-pages-js-start\s*-->[\s\S]*?<!--\s*gh-pages-js-end\s*-->/g,
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
            const rootIndexPath = path.resolve(__dirname, 'index.html');
            if (fs.existsSync(distAssetsDir) && fs.existsSync(rootIndexPath)) {
              const files = fs.readdirSync(distAssetsDir);
              const jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
              const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));
              let indexHtml = fs.readFileSync(rootIndexPath, 'utf8');
              if (cssFile) {
                const rawCss = fs
                  .readFileSync(path.join(distAssetsDir, cssFile), 'utf8')
                  .replace(/<\/style/gi, '<\\/style');
                const cssBlock =
                  '<!-- gh-pages-css-start -->\n  <style id="gh-static-css">' +
                  rawCss +
                  '</style>\n  <!-- gh-pages-css-end -->';
                indexHtml = indexHtml.replace(
                  /<!--\s*gh-pages-css-start\s*-->[\s\S]*?<!--\s*gh-pages-css-end\s*-->/,
                  () => cssBlock
                );
              }
              if (jsFile) {
                const rawJs = fs
                  .readFileSync(path.join(distAssetsDir, jsFile), 'utf8')
                  .replace(/<\/script/gi, '<\\/script')
                  .replace(/<!--/g, '<\\!--');
                const jsBlock =
                  '<!-- gh-pages-js-start -->\n  <script>\n    (function () {\n      function runEmbeddedApp() {\n        if (window.ACADEMY_PAGES || window.__embeddedBooted) return;\n        window.__embeddedBooted = true;\n' +
                  rawJs +
                  '\n      }\n      var h = location.hostname || \'\';\n      var isDevHost =\n        location.port === \'3000\' ||\n        h === \'localhost\' ||\n        h === \'127.0.0.1\' ||\n        h.indexOf(\'.run.app\') !== -1;\n      if (isDevHost) {\n        window.addEventListener(\'load\', function () {\n          setTimeout(runEmbeddedApp, 1500);\n        });\n      } else if (document.readyState === \'loading\') {\n        document.addEventListener(\'DOMContentLoaded\', runEmbeddedApp);\n      } else {\n        runEmbeddedApp();\n      }\n    })();\n  </script>\n  <!-- gh-pages-js-end -->';
                indexHtml = indexHtml.replace(
                  /<!--\s*gh-pages-js-start\s*-->[\s\S]*?<!--\s*gh-pages-js-end\s*-->/,
                  () => jsBlock
                );
              }
              fs.writeFileSync(rootIndexPath, indexHtml, 'utf8');
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
