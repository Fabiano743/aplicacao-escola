/**
 * @file config.js
 * Configurações gerais do Portal do Aluno: conexão com o Firebase, dados da
 * escola e listas usadas nas telas (séries, dias, horários, disciplinas e tipos).
 * Para usar o portal em outra escola, basta alterar este arquivo.
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */

/**
 * Dados do projeto no Firebase (Console > Configurações do projeto > Seus apps > Web).
 * A apiKey identifica o projeto e não é uma senha; a proteção dos dados é feita
 * pelas regras do Firestore (firestore.rules).
 */
export const firebaseConfig = {
  apiKey: "AIzaSyACeCgzz4JhdeobB7XzC7Q5NtCTfOWD894",
  authDomain: "aplicacao-escolar-11e09.firebaseapp.com",
  projectId: "aplicacao-escolar-11e09",
  appId: "1:456907817407:web:bdcf460b3b6c550d47210a"
};

/**
 * Nome, sigla (logo do topo) e texto do rodapé.
 * TODO: trocar pelo nome da escola depois da aprovação do projeto.
 */
export const ESCOLA = {
  nome: "Portal do Aluno",
  sigla: "PA",
  rodape: "Projeto de extensão comunitária."
};

/** Séries atendidas pela escola, na ordem em que aparecem nos selects. */
export const SERIES = ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"];

/** Dias letivos da semana (colunas do horário e do cardápio). */
export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

/** Horários que já aparecem no quadro quando a série ainda não tem horário cadastrado. */
export const HORARIOS = ["07:30 - 08:20", "08:20 - 09:10", "09:10 - 10:00", "10:20 - 11:10", "11:10 - 12:00"];

/** Sugestões do campo de disciplina (o professor pode digitar outra). */
export const DISCIPLINAS = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Arte",
  "Educação Física",
  "Língua Inglesa",
  "Ensino Religioso"
];

/** Tipos de data da agenda. O valor é o sufixo da classe da etiqueta no CSS (etiqueta--prova etc.). */
export const TIPOS = { "Prova": "prova", "Entrega": "entrega", "Evento": "evento", "Feriado": "feriado" };

/** Valor de série usado quando um conteúdo vale para todas as séries. */
export const TODAS = "Todas";
