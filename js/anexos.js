/**
 * @file anexos.js
 * Anexos (imagem e PDF) dos resumos e do cardápio.
 * Os arquivos ficam na coleção "anexos" do Firestore (o Storage exige plano pago).
 * Como cada documento aceita no máximo 1 MB, as imagens são reduzidas antes do
 * envio e o PDF tem limite de 700 KB.
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { criar, ler, remover } from "./dados.js";

/** Tamanho máximo do arquivo (700 KB; em base64 fica perto de 930 KB, abaixo de 1 MB). */
const LIMITE = 700 * 1024;

/** Endereço do pdf.js, carregado só quando é preciso converter um PDF. */
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/";

/**
 * Lê um arquivo como data URL ("data:tipo;base64,...").
 * @param {File} arquivo
 * @returns {Promise<string>}
 */
function lerComoDataURL(arquivo) {
  return new Promise(function (resolve, reject) {
    const leitor = new FileReader();
    leitor.onload = function () {
      resolve(leitor.result);
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Desenha a imagem em um canvas com fundo branco (sem o fundo, a parte
 * transparente de um PNG fica preta ao virar JPEG).
 * @param {CanvasImageSource} origem - Imagem ou canvas de origem.
 * @param {number} largura
 * @param {number} altura
 * @returns {HTMLCanvasElement}
 */
function telaBranca(origem, largura, altura) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largura);
  canvas.height = Math.round(altura);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(origem, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Converte a imagem em JPEG dentro do LIMITE: tenta qualidades menores e,
 * se ainda não couber, reduz a imagem em 25% (até 3 tentativas).
 * @param {CanvasImageSource} origem - Imagem ou canvas.
 * @param {number} larguraMax - Largura máxima em pixels.
 * @param {number} alturaMax - Altura máxima em pixels.
 * @returns {string} Data URL do JPEG.
 * @throws {Error} Se o arquivo não couber mesmo depois de reduzido.
 */
function comprimir(origem, larguraMax, alturaMax) {
  let escala = Math.min(1, larguraMax / origem.width, alturaMax / origem.height);
  const qualidades = [0.82, 0.7, 0.58];

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const canvas = telaBranca(origem, origem.width * escala, origem.height * escala);
    for (const q of qualidades) {
      const dados = canvas.toDataURL("image/jpeg", q);
      // o base64 é cerca de 33% maior que o arquivo, por isso o fator 0,75
      if (dados.length * 0.75 <= LIMITE) {
        return dados;
      }
    }
    escala = escala * 0.75;
  }
  throw new Error("O arquivo é grande demais, mesmo depois de reduzido. Tente uma imagem com menos detalhes.");
}

/**
 * Carrega uma imagem a partir de um endereço (URL ou data URL).
 * Usa o evento onload, que funciona também com a aba em segundo plano.
 * @param {string} endereco
 * @returns {Promise<HTMLImageElement>}
 */
export function carregarImagem(endereco) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      reject(new Error("Não foi possível abrir esta imagem. Tente outro arquivo."));
    };
    img.src = endereco;
  });
}

/**
 * Reduz uma foto para no máximo 1600 x 1600 px dentro do LIMITE.
 * @param {File} arquivo
 * @returns {Promise<string>} Data URL do JPEG.
 */
async function reduzirImagem(arquivo) {
  const endereco = await lerComoDataURL(arquivo);
  const img = await carregarImagem(endereco);
  return comprimir(img, 1600, 1600);
}

/**
 * Converte o PDF do cardápio em uma única imagem, com até 3 páginas empilhadas,
 * para o cardápio aparecer direto no portal.
 * O render usa intent "print", que não depende de a aba estar visível.
 * @param {File} arquivo - PDF.
 * @returns {Promise<string>} Data URL do JPEG.
 */
async function pdfParaImagem(arquivo) {
  const pdfjs = await import(PDFJS + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;

  // desenha cada página em um canvas com 1400 px de largura
  const paginas = [];
  const total = Math.min(pdf.numPages, 3);
  for (let n = 1; n <= total; n++) {
    const pagina = await pdf.getPage(n);
    const escala = 1400 / pagina.getViewport({ scale: 1 }).width;
    const visao = pagina.getViewport({ scale: escala });

    const canvas = document.createElement("canvas");
    canvas.width = visao.width;
    canvas.height = visao.height;
    await pagina.render({
      canvasContext: canvas.getContext("2d"),
      viewport: visao,
      background: "#fff",
      intent: "print"
    }).promise;
    paginas.push(canvas);
  }

  // junta as páginas, uma embaixo da outra
  let largura = 0;
  let altura = 0;
  for (const p of paginas) {
    if (p.width > largura) {
      largura = p.width;
    }
    altura += p.height;
  }

  const junta = document.createElement("canvas");
  junta.width = largura;
  junta.height = altura;
  const ctx = junta.getContext("2d");
  let y = 0;
  for (const p of paginas) {
    ctx.drawImage(p, 0, y);
    y += p.height;
  }
  return comprimir(junta, 1400, 6000);
}

/**
 * Prepara o arquivo escolhido pelo professor para envio.
 * - Imagem: reduzida e convertida em JPEG.
 * - PDF com pdfComoImagem (cardápio): convertido em imagem.
 * - PDF sem pdfComoImagem (resumos): enviado como PDF, se tiver até 700 KB.
 * @param {File} arquivo
 * @param {{pdfComoImagem?: boolean}} [opcoes]
 * @returns {Promise<{nome: string, tipo: string, dados: string}>}
 * @throws {Error} Com mensagem para o professor (tipo não aceito, arquivo grande, PDF ilegível).
 */
export async function prepararAnexo(arquivo, opcoes) {
  const pdfComoImagem = Boolean(opcoes && opcoes.pdfComoImagem);

  if (arquivo.type.startsWith("image/")) {
    return { nome: arquivo.name, tipo: "image/jpeg", dados: await reduzirImagem(arquivo) };
  }

  if (arquivo.type === "application/pdf" && pdfComoImagem) {
    try {
      const dados = await pdfParaImagem(arquivo);
      return { nome: arquivo.name.replace(/\.pdf$/i, ".jpg"), tipo: "image/jpeg", dados: dados };
    } catch (erro) {
      console.error(erro);
      // a mensagem de "arquivo grande demais" do comprimir() é mantida
      if (erro.message.startsWith("O arquivo")) {
        throw new Error(erro.message);
      }
      throw new Error("Não foi possível ler este PDF. Tente enviar uma foto ou imagem do cardápio.");
    }
  }

  if (arquivo.type === "application/pdf") {
    if (arquivo.size > LIMITE) {
      const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",");
      throw new Error(`O PDF tem ${mb} MB e o limite é 700 KB. Reduza o arquivo ou coloque no Google Drive e use o campo de link.`);
    }
    return { nome: arquivo.name, tipo: arquivo.type, dados: await lerComoDataURL(arquivo) };
  }

  throw new Error("Envie uma imagem (JPG ou PNG) ou um arquivo PDF.");
}

/**
 * Salva o anexo preparado na coleção "anexos", com a data de envio.
 * @param {{nome: string, tipo: string, dados: string}} anexo - Resultado de prepararAnexo().
 * @returns {Promise<string>} Id do anexo criado.
 */
export async function enviarAnexo(anexo) {
  const documento = {};
  Object.assign(documento, anexo);
  documento.criadoEm = Date.now();
  const ref = await criar("anexos", documento);
  return ref.id;
}

/**
 * Exclui um anexo.
 * @param {string} id
 * @returns {Promise<void>}
 */
export function apagarAnexo(id) {
  return remover("anexos", id);
}

/**
 * Lê um anexo do banco.
 * @param {string} id
 * @returns {Promise<Object|null>} { id, nome, tipo, dados, criadoEm } ou null.
 */
export function carregarAnexo(id) {
  return ler("anexos", id);
}

/**
 * Abre o anexo em uma aba nova.
 * - A aba é aberta antes de buscar o arquivo, para o navegador não bloquear como popup.
 * - O arquivo é convertido em blob, porque o Chrome não abre data URL em aba nova.
 * - Se o navegador bloquear a aba, o arquivo é baixado.
 * @param {string} id - Id do anexo.
 * @param {string} [nome] - Nome usado no download.
 * @returns {Promise<void>}
 * @throws {Error} Se o anexo não existir mais.
 */
export async function abrirAnexo(id, nome) {
  const janela = window.open("", "_blank");
  const anexo = await carregarAnexo(id);

  if (!anexo) {
    if (janela) {
      janela.close();
    }
    throw new Error("O anexo não foi encontrado. Ele pode ter sido removido.");
  }

  const resposta = await fetch(anexo.dados);
  const blob = await resposta.blob();
  const endereco = URL.createObjectURL(blob);

  if (janela) {
    janela.location = endereco;
  } else {
    const link = document.createElement("a");
    link.href = endereco;
    link.download = nome || anexo.nome;
    link.click();
  }
}
