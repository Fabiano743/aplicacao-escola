/**
 * @file ui.js
 * Funções de apoio usadas nas duas telas (portal e área da escola):
 * criação de elementos, mensagens, armazenamento local, datas e ordenação.
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */

/**
 * Retorna o primeiro elemento que corresponde ao seletor CSS.
 * @param {string} seletor
 * @returns {Element|null}
 */
export function $(seletor) {
  return document.querySelector(seletor);
}

/**
 * Retorna todos os elementos que correspondem ao seletor CSS.
 * @param {string} seletor
 * @returns {Element[]}
 */
export function $$(seletor) {
  return Array.from(document.querySelectorAll(seletor));
}

/**
 * Cria um elemento HTML.
 * Segurança: o texto é sempre inserido por textContent (nunca innerHTML), então
 * qualquer conteúdo vindo do banco aparece como texto e não é executado.
 * @param {string} tag - Nome da tag (ex.: "p", "li").
 * @param {{texto?: string, classe?: string, attrs?: Object, filhos?: Array}} [opcoes]
 *   filhos aceita elementos e textos; valores vazios (null, "", false) são ignorados.
 * @returns {HTMLElement}
 */
export function criarEl(tag, opcoes) {
  if (opcoes === undefined) {
    opcoes = {};
  }
  const el = document.createElement(tag);

  if (opcoes.texto !== undefined) {
    el.textContent = opcoes.texto;
  }
  if (opcoes.classe) {
    el.className = opcoes.classe;
  }
  if (opcoes.attrs) {
    for (const nome of Object.keys(opcoes.attrs)) {
      el.setAttribute(nome, opcoes.attrs[nome]);
    }
  }
  if (opcoes.filhos) {
    for (const filho of opcoes.filhos) {
      if (filho) {
        el.append(filho);
      }
    }
  }
  return el;
}

/**
 * Substitui o conteúdo de uma área por uma mensagem de estado.
 * Dentro de listas (ul/ol) a mensagem é um li; nos demais casos, um p.
 * @param {HTMLElement} container - Área que recebe a mensagem.
 * @param {string} texto - Mensagem exibida.
 * @param {"vazio"|"erro"} [tipo="vazio"] - Define a classe estado--vazio ou estado--erro.
 */
export function estado(container, texto, tipo) {
  if (tipo === undefined) {
    tipo = "vazio";
  }
  let tag = "p";
  if (container.tagName === "UL" || container.tagName === "OL") {
    tag = "li";
  }
  container.replaceChildren(criarEl(tag, { texto: texto, classe: "estado estado--" + tipo }));
}

let tempoDoAviso;

/**
 * Mostra um aviso rápido (toast) na parte de baixo da tela por 4 segundos.
 * Um novo aviso substitui o anterior e reinicia o tempo.
 * @param {string} texto - Mensagem.
 * @param {"ok"|"erro"} [tipo="ok"] - Cor do aviso.
 */
export function avisar(texto, tipo) {
  if (tipo === undefined) {
    tipo = "ok";
  }
  let caixa = document.querySelector(".toast");
  if (!caixa) {
    caixa = criarEl("div", { classe: "toast", attrs: { role: "status", "aria-live": "polite" } });
    document.body.appendChild(caixa);
  }
  caixa.textContent = texto;
  caixa.className = "toast toast--" + tipo + " visivel";

  clearTimeout(tempoDoAviso);
  tempoDoAviso = setTimeout(function () {
    caixa.classList.remove("visivel");
  }, 4000);
}

/**
 * Grava um valor no localStorage. Se o armazenamento estiver bloqueado
 * (ex.: aba anônima), a gravação é ignorada sem erro.
 * @param {string} chave
 * @param {string} valor
 */
export function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch (e) {
    // armazenamento indisponível: o site continua funcionando sem salvar
  }
}

/**
 * Lê um valor do localStorage.
 * @param {string} chave
 * @param {string} [padrao=""] - Valor devolvido se a chave não existir ou o armazenamento estiver bloqueado.
 * @returns {string}
 */
export function recuperar(chave, padrao) {
  if (padrao === undefined) {
    padrao = "";
  }
  try {
    const valor = localStorage.getItem(chave);
    if (valor === null) {
      return padrao;
    }
    return valor;
  } catch (e) {
    return padrao;
  }
}

/**
 * Data de hoje no fuso local, no formato "AAAA-MM-DD" (formato usado no banco,
 * que permite comparar datas como texto). O fuso é descontado porque
 * toISOString() usa UTC e, à noite, retornaria o dia seguinte.
 * @returns {string}
 */
export function hojeISO() {
  const fuso = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - fuso).toISOString().slice(0, 10);
}

/**
 * Converte "AAAA-MM-DD" para "DD/MM/AAAA".
 * @param {string} iso
 * @returns {string}
 */
export function paraBR(iso) {
  if (!iso) {
    iso = "";
  }
  return iso.split("-").reverse().join("/");
}

/**
 * Nome do dia da semana de hoje ("Segunda", "Terça"...).
 * @returns {string}
 */
export function diaDaSemana() {
  const nomes = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return nomes[new Date().getDay()];
}

/**
 * Converte o início de um horário em minutos ("07:30 - 08:20" -> 450).
 * Aceita "7:30", "07:30" e "07h30".
 * @param {string} horario
 * @returns {number} Minutos desde 00:00, ou Infinity se não houver horário.
 */
function paraMinutos(horario) {
  const achou = /(\d{1,2})\s*[:h]\s*(\d{2})/.exec(horario || "");
  if (!achou) {
    return Infinity;
  }
  return Number(achou[1]) * 60 + Number(achou[2]);
}

/**
 * Comparador para ordenar horários pelo início da aula (usar em .sort()).
 * A comparação é numérica para que "7:30" venha antes de "10:20";
 * em caso de empate, compara o texto.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function ordemHorario(a, b) {
  const minA = paraMinutos(a);
  const minB = paraMinutos(b);
  if (minA !== minB) {
    return minA - minB;
  }
  return String(a).localeCompare(String(b));
}

/**
 * Descreve quanto falta para uma data: "hoje", "amanhã", "em 3 dias",
 * "em 2 semanas" ou "já passou".
 * @param {string} iso - Data "AAAA-MM-DD".
 * @returns {string}
 */
export function quandoE(iso) {
  const dias = Math.round((new Date(iso + "T00:00:00") - new Date(hojeISO() + "T00:00:00")) / 86400000);

  if (dias < 0) {
    return "já passou";
  }
  if (dias === 0) {
    return "hoje";
  }
  if (dias === 1) {
    return "amanhã";
  }
  if (dias < 7) {
    return `em ${dias} dias`;
  }
  const semanas = Math.ceil(dias / 7);
  if (dias < 14) {
    return `em ${semanas} semana`;
  }
  return `em ${semanas} semanas`;
}

/**
 * Retorna o cardápio em arquivo (documento tipo "imagem") mais recente.
 * @param {Object[]} lista - Documentos da coleção cardapio.
 * @returns {Object|undefined}
 */
export function cardapioAtual(lista) {
  let maisNovo;
  for (const item of lista) {
    if (item.tipo !== "imagem") {
      continue;
    }
    if (!maisNovo || (item.atualizadoEm || 0) > (maisNovo.atualizadoEm || 0)) {
      maisNovo = item;
    }
  }
  return maisNovo;
}

/**
 * Cria um botão (type="button") já com a ação de clique.
 * @param {string} texto - Texto do botão.
 * @param {string} classe - Classes CSS.
 * @param {function(MouseEvent): void} aoClicar - Ação do clique.
 * @returns {HTMLButtonElement}
 */
export function botao(texto, classe, aoClicar) {
  const b = criarEl("button", { texto: texto, classe: classe, attrs: { type: "button" } });
  b.addEventListener("click", aoClicar);
  return b;
}
