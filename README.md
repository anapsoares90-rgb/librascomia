# librascomia

Projetos digitais da escola, em duas partes independentes:

## 1. Dashboard do Protagonismo Estudantil — [`dashboard/`](dashboard/)

Painel de gestão das frentes do Protagonismo: **SIV (Simulado da ONU)**, **Cine Club** e
outras frentes que a coordenação cadastrar. Tem três perfis — **Supra Admin** (vê e
administra tudo), **ADM** (coordenador de cada comissão, vê só o que lhe foi libertado) e
**Público** (portal com as postagens liberadas).

Inclui cadastro de frentes e comissões, funções de painel com permissões, gestão de
coordenadores e membros, fluxo de liberação de postagens, central de comunicação entre
comissões, calendário e relatórios.

▶ Abre `dashboard/index.html` no navegador. Instruções completas em
[`dashboard/README.md`](dashboard/README.md).

## 2. Libras: Gestos & Voz — [`index.html`](index.html)

Protótipo de acessibilidade que reconhece gestos de Libras pela câmara (MediaPipe/TensorFlow)
e os converte em voz, com modo de simulação para quando a câmara não está disponível.

▶ Abre `index.html` no navegador (requer ligação à internet para carregar os modelos de IA).
