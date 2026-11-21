/**
 * Conferência estática dos workflows do GitHub e do `vercel.json` (história 14,
 * critérios 6, 8, 9 e 10). Os workflows não rodam localmente: o teste pega os erros que
 * só apareceriam no primeiro PR (nome de secret, gatilho, versão do Node, segredo solto).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const RAIZ = path.resolve(__dirname, "../..");
const ler = (relativo: string) =>
  readFileSync(path.join(RAIZ, relativo), "utf8");

interface Passo {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
}
interface Job {
  "runs-on": string;
  env?: Record<string, string>;
  steps: Passo[];
}
interface Workflow {
  on: Record<string, unknown>;
  jobs: Record<string, Job>;
}

const PORTOES_TEXTO = ler(".github/workflows/portoes.yml");
const MIGRACOES_TEXTO = ler(".github/workflows/migracoes.yml");
const PORTOES = parse(PORTOES_TEXTO) as Workflow;
const MIGRACOES = parse(MIGRACOES_TEXTO) as Workflow;

const passos = (w: Workflow) => Object.values(w.jobs).flatMap((j) => j.steps);
const comandos = (w: Workflow) =>
  passos(w)
    .map((p) => p.run ?? "")
    .join("\n");

describe("portoes.yml", () => {
  it("roda em pull_request, no ubuntu-latest", () => {
    expect(Object.keys(PORTOES.on)).toEqual(["pull_request"]);
    for (const job of Object.values(PORTOES.jobs)) {
      expect(job["runs-on"]).toBe("ubuntu-latest");
    }
  });

  it("pnpm pela versão do packageManager e Node 22 com cache de pnpm", () => {
    const pnpm = passos(PORTOES).find((p) =>
      p.uses?.startsWith("pnpm/action-setup@"),
    );
    expect(pnpm).toBeDefined();
    // sem `version`: o action lê o packageManager do package.json
    expect(pnpm?.with?.version).toBeUndefined();
    const pacote = JSON.parse(ler("package.json")) as {
      packageManager: string;
    };
    expect(pacote.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);

    const node = passos(PORTOES).find((p) =>
      p.uses?.startsWith("actions/setup-node@"),
    );
    expect(node?.with).toMatchObject({ "node-version": 22, cache: "pnpm" });
  });

  it("roda os portões na ordem: lint, typecheck, test, build, e2e e test:db", () => {
    const ordem = [
      "pnpm install --frozen-lockfile",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm build",
      "pnpm test:e2e",
      "pnpm test:db",
    ];
    const texto = comandos(PORTOES);
    const posicoes = ordem.map((c) => texto.indexOf(c));
    for (const [i, p] of posicoes.entries())
      expect(p, ordem[i]).toBeGreaterThan(-1);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it("guarda o Chromium do Playwright em cache e só instala o que falta", () => {
    const cache = passos(PORTOES).find((p) =>
      p.uses?.startsWith("actions/cache@"),
    );
    expect(cache?.with?.path).toBe("~/.cache/ms-playwright");
    expect(String(cache?.with?.key)).toContain("playwright");
    const texto = comandos(PORTOES);
    expect(texto).toContain("playwright install --with-deps chromium");
    expect(texto).toContain("playwright install-deps chromium");
  });

  it("sobe o Supabase local com a CLI do projeto", () => {
    expect(comandos(PORTOES)).toMatch(/pnpm exec supabase start/);
  });

  it("não usa secret nenhum (o test:db usa as chaves geradas no runner)", () => {
    expect(PORTOES_TEXTO).not.toMatch(/secrets\./);
  });
});

describe("migracoes.yml", () => {
  it("roda em push na main só com migração nova, e à mão", () => {
    expect(MIGRACOES.on).toEqual({
      push: { branches: ["main"], paths: ["supabase/migrations/**"] },
      workflow_dispatch: null,
    });
  });

  it("os três secrets vêm só de ${{ secrets.* }}", () => {
    const env = Object.values(MIGRACOES.jobs)[0].env;
    expect(env).toEqual({
      SUPABASE_ACCESS_TOKEN: "${{ secrets.SUPABASE_ACCESS_TOKEN }}",
      SUPABASE_DB_PASSWORD: "${{ secrets.SUPABASE_DB_PASSWORD }}",
      SUPABASE_PROJECT_REF: "${{ secrets.SUPABASE_PROJECT_REF }}",
    });
  });

  it("link e db push no projeto ligado, sem retry nem continue-on-error", () => {
    const texto = comandos(MIGRACOES);
    expect(texto).toContain(
      'pnpm exec supabase link --project-ref "$SUPABASE_PROJECT_REF"',
    );
    expect(texto).toMatch(/pnpm exec supabase db push --remote/);
    expect(texto).toContain("--skip-vault");
    expect(MIGRACOES_TEXTO).not.toMatch(/continue-on-error|retry/i);
  });

  it("avisa que migração destrutiva exige revisão manual", () => {
    expect(MIGRACOES_TEXTO).toMatch(/destrutiva exige revisão manual/);
  });
});

describe("nenhum segredo nos workflows", () => {
  it.each([
    ["portoes.yml", PORTOES_TEXTO],
    ["migracoes.yml", MIGRACOES_TEXTO],
  ])("%s: sem token, chave ou senha literal", (_nome, texto) => {
    // JWT (chaves do Supabase), tokens do Supabase (sbp_) e chaves novas (sb_secret_)
    expect(texto).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(texto).not.toMatch(/sbp_[A-Za-z0-9]{10,}/);
    expect(texto).not.toMatch(/sb_(secret|publishable)_/);
    // Toda variável com cara de segredo vem de ${{ secrets.* }}
    for (const linha of texto.split("\n")) {
      const atribuicao =
        /^\s*([A-Z_]*(TOKEN|PASSWORD|SECRET|KEY)[A-Z_]*):\s*(.+)$/.exec(linha);
      if (atribuicao) {
        expect(atribuicao[3].trim(), linha).toMatch(
          /^\$\{\{ secrets\.[A-Z_]+ \}\}$/,
        );
      }
    }
  });
});

describe("vercel.json", () => {
  it("cron diário às 9h (UTC) em /api/manter-ativo", () => {
    const vercel = JSON.parse(ler("vercel.json")) as {
      crons: { path: string; schedule: string }[];
    };
    expect(vercel.crons).toEqual([
      { path: "/api/manter-ativo", schedule: "0 9 * * *" },
    ]);
  });
});
