import { revalidateTag } from "next/cache";
import {
  etiquetasParaInvalidar,
  payloadDeRevalidacao,
} from "@/lib/revalidacao";
import { segredoConfere } from "@/lib/segredo";

/**
 * `POST /api/revalidar`: o webhook do banco (`pg_net`, migração da história 14) avisa
 * que `articles` ou `tags` mudou, e o cache das leituras é invalidado pelas etiquetas.
 *
 * `revalidateTag(etiqueta, { expire: 0 })`: num route handler, o `updateTag` não existe
 * (só em Server Actions), e a doc do `revalidateTag` manda usar `{ expire: 0 }` quando a
 * chamada vem de um webhook e o dado precisa sumir na hora. Com o perfil `"max"`, a
 * primeira visita depois de despublicar ainda veria a matéria (stale-while-revalidate).
 * Ver ADR 0008, §7.
 */
const NAO_AUTORIZADO = { erro: "não autorizado" } as const;
const PAYLOAD_INVALIDO = { erro: "payload inválido" } as const;

export async function POST(request: Request): Promise<Response> {
  // O segredo vem antes de ler o corpo: sem ele, nada do pedido é processado.
  if (
    !segredoConfere(
      request.headers.get("x-revalidate-secret"),
      process.env.REVALIDATE_SECRET,
    )
  ) {
    return Response.json(NAO_AUTORIZADO, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json(PAYLOAD_INVALIDO, { status: 400 });
  }
  const payload = payloadDeRevalidacao.safeParse(corpo);
  if (!payload.success) {
    return Response.json(PAYLOAD_INVALIDO, { status: 400 });
  }

  const revalidado = etiquetasParaInvalidar(payload.data);
  for (const etiqueta of revalidado) revalidateTag(etiqueta, { expire: 0 });
  return Response.json({ revalidado });
}
