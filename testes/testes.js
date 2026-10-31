/* Testes automáticos do Portal do Aluno.
   Cada teste de tela abre a página real (index.html ou admin.html) num iframe,
   trocando apenas o Firebase por módulos falsos (pasta falsos/). */
import { SERIES, DIAS } from "../js/config.js";
import { paraBR, quandoE, hojeISO, diaDaSemana, ordemHorario, criarEl } from "../js/ui.js";
import * as estudo from "../js/estudo.js";
import { prepararAnexo, carregarImagem } from "../js/anexos.js";

/* ================= Mini executor de testes ================= */
const testes = [];
const teste = (grupo, nome, fn) => testes.push({ grupo, nome, fn });

class Falha extends Error {}
function ok(condicao, mensagem) { if (!condicao) throw new Falha(mensagem); }
function igual(obtido, esperado, mensagem) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a !== b) throw new Falha(`${mensagem}\n  esperado: ${b}\n  obtido:   ${a}`);
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
async function esperar(condicao, descricao, limite = 4000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limite) {
    try { const v = condicao(); if (v) return v; } catch (e) { /* ainda não está pronto */ }
    await pausa(25);
  }
  throw new Falha("Tempo esgotado esperando: " + descricao);
}

/* ================= Datas e dados de exemplo ================= */
function somarDias(n) {
  const d = new Date(hojeISO() + "T12:00:00");
  d.setDate(d.getDate() + n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
const AGORA = Date.now();
const HORA = 3600000;
const DISC6 = ["Matemática", "Língua Portuguesa", "Ciências", "História", "Geografia"];
const IMAGEM = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#eee"/></svg>');

function bancoBase() {
  const aulas = [];
  ["6º ano", "7º ano"].forEach(serie => DIAS.forEach((dia, d) => ["07:30 - 08:20", "08:20 - 09:10", "10:20 - 11:10"].forEach((horario, h) => {
    aulas.push({ id: `aula-${serie[0]}-${d}-${h}`, serie, dia, horario, disciplina: serie === "6º ano" ? DISC6[(d + h) % DISC6.length] : "História 7", atividade: "" });
  })));
  aulas.push({ id: "aula-sem-zero", serie: "6º ano", dia: "Segunda", horario: "9:10 - 10:00", disciplina: "Arte", atividade: "" });

  const avisos = Array.from({ length: 10 }, (_, i) => ({ id: "aviso-" + (i + 1), serie: "6º ano", titulo: "Aviso " + (i + 1), texto: "Texto do aviso " + (i + 1), criadoEm: AGORA - i * HORA }));
  avisos.push({ id: "aviso-xss", serie: "Todas", titulo: '<img src=x onerror="window.__xss=1">', texto: "<b>não é negrito</b>", criadoEm: AGORA - 30 * 24 * HORA });
  avisos.push({ id: "aviso-7", serie: "7º ano", titulo: "Aviso do 7º", texto: "Só para o 7º", criadoEm: AGORA });

  const resumos = Array.from({ length: 15 }, (_, i) => ({
    id: "res-" + i, serie: "6º ano", disciplina: i % 3 === 0 ? "Ciências" : "Matemática", data: somarDias(-i * 6),
    titulo: "Assunto " + (i + 1), resumo: "Conteúdo da aula " + (i + 1) + (i === 4 ? " sobre frações" : "")
  }));
  resumos[0].perguntas = "Quanto é 2 + 2? | 4\nCapital do Brasil? | Brasília";
  resumos[1].link = "javascript:alert(1)";
  Object.assign(resumos[2], { anexoId: "anx-res", anexoNome: "esquema.jpg", anexoTipo: "image/jpeg" });
  resumos.push({ id: "res-7", serie: "7º ano", disciplina: "História", data: hojeISO(), titulo: "Assunto do 7º", resumo: "..." });

  return {
    aulas,
    agenda: [
      { id: "ag-prova", serie: "6º ano", data: somarDias(3), tipo: "Prova", disciplina: "Matemática", descricao: "Frações" },
      { id: "ag-passou", serie: "6º ano", data: somarDias(-2), tipo: "Entrega", disciplina: "Geografia", descricao: "Trabalho de relevo" },
      { id: "ag-todas", serie: "Todas", data: somarDias(10), tipo: "Evento", disciplina: "", descricao: "Feira de Ciências" },
      { id: "ag-7", serie: "7º ano", data: somarDias(4), tipo: "Prova", disciplina: "História", descricao: "Idade Média" }
    ],
    avisos,
    resumos,
    cardapio: [
      ...DIAS.map((dia, i) => ({ id: "card-" + i, dia, prato: "Prato de " + dia, acompanhamento: "Salada", sobremesa: "Fruta" })),
      { id: "card-img", tipo: "imagem", anexoId: "anx-card", anexoNome: "cardapio.jpg", anexoTipo: "image/jpeg", atualizadoEm: AGORA }
    ],
    anexos: [
      { id: "anx-card", nome: "cardapio.jpg", tipo: "image/jpeg", dados: IMAGEM },
      { id: "anx-res", nome: "esquema.jpg", tipo: "image/jpeg", dados: IMAGEM }
    ]
  };
}

/* ================= Abrir uma página com o banco falso ================= */
const palco = document.getElementById("palco");
const raiz = new URL("../", location.href).href;

async function abrirPagina(arquivo, { banco = bancoBase(), auth = "admin", falharEscrita = false, largura = 1100, pasta = "" } = {}) {
  palco.replaceChildren();
  const html = await (await fetch(raiz + pasta + arquivo, { cache: "no-store" })).text();
  const mapa = {
    imports: {
      [raiz + "js/firebase.js"]: raiz + "testes/falsos/firebase.js",
      [raiz + "js/dados.js"]: raiz + "testes/falsos/dados.js",
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js": raiz + "testes/falsos/auth.js"
    }
  };
  const preparo = `<meta charset="UTF-8"><base href="${raiz + pasta}">`
    + `<script>window.__teste = ${JSON.stringify({ banco, auth, falharEscrita })}; window.confirm = () => true; window.open = () => null;</script>`
    + `<script type="importmap">${JSON.stringify(mapa)}</script>`;
  const quadro = document.createElement("iframe");
  quadro.style.width = largura + "px";
  quadro.srcdoc = html.replace('<meta charset="UTF-8">', preparo);
  const carregou = new Promise(r => { quadro.onload = r; });
  palco.appendChild(quadro);
  await carregou;
  const w = quadro.contentWindow;
  w.$ = s => w.document.querySelector(s);
  w.$$ = s => [...w.document.querySelectorAll(s)];
  w.disparar = (el, tipo) => el.dispatchEvent(new w.Event(tipo, { bubbles: true }));
  w.texto = s => (w.$(s) ? w.$(s).innerText.trim() : "");
  w.toast = () => (w.$(".toast") ? w.$(".toast").textContent : "");
  w.limparToast = () => { if (w.$(".toast")) w.$(".toast").textContent = ""; };
  w.clicarBotao = (rotulo, dentro = "body") => {
    const b = w.$$(dentro + " button").find(x => x.textContent.trim().startsWith(rotulo));
    if (!b) throw new Falha(`Botão "${rotulo}" não encontrado`);
    b.click();
    return b;
  };
  return w;
}

/* Prepara o navegador como se fosse um aluno chegando ao portal */
function prepararAluno({ serie = "6º ano", ultimaVisita = AGORA - 2.5 * HORA } = {}) {
  Object.keys(localStorage).filter(k => k.startsWith("portal:")).forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem("portal:visitaAnterior");
  if (serie) localStorage.setItem("portal:serie", serie);
  localStorage.setItem("portal:ultimaVisita", String(ultimaVisita));
}

async function imagemPNG(w, largura, altura, nome = "foto.png") {
  const tela = document.createElement("canvas");
  tela.width = largura; tela.height = altura;
  const p = tela.getContext("2d");
  p.fillStyle = "#3a7"; p.fillRect(0, 0, largura, altura);
  p.fillStyle = "#fff"; p.font = "80px sans-serif"; p.fillText("teste", 50, 150);
  /* toDataURL em vez de toBlob: toBlob fica lento quando a aba está em segundo plano */
  const blob = await (await fetch(tela.toDataURL("image/png"))).blob();
  return new w.File([blob], nome, { type: "image/png" });
}

function escolherArquivo(w, entrada, arquivo) {
  const dt = new w.DataTransfer();
  dt.items.add(arquivo);
  entrada.files = dt.files;
}

const PDF_2_PAGINAS = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R 6 0 R]/Count 2>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 70>>stream
BT /F1 28 Tf 60 760 Td (Cardapio da semana) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
6 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 7 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
7 0 obj<</Length 60>>stream
BT /F1 24 Tf 60 760 Td (Pagina 2) Tj ET
endstream endobj
trailer<</Root 1 0 R>>
%%EOF`;

/* ================= Funções de apoio ================= */
teste("Funções de apoio", "Datas no formato brasileiro e contagem de dias", () => {
  igual(paraBR("2026-11-05"), "05/11/2026", "paraBR");
  igual(quandoE(hojeISO()), "hoje", "hoje");
  igual(quandoE(somarDias(1)), "amanhã", "amanhã");
  igual(quandoE(somarDias(3)), "em 3 dias", "3 dias");
  igual(quandoE(somarDias(7)), "em 1 semana", "1 semana");
  igual(quandoE(somarDias(15)), "em 3 semanas", "15 dias");
  igual(quandoE(somarDias(-1)), "já passou", "passado");
});

teste("Funções de apoio", "Horários são ordenados pelo início, com ou sem zero à esquerda", () => {
  igual(["10:20 - 11:10", "9:10 - 10:00", "07:30 - 08:20", "13h00 - 13h50"].sort(ordemHorario),
    ["07:30 - 08:20", "9:10 - 10:00", "10:20 - 11:10", "13h00 - 13h50"], "ordem");
});

teste("Funções de apoio", "Perguntas do teste: formato pergunta | resposta", () => {
  igual(estudo.lerPerguntas("A? | 1\n\nsem resposta\n B ? |  x | y "), [{ pergunta: "A?", resposta: "1" }, { pergunta: "B ?", resposta: "x | y" }], "perguntas");
  igual(estudo.lerPerguntas(undefined), [], "vazio");
});

teste("Funções de apoio", "Revisão espaçada: amanhã, 7 dias, 30 dias e concluída", () => {
  const chave = "portal:estudos";
  const antes = localStorage.getItem(chave);
  localStorage.removeItem(chave);
  try {
    estudo.marcarEstudado({ id: "x", disciplina: "Mat", titulo: "T" });
    igual(estudo.situacao("x").proxima, somarDias(1), "1ª revisão amanhã");
    igual(estudo.paraRevisar().length, 0, "nada para hoje");
    igual(estudo.marcarRevisado("x").proxima, somarDias(7), "2ª revisão em 7 dias");
    igual(estudo.marcarRevisado("x").proxima, somarDias(30), "3ª revisão em 30 dias");
    igual(estudo.marcarRevisado("x").proxima, null, "concluída");
  } finally {
    if (antes === null) localStorage.removeItem(chave); else localStorage.setItem(chave, antes);
  }
});

teste("Funções de apoio", "Texto nunca vira HTML (proteção contra código malicioso)", () => {
  const el = criarEl("p", { texto: '<img src=x onerror="window.__xss=1">' });
  ok(!el.querySelector("img"), "criou uma tag img a partir do texto");
  igual(el.textContent, '<img src=x onerror="window.__xss=1">', "texto preservado");
});

/* ================= Anexos ================= */
teste("Anexos", "Foto grande é reduzida para até 1600 px e 700 KB", async () => {
  const arquivo = await imagemPNG(window, 3000, 2000);
  const anexo = await prepararAnexo(arquivo);
  igual(anexo.tipo, "image/jpeg", "tipo");
  ok(anexo.dados.length * 0.75 <= 700 * 1024, "maior que 700 KB");
  const img = await carregarImagem(anexo.dados);
  igual([img.width, img.height], [1600, 1067], "dimensões");
});

teste("Anexos", "PDF acima de 700 KB é recusado com explicação", async () => {
  const grande = new File([new Uint8Array(900 * 1024)], "grande.pdf", { type: "application/pdf" });
  try { await prepararAnexo(grande); throw new Falha("aceitou o PDF grande"); }
  catch (e) { ok(!(e instanceof Falha) && /700 KB/.test(e.message), "mensagem: " + e.message); }
});

teste("Anexos", "PDF pequeno é aceito como PDF nos resumos", async () => {
  const anexo = await prepararAnexo(new File([PDF_2_PAGINAS], "lista.pdf", { type: "application/pdf" }));
  igual(anexo.tipo, "application/pdf", "tipo");
});

teste("Anexos", "Outros tipos de arquivo são recusados", async () => {
  try { await prepararAnexo(new File(["oi"], "nota.txt", { type: "text/plain" })); throw new Falha("aceitou .txt"); }
  catch (e) { ok(!(e instanceof Falha), "aceitou .txt"); }
});

teste("Anexos", "PDF do cardápio vira imagem (precisa de internet)", async () => {
  const anexo = await prepararAnexo(new File([PDF_2_PAGINAS], "cardapio.pdf", { type: "application/pdf" }), { pdfComoImagem: true });
  igual(anexo.tipo, "image/jpeg", "tipo");
  igual(anexo.nome, "cardapio.jpg", "nome");
  const img = await carregarImagem(anexo.dados);
  ok(img.height > img.width * 2, "as duas páginas deveriam ficar uma embaixo da outra");
});

/* ================= Portal do aluno ================= */
teste("Portal do aluno", "Sem série escolhida, pede para escolher", async () => {
  prepararAluno({ serie: "" });
  const w = await abrirPagina("index.html");
  await esperar(() => w.texto("#horario-area").includes("Escolha"), "mensagem do horário");
  ok(w.texto("#lista-avisos").includes("Escolha"), "avisos sem a mensagem");
  ok(w.texto("#lista-resumos").includes("Escolha"), "resumos sem a mensagem");
});

teste("Portal do aluno", "Horário em tabela, ordenado pelo início da aula", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#horario-area table"), "tabela de horário");
  igual(w.$$("#horario-area tbody th").map(th => th.textContent), ["07:30 - 08:20", "08:20 - 09:10", "9:10 - 10:00", "10:20 - 11:10"], "linhas");
  igual(w.$$("#horario-area thead th").map(th => th.textContent), ["Horário", ...DIAS], "colunas");
  const hoje = diaDaSemana();
  if (DIAS.includes(hoje)) igual(w.$("#horario-area thead th.col-hoje").textContent, hoje, "coluna de hoje destacada");
});

teste("Portal do aluno", "Painel Hoje: aulas, merenda e próximas provas", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#hoje-proximos li").length === 2, "duas próximas datas");
  const hoje = diaDaSemana();
  if (DIAS.includes(hoje)) {
    igual(w.$$("#hoje-aulas li").length, hoje === "Segunda" ? 4 : 3, "aulas de hoje");
    ok(w.texto("#hoje-merenda").includes("Prato de " + hoje), "merenda de hoje");
  } else {
    ok(w.texto("#hoje-aulas").includes("não tem aula"), "fim de semana sem aula");
  }
  ok(w.texto("#hoje-proximos").startsWith("Prova de Matemática"), "prova mais próxima primeiro");
});

teste("Portal do aluno", "Provas: só as próximas; passadas sob demanda; outra série não aparece", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#provas-area tbody"), "tabela de provas");
  igual(w.$$("#provas-area tbody tr").length, 2, "próximas (prova do 6º + evento para todas)");
  ok(!w.texto("#provas-area").includes("Idade Média"), "mostrou prova do 7º ano");
  w.clicarBotao("Mostrar as datas", "#provas-area");
  igual(w.$$("#provas-area tbody tr").length, 3, "com as passadas");
  ok(w.$("#provas-area tr.passou"), "passada sem destaque de 'passou'");
});

teste("Portal do aluno", "Avisos: mais recentes primeiro, etiqueta Novo e limite de 8", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#lista-avisos li").length === 8, "8 avisos");
  igual(w.$("#lista-avisos li strong").textContent, "Aviso 1", "mais recente primeiro");
  igual(w.$$("#lista-avisos .etiqueta--novo").length, 3, "avisos novos desde a última visita");
  ok(!w.texto("#lista-avisos").includes("Aviso do 7º"), "mostrou aviso de outra série");
  w.$("#mais-avisos").click();
  igual(w.$$("#lista-avisos li").length, 11, "todos os avisos da série + Todas");
  ok(w.$("#mais-avisos").classList.contains("oculto"), "botão continuou visível");
});

teste("Portal do aluno", "Etiqueta Novo continua ao recarregar a página", async () => {
  prepararAluno();
  await abrirPagina("index.html");
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#lista-avisos li").length, "avisos");
  igual(w.$$("#lista-avisos .etiqueta--novo").length, 3, "etiquetas após recarregar");
});

teste("Portal do aluno", "Texto com código vindo do banco aparece como texto, sem executar", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#lista-avisos li").length, "avisos");
  w.$("#mais-avisos").click();
  ok(!w.$("#lista-avisos img"), "virou imagem");
  ok(!w.$("#lista-avisos b"), "virou negrito");
  ok(w.__xss === undefined, "o código foi executado");
  ok(w.texto("#lista-avisos").includes("<img src=x"), "texto não apareceu");
});

teste("Portal do aluno", "Resumos: por mês, do mais recente, com Mostrar mais", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#lista-resumos .resumo").length === 12, "12 resumos");
  igual(w.$(".resumo__data").textContent, paraBR(hojeISO()).slice(0, 5), "primeiro é o mais recente");
  ok(w.$$("#lista-resumos .mes").length >= 2, "separado por mês");
  ok(!w.texto("#lista-resumos").includes("Assunto do 7º"), "mostrou resumo do 7º");
  ok(w.$("#mais-resumos").textContent.includes("(3)"), "botão Mostrar mais com 3 restantes");
  w.$("#mais-resumos").click();
  igual(w.$$("#lista-resumos .resumo").length, 15, "todos após Mostrar mais");
});

teste("Portal do aluno", "Resumos: filtro por disciplina e busca", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$$("#lista-resumos .resumo").length, "resumos");
  const sel = w.$("#filtro-disciplina");
  igual([...sel.options].map(o => o.value), ["", "Ciências", "Matemática"], "opções de disciplina");
  sel.value = "Ciências"; w.disparar(sel, "change");
  ok(w.$$(".resumo__disc").every(d => d.textContent === "Ciências"), "apareceu outra disciplina");
  igual(w.$$("#lista-resumos .resumo").length, 5, "resumos de Ciências");
  sel.value = ""; w.disparar(sel, "change");
  const busca = w.$("#busca-resumo");
  busca.value = "frações"; w.disparar(busca, "input");
  igual(w.$$("#lista-resumos .resumo").length, 1, "busca por palavra do conteúdo");
  busca.value = "xyzxyz"; w.disparar(busca, "input");
  ok(w.texto("#lista-resumos").includes("Nenhum resumo encontrado"), "mensagem de busca vazia");
});

teste("Portal do aluno", "Resumos: anexo, link seguro e link perigoso bloqueado", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#resumo-res-2"), "resumo com anexo");
  ok(w.$("#resumo-res-2 summary").textContent.includes("Anexo"), "sem etiqueta de anexo");
  ok(w.$$("#resumo-res-2 button").some(b => b.textContent === "Ver imagem anexada"), "sem botão do anexo");
  ok(!w.$$("#resumo-res-1 a").some(a => a.getAttribute("href").startsWith("javascript")), "link javascript: foi exibido");
});

teste("Portal do aluno", "Teste de perguntas e revisão espaçada", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#resumo-res-0"), "resumo com perguntas");
  w.$("#resumo-res-0 summary").click();
  w.clicarBotao("Fazer o teste", "#resumo-res-0");
  igual(w.texto("#resumo-res-0 .teste__contagem"), "Pergunta 1 de 2", "primeira pergunta");
  w.clicarBotao("Ver a resposta", "#resumo-res-0");
  igual(w.texto("#resumo-res-0 .teste__resposta"), "4", "resposta");
  w.clicarBotao("Acertei", "#resumo-res-0");
  w.clicarBotao("Ver a resposta", "#resumo-res-0");
  w.clicarBotao("Errei", "#resumo-res-0");
  ok(w.texto("#resumo-res-0 .teste").startsWith("Você acertou 1 de 2."), "resultado do teste");
  ok(w.texto("#resumo-res-0").includes("Próxima revisão: amanhã"), "terminar o teste marca como estudado");

  /* Simula que a revisão venceu hoje */
  const registros = JSON.parse(localStorage.getItem("portal:estudos"));
  registros["res-0"].proxima = hojeISO();
  localStorage.setItem("portal:estudos", JSON.stringify(registros));
  const sel = w.$("#filtro-disciplina"); w.disparar(sel, "change");
  ok(w.texto("#revisar").includes("1 resumo para revisar hoje"), "lembrete de revisão");
  w.clicarBotao("Registrar revisão (1 de 3)", "#resumo-res-0");
  ok(w.texto("#resumo-res-0").includes("Próxima revisão: em 1 semana"), "segunda revisão em uma semana");
  igual(w.texto("#revisar"), "", "lembrete continuou aparecendo");
});

teste("Portal do aluno", "Cardápio: imagem aparece direto na página", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#cardapio-imagem img"), "imagem do cardápio");
  igual(w.$$("#grade-cardapio .dia").length, DIAS.length, "cardápio por dia");
  ok(w.texto("#cardapio-imagem").includes("Ver em tamanho maior"), "link para ampliar");
});

teste("Portal do aluno", "Minha agenda: anotar e apagar", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  w.$("#ag-data").value = somarDias(2);
  w.$("#ag-texto").value = "Estudar frações";
  w.$("#ag-add").click();
  ok(w.texto("#lista-minha").includes("Estudar frações"), "anotação não apareceu");
  ok(w.texto("#lista-minha").includes("em 2 dias"), "contagem de dias");
  w.clicarBotao("Apagar", "#lista-minha");
  ok(w.texto("#lista-minha").includes("Nada anotado"), "anotação não foi apagada");
});

teste("Portal do aluno", "Trocar de série atualiza todas as seções", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html");
  await esperar(() => w.$("#horario-area table"), "horário do 6º");
  const sel = w.$("#serie");
  sel.value = "7º ano"; w.disparar(sel, "change");
  await esperar(() => w.texto("#horario-area").includes("História 7"), "horário do 7º");
  await esperar(() => w.texto("#lista-avisos").includes("Aviso do 7º"), "avisos do 7º");
  ok(w.texto("#provas-area").includes("Idade Média"), "provas do 7º");
  ok(!w.texto("#lista-resumos").includes("Assunto 1 "), "ainda mostra resumos do 6º");
  igual(localStorage.getItem("portal:serie"), "7º ano", "série lembrada");
});

teste("Portal do aluno", "Celular (375 px): a página não rola para o lado", async () => {
  prepararAluno();
  const w = await abrirPagina("index.html", { largura: 375 });
  await esperar(() => w.$("#horario-area table"), "horário");
  ok(w.document.documentElement.scrollWidth <= 375, "largura da página: " + w.document.documentElement.scrollWidth + " px");
});

/* ================= Área da escola ================= */
teste("Área da escola", "Sem login: tela de entrar; senha errada avisa; senha certa entra", async () => {
  const w = await abrirPagina("admin.html", { auth: "nenhum" });
  await esperar(() => !w.$("#tela-login").classList.contains("oculto"), "tela de login");
  ok(w.$("#tela-painel").classList.contains("oculto"), "painel visível sem login");
  w.$("#email").value = "professor@escola.test";
  w.$("#senha").value = "errada";
  w.$("#entrar").click();
  await esperar(() => w.texto("#alerta").includes("incorretos"), "aviso de senha errada");
  w.$("#senha").value = "senha-de-teste";
  w.$("#entrar").click();
  await esperar(() => !w.$("#tela-painel").classList.contains("oculto"), "painel após login");
});

teste("Área da escola", "Conta sem permissão é barrada", async () => {
  const w = await abrirPagina("admin.html", { auth: "semPermissao" });
  await esperar(() => w.texto("#alerta").includes("não tem acesso"), "mensagem de sem acesso");
  ok(w.$("#tela-painel").classList.contains("oculto"), "painel visível sem permissão");
});

teste("Área da escola", "Menu com as cinco seções e contagens", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.texto("#menu").includes("2/9"), "contagem de séries com horário");
  igual(w.$$("#menu button > span:first-child").map(s => s.textContent), ["Horário das aulas", "Provas e datas", "Mural de avisos", "Resumos das aulas", "Cardápio"], "seções");
});

async function abrirHorario6(w) {
  await esperar(() => w.$("#grade-serie") && w.texto("#grade-status") === "Horário salvo", "quadro de horário");
  const sel = w.$("#grade-serie");
  sel.value = "6º ano"; w.disparar(sel, "change");
  return {
    celula: (linha, coluna) => w.$(`#grade-area input[data-linha="${linha}"][data-coluna="${coluna}"]`),
    linhaDe: horario => w.$$('#grade-area input[data-coluna="0"]').findIndex(i => i.value === horario)
  };
}

teste("Área da escola", "Horário: editar, colar da planilha e salvar tudo de uma vez", async () => {
  const w = await abrirPagina("admin.html");
  const { celula, linhaDe } = await abrirHorario6(w);
  const l0730 = linhaDe("07:30 - 08:20");
  igual(celula(l0730, 1).value, "Matemática", "célula carregada");
  celula(l0730, 1).value = "Arte"; w.disparar(celula(l0730, 1), "input");
  igual(w.texto("#grade-status"), "Há alterações não salvas", "status pendente");

  const ultima = linhaDe("11:10 - 12:00");
  const dt = new w.DataTransfer();
  dt.setData("text", "Horário\tSegunda\tTerça\tQuarta\tQuinta\tSexta\n11:10 - 12:00\tInglês\t\t\t\tArte\n12:00 - 12:50\tMúsica\n");
  celula(ultima, 0).dispatchEvent(new w.ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  igual(celula(ultima + 1, 0).value, "12:00 - 12:50", "linha nova criada pela colagem");

  w.$("#grade-salvar").click();
  await esperar(() => w.texto("#grade-status") === "Horário salvo", "salvar");
  const lote = w.__operacoes.at(-1);
  igual(lote.tipo, "lote", "salvo em lote");
  igual(lote.operacoes.map(o => o.tipo + ":" + (o.dados ? o.dados.disciplina : "")).sort(),
    ["atualizar:Arte", "criar:Arte", "criar:Inglês", "criar:Música"], "operações do lote");
  ok(lote.operacoes.filter(o => o.tipo === "criar").every(o => o.dados.serie === "6º ano"), "série errada nas aulas novas");
});

teste("Área da escola", "Horário: horário repetido ou vazio é recusado", async () => {
  const w = await abrirPagina("admin.html");
  const { celula, linhaDe } = await abrirHorario6(w);
  const l = linhaDe("08:20 - 09:10");
  celula(l, 0).value = "07:30 - 08:20"; w.disparar(celula(l, 0), "input");
  w.$("#grade-salvar").click();
  await esperar(() => w.toast().includes("aparece em duas linhas"), "erro de horário repetido");
  celula(l, 0).value = ""; w.disparar(celula(l, 0), "input");
  w.$("#grade-salvar").click();
  await esperar(() => w.toast().includes("Preencha o horário"), "erro de horário vazio");
  igual(w.__operacoes.length, 0, "gravou mesmo com erro");
});

teste("Área da escola", "Horário: remover uma linha apaga as aulas dela", async () => {
  const w = await abrirPagina("admin.html");
  const { linhaDe } = await abrirHorario6(w);
  const l = linhaDe("10:20 - 11:10");
  w.$$("#grade-area .remover")[l].click();
  w.$("#grade-salvar").click();
  await esperar(() => w.__operacoes.length, "salvar");
  igual(w.__operacoes[0].operacoes.filter(o => o.tipo === "remover").length, DIAS.length, "aulas removidas");
});

teste("Área da escola", "Horário: avisa antes de sair com alterações não salvas", async () => {
  const w = await abrirPagina("admin.html");
  const { celula } = await abrirHorario6(w);
  celula(0, 2).value = "Teatro"; w.disparar(celula(0, 2), "input");
  w.confirm = () => false;
  w.clicarBotao("Provas e datas", "#menu");
  igual(w.texto("#secao h1"), "Horário das aulas", "saiu sem perguntar");
  w.confirm = () => true;
  w.clicarBotao("Provas e datas", "#menu");
  igual(w.texto("#secao h1"), "Provas e datas", "não trocou de seção");
});

teste("Área da escola", "Provas: obrigatórios, publicar, editar, duplicar e excluir", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Provas e datas", "#menu");
  await esperar(() => w.$$("#lista tbody tr").length === 3, "lista sem as passadas (3 próximas, de todas as séries)");
  w.clicarBotao("Nova prova ou data", "#secao");
  ok(w.$("#janela").open, "janela não abriu");
  w.$("#janela-salvar").click();
  await esperar(() => w.toast().includes("Preencha"), "aviso de campo obrigatório");
  ok(w.$("#janela").open, "janela fechou com erro");

  w.$("#campo-serie").value = "6º ano";
  w.$("#campo-data").value = somarDias(5);
  w.$("#campo-tipo").value = "Prova";
  w.$("#campo-disciplina").value = "Ciências";
  w.$("#campo-descricao").value = "Ciclo da água";
  w.$("#janela-salvar").click();
  await esperar(() => !w.$("#janela").open, "janela fechar");
  const criada = w.__operacoes.at(-1);
  igual([criada.tipo, criada.dados.disciplina, criada.dados.serie], ["criar", "Ciências", "6º ano"], "prova criada");
  await esperar(() => w.$$("#lista tbody tr").length === 4, "nova prova na lista");

  const linha = () => w.$$("#lista tbody tr").find(tr => tr.textContent.includes("Ciclo da água"));
  [...linha().querySelectorAll("button")].find(b => b.textContent === "Editar").click();
  igual(w.$("#campo-descricao").value, "Ciclo da água", "formulário de edição preenchido");
  w.$("#campo-descricao").value = "Ciclo da água e estados físicos";
  w.$("#janela-salvar").click();
  await esperar(() => w.__operacoes.at(-1).tipo === "atualizar", "edição");

  [...linha().querySelectorAll("button")].find(b => b.textContent === "Duplicar").click();
  w.$("#janela-salvar").click();
  await esperar(() => w.$$("#lista tbody tr").length === 5, "cópia na lista");

  [...linha().querySelectorAll("button")].find(b => b.textContent === "Excluir").click();
  await esperar(() => w.__operacoes.at(-1).tipo === "remover", "exclusão");

  w.$("#ver-passadas").click();
  ok(w.texto("#lista").includes("Trabalho de relevo"), "datas passadas não apareceram");
});

teste("Área da escola", "Avisos: data de publicação registrada", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Mural de avisos", "#menu");
  w.clicarBotao("Novo aviso", "#secao");
  w.$("#campo-titulo").value = "Reunião de pais";
  w.$("#campo-texto").value = "Sexta às 18h.";
  w.$("#janela-salvar").click();
  await esperar(() => w.__operacoes.length, "publicação");
  ok(typeof w.__operacoes[0].dados.criadoEm === "number", "sem data de publicação");
});

teste("Área da escola", "Resumos: perguntas sem resposta são recusadas", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Resumos das aulas", "#menu");
  w.clicarBotao("Novo resumo", "#secao");
  igual(w.$("#campo-data").value, hojeISO(), "data da aula começa em hoje");
  w.$("#campo-disciplina").value = "Matemática";
  w.$("#campo-titulo").value = "Frações";
  w.$("#campo-resumo").value = "Resumo";
  w.$("#campo-perguntas").value = "Quanto é 1/2 + 1/2? | 1\nPergunta sem resposta";
  w.$("#janela-salvar").click();
  await esperar(() => w.toast().includes("linha 2"), "erro na linha 2");
  igual(w.__operacoes.length, 0, "gravou com erro");
});

teste("Área da escola", "Resumos: anexo é salvo, trocado, removido e apagado junto", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Resumos das aulas", "#menu");
  w.clicarBotao("Novo resumo", "#secao");
  w.$("#campo-serie").value = "6º ano";
  w.$("#campo-disciplina").value = "Ciências";
  w.$("#campo-titulo").value = "Células";
  w.$("#campo-resumo").value = "A célula é a unidade básica da vida.";
  escolherArquivo(w, w.$("#campo-anexo"), await imagemPNG(w, 2400, 1800));
  w.$("#janela-salvar").click();
  await esperar(() => !w.$("#janela").open, "publicação com anexo", 8000);
  const resumo = () => w.__banco.resumos.find(r => r.titulo === "Células");
  const primeiro = resumo().anexoId;
  ok(primeiro && w.__banco.anexos.some(a => a.id === primeiro && a.tipo === "image/jpeg"), "anexo não foi salvo");

  const linha = () => w.$$("#lista tbody tr").find(tr => tr.textContent.includes("Células"));
  ok(linha().textContent.includes("anexo"), "coluna Extras sem 'anexo'");
  [...linha().querySelectorAll("button")].find(b => b.textContent === "Editar").click();
  ok(w.texto("#campos").includes("Anexo atual"), "edição não mostra o anexo atual");
  w.$("#campo-remover-anexo").checked = true;
  w.$("#janela-salvar").click();
  await esperar(() => resumo().anexoId === "", "remoção do anexo");
  await esperar(() => !w.__banco.anexos.some(a => a.id === primeiro), "arquivo apagado do banco");

  [...linha().querySelectorAll("button")].find(b => b.textContent === "Excluir").click();
  await esperar(() => !resumo(), "exclusão do resumo");
  const comAnexo = w.$$("#lista tbody tr").find(tr => tr.textContent.includes("Assunto 3"));
  [...comAnexo.querySelectorAll("button")].find(b => b.textContent === "Excluir").click();
  await esperar(() => !w.__banco.anexos.some(a => a.id === "anx-res"), "anexo apagado junto com o resumo");
});

teste("Área da escola", "Cardápio: nova imagem substitui a anterior e pode ser retirada", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Cardápio", "#menu");
  await esperar(() => w.$("#cardapio-atual img"), "imagem atual");
  escolherArquivo(w, w.$("#arquivo-cardapio"), await imagemPNG(w, 1200, 900, "cardapio-nov.png"));
  w.clicarBotao("Publicar arquivo", "#secao");
  await esperar(() => w.__banco.cardapio.find(c => c.tipo === "imagem").anexoNome === "cardapio-nov.png", "troca do cardápio", 8000);
  await esperar(() => !w.__banco.anexos.some(a => a.id === "anx-card"), "arquivo antigo apagado");
  igual(w.__banco.cardapio.filter(c => c.tipo === "imagem").length, 1, "apenas um cardápio publicado");
  w.clicarBotao("Tirar do portal", "#secao");
  await esperar(() => !w.__banco.cardapio.some(c => c.tipo === "imagem"), "cardápio retirado");
  igual(w.__banco.anexos.length, 1, "sobrou arquivo de cardápio no banco");
});

teste("Área da escola", "Busca e filtro por série na lista de resumos", async () => {
  const w = await abrirPagina("admin.html");
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Resumos das aulas", "#menu");
  await esperar(() => w.$$("#lista tbody tr").length === 16, "16 resumos");
  const sel = w.$("#filtro-serie");
  sel.value = "7º ano"; w.disparar(sel, "change");
  igual(w.$$("#lista tbody tr").length, 1, "filtro do 7º ano");
  sel.value = ""; w.disparar(sel, "change");
  const busca = w.$("#busca");
  busca.value = "assunto 1"; w.disparar(busca, "input");
  igual(w.$$("#lista tbody tr").length, 7, "busca (Assunto 1 e 10 a 15)");
});

teste("Área da escola", "Sem permissão no banco: mensagem clara e nada muda", async () => {
  const w = await abrirPagina("admin.html", { falharEscrita: true });
  await esperar(() => w.$("#menu button"), "menu");
  w.clicarBotao("Mural de avisos", "#menu");
  w.clicarBotao("Novo aviso", "#secao");
  w.$("#campo-titulo").value = "Teste";
  w.$("#campo-texto").value = "Teste";
  w.$("#janela-salvar").click();
  await esperar(() => w.toast().includes("Sem permissão"), "mensagem de permissão");
  ok(w.$("#janela").open, "a janela fechou mesmo sem salvar");
});

teste("Área da escola", "Celular (375 px): a página não rola para o lado", async () => {
  const w = await abrirPagina("admin.html", { largura: 375 });
  await esperar(() => w.$("#grade-area table"), "quadro de horário");
  ok(w.document.documentElement.scrollWidth <= 375, "largura da página: " + w.document.documentElement.scrollWidth + " px");
});

teste("Portal do aluno", "Com dois cardápios publicados, aparece o mais recente", async () => {
  prepararAluno();
  const banco = bancoBase();
  banco.cardapio.push({ id: "card-antigo", tipo: "imagem", anexoId: "anx-antigo", anexoNome: "antigo.pdf", anexoTipo: "application/pdf", atualizadoEm: AGORA - 10 * 24 * HORA });
  banco.cardapio.unshift(banco.cardapio.pop());   /* o antigo vem primeiro do banco */
  const w = await abrirPagina("index.html", { banco });
  await esperar(() => w.$("#cardapio-imagem img"), "imagem do cardápio mais recente");
});

/* ================= Ferramenta de dados de exemplo ================= */
teste("Dados de exemplo", "Preenche as nove séries e depois apaga só o que é de exemplo", async () => {
  const w = await abrirPagina("exemplo.html", { pasta: "ferramentas/" });
  await esperar(() => !w.$("#carregar").disabled, "ferramenta liberada para o professor");
  w.$("#carregar").click();
  await esperar(() => w.texto("#registro").includes("Pronto"), "carregamento", 15000);
  const b = w.__banco;
  const exemplo = nome => b[nome].filter(i => i.exemplo === true);
  igual(exemplo("aulas").length, SERIES.length * 25, "25 aulas por série");
  SERIES.forEach(serie => igual(new Set(exemplo("aulas").filter(a => a.serie === serie).map(a => a.dia + a.horario)).size, 25, "horário completo do " + serie));
  ok(SERIES.every(serie => exemplo("resumos").filter(r => r.serie === serie).length >= 9), "menos de 9 resumos em alguma série");
  ok(exemplo("resumos").every(r => estudo.lerPerguntas(r.perguntas).length >= 1), "resumo sem perguntas");
  ok(SERIES.every(serie => exemplo("agenda").some(a => a.serie === serie && a.tipo === "Prova" && a.data >= hojeISO())), "série sem prova marcada");
  igual(exemplo("cardapio").length, DIAS.length + 1, "cardápio por dia + imagem");
  const comAnexo = exemplo("resumos").filter(r => r.anexoId);
  ok(comAnexo.length >= 4 && comAnexo.every(r => b.anexos.some(a => a.id === r.anexoId)), "anexos dos resumos");
  ok(!w.texto("#registro").includes("Erro"), "registro com erro: " + w.texto("#registro"));

  const outrosAntes = Object.fromEntries(["aulas", "agenda", "avisos", "resumos", "cardapio", "anexos"].map(n => [n, b[n].filter(i => !i.exemplo).length]));
  const bancoPreenchido = JSON.parse(JSON.stringify(b));
  w.$("#apagar").click();
  await esperar(() => w.texto("#registro").includes("apagados"), "apagar", 15000);
  ["aulas", "agenda", "avisos", "resumos", "cardapio", "anexos"].forEach(n => {
    igual(w.__banco[n].filter(i => i.exemplo).length, 0, "sobrou exemplo em " + n);
    igual(w.__banco[n].length, outrosAntes[n], "apagou conteúdo que não era de exemplo em " + n);
  });

  /* O portal com os dados de exemplo: só os de exemplo, para ver como fica */
  Object.keys(bancoPreenchido).forEach(n => { bancoPreenchido[n] = bancoPreenchido[n].filter(i => i.exemplo); });
  prepararAluno({ serie: "9º ano" });
  const p = await abrirPagina("index.html", { banco: bancoPreenchido });
  await esperar(() => p.$$("#horario-area tbody tr").length === 5, "horário do 9º com 5 aulas por dia");
  await esperar(() => p.$("#cardapio-imagem img"), "imagem do cardápio");
  ok(p.$$("#lista-resumos .resumo").length >= 9, "resumos do 9º");
  ok(p.$$("#provas-area tbody tr").length >= 4, "provas do 9º");
  ok(p.$$("#lista-avisos li").length >= 7, "avisos do 9º");
});

/* ================= Execução ================= */
async function rodar() {
  const botaoRodar = document.getElementById("rodar");
  const resumo = document.getElementById("resumo");
  const lista = document.getElementById("lista");
  botaoRodar.disabled = true;
  lista.replaceChildren();
  const guardados = Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("portal:")).map(k => [k, localStorage.getItem(k)]));
  let passaram = 0, falharam = 0, grupoAtual = "", ul = null;
  const inicio = Date.now();

  for (const t of testes) {
    if (t.grupo !== grupoAtual) {
      grupoAtual = t.grupo;
      ul = criarEl("ul", { classe: "resultado" });
      lista.append(criarEl("h2", { classe: "grupo", texto: t.grupo }), ul);
    }
    resumo.textContent = `Rodando: ${t.nome}…`;
    const comeco = Date.now();
    let erro = null;
    try { await Promise.race([t.fn(), pausa(20000).then(() => { throw new Falha("O teste demorou mais de 20 segundos"); })]); }
    catch (e) { erro = e; console.error(t.nome, e); }
    if (erro) falharam++; else passaram++;
    ul.append(criarEl("li", {
      classe: erro ? "falhou" : "passou",
      filhos: [
        criarEl("span", { classe: "icone", texto: erro ? "✗" : "✓" }),
        criarEl("span", { texto: t.nome }),
        criarEl("span", { classe: "tempo", texto: (Date.now() - comeco) + " ms" }),
        erro ? criarEl("span", { classe: "erro", texto: erro.message }) : null
      ]
    }));
  }

  palco.replaceChildren();
  Object.keys(localStorage).filter(k => k.startsWith("portal:")).forEach(k => localStorage.removeItem(k));
  Object.entries(guardados).forEach(([k, v]) => localStorage.setItem(k, v));
  sessionStorage.removeItem("portal:visitaAnterior");
  resumo.textContent = `${passaram} de ${testes.length} testes passaram${falharam ? `, ${falharam} falharam` : ""} (${((Date.now() - inicio) / 1000).toFixed(1)} s).`;
  resumo.className = falharam ? "estado--erro" : "";
  window.__resultado = { passaram, falharam, total: testes.length };
  botaoRodar.disabled = false;
}

document.getElementById("rodar").addEventListener("click", rodar);
if (new URLSearchParams(location.search).has("rodar")) rodar();
