RiotChallenge2016
===========

Riot API Challenge 2016

# English

# Español

## Dificultades

Al momento de proponer una base de datos no queríamos almacenar cada partida por separado, queríamos obtener los datos de las partidas sin importar donde cayeran los datos. No queríamos por complejidad y cantidad de datos que se manejan, tener una base de datos con algunos cientos de GB de uso. Queríamos que la aplicación corriera con cierta inteligencia, por lo que nuestros datos tenían que ser procesados al momento, casi tal cual caían de la API.
Para esto, teníamos que eliminar dependencia 1:1 con los datos para . Por ejemplo, no podíamos saber cuando una partida ya analizada le pertenecía a un invocador. Pero sí teníamos que saber que esa partida ya la habíamos coleccionado, para evitar duplicidad de datos.

## Flujo de descubrimiento

Cuando un invocador entra a la plataforma, la plataforma busca si tiene en cache sus datos (30 min), si no está, empieza un proceso de búsqueda.

Como existe la limitante de peticiones por minutos, entonces se diseño para que todo en la plataforma sean colas de datos por procesar, dado que a medida que vas obteniendo datos de la API siempre hay más y más por descubrir.

Entonces, hay colas que cuando se acaban, empiezan otras colas inferiores que a su vez pueden añadir datos a colas superiores, que serán procesados primero.
El orden de como son procesadas estas colas dependerá de la manera en la que REDIS maneja el `pop` de las estructuras `SET`. Que son un tanto al azar.

### 1) pending:players

Esta es la primera cola donde del valor `{region}:{name}` se obteiene el `summonerId` y se guarda en un `HASH summonernames {region:name}:{summonerId}:{profileIconId}` para futuras referencias, esto es lo primero que un usuario va a consultar recien entra a la plaforma. Si la obtención del `summonerId` es satisfactoria entonces lo añade al `SET pending:summoners`.

### 2) pending:summoners

En esta se obtienen los juegos recientes donde se ponen en `SET pending:games` si cumplen que sean partidas Normales o Ranked 5x5 y no estén en `SET games`, se buscan todos los jugadores de las partidas y se añaden a `SET pending:league` _si su caché de liga aún no expira (2 días)_. Se añade a un caché `KEY cached:{region}:{summonerId}:games` de _30 min_.

### 3) pending:league

En esta tercera cola se busca las ligas del jugador. Por el momento sólo tomaremos en cuenta las *RANKED_SOLO_5x5*. Al obtener la lista de liga de los usuarios,
se asignará a todos un `KEY cached:{region}:{summonerId}:league` de _2 días_ reemplazando si existe el valor antes (eliminando de `SET pending:league` si existe una coincidencia)

### 4) pending:games

Finalmente en esta cola se analizarán las partidas donde se categorizarán minuciosamente los datos obtenidos de una manera que se puedan obtener resultados casi inmediatos con estructura de datos `ZSET` con nombres en clave como
`data:{liga}:{lane}:{role}:{key}:{champ}:vs:{champ}`,
`data:{liga}:{lane}:{role}:{key}:{champ}`,
`data:{liga}:{lane}:{role}:{key}`.
Donde las key son estadísticas clave. _Daño causado, daño recibido, oro por min, creep  por min, (wards), kill, deaths, assists._
Si encuentra una liga que no ha obtenido, regresa el game a la lista y pone los jugadores en `SET pending:league`

### 5) summoners

Este es el último elemento de las colas, que se irá llenando cada que en las respuestas de la API se encuentre un `summonerID`.
Esta última lista será el corazón _latente_ de la aplicación. Que suministrará las demás colas si es que se encuentran vacías, tomando un elemento al azar de esta lista y pasándolo a `SET pending:summoners`.
