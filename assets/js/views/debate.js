/* ===================== Mesa de debate (SiV) ============================
   Conduz a sessão de um comitê: chamada, lista de oradores, cronometro,
   moções e estatísticas. Inspirada no fluxo de uma simulação da ONU.
   ======================================================================= */
(function (global) {
    'use strict';

    var comissaoAtiva = null;
    var tique = null;

    /* ------------------------------------------------------------- apoio -- */
    function comissao() {
        var lista = Dados.comissoesComDebate();
        if (!lista.length) { return null; }
        var achada = lista.filter(function (c) { return c.id === comissaoAtiva; })[0];
        if (!achada) { achada = lista[0]; comissaoAtiva = achada.id; }
        return achada;
    }

    function podeConduzir() {
        return Auth.pode('debate.presidir');
    }

    function guardarSessao(sessao, alteracoes) {
        return Store.atualizar('sessoes', sessao.id, alteracoes);
    }

    /* Para o cronometro e devolve os segundos já contados. */
    function pararCronometro(sessao) {
        var segundos = Dados.decorrido(sessao);
        guardarSessao(sessao, { cronometro: { correndo: false, inicio: null, acumulado: segundos } });
        return segundos;
    }

    /* -------------------------------------------------------- cronometro -- */
    function blocoCronometro(sessao) {
        var decorrido = Dados.decorrido(sessao);
        var alvo = sessao.tempoOrador || 90;
        var esgotado = decorrido >= alvo;
        var pct = Math.min(100, alvo ? (decorrido / alvo) * 100 : 0);

        return '<section class="painel cronometro' + (esgotado ? ' cronometro--esgotado' : '') + '" id="bloco-cronometro">' +
            '<div class="cronometro__tempo">' +
                '<span id="relogio">' + Dados.relogio(decorrido) + '</span>' +
                '<span class="cronometro__alvo">/ ' + Dados.relogio(alvo) + '</span>' +
            '</div>' +
            '<div class="cronometro__barra"><div class="cronometro__fill" id="relogio-barra" style="width:' + pct + '%"></div></div>' +
            (podeConduzir()
                ? '<div class="cronometro__botoes">' +
                    '<button class="btn btn--principal" data-acao="cron-ligar">' +
                        UI.icone(sessao.cronometro && sessao.cronometro.correndo ? 'pause' : 'play', 15) +
                        (sessao.cronometro && sessao.cronometro.correndo ? ' Pausar' : ' Iniciar') +
                    '</button>' +
                    '<button class="btn" data-acao="cron-zerar">' + UI.icone('rotate-ccw', 15) + ' Zerar</button>' +
                    '<button class="btn" data-acao="cron-mais">+30s</button>' +
                    '<button class="btn" data-acao="proximo">' + UI.icone('skip-forward', 15) + ' Próximo orador</button>' +
                  '</div>'
                : '') +
        '</section>';
    }

    /* ------------------------------------------------------------ oradores */
    function blocoOradores(sessao, delegacoes) {
        var atual = Dados.delegacao(sessao.oradorAtual);
        var fila = (sessao.fila || []).map(Dados.delegacao).filter(Boolean);

        var html = '<section class="painel">' +
            '<div class="painel__cabeca">' +
                '<h3 class="titulo-painel">' + UI.esc(Dados.modo(sessao.modo).rotulo) + '</h3>' +
                UI.etiqueta(fila.length + ' na fila', 'slate') +
            '</div>' +
            '<div class="painel__corpo">';

        html += atual
            ? '<div class="orador-atual">' +
                '<span class="orador-atual__bandeira">' + UI.esc(atual.bandeira || '') + '</span>' +
                '<div class="min-w-0 flex-1">' +
                    '<p class="sobrancelha">Com a palavra</p>' +
                    '<p class="orador-atual__pais">' + UI.esc(atual.pais) + '</p>' +
                    '<p class="nota">' + UI.esc(atual.delegado || '') + (atual.turma ? ' · ' + UI.esc(atual.turma) : '') + '</p>' +
                '</div>' +
              '</div>'
            : '<p class="recado">' + UI.icone('mic-off', 16) + ' Ninguem com a palavra. Adicione delegações a fila e toque em "Próximo orador".</p>';

        if (fila.length) {
            html += '<p class="sobrancelha" style="margin:1.1rem 0 .5rem">A seguir</p>' +
                '<ul class="lista">' + fila.map(function (d, i) {
                    return '<li class="fila-item">' +
                        '<span class="fila-item__ordem">' + (i + 1) + '</span>' +
                        '<span class="fila-item__bandeira">' + UI.esc(d.bandeira || '') + '</span>' +
                        '<div class="min-w-0 flex-1">' +
                            '<p style="font-size:.8125rem;font-weight:500">' + UI.esc(d.pais) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(d.delegado || '') + '</p>' +
                        '</div>' +
                        (podeConduzir()
                            ? '<div class="flex gap-1 shrink-0">' +
                                '<button class="btn btn--icone" data-acao="subir" data-id="' + d.id + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + UI.icone('chevron-up', 13) + '</button>' +
                                '<button class="btn btn--icone" data-acao="descer" data-id="' + d.id + '" title="Descer"' + (i === fila.length - 1 ? ' disabled' : '') + '>' + UI.icone('chevron-down', 13) + '</button>' +
                                '<button class="btn btn--icone perigo" data-acao="tirar-fila" data-id="' + d.id + '" title="Retirar">' + UI.icone('x', 13) + '</button>' +
                              '</div>'
                            : '') +
                    '</li>';
                }).join('') + '</ul>';
        }

        html += '</div></section>';
        return html;
    }

    /* ------------------------------------------------------- adicionar --- */
    function blocoAdicionar(sessao, delegacoes) {
        var naLista = (sessao.fila || []).concat([sessao.oradorAtual]);
        var disponiveis = delegacoes.filter(function (d) {
            return naLista.indexOf(d.id) === -1 && d.presenca !== 'ausente';
        });

        return '<section class="painel">' +
            '<div class="painel__cabeca"><h3 class="titulo-painel">Inscrever orador</h3></div>' +
            '<div class="painel__corpo" style="max-height:22rem;overflow-y:auto" class="custom-scrollbar custom-scrollbar--claro">' +
                (disponiveis.length
                    ? '<ul class="lista">' + disponiveis.map(function (d) {
                        return '<li class="flex items-center gap-2.5">' +
                            '<span class="fila-item__bandeira">' + UI.esc(d.bandeira || '') + '</span>' +
                            '<div class="min-w-0 flex-1">' +
                                '<p style="font-size:.8125rem">' + UI.esc(d.pais) + '</p>' +
                                '<p class="nota truncate">' + UI.esc(d.delegado || '') + '</p>' +
                            '</div>' +
                            (podeConduzir()
                                ? '<button class="btn btn--pequeno" data-acao="por-fila" data-id="' + d.id + '">Inscrever</button>'
                                : '') +
                        '</li>';
                    }).join('') + '</ul>'
                    : UI.vazio('Todas as delegações presentes já estao na lista.', 'check')) +
            '</div>' +
        '</section>';
    }

    /* ---------------------------------------------------------- chamada --- */
    function blocoChamada(comissaoId, delegacoes) {
        var c = Dados.chamada(comissaoId);
        return '<section class="painel">' +
            '<div class="painel__cabeca">' +
                '<h3 class="titulo-painel">Chamada</h3>' +
                (podeConduzir() ? '<button class="ligacao" data-acao="chamar-todos">Marcar todos presentes</button>' : '') +
            '</div>' +
            '<div class="painel__corpo">' +
                '<div class="chamada-resumo">' +
                    '<div><b>' + c.votantes + '</b><span>Present. e votantes</span></div>' +
                    '<div><b>' + c.presentes + '</b><span>Presentes</span></div>' +
                    '<div><b>' + c.ausentes + '</b><span>Ausentes</span></div>' +
                '</div>' +
                '<div class="' + (c.temQuorum ? 'aviso tom-emerald' : 'aviso tom-rose') + '" style="margin-bottom:1rem">' +
                    UI.icone(c.temQuorum ? 'check-circle-2' : 'alert-triangle', 16) +
                    '<div>' +
                        '<p style="font-weight:500">' + (c.temQuorum ? 'Há quórum' : 'Sem quórum') + ' — ' + c.naSala + ' de ' + c.total + ' na sala</p>' +
                        '<p class="nota">Quórum ' + c.quorum + ' · maioria simples ' + c.maioriaSimples + ' · maioria de dois terços ' + c.maioriaQualificada + '</p>' +
                    '</div>' +
                '</div>' +
                '<ul class="lista">' + delegacoes.map(function (d) {
                    var p = Dados.PRESENCAS[d.presenca] || Dados.PRESENCAS.ausente;
                    return '<li class="flex items-center gap-2.5">' +
                        '<span class="fila-item__bandeira">' + UI.esc(d.bandeira || '') + '</span>' +
                        '<div class="min-w-0 flex-1">' +
                            '<p style="font-size:.8125rem">' + UI.esc(d.pais) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(d.delegado || '') + '</p>' +
                        '</div>' +
                        (d.dpo === 'entregue' ? UI.etiqueta('DPO', 'emerald') : UI.etiqueta('sem DPO', 'slate')) +
                        (podeConduzir()
                            ? '<button class="presenca presenca--' + d.presenca + '" data-acao="presenca" data-id="' + d.id + '" title="' + p.rotulo + '">' + p.curto + '</button>'
                            : '<span class="presenca presenca--' + d.presenca + '">' + p.curto + '</span>') +
                    '</li>';
                }).join('') + '</ul>' +
            '</div>' +
        '</section>';
    }

    /* ----------------------------------------------------------- moções --- */
    function blocoMocoes(comissaoId) {
        var mocoes = Dados.mocoesDe(comissaoId).slice(0, 6);
        return '<section class="painel">' +
            '<div class="painel__cabeca">' +
                '<h3 class="titulo-painel">Moções</h3>' +
                (podeConduzir() ? '<button class="ligacao" data-acao="nova-mocao">Registrar moção</button>' : '') +
            '</div>' +
            '<div class="painel__corpo">' +
                (mocoes.length
                    ? '<ul class="lista">' + mocoes.map(function (m) {
                        var tomEstado = m.estado === 'aprovada' ? 'emerald' : m.estado === 'rejeitada' ? 'rose' : 'amber';
                        var total = m.votos.favor + m.votos.contra + m.votos.abstencao;
                        return '<li>' +
                            '<div class="flex items-start justify-between gap-3">' +
                                '<div class="min-w-0">' +
                                    '<p style="font-size:.8125rem;font-weight:500">' + UI.esc(Dados.TIPOS_MOCAO[m.tipo] || m.tipo) + '</p>' +
                                    '<p class="nota">' + UI.esc(m.descricao) + '</p>' +
                                    '<p class="nota" style="margin-top:.2rem">Proposta por ' + UI.esc(Dados.nomeDelegacao(m.proponenteId)) +
                                        (m.tempoTotal ? ' · ' + Dados.relogio(m.tempoTotal) + ' no total' : '') +
                                        (m.tempoOrador ? ' · ' + Dados.relogio(m.tempoOrador) + ' por orador' : '') + '</p>' +
                                '</div>' +
                                '<div class="text-right shrink-0">' +
                                    UI.etiqueta(m.estado, tomEstado, { forte: true }) +
                                    (total ? '<p class="nota" style="margin-top:.3rem">' + m.votos.favor + ' a favor · ' + m.votos.contra + ' contra · ' + m.votos.abstencao + ' abstenções</p>' : '') +
                                '</div>' +
                            '</div>' +
                            (podeConduzir() && m.estado === 'proposta'
                                ? '<div class="flex gap-1.5 mt-2">' +
                                    '<button class="btn btn--pequeno" data-acao="votar-mocao" data-id="' + m.id + '">Votar</button>' +
                                  '</div>'
                                : '') +
                        '</li>';
                    }).join('') + '</ul>'
                    : UI.vazio('Nenhuma moção registrada nesta sessão.', 'gavel')) +
            '</div>' +
        '</section>';
    }

    /* ----------------------------------------------------- estatísticas --- */
    function blocoEstatisticas(comissaoId) {
        var linhas = Dados.estatisticasOradores(comissaoId).filter(function (l) { return l.discursos > 0; });
        var maximo = Math.max.apply(null, [1].concat(linhas.map(function (l) { return l.discursos; })));
        return '<section class="painel">' +
            '<div class="painel__cabeca"><h3 class="titulo-painel">Discursos por delegação</h3></div>' +
            '<div class="painel__corpo">' +
                (linhas.length
                    ? linhas.map(function (l) {
                        return UI.barra(l.delegacao.bandeira + '  ' + l.delegacao.pais + '  (' + Dados.relogio(l.segundos) + ')',
                                        l.discursos, maximo, 'indigo');
                      }).join('')
                    : UI.vazio('Ainda não houve discursos registrados.', 'mic')) +
            '</div>' +
        '</section>';
    }

    /* ------------------------------------------------------- formularios -- */
    function formularioSessao(sessao) {
        UI.formulario({
            titulo: 'Configurar a sessão',
            subtitulo: 'Tópico em debate e tempo de fala por orador.',
            botao: 'Salvar',
            campos: [
                { nome: 'topico', rotulo: 'Tópico em debate', tipo: 'text', valor: sessao.topico, placeholder: 'Ex.: Crise hídrica e segurança regional' },
                {
                    nome: 'modo', rotulo: 'Modo', tipo: 'select', largura: 'metade', valor: sessao.modo,
                    opcoes: Object.keys(Dados.MODOS).map(function (k) { return { valor: k, rotulo: Dados.MODOS[k].rotulo }; })
                },
                { nome: 'tempoOrador', rotulo: 'Tempo por orador (segundos)', tipo: 'number', largura: 'metade', valor: sessao.tempoOrador }
            ],
            aoGuardar: function (d) {
                guardarSessao(sessao, {
                    topico: d.topico,
                    modo: d.modo,
                    tempoOrador: Math.max(10, parseInt(d.tempoOrador, 10) || 90)
                });
                Store.registar('Sessão configurada', Dados.nomeComissao(sessao.comissaoId) + ' · ' + d.topico);
                UI.toast('Sessão atualizada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function formularioMocao(comissaoId, delegacoes) {
        UI.formulario({
            titulo: 'Registrar moção',
            subtitulo: 'A mesa regista a moção proposta por uma delegação.',
            botao: 'Registar',
            campos: [
                {
                    nome: 'tipo', rotulo: 'Tipo de moção', tipo: 'select', valor: 'moderado',
                    opcoes: Object.keys(Dados.TIPOS_MOCAO).map(function (k) { return { valor: k, rotulo: Dados.TIPOS_MOCAO[k] }; })
                },
                {
                    nome: 'proponenteId', rotulo: 'Delegação proponente', tipo: 'select', largura: 'metade',
                    valor: delegacoes[0] ? delegacoes[0].id : '',
                    opcoes: delegacoes.map(function (d) { return { valor: d.id, rotulo: d.pais }; })
                },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'text', valor: '', obrigatorio: true, placeholder: 'Sobre o que e a moção' },
                { nome: 'tempoTotal', rotulo: 'Tempo total (minutos)', tipo: 'number', largura: 'metade', valor: 10 },
                { nome: 'tempoOrador', rotulo: 'Tempo por orador (segundos)', tipo: 'number', largura: 'metade', valor: 60 }
            ],
            aoGuardar: function (d) {
                Store.inserir('mocoes', {
                    comissaoId: comissaoId, tipo: d.tipo, descricao: d.descricao,
                    proponenteId: d.proponenteId,
                    tempoTotal: (parseInt(d.tempoTotal, 10) || 0) * 60,
                    tempoOrador: parseInt(d.tempoOrador, 10) || 0,
                    votos: { favor: 0, contra: 0, abstencao: 0 },
                    estado: 'proposta', quando: Store.agora()
                });
                Store.registar('Moção registrada', d.descricao);
                UI.toast('Moção registrada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function formularioVoto(mocao) {
        var c = Dados.chamada(mocao.comissaoId);
        UI.formulario({
            titulo: 'Votação da moção',
            subtitulo: mocao.descricao,
            botao: 'Apurar',
            nota: 'Na sala: ' + c.naSala + ' delegações. Maioria simples: ' + c.maioriaSimples + ' votos.',
            campos: [
                { nome: 'favor', rotulo: 'A favor', tipo: 'number', largura: 'metade', valor: 0 },
                { nome: 'contra', rotulo: 'Contra', tipo: 'number', largura: 'metade', valor: 0 },
                { nome: 'abstencao', rotulo: 'Abstencoes', tipo: 'number', largura: 'metade', valor: 0 }
            ],
            aoGuardar: function (d) {
                var favor = parseInt(d.favor, 10) || 0;
                var contra = parseInt(d.contra, 10) || 0;
                var abstencao = parseInt(d.abstencao, 10) || 0;
                var aprovada = favor > contra && favor >= c.maioriaSimples;
                Store.atualizar('mocoes', mocao.id, {
                    votos: { favor: favor, contra: contra, abstencao: abstencao },
                    estado: aprovada ? 'aprovada' : 'rejeitada'
                });
                Store.registar('Moção ' + (aprovada ? 'aprovada' : 'rejeitada'), mocao.descricao);
                UI.toast('Moção ' + (aprovada ? 'aprovada' : 'rejeitada') + '.', aprovada ? 'sucesso' : 'aviso');
                App.recarregar();
            }
        });
    }

    /* --------------------------------------------------------------------- */
    global.Views = global.Views || {};
    global.Views.debate = {
        titulo: 'Mesa de debate',

        render: function () {
            var c = comissao();
            var comites = Dados.comissoesComDebate();

            if (!c) {
                return UI.cabecalho('SiV', 'Mesa de debate',
                    'Conduza a sessão do comitê: chamada, lista de oradores, cronometro e moções.', '') +
                    UI.painel('', UI.vazio('Nenhum comitê tem delegações cadastradas. Comece por cadastrar as delegações.', 'flag'));
            }

            var sessao = Dados.sessaoDe(c.id);
            var delegacoes = Dados.delegacoesDe(c.id);

            var seletor = comites.length > 1
                ? '<select id="sel-comite" class="campo" style="max-width:17rem">' + comites.map(function (x) {
                      return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + UI.esc(x.nome) + '</option>';
                  }).join('') + '</select>'
                : '';

            var acoes = seletor;
            if (podeConduzir()) {
                acoes += sessao
                    ? '<button class="btn" data-acao="config">' + UI.icone('settings', 15) + ' Configurar</button>' +
                      '<button class="btn btn--perigo" data-acao="encerrar">Encerrar sessão</button>'
                    : '<button class="btn btn--principal" data-acao="abrir">' + UI.icone('play', 15) + ' Abrir sessão</button>';
            }

            var html = UI.cabecalho('SiV · ' + c.nome, 'Mesa de debate',
                sessao && sessao.topico ? 'Em debate: ' + sessao.topico
                                        : 'Conduza a sessão do comitê: chamada, lista de oradores, cronometro e moções.',
                acoes);

            if (!sessao) {
                html += UI.painel('', UI.vazio('A sessão deste comitê esta fechada. Abra a sessão para comecar a chamada e a lista de oradores.', 'gavel'));
                html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">' +
                            blocoChamada(c.id, delegacoes) +
                            blocoEstatisticas(c.id) +
                        '</div>';
                return html;
            }

            html += '<div class="grid grid-cols-1 xl:grid-cols-3 gap-4">' +
                        '<div class="xl:col-span-2 space-y-4">' +
                            blocoCronometro(sessao) +
                            blocoOradores(sessao, delegacoes) +
                            blocoMocoes(c.id) +
                        '</div>' +
                        '<div class="space-y-4">' +
                            blocoAdicionar(sessao, delegacoes) +
                            blocoChamada(c.id, delegacoes) +
                            blocoEstatisticas(c.id) +
                        '</div>' +
                    '</div>';
            return html;
        },

        ligar: function (raiz) {
            var c = comissao();
            if (!c) { return; }
            var delegacoes = Dados.delegacoesDe(c.id);

            function sessaoAtual() { return Dados.sessaoDe(c.id); }

            var sel = raiz.querySelector('#sel-comite');
            if (sel) {
                sel.addEventListener('change', function () { comissaoAtiva = sel.value; App.recarregar(); });
            }

            function liga(acao, fn) {
                raiz.querySelectorAll('[data-acao="' + acao + '"]').forEach(function (el) {
                    el.addEventListener('click', function () { fn(el); });
                });
            }

            liga('abrir', function () {
                Dados.abrirSessao(c.id);
                UI.toast('Sessão aberta.', 'sucesso');
                App.recarregar();
            });

            liga('encerrar', function () {
                UI.confirmar({
                    titulo: 'Encerrar a sessão',
                    mensagem: 'A lista de oradores e o cronometro sao reiniciados. Os discursos e as moções ficam no histórico.',
                    confirmar: 'Encerrar',
                    aoConfirmar: function () {
                        Dados.encerrarSessao(sessaoAtual().id);
                        UI.toast('Sessão encerrada.', 'info');
                        App.recarregar();
                    }
                });
            });

            liga('config', function () { formularioSessao(sessaoAtual()); });

            liga('cron-ligar', function () {
                var s = sessaoAtual();
                if (s.cronometro && s.cronometro.correndo) {
                    pararCronometro(s);
                } else {
                    guardarSessao(s, {
                        cronometro: {
                            correndo: true,
                            inicio: Store.agora(),
                            acumulado: (s.cronometro && s.cronometro.acumulado) || 0
                        }
                    });
                }
                App.recarregar();
            });

            liga('cron-zerar', function () {
                guardarSessao(sessaoAtual(), { cronometro: { correndo: false, inicio: null, acumulado: 0 } });
                App.recarregar();
            });

            liga('cron-mais', function () {
                var s = sessaoAtual();
                guardarSessao(s, { tempoOrador: (s.tempoOrador || 90) + 30 });
                App.recarregar();
            });

            liga('proximo', function () {
                var s = sessaoAtual();
                var segundos = pararCronometro(s);
                if (s.oradorAtual && segundos > 0) {
                    Store.inserir('discursos', {
                        comissaoId: c.id, sessaoId: s.id, delegacaoId: s.oradorAtual,
                        segundos: Math.min(segundos, (s.tempoOrador || 90) * 3), quando: Store.agora()
                    });
                }
                var fila = (s.fila || []).slice();
                var proximo = fila.shift() || null;
                guardarSessao(s, {
                    oradorAtual: proximo, fila: fila,
                    cronometro: { correndo: false, inicio: null, acumulado: 0 }
                });
                App.recarregar();
            });

            liga('por-fila', function (el) {
                var s = sessaoAtual();
                var fila = (s.fila || []).slice();
                var id = el.getAttribute('data-id');
                if (!s.oradorAtual) {
                    guardarSessao(s, { oradorAtual: id });
                } else if (fila.indexOf(id) === -1) {
                    fila.push(id);
                    guardarSessao(s, { fila: fila });
                }
                App.recarregar();
            });

            liga('tirar-fila', function (el) {
                var s = sessaoAtual();
                guardarSessao(s, {
                    fila: (s.fila || []).filter(function (x) { return x !== el.getAttribute('data-id'); })
                });
                App.recarregar();
            });

            function mover(id, passo) {
                var s = sessaoAtual();
                var fila = (s.fila || []).slice();
                var i = fila.indexOf(id);
                var j = i + passo;
                if (i === -1 || j < 0 || j >= fila.length) { return; }
                fila[i] = fila[j];
                fila[j] = id;
                guardarSessao(s, { fila: fila });
                App.recarregar();
            }
            liga('subir', function (el) { mover(el.getAttribute('data-id'), -1); });
            liga('descer', function (el) { mover(el.getAttribute('data-id'), 1); });

            liga('presenca', function (el) {
                var d = Store.encontrar('delegacoes', el.getAttribute('data-id'));
                var ciclo = { ausente: 'presente', presente: 'votante', votante: 'ausente' };
                Store.atualizar('delegacoes', d.id, { presenca: ciclo[d.presenca] || 'presente' });
                App.recarregar();
            });

            liga('chamar-todos', function () {
                delegacoes.forEach(function (d) {
                    if (d.presenca === 'ausente') { Store.atualizar('delegacoes', d.id, { presenca: 'votante' }); }
                });
                Store.registar('Chamada', 'Todas as delegações de ' + c.nome + ' marcadas presentes.');
                UI.toast('Chamada atualizada.', 'sucesso');
                App.recarregar();
            });

            liga('nova-mocao', function () { formularioMocao(c.id, delegacoes); });
            liga('votar-mocao', function (el) {
                formularioVoto(Store.encontrar('mocoes', el.getAttribute('data-id')));
            });

            /* Cronômetro a correr: atualiza só o relogio, sem redesenhar a vista. */
            var s = sessaoAtual();
            if (s && s.cronometro && s.cronometro.correndo) {
                tique = setInterval(function () {
                    var atual = Dados.sessaoDe(c.id);
                    if (!atual || !atual.cronometro.correndo) { clearInterval(tique); return; }
                    var decorrido = Dados.decorrido(atual);
                    var alvo = atual.tempoOrador || 90;
                    var relogio = document.getElementById('relogio');
                    var barra = document.getElementById('relogio-barra');
                    if (!relogio) { clearInterval(tique); return; }
                    relogio.textContent = Dados.relogio(decorrido);
                    if (barra) { barra.style.width = Math.min(100, (decorrido / alvo) * 100) + '%'; }
                    if (decorrido >= alvo) {
                        clearInterval(tique);
                        Store.atualizar('sessoes', atual.id, {
                            cronometro: { correndo: false, inicio: null, acumulado: alvo }
                        });
                        var bloco = document.getElementById('bloco-cronometro');
                        if (bloco) { bloco.classList.add('cronometro--esgotado'); }
                        UI.toast('Tempo esgotado.', 'aviso');
                        App.recarregar();
                    }
                }, 250);
            }
        },

        desligar: function () {
            if (tique) { clearInterval(tique); tique = null; }
        }
    };
})(window);
