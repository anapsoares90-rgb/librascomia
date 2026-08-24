# librascomia

Protótipos web de apoio à sala de aula. Cada aplicação é um único ficheiro HTML — basta abrir no navegador, sem instalação.

| Aplicação | Ficheiro | Descrição |
|---|---|---|
| Libras Gestos & Voz | [`index.html`](index.html) | Protótipo de tradutor de gestos com deteção de mãos pela webcam. |
| Monitor de Funções Executivas | [`funcoes-executivas.html`](funcoes-executivas.html) | Acompanhamento, pelo professor, dos requisitos de aprendizagem das funções executivas por faixa etária. |

## Monitor de Funções Executivas

Permite ao professor observar e acompanhar a evolução de cada aluno nos requisitos
de aprendizagem esperados para a sua idade.

**Referencial:** 6 faixas etárias (3-4, 5-6, 7-8, 9-11, 12-14 e 15-18 anos) × 8 domínios
das funções executivas — atenção sustentada, memória de trabalho, controlo inibitório,
flexibilidade cognitiva, planeamento e organização, iniciativa e persistência, regulação
emocional e metacognição — num total de 144 indicadores observáveis.

**Escala de observação:** Não observado · Emergente · Em desenvolvimento · Consolidado.

**Funcionalidades**

- Registo de alunos com atribuição automática da faixa etária pela data de nascimento
  (e possibilidade de aplicar um referencial adaptado, diferente da idade cronológica).
- Registo de observações datadas, indicador a indicador, com notas qualitativas.
- Painel da turma: médias por domínio, prioridades de intervenção, evolução por aluno e filtros por turma/faixa.
- Ficha de progresso individual: radar por domínio, curva de evolução, comparação com a
  observação anterior, sugestões de estratégias e histórico completo.
- Exportação em JSON (cópia de segurança) e CSV (folha de cálculo); importação de JSON.
- Impressão de relatório por aluno ou do panorama da turma.
- Dados de exemplo para explorar a aplicação.

**Privacidade:** os dados ficam guardados apenas no navegador do dispositivo
(`localStorage`) e não são enviados para nenhum servidor. Exporte com regularidade,
uma vez que limpar os dados do navegador elimina os registos.

O instrumento apoia a observação pedagógica e não constitui diagnóstico.
