import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { achievementDefinitions } from "../systems/AchievementSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
import { pets } from "../data/pets";

export class CollectionScene extends Phaser.Scene {
  constructor() { super("Collection"); }
  create() {
    const ui = new ScreenUI(this), p = save.profile;
    ui.html(`${header("Coleção", "Conquistas, mascotes e domínio")}
      <div class="grid">
      <article class="card"><h2>Mascotes</h2><p class="muted">Equipe um mascote por vez. O Duende da Sorte fica sempre ativo e, quando desbloqueado, libera uma vaga adicional. Mascotes premium ainda não podem ser comprados.</p>
      ${pets.map(pet => {
        const unlocked = p.unlockedPets.includes(pet.id);
        const alwaysActive = pet.id === "lucky-leprechaun";
        const canEquip = unlocked && pet.unlockType !== "PREMIUM" && !alwaysActive;
        return `<div class="card"><h3>${pet.symbol} ${pet.name} · ${pet.rarity} ${unlocked ? "✓" : "🔒"}</h3><p>${pet.description}</p><p class="muted">${unlocked ? alwaysActive ? "Sempre ativo" : "Desbloqueado" : pet.unlockedBy}</p>${alwaysActive ? "" : `<button class="action ${p.selectedPet === pet.id ? "secondary" : ""}" id="pet-${pet.id}" ${!canEquip || p.selectedPet === pet.id ? "disabled" : ""}>${p.selectedPet === pet.id ? "Equipado" : pet.unlockType === "PREMIUM" ? "Indisponível" : "Equipar"}</button>`}</div>`;
      }).join("")}
      <button id="pet-none" class="action secondary" ${p.selectedPet === null ? "disabled" : ""}>Sem mascote</button></article>
      <article class="card"><h2>Conquistas</h2>${achievementDefinitions.map(a => `<p>${p.achievements.includes(a.id) ? "🏆" : "○"} <b>${a.title}</b><br><small class="muted">${a.description}</small></p>`).join("")}</article>
      <article class="card"><h2>Domínio de skins</h2>${Object.entries(p.mastery).map(([id, level]) => `<p>${id}: nível ${level} · ${Math.max(0, 10 - level)} partidas para próximo nível</p>`).join("")}</article></div>`);
    ui.on("#back", () => this.scene.start("Menu"));
    for (const pet of pets) if (pet.id !== "lucky-leprechaun" && p.unlockedPets.includes(pet.id)) ui.on(`#pet-${pet.id}`, () => { p.selectedPet = pet.id; void save.save().then(() => this.scene.restart()); });
    ui.on("#pet-none", () => { p.selectedPet = null; void save.save().then(() => this.scene.restart()); });
  }
}