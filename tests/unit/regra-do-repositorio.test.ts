import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";
import {
  encontrarCaminhosParaContent,
  encontrarImportsDeFs,
  encontrarImportsDoModulo,
  encontrarImportsDoSupabase,
  encontrarLiterais,
  listarCodigo,
} from "./helpers/regra-do-repositorio";

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const CAMADA_DE_CONTEUDO = path.join(SRC, "lib", "content");
const SCRIPTS = path.join(RAIZ, "scripts");

/** Onde o cliente Supabase pode ser importado (plano v2, Restrições globais; história 13). */
const PODEM_IMPORTAR_O_SUPABASE = [
  path.join(CAMADA_DE_CONTEUDO, "supabase"),
  path.join(SRC, "lib", "admin"),
  path.join(SRC, "lib", "auth"),
].map((pasta) => pasta + path.sep);

/** O `@supabase/ssr` (cookies de sessão) fica só no login e no admin (história 16). */
const PODEM_IMPORTAR_O_SSR = [
  path.join(SRC, "lib", "admin"),
  path.join(SRC, "lib", "auth"),
].map((pasta) => pasta + path.sep);

const APP_DO_ADMIN = path.join(SRC, "app", "admin");
const COMPONENTES_DO_ADMIN = path.join(SRC, "components", "admin");
const PROXY = path.join(SRC, "proxy.ts");

/** Quem pode importar `@/lib/admin` e `@/lib/auth`: o próprio admin e o Proxy. */
const PODEM_IMPORTAR_O_ADMIN = [
  APP_DO_ADMIN,
  COMPONENTES_DO_ADMIN,
  path.join(SRC, "lib", "admin"),
  path.join(SRC, "lib", "auth"),
].map((pasta) => pasta + path.sep);

const relativo = (arquivo: string) =>
  path.relative(RAIZ, arquivo).replace(/\\/g, "/");

function achadosEm(
  arquivos: readonly string[],
  detector: (codigo: string) => string[],
): string[] {
  return arquivos.flatMap((arquivo) =>
    detector(readFileSync(arquivo, "utf8")).map(
      (achado) => `${relativo(arquivo)}:${achado}`,
    ),
  );
}

const foraDaCamada = () =>
  listarCodigo(SRC).filter(
    (arquivo) => !arquivo.startsWith(CAMADA_DE_CONTEUDO + path.sep),
  );

describe("regra do repositório", () => {
  it("os detectores acham os casos positivos e ignoram os negativos", () => {
    // fs: positivos
    for (const codigo of [
      'import { readFileSync } from "fs";',
      "import fs from 'node:fs';",
      'import { readFile } from "fs/promises";',
      'import * as fsp from "node:fs/promises";',
      'const fs = require("fs");',
      'const fs = await import("node:fs");',
      'import "node:fs";',
    ]) {
      expect(encontrarImportsDeFs(codigo), codigo).toHaveLength(1);
    }
    // fs: negativos
    for (const codigo of [
      'import { x } from "./fs-utils";',
      'import { y } from "fsevents";',
      'const texto = "fs";',
      'import { getRepository } from "@/lib/content";',
    ]) {
      expect(encontrarImportsDeFs(codigo), codigo).toEqual([]);
    }

    // content/: positivos
    for (const codigo of [
      'path.join(process.cwd(), "content")',
      'readFileSync("content/materias/a.md")',
      "const p = './content/tags.json';",
      'const q = "../content";',
      "const r = `content/${slug}.md`;",
    ]) {
      expect(encontrarCaminhosParaContent(codigo), codigo).toHaveLength(1);
    }
    // content/: negativos
    for (const codigo of [
      'import { getRepository } from "@/lib/content";',
      'const x = "contentDir";',
      '<meta name="x" content="y" />',
      'const t = "conteúdo";',
      'href="#conteudo"',
    ]) {
      expect(encontrarCaminhosParaContent(codigo), codigo).toEqual([]);
    }

    // literais
    expect(encontrarLiterais('const e = "analise";', ["analise"])).toHaveLength(
      1,
    );
    expect(encontrarLiterais("const e = 'analise';", ["analise"])).toHaveLength(
      1,
    );
    expect(encontrarLiterais('const e = "analises";', ["analise"])).toEqual([]);
    expect(encontrarLiterais("// analise", ["analise"])).toEqual([]);

    // supabase: positivos
    for (const codigo of [
      'import { createClient } from "@supabase/supabase-js";',
      "import type { SupabaseClient } from '@supabase/supabase-js';",
      'const m = await import("@supabase/ssr");',
      'const s = require("@supabase/supabase-js");',
    ]) {
      expect(encontrarImportsDoSupabase(codigo), codigo).toHaveLength(1);
    }
    // supabase: negativos
    for (const codigo of [
      'import { x } from "./supabase/repository";',
      'const texto = "@supabase/supabase-js";',
      'import { getRepository } from "@/lib/content";',
    ]) {
      expect(encontrarImportsDoSupabase(codigo), codigo).toEqual([]);
    }
  });

  it("nenhum arquivo fora de src/lib/content importa fs", () => {
    expect(achadosEm(foraDaCamada(), encontrarImportsDeFs)).toEqual([]);
  });

  it("dentro de src/lib/content, só disco.ts importa fs", () => {
    const comFs = listarCodigo(CAMADA_DE_CONTEUDO)
      .filter(
        (arquivo) =>
          encontrarImportsDeFs(readFileSync(arquivo, "utf8")).length > 0,
      )
      .map(relativo);
    expect(comFs).toEqual(["src/lib/content/disco.ts"]);
  });

  it("nenhum arquivo fora de src/lib/content monta caminho para content/", () => {
    expect(achadosEm(foraDaCamada(), encontrarCaminhosParaContent)).toEqual([]);
  });

  it("src/lib/content não repete os slugs de editoria", () => {
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), (codigo) =>
        encontrarLiterais(codigo, SLUGS_DE_EDITORIA),
      ),
    ).toEqual([]);
  });

  it("src/lib/content não cria Date (datas são texto AAAA-MM-DD)", () => {
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), (codigo) =>
        codigo
          .split("\n")
          .flatMap((linha, i) =>
            /\bnew Date\b|\bDate\.(?:now|parse|UTC)\b/.test(linha)
              ? [`${i + 1}: ${linha.trim()}`]
              : [],
          ),
      ),
    ).toEqual([]);
  });

  it("o cliente Supabase só é importado em src/lib/content/supabase, src/lib/admin e src/lib/auth", () => {
    const fora = listarCodigo(SRC).filter(
      (arquivo) =>
        !PODEM_IMPORTAR_O_SUPABASE.some((pasta) => arquivo.startsWith(pasta)),
    );
    expect(achadosEm(fora, encontrarImportsDoSupabase)).toEqual([]);
    // O caso positivo existe: a regra não passa por não achar nada.
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), encontrarImportsDoSupabase),
    ).not.toEqual([]);
  });

  it("o detector de módulo acha o módulo e os caminhos abaixo dele, e nada parecido", () => {
    for (const codigo of [
      'import { createServerClient } from "@supabase/ssr";',
      "import type { CookieOptions } from '@supabase/ssr';",
      'const m = await import("@supabase/ssr");',
      'import { x } from "@supabase/ssr/dist/main";',
    ]) {
      expect(
        encontrarImportsDoModulo(codigo, "@supabase/ssr"),
        codigo,
      ).toHaveLength(1);
    }
    for (const codigo of [
      'import { createClient } from "@supabase/supabase-js";',
      'import { x } from "@supabase/ssrx";',
      'const texto = "@supabase/ssr";',
    ]) {
      expect(encontrarImportsDoModulo(codigo, "@supabase/ssr"), codigo).toEqual(
        [],
      );
    }
    expect(
      encontrarImportsDoModulo(
        'import { a } from "@/lib/auth/config";',
        "@/lib/auth",
      ),
    ).toHaveLength(1);
    expect(
      encontrarImportsDoModulo(
        'import { a } from "@/lib/authx";',
        "@/lib/auth",
      ),
    ).toEqual([]);
  });

  it("o @supabase/ssr só é importado em src/lib/auth e src/lib/admin (história 16)", () => {
    const fora = listarCodigo(SRC).filter(
      (arquivo) =>
        !PODEM_IMPORTAR_O_SSR.some((pasta) => arquivo.startsWith(pasta)),
    );
    const ssr = (codigo: string) =>
      encontrarImportsDoModulo(codigo, "@supabase/ssr");
    expect(achadosEm(fora, ssr)).toEqual([]);
    expect(
      achadosEm(listarCodigo(path.join(SRC, "lib", "auth")), ssr),
    ).not.toEqual([]);
  });

  it("as páginas e os componentes do /admin obtêm dados só por src/lib/admin e src/lib/auth", () => {
    const paginas = [APP_DO_ADMIN, COMPONENTES_DO_ADMIN].flatMap((pasta) =>
      existsSync(pasta) ? listarCodigo(pasta) : [],
    );
    // O caso positivo existe: as páginas do admin estão lá.
    expect(paginas.length).toBeGreaterThan(0);
    expect(
      achadosEm(paginas, (codigo) => [
        ...encontrarImportsDoModulo(codigo, "@/lib/content"),
        ...encontrarImportsDoSupabase(codigo),
      ]),
    ).toEqual([]);
  });

  it("fora do admin, ninguém importa src/lib/admin nem src/lib/auth (o site público não tem login)", () => {
    const fora = listarCodigo(SRC).filter(
      (arquivo) =>
        arquivo !== PROXY &&
        !PODEM_IMPORTAR_O_ADMIN.some((pasta) => arquivo.startsWith(pasta)),
    );
    expect(
      achadosEm(fora, (codigo) => [
        ...encontrarImportsDoModulo(codigo, "@/lib/admin"),
        ...encontrarImportsDoModulo(codigo, "@/lib/auth"),
      ]),
    ).toEqual([]);
    // O Proxy só usa a configuração e a renovação da sessão, nunca as actions.
    const proxy = readFileSync(PROXY, "utf8");
    expect(encontrarImportsDoModulo(proxy, "@/lib/admin")).toEqual([]);
    expect(encontrarImportsDoModulo(proxy, "@/lib/auth/servidor")).toEqual([]);
  });

  it("scripts/ pode usar fs e o cliente Supabase (comandos locais)", () => {
    const codigo = listarCodigo(SCRIPTS).map((a) => readFileSync(a, "utf8"));
    expect(codigo.some((c) => encontrarImportsDeFs(c).length > 0)).toBe(true);
    expect(codigo.some((c) => encontrarImportsDoSupabase(c).length > 0)).toBe(
      true,
    );
  });

  it("a service_role nunca aparece em src/ (só em scripts/)", () => {
    expect(
      achadosEm(listarCodigo(SRC), (codigo) =>
        /SERVICE_ROLE|service_role|serviceRole/.test(codigo)
          ? ["cita a service_role"]
          : [],
      ),
    ).toEqual([]);
  });
});
