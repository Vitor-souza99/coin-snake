import Phaser from "phaser";
import { skins, skinRarities, skinUnlockStatus, type SkinRarity } from "../data/skins";
import { pets } from "../data/pets";
import { worlds } from "../data/worlds";
import { save } from "../systems/SaveSystem";
import { buyPet, buySkin, claimShopReward, FIREFLY_COIN_PRICE, SHOP_REWARDED_COINS } from "../systems/EconomySystem";
import { ads } from "../services/AdsService";
import { localDay } from "../utils/math";
import { reconcileWorldUnlocks, selectWorld, worldRequirementText, worldStatus } from "../systems/WorldSystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { ScreenUI, header, textureURL } from "../ui/ScreenUI";

type Category = "skins" | "pets" | "maps" | "packs";

export class ShopScene extends Phaser.Scene {
  constructor() { super("Shop"); }

  create() {
    const ui = new ScreenUI(this);
    const profile = save.profile;
    reconcileWorldUnlocks(profile);
    const previous = this.scene.settings.data as { category?: Category; filter?: "ALL" | "OWNED" | "LOCKED"; rarity?: SkinRarity | "ALL"; scrollY?: number } | undefined;
    let category: Category = previous?.category ?? "skins";
    let filter: "ALL" | "OWNED" | "LOCKED" = previous?.filter ?? "ALL";
    let rarity: SkinRarity | "ALL" = previous?.rarity ?? "ALL";

    const categoryNav = () => `<nav class="shop-categories" role="tablist" aria-label="Categorias da loja">
      ${([ ["skins", "Skins"], ["pets", "Mascotes"], ["maps", "Mapas"], ["packs", "Pacotes · futuro"] ] as [Category, string][]).map(([id, label]) =>
        `<button class="action small ${category === id ? "" : "secondary"}" role="tab" aria-selected="${category === id}" data-category="${id}">${label}</button>`).join("")}
    </nav>`;

    const renderSkins = () => {
      const list = skins.filter((skin) =>
        (filter === "ALL" || (filter === "OWNED"
          ? profile.unlockedSkins.includes(skin.id) || skinUnlockStatus(skin, profile).unlocked
          : !profile.unlockedSkins.includes(skin.id) && !skinUnlockStatus(skin, profile).unlocked)) &&
        (rarity === "ALL" || skin.rarity === rarity));
      const rewardAvailable = profile.rewardedShopDate !== localDay();
      return `<article class="card shop-ad-reward"><h2>🎬 Bônus diário</h2><p>Assista a um anúncio recompensado e receba ${SHOP_REWARDED_COINS} moedas. Opcional · disponível uma vez por dia.</p><button class="action" data-shop-reward ${rewardAvailable ? "" : "disabled"}>${rewardAvailable ? `ASSISTIR · +${SHOP_REWARDED_COINS} MOEDAS` : "RESGATADO HOJE"}</button></article><div class="skin-filters" role="group" aria-label="Filtrar skins">
        <button class="action small ${filter === "ALL" ? "" : "secondary"}" data-filter="ALL">TODAS</button>
        <button class="action small ${filter === "OWNED" ? "" : "secondary"}" data-filter="OWNED">MINHAS</button>
        <button class="action small ${filter === "LOCKED" ? "" : "secondary"}" data-filter="LOCKED">BLOQUEADAS</button>
        <select id="filter-rarity" aria-label="Filtrar por raridade"><option value="ALL">Todas as raridades</option>${skinRarities.map((value) => `<option value="${value}" ${rarity === value ? "selected" : ""}>${value}</option>`).join("")}</select>
      </div><div class="grid">${list.map((skin) => {
        const owned = profile.unlockedSkins.includes(skin.id);
        const selected = profile.selectedSkin === skin.id;
        const status = skinUnlockStatus(skin, profile);
        const premium = skin.unlockType === "PREMIUM";
        const price = skin.unlockType === "COINS" ? `${skin.coinPrice?.toLocaleString("pt-BR")} moedas` : status.label;
        const equip = !premium && (owned || status.unlocked)
          ? `<button id="skin-${skin.id}" class="action small ${selected ? "secondary" : ""}" data-equip-skin="${skin.id}" ${selected ? "disabled" : ""}>${selected ? "EQUIPADA" : "EQUIPAR"}</button>` : "";
        return `<article class="card skin-card rarity-card rarity-${skin.rarity.toLowerCase()}" data-skin="${skin.id}" tabindex="0" role="button" aria-label="Visualizar ${skin.name}, ${skin.rarity}">
          <img src="${textureURL(this, `${skin.id}-preview-head`)}" alt="Preview de ${skin.name}">
          <div class="details"><h2>${skin.name}</h2><span class="skin-rarity rarity-${skin.rarity.toLowerCase()}">${skin.rarity}</span><p>${premium ? "🔒 PREMIUM · INDISPONÍVEL" : owned ? selected ? "✓ EQUIPADA" : "✓ DESBLOQUEADA" : price}</p>
          <div class="skin-card-actions"><button class="action small secondary" data-view="${skin.id}">VER</button>${equip}</div></div></article>`;
      }).join("") || '<p class="muted">Nenhuma skin nesta seleção.</p>'}</div>`;
    };

    const renderPets = () => {
      const ownedCount = pets.filter((pet) => profile.unlockedPets.includes(pet.id)).length;
      const fireflyAvailable = profile.availablePets.includes("firefly") && !profile.unlockedPets.includes("firefly");
      return `<section class="pet-shop-intro" aria-label="Resumo dos mascotes">
        <div><span class="kicker">SUA COLEÇÃO</span><h2>${ownedCount} de ${pets.length} mascotes</h2><p>Derrote chefes para desbloquear mascotes. O Vaga-lume fica disponível após vencer King Snake.</p></div>
        <div class="pet-wallet"><span>🪙 SALDO</span><strong>${profile.totalCoins.toLocaleString("pt-BR")}</strong><small>moedas</small></div>
      </section>
      ${fireflyAvailable ? `<aside class="pet-feature-banner"><span aria-hidden="true">✨</span><div><strong>Vaga-lume disponível!</strong><p>Adquira o mascote por ${FIREFLY_COIN_PRICE.toLocaleString("pt-BR")} moedas.</p></div><span class="pet-banner-balance">${profile.totalCoins >= FIREFLY_COIN_PRICE ? "Você já pode comprar" : `Faltam ${(FIREFLY_COIN_PRICE - profile.totalCoins).toLocaleString("pt-BR")} moedas`}</span></aside>` : ""}
      <div class="pet-collection-grid">${pets.map((pet) => {
        const unlocked = profile.unlockedPets.includes(pet.id);
        const available = profile.availablePets.includes(pet.id);
        const selected = profile.selectedPet === pet.id;
        const premium = pet.unlockType === "PREMIUM";
        const firefly = pet.id === "firefly";
        const stateClass = selected ? "pet-equipped" : unlocked ? "pet-owned" : firefly && available ? "pet-available" : "pet-locked";
        const stateLabel = selected ? "EQUIPADO" : unlocked ? "COMPRADO" : premium ? "PREMIUM" : firefly && available ? "À VENDA" : "BLOQUEADO";
        const action = unlocked
          ? `<button class="action ${selected ? "secondary" : ""}" data-equip-pet="${pet.id}" ${selected ? "disabled" : ""}>${selected ? "EQUIPADO" : "EQUIPAR"}</button>`
          : firefly && available
            ? `<button class="action" data-buy-pet="${pet.id}" ${profile.totalCoins < FIREFLY_COIN_PRICE ? "disabled" : ""}>COMPRAR · ${FIREFLY_COIN_PRICE.toLocaleString("pt-BR")} MOEDAS</button>`
            : `<button class="action secondary" disabled>${premium ? "PREMIUM · EM BREVE" : "BLOQUEADO"}</button>`;
        const detail = unlocked ? (selected ? "Seu mascote ativo nesta partida." : "Disponível para equipar quando quiser.") : firefly && available ? "Desbloqueado pela vitória contra King Snake." : pet.unlockedBy;
        return `<article class="card rarity-card pet-card ${stateClass} ${pet.rarity === "PREMIUM" ? "rarity-mythic" : ""}">
          <div class="pet-card-top"><div class="pet-symbol" aria-hidden="true">${pet.symbol}</div><span class="pet-state" aria-label="Status: ${stateLabel}">${stateLabel}</span></div>
          <span class="skin-rarity">${pet.rarity}</span><h2>${pet.name}</h2><p class="pet-description">${pet.description}</p>
          <p class="pet-unlock-detail">${detail}</p><div class="pet-card-action">${action}</div>
        </article>`;
      }).join("")}</div>`;
    };

    const renderMaps = () => `<p class="muted">Mapas são desbloqueados pela progressão. Itens premium aparecem como prévias; compras ainda não estão disponíveis.</p>
      <div class="collection-grid">${worlds.map((world) => {
        const status = worldStatus(world, profile, profile.selectedWorld);
        const selected = status === "SELECTED";
        const available = status === "AVAILABLE" || selected;
        const label = status === "PREMIUM_LOCKED" ? "PREMIUM · EM BREVE" : status === "COMING_SOON" ? "CONTEÚDO FUTURO" : status === "LOCKED" ? "BLOQUEADO" : selected ? "SELECIONADO" : "DISPONÍVEL";
        return `<article class="card map-shop-card" style="--map-accent:#${world.accent.toString(16).padStart(6, "0")}">
          <div class="map-shop-art" aria-hidden="true" style="background:linear-gradient(135deg,#${world.background.toString(16).padStart(6, "0")},#${world.ground.toString(16).padStart(6, "0")})"></div>
          <span class="skin-rarity">${world.category === "PREMIUM" ? "PREMIUM" : world.category === "STANDARD" ? "INICIAL" : "PROGRESSÃO"}</span><h2>${world.name}</h2><p>${world.description}</p>
          <p class="muted"><b>${label}</b><br>${worldRequirementText(world, profile)}</p><p class="muted">${world.specialMechanic}<br>Recompensas: ${world.rewards.join(", ") || "A definir"}</p>
          ${available ? `<button class="action ${selected ? "secondary" : ""}" data-select-world="${world.id}" ${selected ? "disabled" : ""}>${selected ? "MUNDO ATUAL" : "JOGAR NESTE MAPA"}</button>` : `<button class="action secondary" disabled>${status === "PREMIUM_LOCKED" ? "PREMIUM · EM BREVE" : status === "COMING_SOON" ? "EM DESENVOLVIMENTO" : "BLOQUEADO"}</button>`}
        </article>`;
      }).join("")}</div>`;

    const renderPacks = () => `<article class="card shop-coming-soon"><div class="pet-symbol" aria-hidden="true">📦</div><h2>Pacotes</h2><p>Pacotes temáticos poderão reunir skins, mascotes e outros itens no futuro.</p><p class="muted">Ainda não há pacotes, preços ou compras disponíveis. Nenhuma transação será simulada.</p><button class="action secondary" disabled>EM BREVE</button></article>`;

    const render = () => {
      const title: Record<Category, string> = { skins: "Loja", pets: "Loja", maps: "Loja", packs: "Loja" };
      const content = category === "skins" ? renderSkins() : category === "pets" ? renderPets() : category === "maps" ? renderMaps() : renderPacks();
      ui.html(`${header(title[category], `SALDO · ${profile.totalCoins.toLocaleString("pt-BR")} MOEDAS`)}${categoryNav()}<section class="shop-content" role="tabpanel">${content}</section>`);
      if (previous?.scrollY !== undefined) {
        window.scrollTo(0, previous.scrollY);
        previous.scrollY = undefined;
      }
      ui.on("#back", () => this.scene.start("Menu"));
      ui.root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => button.addEventListener("click", () => {
        category = button.dataset.category as Category;
        audio.play("click");
        render();
      }));
      if (category === "skins") {
        ui.root.querySelector<HTMLButtonElement>("[data-shop-reward]")?.addEventListener("click", async (event) => {
          const button = event.currentTarget as HTMLButtonElement;
          if (profile.rewardedShopDate === localDay() || !ads.isRewardedAdReady()) {
            ui.toast("Anúncio indisponível neste dispositivo ou já resgatado hoje.");
            return;
          }
          button.disabled = true;
          if (!await ads.showRewardedAd("shop-coins")) {
            if (ui.root.isConnected) button.disabled = false;
            ui.toast("Anúncio não disponível. Nenhuma moeda foi adicionada.");
            return;
          }
          if (claimShopReward(profile)) {
            await save.save(); audio.play("coin"); haptic("coin");
            if (ui.root.isConnected) render();
          }
        });
        ui.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", (event) => {
          event.stopPropagation(); this.preview(button.dataset.view!);
        }));
        ui.root.querySelectorAll<HTMLButtonElement>("[data-equip-skin]").forEach((button) => button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (!buySkin(profile, button.dataset.equipSkin!)) return;
          void save.save(); audio.play("click"); haptic("power"); render();
        }));
        ui.root.querySelectorAll<HTMLElement>("[data-skin]").forEach((card) => {
          card.addEventListener("click", (event) => { if (!(event.target as HTMLElement).closest("button")) this.preview(card.dataset.skin!); });
          card.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target === card) { event.preventDefault(); this.preview(card.dataset.skin!); } });
        });
        ui.root.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => button.addEventListener("click", () => {
          filter = button.dataset.filter as "ALL" | "OWNED" | "LOCKED"; render();
        }));
        ui.root.querySelector<HTMLSelectElement>("#filter-rarity")?.addEventListener("change", (event) => {
          rarity = (event.target as HTMLSelectElement).value as SkinRarity | "ALL"; render();
        });
      }
      if (category === "pets") {
        ui.root.querySelectorAll<HTMLButtonElement>("[data-buy-pet]").forEach((button) => button.addEventListener("click", () => {
          const id = button.dataset.buyPet;
          if (!id || !buyPet(profile, id)) {
            ui.toast("Moedas insuficientes ou mascote ainda bloqueado.");
            return;
          }
          void save.save().then(render); audio.play("coin"); haptic("coin");
        }));
        ui.root.querySelectorAll<HTMLButtonElement>("[data-equip-pet]").forEach((button) => button.addEventListener("click", () => {
          const id = button.dataset.equipPet;
          if (!id || !profile.unlockedPets.includes(id)) return;
          profile.selectedPet = id; audio.play("click"); haptic("power");
          void save.save().then(render);
        }));
      }
      if (category === "maps") {
        ui.root.querySelectorAll<HTMLButtonElement>("[data-select-world]").forEach((button) => button.addEventListener("click", () => {
          const id = button.dataset.selectWorld;
          if (!id || !selectWorld(id)) return;
          audio.play("click"); haptic("power");
          this.scene.start("Game", { startWorld: id });
        }));
      }
    };

    render();
  }

  private preview(id: string) {
    audio.play("click");
    haptic("coin");
    this.scene.pause();
    this.scene.launch("SkinPreview", { skinId: id });
  }
}