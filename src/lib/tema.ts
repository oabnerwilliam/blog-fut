/**
 * Regras do tema (história 07). Funções puras, usadas pelo `BotaoDeTema` (cliente) e pelo
 * root layout (servidor, só a string do script inline).
 *
 * - "sistema": sem `data-theme` no `<html>`; o CSS segue o `prefers-color-scheme`.
 * - "light" e "dark": `data-theme` no `<html>` e a escolha em `localStorage["tema"]`.
 */

export type Tema = "sistema" | "light" | "dark";

export const CHAVE_DO_TEMA = "tema";

/** Só o que o código usa do `localStorage` (permite storage falso nos testes). */
type LeituraDoStorage = Pick<Storage, "getItem">;
type EscritaDoStorage = Pick<Storage, "setItem" | "removeItem">;

/** Só o que o código usa do `<html>`. */
type Raiz = Pick<Element, "getAttribute" | "setAttribute" | "removeAttribute">;

const CICLO: Record<Tema, Tema> = {
  sistema: "light",
  light: "dark",
  dark: "sistema",
};

const ROTULOS: Record<Tema, string> = {
  sistema: "sistema",
  light: "claro",
  dark: "escuro",
};

export function proximoTema(atual: Tema): Tema {
  return CICLO[atual];
}

export function rotuloDoTema(tema: Tema): string {
  return ROTULOS[tema];
}

/** `aria-label` do botão: começa pelo texto visível ("Tema: claro"), como pede o WCAG 2.5.3. */
export function nomeDoBotaoDeTema(tema: Tema): string {
  return `Tema: ${rotuloDoTema(tema)}. Mudar para ${rotuloDoTema(proximoTema(tema))}`;
}

/**
 * Valor guardado ou atributo → tema. Só "light" e "dark" valem; o resto é "sistema".
 * Mude junto com o `SCRIPT_DO_TEMA`, que repete esta regra em JavaScript cru (o teste de
 * unidade "faz o mesmo que lerTemaGuardado" confere que os dois concordam).
 */
export function temaDoAtributo(valor: string | null | undefined): Tema {
  return valor === "light" || valor === "dark" ? valor : "sistema";
}

/** Lê a escolha guardada. Valor ausente ou inválido, storage ausente ou que lança: "sistema". */
export function lerTemaGuardado(storage: LeituraDoStorage | null): Tema {
  try {
    return temaDoAtributo(storage?.getItem(CHAVE_DO_TEMA));
  } catch {
    return "sistema";
  }
}

/** Guarda a escolha ("sistema" apaga a chave). Sem storage, a escolha vale só nesta página. */
export function guardarTema(
  storage: EscritaDoStorage | null,
  tema: Tema,
): void {
  try {
    if (tema === "sistema") storage?.removeItem(CHAVE_DO_TEMA);
    else storage?.setItem(CHAVE_DO_TEMA, tema);
  } catch {
    // Storage bloqueado (modo privado, cota): segue sem guardar.
  }
}

/** Aplica o tema no `<html>`: `data-theme` para claro e escuro, nenhum atributo para sistema. */
export function aplicarTema(raiz: Raiz, tema: Tema): void {
  if (tema === "sistema") raiz.removeAttribute("data-theme");
  else raiz.setAttribute("data-theme", tema);
}

/**
 * Script inline e síncrono do `<head>`: faz o mesmo que `lerTemaGuardado` + `aplicarTema` antes
 * do primeiro paint e marca `data-js` (o CSS só mostra o botão com esse atributo).
 * O acesso ao `localStorage` fica dentro do `try`, porque o próprio getter pode lançar.
 * Mude junto com o `temaDoAtributo`: o `t==="light"||t==="dark"` daqui é a mesma regra.
 */
export const SCRIPT_DO_TEMA = `(function(){var h=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(CHAVE_DO_TEMA)});if(t==="light"||t==="dark")h.setAttribute("data-theme",t)}catch(e){}h.setAttribute("data-js","")})()`;
