/**
 * @file dados.js
 * Camada de acesso ao Firestore. As telas usam apenas estas funções e não
 * acessam o banco diretamente. Nos testes automáticos este arquivo é
 * substituído por um banco em memória (testes/falsos/dados.js).
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import {
  collection, doc, addDoc, setDoc, deleteDoc, getDoc, onSnapshot, query, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { TODAS } from "./config.js";

/**
 * Coleções observadas em tempo real pelas telas.
 * "anexos" não entra: os arquivos são lidos sob demanda, quando alguém abre um.
 */
export const COLECOES = ["aulas", "agenda", "cardapio", "avisos", "resumos"];

/**
 * Converte a resposta do Firestore em uma lista de objetos com o id do documento.
 * @param {import("firebase/firestore").QuerySnapshot} resposta - Resultado da consulta.
 * @returns {Object[]} Documentos no formato { id, ...campos }.
 */
function transformarEmLista(resposta) {
  const lista = [];
  resposta.docs.forEach(function (documento) {
    const item = { id: documento.id };
    Object.assign(item, documento.data());
    lista.push(item);
  });
  return lista;
}

/**
 * Observa uma coleção em tempo real: a função aoMudar é chamada agora e a cada alteração.
 * Com série, traz os documentos da série e os publicados para "Todas".
 * @param {string} nome - Nome da coleção.
 * @param {{serie?: string, incluirTodas?: boolean}} [opcoes] - Filtro de série;
 *   incluirTodas: false traz só a série (usado no horário).
 * @param {function(Object[]): void} aoMudar - Recebe a lista atualizada.
 * @param {function(Error): void} [aoFalhar] - Chamada se a leitura falhar.
 * @returns {function(): void} Função que encerra a observação.
 */
export function observar(nome, opcoes, aoMudar, aoFalhar) {
  let serie = null;
  let incluirTodas = true;
  if (opcoes) {
    serie = opcoes.serie;
    if (opcoes.incluirTodas !== undefined) {
      incluirTodas = opcoes.incluirTodas;
    }
  }

  const colecao = collection(db, nome);
  let consulta;
  if (!serie) {
    consulta = colecao;
  } else if (incluirTodas) {
    consulta = query(colecao, where("serie", "in", [serie, TODAS]));
  } else {
    consulta = query(colecao, where("serie", "==", serie));
  }

  return onSnapshot(consulta, function (resposta) {
    aoMudar(transformarEmLista(resposta));
  }, function (erro) {
    console.error("Falha ao ler " + nome, erro);
    if (aoFalhar) {
      aoFalhar(erro);
    }
  });
}

/**
 * Cria um documento novo (o Firestore gera o id).
 * @param {string} nome - Nome da coleção.
 * @param {Object} dados - Campos do documento.
 * @returns {Promise<{id: string}>} Referência do documento criado.
 */
export function criar(nome, dados) {
  return addDoc(collection(db, nome), dados);
}

/**
 * Atualiza apenas os campos informados, mantendo os demais (merge).
 * @param {string} nome - Nome da coleção.
 * @param {string} id - Id do documento.
 * @param {Object} dados - Campos a alterar.
 * @returns {Promise<void>}
 */
export function atualizar(nome, id, dados) {
  return setDoc(doc(db, nome, id), dados, { merge: true });
}

/**
 * Exclui um documento.
 * @param {string} nome - Nome da coleção.
 * @param {string} id - Id do documento.
 * @returns {Promise<void>}
 */
export function remover(nome, id) {
  return deleteDoc(doc(db, nome, id));
}

/**
 * Lê um único documento.
 * @param {string} nome - Nome da coleção.
 * @param {string} id - Id do documento.
 * @returns {Promise<Object|null>} Documento com o id, ou null se não existir.
 */
export async function ler(nome, id) {
  const registro = await getDoc(doc(db, nome, id));
  if (!registro.exists()) {
    return null;
  }
  const item = { id: registro.id };
  Object.assign(item, registro.data());
  return item;
}

/**
 * Grava várias operações de uma vez (todas são aplicadas ou nenhuma).
 * Usado no "Salvar horário". Limite do Firestore: 500 operações por lote.
 * @param {{tipo: "criar"|"atualizar"|"remover", nome: string, id?: string, dados?: Object}[]} operacoes
 * @returns {Promise<void>}
 */
export async function salvarLote(operacoes) {
  const lote = writeBatch(db);
  for (const op of operacoes) {
    if (op.tipo === "criar") {
      lote.set(doc(collection(db, op.nome)), op.dados);
    } else if (op.tipo === "atualizar") {
      lote.set(doc(db, op.nome, op.id), op.dados, { merge: true });
    } else {
      lote.delete(doc(db, op.nome, op.id));
    }
  }
  await lote.commit();
}

/**
 * Verifica se a conta pode usar a área da escola: precisa existir um documento
 * com o uid do usuário na coleção "admins" (criado pelo console do Firebase).
 * @param {string} uid - Id do usuário logado.
 * @returns {Promise<boolean>}
 */
export async function ehAdmin(uid) {
  const registro = await getDoc(doc(db, "admins", uid));
  return registro.exists();
}
