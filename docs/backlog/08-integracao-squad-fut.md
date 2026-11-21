# 08: Integração com o squad-fut (primeira matéria real)

**Status:** pronta (depois do merge da 07)
**Branch:** `content/psg-balanco-temporada-2026-27-mercado-elenco-curto`
**Tipo:** conteúdo + ajuste de testes. Sem UI nova.
**Escrita por:** orquestrador, a partir do plano da v1 (história 8) e da spec (seção 7). O usuário pediu desenvolvimento autônomo em 2026-11-20.

## História
Como squad-fut, quero que a matéria que o diagramador deixa na caixa de entrada vire uma página publicada no Blog Fut, com o texto exatamente igual ao `final.md`.

## Já feito pelo orquestrador (fora do git)
- `squad-fut/.claude/agents/diagramador.md` ganhou a seção "Segunda entrega: caixa de entrada do Blog Fut" (frontmatter da spec 6.2, editoria da lista fechada, de 3 a 6 tags, corpo literal e conferência).
- `squad-fut/CLAUDE.md` menciona a nova entrega na tabela da equipe e no texto.
- A matéria do PSG foi convertida para `content/entrada/psg-balanco-temporada-2026-27-mercado-elenco-curto.md`. A conferência byte a byte do corpo contra o `final.md`, sem o título e a linha fina, bateu: sha256 `7f35277c…ed78c`, 8085 bytes.

## Critérios de aceite
1. O **versionador** cria a branch `content/psg-balanco-temporada-2026-27-mercado-elenco-curto` a partir da `main`, move o arquivo para `content/materias/` e acrescenta `"psg": "PSG"` ao `content/tags.json`. A humanização automática daria "Psg"; as outras tags (Ligue 1, Champions League, Luis Enrique, Kvaratskhelia) já saem certas.
2. O corpo publicado é idêntico ao `final.md`, sem título e sem linha fina. Um teste de integração lê os dois arquivos e compara o texto, ignorando a diferença CRLF/LF. Como o `squad-fut` fica fora deste repositório, o teste fica `skip` quando o arquivo de origem não existir (CI). Fica registrado também o hash conferido.
3. O frontmatter valida no schema (`pnpm build` sem erro). A `editoria` é `analise`, há 5 tags e a matéria não é fictícia.
4. A **capa** mostra o PSG no destaque, sem selo "Exemplo". As fictícias continuam nas Últimas e nas faixas.
5. `/materias/psg-balanco-temporada-2026-27-mercado-elenco-curto`:
   - responde 200, sem aviso de conteúdo fictício e sem `noindex`;
   - o canonical aponta para a própria página;
   - o JSON-LD é `NewsArticle`.
6. O `sitemap.xml` passa a listar a capa, a matéria do PSG, `/editorias/analise` e as 5 tags do PSG. Nenhuma fictícia entra, e nenhuma lista só de fictícias também. `/editorias/analise` e as tags do PSG deixam de ter `noindex`.
7. Os testes que partiam de "todas as matérias são fictícias" são atualizados: destaque da capa, sitemap só com a capa, contagens e listas das páginas.
   - O e2e da capa passa a conferir o PSG no destaque e que nenhuma fictícia ocupa o destaque, conforme o critério da spec.
   - As referências do `visual.spec.ts` que mudarem (capa, editoria) são regeneradas de propósito.
   - Entra um screenshot da matéria do PSG em 375px e em 1280px, nos temas claro e escuro.
8. Os cinco portões passam.

## Notas
- Esta história junta conteúdo e testes num PR só, porque sem os testes os portões não ficam verdes.
- Quem escreve os ajustes de teste é o dev. O versionador cuida só do git da matéria e do `tags.json`.
