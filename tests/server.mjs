import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
export async function fixtureServer({ preview = false } = {}) {
  await mkdir('.test-runtime', { recursive: true });
  await build({
    entryPoints: ['tests/fixtures/frameworks.js'],
    outfile: '.test-runtime/frameworks.js',
    bundle: true,
    format: 'iife',
    alias: { vue: 'vue/dist/vue.esm-bundler.js' },
    define: {
      'process.env.NODE_ENV': '"development"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  });
  if (preview)
    await build({
      entryPoints: ['tests/fixtures/preview-bridge.ts'],
      outfile: '.test-runtime/preview-bridge.js',
      bundle: true,
      format: 'iife',
      target: 'es2022',
    });
  const server = createServer(async (req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    try {
      if (route === '/frame') {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          '<!doctype html><label>Frame email<input name="email" id="frame-email" type="email"></label>',
        );
        return;
      }
      if (preview && route === '/qa') {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          `<!doctype html><meta charset="utf-8"><title>Fake Filler Dev · bancada de testes</title><style>body{margin:0;font:14px Segoe UI,sans-serif;background:#e9edf8;color:#20263f}header{padding:15px 22px;background:#fff;border-bottom:1px solid #ccd2e5}h1{font-size:18px;margin:0 0 6px}p{margin:4px 0;font-size:12px}main{display:flex;align-items:flex-start;gap:20px;padding:20px}aside{width:390px;flex-shrink:0}iframe{border:1px solid #ccd2e5;border-radius:10px;background:white}#popup{width:390px;height:820px}#fixture{width:100%;height:1100px}.form{flex:1;min-width:300px}nav{display:flex;gap:8px;padding:10px 0}button,a,select{padding:7px;border:1px solid #aab2cd;background:white;border-radius:5px;color:#20263f}a{text-decoration:none}output{font-size:11px;overflow-wrap:anywhere}</style><header><h1>Fake Filler Dev · bancada de QA</h1><p>Interface e motor reais com adaptador das APIs Chrome. Este teste não instala a extensão nem comprova menus nativos.</p></header><main><aside><iframe id="popup" title="Popup Fake Filler Dev" src="/preview/popup.html?popup"></iframe><p>Contrato do submenu: Fake Filler Dev › Generate › tipo</p><select id="menu-kind" aria-label="Tipo do submenu Generate"></select><button id="menu-generate">Executar Generate no campo selecionado</button><output id="menu-status"></output></aside><div class="form"><nav><a href="/qa">Formulários HTML</a><a href="/qa?frameworks">React, Vue e Angular</a></nav><iframe id="fixture" title="Formulário de teste" src="${new URL(req.url, 'http://localhost').searchParams.has('frameworks') ? '/frameworks?fixture' : '/?fixture'}"></iframe></div></main><script src="/preview-bridge.js"></script>`,
        );
        return;
      }
      if (preview && route.startsWith('/preview/')) {
        const name = route.slice(9);
        if (!['popup.html', 'popup.js', 'styles.css'].includes(name)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        let body = await readFile('dist/' + name, 'utf8');
        if (name === 'popup.html')
          body = body.replace(
            '<script src="popup.js"',
            '<script src="/preview-bridge.js"></script><script src="popup.js"',
          );
        res.setHeader(
          'Content-Type',
          name.endsWith('.js')
            ? 'text/javascript'
            : name.endsWith('.css')
              ? 'text/css'
              : 'text/html',
        );
        res.end(body);
        return;
      }
      if (preview && route === '/preview-bridge.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(await readFile('.test-runtime/preview-bridge.js'));
        return;
      }
      if (route === '/frameworks') {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          '<!doctype html><meta charset="utf-8"><title>Framework QA</title><h1>Framework QA</h1><div id="react"></div><div id="vue"></div><qa-angular></qa-angular><p id="angular-error"></p><p id="react-verification"></p><p id="vue-verification"></p><p id="angular-verification"></p><label>CPF com máscara<input id="masked-cpf" name="cpf" maxlength="14"></label><output id="mask-output"></output><script src="/frameworks.js"></script>' +
            (preview ? '<script src="/preview-bridge.js"></script>' : ''),
        );
        return;
      }
      const path =
        route === '/frameworks.js'
          ? '.test-runtime/frameworks.js'
          : route === '/fixture.js'
            ? 'tests/fixtures/fixture.js'
            : 'tests/fixtures/forms.html';
      res.setHeader('Content-Type', route.endsWith('.js') ? 'text/javascript' : 'text/html');
      let body = await readFile(path, 'utf8');
      if (preview && !route.endsWith('.js')) body += '<script src="/preview-bridge.js"></script>';
      res.end(body);
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
