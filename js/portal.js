/**
 * @file portal.js
 * Tela do aluno (index.html): painel "Hoje", horário, provas e datas, avisos,
 * resumos com revisão e teste, cardápio, cronômetro, "Minha agenda" e "Sua opinião".
 * Esta tela só lê o banco; o que o aluno marca fica no localStorage do aparelho.
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { configurado } from "./firebase.js";
import { observar } from "./dados.js";
import { SERIES, DIAS, ESCOLA, TIPOS } from "./config.js";
import { $, criarEl, estado, avisar, botao, guardar, recuperar, hojeISO, paraBR, diaDaSemana, quandoE, ordemHorario, cardapioAtual } from "./ui.js";
import { abrirAnexo, carregarAnexo } from "./anexos.js";
import * as estudo from "./estudo.js";
import { iniciarFoco } from "./foco.js";


// ===== Estado da tela =====

/** Última lista recebida de cada coleção. */
const dados = { aulas: [], agenda: [], cardapio: [], avisos: [], resumos: [] };

/** Funções que encerram as observações da série atual. */
let desligar = [];

/** Filtros da lista de resumos (limite: quantos resumos aparecem; aumenta de 12 em 12). */
const filtroResumos = { busca: "", disciplina: "", limite: 12 };

/** Se true, a tabela de provas mostra também as datas que já passaram. */
let mostrarPassadas = false;

/** Quantos avisos aparecem no mural (aumenta de 8 em 8). */
let avisosVisiveis = 8;

/** Ids dos resumos abertos, para continuarem abertos quando a lista é redesenhada. */
const abertos = new Set();

/** Teste de perguntas em andamento: { id, pos, acertos, mostrando } ou null. */
let teste = null;

const MSG_SEM_SERIE = "Escolha a sua série no topo da página.";


// ===== Última visita (etiqueta "Novo") =====

/**
 * Data da visita anterior, usada para marcar avisos novos com a etiqueta "Novo".
 * O valor fica no sessionStorage durante a sessão, para a etiqueta continuar
 * ao recarregar a página; a visita atual é gravada no localStorage.
 * @returns {number} Data em milissegundos (0 na primeira visita).
 */
function pegarUltimaVisita() {
  try {
    const daSessao = sessionStorage.getItem("portal:visitaAnterior");
    if (daSessao !== null) {
      return Number(daSessao);
    }
    const anterior = recuperar("portal:ultimaVisita", "0");
    sessionStorage.setItem("portal:visitaAnterior", anterior);
    return Number(anterior);
  } catch (e) {
    return Number(recuperar("portal:ultimaVisita", "0"));
  } finally {
    guardar("portal:ultimaVisita", String(Date.now()));
  }
}
const ultimaVisita = pegarUltimaVisita();


// ===== Funções de apoio =====

/**
 * Indica se o aluno já escolheu a série no topo da página.
 * @returns {boolean}
 */
function temSerie() {
  return Boolean($("#serie").value);
}

/**
 * Cria um parágrafo de mensagem vazia.
 * @param {string} texto
 * @returns {HTMLParagraphElement}
 */
function msgVazia(texto) {
  return criarEl("p", { texto: texto, classe: "estado" });
}

/**
 * Nome curto de um item da agenda: "Prova de Matemática" ou, sem disciplina,
 * "Evento: Feira de Ciências".
 * @param {Object} item - Documento da agenda.
 * @returns {string}
 */
function nomeDaData(item) {
  if (item.disciplina) {
    return `${item.tipo} de ${item.disciplina}`;
  }
  return `${item.tipo}: ${item.descricao}`;
}

/**
 * Deixa a primeira letra do texto maiúscula.
 * @param {string} texto
 * @returns {string}
 */
function primeiraMaiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Monta uma tabela com cabeçalho e linhas.
 * @param {HTMLTableRowElement} cabecalho - Linha do thead.
 * @param {HTMLTableRowElement[]} linhas - Linhas do tbody.
 * @param {string} [classe] - Classe CSS da tabela.
 * @returns {HTMLTableElement}
 */
function montarTabela(cabecalho, linhas, classe) {
  return criarEl("table", {
    classe: classe,
    filhos: [criarEl("thead", { filhos: [cabecalho] }), criarEl("tbody", { filhos: linhas })]
  });
}


// ===== Painel "Hoje" =====

/**
 * Preenche o painel "Hoje": data por extenso, aulas do dia (pelo horário de início),
 * merenda do dia e as 3 próximas provas ou datas.
 */
function pintarHoje() {
  const dia = diaDaSemana();
  const hoje = hojeISO();

  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  $("#hoje-data").textContent = primeiraMaiuscula(dataExtenso);

  // aulas de hoje
  const aulasHoje = dados.aulas.filter(function (a) {
    return a.dia === dia;
  });
  aulasHoje.sort(function (a, b) {
    return ordemHorario(a.horario, b.horario);
  });

  const ulAulas = $("#hoje-aulas");
  if (!temSerie()) {
    estado(ulAulas, MSG_SEM_SERIE);
  } else if (!DIAS.includes(dia)) {
    estado(ulAulas, "Hoje não tem aula.");
  } else if (aulasHoje.length === 0) {
    estado(ulAulas, "Nenhuma aula cadastrada para hoje.");
  } else {
    ulAulas.replaceChildren();
    for (const aula of aulasHoje) {
      const inicio = aula.horario.split(" ")[0];
      ulAulas.appendChild(criarEl("li", { texto: `${inicio} · ${aula.disciplina}` }));
    }
  }

  // merenda de hoje (cardápio por dia); sem ele, aponta para a imagem da semana
  let merenda = null;
  let temImagem = false;
  for (const c of dados.cardapio) {
    if (!merenda && !c.tipo && c.dia === dia) {
      merenda = c;
    }
    if (c.tipo === "imagem") {
      temImagem = true;
    }
  }

  const ulMerenda = $("#hoje-merenda");
  if (merenda) {
    const linhas = [merenda.prato, merenda.acompanhamento];
    if (merenda.sobremesa) {
      linhas.push("Sobremesa: " + merenda.sobremesa);
    }
    ulMerenda.replaceChildren();
    for (const texto of linhas) {
      if (texto) {
        ulMerenda.appendChild(criarEl("li", { texto: texto }));
      }
    }
  } else if (temImagem) {
    const link = criarEl("a", { texto: "Ver o cardápio da semana", attrs: { href: "#cardapio" } });
    ulMerenda.replaceChildren(criarEl("li", { filhos: [link] }));
  } else if (DIAS.includes(dia)) {
    estado(ulMerenda, "Cardápio de hoje não cadastrado.");
  } else {
    estado(ulMerenda, "Hoje não tem merenda.");
  }

  // próximas provas e datas (as 3 mais próximas a partir de hoje)
  const proximos = dados.agenda.filter(function (i) {
    return i.data >= hoje;
  });
  proximos.sort(function (a, b) {
    return a.data.localeCompare(b.data);
  });

  const ulProx = $("#hoje-proximos");
  if (!temSerie()) {
    estado(ulProx, MSG_SEM_SERIE);
  } else if (proximos.length === 0) {
    estado(ulProx, "Nenhuma prova ou data marcada.");
  } else {
    ulProx.replaceChildren();
    for (const item of proximos.slice(0, 3)) {
      const diaMes = paraBR(item.data).slice(0, 5);
      ulProx.appendChild(criarEl("li", { texto: `${nomeDaData(item)} — ${diaMes}, ${quandoE(item.data)}` }));
    }
  }
}


// ===== Horário =====

/**
 * Monta a tabela de horário (linhas = horários, colunas = dias da semana)
 * a partir das aulas da série. A coluna do dia atual recebe a classe col-hoje.
 * @param {Object[]} lista - Aulas da série: { dia, horario, disciplina, atividade }.
 */
function pintarHorario(lista) {
  const area = $("#horario-area");
  if (!temSerie()) {
    estado(area, MSG_SEM_SERIE);
    return;
  }
  if (lista.length === 0) {
    estado(area, "O horário desta série ainda não foi cadastrado.");
    return;
  }

  const hoje = diaDaSemana();

  /** Classe da célula conforme o dia (destaca o dia de hoje). */
  function classeDia(d) {
    return d === hoje ? "col-hoje" : "";
  }

  // horários sem repetição, em ordem de início
  const horarios = [];
  for (const a of lista) {
    if (!horarios.includes(a.horario)) {
      horarios.push(a.horario);
    }
  }
  horarios.sort(ordemHorario);

  const cab = criarEl("tr");
  cab.appendChild(criarEl("th", { texto: "Horário", attrs: { scope: "col" } }));
  for (const d of DIAS) {
    cab.appendChild(criarEl("th", { texto: d, classe: classeDia(d), attrs: { scope: "col" } }));
  }

  const linhas = [];
  for (const h of horarios) {
    const tr = criarEl("tr");
    tr.appendChild(criarEl("th", { texto: h, attrs: { scope: "row" } }));
    for (const d of DIAS) {
      const aula = lista.find(function (a) {
        return a.horario === h && a.dia === d;
      });
      const td = criarEl("td", { classe: classeDia(d) });
      if (aula) {
        td.appendChild(criarEl("span", { texto: aula.disciplina }));
        if (aula.atividade) {
          td.appendChild(criarEl("small", { texto: aula.atividade }));
        }
      }
      tr.appendChild(td);
    }
    linhas.push(tr);
  }

  area.replaceChildren(criarEl("div", { classe: "tabela", filhos: [montarTabela(cab, linhas, "horario")] }));
}


// ===== Provas e datas =====

/**
 * Monta a tabela de provas e datas em ordem cronológica. As datas que já passaram
 * ficam escondidas; um botão mostra ou esconde essas datas.
 * @param {Object[]} lista - Documentos da agenda da série (e de "Todas").
 */
function pintarAgenda(lista) {
  const area = $("#provas-area");
  if (!temSerie()) {
    estado(area, MSG_SEM_SERIE);
    return;
  }
  const hoje = hojeISO();

  const ordenadas = lista.slice();
  ordenadas.sort(function (a, b) {
    return a.data.localeCompare(b.data);
  });

  let qtdPassadas = 0;
  const visiveis = [];
  for (const i of ordenadas) {
    if (i.data < hoje) {
      qtdPassadas++;
    }
    if (mostrarPassadas || i.data >= hoje) {
      visiveis.push(i);
    }
  }

  const partes = [];

  if (visiveis.length === 0) {
    partes.push(msgVazia("Nenhuma prova ou data marcada."));
  } else {
    const cab = criarEl("tr");
    for (const t of ["Data", "Tipo", "Disciplina", "O que é", "Quando"]) {
      cab.appendChild(criarEl("th", { texto: t, attrs: { scope: "col" } }));
    }

    const linhas = [];
    for (const i of visiveis) {
      // tipo desconhecido usa a cor de "evento"
      const etiqueta = criarEl("span", { texto: i.tipo, classe: "etiqueta etiqueta--" + (TIPOS[i.tipo] || "evento") });
      linhas.push(criarEl("tr", {
        classe: i.data < hoje ? "passou" : "",
        filhos: [
          criarEl("td", { texto: paraBR(i.data) }),
          criarEl("td", { filhos: [etiqueta] }),
          criarEl("td", { texto: i.disciplina || "—" }),
          criarEl("td", { texto: i.descricao }),
          criarEl("td", { texto: quandoE(i.data) })
        ]
      }));
    }
    partes.push(criarEl("div", { classe: "tabela", filhos: [montarTabela(cab, linhas)] }));
  }

  if (qtdPassadas > 0) {
    let texto = `Mostrar as datas que já passaram (${qtdPassadas})`;
    if (mostrarPassadas) {
      texto = "Esconder as datas que já passaram";
    }
    const b = botao(texto, "link", function () {
      mostrarPassadas = !mostrarPassadas;
      pintarAgenda(dados.agenda);
    });
    partes.push(criarEl("p", { classe: "mais", filhos: [b] }));
  }

  area.replaceChildren(...partes);
}


// ===== Mural de avisos =====

/**
 * Mostra os avisos do mais recente para o mais antigo, limitados a avisosVisiveis.
 * Avisos publicados depois da última visita recebem a etiqueta "Novo".
 * @param {Object[]} lista - Avisos da série (e de "Todas").
 */
function pintarAvisos(lista) {
  const ul = $("#lista-avisos");
  const btnMais = $("#mais-avisos");
  btnMais.classList.add("oculto");

  if (!temSerie()) {
    estado(ul, MSG_SEM_SERIE);
    return;
  }
  if (lista.length === 0) {
    estado(ul, "Nenhum aviso no momento.");
    return;
  }

  const ordenados = lista.slice();
  ordenados.sort(function (a, b) {
    return (b.criadoEm || 0) - (a.criadoEm || 0);
  });

  const restantes = ordenados.length - avisosVisiveis;
  btnMais.textContent = `Ver avisos anteriores (${restantes})`;
  if (restantes > 0) {
    btnMais.classList.remove("oculto");
  }

  ul.replaceChildren();
  for (const aviso of ordenados.slice(0, avisosVisiveis)) {
    let meta = "";
    if (aviso.criadoEm) {
      meta = new Date(aviso.criadoEm).toLocaleDateString("pt-BR") + " · ";
    }
    meta += aviso.serie === "Todas" ? "Todas as séries" : aviso.serie;

    const divMeta = criarEl("div", { classe: "avisos__meta" });
    divMeta.appendChild(criarEl("span", { texto: meta }));
    if (ultimaVisita && aviso.criadoEm > ultimaVisita) {
      divMeta.appendChild(criarEl("span", { texto: "Novo", classe: "etiqueta etiqueta--novo" }));
    }

    const li = criarEl("li");
    li.appendChild(divMeta);
    li.appendChild(criarEl("strong", { texto: aviso.titulo }));
    li.appendChild(criarEl("p", { texto: aviso.texto }));
    ul.appendChild(li);
  }
}


// ===== Resumos das aulas =====

/**
 * Nome do mês por extenso a partir de "AAAA-MM" ("2026-10" -> "Outubro de 2026").
 * @param {string} chave - Ano e mês, ou "" para resumos sem data.
 * @returns {string}
 */
function nomeDoMes(chave) {
  if (!chave) {
    return "Sem data";
  }
  const partes = chave.split("-");
  const texto = new Date(partes[0], partes[1] - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return primeiraMaiuscula(texto);
}

/**
 * Atualiza o select de disciplinas com as disciplinas que têm resumo.
 * Se a disciplina escolhida não existir mais na lista, o filtro volta para "Todas".
 * @param {Object[]} lista - Resumos da série.
 */
function atualizarSelectDisciplinas(lista) {
  const disciplinas = [];
  for (const r of lista) {
    if (!disciplinas.includes(r.disciplina)) {
      disciplinas.push(r.disciplina);
    }
  }
  disciplinas.sort(function (a, b) {
    return a.localeCompare(b);
  });

  if (!disciplinas.includes(filtroResumos.disciplina)) {
    filtroResumos.disciplina = "";
  }

  const sel = $("#filtro-disciplina");
  sel.replaceChildren(criarEl("option", { texto: "Todas as disciplinas", attrs: { value: "" } }));
  for (const d of disciplinas) {
    sel.appendChild(criarEl("option", { texto: d, attrs: { value: d } }));
  }
  sel.value = filtroResumos.disciplina;
}

/**
 * Mostra os resumos filtrados (disciplina e busca), do mais recente para o mais
 * antigo, agrupados por mês e limitados a filtroResumos.limite.
 * @param {Object[]} lista - Resumos da série (e de "Todas").
 */
function pintarResumos(lista) {
  const area = $("#lista-resumos");
  const btnMais = $("#mais-resumos");

  atualizarSelectDisciplinas(lista);
  pintarRevisoes();

  btnMais.classList.add("oculto");
  if (!temSerie()) {
    estado(area, MSG_SEM_SERIE);
    return;
  }

  // filtros: disciplina e busca (na disciplina, no assunto e no texto do resumo)
  const busca = filtroResumos.busca.trim().toLowerCase();
  const filtrados = [];
  for (const r of lista) {
    if (filtroResumos.disciplina && r.disciplina !== filtroResumos.disciplina) {
      continue;
    }
    if (busca) {
      const tudo = [r.disciplina, r.titulo, r.resumo].join(" ").toLowerCase();
      if (!tudo.includes(busca)) {
        continue;
      }
    }
    filtrados.push(r);
  }

  // mais recente primeiro; na mesma data, ordem alfabética da disciplina
  filtrados.sort(function (a, b) {
    const porData = (b.data || "").localeCompare(a.data || "");
    if (porData !== 0) {
      return porData;
    }
    return a.disciplina.localeCompare(b.disciplina);
  });

  if (filtrados.length === 0) {
    if (busca || filtroResumos.disciplina) {
      estado(area, "Nenhum resumo encontrado com esse filtro.");
    } else {
      estado(area, "Nenhum resumo publicado ainda.");
    }
    return;
  }

  // agrupa por mês ("AAAA-MM"), mantendo a ordem da lista
  const visiveis = filtrados.slice(0, filtroResumos.limite);
  const meses = [];
  for (const r of visiveis) {
    const chave = (r.data || "").slice(0, 7);
    let grupo = meses.find(function (m) {
      return m.chave === chave;
    });
    if (!grupo) {
      grupo = { chave: chave, itens: [] };
      meses.push(grupo);
    }
    grupo.itens.push(r);
  }

  area.replaceChildren();
  for (const grupo of meses) {
    const secao = criarEl("section", { classe: "mes" });
    secao.appendChild(criarEl("h3", { texto: nomeDoMes(grupo.chave) }));
    for (const r of grupo.itens) {
      secao.appendChild(montarResumo(r));
    }
    area.appendChild(secao);
  }

  const restantes = filtrados.length - visiveis.length;
  if (restantes > 0) {
    btnMais.textContent = `Mostrar mais resumos (${restantes})`;
    btnMais.classList.remove("oculto");
  }
}

/**
 * Mostra a caixa "Você tem N resumos para revisar hoje", com um link para cada resumo.
 * Fica vazia quando não há revisão pendente.
 */
function pintarRevisoes() {
  const area = $("#revisar");
  const pendentes = temSerie() ? estudo.paraRevisar() : [];
  if (pendentes.length === 0) {
    area.replaceChildren();
    return;
  }

  let titulo = `Você tem ${pendentes.length} resumos para revisar hoje:`;
  if (pendentes.length === 1) {
    titulo = "Você tem 1 resumo para revisar hoje:";
  }

  const ul = criarEl("ul");
  for (const r of pendentes) {
    const a = criarEl("a", { texto: `${r.disciplina} · ${r.titulo}`, attrs: { href: "#resumo-" + r.id, "data-resumo": r.id } });
    ul.appendChild(criarEl("li", { filhos: [a] }));
  }

  area.replaceChildren(criarEl("div", { classe: "caixa-atencao", filhos: [criarEl("strong", { texto: titulo }), ul] }));
}

/**
 * Clique em um link da caixa de revisões: abre o resumo, rola até ele e coloca o foco no título.
 * Avisa o aluno se o resumo não estiver na lista atual (outra série ou filtro).
 * @param {MouseEvent} evento
 */
function irParaResumo(evento) {
  const link = evento.target.closest("a[data-resumo]");
  if (!link) {
    return;
  }
  evento.preventDefault();

  const alvo = document.getElementById("resumo-" + link.dataset.resumo);
  if (!alvo) {
    avisar("Esse resumo não está na lista atual. Confira a série e os filtros.");
    return;
  }
  alvo.open = true;
  alvo.scrollIntoView({ block: "start" });
  alvo.querySelector("summary").focus({ preventScroll: true });
}

/**
 * Monta um resumo como <details>: no título, data, disciplina, assunto e etiquetas
 * ("Revisar hoje", "Anexo"); no corpo, texto, anexo, link, botões de estudo e o teste.
 * Links só são exibidos se começarem com http:// ou https://.
 * @param {Object} r - Documento do resumo.
 * @returns {HTMLDetailsElement}
 */
function montarResumo(r) {
  const reg = estudo.situacao(r.id);
  const revisarHoje = reg && reg.proxima && reg.proxima <= hojeISO();
  const perguntas = estudo.lerPerguntas(r.perguntas);

  // anexo e link complementar
  const materiais = [];
  if (r.anexoId) {
    const ehImagem = (r.anexoTipo || "").startsWith("image/");
    const rotulo = ehImagem ? "Ver imagem anexada" : "Abrir anexo (PDF)";
    materiais.push(botao(rotulo, "botao botao--secundario botao--pequeno", async function () {
      try {
        await abrirAnexo(r.anexoId, r.anexoNome);
      } catch (erro) {
        console.error(erro);
        avisar(erro.message || "Não foi possível abrir o anexo.", "erro");
      }
    }));
  }
  if (r.link && /^https?:\/\//i.test(r.link)) {
    materiais.push(criarEl("a", { texto: "Material complementar", attrs: { href: r.link, target: "_blank", rel: "noopener" } }));
  }

  // corpo do resumo
  const corpo = criarEl("div", { classe: "resumo__corpo" });
  corpo.appendChild(criarEl("p", { texto: r.resumo, classe: "resumo__texto" }));
  if (materiais.length > 0) {
    corpo.appendChild(criarEl("div", { classe: "acoes", filhos: materiais }));
  }
  corpo.appendChild(acoesDeEstudo(r, reg, perguntas));
  if (teste && teste.id === r.id) {
    corpo.appendChild(montarTeste(r, perguntas));
  }

  // título do resumo
  const summary = criarEl("summary");
  summary.appendChild(criarEl("span", { texto: r.data ? paraBR(r.data).slice(0, 5) : "—", classe: "resumo__data" }));
  summary.appendChild(criarEl("span", { texto: r.disciplina, classe: "resumo__disc" }));
  summary.appendChild(criarEl("span", { texto: r.titulo }));
  if (revisarHoje) {
    summary.appendChild(criarEl("span", { texto: "Revisar hoje", classe: "etiqueta etiqueta--novo" }));
  }
  if (r.anexoId) {
    summary.appendChild(criarEl("span", { texto: "Anexo", classe: "etiqueta" }));
  }

  const bloco = criarEl("details", { classe: "resumo", attrs: { id: "resumo-" + r.id }, filhos: [summary, corpo] });
  bloco.open = abertos.has(r.id);
  bloco.addEventListener("toggle", function () {
    if (bloco.open) {
      abertos.add(r.id);
    } else {
      abertos.delete(r.id);
    }
  });
  return bloco;
}

/**
 * Botões de estudo conforme a situação do resumo:
 * "Marcar como estudado" -> "Registrar revisão (N de 3)" -> "Próxima revisão: ..." -> "Revisões concluídas".
 * Inclui o botão "Fazer o teste" quando o resumo tem perguntas e o teste não está aberto.
 * @param {Object} r - Documento do resumo.
 * @param {Object|undefined} reg - Situação de estudo (estudo.situacao).
 * @param {{pergunta: string, resposta: string}[]} perguntas
 * @returns {HTMLDivElement}
 */
function acoesDeEstudo(r, reg, perguntas) {
  const filhos = [];
  const total = estudo.INTERVALOS.length;

  if (!reg) {
    filhos.push(botao("Marcar como estudado", "botao botao--secundario botao--pequeno", function () {
      estudo.marcarEstudado(r);
      avisar("Anotado. A primeira revisão fica para amanhã.");
      atualizarResumos(r.id);
    }));
  } else if (!reg.proxima) {
    filhos.push(criarEl("span", { texto: "Revisões concluídas", classe: "muda" }));
  } else if (reg.proxima <= hojeISO()) {
    filhos.push(botao(`Registrar revisão (${reg.etapa + 1} de ${total})`, "botao botao--pequeno", function () {
      const item = estudo.marcarRevisado(r.id);
      if (item.proxima) {
        avisar("Revisão registrada. A próxima é " + quandoE(item.proxima) + ".");
      } else {
        avisar("Você concluiu as três revisões deste resumo.");
      }
      atualizarResumos(r.id);
    }));
  } else {
    filhos.push(criarEl("span", { texto: "Próxima revisão: " + quandoE(reg.proxima), classe: "muda" }));
  }

  if (perguntas.length > 0 && !(teste && teste.id === r.id)) {
    const palavra = perguntas.length === 1 ? "pergunta" : "perguntas";
    filhos.push(botao(`Fazer o teste (${perguntas.length} ${palavra})`, "botao botao--secundario botao--pequeno", function () {
      teste = { id: r.id, pos: 0, acertos: 0, mostrando: false };
      atualizarResumos(r.id);
    }));
  }

  return criarEl("div", { classe: "acoes", filhos: filhos });
}

/**
 * Monta o teste do resumo no formato flashcard: mostra a pergunta, depois a
 * resposta, e o aluno informa se acertou. No fim, mostra o total de acertos.
 * @param {Object} r - Documento do resumo.
 * @param {{pergunta: string, resposta: string}[]} perguntas
 * @returns {HTMLDivElement}
 */
function montarTeste(r, perguntas) {
  const caixa = criarEl("div", { classe: "teste", attrs: { "aria-live": "polite" } });
  const fechar = botao("Fechar", "link", function () {
    teste = null;
    atualizarResumos(r.id);
  });

  // resultado final
  if (teste.pos >= perguntas.length) {
    caixa.appendChild(criarEl("p", { classe: "teste__pergunta", texto: `Você acertou ${teste.acertos} de ${perguntas.length}.` }));
    if (teste.acertos < perguntas.length) {
      caixa.appendChild(criarEl("p", { texto: "Releia o resumo e tente de novo as perguntas que errou." }));
    }
    const refazer = botao("Refazer o teste", "botao botao--secundario botao--pequeno", function () {
      teste = { id: r.id, pos: 0, acertos: 0, mostrando: false };
      atualizarResumos(r.id);
    });
    caixa.appendChild(criarEl("div", { classe: "acoes", filhos: [refazer, fechar] }));
    return caixa;
  }

  // pergunta atual
  const atual = perguntas[teste.pos];
  caixa.appendChild(criarEl("p", { classe: "teste__contagem", texto: `Pergunta ${teste.pos + 1} de ${perguntas.length}` }));
  caixa.appendChild(criarEl("p", { classe: "teste__pergunta", texto: atual.pergunta }));

  if (!teste.mostrando) {
    const ver = botao("Ver a resposta", "botao botao--pequeno", function () {
      teste.mostrando = true;
      atualizarResumos(r.id);
    });
    caixa.appendChild(criarEl("div", { classe: "acoes", filhos: [ver, fechar] }));
  } else {
    caixa.appendChild(criarEl("p", { classe: "teste__resposta", texto: atual.resposta }));
    const acertei = botao("Acertei", "botao botao--pequeno", function () {
      responder(r, perguntas, true);
    });
    const errei = botao("Errei", "botao botao--secundario botao--pequeno", function () {
      responder(r, perguntas, false);
    });
    caixa.appendChild(criarEl("div", { classe: "acoes", filhos: [acertei, errei, fechar] }));
  }
  return caixa;
}

/**
 * Registra a resposta do aluno e avança para a próxima pergunta.
 * Ao terminar o teste, o resumo é marcado como estudado (se ainda não estava).
 * @param {Object} r - Documento do resumo.
 * @param {Object[]} perguntas
 * @param {boolean} acertou
 */
function responder(r, perguntas, acertou) {
  if (acertou) {
    teste.acertos++;
  }
  teste.pos++;
  teste.mostrando = false;

  if (teste.pos >= perguntas.length && !estudo.situacao(r.id)) {
    estudo.marcarEstudado(r);
  }
  atualizarResumos(r.id);
}

/**
 * Redesenha a lista de resumos mantendo o resumo aberto e devolve o foco do
 * teclado para ele (primeiro botão do teste ou o título), já que os botões são recriados.
 * @param {string} id - Id do resumo em que o aluno agiu.
 */
function atualizarResumos(id) {
  abertos.add(id);
  pintarResumos(dados.resumos);

  const bloco = document.getElementById("resumo-" + id);
  if (bloco) {
    const alvo = bloco.querySelector(".teste button") || bloco.querySelector("summary");
    alvo.focus({ preventScroll: true });
  }
}


// ===== Cardápio =====

/**
 * Mostra o cardápio: o cardápio por dia (opcional, o dia de hoje destacado) e o
 * arquivo da semana. Imagem aparece direto na página; PDF aparece como botão.
 * A imagem só é baixada de novo quando o arquivo publicado muda.
 * @param {Object[]} lista - Documentos da coleção cardapio.
 */
function pintarCardapio(lista) {
  const hoje = diaDaSemana();

  // cardápio por dia
  const dias = lista.filter(function (c) {
    return !c.tipo;
  });
  dias.sort(function (a, b) {
    return DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia);
  });

  const grade = $("#grade-cardapio");
  grade.replaceChildren();
  for (const c of dias) {
    const div = criarEl("div", { classe: c.dia === hoje ? "dia dia--hoje" : "dia" });
    div.appendChild(criarEl("h3", { texto: c.dia }));
    div.appendChild(criarEl("p", { texto: c.prato }));
    if (c.acompanhamento) {
      div.appendChild(criarEl("p", { texto: c.acompanhamento }));
    }
    if (c.sobremesa) {
      div.appendChild(criarEl("p", { texto: "Sobremesa: " + c.sobremesa }));
    }
    grade.appendChild(div);
  }

  // arquivo da semana
  const imagem = cardapioAtual(lista);
  const area = $("#cardapio-imagem");

  if (!imagem) {
    delete area.dataset.anexo;
    if (dias.length === 0) {
      estado(area, "O cardápio desta semana ainda não foi publicado.");
    } else {
      area.replaceChildren();
    }
    return;
  }

  if (area.dataset.anexo === imagem.anexoId) {
    return;
  }
  area.dataset.anexo = imagem.anexoId;

  const legenda = criarEl("p", {
    classe: "muda",
    texto: imagem.atualizadoEm ? "Publicado em " + new Date(imagem.atualizadoEm).toLocaleDateString("pt-BR") : ""
  });

  /** Abre o arquivo do cardápio em uma aba nova. */
  function abrir() {
    abrirAnexo(imagem.anexoId, imagem.anexoNome).catch(function (erro) {
      avisar(erro.message, "erro");
    });
  }

  if (!(imagem.anexoTipo || "").startsWith("image/")) {
    area.replaceChildren(botao("Abrir o cardápio da semana (PDF)", "botao botao--secundario", abrir), legenda);
    return;
  }

  estado(area, "Carregando o cardápio…");
  carregarAnexo(imagem.anexoId)
    .then(function (anexo) {
      if (!anexo) {
        estado(area, "Não foi possível carregar a imagem do cardápio.", "erro");
        return;
      }
      const img = criarEl("img", { classe: "miniatura", attrs: { src: anexo.dados, alt: "Cardápio da semana" } });
      const rodape = criarEl("p", { classe: "muda" });
      if (legenda.textContent) {
        rodape.append(legenda.textContent + " · ");
      }
      rodape.append(botao("Ver em tamanho maior", "link", abrir));
      area.replaceChildren(img, rodape);
    })
    .catch(function () {
      estado(area, "Não foi possível carregar a imagem do cardápio.", "erro");
    });
}


// ===== Minha agenda (localStorage) =====

/** Chave no localStorage. Formato: [{ id, data, texto }] */
const CHAVE_AGENDA = "portal:minhaAgenda";

/**
 * Lê as anotações do aluno salvas no aparelho.
 * @returns {{id: number, data: string, texto: string}[]}
 */
function lerMinha() {
  try {
    return JSON.parse(recuperar(CHAVE_AGENDA, "[]"));
  } catch (e) {
    return [];
  }
}

/**
 * Salva as anotações do aluno no aparelho.
 * @param {{id: number, data: string, texto: string}[]} itens
 */
function salvarMinha(itens) {
  guardar(CHAVE_AGENDA, JSON.stringify(itens));
}

/** Mostra as anotações em ordem de data, cada uma com o botão "Apagar". */
function pintarMinha() {
  const ul = $("#lista-minha");
  const itens = lerMinha();
  itens.sort(function (a, b) {
    return a.data.localeCompare(b.data);
  });

  if (itens.length === 0) {
    estado(ul, "Nada anotado ainda.");
    return;
  }

  ul.replaceChildren();
  for (const item of itens) {
    const apagar = botao("Apagar", "link link--perigo", function () {
      salvarMinha(lerMinha().filter(function (x) {
        return x.id !== item.id;
      }));
      pintarMinha();
    });
    ul.appendChild(criarEl("li", {
      filhos: [
        criarEl("strong", { texto: `${paraBR(item.data)} — ${item.texto}` }),
        criarEl("span", { texto: quandoE(item.data), classe: "muda" }),
        apagar
      ]
    }));
  }
}

/**
 * Adiciona uma anotação com a data e o texto do formulário.
 * Se faltar algum campo, coloca o cursor no campo vazio.
 */
function adicionarMinha() {
  const data = $("#ag-data").value;
  const texto = $("#ag-texto").value.trim();

  if (!data || !texto) {
    if (texto) {
      $("#ag-data").focus();
    } else {
      $("#ag-texto").focus();
    }
    return;
  }

  const itens = lerMinha();
  itens.push({ id: Date.now(), data: data, texto: texto });
  salvarMinha(itens);
  $("#ag-texto").value = "";
  pintarMinha();
}


// ===== Conexão com o banco =====

/**
 * Cria a função que mostra o erro de conexão em uma área da página.
 * @param {string} seletor - Área onde a mensagem aparece.
 * @returns {function(): void}
 */
function erroAo(seletor) {
  return function () {
    estado($(seletor), "Não foi possível carregar os dados. Verifique a sua conexão.", "erro");
  };
}

/**
 * Troca a série observada: encerra as observações da série anterior e passa a
 * observar aulas, agenda, avisos e resumos da série nova. Sem série, limpa as seções.
 * @param {string} serie - Série escolhida ("" se nenhuma).
 */
function ouvirSerie(serie) {
  for (const parar of desligar) {
    parar();
  }
  desligar = [];

  if (!serie) {
    dados.aulas = [];
    dados.agenda = [];
    dados.avisos = [];
    dados.resumos = [];
    pintarHorario([]);
    pintarAgenda([]);
    pintarAvisos([]);
    pintarResumos([]);
    pintarHoje();
    return;
  }

  desligar.push(observar("aulas", { serie: serie, incluirTodas: false }, function (lista) {
    dados.aulas = lista;
    pintarHorario(lista);
    pintarHoje();
  }, erroAo("#horario-area")));

  desligar.push(observar("agenda", { serie: serie }, function (lista) {
    dados.agenda = lista;
    pintarAgenda(lista);
    pintarHoje();
  }, erroAo("#provas-area")));

  desligar.push(observar("avisos", { serie: serie }, function (lista) {
    dados.avisos = lista;
    pintarAvisos(lista);
  }, erroAo("#lista-avisos")));

  desligar.push(observar("resumos", { serie: serie }, function (lista) {
    dados.resumos = lista;
    pintarResumos(lista);
  }, erroAo("#lista-resumos")));
}


// ===== Sua opinião =====

/**
 * Mostra os formulários do Google Forms da seção "Sua opinião".
 * TODO: quando a escola criar o formulário, adicionar em "links" um item
 * { titulo, url } com o endereço de incorporação (terminado em ?embedded=true).
 */
function montarFormularios() {
  const area = $("#area-formularios");
  const links = [];

  if (links.length === 0) {
    estado(area, "O formulário de opinião ainda não foi ligado ao portal.");
    return;
  }
  area.replaceChildren();
  for (const l of links) {
    area.appendChild(criarEl("iframe", { attrs: { src: l.url, title: l.titulo, loading: "lazy", style: "width:100%;min-height:640px;border:0" } }));
  }
}


// ===== Início =====

/**
 * Inicia a tela: preenche os dados da escola, liga a "Minha agenda" e o cronômetro
 * (que funcionam mesmo sem Firebase), os filtros, a escolha de série (lembrada no
 * aparelho) e as observações do banco.
 */
function iniciar() {
  $("#nome-escola").textContent = ESCOLA.nome;
  $("#logo").textContent = ESCOLA.sigla;
  $("#rodape-texto").textContent = ESCOLA.rodape;
  document.title = ESCOLA.nome;

  // Minha agenda
  $("#ag-add").addEventListener("click", adicionarMinha);
  $("#ag-texto").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      adicionarMinha();
    }
  });
  pintarMinha();

  // cronômetro
  iniciarFoco({
    aoTerminarEstudo: function () {
      avisar("Bloco de estudo concluído. Faça uma pausa de 5 minutos.");
    },
    aoTerminarPausa: function () {
      avisar("Pausa encerrada. Pode voltar a estudar.");
    }
  });

  const sel = $("#serie");
  for (const s of SERIES) {
    sel.appendChild(criarEl("option", { texto: s, attrs: { value: s } }));
  }

  if (!configurado) {
    estado($("#lista-avisos"), "Site ainda não configurado: preencha js/config.js.", "erro");
    return;
  }

  // filtros dos resumos (ao mudar o filtro, volta a mostrar 12)
  $("#busca-resumo").addEventListener("input", function (e) {
    filtroResumos.busca = e.target.value;
    filtroResumos.limite = 12;
    pintarResumos(dados.resumos);
  });
  $("#filtro-disciplina").addEventListener("change", function (e) {
    filtroResumos.disciplina = e.target.value;
    filtroResumos.limite = 12;
    pintarResumos(dados.resumos);
  });
  $("#mais-resumos").addEventListener("click", function () {
    filtroResumos.limite += 12;
    pintarResumos(dados.resumos);
  });
  $("#mais-avisos").addEventListener("click", function () {
    avisosVisiveis += 8;
    pintarAvisos(dados.avisos);
  });
  $("#revisar").addEventListener("click", irParaResumo);

  // série escolhida (lembrada no aparelho)
  sel.value = recuperar("portal:serie");
  sel.addEventListener("change", function () {
    guardar("portal:serie", sel.value);
    ouvirSerie(sel.value);
  });
  ouvirSerie(sel.value);

  // o cardápio é o mesmo para todas as séries
  observar("cardapio", {}, function (lista) {
    dados.cardapio = lista;
    pintarCardapio(lista);
    pintarHoje();
  }, erroAo("#grade-cardapio"));

  pintarHoje();
  montarFormularios();
}

iniciar();
