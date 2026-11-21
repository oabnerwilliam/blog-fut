import { cutucarBanco } from "@/lib/content";
import { segredoConfere } from "@/lib/segredo";

/**
 * `GET /api/manter-ativo`: o cron diário da Vercel (`vercel.json`, `0 9 * * *`) faz uma
 * leitura leve, para o Supabase do plano gratuito não pausar por inatividade (U11).
 *
 * A Vercel manda `Authorization: Bearer <CRON_SECRET>` quando a variável existe no
 * projeto. Sem ela (ou com outro valor), 401. Ler o header primeiro também tira a rota do
 * prerender: com Cache Components, um GET que lê `request.headers` roda na requisição
 * (doc "Route Handlers", "With Cache Components").
 */
const SEM_CACHE = { "cache-control": "no-store" } as const;

export async function GET(request: Request): Promise<Response> {
  const autorizacao = request.headers.get("authorization");
  const recebido = autorizacao?.startsWith("Bearer ")
    ? autorizacao.slice("Bearer ".length)
    : null;
  if (!segredoConfere(recebido, process.env.CRON_SECRET)) {
    return Response.json(
      { erro: "não autorizado" },
      { status: 401, headers: SEM_CACHE },
    );
  }

  const ok = await cutucarBanco();
  return Response.json({ ok }, { status: ok ? 200 : 503, headers: SEM_CACHE });
}
