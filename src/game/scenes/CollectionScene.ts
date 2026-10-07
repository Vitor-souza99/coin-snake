import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { achievementDefinitions } from "../systems/AchievementSystem";
import { ScreenUI, header } from "../ui/ScreenUI";

const pets = [
  { id: "bee", name: "Bee", description: "+3% de chance de moedas azuis", unlockedBy: "Derrote King Snake." },
  { id: "candy-blob", name: "Candy Blob", description: "+5% XP ao finalizar a run", unlockedBy: "Derrote Candy Monster." },
];

export class CollectionScene extends Phaser.Scene {
  constructor() { super("Collection"); }
  create() {
    const ui = new ScreenUI(this), p = save.profile;
    ui.html(`${header("Coleção", "Conquistas, mascotes e domínio")}
      <div class="grid">
      <article class="card"><h2>Mascotes</h2><p class="muted">Um mascote pode acompanhar sua cobra. Bônus são modestos e não afetam colisões.</p>
      ${pets.map(pet => `<div class="card"><h3>${pet.name} ${p.unlockedPets.includes(pet.id) ? "✓" : "🔒"}</h3><p>${pet.description}</p><p class="muted">${p.unlockedPets.includes(pet.id) ? "Desbloqueado" : pet.unlockedBy}</p><button class="action ${p.selectedPet === pet.id ? "secondary" : ""}" id="pet-${pet.id}" ${!p.unlockedPets.includes(pet.id) || p.selectedPet === pet.id ? "disabled" : ""}>${p.selectedPet === pet.id ? "Equipado" : "Equipar"}</button></div>`).join("")}
      <button id="pet-none" class="action secondary" ${p.selectedPet === null ? "disabled" : ""}>Sem mascote</button></article>
      <article class="card"><h2>Conquistas</h2>${achievementDefinitions.map(a => `<p>${p.achievements.includes(a.id) ? "🏆" : "○"} <b>${a.title}</b><br><small class="muted">${a.description}</small></p>`).join("")}</article>
      <article class="card"><h2>Domínio de skins</h2>${Object.entries(p.mastery).map(([id, level]) => `<p>${id}: nível ${level} · ${Math.max(0, 10 - level)} partidas para próximo nível</p>`).join("")}</article></div>`);
    ui.on("#back", () => this.scene.start("Menu"));
    for (const pet of pets) if (p.unlockedPets.includes(pet.id)) ui.on(`#pet-${pet.id}`, () => { p.selectedPet = pet.id; void save.save().then(() => this.scene.restart()); });
    ui.on("#pet-none", () => { p.selectedPet = null; void save.save().then(() => this.scene.restart()); });
  }
}