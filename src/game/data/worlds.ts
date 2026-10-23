export type WorldUnlockType = "STARTER" | "PLAYER_LEVEL" | "BOSS_DEFEAT" | "LEVEL_AND_BOSS" | "PREMIUM";
export type WorldCategory = "STANDARD" | "PROGRESSION" | "SECRET" | "PREMIUM";
export interface WorldDefinition {
  id: string;
  name: string;
  description: string;
  category: WorldCategory;
  unlockType: WorldUnlockType;
  requiredLevel?: number;
  requiredBossId?: string;
  prerequisiteWorldId?: string;
  premiumProductId?: string;
  isImplemented: boolean;
  bossId?: string;
  petRewardId?: string;
  musicId?: string;
  specialMechanic: string;
  previewDescription: string;
  visualTheme: "grass" | "candy" | "ocean" | "abyss" | "desert" | "ice" | "space" | "dragon" | "haunted" | "prehistoric";
  portalWeight: number;
  background: number;
  ground: number;
  accent: number;
  speedMultiplier: number;
  hazard: "none" | "sticky" | "current" | "sand-gust";
  rewards: string[];
}
export interface WorldPlayerState {
  playerLevel: number;
  bossesDefeated: string[];
  worldsUnlocked: string[];
  premiumWorldEntitlements?: string[];
}

const define = (world: WorldDefinition): WorldDefinition => world;
export const worlds: WorldDefinition[] = [
  define({ id: "green-valley", name: "Green Valley", description: "O vale inicial e hub principal da aventura.", category: "STANDARD", unlockType: "STARTER", isImplemented: true, bossId: "king-snake", petRewardId: "bee", musicId: "green-valley", specialMechanic: "Nenhuma; arena clássica.", previewDescription: "Campos verdes, árvores e caminhos tranquilos.", visualTheme: "grass", portalWeight: 0, background: 0xf4f4df, ground: 0xdbe8b9, accent: 0x65a85b, speedMultiplier: 1, hazard: "none", rewards: ["Bee", "King Snake Skin"] }),
  define({ id: "candy-world", name: "Candy World", description: "Uma terra pastel guardada pelo Candy Monster.", category: "PROGRESSION", unlockType: "LEVEL_AND_BOSS", requiredLevel: 5, requiredBossId: "king-snake", prerequisiteWorldId: "green-valley", isImplemented: true, bossId: "candy-monster", petRewardId: "candy-blob", musicId: "candy-world", specialMechanic: "Sticky Zones", previewDescription: "Doces coloridos, cores pastel e zonas pegajosas.", visualTheme: "candy", portalWeight: 3, background: 0xffeafa, ground: 0xf7c7ec, accent: 0xcf68b6, speedMultiplier: 0.85, hazard: "sticky", rewards: ["Candy Blob", "Candy Dragon skin"] }),
  define({ id: "ocean", name: "Ocean World", description: "Correntes oceânicas cercam um mundo sob as ondas.", category: "PROGRESSION", unlockType: "LEVEL_AND_BOSS", requiredLevel: 10, requiredBossId: "candy-monster", isImplemented: true, bossId: "kraken", petRewardId: "baby-octopus", musicId: "ocean", specialMechanic: "Ocean Currents", previewDescription: "Águas azuis, ondas e bolhas.", visualTheme: "ocean", portalWeight: 2, background: 0xdff6fa, ground: 0x9bdeea, accent: 0x369cb5, speedMultiplier: 1.05, hazard: "current", rewards: ["Baby Octopus", "Ghost Skin"] }),
  define({ id: "silent-abyss", name: "O Abismo Mudo", description: "Uma fenda oculta leva a águas sem correntes e quase sem luz.", category: "SECRET", unlockType: "BOSS_DEFEAT", requiredBossId: "kraken", prerequisiteWorldId: "ocean", isImplemented: true, musicId: "ocean", specialMechanic: "Sobreviva por 90 segundos sem correntes; o progresso só conta neste mapa.", previewDescription: "Ruínas silenciosas, brilho bioluminescente discreto e uma arena isolada.", visualTheme: "abyss", portalWeight: 0, background: 0x071522, ground: 0x102637, accent: 0x398d91, speedMultiplier: 0.94, hazard: "none", rewards: ["Serpente Abissal"] }),
  define({ id: "spider-lair", name: "Covil da Aranha", description: "Uma passagem secreta no Green Valley leva ao covil da Tecelã Real.", category: "SECRET", unlockType: "BOSS_DEFEAT", requiredBossId: "scorpion-king", prerequisiteWorldId: "green-valley", isImplemented: true, bossId: "spider-queen", musicId: "green-valley", specialMechanic: "Desvie das teias pegajosas; use a aura de ataque quando a Aranha Real se expuser após disparar.", previewDescription: "Um covil escondido coberto por teias, protegido pela Aranha Real.", visualTheme: "haunted", portalWeight: 0, background: 0x171923, ground: 0x292834, accent: 0xb98bd5, speedMultiplier: 0.96, hazard: "sticky", rewards: ["Skin Aranha Real", "Pet Aranhinha"] }),
  define({ id: "desert", name: "Deserto das Dunas", description: "Ruínas soterradas, oásis escondidos e rajadas de areia guardadas pelo Escorpião-Rei.", category: "PROGRESSION", unlockType: "LEVEL_AND_BOSS", requiredLevel: 15, requiredBossId: "kraken", prerequisiteWorldId: "ocean", isImplemented: true, bossId: "scorpion-king", petRewardId: "scorpionling", musicId: "green-valley", specialMechanic: "Rajadas de areia empurram a cobra; oásis reduzem levemente a velocidade e oferecem uma rota mais calma.", previewDescription: "Dunas douradas, ruínas antigas, cactos e um oásis no coração do deserto.", visualTheme: "desert", portalWeight: 1, background: 0xffedce, ground: 0xe9c47e, accent: 0xc47b38, speedMultiplier: 1, hazard: "sand-gust", rewards: ["Escorpiãozinho", "Desert Scorpion Snake"] }),
  define({ id: "desert-labyrinth", name: "Labirinto Soterrado", description: "Em breve: uma expedição secreta sob as ruínas do Deserto.", category: "SECRET", unlockType: "BOSS_DEFEAT", requiredBossId: "scorpion-king", prerequisiteWorldId: "desert", isImplemented: false, musicId: "green-valley", specialMechanic: "Em breve.", previewDescription: "Uma entrada esquecida sob a areia.", visualTheme: "desert", portalWeight: 0, background: 0x72513c, ground: 0x493629, accent: 0xe6b458, speedMultiplier: 0.92, hazard: "none", rewards: ["Conteúdo em breve"] }),
  define({ id: "ice-world", name: "Ice World", description: "Uma região congelada planejada para exploração.", category: "PROGRESSION", unlockType: "PLAYER_LEVEL", requiredLevel: 20, isImplemented: false, specialMechanic: "Superfícies escorregadias (futuro)", previewDescription: "Geleiras, neve e cristais de gelo.", visualTheme: "ice", portalWeight: 1, background: 0xe7f5ff, ground: 0xbadcf2, accent: 0x62a9ce, speedMultiplier: 1, hazard: "none", rewards: [] }),
  define({ id: "space", name: "Space", description: "Uma expansão cósmica gratuita planejada.", category: "PROGRESSION", unlockType: "PLAYER_LEVEL", requiredLevel: 25, isImplemented: false, specialMechanic: "Gravidade variável (futuro)", previewDescription: "Estrelas e nebulosas em um campo cósmico.", visualTheme: "space", portalWeight: 1, background: 0x202447, ground: 0x393c73, accent: 0x9e8bff, speedMultiplier: 1, hazard: "none", rewards: [] }),
  define({ id: "dragon_kingdom", name: "Dragon Kingdom", description: "Uma expansão opcional de dragões, não necessária para concluir o jogo base.", category: "PREMIUM", unlockType: "PREMIUM", premiumProductId: "coinsnake.world.dragon_kingdom", isImplemented: false, bossId: "dragon-king", petRewardId: "baby-dragon", specialMechanic: "Fire Zones", previewDescription: "Montanhas sombrias, lava e silhuetas de dragões.", visualTheme: "dragon", portalWeight: 0, background: 0x382b38, ground: 0x623b3b, accent: 0xff6538, speedMultiplier: 1, hazard: "none", rewards: ["Dragon Coin", "Fire Trail", "Dragon Crown", "Fire Dragon", "Ancient Dragon"] }),
  define({ id: "haunted_realm", name: "Haunted Realm", description: "Uma expansão opcional de fantasmas e mistérios.", category: "PREMIUM", unlockType: "PREMIUM", premiumProductId: "coinsnake.world.haunted_realm", isImplemented: false, bossId: "phantom-king", petRewardId: "mini-ghost", specialMechanic: "Obstáculos e fantasmas que aparecem e desaparecem.", previewDescription: "Um reino sombrio envolto em névoa e aparições.", visualTheme: "haunted", portalWeight: 0, background: 0x252838, ground: 0x414457, accent: 0x9b87cf, speedMultiplier: 1, hazard: "none", rewards: ["Mini Ghost"] }),
  define({ id: "prehistoric_world", name: "Prehistoric World", description: "Uma expansão opcional de criaturas pré-históricas.", category: "PREMIUM", unlockType: "PREMIUM", premiumProductId: "coinsnake.world.prehistoric_world", isImplemented: false, bossId: "t-rex-serpent", petRewardId: "baby-dino", specialMechanic: "Hazards naturais.", previewDescription: "Vegetação ancestral, fósseis e vulcões distantes.", visualTheme: "prehistoric", portalWeight: 0, background: 0xe4edcf, ground: 0x9bab68, accent: 0x657d43, speedMultiplier: 1, hazard: "none", rewards: ["Baby Dino"] }),
];
worlds.find((world) => world.id === "candy-world")!.prerequisiteWorldId = "green-valley";
worlds.find((world) => world.id === "ocean")!.prerequisiteWorldId = "candy-world";
worlds.find((world) => world.id === "desert")!.prerequisiteWorldId = "ocean";

const aliases: Record<string, string> = { green_valley: "green-valley", candy_world: "candy-world", ocean_world: "ocean", ice_world: "ice-world", desert_world: "desert" };
export const canonicalWorldId = (id: string) => aliases[id] ?? id;
export const worldById = (id: string) => worlds.find((world) => world.id === canonicalWorldId(id)) ?? worlds[0];
export function worldRequirements(world: WorldDefinition, state: Pick<WorldPlayerState, "playerLevel" | "bossesDefeated" | "worldsUnlocked">) {
  const levelMet = !world.requiredLevel || state.playerLevel >= world.requiredLevel;
  const bossMet = !world.requiredBossId || state.bossesDefeated.includes(world.requiredBossId);
  const worldMet = world.id === "green-valley" || !world.prerequisiteWorldId || state.worldsUnlocked.includes(world.prerequisiteWorldId);
  return { levelMet, bossMet, worldMet, unlocked: world.category !== "SECRET" && (world.unlockType === "STARTER" || world.unlockType !== "PREMIUM" && levelMet && bossMet && worldMet) };
}
export function isWorldUnlocked(world: WorldDefinition, state: WorldPlayerState) {
  if (world.unlockType === "PREMIUM") return false; // Store entitlement must be verified by PurchaseService, never local save.
  if (world.category === "SECRET") return false;
  return world.unlockType === "STARTER" || state.worldsUnlocked.includes(world.id) || worldRequirements(world, state).unlocked;
}
export const availableWorlds = (level: number) => worlds.filter((world) => world.unlockType === "STARTER" || (world.requiredLevel ?? 1) <= level);
export const worldRequirementLabel = (bossId: string) => ({ "king-snake": "King Snake", "candy-monster": "Candy Monster", kraken: "Kraken", "scorpion-king": "Escorpião-Rei" }[bossId] ?? bossId);