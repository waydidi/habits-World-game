import { spawnSync } from 'node:child_process';
const commands=[
 ['scripts/build-test-bundles.mjs'],['tests/game-server.test.mjs'],
 ['tests/game.test.mjs'],['tests/habits.test.mjs'],
];
for(const args of commands){const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
