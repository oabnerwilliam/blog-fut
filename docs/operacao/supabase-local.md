# Supabase local (Docker)

O Supabase local roda no Docker Desktop, pela CLI que vem como dependência do projeto (`supabase`, devDependency). Nada daqui toca a produção.

## Comandos
| Comando | O que faz |
|---|---|
| `pnpm db:start` | Sobe o Supabase local e aplica as migrações de `supabase/migrations/`. Na primeira vez, baixa as imagens (alguns minutos). |
| `pnpm db:stop` | Para os containers. Os dados ficam guardados para o próximo `db:start`. |
| `pnpm db:reset` | Recria o banco do zero e reaplica as migrações. Apaga os dados locais. |
| `pnpm db:importar` | Copia `content/materias/*.md` e `content/tags.json` para o banco local. Pode rodar quantas vezes quiser: o que já está igual não é regravado. Use `--dir <pasta>` para importar outra pasta com o mesmo formato. |
| `pnpm test:db` | Sobe o banco (se já estiver no ar, não faz nada), roda `supabase db reset` e os testes de `tests/db/`. |

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

## Produção
Os comandos só miram a produção com `--prod`, que lê o `.env.prod.local` (veja `contas-v2.md`), mostra "Destino: PRODUÇÃO (<host>)" e pede confirmação `s/N`. Fora de um terminal interativo, como na sessão autônoma, é preciso passar `--sim`. Sem ele, o comando sai com código 1 sem fazer nada.
