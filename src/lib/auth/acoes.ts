"use server";
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { origemDaAcao } from "./config";
import { criarClienteDoServidor } from "./servidor";

/**
 * Entrar e sair do admin (história 16, critério 4; spec v2 §7.6). Server actions dos
 * formulários de `/admin/entrar` e do botão "Sair" do topo.
 *
 * Numa Server Action, o `setAll` do cliente grava os cookies: o verificador do PKCE ao
 * entrar e a remoção da sessão ao sair.
 */

/** "Entrar com Google": o Auth devolve o endereço do Google, e o navegador vai para lá. */
export async function entrarComGoogle(): Promise<void> {
  let destino = "/admin/entrar?erro=login";
  try {
    const cliente = await criarClienteDoServidor();
    const { data, error } = await cliente.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origemDaAcao(await headers())}/admin/auth/callback`,
      },
    });
    if (error || !data.url) {
      console.error(
        "[admin] o login com o Google não começou:",
        error?.message,
      );
    } else {
      destino = data.url;
    }
  } catch (erro) {
    console.error("[admin] o login com o Google não começou:", erro);
  }
  // Fora do try: o redirect lança para interromper (doc `redirect.md`).
  redirect(destino);
}

/** "Sair": encerra a sessão deste navegador (as outras continuam) e volta para entrar. */
export async function sair(): Promise<void> {
  try {
    const cliente = await criarClienteDoServidor();
    await cliente.auth.signOut({ scope: "local" });
  } catch (erro) {
    console.error("[admin] sair falhou:", erro);
  }
  redirect("/admin/entrar");
}
