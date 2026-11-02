/**
 * @file admin.js
 * Área da escola (admin.html): login de professores e coordenação e publicação
 * do conteúdo do portal (horário, provas e datas, avisos, resumos e cardápio).
 * Só entra quem está logado e tem cadastro na coleção "admins".
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, configurado } from "./firebase.js";
import { COLECOES, observar, criar, atualizar, remover, salvarLote, ehAdmin } from "./dados.js";
import { SERIES, DIAS, TIPOS, TODAS, HORARIOS, DISCIPLINAS, ESCOLA } from "./config.js";
import { $, criarEl, estado, avisar, botao, paraBR, hojeISO, ordemHorario, cardapioAtual } from "./ui.js";
import { prepararAnexo, enviarAnexo, apagarAnexo, carregarAnexo } from "./anexos.js";
import { lerPerguntas } from "./estudo.js";


// ===== Funções de apoio =====

/**
 * Posição da série para ordenação ("Todas" vem antes do 1º ano).
 * @param {string} s - Série.
 * @returns {number}
 */
function posSerie(s) {
  if (s === TODAS) {
    return -1;
  }
  return SERIES.indexOf(s);
}

/**
 * Posição do dia na semana letiva, para ordenação.
 * @param {string} d - Dia.
 * @returns {number}
 */
function posDia(d) {
  return DIAS.indexOf(d);
}

/**
 * Nome da série exibido nas tabelas.
 * @param {string} s - Série.
 * @returns {string}
 */
function nomeSerie(s) {
  return s === TODAS ? "Todas" : s;
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

/**
 * Cria as opções de um select (texto e valor iguais).
 * @param {string[]} lista
 * @returns {HTMLOptionElement[]}
 */
function opcoes(lista) {
  return lista.map(function (v) {
    return criarEl("option", { texto: v, attrs: { value: v } });
  });
}

/**
 * Texto da coluna "Extras" dos resumos: indica se há anexo, perguntas e link.
 * @param {Object} i - Documento do resumo.
 * @returns {string} Ex.: "anexo, perguntas" ou "—".
 */
function extrasDoResumo(i) {
  const extras = [];
  if (i.anexoId) {
    extras.push("anexo");
  }
  if (lerPerguntas(i.perguntas).length > 0) {
    extras.push("perguntas");
  }
  if (i.link) {
    extras.push("link");
  }
  return extras.length > 0 ? extras.join(", ") : "—";
}


// ===== Modelos das seções em lista =====

/*
 * Cada modelo descreve uma seção: coleção, textos dos botões, campos do formulário,
 * colunas da tabela e ordenação. As funções montarSecaoLista, pintarLista,
 * abrirJanela e salvarJanela montam a tela a partir dessa descrição.
 *
 * Campo: { nome, rotulo, tipo, opcoes?, opcional?, largo?, dica?, ajuda?, max?, padrao? }
 *   tipo: select | data | texto | area | disciplina | arquivo | url
 * Coluna: { titulo, valor(item) }
 * Opcionais do modelo: passou(item) (datas passadas), aoCriar(dados), filtro(item), semSerie
 */
const TODAS_E_SERIES = [TODAS].concat(SERIES);

const MODELOS = {
  agenda: {
    colecao: "agenda",
    novo: "Nova prova ou data",
    item: "prova ou data",
    campos: [
      { nome: "serie", rotulo: "Série", tipo: "select", opcoes: TODAS_E_SERIES },
      { nome: "data", rotulo: "Data", tipo: "data" },
      { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Object.keys(TIPOS) },
      { nome: "disciplina", rotulo: "Disciplina", tipo: "disciplina", opcional: true, ajuda: "Deixe em branco para eventos e feriados." },
      { nome: "descricao", rotulo: "Descrição", tipo: "texto", largo: true,
        ajuda: "Para provas, o conteúdo que vai cair. Ex.: frações e números decimais (capítulos 3 e 4)." }
    ],
    colunas: [
      { titulo: "Data", valor: function (i) { return paraBR(i.data); } },
      { titulo: "Tipo", valor: function (i) { return i.tipo; } },
      { titulo: "Série", valor: function (i) { return nomeSerie(i.serie); } },
      { titulo: "Disciplina", valor: function (i) { return i.disciplina || "—"; } },
      { titulo: "Descrição", valor: function (i) { return i.descricao; } }
    ],
    nome: function (i) { return `${i.tipo} de ${paraBR(i.data)}`; },
    ordem: function (a, b) { return a.data.localeCompare(b.data); },
    passou: function (i) { return i.data < hojeISO(); }
  },

  avisos: {
    colecao: "avisos",
    novo: "Novo aviso",
    item: "aviso",
    campos: [
      { nome: "serie", rotulo: "Para qual série", tipo: "select", opcoes: TODAS_E_SERIES },
      { nome: "titulo", rotulo: "Título", tipo: "texto", largo: true, dica: "Ex.: Não haverá aula na sexta-feira (15/11)" },
      { nome: "texto", rotulo: "Texto do aviso", tipo: "area", largo: true }
    ],
    colunas: [
      { titulo: "Publicado em", valor: function (i) { return i.criadoEm ? new Date(i.criadoEm).toLocaleDateString("pt-BR") : "—"; } },
      { titulo: "Série", valor: function (i) { return nomeSerie(i.serie); } },
      { titulo: "Título", valor: function (i) { return i.titulo; } }
    ],
    nome: function (i) { return i.titulo; },
    ordem: function (a, b) { return (b.criadoEm || 0) - (a.criadoEm || 0); },
    /** Registra a data de publicação (usada no portal para a etiqueta "Novo"). */
    aoCriar: function (dados) {
      const novo = {};
      Object.assign(novo, dados);
      novo.criadoEm = Date.now();
      return novo;
    }
  },

  resumos: {
    colecao: "resumos",
    novo: "Novo resumo",
    item: "resumo",
    campos: [
      { nome: "serie", rotulo: "Série", tipo: "select", opcoes: TODAS_E_SERIES },
      { nome: "disciplina", rotulo: "Disciplina", tipo: "disciplina" },
      { nome: "data", rotulo: "Data da aula", tipo: "data", padrao: hojeISO },
      { nome: "titulo", rotulo: "Assunto", tipo: "texto", largo: true, dica: "Ex.: Frações equivalentes" },
      { nome: "resumo", rotulo: "Resumo", tipo: "area", largo: true, max: 2000 },
      { nome: "perguntas", rotulo: "Perguntas para o aluno se testar", tipo: "area", largo: true, opcional: true, max: 1500,
        dica: "Quanto é 7 x 8? | 56", ajuda: "Uma pergunta por linha, com a resposta depois da barra: pergunta | resposta." },
      { nome: "anexo", rotulo: "Anexo", tipo: "arquivo", largo: true, opcional: true,
        ajuda: "PDF de até 700 KB ou imagem (fotos são reduzidas automaticamente)." },
      { nome: "link", rotulo: "Link de material complementar", tipo: "url", largo: true, opcional: true, dica: "https://" }
    ],
    colunas: [
      { titulo: "Aula", valor: function (i) { return i.data ? paraBR(i.data) : "—"; } },
      { titulo: "Série", valor: function (i) { return nomeSerie(i.serie); } },
      { titulo: "Disciplina", valor: function (i) { return i.disciplina; } },
      { titulo: "Assunto", valor: function (i) { return i.titulo; } },
      { titulo: "Extras", valor: extrasDoResumo }
    ],
    nome: function (i) { return i.titulo; },
    /** Aula mais recente primeiro; na mesma data, ordena pela série. */
    ordem: function (a, b) {
      const porData = (b.data || "").localeCompare(a.data || "");
      if (porData !== 0) {
        return porData;
      }
      return posSerie(a.serie) - posSerie(b.serie);
    }
  },

  cardapio: {
    colecao: "cardapio",
    novo: "Adicionar dia",
    item: "dia do cardápio",
    semSerie: true,
    campos: [
      { nome: "dia", rotulo: "Dia da semana", tipo: "select", opcoes: DIAS },
      { nome: "prato", rotulo: "Prato principal", tipo: "texto", largo: true },
      { nome: "acompanhamento", rotulo: "Acompanhamentos", tipo: "texto", largo: true, opcional: true },
      { nome: "sobremesa", rotulo: "Sobremesa ou fruta", tipo: "texto", opcional: true }
    ],
    colunas: [
      { titulo: "Dia", valor: function (i) { return i.dia; } },
      { titulo: "Prato principal", valor: function (i) { return i.prato; } },
      { titulo: "Acompanhamentos", valor: function (i) { return i.acompanhamento || "—"; } },
      { titulo: "Sobremesa", valor: function (i) { return i.sobremesa || "—"; } }
    ],
    nome: function (i) { return "cardápio de " + i.dia; },
    /** A tabela mostra só o cardápio por dia (o documento tipo "imagem" é o arquivo da semana). */
    filtro: function (i) { return !i.tipo; },
    ordem: function (a, b) { return posDia(a.dia) - posDia(b.dia); }
  }
};

/** Seções do menu lateral, na ordem em que aparecem. */
const SECOES = [
  { chave: "horario", colecao: "aulas", titulo: "Horário das aulas",
    descricao: "Monte o quadro de horários de cada série: digite a disciplina em cada célula ou cole a tabela de uma planilha." },
  { chave: "agenda", colecao: "agenda", titulo: "Provas e datas",
    descricao: "Provas, entregas de trabalho, eventos e feriados. Os alunos veem a data e quantos dias faltam." },
  { chave: "avisos", colecao: "avisos", titulo: "Mural de avisos",
    descricao: "Recados para alunos e famílias, como dias sem aula, reuniões e eventos." },
  { chave: "resumos", colecao: "resumos", titulo: "Resumos das aulas",
    descricao: "O que foi visto em cada aula. Pode ter anexo, link e perguntas para o aluno revisar." },
  { chave: "cardapio", colecao: "cardapio", titulo: "Cardápio",
    descricao: "Publique o cardápio da semana como foto ou PDF. Preencher dia a dia é opcional." }
];


// ===== Estado da tela =====

/** Chave da seção aberta. */
let secao = "horario";

/** Tudo o que está publicado, por coleção (sem filtro de série). */
const todos = {};
for (const nome of COLECOES) {
  todos[nome] = [];
}

/** Coleções que já responderam ao menos uma vez (antes disso a tela mostra "Carregando…"). */
const carregadas = new Set();

/** Funções que encerram as observações do banco. */
let desligar = [];

/** Filtros das listas: série, busca e se mostra as datas que já passaram. */
const filtros = { serie: "", busca: "", passadas: false };

/** Quadro de horário em edição: { serie, linhas: [{ horario, celulas }], alterado } ou null. */
let grade = null;

/** Formulário aberto: { chave, item } (item null = novo). */
let janela = null;

const MSG_NAO_SALVO = "O horário tem alterações que não foram salvas. Sair mesmo assim?";

/**
 * Seção aberta no momento.
 * @returns {Object} Item de SECOES.
 */
function secaoAtual() {
  return SECOES.find(function (s) {
    return s.chave === secao;
  });
}

/**
 * Mensagem de erro para o professor.
 * Erros do Firebase têm "code"; os erros do próprio site (ex.: arquivo grande) só têm "message".
 * @param {Error} erro
 * @returns {string}
 */
function mensagemDeErro(erro) {
  if (erro && erro.code === "permission-denied") {
    return "Sem permissão para salvar. Confira se a sua conta está liberada e se as regras do Firestore foram publicadas.";
  }
  if (erro && !erro.code && erro.message) {
    return erro.message;
  }
  return "Não foi possível salvar. Verifique a conexão e tente de novo.";
}


// ===== Menu e seções =====

/**
 * Cabeçalho da seção: título, descrição e um botão de ação opcional.
 * @param {HTMLElement|null} acao - Botão exibido ao lado do título.
 * @returns {HTMLDivElement}
 */
function cabecalho(acao) {
  const s = secaoAtual();
  const textos = criarEl("div", { filhos: [criarEl("h1", { texto: s.titulo }), criarEl("p", { texto: s.descricao })] });
  return criarEl("div", { classe: "secao__cabeca", filhos: [textos, acao] });
}

/**
 * Número exibido ao lado de cada item do menu: séries com horário ("2/9"),
 * provas e datas futuras, ou total de itens. O cardápio não tem contagem.
 * @param {Object} s - Item de SECOES.
 * @returns {string}
 */
function contagem(s) {
  if (!carregadas.has(s.colecao)) {
    return "";
  }
  if (s.chave === "horario") {
    const series = [];
    for (const a of todos.aulas) {
      if (!series.includes(a.serie)) {
        series.push(a.serie);
      }
    }
    return series.length + "/" + SERIES.length;
  }
  if (s.chave === "agenda") {
    const hoje = hojeISO();
    return String(todos.agenda.filter(function (i) { return i.data >= hoje; }).length);
  }
  if (s.chave === "cardapio") {
    return "";
  }
  return String(todos[s.colecao].length);
}

/** Desenha o menu lateral, marcando a seção aberta (aria-current). */
function pintarMenu() {
  const menu = $("#menu");
  menu.replaceChildren();
  for (const s of SECOES) {
    const b = criarEl("button", {
      attrs: { type: "button" },
      filhos: [criarEl("span", { texto: s.titulo }), criarEl("span", { texto: contagem(s), classe: "num" })]
    });
    if (s.chave === secao) {
      b.setAttribute("aria-current", "page");
    }
    b.addEventListener("click", function () {
      trocarSecao(s.chave);
    });
    menu.appendChild(b);
  }
}

/**
 * Abre outra seção. Se o horário tiver alterações não salvas, pede confirmação antes.
 * @param {string} chave - Chave da seção.
 */
function trocarSecao(chave) {
  if (grade && grade.alterado && !confirm(MSG_NAO_SALVO)) {
    return;
  }
  secao = chave;
  grade = null;
  filtros.busca = "";
  pintarMenu();
  pintarSecao();
  window.scrollTo(0, 0);
}

/** Monta o conteúdo da seção aberta. */
function pintarSecao() {
  if (secao === "horario") {
    montarHorario();
  } else if (secao === "cardapio") {
    montarCardapio();
  } else {
    montarSecaoLista(secao);
  }
}


// ===== Horário (quadro tipo planilha) =====

/**
 * Linha vazia do quadro de horário.
 * @param {string} [horario=""]
 * @returns {{horario: string, celulas: Object<string, string>}} celulas: disciplina por dia.
 */
function linhaVazia(horario) {
  const celulas = {};
  for (const d of DIAS) {
    celulas[d] = "";
  }
  return { horario: horario === undefined ? "" : horario, celulas: celulas };
}

/**
 * Monta o quadro de uma série com as aulas do banco. As linhas são os horários
 * padrão (config.js) mais os horários que a série já usa, em ordem de início.
 * @param {string} serie
 * @returns {{serie: string, linhas: Object[], alterado: boolean}}
 */
function novaGrade(serie) {
  const aulas = todos.aulas.filter(function (a) {
    return a.serie === serie;
  });

  const horarios = HORARIOS.slice();
  for (const a of aulas) {
    if (!horarios.includes(a.horario)) {
      horarios.push(a.horario);
    }
  }
  horarios.sort(ordemHorario);

  const linhas = [];
  for (const h of horarios) {
    const linha = linhaVazia(h);
    for (const d of DIAS) {
      const aula = aulas.find(function (a) {
        return a.horario === h && a.dia === d;
      });
      if (aula) {
        linha.celulas[d] = aula.disciplina;
      }
    }
    linhas.push(linha);
  }
  return { serie: serie, linhas: linhas, alterado: false };
}

/**
 * Monta a seção de horário: select da série, quadro e botões
 * (adicionar horário, descartar alterações e salvar).
 * O quadro fica em memória e só é gravado no banco ao clicar em "Salvar horário".
 */
function montarHorario() {
  if (!grade) {
    grade = novaGrade(filtros.serie || SERIES[0]);
  }

  const seletor = criarEl("select", { attrs: { id: "grade-serie" }, filhos: opcoes(SERIES) });
  seletor.value = grade.serie;
  seletor.addEventListener("change", function () {
    if (grade.alterado && !confirm("O horário tem alterações que não foram salvas. Trocar de série mesmo assim?")) {
      seletor.value = grade.serie;
      return;
    }
    filtros.serie = seletor.value;
    grade = novaGrade(seletor.value);
    pintarGrade();
  });

  const btnAdicionar = botao("Adicionar horário", "botao botao--secundario", function () {
    grade.linhas.push(linhaVazia());
    marcarAlterado();
    pintarGrade();
    focarCelula(grade.linhas.length - 1, 0);
  });

  const btnDescartar = botao("Descartar alterações", "botao botao--secundario", function () {
    if (!grade.alterado || !confirm("Descartar as alterações e voltar ao horário salvo?")) {
      return;
    }
    grade = novaGrade(grade.serie);
    pintarGrade();
  });

  const btnSalvar = criarEl("button", { texto: "Salvar horário", classe: "botao", attrs: { type: "button", id: "grade-salvar" } });
  btnSalvar.addEventListener("click", function () {
    salvarHorario(btnSalvar);
  });

  const painel = criarEl("div", {
    classe: "painel",
    filhos: [
      criarEl("div", { classe: "filtros", filhos: [criarEl("label", { texto: "Série", attrs: { for: "grade-serie" }, filhos: [seletor] })] }),
      criarEl("p", {
        classe: "ajuda", attrs: { style: "margin-bottom:12px" },
        texto: "Para colar de uma planilha (Excel ou Google Planilhas): selecione as células lá, copie, clique na primeira célula do quadro e cole com Ctrl+V. A primeira coluna é a do horário."
      }),
      criarEl("div", { attrs: { id: "grade-area" } }),
      criarEl("div", {
        classe: "acoes", attrs: { style: "margin-top:14px" },
        filhos: [
          btnAdicionar,
          criarEl("span", { attrs: { id: "grade-status", style: "margin-left:auto" }, classe: "status" }),
          btnDescartar,
          btnSalvar
        ]
      })
    ]
  });

  $("#secao").replaceChildren(cabecalho(null), painel);
  pintarGrade();
}

/**
 * Lê o valor de uma célula do quadro.
 * @param {Object} linha - Linha da grade.
 * @param {number} coluna - 0 = horário; 1 a 5 = segunda a sexta.
 * @returns {string}
 */
function lerCelula(linha, coluna) {
  if (coluna === 0) {
    return linha.horario;
  }
  return linha.celulas[DIAS[coluna - 1]];
}

/**
 * Escreve o valor de uma célula do quadro.
 * @param {Object} linha - Linha da grade.
 * @param {number} coluna - 0 = horário; 1 a 5 = segunda a sexta.
 * @param {string} valor
 */
function escreverCelula(linha, coluna, valor) {
  if (coluna === 0) {
    linha.horario = valor;
  } else {
    linha.celulas[DIAS[coluna - 1]] = valor;
  }
}

/**
 * Coloca o cursor em uma célula do quadro.
 * @param {number} linha - Índice da linha.
 * @param {number} coluna - Índice da coluna.
 */
function focarCelula(linha, coluna) {
  const el = document.querySelector(`#grade-area input[data-linha="${linha}"][data-coluna="${coluna}"]`);
  if (el) {
    el.focus();
  }
}

/**
 * Desenha o quadro de horário como uma tabela de campos de texto.
 * Os eventos de digitação e colagem são tratados por um único listener na tabela.
 */
function pintarGrade() {
  const area = $("#grade-area");
  if (!area) {
    return;
  }

  const cab = criarEl("tr");
  cab.appendChild(criarEl("th", { texto: "Horário", attrs: { scope: "col" } }));
  for (const d of DIAS) {
    cab.appendChild(criarEl("th", { texto: d, attrs: { scope: "col" } }));
  }
  cab.appendChild(criarEl("th", { attrs: { scope: "col", "aria-label": "Remover linha" } }));

  const linhas = [];
  grade.linhas.forEach(function (linha, r) {
    const tr = criarEl("tr");

    for (let c = 0; c <= DIAS.length; c++) {
      const rotulo = c === 0 ? `Horário da linha ${r + 1}` : `${DIAS[c - 1]}, ${linha.horario || "linha " + (r + 1)}`;
      const input = criarEl("input", {
        attrs: { type: "text", maxlength: 60, "data-linha": r, "data-coluna": c, "aria-label": rotulo }
      });
      if (c > 0) {
        input.setAttribute("list", "lista-disciplinas");
      } else {
        input.placeholder = "00:00 - 00:00";
      }
      input.value = lerCelula(linha, c);
      tr.appendChild(criarEl("td", { filhos: [input] }));
    }

    // botão × remove a linha (pede confirmação se ela tiver aulas)
    const btnRemover = botao("×", "remover", function () {
      const temAula = DIAS.some(function (d) {
        return linha.celulas[d].trim();
      });
      if (temAula && !confirm(`Remover a linha ${linha.horario || r + 1} com as aulas dela?`)) {
        return;
      }
      grade.linhas.splice(r, 1);
      marcarAlterado();
      pintarGrade();
    });
    btnRemover.title = "Remover linha";
    tr.appendChild(criarEl("td", { classe: "col-acao", filhos: [btnRemover] }));

    linhas.push(tr);
  });

  const tabela = montarTabela(cab, linhas, "grade-horario");
  tabela.addEventListener("input", function (e) {
    const l = Number(e.target.dataset.linha);
    const c = Number(e.target.dataset.coluna);
    escreverCelula(grade.linhas[l], c, e.target.value);
    marcarAlterado();
  });
  tabela.addEventListener("paste", colarPlanilha);

  area.replaceChildren(criarEl("div", { classe: "tabela", filhos: [tabela] }));
  pintarStatus();
}

/**
 * Cola no quadro um bloco copiado do Excel ou do Google Planilhas
 * (colunas separadas por TAB e linhas por quebra de linha), a partir da célula clicada.
 * - Texto simples, sem TAB nem quebra de linha, é colado normalmente pelo navegador.
 * - A linha de títulos (Segunda, Terça...) é descartada, se vier junto.
 * - Linhas são criadas se a colagem passar do fim do quadro; colunas além de sexta são ignoradas.
 * @param {ClipboardEvent} evento
 */
function colarPlanilha(evento) {
  const texto = evento.clipboardData.getData("text");
  if (!/[\t\n]/.test(texto.trim())) {
    return;
  }
  evento.preventDefault();

  const blocos = texto.replace(/\r/g, "").replace(/\n+$/, "").split("\n").map(function (l) {
    return l.split("\t").map(function (v) {
      return v.trim();
    });
  });

  if (blocos[0].some(function (v) { return DIAS.includes(v); })) {
    blocos.shift();
  }

  const r0 = Number(evento.target.dataset.linha);
  const c0 = Number(evento.target.dataset.coluna);

  for (let i = 0; i < blocos.length; i++) {
    while (grade.linhas.length <= r0 + i) {
      grade.linhas.push(linhaVazia());
    }
    for (let j = 0; j < blocos[i].length; j++) {
      if (c0 + j <= DIAS.length) {
        escreverCelula(grade.linhas[r0 + i], c0 + j, blocos[i][j]);
      }
    }
  }

  marcarAlterado();
  pintarGrade();
  const qtd = blocos.length;
  avisar(`${qtd} ${qtd === 1 ? "linha colada" : "linhas coladas"}. Confira e clique em Salvar horário.`);
}

/** Marca o quadro como alterado (há mudanças não salvas). */
function marcarAlterado() {
  grade.alterado = true;
  pintarStatus();
}

/** Atualiza o texto de status do quadro: "Há alterações não salvas", "Horário salvo" ou "Carregando…". */
function pintarStatus() {
  const status = $("#grade-status");
  if (!status) {
    return;
  }
  if (grade.alterado) {
    status.textContent = "Há alterações não salvas";
    status.className = "status status--pendente";
  } else {
    status.textContent = carregadas.has("aulas") ? "Horário salvo" : "Carregando…";
    status.className = "status";
  }
}

/**
 * Salva o quadro de horário da série.
 * 1. Valida: linha com aula precisa de horário e o mesmo horário não pode repetir.
 * 2. Compara o quadro com as aulas do banco.
 * 3. Grava só as diferenças (criar, atualizar, remover) em um único lote.
 * Se houver duas aulas no banco para a mesma célula, a excedente é removida.
 * @param {HTMLButtonElement} btnSalvar - Desabilitado enquanto salva.
 * @returns {Promise<void>}
 */
async function salvarHorario(btnSalvar) {
  const serie = grade.serie;
  const linhas = grade.linhas;

  // aulas desejadas, pela chave "dia|horario"
  const desejadas = {};
  const vistos = [];

  for (let r = 0; r < linhas.length; r++) {
    const linha = linhas[r];
    const horario = linha.horario.trim();
    const temAula = DIAS.some(function (d) {
      return linha.celulas[d].trim();
    });

    if (!horario && temAula) {
      avisar(`Preencha o horário da linha ${r + 1}.`, "erro");
      focarCelula(r, 0);
      return;
    }
    if (!horario) {
      continue;
    }
    if (vistos.includes(horario)) {
      avisar(`O horário ${horario} aparece em duas linhas.`, "erro");
      focarCelula(r, 0);
      return;
    }
    vistos.push(horario);

    for (const dia of DIAS) {
      const disciplina = linha.celulas[dia].trim();
      if (disciplina) {
        desejadas[dia + "|" + horario] = { serie: serie, dia: dia, horario: horario, disciplina: disciplina };
      }
    }
  }

  // compara com o banco: remove o que saiu, atualiza o que mudou
  const operacoes = [];
  for (const aula of todos.aulas) {
    if (aula.serie !== serie) {
      continue;
    }
    const chave = aula.dia + "|" + aula.horario;
    const nova = desejadas[chave];
    if (!nova) {
      operacoes.push({ tipo: "remover", nome: "aulas", id: aula.id });
      continue;
    }
    if (nova.disciplina !== aula.disciplina) {
      operacoes.push({ tipo: "atualizar", nome: "aulas", id: aula.id, dados: { disciplina: nova.disciplina } });
    }
    delete desejadas[chave];
  }

  // o que sobrou são aulas novas
  for (const chave of Object.keys(desejadas)) {
    const dados = {};
    Object.assign(dados, desejadas[chave]);
    dados.atividade = "";
    operacoes.push({ tipo: "criar", nome: "aulas", dados: dados });
  }

  if (operacoes.length === 0) {
    grade.alterado = false;
    pintarStatus();
    avisar("Nada mudou no horário.");
    return;
  }

  btnSalvar.disabled = true;
  try {
    await salvarLote(operacoes);
    grade = novaGrade(serie);   // recarrega do banco para refletir o que foi salvo
    pintarGrade();
    avisar(`Horário do ${serie} salvo. Já aparece no portal.`);
  } catch (erro) {
    console.error(erro);
    avisar(mensagemDeErro(erro), "erro");
  } finally {
    btnSalvar.disabled = false;
  }
}


// ===== Seções em lista (provas, avisos e resumos) =====

/**
 * Monta uma seção em lista: cabeçalho com o botão de novo item, filtros e tabela.
 * @param {string} chave - Chave do modelo em MODELOS.
 */
function montarSecaoLista(chave) {
  const m = MODELOS[chave];
  const btnNovo = botao(m.novo, "botao", function () {
    abrirJanela(chave);
  });
  const painel = criarEl("div", { classe: "painel", filhos: [montarFiltros(chave), criarEl("div", { attrs: { id: "lista" } })] });
  $("#secao").replaceChildren(cabecalho(btnNovo), painel);
  pintarLista(chave);
}

/**
 * Monta os filtros da lista: série (exceto no cardápio), busca e, nas provas,
 * a opção de mostrar as datas que já passaram.
 * @param {string} chave - Chave do modelo.
 * @returns {HTMLDivElement}
 */
function montarFiltros(chave) {
  const m = MODELOS[chave];
  const filhos = [];

  if (!m.semSerie) {
    const sel = criarEl("select", { attrs: { id: "filtro-serie" } });
    sel.appendChild(criarEl("option", { texto: "Todas as séries", attrs: { value: "" } }));
    for (const o of opcoes(SERIES)) {
      sel.appendChild(o);
    }
    sel.value = filtros.serie;
    sel.addEventListener("change", function () {
      filtros.serie = sel.value;
      pintarLista(chave);
    });
    filhos.push(criarEl("label", { texto: "Série", attrs: { for: "filtro-serie" }, filhos: [sel] }));
  }

  const busca = criarEl("input", { attrs: { type: "search", id: "busca", placeholder: "Digite para filtrar a lista" } });
  busca.value = filtros.busca;
  busca.addEventListener("input", function () {
    filtros.busca = busca.value;
    pintarLista(chave);
  });
  filhos.push(criarEl("label", { texto: "Buscar", attrs: { for: "busca" }, filhos: [busca] }));

  if (m.passou) {
    const chk = criarEl("input", { attrs: { type: "checkbox", id: "ver-passadas" } });
    chk.checked = filtros.passadas;
    chk.addEventListener("change", function () {
      filtros.passadas = chk.checked;
      pintarLista(chave);
    });
    filhos.push(criarEl("label", { classe: "marcador", attrs: { for: "ver-passadas" }, filhos: [chk, criarEl("span", { texto: "Mostrar as que já passaram" })] }));
  }

  return criarEl("div", { classe: "filtros", attrs: { style: "margin-bottom:14px" }, filhos: filhos });
}

/**
 * Desenha a tabela da seção com os filtros aplicados e os botões Editar, Duplicar e Excluir.
 * O filtro de série também mostra os itens publicados para "Todas"; a busca procura em todas as colunas.
 * @param {string} chave - Chave do modelo.
 */
function pintarLista(chave) {
  const area = $("#lista");
  if (!area) {
    return;
  }

  const m = MODELOS[chave];
  if (!carregadas.has(m.colecao)) {
    estado(area, "Carregando…");
    return;
  }

  const busca = filtros.busca.trim().toLowerCase();
  const itens = todos[m.colecao].filter(function (i) {
    if (m.filtro && !m.filtro(i)) {
      return false;
    }
    if (!m.semSerie && filtros.serie && i.serie !== filtros.serie && i.serie !== TODAS) {
      return false;
    }
    if (m.passou && !filtros.passadas && m.passou(i)) {
      return false;
    }
    if (busca) {
      const texto = m.colunas.map(function (col) { return col.valor(i); }).join(" ").toLowerCase();
      if (!texto.includes(busca)) {
        return false;
      }
    }
    return true;
  });
  itens.sort(m.ordem);

  if (itens.length === 0) {
    estado(area, filtros.serie || busca ? "Nada encontrado com esse filtro." : "Nada publicado ainda.");
    return;
  }

  const cab = criarEl("tr");
  for (const col of m.colunas) {
    cab.appendChild(criarEl("th", { texto: col.titulo, attrs: { scope: "col" } }));
  }
  cab.appendChild(criarEl("th", { texto: "Ações", attrs: { scope: "col" } }));

  const linhas = [];
  for (const item of itens) {
    const tr = criarEl("tr", { classe: m.passou && m.passou(item) ? "passou" : "" });
    for (const col of m.colunas) {
      tr.appendChild(criarEl("td", { texto: col.valor(item) }));
    }
    tr.appendChild(criarEl("td", {
      classe: "acoes-celula",
      filhos: [
        botao("Editar", "link", function () { abrirJanela(chave, item); }),
        botao("Duplicar", "link", function () { abrirJanela(chave, item, true); }),
        botao("Excluir", "link link--perigo", function () { excluir(m, item); })
      ]
    }));
    linhas.push(tr);
  }

  area.replaceChildren(criarEl("div", { classe: "tabela", filhos: [montarTabela(cab, linhas)] }));
}

/**
 * Exclui um item depois de confirmar. Se o item tiver anexo, o anexo também é apagado.
 * @param {Object} m - Modelo da seção.
 * @param {Object} item - Documento a excluir.
 * @returns {Promise<void>}
 */
async function excluir(m, item) {
  if (!confirm(`Excluir "${m.nome(item)}"? Essa ação não pode ser desfeita.`)) {
    return;
  }
  try {
    await remover(m.colecao, item.id);
    if (item.anexoId) {
      apagarAnexo(item.anexoId).catch(console.error);
    }
    avisar("Excluído.");
  } catch (erro) {
    console.error(erro);
    avisar(mensagemDeErro(erro), "erro");
  }
}


// ===== Formulário (janela <dialog>) =====

/**
 * Cria um campo do formulário a partir da descrição do modelo.
 * Campos de texto grande ganham contador de caracteres. Na edição de um item com
 * anexo, o campo de arquivo mostra o anexo atual e a opção de removê-lo.
 * @param {Object} campo - Descrição do campo (ver comentário de MODELOS).
 * @param {Object|null} item - Item em edição (null = novo).
 * @returns {HTMLElement}
 */
function criarCampo(campo, item) {
  let max = campo.max;
  if (!max) {
    max = campo.tipo === "area" ? 600 : 200;
  }

  let entrada;
  if (campo.tipo === "select") {
    entrada = criarEl("select", { filhos: opcoes(campo.opcoes) });
  } else if (campo.tipo === "area") {
    entrada = criarEl("textarea", { attrs: { maxlength: max } });
  } else if (campo.tipo === "arquivo") {
    entrada = criarEl("input", { attrs: { type: "file", accept: "image/*,application/pdf" } });
  } else {
    let tipoInput = "text";
    if (campo.tipo === "data") {
      tipoInput = "date";
    } else if (campo.tipo === "url") {
      tipoInput = "url";
    }
    entrada = criarEl("input", { attrs: { type: tipoInput, maxlength: max } });
    if (campo.tipo === "disciplina") {
      entrada.setAttribute("list", "lista-disciplinas");
    }
  }
  entrada.id = "campo-" + campo.nome;
  entrada.name = campo.nome;
  if (campo.dica) {
    entrada.placeholder = campo.dica;
  }

  const filhos = [entrada];

  // contador "X de Y caracteres"; a função fica no elemento para ser chamada depois de preencher o valor
  if (campo.tipo === "area") {
    const contador = criarEl("span", { classe: "ajuda" });
    entrada.contar = function () {
      contador.textContent = `${entrada.value.length} de ${max} caracteres`;
    };
    entrada.addEventListener("input", entrada.contar);
    filhos.push(contador);
  }
  if (campo.ajuda) {
    filhos.push(criarEl("span", { classe: "ajuda", texto: campo.ajuda }));
  }

  const rotulo = criarEl("label", {
    classe: campo.largo ? "campos--largo" : "",
    texto: campo.rotulo + (campo.opcional ? " (opcional)" : ""),
    filhos: filhos,
    attrs: { for: entrada.id }
  });

  if (campo.tipo === "arquivo" && item && item.anexoId) {
    const chkTirar = criarEl("input", { attrs: { type: "checkbox", id: "campo-remover-anexo" } });
    return criarEl("div", {
      classe: "campos--largo",
      attrs: { style: "display:grid;gap:6px" },
      filhos: [
        rotulo,
        criarEl("p", { classe: "ajuda", texto: `Anexo atual: ${item.anexoNome || "arquivo"}. Escolha outro arquivo para substituir.` }),
        criarEl("label", {
          classe: "marcador",
          attrs: { for: chkTirar.id, style: "display:flex;gap:8px;font-weight:400" },
          filhos: [chkTirar, criarEl("span", { texto: "Remover o anexo atual" })]
        })
      ]
    });
  }
  return rotulo;
}

/**
 * Abre o formulário para criar, editar ou duplicar um item.
 * Duplicar preenche os campos com o item, mas salva como item novo e sem o anexo.
 * Em item novo, aplica o valor padrão do campo e a série do filtro.
 * @param {string} chave - Chave do modelo.
 * @param {Object|null} [item=null] - Item de origem (edição ou cópia).
 * @param {boolean} [copia=false] - true para duplicar.
 */
function abrirJanela(chave, item, copia) {
  if (item === undefined) {
    item = null;
  }
  const m = MODELOS[chave];
  janela = { chave: chave, item: copia ? null : item };

  let titulo = m.novo;
  if (copia) {
    titulo = `Duplicar ${m.item}`;
  } else if (item) {
    titulo = `Editar ${m.item}`;
  }
  $("#janela-titulo").textContent = titulo;

  const areaCampos = $("#campos");
  areaCampos.replaceChildren();
  for (const c of m.campos) {
    areaCampos.appendChild(criarCampo(c, janela.item));
  }

  // valores iniciais (campo de arquivo não aceita valor)
  for (const c of m.campos) {
    if (c.tipo === "arquivo") {
      continue;
    }
    const entrada = $("#campo-" + c.nome);
    if (item) {
      const valor = item[c.nome];
      entrada.value = (valor === undefined || valor === null) ? "" : valor;
    } else if (c.padrao) {
      entrada.value = c.padrao();
    } else if (c.nome === "serie" && filtros.serie) {
      entrada.value = filtros.serie;
    }
    if (entrada.contar) {
      entrada.contar();
    }
  }

  $("#janela-salvar").textContent = janela.item ? "Salvar alterações" : "Publicar";
  $("#janela").showModal();
}

/**
 * Lê e valida os campos do formulário: obrigatórios preenchidos, link com
 * http(s):// e cada linha de pergunta com resposta. No primeiro erro, avisa,
 * coloca o cursor no campo e retorna null.
 * @param {Object} m - Modelo da seção.
 * @returns {Object|null} Dados do formulário (sem o arquivo) ou null.
 */
function coletar(m) {
  const dados = {};
  for (const campo of m.campos) {
    if (campo.tipo === "arquivo") {
      continue;
    }
    const entrada = $("#campo-" + campo.nome);
    const valor = entrada.value.trim();

    /** Mostra o erro, foca o campo e retorna null. */
    function erro(texto) {
      avisar(texto, "erro");
      entrada.focus();
      return null;
    }

    if (!valor && !campo.opcional) {
      return erro(`Preencha o campo "${campo.rotulo}".`);
    }
    if (valor && campo.tipo === "url" && !/^https?:\/\//i.test(valor)) {
      return erro("O link precisa começar com http:// ou https://");
    }
    if (valor && campo.nome === "perguntas") {
      const linhas = valor.split("\n");
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].trim() && lerPerguntas(linhas[i]).length === 0) {
          return erro(`Na linha ${i + 1} das perguntas falta a resposta. Use: pergunta | resposta`);
        }
      }
    }
    dados[campo.nome] = valor;
  }
  return dados;
}

/**
 * Salva o formulário aberto (cria ou atualiza o item).
 * Ordem: grava o anexo novo, grava o item e só depois apaga o anexo antigo.
 * Se algo falhar no meio, o anexo novo é apagado para não ficar arquivo sem uso.
 * @returns {Promise<void>}
 */
async function salvarJanela() {
  const chave = janela.chave;
  const item = janela.item;
  const m = MODELOS[chave];

  const dados = coletar(m);
  if (!dados) {
    return;
  }

  const btnSalvar = $("#janela-salvar");
  const textoAntes = btnSalvar.textContent;
  btnSalvar.disabled = true;
  let anexoNovo = null;

  try {
    // anexo: novo arquivo substitui o atual; a caixa "Remover" limpa os campos do anexo
    const campoArquivo = m.campos.find(function (c) {
      return c.tipo === "arquivo";
    });
    if (campoArquivo) {
      const arquivo = $("#campo-" + campoArquivo.nome).files[0];
      const chkTirar = $("#campo-remover-anexo");
      if (arquivo) {
        btnSalvar.textContent = "Enviando o anexo…";
        const preparado = await prepararAnexo(arquivo);
        anexoNovo = await enviarAnexo(preparado);
        dados.anexoId = anexoNovo;
        dados.anexoNome = preparado.nome;
        dados.anexoTipo = preparado.tipo;
      } else if (chkTirar && chkTirar.checked) {
        dados.anexoId = "";
        dados.anexoNome = "";
        dados.anexoTipo = "";
      }
    }

    if (item) {
      await atualizar(m.colecao, item.id, dados);
    } else {
      await criar(m.colecao, m.aoCriar ? m.aoCriar(dados) : dados);
    }

    // anexo trocado ou removido: apaga o arquivo antigo
    if (item && item.anexoId && "anexoId" in dados) {
      apagarAnexo(item.anexoId).catch(console.error);
    }

    $("#janela").close();
    avisar(item ? "Alterações salvas." : "Publicado. Já aparece no portal.");
  } catch (erro) {
    console.error(erro);
    if (anexoNovo) {
      apagarAnexo(anexoNovo).catch(console.error);
    }
    avisar(mensagemDeErro(erro), "erro");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoAntes;
  }
}


// ===== Cardápio =====

/**
 * Monta a seção de cardápio: envio do arquivo da semana (foto ou PDF, que vira
 * imagem) e a tabela opcional do cardápio por dia.
 */
function montarCardapio() {
  const inputArquivo = criarEl("input", { attrs: { type: "file", id: "arquivo-cardapio", accept: "image/*,application/pdf" } });
  const btnEnviar = botao("Publicar arquivo", "botao", function () {
    enviarCardapio(btnEnviar);
  });

  const painelArquivo = criarEl("div", {
    classe: "painel",
    filhos: [
      criarEl("h2", { texto: "Cardápio da semana" }),
      criarEl("p", { classe: "muda", attrs: { style: "margin:4px 0 14px" }, texto: "Foto ou PDF do cardápio enviado pela nutricionista ou pela secretaria. Ao publicar um novo, o anterior é substituído." }),
      criarEl("div", { classe: "cardapio-imagem", attrs: { id: "cardapio-atual" } }),
      criarEl("div", {
        classe: "campos",
        filhos: [criarEl("label", {
          texto: "Novo arquivo",
          attrs: { for: "arquivo-cardapio" },
          filhos: [inputArquivo, criarEl("span", { classe: "ajuda", texto: "Imagem (JPG ou PNG) ou PDF. O PDF vira imagem para o cardápio aparecer direto no portal (até 3 páginas)." })]
        })]
      }),
      criarEl("div", { classe: "acoes", attrs: { style: "margin-top:12px" }, filhos: [btnEnviar] })
    ]
  });

  const painelDias = criarEl("div", {
    classe: "painel",
    filhos: [
      criarEl("div", {
        classe: "secao__cabeca", attrs: { style: "margin-bottom:12px" },
        filhos: [
          criarEl("div", { filhos: [criarEl("h2", { texto: "Cardápio por dia (opcional)" }), criarEl("p", { texto: "Preencha se quiser que a merenda do dia apareça no painel \"Hoje\" do aluno." })] }),
          botao(MODELOS.cardapio.novo, "botao botao--secundario", function () { abrirJanela("cardapio"); })
        ]
      }),
      criarEl("div", { attrs: { id: "lista" } })
    ]
  });

  $("#secao").replaceChildren(cabecalho(null), painelArquivo, painelDias);
  pintarCardapioAtual();
  pintarLista("cardapio");
}

/**
 * Mostra o cardápio publicado (nome, data, miniatura se for imagem) e o botão
 * "Tirar do portal". Não redesenha se o arquivo exibido for o mesmo.
 */
function pintarCardapioAtual() {
  const area = $("#cardapio-atual");
  if (!area) {
    return;
  }

  const atual = cardapioAtual(todos.cardapio);
  if (!atual) {
    delete area.dataset.anexo;
    estado(area, carregadas.has("cardapio") ? "Nenhum arquivo publicado." : "Carregando…");
    return;
  }

  if (area.dataset.anexo === atual.anexoId) {
    return;
  }
  area.dataset.anexo = atual.anexoId;

  const data = new Date(atual.atualizadoEm || Date.now()).toLocaleDateString("pt-BR");
  const info = criarEl("p", { texto: `${atual.anexoNome || "Arquivo"} · publicado em ${data}` });

  const btnTirar = botao("Tirar do portal", "botao botao--perigo botao--pequeno", async function () {
    if (!confirm("Tirar o cardápio da semana do portal?")) {
      return;
    }
    try {
      await remover("cardapio", atual.id);
      apagarAnexo(atual.anexoId).catch(console.error);
      avisar("Cardápio retirado do portal.");
    } catch (erro) {
      console.error(erro);
      avisar(mensagemDeErro(erro), "erro");
    }
  });

  area.replaceChildren(info, btnTirar);

  if ((atual.anexoTipo || "").startsWith("image/")) {
    carregarAnexo(atual.anexoId).then(function (anexo) {
      // só mostra se o cardápio não foi trocado enquanto a imagem carregava
      if (anexo && area.dataset.anexo === atual.anexoId) {
        area.insertBefore(criarEl("img", { classe: "miniatura", attrs: { src: anexo.dados, alt: "Cardápio publicado" } }), info);
      }
    }).catch(console.error);
  }
}

/**
 * Publica o arquivo do cardápio da semana. Existe sempre um único documento
 * tipo "imagem": se já houver um, ele é atualizado e o arquivo antigo é apagado.
 * @param {HTMLButtonElement} btnEnviar - Desabilitado enquanto envia.
 * @returns {Promise<void>}
 */
async function enviarCardapio(btnEnviar) {
  const arquivo = $("#arquivo-cardapio").files[0];
  if (!arquivo) {
    avisar("Escolha um arquivo primeiro.", "erro");
    return;
  }

  btnEnviar.disabled = true;
  let anexoNovo = null;
  try {
    btnEnviar.textContent = arquivo.type === "application/pdf" ? "Convertendo o PDF…" : "Enviando…";
    const preparado = await prepararAnexo(arquivo, { pdfComoImagem: true });
    anexoNovo = await enviarAnexo(preparado);

    const atual = cardapioAtual(todos.cardapio);
    const dados = { tipo: "imagem", anexoId: anexoNovo, anexoNome: preparado.nome, anexoTipo: preparado.tipo, atualizadoEm: Date.now() };
    if (atual) {
      await atualizar("cardapio", atual.id, dados);
      apagarAnexo(atual.anexoId).catch(console.error);
    } else {
      await criar("cardapio", dados);
    }

    $("#arquivo-cardapio").value = "";
    avisar("Cardápio publicado. Já aparece no portal.");
  } catch (erro) {
    console.error(erro);
    if (anexoNovo) {
      apagarAnexo(anexoNovo).catch(console.error);
    }
    avisar(mensagemDeErro(erro), "erro");
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Publicar arquivo";
  }
}


// ===== Conexão com o banco =====

/**
 * Atualiza a tela quando uma coleção muda no banco.
 * Com o horário em edição (alterações não salvas), o quadro não é recarregado.
 * @param {string} nome - Coleção que mudou.
 */
function aoReceber(nome) {
  pintarMenu();

  if (secao === "horario" && nome === "aulas") {
    if (grade && !grade.alterado) {
      grade = novaGrade(grade.serie);
      pintarGrade();
    } else {
      pintarStatus();
    }
  } else if (MODELOS[secao] && MODELOS[secao].colecao === nome) {
    pintarLista(secao);
  }

  if (secao === "cardapio" && nome === "cardapio") {
    pintarCardapioAtual();
  }
}

/** Passa a observar todas as coleções do portal (sem filtro de série). */
function ouvirTudo() {
  pararDeOuvir();
  for (const nome of COLECOES) {
    const parar = observar(nome, {}, function (lista) {
      todos[nome] = lista;
      carregadas.add(nome);
      aoReceber(nome);
    }, function () {
      avisar("Não foi possível carregar os dados. Verifique a conexão.", "erro");
    });
    desligar.push(parar);
  }
}

/** Encerra todas as observações do banco. */
function pararDeOuvir() {
  for (const parar of desligar) {
    parar();
  }
  desligar = [];
}


// ===== Login =====

/**
 * Faz o login com e-mail e senha. Em caso de erro, a mensagem é sempre a mesma
 * para não revelar quais e-mails estão cadastrados.
 * @param {HTMLButtonElement} btn - Botão "Entrar", desabilitado durante o login.
 * @returns {Promise<void>}
 */
async function entrar(btn) {
  const email = $("#email").value.trim();
  const senha = $("#senha").value;
  if (!email || !senha) {
    avisar("Informe e-mail e senha.", "erro");
    return;
  }

  btn.disabled = true;
  $("#alerta").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (erro) {
    $("#alerta").textContent = "E-mail ou senha incorretos.";
  } finally {
    btn.disabled = false;
  }
}

/**
 * Mostra a tela de login ou o painel (e o botão "Sair").
 * @param {"login"|"painel"} qual
 */
function mostrarTela(qual) {
  $("#tela-login").classList.toggle("oculto", qual !== "login");
  $("#tela-painel").classList.toggle("oculto", qual !== "painel");
  $("#sair").classList.toggle("oculto", qual !== "painel");
}

/**
 * Chamada quando o login muda. Sem usuário, mostra a tela de login.
 * Com usuário, confere o cadastro em "admins": sem cadastro (ou se a verificação
 * falhar), mostra o motivo e encerra a sessão; com cadastro, abre o painel.
 * @param {{uid: string, email: string}|null} usuario
 * @returns {Promise<void>}
 */
async function quandoLoginMudar(usuario) {
  if (!usuario) {
    pararDeOuvir();
    $("#usuario").textContent = "";
    mostrarTela("login");
    return;
  }

  try {
    if (!(await ehAdmin(usuario.uid))) {
      $("#alerta").textContent = "Esta conta não tem acesso à área da escola. Procure a coordenação.";
      await signOut(auth);
      return;
    }
  } catch (erro) {
    console.error(erro);
    $("#alerta").textContent = "Não foi possível verificar o acesso desta conta.";
    await signOut(auth);
    return;
  }

  $("#alerta").textContent = "";
  $("#usuario").textContent = usuario.email;
  mostrarTela("painel");
  pintarMenu();
  pintarSecao();
  ouvirTudo();
}


// ===== Início =====

/**
 * Inicia a área da escola: sigla da escola no logo, sugestões de disciplina, eventos de
 * login, sair e formulário, aviso ao fechar a aba com horário não salvo e o
 * acompanhamento do login.
 */
function iniciar() {
  $("#logo").textContent = ESCOLA.sigla;

  const datalist = $("#lista-disciplinas");
  for (const d of DISCIPLINAS) {
    datalist.appendChild(criarEl("option", { attrs: { value: d } }));
  }

  if (!configurado) {
    mostrarTela("login");
    $("#alerta").textContent = "Site ainda não configurado: preencha js/config.js.";
    return;
  }

  $("#entrar").addEventListener("click", function () {
    entrar($("#entrar"));
  });
  $("#senha").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      entrar($("#entrar"));
    }
  });

  $("#sair").addEventListener("click", function () {
    if (grade && grade.alterado && !confirm(MSG_NAO_SALVO)) {
      return;
    }
    pararDeOuvir();
    signOut(auth);
  });

  $("#form-janela").addEventListener("submit", function (e) {
    e.preventDefault();
    salvarJanela();
  });
  $("#janela-cancelar").addEventListener("click", function () {
    $("#janela").close();
  });

  // pede confirmação do navegador ao fechar a aba com o horário não salvo
  window.addEventListener("beforeunload", function (e) {
    if (grade && grade.alterado) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  onAuthStateChanged(auth, quandoLoginMudar);
}

iniciar();
