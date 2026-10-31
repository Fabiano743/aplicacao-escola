/**
 * @file estudo.js
 * Revisão espaçada dos resumos (1, 7 e 30 dias) e leitura das perguntas do teste.
 * Os registros ficam apenas no localStorage do aparelho do aluno; nada é
 * enviado ao banco (alunos menores de idade, LGPD).
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { guardar, recuperar, hojeISO } from "./ui.js";

/** Dias entre cada revisão (prática espaçada, ver docs/BENCHMARK.md). */
export const INTERVALOS = [1, 7, 30];

/** Chave no localStorage. Formato: { idResumo: { disciplina, titulo, etapa, proxima } } */
const CHAVE = "portal:estudos";

/**
 * Soma dias a uma data. Usa meio-dia como horário de referência para evitar
 * erro de um dia na troca de horário de verão.
 * @param {string} iso - Data "AAAA-MM-DD".
 * @param {number} dias - Quantidade de dias a somar.
 * @returns {string} Nova data "AAAA-MM-DD".
 */
function somarDias(iso, dias) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Lê os registros de estudo salvos no aparelho.
 * @returns {Object} Registros por id de resumo ({} se vazio ou inválido).
 */
function lerRegistros() {
  try {
    return JSON.parse(recuperar(CHAVE)) || {};
  } catch (e) {
    return {};
  }
}

/**
 * Salva os registros de estudo no aparelho.
 * @param {Object} registros
 */
function salvarRegistros(registros) {
  guardar(CHAVE, JSON.stringify(registros));
}

/**
 * Situação de estudo de um resumo.
 * @param {string} id - Id do resumo.
 * @returns {{disciplina: string, titulo: string, etapa: number, proxima: string|null}|undefined}
 *   undefined se o aluno ainda não estudou o resumo.
 */
export function situacao(id) {
  return lerRegistros()[id];
}

/**
 * Marca o resumo como estudado; a primeira revisão fica para o dia seguinte.
 * @param {{id: string, disciplina: string, titulo: string}} resumo
 */
export function marcarEstudado(resumo) {
  const registros = lerRegistros();
  registros[resumo.id] = {
    disciplina: resumo.disciplina,
    titulo: resumo.titulo,
    etapa: 0,
    proxima: somarDias(hojeISO(), INTERVALOS[0])
  };
  salvarRegistros(registros);
}

/**
 * Registra uma revisão e agenda a próxima. Depois da última revisão,
 * "proxima" passa a ser null (revisões concluídas).
 * @param {string} id - Id do resumo.
 * @returns {Object|null} Registro atualizado, ou null se o resumo não foi estudado.
 */
export function marcarRevisado(id) {
  const registros = lerRegistros();
  const item = registros[id];
  if (!item) {
    return null;
  }
  item.etapa++;
  if (item.etapa < INTERVALOS.length) {
    item.proxima = somarDias(hojeISO(), INTERVALOS[item.etapa]);
  } else {
    item.proxima = null;
  }
  salvarRegistros(registros);
  return item;
}

/**
 * Lista os resumos com revisão marcada para hoje ou atrasada.
 * @returns {Object[]} Registros no formato { id, disciplina, titulo, etapa, proxima }.
 */
export function paraRevisar() {
  const registros = lerRegistros();
  const hoje = hojeISO();
  const lista = [];
  for (const id of Object.keys(registros)) {
    const registro = registros[id];
    if (registro.proxima && registro.proxima <= hoje) {
      const item = { id: id };
      Object.assign(item, registro);
      lista.push(item);
    }
  }
  return lista;
}

/**
 * Lê as perguntas digitadas pelo professor, uma por linha, no formato
 * "pergunta | resposta". Linhas sem resposta são ignoradas; se a resposta
 * tiver "|", só a primeira barra separa pergunta e resposta.
 * @param {string} texto - Conteúdo do campo de perguntas.
 * @returns {{pergunta: string, resposta: string}[]}
 */
export function lerPerguntas(texto) {
  const perguntas = [];
  for (const linha of String(texto || "").split("\n")) {
    const partes = linha.split("|");
    const pergunta = partes[0].trim();
    const resposta = partes.slice(1).join("|").trim();
    if (pergunta && resposta) {
      perguntas.push({ pergunta: pergunta, resposta: resposta });
    }
  }
  return perguntas;
}
