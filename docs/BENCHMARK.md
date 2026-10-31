# Benchmark de plataformas de estudo

Este documento compara plataformas de estudo conhecidas para justificar as escolhas do Portal do Aluno: o que cada uma faz bem, o que o portal aproveitou e o que ficou de fora de propósito.

## Premissas do projeto

O portal precisa funcionar numa escola pública com poucos recursos. As premissas são estas:

- **Sem cadastro de aluno.** O aluno não cria conta nem informa dados pessoais. Isso atende à LGPD (art. 14, dados de crianças e adolescentes) e tira da escola o peso de gerenciar senhas.
- **Custo zero.** O site é hospedado de graça e o banco usa o plano gratuito do Firebase, inclusive para os anexos.
- **Celular primeiro.** A maioria dos alunos acessa pelo celular, muitas vezes com internet limitada.
- **Pouco trabalho para a escola.** Publicar algo deve levar menos de um minuto. O horário é preenchido como uma tabela, do jeito que a escola já faz no papel ou na planilha.

## Plataformas analisadas

| Plataforma | O que faz bem | O que o portal aproveitou | O que ficou de fora e por quê |
|---|---|---|---|
| **Google Classroom** | Mural da turma, prazos e materiais num só lugar | Mural de avisos, provas com contagem de dias e resumos com anexo | Entrega de trabalhos e notas, que exigem conta de aluno |
| **Quizlet** | Flashcards: pergunta de um lado, resposta do outro | Perguntas cadastradas pelo professor em cada resumo, para o aluno se testar | Biblioteca aberta de cartões feitos por terceiros, sem curadoria |
| **Anki** | Repetição espaçada com intervalos crescentes | Revisão de cada resumo em 1, 7 e 30 dias, com lembrete no portal | Algoritmo complexo e configurações demais para a idade do público |
| **Duolingo** | Sessões curtas e fáceis de começar | Cronômetro de estudo de 25 minutos e testes de poucas perguntas | Sequência de dias, vidas, ligas e rankings, que geram pressão e comparação |
| **Khan Academy** | Conteúdo organizado por disciplina e assunto | Resumos organizados por mês, com filtro por disciplina e busca | Vídeos e exercícios próprios: o conteúdo vem do professor da turma |
| **ClassDojo** | Comunicação simples com as famílias | Portal aberto para responsáveis, sem login | Pontos de comportamento, que expõem o aluno |
| **Moodle** | Ambiente completo (cursos, fóruns, notas) | Organização por série e disciplina | Servidor, instalação e manutenção caros para a escola |
| **Planilhas de horário** (Excel e Google Planilhas) | Formato que toda escola já usa | Quadro de horários em tabela, que aceita colar direto da planilha | — |

## Base pedagógica

As funções de estudo do portal seguem técnicas com boa evidência científica:

1. **Prática de recuperação** (*retrieval practice*). Tentar lembrar a resposta fixa mais do que reler o conteúdo (Roediger e Karpicke, 2006). No portal, isso são as **perguntas dos resumos**.
2. **Prática espaçada.** Revisar em intervalos crescentes reduz o esquecimento (Cepeda e colegas, 2006). No portal, isso é a **revisão em 1, 7 e 30 dias**.
3. **Avaliação das técnicas.** Uma revisão ampla de técnicas de estudo classificou a prática de testes e a prática espaçada como as de maior utilidade, e reler e grifar como as de baixa utilidade (Dunlosky e colegas, 2013).
4. **Blocos de foco.** Intervalos curtos de estudo com pausas ajudam a começar e a manter a atenção (técnica Pomodoro, Francesco Cirillo). No portal, isso é o **cronômetro de 25 + 5 minutos**.
5. **Motivação sem punição.** Pela Teoria da Autodeterminação (Deci e Ryan), autonomia e sensação de progresso motivam mais do que pontos e rankings. Por isso o portal não tem placar, sequência de dias nem comparação entre colegas.

## Como isso aparece no portal

**Para o aluno e a família:**
- **Hoje**: aulas do dia, merenda e as próximas provas.
- **Horário das aulas** em tabela, com o dia de hoje destacado.
- **Provas e datas** com o conteúdo da prova e quantos dias faltam.
- **Mural de avisos** com a etiqueta "Novo" no que foi publicado desde a última visita.
- **Resumos** separados por mês, com filtro por disciplina, busca, anexo (PDF ou imagem) e link.
- Em cada resumo, o aluno pode **marcar como estudado** (o portal agenda as revisões) e **fazer o teste** com as perguntas do professor.
- **Cardápio da semana** como foto ou PDF, e opcionalmente dia a dia.
- **Cronômetro de estudo** e **Minha agenda**. Tudo o que o aluno marca ou anota fica só no aparelho dele.

**Para professores e coordenação (Área da escola):**
- **Quadro de horários**: horários nas linhas, dias nas colunas. A escola digita a disciplina em cada célula ou cola a tabela de uma planilha. Tudo é salvo de uma vez.
- **Provas e datas**, **avisos** e **resumos** em tabelas com busca, filtro por série, editar, duplicar e excluir.
- **Anexos** nos resumos e no cardápio: imagens são reduzidas automaticamente e PDFs podem ter até 700 KB.

## Próximos passos possíveis

- Formulário de opinião ligado ao Google Forms, para medir a satisfação de alunos e professores.
- Instalação no celular como aplicativo (PWA), com funcionamento sem internet.
- Dicas de estudo editáveis pela escola na Área da escola.
