import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { achievementDefinitions } from "../systems/AchievementSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
import { pets } from "../data/pets";
import { getLanguage, localizedPet } from "../services/LocalizationService";

export class CollectionScene extends Phaser.Scene {
  constructor() { super("Collection"); }
  create() {
    const ui = new ScreenUI(this), p = save.profile;
    const en = getLanguage() === "en";
    ui.html(`${header(en ? "Collection" : "Coleção", en ? "Achievements, companions, and mastery" : "Conquistas, mascotes e domínio")}
      <div class="grid">
      <article class="card"><h2>${en ? "Companions" : "Mascotes"}</h2><p class="muted">${en ? "Equip one companion at a time. Lucky Clover is permanent: once unlocked, it is equipped automatically and its bonus stays active. Premium companions are not available yet." : "Equipe um mascote por vez. O Trevo da Sorte é um mascote permanente: ao desbloqueá-lo, ele fica equipado automaticamente e seu bônus permanece ativo. Mascotes premium ainda não podem ser comprados."}</p>
      ${pets.map(pet => {
        const unlocked = p.unlockedPets.includes(pet.id);
        const permanent = pet.id === "lucky-leprechaun";
        const canEquip = unlocked && pet.unlockType !== "PREMIUM" && !permanent;
        return `<div class="card"><h3>${pet.symbol} ${localizedPet(pet.id, "name", pet.name)} · ${pet.rarity} ${unlocked ? "✓" : "🔒"}</h3><p>${localizedPet(pet.id, "description", pet.description)}</p><p class="muted">${unlocked ? permanent ? en ? "Permanently unlocked · bonus always active" : "Desbloqueado permanentemente · bônus sempre ativo" : en ? "Unlocked" : "Desbloqueado" : localizedPet(pet.id, "unlockedBy", pet.unlockedBy)}</p>${permanent ? "" : `<button class="action ${p.selectedPet === pet.id ? "secondary" : ""}" id="pet-${pet.id}" ${!canEquip || p.selectedPet === pet.id ? "disabled" : ""}>${p.selectedPet === pet.id ? en ? "Equipped" : "Equipado" : pet.unlockType === "PREMIUM" ? en ? "Unavailable" : "Indisponível" : en ? "Equip" : "Equipar"}</button>`}</div>`;
      }).join("")}
      <button id="pet-none" class="action secondary" ${p.selectedPet === null ? "disabled" : ""}>Sem mascote</button></article>
      <article class="card"><h2>${en ? "Achievements" : "Conquistas"}</h2>${achievementDefinitions.map(a => `<p>${p.achievements.includes(a.id) ? "🏆" : "○"} <b>${a.title}</b><br><small class="muted">${a.description}</small></p>`).join("")}</article>
      <article class="card"><h2>Domínio de skins</h2>${Object.entries(p.mastery).map(([id, level]) => `<p>${id}: nível ${level} · ${Math.max(0, 10 - level)} partidas para próximo nível</p>`).join("")}</article></div>`);
    ui.on("#back", () => this.scene.start("Menu"));
    for (const pet of pets) if (pet.id !== "lucky-leprechaun" && p.unlockedPets.includes(pet.id)) ui.on(`#pet-${pet.id}`, () => { p.selectedPet = pet.id; void save.save().then(() => this.scene.restart()); });
    ui.on("#pet-none", () => { p.selectedPet = null; void save.save().then(() => this.scene.restart()); });
  }
}