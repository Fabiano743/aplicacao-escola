/**
 * @file firebase.js
 * Inicializa o Firebase (Firestore e Authentication) usado pelo portal e pela
 * área da escola. Se o config.js ainda estiver com o texto de exemplo, nada é
 * conectado e as telas mostram o aviso de "site não configurado".
 *
 * @author Fabiano
 * @since out/2026 (última alteração: 31/10/2026)
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";

/** true quando o config.js já tem os dados reais do projeto (não começa com "COLE"). */
export const configurado = !String(firebaseConfig.apiKey).startsWith("COLE");

let banco = null;
let autenticacao = null;

if (configurado) {
  const app = initializeApp(firebaseConfig);
  banco = getFirestore(app);
  autenticacao = getAuth(app);
}

/** Banco de dados Firestore (null se o site não estiver configurado). */
export const db = banco;

/** Serviço de login do Firebase (null se o site não estiver configurado). */
export const auth = autenticacao;
