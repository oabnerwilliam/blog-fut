# Supabase local (Docker)

O Supabase local roda no Docker Desktop, pela CLI que vem como dependência do projeto (`supabase`, devDependency). Nada daqui toca a produção.

## Comandos
| Comando | O que faz |
|---|---|
| `pnpm db:start` | Sobe o Supabase local e aplica as migrações de `supabase/migrations/`. Na primeira vez, baixa as imagens (alguns minutos). |
| `pnpm db:stop` | Para os containers. Os dados ficam guardados para o próximo `db:start`. |
| `pnpm db:reset` | Recria o banco do zero e reaplica as migrações. Apaga os dados locais. |
| `pnpm db:importar` | Copia `content/materias/*.md` e `content/tags.json` para o banco local. Pode rodar quantas vezes quiser: o que já está igual não é regravado. Use `--dir <pasta>` para importar outra pasta com o mesmo formato. Nunca apaga: se houver matéria publicada no banco que não está na pasta, só avisa ("no banco, mas não no disco: ..."). |
| `pnpm materia:enviar <slug>` | Envia `content/entrada/<slug>.md` ao banco como rascunho e move o arquivo para `content/entrada/enviadas/`. Veja `materias.md`. |
| `pnpm materia:publicar <slug>` | Publica a revisão em edição da matéria. Veja `materias.md`. |
| `pnpm admin:promover <email>` | Torna admin (`aprovado`) o perfil desse e-mail. A pessoa precisa ter entrado uma vez em `/admin/entrar`. Veja `contas-v2.md`, passo 7, e o ADR 0009. |
| `pnpm test:db` | Sobe o banco (se já estiver no ar, não faz nada), roda `supabase db reset` e os testes de `tests/db/`. No fim, limpa as tabelas e reimporta o `content/` real (`tests/db/global-teardown.ts`), então o banco local sempre termina igual ao `content/`. Se os testes forem interrompidos no meio, rode `pnpm db:reset` e `pnpm db:importar`. |

Os testes de banco **não** usam o `.env.local`: eles leem a URL e as chaves do `supabase status`.

O `config.toml` local desliga o que o blog não usa (realtime, storage, edge functions e analytics) e mantém só o provedor de e-mail, para os testes de login das próximas histórias. O Studio fica em http://127.0.0.1:54323.

## Gerar o `.env.local`
O `.env.local` é usado pelos comandos (`pnpm db:importar`) e pelo `next dev`/`next build` quando você quiser ver o site lendo do banco local. Ele está no `.gitignore` e nunca vai para o git.

Com o banco no ar (`pnpm db:start`), rode na raiz do projeto, no Git Bash:

```bash
pnpm exec supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' > .env.local
```

O arquivo fica com três linhas:
```
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<chave anon local>"
SUPABASE_SERVICE_ROLE_KEY="<chave service_role local>"
```

As chaves locais são as de desenvolvimento da CLI e só valem na sua máquina. Mesmo assim, não cole esse arquivo em lugar nenhum.

**Não coloque `CONTENT_SOURCE` no `.env.local`.** O Next carrega esse arquivo em todo `next build`, e os portões (`pnpm build`, `pnpm test:e2e`) precisam continuar com `files`.

## Ver o site lendo do banco local
```bash
pnpm db:start
pnpm db:importar
CONTENT_SOURCE=supabase pnpm build
CONTENT_SOURCE=supabase pnpm start
```
Depois, rode `pnpm build` de novo (sem a variável) antes dos portões.

## Webhook de invalidação no local (`pnpm db:vault`)
Toda gravação em `articles` e `tags` dispara um trigger que chama `POST <site>/api/revalidar` pelo `pg_net` (história 14, ADR 0008 §7). A URL e o segredo ficam no Vault do banco. Sem eles, o trigger não faz nada, e é assim que o banco local fica depois do `pnpm db:reset` e dos testes.

**O Postgres roda dentro do Docker.** Para ele, `localhost` é o próprio container, e não a sua máquina. Por isso, a base local é `http://host.docker.internal:<porta>`:
- no Docker Desktop (Windows e macOS), esse nome sempre existe;
- no Linux (o runner do CI), o Supabase CLI 3.x cria os containers com `host.docker.internal:host-gateway`;
- se um Linux não resolver o nome, use o IP do gateway da rede do Supabase: `docker network inspect supabase_network_blog-fut -f '{{(index .IPAM.Config 0).Gateway}}'`. Os testes aceitam esse IP pela variável `HOST_DO_SITE_NO_DOCKER`, e o `portoes.yml` já faz essa troca sozinho.

Para ver o webhook funcionando com o site local:
1. Ponha `REVALIDATE_SECRET=<um texto aleatório de 16+ caracteres>` no `.env.local`. O `next start` lê esse arquivo, e o `pnpm db:vault` também.
2. Rode `pnpm db:vault --url http://host.docker.internal:3000`. Sem `--url`, a base é o `SITE_URL` do arquivo, e o `.env.local` não deve ter `SITE_URL` (ele mudaria os links do build local).
3. Rode `CONTENT_SOURCE=supabase pnpm build` e depois `CONTENT_SOURCE=supabase pnpm start`.
4. Grave algo no Studio (http://127.0.0.1:54323) e recarregue a capa.

O comando nunca imprime o segredo. Para desligar o webhook local, rode `pnpm db:reset` (e depois `pnpm db:importar`).

## Testes que sobem o site
| Comando | O que faz |
|---|---|
| `pnpm test:e2e` | A suíte da v1 (`playwright.config.ts`, build com `files`) e, no fim, `test:e2e:sem-banco`. Não precisa de Docker. |
| `pnpm test:e2e:sem-banco` | Build e servidor com `CONTENT_SOURCE=supabase` apontando para `http://127.0.0.1:9`, onde não há banco. Confere que o build passa e que a capa mostra a tela de erro, sem stack. |
| `pnpm test:e2e:db` | Build e servidor contra o Supabase local, com o Vault apontando para `http://host.docker.internal:3102`. Grava, edita e despublica uma matéria direto no banco e confere o site em até 5 s. No fim, o banco volta ao `content/` e o Vault fica vazio. Roda dentro do `pnpm test:db`. Também cobre o admin (história 16, `tests/e2e-db/admin.spec.ts`), com `ADMIN_HABILITADO=true`. |

Os dois e2e alternativos fazem o build em `.next-testes/sem-banco` e `.next-testes/db` (variável `BUILD_DE_TESTE`). O `.next` continua sendo o build com `files` dos portões. O `next-env.d.ts` (fora do git) passa a apontar para a pasta do último build, e o `pnpm typecheck` o refaz.

O `pnpm test:e2e:db` usa `TTL_DO_INDICE_MS_TESTE=1000`, que faz o índice de rotas do Proxy recarregar a cada 1 s, e não a cada 60 s. **Essa variável é só desse teste.** Nunca a configure na Vercel.

## Admin no local (história 16)
O provedor Google fica **desligado** no Supabase local: não há credencial OAuth de teste, e o `config.toml` não liga o `[auth.external.google]`. O que funciona no local:

- `/admin/entrar` abre, e o botão "Entrar com Google" leva ao endereço de autorização do Auth local (`/auth/v1/authorize?provider=google…`), que responde com erro de provedor desligado. O login de verdade só se testa na produção.
- O `additional_redirect_urls` do `config.toml` já aceita `http://127.0.0.1:3000/admin/auth/callback` e `http://localhost:3000/admin/auth/callback` (o `pnpm dev`). Depois de mudar o `config.toml`, rode `pnpm db:stop` e `pnpm db:start` para o Auth ler a lista nova.
- Os testes (`pnpm test:db`) entram sem o Google: criam usuários `@exemplo.test` com senha pela chave de serviço e injetam no navegador os cookies que o próprio `@supabase/ssr` gera (`tests/helpers/sessao-supabase.ts`). O login por senha só existe no local.
- Para ver o painel no `pnpm dev`, ligue `ADMIN_HABILITADO=true` no `.env.local`. Sem um login Google no local, a tela que dá para ver de ponta a ponta é a de entrar; o resto é coberto pelo e2e.

## Produção
Os comandos só miram a produção com `--prod`, que lê o `.env.prod.local` (veja `contas-v2.md`), mostra "Destino: PRODUÇÃO (<host>)" e pede confirmação `s/N`. Fora de um terminal interativo, como na sessão autônoma, é preciso passar `--sim`. Sem ele, o comando sai com código 1 sem fazer nada.
