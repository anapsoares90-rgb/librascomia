/* ===================== Registo de atividade (log) ====================== */
(function (global) {
    'use strict';

    global.Views = global.Views || {};
    global.Views.auditoria = {
        titulo: 'Atividade',
        render: function () {
            var registos = Store.listar('auditoria');
            var html = UI.cabecalho('Registo de atividade',
                'Historico das acoes feitas na plataforma pelos coordenadores.',
                '<button class="btn-secundario" data-acao="exportar"><i data-lucide="download" class="w-4 h-4"></i> Exportar dados</button>' +
                '<button class="btn-perigo" data-acao="repor"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Repor demonstracao</button>');

            if (!registos.length) {
                return html + UI.cartao(UI.vazio('Ainda nao ha atividade registada.', 'history'));
            }

            html += UI.cartao('<ul class="divide-y divide-slate-700/60">' + registos.slice(0, 120).map(function (r) {
                return '<li class="flex items-start gap-3 px-5 py-3">' +
                    UI.avatar(Dados.nomeUsuario(r.usuarioId), 'slate', 'w-8 h-8 text-[10px]') +
                    '<div class="min-w-0 flex-1">' +
                        '<p class="text-sm text-white"><span class="font-semibold">' + UI.esc(Dados.nomeUsuario(r.usuarioId)) + '</span> · ' + UI.esc(r.acao) + '</p>' +
                        (r.detalhe ? '<p class="text-xs text-slate-400 truncate">' + UI.esc(r.detalhe) + '</p>' : '') +
                    '</div>' +
                    '<span class="text-[11px] text-slate-500 shrink-0">' + UI.dataHora(r.quando) + '</span>' +
                '</li>';
            }).join('') + '</ul>');

            return html;
        },
        ligar: function (raiz) {
            var exp = raiz.querySelector('[data-acao="exportar"]');
            if (exp) {
                exp.addEventListener('click', function () {
                    var blob = new Blob([Store.exportar()], { type: 'application/json' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'protagonismo-dados.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    UI.toast('Copia de seguranca gerada.', 'sucesso');
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
