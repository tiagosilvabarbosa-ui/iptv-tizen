/* =====================================================================
   IPTV TIZEN - configurações gerais
   Para valores pessoais (ex.: endereço do seu relay), crie o arquivo
   js/config.local.js (ele NÃO vai para o GitHub). Veja config.local.example.js
   ===================================================================== */
var CONFIG = {
  /* Endereço do "relay" para adicionar lista pelo celular
     (o Worker da Cloudflare, ver pasta relay/ e o README).
     Ex.: "https://iptv-tizen.SEU-USUARIO.workers.dev"
     Também pode ser configurado direto na TV em Ajustes > Celular. */
  RELAY_URL: "",

  /* Chave gratuita do TMDB (themoviedb.org) - opcional.
     Usada só para buscar capas e sinopses quando a lista não traz.
     Também pode ser configurada na TV em Ajustes > Capas. */
  TMDB_KEY: "",

  /* Recarregar a lista automaticamente se o cache tiver mais de X horas */
  CACHE_HORAS: 12,

  VERSAO: "1.0.0"
};
