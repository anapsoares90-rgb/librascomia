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
                (mensagem.prioridade === 'alta' ? '<div class="mb-3">' + UI.etiqueta('Urgente', 'rose', { forte: true }) + '</div>' : '') +
                '<div class="corpo-texto corpo-texto--destacado">' + UI.nl2br(mensagem.corpo) + '</div>' +
                (Auth.ehSupra()
                    ? '<div class="mt-4"><p class="sobrancelha">Lido por (' + leitores.length + ')</p>' +
                      '<p class="texto-medio" style="margin-top:.3rem">' + (leitores.length ? UI.esc(leitores.join(', ')) : 'Ainda ninguem abriu este comunicado.') + '</p></div>'
                    : ''),
            rodape: '<button type="button" data-fechar="1" class="btn">Fechar</button>',
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
            if (Auth.pode('mensagens.geral')) {
                acoes += '<button class="btn" data-acao="geral">' + UI.icone('radio', 15) + ' Comunicado geral</button>';
            }
            if (Auth.pode('mensagens.enviar')) {
                acoes += '<button class="btn btn--principal" data-acao="nova">' + UI.icone('send', 15) + ' Nova comunicacao</button>';
            }

            var html = UI.cabecalho('Comunicacao', 'Central de comunicacao',
                Auth.ehSupra() ? 'Envia mensagens para uma comissao, para uma frente inteira ou para toda a plataforma.'
                               : 'Comunicados recebidos da coordenacao e mensagens da tua comissao.',
                acoes);

            html += UI.metricas([
                { rotulo: 'Comunicados', valor: todas.length, tom: 'violet' },
                { rotulo: 'Por ler', valor: Dados.naoLidas(), tom: 'amber' },
                { rotulo: 'Urgentes', valor: todas.filter(function (m) { return m.prioridade === 'alta'; }).length, tom: 'rose' },
                { rotulo: 'Enviados por mim', valor: todas.filter(function (m) { return eu && m.autorId === eu.id; }).length, tom: 'emerald' }
            ]);

            html += '<div class="flex flex-wrap gap-1.5 mb-4">' +
                [['', 'Todos'], ['geral', 'Gerais'], ['frente', 'Por frente'], ['comissao', 'Por comissao']].map(function (par) {
                    return '<button class="filtro' + (filtro.alcance === par[0] ? ' filtro--ativo' : '') + '" data-filtro="' + par[0] + '">' + par[1] + '</button>';
                }).join('') +
            '</div>';

            if (!lista.length) {
                return html + UI.painel('', UI.vazio('Ainda nao ha comunicados nesta categoria.', 'message-square-off'));
            }

            html += UI.painel('', lista.map(function (m) {
                var lida = !eu || m.autorId === eu.id || (m.lidasPor || []).indexOf(eu.id) !== -1;
                return '<article class="registo">' +
                        UI.avatar(Dados.nomeUsuario(m.autorId), m.prioridade === 'alta' ? 'rose' : 'indigo') +
                        '<div class="min-w-0 flex-1">' +
                            '<div class="flex flex-wrap items-center gap-x-3 gap-y-1">' +
                                (lida ? '' : '<span class="pastilha tom-indigo">novo</span>') +
                                '<h3 style="font-weight:600;font-size:.875rem">' + UI.esc(m.assunto) + '</h3>' +
                                (m.prioridade === 'alta' ? UI.etiqueta('Urgente', 'rose', { forte: true }) : '') +
                                UI.etiqueta(Dados.destinatarios(m), 'slate') +
                            '</div>' +
                            '<p class="texto-medio line-clamp-2" style="margin-top:.25rem">' + UI.esc(m.corpo) + '</p>' +
                            '<p class="nota" style="margin-top:.35rem">' + UI.esc(Dados.nomeUsuario(m.autorId)) + ' · ' + UI.haQuanto(m.criadoEm) +
                                (Auth.ehSupra() ? ' · ' + (m.lidasPor || []).length + ' leitura(s)' : '') + '</p>' +
                        '</div>' +
                        '<div class="flex items-center gap-1.5 shrink-0">' +
                            '<button class="btn btn--pequeno" data-acao="ver" data-id="' + m.id + '">Ler</button>' +
                            ((Auth.ehSupra() || (eu && m.autorId === eu.id))
                                ? '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + m.id + '">' + UI.icone('trash-2', 13) + '</button>' : '') +
                        '</div>' +
                    '</article>';
            }).join(''), { semPadding: true });

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
