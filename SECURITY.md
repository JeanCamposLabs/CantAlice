# Política de Segurança

## Como reportar uma vulnerabilidade

Encontrou algo? Abra uma [issue no GitHub](../../issues) — ou, se o problema
for sensível (permitir acesso a dados de outra pessoa, vazar uma chave), use
[**Report a vulnerability**](../../security/advisories/new) (aba *Security* do
repositório) para reportar em privado. Respondemos assim que possível; este é
um projeto pessoal, sem SLA formal.

Apenas a versão publicada (branch `main`) recebe correções.

## Modelo de segurança do app

Resumo de como o projeto se protege — útil para saber o que *é* e o que *não é*
uma vulnerabilidade aqui:

- **Site 100% estático (GitHub Pages).** Não há servidor próprio nem banco de
  dados exposto. O login do Spotify usa *Authorization Code with PKCE*: o
  **Client ID é público por design** e **não existe client secret** no código —
  encontrá-lo no bundle não é uma vulnerabilidade.
- **Tokens do Spotify ficam no `localStorage`** do aparelho da própria pessoa,
  padrão em SPAs sem backend. Eles dão acesso apenas à conta de quem logou.
- **As Edge Functions do Supabase (`progress`, `translate`, `converse`)
  autenticam cada chamada pelo token do Spotify** (validado contra
  `https://api.spotify.com/v1/me`): cada pessoa só lê/grava o próprio
  progresso. A tabela `progress` fica trancada por RLS sem policies — a *anon
  key* pública não alcança nada; só a função (service role) acessa, e a
  *service role key* nunca sai do Supabase.
- **As chaves pagas (DeepL, Anthropic, OpenAI) são *secrets* do Supabase** e
  nunca chegam ao navegador. As funções que gastam essas cotas (`translate` e
  `converse`) exigem login do Spotify e respeitam a allowlist opcional
  `ALLOWED_SPOTIFY_USERS`, além de limites de tamanho de payload.
- **A *anon key* do Supabase e o *project ref* são públicos por natureza** —
  aparecer no bundle ou nos workflows não é uma vulnerabilidade.

Se você encontrar um caminho que fure alguma dessas garantias (ler o progresso
de outra pessoa, gastar cota paga sem login, extrair uma chave secreta), isso
é exatamente o que queremos saber — obrigado! 💛
