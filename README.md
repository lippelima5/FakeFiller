<p><img src="icons/128.png" width="64" height="64" alt="Ícone do Fake Filler Dev"></p>

# Fake Filler Dev

Preencha formulários com dados fictícios em poucos cliques. Uma extensão Chrome para desenvolvedores e QA, com identificação inteligente de campos, documentos brasileiros e geração local em **pt-BR**.

- **Preencha a página, um formulário ou um único campo.**
- **Gere CPF, CNS e CNPJ com dígitos verificadores válidos.**
- **Mantenha dados relacionados**, como nome, e-mail, nascimento e endereço.
- **Use o popup ou o botão direito**, com geradores individuais e cópia rápida.
- **Personalize o preenchimento** com regras por seletor CSS ou tipo de campo.

Os valores existentes são preservados por padrão. A extensão não envia formulários automaticamente nem utiliza APIs externas para gerar dados.

## Instalação

### A partir do código-fonte

Requisitos: **Node.js 22.12 ou superior**, npm e **Chrome 120 ou superior**.

1. Baixe ou clone este repositório e abra um terminal na pasta do projeto.
2. Instale as dependências e gere a extensão:

   ```sh
   npm ci
   npm run build
   ```

3. No Chrome, abra `chrome://extensions`.
4. Ative o **Modo do desenvolvedor**.
5. Clique em **Carregar sem compactação** e selecione a pasta **`dist`** do projeto.
6. Recarregue as páginas que já estavam abertas. Se desejar, fixe o Fake Filler Dev na barra de extensões.

A pasta a carregar é `dist`, onde estão os scripts compilados. Os arquivos TypeScript da raiz não são carregados diretamente pelo Chrome.

### A partir de um ZIP de distribuição

Se você já possui `Fake-Filler-Dev.zip`, extraia o arquivo e siga os passos 3 a 6, selecionando a pasta extraída que contém `manifest.json`. Não é necessário instalar Node.js para usar um pacote já compilado.

Para gerar o ZIP a partir do código, execute `npm run package`. O arquivo será criado em `dist/Fake-Filler-Dev.zip`.

## Primeiro preenchimento

1. Abra uma página com um formulário.
2. Clique no ícone do **Fake Filler Dev**.
3. Mantenha o modo **Smart** e o escopo **All Inputs**.
4. Clique em **Preencher campos vazios**.

A extensão reconhece campos por atributos, labels, placeholders, autocomplete e contexto. O resultado informa quantos campos foram preenchidos, preservados ou considerados incompatíveis.

Para preencher apenas um campo ou formulário, clique primeiro em um campo da página. Depois abra o popup e escolha **This Input** ou **This Form**.

### Ações disponíveis

| Ação           | O que faz                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **All Inputs** | Preenche os campos elegíveis da página. No popup, tenta também os frames acessíveis.            |
| **This Form**  | Preenche somente o formulário do último campo selecionado.                                      |
| **This Input** | Preenche somente o campo selecionado.                                                           |
| **Random**     | Gera dados aleatórios respeitando o tipo HTML, sem a identificação semântica do Smart.          |
| **Regenerate** | Substitui os valores no escopo escolhido por uma nova geração, inclusive campos já preenchidos. |
| **Copy**       | Copia os valores do escopo escolhido, separados por quebras de linha.                           |

**Regenerate substitui valores mesmo quando a preferência de sobrescrita está desativada.** As demais ações preservam o conteúdo existente por padrão.

### Menu de contexto

Clique com o botão direito em um campo e abra **Fake Filler Dev**:

- Use **This Input** para preencher aquele campo ou **This Form** para preencher seu formulário.
- Abra **Generate → tipo** para escolher um dado específico, como CPF, e-mail ou UUID.
- **Random** e **Regenerate** agem sobre o campo clicado.
- **Copy** copia o valor daquele campo.

No menu de contexto, **All Inputs** preenche o frame em que ocorreu o clique. Para tentar todos os frames acessíveis da página, use o popup.

### Gerar e copiar sem preencher a página

Na seção **Gerar um dado** do popup, selecione um tipo. Use **Gerar** para obter outro valor e o botão de copiar ao lado do resultado para enviá-lo à área de transferência. A opção **Com máscara** alterna a formatação dos dados compatíveis.

### Atalho

**Alt + Shift + F** preenche os campos vazios da página. Se houver conflito com outro atalho, ajuste-o em `chrome://extensions/shortcuts`.

## Modos e preferências

| Modo       | Quando usar                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Smart**  | Preenchimento automático com identificação do propósito dos campos e dados relacionados por formulário. |
| **Random** | Dados aleatórios baseados no tipo HTML do campo.                                                        |
| **Custom** | Suas regras primeiro; campos sem regra correspondente usam Smart.                                       |

Em **Preferências e regras**, você pode habilitar a sobrescrita e salvar regras Custom. O botão de tema alterna entre sistema, escuro e claro. As preferências são salvas localmente.

### Exemplo de regra Custom

Selecione **Custom**, abra **Preferências e regras**, informe o JSON e clique em **Salvar preferências**:

```json
[
  { "selector": "#documento-cliente", "generator": "cpf" },
  { "kind": "email", "generator": "email", "value": "qa@example.test" },
  { "selector": "[data-testid='codigo']", "generator": "text", "value": "QA-123" }
]
```

- `selector` identifica o campo por um seletor CSS; `kind` identifica o tipo reconhecido pelo Smart. Informe pelo menos um dos dois. Se ambos estiverem presentes, o seletor será utilizado.
- `generator` escolhe o gerador; `value` define um valor fixo opcional.
- A primeira regra compatível vence. Os identificadores disponíveis estão em [types.ts](types.ts).
- Regras também respeitam a preferência de sobrescrita e as restrições HTML. Ative **Sobrescrever valores** para aplicar regras a campos já preenchidos.

## Dados disponíveis

| Categoria          | Geradores                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| Pessoas e acesso   | Nome completo, nome, sobrenome, e-mail, username, senha fictícia, nascimento e idade |
| Documentos         | CPF, CNS, CNPJ e RG sintético                                                        |
| Contato e endereço | Telefone, celular, CEP, rua, número, bairro, cidade, estado e endereço completo      |
| Identificadores    | UUID v4, UID, ULID e token                                                           |
| Dados gerais       | Data, número, valor monetário, trechos variados de Lorem ipsum, URL e empresa        |

CPF, CNS e CNPJ têm verificadores matematicamente válidos; isso não comprova existência ou titularidade. RG é sintético, sem validação estadual. E-mails usam o domínio de teste `example.test`. Os endereços usam uma base local de São Paulo, Belo Horizonte e Curitiba, com CEP, UF e DDD relacionados.

A geração conjunta relaciona nomes, confirmações de e-mail e senha, nascimento/idade e endereço. Dados preexistentes e regras fixas podem limitar essa coerência. Não há consulta cadastral ou postal. Senhas e tokens gerados destinam-se a testes, não a credenciais de produção.

## Privacidade e compatibilidade

A geração acontece no dispositivo. Não há integração com serviços externos de dados, histórico dos valores gerados ou carregamento de código remoto. A cópia acontece quando você aciona um botão **Copy** ou de copiar.

Campos `disabled`, `readonly`, ocultos e de upload são ignorados. Campos dinâmicos são encontrados na próxima ação. O preenchimento usa setters nativos e eventos `input`, `change` e `blur`, com fixtures de teste para React, Vue e Angular.

Alguns componentes de terceiros, máscaras, shadow DOM fechado e iframes restritos podem exigir uma regra Custom ou não permitir preenchimento. Valores que não atendem às restrições HTML são contabilizados como incompatíveis. Páginas internas do Chrome e a Chrome Web Store não permitem a atuação da extensão.

## Solução de problemas

| Situação                                                               | Como resolver                                                                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A extensão foi instalada ou atualizada, mas não atua em uma aba aberta | Recarregue a aba para carregar a versão atual do content script.                                          |
| This Form ou This Input pede um campo selecionado                      | Clique em um campo da página antes de abrir o popup, ou use o botão direito diretamente nele.             |
| Um campo com conteúdo não muda                                         | O conteúdo é preservado por padrão. Use Regenerate ou habilite a sobrescrita quando quiser substituí-lo.  |
| Um campo aparece como incompatível                                     | Confira máscara, `pattern`, limites e tamanho máximo. Configure um valor Custom compatível se necessário. |
| Um arquivo HTML local não é preenchido                                 | Habilite **Permitir acesso a URLs de arquivo** na ficha da extensão em `chrome://extensions`.             |
| O atalho não funciona                                                  | Confira se outra extensão usa a mesma combinação em `chrome://extensions/shortcuts`.                      |

## Desenvolvimento

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para comandos de validação, testes no navegador, preview local e organização do código.

`dist/`, dependências, caches e resultados de testes são gerados localmente e não entram no versionamento. O `package-lock.json` é versionado para permitir instalações reproduzíveis com `npm ci`.
