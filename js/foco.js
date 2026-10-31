/**
 * @file foco.js
 * Cronômetro de estudo da seção "Como estudar" (técnica Pomodoro):
 * 25 minutos de estudo seguidos de 5 minutos de pausa.
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { $ } from "./ui.js";

/** Fases do cronômetro, na ordem em que se alternam. */
const FASES = [
  { nome: "Estudo", minutos: 25 },
  { nome: "Pausa", minutos: 5 }
];

/**
 * Formata milissegundos como "MM:SS".
 * @param {number} ms
 * @returns {string}
 */
function formatar(ms) {
  const totalSeg = Math.ceil(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return String(min).padStart(2, "0") + ":" + String(seg).padStart(2, "0");
}

/**
 * Liga o cronômetro aos elementos #foco-tempo, #foco-fase, #foco-iniciar e #foco-zerar.
 * O tempo restante é calculado pelo horário de término (fim - agora), e não
 * somando segundos; assim o cronômetro não atrasa com a aba em segundo plano.
 * @param {{aoTerminarEstudo: function(): void, aoTerminarPausa: function(): void}} funcoes
 *   Ações executadas ao fim de cada fase (ex.: mostrar um aviso).
 */
export function iniciarFoco(funcoes) {
  let fase = 0;                              // 0 = estudo, 1 = pausa
  let restante = FASES[0].minutos * 60000;   // tempo restante enquanto parado (ms)
  let fim = null;                            // horário de término; só existe com o cronômetro rodando
  let relogio = null;                        // id do setInterval
  const tituloOriginal = document.title;

  /** Atualiza o tempo, a fase, o texto do botão e o título da aba. */
  function atualizarTela() {
    let ms = restante;
    if (fim) {
      ms = Math.max(0, fim - Date.now());
    }

    $("#foco-tempo").textContent = formatar(ms);
    $("#foco-fase").textContent = `${FASES[fase].nome} · ${FASES[fase].minutos} minutos`;

    const botaoIniciar = $("#foco-iniciar");
    if (fim) {
      botaoIniciar.textContent = "Pausar";
    } else if (restante < FASES[fase].minutos * 60000) {
      botaoIniciar.textContent = "Continuar";
    } else {
      botaoIniciar.textContent = "Começar";
    }

    // enquanto roda, o tempo também aparece no título da aba
    if (fim) {
      document.title = formatar(ms) + " · " + FASES[fase].nome;
    } else {
      document.title = tituloOriginal;
    }
  }

  /** Pausa o cronômetro e guarda o tempo que faltava. */
  function parar() {
    clearInterval(relogio);
    relogio = null;
    if (fim) {
      restante = Math.max(0, fim - Date.now());
    }
    fim = null;
  }

  /** Encerra a fase atual, executa a ação de fim de fase e prepara a próxima. */
  function trocarFase() {
    parar();
    if (fase === 0) {
      funcoes.aoTerminarEstudo();
    } else {
      funcoes.aoTerminarPausa();
    }
    fase = (fase + 1) % FASES.length;
    restante = FASES[fase].minutos * 60000;
    atualizarTela();
  }

  // Começar / Pausar / Continuar
  $("#foco-iniciar").addEventListener("click", function () {
    if (fim) {
      parar();
    } else {
      fim = Date.now() + restante;
      // verifica a cada 500 ms para a virada do segundo aparecer sem atraso
      relogio = setInterval(function () {
        if (fim - Date.now() <= 0) {
          trocarFase();
        } else {
          atualizarTela();
        }
      }, 500);
    }
    atualizarTela();
  });

  // Zerar: volta ao início da fase de estudo
  $("#foco-zerar").addEventListener("click", function () {
    parar();
    fase = 0;
    restante = FASES[0].minutos * 60000;
    atualizarTela();
  });

  atualizarTela();
}
