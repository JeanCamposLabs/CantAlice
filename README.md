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
