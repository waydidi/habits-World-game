/** Ragnarok Classic normal Base EXP, levels 1–99.
 * Source: https://irowiki.org/classic/Base_EXP_Chart (normal, not transcendent).
 * Entry i is EXP required from level i+1 to i+2. */
export const CLASSIC_EXP = [9,16,25,36,77,112,153,200,253,320,385,490,585,700,830,970,1120,1260,1420,1620,1860,1990,2240,2504,2950,3426,3934,4474,6889,7995,9174,10425,11748,13967,15775,17678,19677,21773,30543,34212,38065,42102,46323,53026,58419,64041,69892,75973,102468,115254,128692,142784,157528,178184,196300,215198,234879,255341,330188,365914,403224,442116,482590,536948,585191,635278,687211,740988,925400,1473746,1594058,1718928,1848355,1982340,2230113,2386162,2547417,2713878,3206160,3681024,4022472,4377024,4744680,5125440,5767272,6204000,6655464,7121664,7602600,9738720,11649960,13643520,18339300,23836800,35658000,48687000,58135000,99999998] as const;
export const MAX_LEVEL = 99;
export const TOTAL_EXP_TO_99 = CLASSIC_EXP.reduce((a,b) => a+b,0);
export function progression(totalXp: number) {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level=1;
  while (level<MAX_LEVEL && remaining>=CLASSIC_EXP[level-1]) { remaining-=CLASSIC_EXP[level-1];level++; }
  const required = level===MAX_LEVEL ? 0 : CLASSIC_EXP[level-1];
  return { level, levelXp: level===MAX_LEVEL ? 0 : remaining, requiredXp: required,
    levelPercent: level===MAX_LEVEL ? 100 : remaining / required * 100, isMax: level===MAX_LEVEL };
}
