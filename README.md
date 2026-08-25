# librascomia

Protótipos web de apoio à sala de aula. Cada aplicação é um único ficheiro HTML — basta abrir no navegador, sem instalação.

| Aplicação | Ficheiro | Descrição |
|---|---|---|
| Libras Gestos & Voz | [`index.html`](index.html) | Protótipo de tradutor de gestos com deteção de mãos pela webcam. |
| Monitor de Funções Executivas | [`funcoes-executivas.html`](funcoes-executivas.html) | Acompanhamento, pelo professor, dos requisitos de aprendizagem das funções executivas por faixa etária. Publicado em [funcoes-executivas.netlify.app](https://funcoes-executivas.netlify.app/). |

## Monitor de Funções Executivas

Disponível em **https://funcoes-executivas.netlify.app/**


Permite ao professor observar e acompanhar a evolução de cada aluno nos requisitos
de aprendizagem esperados para a sua idade.

**Referencial:** 6 faixas etárias (3-4, 5-6, 7-8, 9-11, 12-14 e 15-18 anos) × 8 domínios
das funções executivas — atenção sustentada, memória de trabalho, controlo inibitório,
flexibilidade cognitiva, planeamento e organização, iniciativa e persistência, regulação
emocional e metacognição.

- **240 indicadores observáveis** (5 por domínio em cada faixa), cada um com um exemplo
  concreto de evidência, para que dois professores leiam o mesmo requisito da mesma forma.
- **48 estratégias de intervenção**, específicas de cada domínio *e* faixa etária.
- **Critérios de alerta** que a aplicação verifica automaticamente e assinala na ficha do
  aluno, com a ressalva de que não constituem diagnóstico.

**Escala de observação:** Não observado · Emergente · Em desenvolvimento · Consolidado.

**Funcionalidades**

- Registo de alunos com atribuição automática da faixa etária pela data de nascimento
  (e possibilidade de aplicar um referencial adaptado, diferente da idade cronológica).
- Registo de observações datadas, indicador a indicador, com notas qualitativas e
  **registo do contexto** (trabalho individual, de grupo, momento de avaliação, recreio...).
- **Autoavaliação do aluno** a partir dos 9 anos, com oito afirmações na primeira pessoa,
  comparada lado a lado com a observação do professor.
- **Metas e plano de intervenção**: cada meta liga um domínio frágil a uma estratégia
  concreta, com data de revisão; as metas por rever aparecem no painel da turma.
- Painel da turma: médias por domínio, prioridades de intervenção, metas em curso e em
  atraso, evolução por aluno e filtros por turma/faixa.
- Ficha de progresso individual: radar por domínio, curva de evolução, perfil por contexto,
  comparação com a observação anterior, sinais a considerar, estratégias e histórico completo.
- Exportação em JSON (cópia de segurança) e CSV (folha de cálculo); importação de JSON.
- Impressão de relatório por aluno ou do panorama da turma.
- Dados de exemplo para explorar a aplicação.

**Privacidade:** os dados ficam guardados apenas no navegador do dispositivo
(`localStorage`) e não são enviados para nenhum servidor. Exporte com regularidade,
uma vez que limpar os dados do navegador elimina os registos.

O instrumento apoia a observação pedagógica e não constitui diagnóstico.

### Publicar uma nova versão

O site da Netlify é servido a partir de um envio manual da pasta de publicação
(`index.html` = conteúdo de `funcoes-executivas.html`). Para atualizar depois de
alterar a app, basta voltar a largar o ficheiro em
`app.netlify.com/projects/funcoes-executivas/deploys`, com o nome `index.html`.
