# T05: Entrada automática das matérias do squad

**Status:** registrada
**Branch sugerida:** feat/T05-entrada-automatica-do-squad
**Registrada em:** 2026-11-24, a pedido do usuário.
**Ligada a:** tarefas S01 a S03 do squad-fut (`squad-fut/tarefas/FILA.md`) e história [24](../backlog/24-pautas-no-painel.md).

## Problema

Hoje a matéria do squad-fut só chega ao banco pelo PC do usuário. O diagramador grava em `content/entrada/` (caminho `D:\...`), e alguém roda `pnpm materia:enviar` e depois `pnpm materia:publicar`. O usuário quer que uma rotina na nuvem (Claude Code `/schedule`, todo dia às 7h de Brasília) produza a matéria e a **publique direto**, com o PC desligado.

Decisões tomadas com o usuário:

- Com o checador aprovado, a matéria é publicada direto.
- Sem a aprovação final do checador, depois de até 2 rodadas de correção no squad, ela entra como rascunho.
- O squad só conhece um token; a chave do Supabase não sai da Vercel.

## Critérios de aceite

1. **`POST /api/entrada`** recebe `Authorization: Bearer <token>` e um corpo JSON com dois campos:
   - `{ materia, checagem }`;
   - `materia` é o `.md` completo (frontmatter + corpo), no mesmo formato da caixa de entrada;
   - `checagem` é `"aprovada"` ou `"com_ressalvas"`.

   O token é comparado com `SQUAD_ENTRADA_TOKEN` usando `segredoConfere` (`src/lib/segredo.ts`), antes de ler o corpo.
2. A matéria passa pela mesma validação do `materia:enviar` (parser e schema do site) e é gravada por `enviar_materia_do_squad`. A revisão 1 continua sendo o texto literal.
   - Com `checagem = "aprovada"`, a rota chama em seguida `publicar_revisao` e a matéria vai ao ar. O cache é invalidado pelo webhook que já existe (`/api/revalidar`, história 14); confira que isso basta.
   - Com `"com_ressalvas"`, ela fica como rascunho.
3. Respostas:

   | Código | Quando | Corpo |
   |---|---|---|
   | 201 | Gravada | `{ slug, status: "publicada" \| "rascunho" }` |
   | 400 | Matéria ou corpo inválido | A mensagem do parser |
   | 401 | Token errado ou ausente | — |
   | 409 | O slug já existe | `MENSAGEM_SLUG_EXISTENTE` |

   Se a variável não estiver configurada, a rota responde 401 sempre; nunca fica aberta.
4. **`GET /api/materias/recentes`**, com o mesmo token, devolve `[{ slug, titulo, tags, publicado_em }]` das matérias dos últimos 7 dias. O squad usa a lista para não repetir assunto.
5. Testes:
   - unitários da validação e da decisão publicar/rascunho;
   - de integração com o banco (`tests/integration` ou `tests/db`) para 201 publicada, 201 rascunho, 409, 400 e 401;
   - uma fixture fictícia (`ficticio: true`) no corpo.

   Os cinco portões e o `pnpm test:db` passam.
6. Documentação:
   - **`docs/operacao/materias.md`:** como chamar a rota com `curl` e como gerar o token (`openssl rand -hex 32`, cadastrado na Vercel com `vercel env add`, nunca commitado). Diz também que o envio pelo PC (`materia:enviar`/`materia:publicar`) continua valendo.
   - **`CLAUDE.md`:** a regra "Publicar é decisão do usuário" passa a ser "A matéria do squad aprovada pelo checador é publicada automaticamente; o usuário pode despublicar pelo painel".

## Notas técnicas

- **Reaproveitamento:** `scripts/lib/materias.ts` já tem `dadosDoEnvio`, `enviarMateria` e `publicarMateria`. Falta uma variante de `lerMateriaDaEntrada` que leia de uma **string** em vez de um arquivo; o parser hoje é `lerArtigoDoArquivo`. O ideal é mover a lógica comum para `src/lib/` e fazer os scripts importarem de lá, sem duplicar.
- **Cliente de serviço na rota:** é preciso a chave `service_role` no servidor da Vercel. Confira se ela já está cadastrada; se não, cadastre-a só para o ambiente de produção e nunca a exponha com `NEXT_PUBLIC_`.
- **Dois passos sem transação:** enviar e publicar são duas chamadas. Se a publicação falhar depois do envio, a rota responde 500 dizendo que a matéria ficou como rascunho, para não mentir sobre o status.
- **Limite de tamanho:** a Vercel aceita até 4,5 MB no corpo, folga de sobra para um `.md`.
- **Versão do Next:** antes de escrever o route handler, consulte `node_modules/next/dist/docs/` (Next 16).
