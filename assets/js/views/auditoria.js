/* ===================== Registro de atividade (log) ====================== */
(function (global) {
    'use strict';

    global.Views = global.Views || {};
    global.Views.auditoria = {
        titulo: 'Atividade',
        render: function () {
            var registos = Store.listar('auditoria');
            var html = UI.cabecalho('Acompanhamento', 'Registro de atividade',
                'Histórico das ações feitas na plataforma pelos coordenadores.',
                (Auth.ehSupra() && global.Nuvem && Nuvem.disponivel()
                    ? '<button class="btn" data-acao="nuvem">' + UI.icone('cloud-upload', 15) + ' Enviar dados para a nuvem</button>'
                    : '') +
                '<button class="btn" data-acao="exportar">' + UI.icone('download', 15) + ' Exportar dados</button>' +
                '<button class="btn btn--perigo" data-acao="repor">' + UI.icone('rotate-ccw', 15) + ' Repor demonstração</button>');

            if (!registos.length) {
                return html + UI.painel('', UI.vazio('Ainda não ha atividade registrada.', 'history'));
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
            var nuvem = raiz.querySelector('[data-acao="nuvem"]');
            if (nuvem) {
                nuvem.addEventListener('click', function () {
                    UI.confirmar({
                        titulo: 'Enviar os dados para o Firebase',
                        mensagem: 'Copia tudo o que está neste navegador para o projeto na nuvem. ' +
                                  'Documentos com o mesmo identificador são substituídos. Faça isto uma vez, ' +
                                  'a partir do computador que tem os dados certos.',
                        confirmar: 'Enviar',
                        aoConfirmar: function () {
                            UI.toast('A enviar...', 'info');
                            Nuvem.enviarTudo(Store.baseLocal(), function (r) {
                                if (r.ok) {
                                    UI.toast(r.total + ' registros enviados para a nuvem.', 'sucesso');
                                } else {
                                    UI.toast('Falhou: ' + r.erro, 'erro');
                                }
                            });
                        }
                    });
                });
            }

            var rep = raiz.querySelector('[data-acao="repor"]');
            if (rep) {
                rep.addEventListener('click', function () {
                    UI.confirmar({
                        titulo: 'Repor dados de demonstração',
                        mensagem: 'Isto apaga tudo o que foi criado neste browser e volta aos dados iniciais. Quer continuar?',
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
