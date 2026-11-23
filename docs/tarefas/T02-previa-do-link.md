# T02: Prévia do link no WhatsApp (imagem Open Graph)

**Status:** feita (#27)
**Branch sugerida:** feat/T02-previa-do-link
**Registrada em:** 2026-11-22, a pedido do usuário.

## Problema

Quando alguém manda o link de uma matéria no WhatsApp (ou no Telegram, no X ou no LinkedIn), a prévia sai sem imagem. O site já publica `og:title`, `og:description`, `og:type` e `og:url` (`src/lib/seo.ts`), mas não publica `og:image`. O `twitter:card` é `summary`, a versão pequena.

## Critérios de aceite

1. **Imagem por matéria:** `src/app/(site)/materias/[slug]/opengraph-image.tsx` gera uma imagem de 1200×630 com `ImageResponse` (`next/og`), na identidade visual do portal (tokens de `docs/design/`): o nome do portal, a editoria e o título da matéria, sem cortar o texto em títulos longos. Os dados vêm de `getRepository()`, conforme a regra do repositório. Antes de escrever, consulte `node_modules/next/dist/docs/` sobre `opengraph-image`, sobre como os metadados dessa rota se comportam com Cache Components e sobre as fontes no `ImageResponse`.
2. **Imagem padrão:** a capa, as editorias, as tags e a busca usam uma imagem do portal (`src/app/(site)/opengraph-image.tsx` ou um arquivo estático).
3. **Metadados:** as páginas das matérias passam a ter `og:image` com URL absoluta (a partir do `SITE_URL`), `og:image:width`, `og:image:height`, `og:image:alt` e `twitter:card` igual a `summary_large_image`. Um teste confere as tags no HTML da matéria e da capa.
4. **Tamanho e cache:** a imagem sai em PNG ou JPEG com menos de 300 KB, porque o WhatsApp descarta imagens grandes. Ela é invalidada pelas mesmas etiquetas da matéria (`materia:<slug>`), para que um título editado no painel apareça na prévia nova.
5. **Fictícias:** a imagem de uma matéria fictícia leva o selo "Exemplo".
6. **Conferência no ar:** depois do deploy, o link de uma matéria real colado no [Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/), que usa a mesma leitura do WhatsApp, mostra a imagem. O resultado é registrado no PR.

## Notas

- Com UI nova (a arte da imagem), o designer entra antes do dev, e o usuário aprova a arte.

## Decisões do usuário (2026-11-23)

- **Fontes:** exceção restrita à regra do `fs`. Só `src/lib/og/fontes.ts` lê `assets/fontes/*.ttf` (TTF estáticas, licença OFL). A exceção fica registrada no `CLAUDE.md`.
- **Arte:** o designer apresenta duas ou três direções, e o usuário escolhe uma.
- **Conferência no ar:** o orquestrador confere por `curl` as tags e a imagem na produção (status, tipo e tamanho). O usuário cola o link no Sharing Debugger ou no WhatsApp e informa o resultado, que é registrado no PR.
