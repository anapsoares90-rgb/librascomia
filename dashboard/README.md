# Dashboard do Protagonismo Estudantil

Painel de gestão das frentes de protagonismo da escola — **SIV (Simulado da ONU)**,
**Cine Club** e quaisquer outras frentes que a coordenação venha a cadastrar.

Abre `dashboard/index.html` no navegador. Não é preciso instalar nada: o painel
funciona offline (Tailwind e Lucide estão incluídos no repositório).

---

## Os três perfis

| Perfil | Quem é | O que vê |
|---|---|---|
| **Supra Admin** | Coordenação geral do Protagonismo | Toda a plataforma: todas as frentes, comissões e postagens |
| **ADM (coordenador)** | Coordenador de cada comissão | Apenas as frentes/comissões que o Supra Admin libertou, e apenas os painéis da função atribuída |
| **Público** | Comunidade escolar | Portal público: só as postagens liberadas e os eventos marcados como públicos |

### Contas de demonstração

| Perfil | E-mail | Palavra-passe |
|---|---|---|
| Supra Admin | `supra@escola.pt` | `supra123` |
| ADM — Imprensa do SIV (pode liberar postagens) | `bruno@escola.pt` | `siv123` |
| ADM — Logística do SIV (não pode liberar) | `marta@escola.pt` | `siv123` |
| ADM — Curadoria do Cine Club | `rafael@escola.pt` | `cine123` |
| Público | botão **“Ver portal público”** | — |

---

## O que o Supra Admin faz

* **Frentes** — cadastra o SIV, o Cine Club e novas frentes (nome, sigla, cor, ícone, responsável).
* **Comissões** — cria as comissões de cada frente e nomeia o coordenador responsável.
* **Funções do painel** — cadastra os perfis de acesso, escolhendo exatamente que painéis e
  ações cada função liberta (ver a tabela de permissões abaixo).
* **Coordenadores** — adiciona coordenadores, atribui-lhes uma função e liberta as frentes
  e comissões que cada um pode ver. O botão *ver painel* mostra exatamente o que aquele
  coordenador encontra ao entrar.
* **Comunicação** — envia comunicados para uma comissão, para uma frente inteira ou para
  toda a plataforma, com marcação de urgência e registo de quem já leu.
* **Calendário** — agenda reuniões, formações, prazos e sessões, marcando o que é público.
* **Postagens** — vê tudo, e **libera** (aprova) as postagens que vão para o portal público.
* **Relatórios** e **Registo de atividade** — indicadores por comissão e histórico de ações.

## O que o ADM faz

Só vê o que lhe foi libertado. Consoante a função atribuída, pode:
cadastrar os **membros** da sua comissão, escrever **postagens** (internas para os membros
ou públicas, que ficam *em análise* até a coordenação liberar), **comunicar** com a sua
comissão, gerir os seus **eventos** no calendário e consultar os seus **relatórios**.

## Fluxo de uma postagem

```
rascunho ──▶ em análise ──▶ liberada (portal público)
   │              │
   │              └──▶ devolvida ──▶ reenviar
   └──▶ interna: publicada diretamente para os membros
```

Quem tem a permissão *Liberar postagens* publica diretamente e pode retirar do portal.

## Permissões disponíveis

| Chave | O que liberta |
|---|---|
| `plataforma.total` | Acesso total (exclusivo do Supra Admin) |
| `frentes.gerir` | Criar e editar frentes |
| `comissoes.gerir` | Criar comissões e nomear coordenadores |
| `funcoes.gerir` | Cadastrar funções do painel |
| `usuarios.gerir` | Adicionar coordenadores e atribuir acessos |
| `membros.gerir` | Cadastrar membros da comissão |
| `postagens.criar` | Escrever postagens |
| `postagens.publicar` | Aprovar/liberar postagens no portal |
| `mensagens.enviar` | Comunicar com a própria comissão |
| `mensagens.geral` | Comunicado geral (frente inteira ou plataforma) |
| `calendario.gerir` | Criar e editar eventos |
| `relatorios.ver` | Ver indicadores |
| `auditoria.ver` | Ver o registo de atividade |

---

## Estrutura dos ficheiros

```
dashboard/
├── index.html                  # ecrã de entrada + estrutura da aplicação
├── tailwind.config.js          # configuração usada para gerar o CSS
└── assets/
    ├── css/
    │   ├── tailwind.css        # Tailwind já compilado (não editar à mão)
    │   └── app.css             # botões, campos e animações do painel
    └── js/
        ├── store.js            # camada de dados (única que toca no localStorage)
        ├── auth.js             # sessão, perfis, permissões e âmbito de cada utilizador
        ├── ui.js               # toasts, modais, formulários, cartões, gráficos de barras
        ├── dados.js            # consultas de domínio já filtradas pelo âmbito
        ├── app.js              # navegação, menu lateral e montagem dos painéis
        ├── vendor/lucide.min.js
        └── views/              # um ficheiro por painel
            ├── visao.js        frentes.js     comissoes.js   funcoes.js
            ├── usuarios.js     membros.js     postagens.js   mensagens.js
            └── calendario.js   relatorios.js  auditoria.js   portal.js
```

## Onde ficam os dados

Tudo é guardado no **localStorage do navegador** (chave `protagonismo.db.v1`), com dados de
demonstração criados no primeiro arranque. Em *Atividade* há dois botões: **Exportar dados**
(cópia de segurança em JSON) e **Repor demonstração**.

> **Nota importante:** por ser uma aplicação só de navegador, as palavras-passe ficam
> guardadas em texto simples no computador de quem usa e cada navegador tem a sua própria
> cópia dos dados — serve para a demonstração e para o uso na escola, mas **não deve receber
> dados pessoais sensíveis**. Para partilhar dados entre computadores é preciso ligar um
> servidor (ver abaixo).

## Ligar mais tarde a um servidor

Nenhuma vista fala com o `localStorage` diretamente: todas passam por `store.js`
(`listar`, `encontrar`, `inserir`, `atualizar`, `remover`). Para passar a uma base de dados
real (Supabase, Firebase ou uma API própria) basta reescrever essas funções — o resto do
painel continua igual.

## Regerar o CSS

Só é necessário se acrescentares classes novas do Tailwind:

```bash
npm install -D tailwindcss@3
npx tailwindcss -c dashboard/tailwind.config.js \
  -i entrada.css -o dashboard/assets/css/tailwind.css --minify
```

onde `entrada.css` contém apenas `@tailwind base; @tailwind components; @tailwind utilities;`.
