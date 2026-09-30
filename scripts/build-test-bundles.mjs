import { build } from 'esbuild';
await build({entryPoints:['lib/game-rules.ts'],bundle:true,platform:'node',format:'esm',outfile:'tests/game-rules.bundle.mjs'});
await build({entryPoints:['db/game.ts'],bundle:true,platform:'node',format:'esm',outfile:'tests/game-server.bundle.mjs',plugins:[{name:'test-worker-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'worker-env',namespace:'test-env'}));b.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const env = globalThis.__GAME_TEST_ENV__;',loader:'js'}));}}]});
