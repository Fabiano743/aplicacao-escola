/* Carrega e apaga dados fictícios no Firestore para demonstrar o portal.
   Exige um professor logado (o mesmo login da Área da escola). */
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, configurado } from "../js/firebase.js";
import { COLECOES, observar, salvarLote, ehAdmin } from "../js/dados.js";
import { SERIES, DIAS, TODAS, HORARIOS, ESCOLA } from "../js/config.js";
import { enviarAnexo } from "../js/anexos.js";
import { $, criarEl, hojeISO, paraBR } from "../js/ui.js";
import * as C from "./conteudo-exemplo.js";

const TODAS_COLECOES = [...COLECOES, "anexos"];
const DIA = 86400000;

/* ---------------- Utilidades ---------------- */
const lerColecao = nome => new Promise((ok, falha) => {
  const parar = observar(nome, {}, lista => { ok(lista); setTimeout(parar); }, falha);
});

function registrar(texto, erro = false) {
  $("#registro").appendChild(criarEl("li", { texto, classe: erro ? "estado--erro" : "" }));
}

/* Data a n dias de hoje, empurrada para um dia útil (segunda a sexta) */
function diaUtil(n) {
  const d = new Date(hojeISO() + "T12:00:00");
  d.setDate(d.getDate() + n);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + (n < 0 ? -1 : 1));
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

/* Embaralha sempre do mesmo jeito para a mesma semente: cada série tem seu horário */
function embaralhar(lista, semente) {
  let s = semente * 9301 + 49297;
  const aleatorio = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/* ---------------- Desenhos (imagens anexadas) ---------------- */
function tela(largura, altura) {
  const t = document.createElement("canvas");
  t.width = largura; t.height = altura;
  const p = t.getContext("2d");
  p.fillStyle = "#fff"; p.fillRect(0, 0, largura, altura);
  p.textBaseline = "middle";
  return [t, p];
}
const fonte = (p, tamanho, peso = "normal") => { p.font = `${peso} ${tamanho}px Arial, sans-serif`; };
function seta(p, x1, y1, x2, y2, cor) {
  p.strokeStyle = cor; p.fillStyle = cor; p.lineWidth = 6;
  p.beginPath(); p.moveTo(x1, y1); p.lineTo(x2, y2); p.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.beginPath(); p.moveTo(x2, y2);
  p.lineTo(x2 - 22 * Math.cos(a - 0.4), y2 - 22 * Math.sin(a - 0.4));
  p.lineTo(x2 - 22 * Math.cos(a + 0.4), y2 - 22 * Math.sin(a + 0.4));
  p.closePath(); p.fill();
}

function desenharCardapio() {
  const [t, p] = tela(1400, 860);
  const inicio = diaUtil(-((new Date().getDay() + 6) % 7));
  p.fillStyle = "#3f7d3a"; p.fillRect(0, 0, 1400, 150);
  p.fillStyle = "#fff"; fonte(p, 54, "bold"); p.fillText("Cardápio da semana", 60, 62);
  fonte(p, 28); p.fillText(`${ESCOLA.nome} · semana de ${paraBR(inicio).slice(0, 5)}`, 60, 115);
  const colunas = [[60, "Dia"], [260, "Prato principal"], [820, "Acompanhamento"], [1150, "Sobremesa"]];
  p.fillStyle = "#e7f0e5"; p.fillRect(40, 190, 1320, 70);
  p.fillStyle = "#1d232b"; fonte(p, 28, "bold");
  colunas.forEach(([x, rotulo]) => p.fillText(rotulo, x, 225));
  C.CARDAPIO.forEach((linha, i) => {
    const y = 260 + i * 105;
    if (i % 2) { p.fillStyle = "#f6f7f9"; p.fillRect(40, y, 1320, 105); }
    p.fillStyle = "#1d232b";
    linha.forEach((valor, c) => { fonte(p, c === 0 ? 30 : 28, c === 0 ? "bold" : "normal"); p.fillText(valor, colunas[c][0], y + 52, c === 1 ? 540 : 300); });
  });
  p.fillStyle = "#5b6470"; fonte(p, 22);
  p.fillText("Cardápio sujeito a alterações. Dados fictícios para demonstração.", 60, 820);
  return t.toDataURL("image/jpeg", 0.85);
}

function desenharCiclo() {
  const [t, p] = tela(1200, 760);
  const ceu = p.createLinearGradient(0, 0, 0, 520); ceu.addColorStop(0, "#cfe6f7"); ceu.addColorStop(1, "#f2f8fc");
  p.fillStyle = ceu; p.fillRect(0, 0, 1200, 520);
  p.fillStyle = "#3a7fc1"; p.fillRect(0, 520, 600, 240);
  p.fillStyle = "#8a6a43"; p.fillRect(600, 520, 600, 240);
  p.fillStyle = "#f4c430"; p.beginPath(); p.arc(130, 120, 70, 0, Math.PI * 2); p.fill();
  p.fillStyle = "#fff"; [[760, 130, 70], [840, 110, 90], [930, 135, 70]].forEach(([x, y, r]) => { p.beginPath(); p.arc(x, y, r, 0, Math.PI * 2); p.fill(); });
  p.strokeStyle = "#3a7fc1"; p.lineWidth = 4;
  for (let i = 0; i < 9; i++) { p.beginPath(); p.moveTo(780 + i * 22, 230); p.lineTo(770 + i * 22, 270); p.stroke(); }
  seta(p, 300, 480, 600, 200, "#c0392b");
  seta(p, 640, 150, 700, 140, "#555");
  seta(p, 860, 300, 860, 480, "#2471a3");
  seta(p, 800, 600, 560, 640, "#6e4b2a");
  p.fillStyle = "#1d232b"; fonte(p, 34, "bold");
  p.fillText("Evaporação", 260, 330); p.fillText("Condensação", 560, 60);
  p.fillText("Precipitação", 900, 390); p.fillText("Infiltração", 820, 690);
  fonte(p, 40, "bold"); p.fillStyle = "#fff"; p.fillText("Mar", 250, 650);
  return t.toDataURL("image/jpeg", 0.85);
}

function desenharCores() {
  const [t, p] = tela(1200, 700);
  fonte(p, 44, "bold"); p.fillStyle = "#1d232b"; p.fillText("Cores primárias e secundárias", 60, 70);
  const circulo = (x, y, cor, nome) => {
    p.fillStyle = cor; p.beginPath(); p.arc(x, y, 80, 0, Math.PI * 2); p.fill();
    p.fillStyle = "#1d232b"; fonte(p, 28); p.fillText(nome, x - 60, y + 120);
  };
  circulo(200, 230, "#1f5fbf", "Azul"); circulo(550, 230, "#d62828", "Vermelho"); circulo(900, 230, "#f6c90e", "Amarelo");
  fonte(p, 30, "bold"); p.fillText("Misturando duas primárias:", 60, 450);
  [["Azul + amarelo", "#2e9e44", "Verde"], ["Vermelho + amarelo", "#f08a24", "Laranja"], ["Azul + vermelho", "#7b3fa0", "Roxo"]].forEach(([conta, cor, nome], i) => {
    const x = 90 + i * 380;
    p.fillStyle = cor; p.fillRect(x, 500, 120, 120);
    p.fillStyle = "#1d232b"; fonte(p, 26); p.fillText(conta, x + 140, 545); fonte(p, 28, "bold"); p.fillText("= " + nome, x + 140, 590);
  });
  return t.toDataURL("image/jpeg", 0.85);
}

function desenharTerra() {
  const [t, p] = tela(1200, 760);
  fonte(p, 44, "bold"); p.fillStyle = "#1d232b"; p.fillText("Camadas da Terra", 60, 70);
  [[330, "#6b8e4e"], [300, "#e07b39"], [170, "#f2b134"], [90, "#f7e07a"]].forEach(([r, cor]) => {
    p.fillStyle = cor; p.beginPath(); p.moveTo(420, 700); p.arc(420, 700, r, Math.PI, 0); p.closePath(); p.fill();
  });
  const rotulo = (texto, y, x2) => { p.strokeStyle = "#1d232b"; p.lineWidth = 2; p.beginPath(); p.moveTo(x2, y); p.lineTo(800, y); p.stroke(); fonte(p, 32); p.fillStyle = "#1d232b"; p.fillText(texto, 815, y); };
  rotulo("Crosta (onde vivemos)", 385, 560);
  rotulo("Manto (magma)", 470, 600);
  rotulo("Núcleo externo", 560, 560);
  rotulo("Núcleo interno", 650, 480);
  return t.toDataURL("image/jpeg", 0.85);
}

function desenharPitagoras() {
  const [t, p] = tela(1200, 760);
  fonte(p, 44, "bold"); p.fillStyle = "#1d232b"; p.fillText("Teorema de Pitágoras", 60, 70);
  p.fillStyle = "#e9eff6"; p.strokeStyle = "#1f4e79"; p.lineWidth = 6;
  p.beginPath(); p.moveTo(160, 620); p.lineTo(640, 620); p.lineTo(160, 260); p.closePath(); p.fill(); p.stroke();
  p.strokeRect(160, 580, 40, 40);
  fonte(p, 36, "bold"); p.fillStyle = "#1d232b";
  p.fillText("c = 4", 360, 670); p.fillText("b = 3", 50, 440); p.fillText("a = 5", 420, 410);
  fonte(p, 48, "bold"); p.fillStyle = "#1f4e79"; p.fillText("a² = b² + c²", 720, 360);
  fonte(p, 36); p.fillStyle = "#1d232b"; p.fillText("5² = 3² + 4²", 740, 440); p.fillText("25 = 9 + 16", 740, 500);
  fonte(p, 26); p.fillStyle = "#5b6470"; p.fillText("a é a hipotenusa: o lado oposto ao ângulo reto", 60, 720);
  return t.toDataURL("image/jpeg", 0.85);
}

const DESENHOS = { ciclo: desenharCiclo, cores: desenharCores, terra: desenharTerra, pitagoras: desenharPitagoras };

/* ---------------- Montagem dos dados ---------------- */
function montarDados() {
  const agora = Date.now();
  const docs = { aulas: [], agenda: [], avisos: [], resumos: [], cardapio: [] };
  const datas = { reuniao: diaUtil(9), conselho: diaUtil(12), feiraInscricao: diaUtil(11), feira: diaUtil(18) };

  SERIES.forEach((serie, s) => {
    /* Horário: 5 aulas por dia, distribuídas conforme a grade da etapa */
    const grade = parseInt(serie, 10) <= 5 ? C.GRADE_INICIAIS : C.GRADE_FINAIS;
    const vagas = embaralhar(Object.entries(grade).flatMap(([disciplina, n]) => Array(n).fill(disciplina)), s + 3);
    DIAS.forEach((dia, d) => HORARIOS.forEach((horario, h) => {
      docs.aulas.push({ serie, dia, horario, disciplina: vagas[d * HORARIOS.length + h], atividade: "" });
    }));

    /* Provas e entregas, com o conteúdo tirado dos resumos da série */
    const topicos = C.RESUMOS[C.grupoDaSerie(serie)];
    const disciplinas = [...new Set(topicos.map(t => t[0]))];
    const conteudo = disc => topicos.filter(t => t[0] === disc).map(t => t[1]).join(" e ");
    [0, 1, 2].forEach(k => {
      const disc = disciplinas[(s + k) % disciplinas.length];
      docs.agenda.push({ serie, data: diaUtil(3 + k * 5 + (s % 3)), tipo: "Prova", disciplina: disc, descricao: conteudo(disc) });
    });
    const discEntrega = disciplinas[(s + 3) % disciplinas.length];
    docs.agenda.push({ serie, data: diaUtil(6 + (s % 4)), tipo: "Entrega", disciplina: discEntrega, descricao: "Trabalho em grupo: cartaz sobre " + topicos.find(t => t[0] === discEntrega)[1].toLowerCase() });
    const discPassada = disciplinas[(s + 4) % disciplinas.length];
    docs.agenda.push({ serie, data: diaUtil(-4 - (s % 3)), tipo: "Prova", disciplina: discPassada, descricao: conteudo(discPassada) });

    /* Resumos das últimas semanas, em ordem diferente para cada série */
    embaralhar([...topicos], s + 11).forEach((t, i) => {
      const [disciplina, titulo, resumo, perguntas, desenho] = t;
      docs.resumos.push({ serie, disciplina, data: diaUtil(-(i * 4 + (s % 3) + 1)), titulo, resumo, perguntas, link: "", desenho });
    });

    const [titulo, texto] = C.AVISO_DA_SERIE[serie];
    docs.avisos.push({ serie, titulo, texto, criadoEm: agora - ((s % 4) + 1) * DIA - 3 * 3600000 });
  });

  /* Datas para todas as séries: eventos da escola e feriados nacionais dos próximos 90 dias */
  docs.agenda.push(
    { serie: TODAS, data: datas.reuniao, tipo: "Evento", disciplina: "", descricao: "Reunião de pais e responsáveis, às 18h30" },
    { serie: TODAS, data: datas.conselho, tipo: "Evento", disciplina: "", descricao: "Conselho de classe: não haverá aula" },
    { serie: TODAS, data: datas.feira, tipo: "Evento", disciplina: "", descricao: "Feira de Ciências" }
  );
  const hoje = hojeISO();
  const limite = diaUtil(90);
  [0, 1].forEach(ano => C.FERIADOS.forEach(([mesDia, nome]) => {
    const data = `${new Date().getFullYear() + ano}-${mesDia}`;
    if (data >= hoje && data <= limite) docs.agenda.push({ serie: TODAS, data, tipo: "Feriado", disciplina: "", descricao: nome });
  }));

  const curta = iso => paraBR(iso).slice(0, 5);
  C.AVISOS_GERAIS.forEach(([titulo, texto, diasAtras]) => {
    const trocar = s => s.replace("{reuniao}", curta(datas.reuniao)).replace("{conselho}", curta(datas.conselho)).replace("{feiraInscricao}", curta(datas.feiraInscricao));
    docs.avisos.push({ serie: TODAS, titulo: trocar(titulo), texto: trocar(texto), criadoEm: agora - diasAtras * DIA });
  });

  C.CARDAPIO.forEach(([dia, prato, acompanhamento, sobremesa]) => docs.cardapio.push({ dia, prato, acompanhamento, sobremesa }));
  return docs;
}

/* ---------------- Apagar ---------------- */
async function apagar(filtro) {
  let total = 0;
  for (const nome of TODAS_COLECOES) {
    const alvos = (await lerColecao(nome)).filter(filtro);
    for (let i = 0; i < alvos.length; i += 400) {
      await salvarLote(alvos.slice(i, i + 400).map(item => ({ tipo: "remover", nome, id: item.id })));
    }
    if (alvos.length) registrar(`${nome}: ${alvos.length} apagado(s).`);
    total += alvos.length;
  }
  return total;
}

/* ---------------- Carregar ---------------- */
async function carregar() {
  const docs = montarDados();
  registrar("Removendo dados de exemplo anteriores…");
  await apagar(i => i.exemplo === true);
  if ($("#limpar-tudo").checked) {
    registrar("Removendo o conteúdo que não é de exemplo…");
    await apagar(i => i.exemplo !== true);
  }

  registrar("Enviando as imagens (cardápio e resumos)…");
  const idCardapio = await enviarAnexo({ nome: "cardapio-da-semana.jpg", tipo: "image/jpeg", dados: desenharCardapio(), exemplo: true });
  docs.cardapio.push({ tipo: "imagem", anexoId: idCardapio, anexoNome: "cardapio-da-semana.jpg", anexoTipo: "image/jpeg", atualizadoEm: Date.now() });
  for (const resumo of docs.resumos) {
    if (resumo.desenho) {
      const nome = resumo.titulo.toLowerCase().replace(/\s+/g, "-") + ".jpg";
      const id = await enviarAnexo({ nome, tipo: "image/jpeg", dados: DESENHOS[resumo.desenho](), exemplo: true });
      Object.assign(resumo, { anexoId: id, anexoNome: nome, anexoTipo: "image/jpeg" });
    }
    delete resumo.desenho;
  }

  const operacoes = Object.entries(docs).flatMap(([nome, lista]) => lista.map(dados => ({ tipo: "criar", nome, dados: { ...dados, exemplo: true } })));
  for (let i = 0; i < operacoes.length; i += 400) {
    await salvarLote(operacoes.slice(i, i + 400));
    registrar(`Gravados ${Math.min(i + 400, operacoes.length)} de ${operacoes.length} itens…`);
  }
  Object.entries(docs).forEach(([nome, lista]) => registrar(`${nome}: ${lista.length} criado(s).`));
}

/* ---------------- Tela ---------------- */
async function pintarEstado() {
  const linhas = [];
  for (const nome of TODAS_COLECOES) {
    const lista = await lerColecao(nome);
    const exemplos = lista.filter(i => i.exemplo === true).length;
    linhas.push(criarEl("tr", { filhos: [nome, String(exemplos), String(lista.length - exemplos)].map(v => criarEl("td", { texto: v })) }));
  }
  const cab = criarEl("tr", { filhos: ["Coleção", "De exemplo", "Outros"].map(v => criarEl("th", { texto: v })) });
  $("#estado").replaceChildren(criarEl("div", { classe: "tabela", filhos: [criarEl("table", { filhos: [criarEl("thead", { filhos: [cab] }), criarEl("tbody", { filhos: linhas })] })] }));
}

async function executar(botao, acao, mensagemFinal) {
  $("#carregar").disabled = $("#apagar").disabled = true;
  $("#registro").replaceChildren();
  $("#alerta").textContent = "";
  const inicio = Date.now();
  try {
    await acao();
    registrar(`${mensagemFinal} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  } catch (erro) {
    console.error(erro);
    registrar("Erro: " + (erro.code === "permission-denied" ? "sem permissão para gravar. Confira o login e as regras do Firestore." : erro.message), true);
  } finally {
    $("#carregar").disabled = $("#apagar").disabled = false;
    pintarEstado();
  }
}

function iniciar() {
  if (!configurado) { $("#alerta").textContent = "Site ainda não configurado: preencha js/config.js."; return; }
  $("#carregar").addEventListener("click", e => {
    const extra = $("#limpar-tudo").checked ? "\n\nO conteúdo que não é de exemplo também será APAGADO." : "";
    if (confirm("Carregar os dados de exemplo nas nove séries?" + extra)) executar(e.currentTarget, carregar, "Pronto: o portal está preenchido.");
  });
  $("#apagar").addEventListener("click", e => {
    if (confirm("Apagar todos os dados de exemplo?")) executar(e.currentTarget, () => apagar(i => i.exemplo === true), "Dados de exemplo apagados.");
  });
  onAuthStateChanged(auth, async usuario => {
    if (!usuario || !(await ehAdmin(usuario.uid).catch(() => false))) {
      $("#alerta").replaceChildren("Entre primeiro na ", criarEl("a", { texto: "Área da escola", attrs: { href: "../admin.html" } }), " com uma conta de professor e depois volte a esta página.");
      return;
    }
    $("#usuario").textContent = usuario.email;
    $("#carregar").disabled = $("#apagar").disabled = false;
    pintarEstado();
  });
}

iniciar();
