/* Substitui o Firebase Auth nos testes.
   window.__teste.auth: "admin" (logado e liberado), "semPermissao" (logado sem acesso) ou "nenhum". */
const config = window.__teste || {};
let usuario = config.auth && config.auth !== "nenhum" ? { uid: "prof-1", email: "professor@escola.test" } : null;
const ouvintes = [];
const avisar = () => ouvintes.forEach(fn => fn(usuario));

export function onAuthStateChanged(a, fn) {
  ouvintes.push(fn);
  setTimeout(() => fn(usuario), 0);
}

export async function signInWithEmailAndPassword(a, email, senha) {
  if (senha !== "senha-de-teste") throw Object.assign(new Error("credencial inválida"), { code: "auth/invalid-credential" });
  usuario = { uid: "prof-1", email };
  config.auth = "admin";
  avisar();
}

export async function signOut() {
  usuario = null;
  avisar();
}
