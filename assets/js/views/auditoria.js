/* ===================== Registo de atividade (log) ====================== */
(function (global) {
    'use strict';

    global.Views = global.Views || {};
    global.Views.auditoria = {
        titulo: 'Atividade',
        render: function () {
            var registos = Store.listar('auditoria');
            var html = UI.cabecalho('Acompanhamento', 'Registo de atividade',
                'Historico das acoes feitas na plataforma pelos coordenadores.',
                '<button class="btn" data-acao="exportar">' + UI.icone('download', 15) + ' Exportar dados</button>' +
                '<button class="btn btn--perigo" data-acao="repor">' + UI.icone('rotate-ccw', 15) + ' Repor demonstracao</button>');

            if (!registos.length) {
                return html + UI.painel('', UI.vazio('Ainda nao ha atividade registada.', 'history'));
            }

            html += UI.painel('', registos.slice(0, 120).map(function (r) {
                return '<div class="registo">' +
                    UI.avatar(Dados.nomeUsuario(r.usuarioId), 'slate', 'pequeno') +
                    '<div class="min-w-0 flex-1">' +
                        '<p style="font-size:.8125rem"><b>' + UI.esc(Dados.nomeUsuario(r.usuarioId)) + '</b> · ' + UI.esc(r.acao) + '</p>' +
                        (r.detalhe ? '<p class="nota truncate">' + UI.esc(r.detalhe) + '</p>' : '') +
                    '</div>' +
                    '<span class="nota shrink-0">' + UI.dataHora(r.quando) + '</span>' +
                '</div>';
            }).join(''), { semPadding: true });

            return html;
        },
        ligar: function (raiz) {
            var exp = raiz.querySelector('[data-acao="exportar"]');
            if (exp) {
                exp.addEventListener('click', function () {
                    UI.guardarFicheiro('protagonismo-dados.json', Store.exportar(), 'application/json');
                });
            }
            var rep = raiz.querySelector('[data-acao="repor"]');
            if (rep) {
                rep.addEventListener('click', function () {
                    UI.confirmar({
                        titulo: 'Repor dados de demonstracao',
                        mensagem: 'Isto apaga tudo o que foi criado neste browser e volta aos dados iniciais. Queres continuar?',
                        confirmar: 'Repor tudo',
                        aoConfirmar: function () {
                            Store.repor();
                            UI.toast('Plataforma reposta.', 'sucesso');
                            App.recarregar();
                        }
                    });
                });
            }
        }
    };
})(window);
