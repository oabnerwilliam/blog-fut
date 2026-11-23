# Matérias: da caixa de entrada ao site

Desde a história 15, as matérias do squad-fut vão para o banco (Supabase), e não mais para o git. O `content/materias/` continua no repositório só como fixture de dev e testes.

## O fluxo

```
diagramador (squad-fut)
  → content/entrada/<slug>.md          (fora do git)
  → pnpm materia:enviar <slug>         (versionador)
  → rascunho no banco                  (fora do site)
  → pnpm materia:publicar <slug>       (só quando o usuário pedir)
  → publicada; o webhook invalida o cache do site
```

1. **Diagramador.** Grava `content/entrada/<slug>.md` no formato da v1 (frontmatter + corpo).
2. **`pnpm materia:enviar <slug>`**:
   - valida o arquivo com o mesmo parser e schema do site. Se o frontmatter for inválido, sai com código 1, cita o arquivo e o campo e não grava nada;
   - chama a função SQL `public.enviar_materia_do_squad`, que numa transação só insere as tags que faltam (com o rótulo humanizado), a matéria (`status = rascunho`, `fonte = squad`) e a revisão 1 com o corpo literal. Os finais de linha viram LF, e nada mais muda;
   - só depois de o banco confirmar, move o arquivo para `content/entrada/enviadas/<slug>.md`;
   - se o slug já existir, sai com código 1 e a mensagem "Já existe uma matéria com o slug <slug>. Edite pelo painel.", sem mover o arquivo.
3. **Rascunho.** A matéria está no banco, mas o site não a mostra: o RLS só deixa o visitante ler `status = publicado`. Gravar um rascunho também não invalida o cache.
4. **`pnpm materia:publicar <slug>`**: chama `public.publicar_revisao`, que copia a revisão em edição para a matéria, marca `publicado` e aponta `revisao_publicada` para ela. Na primeira publicação, o `publicado_em` é a data do frontmatter; numa matéria já publicada antes, ele não muda. Se a revisão em edição já for a publicada, o comando diz "Nada a publicar" e sai com código 0. Slug inexistente: código 1.

Os arquivos de `content/entrada/` e `content/entrada/enviadas/` ficam fora do git (`.gitignore`).

## Exemplos

No Supabase local (padrão, lê o `.env.local`):
```bash
pnpm materia:enviar o-gol-do-zaguenho
pnpm materia:publicar o-gol-do-zaguenho
```

Na produção (lê o `.env.prod.local`, mostra `Destino: PRODUÇÃO (<host>)`):
```bash
pnpm materia:enviar o-gol-do-zaguenho --prod --sim
pnpm materia:publicar o-gol-do-zaguenho --prod --sim
```
Num terminal, sem `--sim`, o comando pergunta `s/N`. Fora de um terminal (sessão autônoma), `--prod` sem `--sim` sai com código 1 sem tocar no banco.

## Problemas comuns
| Mensagem | O que fazer |
|---|---|
| `Arquivo não encontrado: .../content/entrada/<slug>.md` | Confira o slug (o nome do arquivo sem `.md`). |
| `Matéria inválida em ...` | O squad-fut corrige o arquivo; depois, rode de novo. |
| `Já existe uma matéria com o slug ...` | Reenviar é decisão do painel (histórias 16 e 17). |
| `... foi gravada no banco como rascunho, mas o arquivo não foi movido` | O banco já tem a matéria. Mova o arquivo à mão para `enviadas/`. |

## Prévia do link (WhatsApp, LinkedIn)

Cada matéria tem uma imagem de prévia (`/materias/<slug>/opengraph-image-…`) que o site refaz quando a matéria muda (etiqueta `materia:<slug>`). A URL da imagem, porém, não muda. Por isso, quem já guardou a prévia (WhatsApp, Facebook, LinkedIn) pode continuar mostrando a antiga por um tempo. Depois de editar o título de uma matéria já compartilhada:

- **WhatsApp e Facebook:** cole o link no [Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/) e clique em "Scrape Again".
- **LinkedIn:** cole o link no [Post Inspector](https://www.linkedin.com/post-inspector/).
