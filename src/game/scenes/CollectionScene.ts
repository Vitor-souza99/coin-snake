import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { achievementDefinitions } from "../systems/AchievementSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
import { pets } from "../data/pets";
import { getLanguage, localizedPet } from "../services/LocalizationService";
import { borealPetArt } from "../ui/BorealPetArt";
import { tidalTurtlePetArt } from "../ui/TidalTurtlePetArt";
import { phoenixPetArt } from "../ui/PhoenixPetArt";
import { celestialSerpentPetArt } from "../ui/CelestialSerpentPetArt";
import { analytics } from "../services/AnalyticsService";

export class CollectionScene extends Phaser.Scene {
  constructor() { super("Collection"); }
  create() {
    const ui = new ScreenUI(this), p = save.profile;
    const en = getLanguage() === "en";
    ui.html(`${header(en ? "Collection" : "Coleção", en ? "Achievements, companions, and mastery" : "Conquistas, mascotes e domínio")}
      <main class="collection-layout">
      <article class="card collection-section collection-section--companions"><h2>${en ? "Companions" : "Mascotes"}</h2><p class="muted">${en ? "Equip one companion at a time. Lucky Clover is permanent: once unlocked, it is equipped automatically and its bonus stays active. Premium companions are not available yet." : "Equipe um mascote por vez. O Trevo da Sorte é um mascote permanente: ao desbloqueá-lo, ele fica equipado automaticamente e seu bônus permanece ativo. Mascotes premium ainda não podem ser comprados."}</p><div class="collection-pets">
      ${pets.map(pet => {
        const unlocked = p.unlockedPets.includes(pet.id);
        const permanent = pet.id === "lucky-leprechaun";
        const canEquip = unlocked && pet.unlockType !== "PREMIUM" && !permanent;
        const comingSoon = pet.id === "tiny-dragon";
        const discovered = !comingSoon && (pet.id !== "tiny-dragon" || p.desertRelicFound);
        const label = discovered ? localizedPet(pet.id, "name", pet.name) : pet.mysteryName ?? "???";
        const description = comingSoon ? en ? "Coming soon." : "Em breve." : discovered ? localizedPet(pet.id, "description", pet.description) : en ? "A mysterious relic holds something yet undiscovered." : "Uma relíquia misteriosa guarda algo ainda não descoberto.";
        const petArt = pet.id === "snow-pup" ? borealPetArt("boreal-pet-art boreal-pet-art--collection") : pet.id === "tidal-turtle" ? tidalTurtlePetArt() : pet.id === "phoenix" ? phoenixPetArt() : pet.id === "celestial-serpent" ? celestialSerpentPetArt() : pet.symbol;
        return `<div class="card collection-pet"><h3><span class="collection-pet-art">${petArt}</span>${comingSoon ? en ? "Tiny Dragon · Coming soon" : "Dragãozinho · Em breve" : `${label} · ${discovered ? pet.rarity : "???"}`} ${unlocked ? "✓" : "🔒"}</h3><p>${description}</p><p class="muted">${comingSoon ? en ? "The Desert Labyrinth is coming soon." : "O Labirinto do Deserto estará disponível em breve." : !discovered ? en ? "Discover the relic in the Desert labyrinth." : "Descubra a relíquia no Labirinto do Deserto." : unlocked ? permanent ? en ? "Permanently unlocked · bonus always active" : "Desbloqueado permanentemente · bônus sempre ativo" : en ? "Unlocked" : "Desbloqueado" : localizedPet(pet.id, "unlockedBy", pet.unlockedBy)}</p>${permanent ? "" : `<button class="action ${p.selectedPet === pet.id ? "secondary" : ""}" id="pet-${pet.id}" ${comingSoon || !discovered || !canEquip || p.selectedPet === pet.id ? "disabled" : ""}>${comingSoon ? en ? "Coming soon" : "Em breve" : p.selectedPet === pet.id ? en ? "Equipped" : "Equipado" : pet.unlockType === "PREMIUM" ? en ? "Unavailable" : "Indisponível" : en ? "Equip" : "Equipar"}</button>`}</div>`;
      }).join("")}
      </div><button id="pet-none" class="action secondary collection-none" ${p.selectedPet === null ? "disabled" : ""}>${en ? "No companion" : "Sem mascote"}</button></article>
      <article class="card collection-section"><h2>${en ? "Achievements" : "Conquistas"}</h2><div class="collection-list">${achievementDefinitions.map(a => `<p class="collection-row">${p.achievements.includes(a.id) ? "🏆" : "○"} <span><b>${a.title}</b><small class="muted">${a.description}</small></span></p>`).join("")}</div></article>
      <article class="card collection-section"><h2>${en ? "Skin mastery" : "Domínio de skins"}</h2><div class="collection-list">${Object.entries(p.mastery).map(([id, level]) => `<p class="collection-row"><b>${id}</b><span class="muted">${en ? `Level ${level} · ${Math.max(0, 10 - level)} runs to next level` : `Nível ${level} · ${Math.max(0, 10 - level)} partidas para próximo nível`}</span></p>`).join("") || `<p class="muted">${en ? "No mastery progress yet." : "Ainda não há progresso de domínio."}</p>`}</div></article></main>`);
    ui.on("#back", () => this.scene.start("Menu"));
    for (const pet of pets) if (pet.id !== "lucky-leprechaun" && p.unlockedPets.includes(pet.id)) ui.on(`#pet-${pet.id}`, () => { p.selectedPet = pet.id; analytics.track("pet_equipped", { petId: pet.id }); void save.save().then(() => this.scene.restart()); });
    ui.on("#pet-none", () => { p.selectedPet = null; analytics.track("pet_equipped", { petId: null }); void save.save().then(() => this.scene.restart()); });
  }
}