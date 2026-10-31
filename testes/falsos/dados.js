/* Substitui js/dados.js nos testes: um banco em memória com a mesma interface.
   O teste entrega os dados iniciais em window.__teste.banco e lê o resultado em
   window.__banco (estado atual) e window.__operacoes (tudo o que foi gravado). */
const TODAS = "Todas";
const config = window.__teste || {};

export const COLECOES = ["aulas", "agenda", "cardapio", "avisos", "resumos"];

const banco = JSON.parse(JSON.stringify(config.banco || {}));
[...COLECOES, "anexos"].forEach(nome => { banco[nome] = banco[nome] || []; });
window.__banco = banco;
window.__operacoes = [];

let sequencia = 1;
const ouvintes = [];

const filtrar = (nome, { serie, incluirTodas = true } = {}) => banco[nome]
  .filter(i => !serie || i.serie === serie || (incluirTodas && i.serie === TODAS))
  .map(i => ({ ...i }));

function notificar(nome) {
  ouvintes.filter(o => o.nome === nome).forEach(o => o.aoMudar(filtrar(nome, o.opcoes)));
}

/* Simula a regra do Firestore: sem permissão, a escrita falha */
function conferirPermissao() {
  if (config.falharEscrita) throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
}

export function observar(nome, opcoes, aoMudar) {
  const ouvinte = { nome, opcoes, aoMudar };
  ouvintes.push(ouvinte);
  setTimeout(() => aoMudar(filtrar(nome, opcoes)), 10);
  return () => ouvintes.splice(ouvintes.indexOf(ouvinte), 1);
}

export async function criar(nome, dados) {
  conferirPermissao();
  const id = "novo-" + sequencia++;
  banco[nome].push({ id, ...dados });
  window.__operacoes.push({ tipo: "criar", nome, id, dados });
  notificar(nome);
  return { id };
}

export async function atualizar(nome, id, dados) {
  conferirPermissao();
  Object.assign(banco[nome].find(i => i.id === id), dados);
  window.__operacoes.push({ tipo: "atualizar", nome, id, dados });
  notificar(nome);
}

export async function remover(nome, id) {
  conferirPermissao();
  banco[nome] = banco[nome].filter(i => i.id !== id);
  window.__operacoes.push({ tipo: "remover", nome, id });
  notificar(nome);
}

export async function ler(nome, id) {
  return banco[nome].find(i => i.id === id) || null;
}

export async function salvarLote(operacoes) {
  conferirPermissao();
  const mexidas = new Set();
  operacoes.forEach(op => {
    mexidas.add(op.nome);
    if (op.tipo === "criar") banco[op.nome].push({ id: "novo-" + sequencia++, ...op.dados });
    else if (op.tipo === "atualizar") Object.assign(banco[op.nome].find(i => i.id === op.id), op.dados);
    else banco[op.nome] = banco[op.nome].filter(i => i.id !== op.id);
  });
  window.__operacoes.push({ tipo: "lote", operacoes });
  mexidas.forEach(notificar);
}

export async function ehAdmin() {
  return config.auth === "admin";
}
