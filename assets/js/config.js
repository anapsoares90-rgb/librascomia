/* =========================================================================
   Configuração da plataforma
   -------------------------------------------------------------------------
   Para usar o painel só neste computador (demonstração, sem internet),
   coloque usarNuvem: false. Com usarNuvem: true, os dados passam a viver no
   Firebase e todos os coordenadores veem as mesmas informações, em tempo real.

   A configuração do Firebase abaixo NÃO é um segredo: ela identifica o
   projeto e vai dentro de qualquer página web que use o Firebase. Quem
   protege os dados são as regras em firestore.rules — essas sim precisam
   estar publicadas no projeto.
   ========================================================================= */
window.CONFIG = {
    /* Ligue para true DEPOIS de concluir os quatro passos do README
       (ativar o login por e-mail, criar a primeira conta, criar papeis/{uid}
       e publicar as regras). Com false, o painel funciona neste navegador,
       como demonstração. */
    usarNuvem: false,

    firebase: {
        apiKey: 'AIzaSyDSDhl-box8IO4PwsoJsn96tKgANXwSDis',
        authDomain: 'siv-protagonismo.firebaseapp.com',
        projectId: 'siv-protagonismo',
        storageBucket: 'siv-protagonismo.firebasestorage.app',
        messagingSenderId: '828050948696',
        appId: '1:828050948696:web:63b1956e199a7e39f9402d',
        measurementId: 'G-D0YFYGF1VD'
    },

    /* O Google Analytics fica desligado de propósito: o painel é usado por
       alunos, e medir o comportamento deles não faz parte do projeto. Para
       ligar, carregue também o firebase-analytics-compat.js e mude para true. */
    usarAnalytics: false
};
