# Desenvolvimento e contribuição

## Preparar o ambiente

Use Node.js 22.12+ e npm. Na raiz do repositório:

```sh
npm ci
npm run check
```

`check` executa lint, verificação de tipos, testes automatizados e build. A extensão compilada fica em `dist/`.

## Comandos

| Comando                | Finalidade                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run check`        | Executar lint, typecheck, testes unitários e build                   |
| `npm run format:check` | Conferir a formatação                                                |
| `npm run format`       | Formatar o código e a documentação                                   |
| `npm run lint`         | Executar ESLint                                                      |
| `npm run typecheck`    | Verificar os tipos TypeScript                                        |
| `npm test`             | Executar os testes Vitest                                            |
| `npm run build`        | Recriar a pasta `dist` com a extensão carregável                     |
| `npm run package`      | Executar o build e criar `dist/Fake-Filler-Dev.zip`                  |
| `npm run preview`      | Abrir um servidor local de testes; o endereço é impresso no terminal |
| `npm run test:e2e`     | Executar a suíte com a extensão instalada em Chromium                |

## Testes de navegador

### Preview local

```sh
npm run build
npm run preview
```

Abra o endereço HTTP `/qa` impresso no terminal. A bancada inclui formulários HTML e fixtures reais de React, Vue e Angular, com máscara de CPF e indicadores de sincronização de estado.

O preview usa a interface e o motor de preenchimento com um adaptador de APIs Chrome. Ele permite inspecionar o fluxo em um navegador comum, mas não instala a extensão nem verifica o menu de contexto nativo. O adaptador e os frameworks de teste não são incluídos na distribuição.

Após mudar código, execute novamente o build e reinicie o servidor de preview. Encerre o servidor com `Ctrl+C`.

### Extensão instalada em Chromium

Instale o navegador de testes uma vez e execute:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

A suíte abre uma janela Chromium com um perfil temporário e carrega a extensão de `dist/`. Usa a porta local `9333`, que deve estar livre, e encerra o navegador ao terminar. É necessário um ambiente com interface gráfica.

Os testes unitários verificam os documentos com validadores independentes e cobrem detecção de campos, escopos, preservação, regras, restrições HTML, eventos, geração do menu, roteamento por frame e falhas de comunicação com o runtime.

Antes de distribuir uma versão, confira também o menu nativo por botão direito, permissões, atualização em abas abertas e os componentes dos sites que pretende suportar. As fixtures não representam todos os componentes de terceiros.

## Organização do código

```text
manifest.json          configuração Manifest V3 e permissões
background.ts          menus, atalho e roteamento por frame
content.ts             captura de foco/botão direito e mensagens
popup.html / popup.ts  interface e ações do popup
styles.css             layout e temas
generators.ts          dados fictícios e verificadores brasileiros
detect.ts              identificação dos campos
fill.ts                escopos, restrições e escrita no DOM
menus.ts               árvore do menu de contexto
settings.ts            persistência e validação de regras
types.ts               contratos e catálogo de geradores
icons/                 ícones da extensão
tools/                 build, empacotamento e preview
tests/                 testes e fixtures
```

O build usa esbuild e inclui apenas o manifest, popup, estilos, ícones e bundles necessários à extensão. Não edite `dist/` manualmente: o próximo build substitui seu conteúdo. O ZIP de distribuição é gerado a partir desse build.

## Permissões

| Permissão ou acesso                      | Uso                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `activeTab` e `scripting`                | Operações na aba acionada, enumeração de frames acessíveis e cópia pelo menu |
| `contextMenus`                           | Ações nativas e submenu Generate                                             |
| `storage`                                | Preferências locais e referência do frame do campo focado                    |
| `clipboardWrite`                         | Copiar valores quando solicitado pelo usuário                                |
| Content script em HTTP, HTTPS e arquivos | Capturar o campo do primeiro clique direito, inclusive em frames             |

O content script registra listeners e aguarda uma ação. Não há permissão `tabs`, cookies, debugger ou host permissions adicionais. A CSP das telas bloqueia conexões externas.

## Preparar uma alteração

1. Atualize código e documentação quando o comportamento mudar.
2. Preserve os valores existentes por padrão e não adicione envio automático de formulários.
3. Execute `npm run check` e `npm run format:check`.
4. Para mudanças na integração com Chrome, valide também a extensão instalada.
5. Gere o pacote com `npm run package` e confira os arquivos de distribuição.

Mantenha no Git fontes, configurações, ícones, testes, documentação e `package-lock.json`. Não inclua dependências instaladas, builds, ZIPs, perfis de navegador, screenshots temporários, logs, caches, credenciais ou arquivos `.env`. O `.gitignore` cobre esses artefatos.
