# Painel do Protagonismo Estudantil

Plataforma de gestão das frentes de protagonismo da escola — **SiV (Simulação Viva)**,
**Cine Club** e quaisquer outras frentes que a coordenação cadastrar.

Abra `index.html` no navegador. Não é preciso instalar nada nem ter internet:
estilos, ícones e fontes estão todos dentro do repositório.

---

## Os três perfis

| Perfil | Quem é | O que vê |
|---|---|---|
| **Supra Admin** | Coordenação geral do Protagonismo | Toda a plataforma: todas as frentes, comitês e postagens |
| **ADM (coordenador)** | Coordenador de cada comitê | Apenas as frentes/comitês que o Supra Admin liberou, e apenas os painéis da função atribuída |
| **Público** | Comunidade escolar | Portal público: só as postagens liberadas e os eventos marcados como públicos |

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Supra Admin | `supra@escola.pt` | `supra123` |
| Mesa do Conselho de Segurança (preside o debate) | `helena@escola.pt` | `siv123` |
| ADM — Imprensa do SiV (pode liberar postagens) | `bruno@escola.pt` | `siv123` |
| ADM — Logística do SiV (não pode liberar) | `marta@escola.pt` | `siv123` |
| ADM — Curadoria do Cine Club | `rafael@escola.pt` | `cine123` |
| Público | botão **"Ver o portal público"** | — |

O seletor **"Modo de teste"**, no topo, alterna entre os três perfis sem sair da sessão —
serve para mostrar a plataforma a quem ainda não tem conta.
Para desligá-lo, coloque `MODO_TESTE = false` no início de `assets/js/app.js`.

---

## O SiV: antes e durante o evento

O módulo do SiV segue a divisão proposta no estudo de caso do aluno: o que é preciso
**antes** da conferência e o que é preciso **durante** o debate.

### Antes — Inscrições, Delegações e Pagamentos

* **Inscrições** — recebe as candidaturas (nome, turma, comitê pretendido, país preferido),
  aceita ou recusa e **aloca** o participante: ao alocar, a plataforma cria a delegação no
  comitê e registra a cobrança da inscrição de uma só vez.
* **Delegações** — que país cada delegado representa, em que comitê, e o controle de
  entrega dos **DPOs** (Documentos de Posição Oficial).
* **Pagamentos** — taxas de inscrição com estado pago / pendente / isento / devolvido,
  totais recebidos e a receber, e exportação em CSV.

### Durante — Mesa de debate e Ao vivo

* **Mesa de debate** (um por comitê, conduzida pela presidência):
  * **Chamada** com três estados — presente e votante, presente, ausente — e cálculo
    automático de **quórum**, maioria simples e maioria de dois terços.
  * **Lista de oradores** com orador atual, fila reordenável e inscrição das delegações
    presentes.
  * **Cronômetro** grande com iniciar/pausar, zerar, +30s e "próximo orador" — ao avançar,
    o tempo falado fica registrado no histórico da delegação.
  * **Modos de sessão**: lista de oradores, caucus moderado, caucus simples, votação e
    sessão suspensa.
  * **Moções** (caucus, alteração de tempo, encerramento dos debates, votação) com registro
    de votos e apuração automática contra a maioria simples.
  * **Estatísticas** de discursos e tempo de fala por delegação.
* **Ao vivo** (só o Supra Admin) — todos os comitês numa grade: modo atual, tópico em
  debate, cronômetro correndo, quem tem a palavra, quórum e DPOs entregues.

## O resto da plataforma

* **Frentes** — cadastra o SiV, o Cine Club e novas frentes (nome, sigla, cor, ícone).
* **Comitês** — cria os comitês de cada frente e nomeia o coordenador responsável.
* **Funções do painel** — cadastra os perfis de acesso, escolhendo exatamente quais painéis
  e ações cada função libera.
* **Coordenadores** — adiciona coordenadores, atribui função e libera frentes e comitês.
  O botão *ver painel* mostra exatamente o que aquele coordenador encontra ao entrar.
* **Comunicação** — comunicados para um comitê, para uma frente inteira ou para toda a
  plataforma, com urgência e registro de quem já leu.
* **Calendário** — reuniões, formações, prazos e sessões, marcando o que é público.
* **Postagens** — fluxo de liberação para o portal público.
* **Relatórios** e **Registro de atividade**.

## Fluxo de uma postagem

```
rascunho ──▶ em análise ──▶ liberada (portal público)
   │              │
   │              └──▶ devolvida ──▶ reenviar
   └──▶ interna: publicada diretamente para os membros
```

Quem tem a permissão *Liberar postagens* publica direto e pode retirar do portal.

## Permissões disponíveis

| Chave | O que libera |
|---|---|
| `plataforma.total` | Acesso total (exclusivo do Supra Admin) |
| `frentes.gerir` | Criar e editar frentes |
| `comissoes.gerir` | Criar comitês e nomear coordenadores |
| `funcoes.gerir` | Cadastrar funções do painel |
| `usuarios.gerir` | Adicionar coordenadores e atribuir acessos |
| `membros.gerir` | Cadastrar membros do comitê |
| `postagens.criar` | Escrever postagens |
| `postagens.publicar` | Aprovar/liberar postagens no portal |
| `mensagens.enviar` | Comunicar com o próprio comitê |
| `mensagens.geral` | Comunicado geral (frente inteira ou plataforma) |
| `calendario.gerir` | Criar e editar eventos |
| `debate.presidir` | Conduzir a sessão: chamada, oradores, cronômetro e moções |
| `delegacoes.gerir` | Alocar países às delegações e acompanhar DPOs |
| `inscricoes.gerir` | Receber, aceitar e alocar inscrições |
| `financeiro.gerir` | Registrar pagamentos e ver os totais |
| `relatorios.ver` | Ver indicadores |
| `auditoria.ver` | Ver o registro de atividade |

---

## Estrutura dos arquivos

```
index.html                       tela de entrada + estrutura da aplicação
netlify.toml                     configuração de publicação
tailwind.config.js               configuração usada para gerar o CSS
ferramentas/
└── gerar-ficheiro-unico.js      junta tudo num único HTML para compartilhar
firestore.rules                  regras de segurança do Firebase
firebase.json                    configuração do Firebase CLI
assets/
├── fonts/                       Fraunces e IBM Plex Sans (licenças incluídas)
├── css/
│   ├── app.css                  cores, tipografia e componentes do painel
│   └── tailwind.css             utilitários de grade e espaçamento (gerado)
└── js/
    ├── config.js                liga/desliga a nuvem e guarda a configuração do Firebase
    ├── nuvem.js                 ponte com o Firestore e o Authentication
    ├── store.js                 camada de dados (localStorage ou espelho da nuvem)
    ├── auth.js                  sessão, perfis, permissões e escopo de cada usuário
    ├── ui.js                    toasts, modais, formulários, métricas, tabelas
    ├── dados.js                 consultas de domínio já filtradas pelo escopo
    ├── app.js                   navegação, barra lateral, modo de teste
    ├── vendor/lucide.min.js     ícones
    └── views/                   um arquivo por painel
        ├── visao.js      frentes.js    comissoes.js   funcoes.js
        ├── usuarios.js   membros.js    postagens.js   mensagens.js
        ├── calendario.js relatorios.js auditoria.js   portal.js
        └── debate.js     aovivo.js     delegacoes.js  inscricoes.js  financeiro.js
```

> Os nomes internos do código continuam em português sem acento (`comissoes`,
> `delegacoes`, `sessoes`). Só a interface foi traduzida — renomear identificadores não
> traria nada ao usuário e quebraria dados já salvos.

## Onde ficam os dados

Tudo é salvo no **localStorage do navegador** (chave `protagonismo.db.v1`), com dados de
demonstração criados no primeiro acesso. Em *Atividade* há dois botões: **Exportar dados**
(backup em JSON) e **Repor demonstração**.

> **Importante:** por ser uma aplicação só de navegador, as senhas ficam salvas em texto
> simples no computador de quem usa e cada navegador tem a sua própria cópia dos dados —
> serve para demonstração e uso escolar, mas **não deve receber dados pessoais sensíveis**.
> Para compartilhar dados entre computadores é preciso ligar um servidor.

## Compartilhar uma cópia num único arquivo

```bash
node ferramentas/gerar-ficheiro-unico.js
```

Gera `painel-protagonismo.html` com CSS, JavaScript e fontes embutidos — um só arquivo que
abre em qualquer computador, sem servidor.

## Firebase (projeto `siv-protagonismo`)

O painel já vem com a ligação ao Firebase pronta — Firestore para os dados e
Authentication para o login. Ela fica **desligada** até você concluir os passos abaixo,
para a demonstração continuar funcionando em qualquer computador.

### Como funciona

As telas leem os dados de forma síncrona (`Store.listar(...)` devolve logo um array) e o
Firestore é assíncrono. Em vez de reescrever as 17 telas, `assets/js/nuvem.js` mantém um
**espelho em memória** alimentado por `onSnapshot`: a leitura continua instantânea e,
quando alguém muda alguma coisa noutro computador, o espelho atualiza e a tela se redesenha
sozinha. Na prática, o cronômetro e a lista de oradores da mesa aparecem ao vivo na tela
*Ao vivo* do organizador, noutro aparelho.

As escritas vão para o Firestore e para o espelho ao mesmo tempo, para a interface
responder na hora; se a gravação falhar, aparece um aviso.

### Ligar — quatro passos no console do Firebase

1. **Authentication → Sign-in method → Email/senha → Ativar.**
   (Hoje está desativado: o painel responde *"The given sign-in provider is disabled"*.)
2. **Authentication → Users → Add user**: o e-mail e a senha da coordenação geral.
   Copie o **UID** que aparece na lista.
3. **Firestore → Start collection `papeis`** → ID do documento = esse UID, campos:
   `perfil` = `supra` (texto) e `email` = o e-mail da conta.
4. **Firestore → Rules** → cole o conteúdo de [`firestore.rules`](firestore.rules) e
   publique. (Hoje as regras recusam tudo: o painel responde *"Missing or insufficient
   permissions"*.)

Depois, no código: mude `usarNuvem` para `true` em
[`assets/js/config.js`](assets/js/config.js) e abra o painel.

Na primeira entrada, se o banco estiver vazio, a conta com perfil `supra` cria
automaticamente o próprio registro de coordenação. A seguir, vá a **Atividade → Enviar
dados para a nuvem** para subir os comitês, delegações e o resto que já existe neste
navegador.

### Contas dos coordenadores

Cada coordenador precisa de duas coisas: uma conta em **Authentication** (criada por você
no console) e um documento em **papeis/{UID}** com `perfil: "admin"`. O que ele enxerga
dentro do painel continua sendo definido em *Coordenadores* → função e comitês liberados.

### O que as regras garantem

* Visitante sem login lê apenas: frentes, comitês, postagens liberadas e públicas, e
  eventos marcados como públicos.
* Só quem tem papel registrado escreve qualquer coisa.
* Só o supra admin altera estrutura (frentes, comitês, funções, usuários, papéis), apaga
  pagamentos ou mexe no registro de atividade.

> A configuração do Firebase em `config.js` **não é um segredo** — ela identifica o projeto
> e vai dentro de qualquer página que use o Firebase. Quem protege os dados são as regras.

> O Google Analytics fica desligado de propósito: o painel é usado por alunos e medir o
> comportamento deles não faz parte do projeto. Para ligar, carregue também o
> `firebase-analytics-compat.js` e mude `usarAnalytics` para `true`.

### Sem internet

Com `usarNuvem: true` e a internet em baixo, o login cai automaticamente no modo
demonstração e o rodapé da barra lateral avisa: *"Só neste computador"*.

## Ligar a outro servidor (Supabase ou API própria)

Nenhuma tela fala com o `localStorage` diretamente: todas passam por `store.js`
(`listar`, `encontrar`, `inserir`, `atualizar`, `remover`, `registar`). Para migrar para
outro banco basta reescrever essas seis funções — ou copiar o que `nuvem.js` faz.

## Regerar o CSS

Só é necessário ao acrescentar classes novas do Tailwind:

```bash
npm install -D tailwindcss@3
npx tailwindcss -c tailwind.config.js -i entrada.css -o assets/css/tailwind.css --minify
```

onde `entrada.css` contém apenas `@tailwind base; @tailwind components; @tailwind utilities;`.
