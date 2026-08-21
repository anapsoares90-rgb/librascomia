/* ================= Central de comunicacao (mensagens) ================== */
(function (global) {
    'use strict';

    var filtro = { alcance: '' };

    function formulario(preAlcance, preComissaoId) {
        var eu = Auth.usuarioAtual();
        if (!eu) { return; }
        var podeGeral = Auth.pode('mensagens.geral');

        var alcances = [];
        if (podeGeral) {
            alcances.push({ valor: 'geral', rotulo: 'Comunicado geral — todas as comissoes' });
            alcances.push({ valor: 'frente', rotulo: 'Uma frente inteira' });
        }
        alcances.push({ valor: 'comissao', rotulo: 'Uma comissao especifica' });

        UI.formulario({
            titulo: 'Nova comunicacao',
            subtitulo: 'Ferramenta de comunicacao entre as comissoes do Protagonismo.',
            largura: 'max-w-2xl',
            botao: 'Enviar comunicado',
            campos: [
                { nome: 'assunto', rotulo: 'Assunto', tipo: 'text', valor: '', obrigatorio: true, placeholder: 'Ex.: Reuniao geral de coordenadores' },
                { nome: 'corpo', rotulo: 'Mensagem', tipo: 'textarea', linhas: 6, valor: '', obrigatorio: true },
                {
                    nome: 'alcance', rotulo: 'Destinatarios', tipo: 'select', largura: 'metade',
                    valor: preAlcance || alcances[0].valor, opcoes: alcances, obrigatorio: true
                },
                {
                    nome: 'prioridade', rotulo: 'Prioridade', tipo: 'select', largura: 'metade', valor: 'normal',
                    opcoes: [
                        { valor: 'normal', rotulo: 'Normal' },
                        { valor: 'alta', rotulo: 'Urgente' }
                    ]
                },
                {
                    nome: 'frenteId', rotulo: 'Frente (se aplicavel)', tipo: 'select', largura: 'metade',
                    valor: '', opcoes: Dados.opcoesFrentes('— nao aplicavel —')
                },
                {
                    nome: 'comissaoId', rotulo: 'Comissao (se aplicavel)', tipo: 'select', largura: 'metade',
                    valor: preComissaoId || '', opcoes: Dados.opcoesComissoes(null, '— nao aplicavel —')
                }
            ],
            validar: function (d) {
                if (d.alcance === 'frente' && !d.frenteId) { return 'Escolhe a frente destinataria.'; }
                if (d.alcance === 'comissao' && !d.comissaoId) { return 'Escolhe a comissao destinataria.'; }
                if (d.alcance === 'comissao' && !Auth.veComissao(d.comissaoId)) { return 'Nao tens acesso a essa comissao.'; }
                return null;
            },
            aoGuardar: function (d) {
                Store.inserir('mensagens', {
                    assunto: d.assunto, corpo: d.corpo, autorId: eu.id,
                    alcance: d.alcance,
                    frenteId: d.alcance === 'frente' ? d.frenteId : (d.frenteId || null),
                    comissaoId: d.alcance === 'comissao' ? d.comissaoId : null,
                    prioridade: d.prioridade, lidasPor: []
                });
                Store.registar('Comunicado enviado', d.assunto + ' → ' + (d.alcance === 'geral' ? 'todas as comissoes' : d.alcance === 'frente' ? Dados.nomeFrente(d.frenteId) : Dados.nomeComissao(d.comissaoId)));
                UI.toast('Comunicado enviado.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function ver(mensagem) {
        Dados.marcarLida(mensagem.id);
        var leitores = (mensagem.lidasPor || []).map(Dados.nomeUsuario);
        UI.modal({
            titulo: mensagem.assunto,
            subtitulo: Dados.nomeUsuario(mensagem.autorId) + ' · ' + Dados.destinatarios(mensagem) + ' · ' + UI.dataHora(mensagem.criadoEm),
            largura: 'max-w-xl',
            corpo:
                (mensagem.prioridade === 'alta' ? '<div class="mb-3">' + UI.chip('Urgente', 'rose', 'alert-triangle') + '</div>' : '') +
                '<div class="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800/50 border border-slate-700 rounded-xl p-4">' + UI.nl2br(mensagem.corpo) + '</div>' +
                (Auth.ehSupra()
                    ? '<div class="mt-4"><p class="text-[11px] uppercase font-bold text-slate-400 mb-1.5">Lido por (' + leitores.length + ')</p>' +
                      '<p class="text-xs text-slate-300">' + (leitores.length ? UI.esc(leitores.join(', ')) : 'Ainda ninguem abriu este comunicado.') + '</p></div>'
                    : ''),
            rodape: '<button type="button" data-fechar="1" class="btn-secundario">Fechar</button>',
            aoAbrir: function () { App.atualizarContadores(); }
        });
    }

    function eliminar(mensagem) {
        UI.confirmar({
            titulo: 'Eliminar comunicado',
            mensagem: 'Queres eliminar o comunicado "' + mensagem.assunto + '"?',
            aoConfirmar: function () {
                Store.remover('mensagens', mensagem.id);
                Store.registar('Comunicado eliminado', mensagem.assunto);
                UI.toast('Comunicado eliminado.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.mensagens = {
        titulo: 'Comunicacao',
        formulario: formulario,
        render: function () {
            var eu = Auth.usuarioAtual();
            var todas = Dados.mensagensVisiveis();
            var lista = todas.filter(function (m) { return !filtro.alcance || m.alcance === filtro.alcance; });

            var acoes = '';
            if (Auth.pode('mensagens.enviar')) {
                acoes += '<button class="btn-primario" data-acao="nova"><i data-lucide="send" class="w-4 h-4"></i> Nova comunicacao</button>';
            }
            if (Auth.pode('mensagens.geral')) {
                acoes = '<button class="btn-secundario" data-acao="geral"><i data-lucide="radio" class="w-4 h-4"></i> Comunicado geral</button>' + acoes;
            }

            var html = UI.cabecalho('Central de comunicacao',
                Auth.ehSupra() ? 'Envia mensagens para uma comissao, para uma frente inteira ou para toda a plataforma.'
                               : 'Comunicados recebidos da coordenacao e mensagens da tua comissao.',
                acoes);

            html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">' +
                UI.estatistica('Comunicados', todas.length, 'messages-square', 'violet') +
                UI.estatistica('Por ler', Dados.naoLidas(), 'mail-open', 'amber') +
                UI.estatistica('Urgentes', todas.filter(function (m) { return m.prioridade === 'alta'; }).length, 'alert-triangle', 'rose') +
                UI.estatistica('Enviados por mim', todas.filter(function (m) { return eu && m.autorId === eu.id; }).length, 'send', 'emerald') +
            '</div>';

            html += '<div class="flex flex-wrap gap-2 mb-5">' +
                [['', 'Todos'], ['geral', 'Gerais'], ['frente', 'Por frente'], ['comissao', 'Por comissao']].map(function (par) {
                    var ativo = filtro.alcance === par[0];
                    return '<button class="' + (ativo ? 'btn-filtro-ativo' : 'btn-filtro') + '" data-filtro="' + par[0] + '">' + par[1] + '</button>';
                }).join('') +
            '</div>';

            if (!lista.length) {
                return html + UI.cartao(UI.vazio('Ainda nao ha comunicados nesta categoria.', 'message-square-off'));
            }

            html += '<div class="space-y-3">' + lista.map(function (m) {
                var lida = !eu || m.autorId === eu.id || (m.lidasPor || []).indexOf(eu.id) !== -1;
                var iconeAlcance = m.alcance === 'geral' ? 'radio' : m.alcance === 'frente' ? 'layers' : 'users-round';
                return '<div class="bg-slate-850 border ' + (lida ? 'border-slate-700' : 'border-indigo-500/40') + ' rounded-2xl p-4 hover:border-slate-600 transition-all">' +
                    '<div class="flex gap-4">' +
                        UI.avatar(Dados.nomeUsuario(m.autorId), m.prioridade === 'alta' ? 'rose' : 'indigo', 'w-10 h-10 text-xs') +
                        '<div class="min-w-0 flex-1">' +
                            '<div class="flex flex-wrap items-center gap-2">' +
                                (lida ? '' : '<span class="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>') +
                                '<h3 class="font-bold text-white">' + UI.esc(m.assunto) + '</h3>' +
                                (m.prioridade === 'alta' ? UI.chip('Urgente', 'rose', 'alert-triangle') : '') +
                                UI.chip(Dados.destinatarios(m), 'slate', iconeAlcance) +
                            '</div>' +
                            '<p class="text-sm text-slate-400 mt-1.5 line-clamp-2">' + UI.esc(m.corpo) + '</p>' +
                            '<p class="text-[11px] text-slate-500 mt-2">' + UI.esc(Dados.nomeUsuario(m.autorId)) + ' · ' + UI.haQuanto(m.criadoEm) +
                                (Auth.ehSupra() ? ' · ' + (m.lidasPor || []).length + ' leitura(s)' : '') + '</p>' +
                        '</div>' +
                        '<div class="flex flex-col sm:flex-row items-start gap-1.5 shrink-0">' +
                            '<button class="btn-mini-claro" data-acao="ver" data-id="' + m.id + '">Ler</button>' +
                            ((Auth.ehSupra() || (eu && m.autorId === eu.id))
                                ? '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + m.id + '"><i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(); }); }
            var g = raiz.querySelector('[data-acao="geral"]');
            if (g) { g.addEventListener('click', function () { formulario('geral'); }); }
            raiz.querySelectorAll('[data-filtro]').forEach(function (el) {
                el.addEventListener('click', function () { filtro.alcance = el.getAttribute('data-filtro'); App.recarregar(); });
            });
            raiz.querySelectorAll('[data-acao="ver"]').forEach(function (el) {
                el.addEventListener('click', function () { ver(Store.encontrar('mensagens', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('mensagens', el.getAttribute('data-id'))); });
            });
        }
    };
})(window);
