<div align="center">

# 🎵 Canta, Alice

**Aprender inglês cantando — letras sincronizadas, tradução e suas músicas favoritas do Spotify.**

Um app feito com carinho para a Alice praticar inglês com as músicas que ela ama.
Conecte o Spotify, abra uma música, acompanhe a letra linha por linha como um
karaokê, veja a tradução em português e toque em qualquer palavra para guardá-la
no caderninho de vocabulário.

</div>

---

## ✨ O que ele faz

- **Cante junto** — letras sincronizadas (estilo karaokê) que acompanham a música em tempo real (Spotify Premium).
- **Entenda tudo** — tradução de cada linha para o português e toque em qualquer palavra para ver o significado.
- **Caderninho de vocabulário** — guarde palavras novas e pratique com flashcards.
- **Minhas músicas** — duas coleções: *Quero aprender* e *Já sei cantar*.
- **Acompanhe o progresso** — quantas músicas, quantas palavras, e continue de onde parou.
- **Lindo de viver nele** — fundo aurora animado, vidro fosco, tipografia elegante e tudo em português.

- **Instale como app** — no iPhone/iPad/Android dá pra adicionar à tela de início e abrir em tela cheia, com ícone próprio (PWA).
- **Atualiza sozinho** — quando você publica uma mudança, a página aberta da Alice detecta e se atualiza (sem precisar limpar cache).
- **Ajuda &amp; dicas** — um guia rápido dentro do app (botão de ajuda), com reconectar Spotify e "Atualizar agora".

A biblioteca da Alice fica salva **no próprio navegador** dela (localStorage) — sem
contas, sem servidor, privado.

> 📱 **Instalar na tela de início (iPhone/iPad):** abra o site no Safari → botão de
> compartilhar → *Adicionar à Tela de Início*. Vira um app de verdade, em tela cheia.

## 🧰 Tecnologia

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · Zustand · Spotify Web API + Web Playback SDK · [LRClib](https://lrclib.net) (letras) · MyMemory (tradução).

Tudo roda **100% no navegador** — perfeito para o GitHub Pages.

---

## 🚀 Como colocar no ar (passo a passo)

### 1. Crie um app no Spotify (grátis)

1. Acesse o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) e clique em **Create app**.
2. Dê um nome (ex.: *Canta Alice*) e uma descrição.
3. Em **Redirect URIs**, adicione **os dois** endereços abaixo (ajuste para o seu usuário/repositório):
   - Produção (GitHub Pages): `https://SEU_USUARIO.github.io/CantAlice/`
   - Desenvolvimento local: `http://127.0.0.1:5173/`
4. Em **APIs used**, marque **Web Playback SDK**.
5. Salve e copie o **Client ID** (ele é público — pode ficar visível).

> ⚠️ O endereço em *Redirect URIs* precisa bater **exatamente** com o do site, incluindo a barra `/` no final.

### 2. Coloque o Client ID

Você tem duas opções:

**Opção A — no código** (mais simples): abra `src/config.ts` e substitua
`PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE` pelo seu Client ID.

**Opção B — via GitHub** (não toca no código): em **Settings → Secrets and
variables → Actions → Variables**, crie uma variável chamada
`SPOTIFY_CLIENT_ID` com o seu Client ID. O deploy usa esse valor
automaticamente.

### 3. Ative o GitHub Pages

Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.

### 4. Faça o deploy

Dê `push` na branch `main` (ou rode o workflow manualmente em **Actions →
Deploy to GitHub Pages → Run workflow**). Em ~1 minuto o site estará no ar em:

```
https://SEU_USUARIO.github.io/CantAlice/
```

> Se o seu repositório tiver outro nome, ajuste o `base` em `vite.config.ts`
> (ou defina a variável de ambiente `BASE_PATH`).

---

## 🔑 Liberar acesso para outras pessoas

O app do Spotify começa em **Development Mode**, então só contas que você
adicionar (em **Dashboard → seu app → User Management**) conseguem conectar.
Para facilitar, o site tem um botão **"Pedir acesso"**: quem for barrado
informa o e-mail do Spotify e envia para você num toque.

Para o envio em um toque, defina (opcional) o seu contato — como variáveis de
build ou editando `OWNER` em `src/config.ts`:

- `VITE_OWNER_WHATSAPP` — só números, com código do país (ex.: `5511999998888`)
- `VITE_OWNER_EMAIL` — seu e-mail

Sem isso, o botão ainda funciona oferecendo "copiar mensagem".

---

## ☁️ Sincronização na nuvem (opcional, mas recomendado)

Por padrão, o progresso (músicas, vocabulário, sequência) fica salvo **no
navegador** (localStorage). Isso é privado e simples, mas no iOS pode ser
apagado ao limpar dados do Safari e **não sincroniza entre aparelhos**.

Ative a **sincronização na nuvem** para que o progresso fique **vinculado à
conta do Spotify** e acompanhe a Alice no iPad e no celular. Usamos o
[Supabase](https://supabase.com) (gratuito) — sem servidor próprio.

1. Crie um projeto grátis no [Supabase](https://supabase.com/dashboard).
2. **SQL Editor → New query**: cole e rode o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) (cria a tabela e tranca o acesso
   com RLS).
3. **Edge Functions → Create a function**, nome **`progress`**, cole o conteúdo
   de [`supabase/functions/progress/index.ts`](supabase/functions/progress/index.ts)
   e **Deploy**. (Ou via CLI: `supabase functions deploy progress`.)
   - ⚠️ **Desligue "Verify JWT"** na função (Settings da função). As novas chaves
     do Supabase (`sb_publishable_…`) não são JWT, então com o gate ligado a
     função recusa toda chamada do app. É seguro desligar: a `progress` confere a
     identidade pelo token do Spotify por conta própria.
4. Em **Project Settings → API**, copie o **Project URL** e a **anon public key**.
5. No GitHub, em **Settings → Secrets and variables → Actions → Variables**,
   crie duas variáveis:
   - `SUPABASE_URL` → o Project URL (ex.: `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` → a anon public key
6. Rode o deploy de novo. Pronto — ao conectar o Spotify, o progresso passa a
   sincronizar entre os aparelhos.

**Como é seguro:** a *anon key* é pública por natureza. A tabela fica trancada
por RLS (ninguém acessa direto com ela). Só a Edge Function acessa os dados, e
ela **verifica a identidade pelo token do Spotify** (chama `/me`), então cada
pessoa só lê/grava o próprio progresso. A *service role key* nunca sai do
Supabase.

> Sem essas variáveis, o app continua funcionando normalmente, só que o
> progresso fica apenas no aparelho.

---

## 🌎 Tradutor + exemplos (opcional: DeepL)

O app tem uma aba **Tradutor** (estilo Reverso Context): traduz palavras/frases e
mostra **exemplos reais bilíngues** (do [Tatoeba](https://tatoeba.org), corpus
aberto), que dá pra guardar direto no baralho de revisão.

A tradução já funciona sem configurar nada (usa o Google gratuito). Para usar o
**DeepL** (qualidade ainda melhor), publique a segunda Edge Function e guarde a
chave como **secret** (ela nunca vai para o navegador):

1. **Edge Functions → Create a function**, nome **`translate`**, cole o conteúdo
   de [`supabase/functions/translate/index.ts`](supabase/functions/translate/index.ts)
   e **Deploy**. (Ou via CLI: `supabase functions deploy translate`.)
   - ⚠️ **Desligue "Verify JWT"** nesta função também — senão o app cai no Google
     + Wiktionary (sem DeepL nem Tatoeba). A `translate` não acessa dados de
     usuário, então deixá-la sem gate é seguro. Quem usa a CLI já recebe isso via
     [`supabase/config.toml`](supabase/config.toml).
2. Pegue uma chave grátis em [DeepL API Free](https://www.deepl.com/pro-api)
   (500 mil caracteres/mês) e guarde como secret:
   - No painel: **Edge Functions → translate → Secrets → Add** `DEEPL_API_KEY`.
   - Ou via CLI: `supabase secrets set DEEPL_API_KEY=suachave:fx`
     (a chave grátis termina em `:fx`).

Sem o DeepL, a função ainda serve os exemplos do Tatoeba e a tradução cai no
Google automaticamente. O Tatoeba é proxyado pela função porque não tem CORS.

---

## 💻 Rodando localmente

```bash
npm install
npm run dev      # http://127.0.0.1:5173/
```

> Use **127.0.0.1**, não `localhost` — o Spotify exige o IP de loopback no redirect URI.

Outros comandos:

```bash
npm run build    # gera o site otimizado em dist/
npm run preview  # serve o build localmente
npm run lint     # checagem de tipos (tsc)
```

---

## 🎧 Premium vs. conta grátis

| Recurso | Premium | Grátis |
| --- | :---: | :---: |
| Tocar a música **inteira** | ✅ | ❌ (prévia de 30s) |
| Letra **sincronizada** (karaokê) | ✅ | ⚠️ letra estática |
| Tradução + vocabulário | ✅ | ✅ |

A sincronização em tempo real depende do **Web Playback SDK**, que só funciona
com Spotify Premium. Sem Premium, a Alice ainda ouve a prévia, lê a letra
completa, vê as traduções e monta o vocabulário.

---

## 📁 Estrutura

```
src/
  config.ts            # Client ID, scopes, endpoints
  spotify/             # auth (PKCE), Web API, Web Playback SDK
  lyrics/              # LRClib (letras) + tradução (MyMemory)
  store/               # estado (Zustand): biblioteca, sessão, navegação
  hooks/               # player e reprodução do karaokê
  components/          # UI (aurora, nav, letras, player, etc.)
  pages/               # Início, Buscar, Minhas músicas, Vocabulário, Karaokê
```

---

Feito com 💛 para a Alice cantar e aprender.
