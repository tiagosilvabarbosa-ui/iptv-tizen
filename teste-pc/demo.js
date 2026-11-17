(function(){
  var L=['#EXTM3U'];
  var ch=[['Canal 1 Notícias','Notícias'],['Esporte Max','Esportes'],['Esporte Max 2','Esportes'],['Cine Prime','Filmes'],['Ação HD','Filmes'],['Kids Fun','Infantil'],['Música Hits','Música'],['Doc World','Documentários'],['Novela+','Variedades'],['Brasil Aberto','Abertos'],['Arena Sports','Esportes'],['Notícias 24h','Notícias'],['Desenhos TV','Infantil'],['Clássicos FM','Música']];
  ch.forEach(function(c,i){L.push('#EXTINF:-1 tvg-id="c'+i+'" tvg-logo="" group-title="'+c[1]+'",'+c[0]);L.push('http://exemplo.invalid/live/'+i+'.ts')});
  var mv=[['Horizonte Vermelho',2025,'Filmes | Ação'],['A Última Fronteira',2024,'Filmes | Ficção'],['Cidade de Neon',2025,'Filmes | Suspense'],['O Silêncio do Mar',2023,'Filmes | Drama'],['Operação Eclipse',2025,'Filmes | Ação'],['Raízes',2024,'Filmes | Nacional'],['Noite Sem Fim',2025,'Filmes | Terror'],['O Guardião',2024,'Filmes | Ação'],['Ecos do Passado',2023,'Filmes | Drama'],['Tempestade',2025,'Filmes | Ação'],['Labirinto Azul',2024,'Filmes | Suspense'],['Aurora',2025,'Filmes | Drama'],['Os Invisíveis',2024,'Filmes | Ficção'],['Linha de Fogo',2023,'Filmes | Ação'],['Maré Alta',2025,'Filmes | Nacional'],['Pequenos Gigantes',2024,'Filmes | Infantil'],['Sombras de Agosto',2025,'Filmes | Terror'],['O Inventor',2024,'Filmes | Comédia'],['Rota 101',2023,'Filmes | Comédia'],['Vento Norte',2025,'Filmes | Drama'],['Céu de Cobre',2024,'Filmes | Ficção']];
  mv.forEach(function(m,i){L.push('#EXTINF:-1 tvg-logo="'+(i%3!==2?'https://picsum.photos/seed/mv'+i+'/300/450':'')+'" group-title="'+m[2]+'",'+m[0]+' ('+m[1]+')');L.push('http://exemplo.invalid/movie/'+i+'.mp4')});
  var sr=[['Código Zero','Séries | Policial'],['A Família Moraes','Séries | Comédia'],['Fronteira Sul','Séries | Drama'],['Reinos','Séries | Fantasia'],['Plantão','Séries | Drama'],['Vale das Sombras','Séries | Terror']];
  sr.forEach(function(s,i){for(var t=1;t<=2;t++)for(var e=1;e<=6;e++){L.push('#EXTINF:-1 tvg-logo="'+(i%2===0?'https://picsum.photos/seed/sr'+i+'/300/450':'')+'" group-title="'+s[1]+'",'+s[0]+' S0'+t+'E0'+e);L.push('http://exemplo.invalid/series/'+i+'_'+t+'_'+e+'.mkv')}});
  window.DEMO_M3U=L.join('\n');
})();

