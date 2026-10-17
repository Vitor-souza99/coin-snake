import Phaser from "phaser";
import { skins, skinRarities, skinUnlockStatus, isMysterySkin, skinMysteryClues, type SkinRarity } from "../data/skins";
import { pets } from "../data/pets";
import { worlds } from "../data/worlds";
import { save } from "../systems/SaveSystem";
import { buyPet, buySkin, claimShopReward, SHOP_REWARDED_COINS } from "../systems/EconomySystem";
import { ads } from "../services/AdsService";
import { localDay } from "../utils/math";
import { reconcileWorldUnlocks, selectWorld, worldRequirementText, worldStatus } from "../systems/WorldSystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { ScreenUI, header, textureURL } from "../ui/ScreenUI";

type Category = "skins" | "pets" | "maps" | "packs";

export class ShopScene extends Phaser.Scene {
  private ui!: ScreenUI;
  private skinScrollY = 0;
  private captureSkinScroll() {
    this.skinScrollY = this.ui.root.scrollTop;
  }
  private restoreSkinScroll() {
    const scrollY = this.skinScrollY;
    requestAnimationFrame(() => {
      if (this.ui?.root.isConnected) this.ui.root.scrollTop = scrollY;
    });
  }
  constructor() { super("Shop"); }

  create() {
    const ui = this.ui = new ScreenUI(this);
    const profile = save.profile;
    reconcileWorldUnlocks(profile);
    const previous = this.scene.settings.data as { category?: Category; filter?: "ALL" | "OWNED" | "LOCKED"; rarity?: SkinRarity | "ALL"; scrollY?: number } | undefined;
    let category: Category = previous?.category ?? "skins";
    let filter: "ALL" | "OWNED" | "LOCKED" = previous?.filter ?? "ALL";
    let rarity: SkinRarity | "ALL" = previous?.rarity ?? "ALL";

    const confirmPurchase = (name: string, price: number, purchase: () => boolean, currency = "moedas", balance: () => number = () => profile.totalCoins) => {
      const confirmation = ui.modal(
        "Confirmar compra",
        `Tem certeza que deseja comprar ${name} por ${price.toLocaleString("pt-BR")} ${currency}?\nSeu saldo atual: ${balance().toLocaleString("pt-BR")} ${currency}.`,
        [
          { label: "CONFIRMAR COMPRA", run: () => {
            this.captureSkinScroll();
            if (balance() < price || !purchase()) {
              confirmation.destroy();
              this.restoreSkinScroll();
              ui.toast("Compra não realizada. Confira seu saldo e a disponibilidade do item.");
              return;
            }
            void save.save().then(() => {
              confirmation.destroy();
              render();
              this.restoreSkinScroll();
              this.showPurchaseSuccess(name);
            });
          } },
          { label: "CANCELAR", run: () => {
            this.captureSkinScroll();
            confirmation.destroy();
            this.restoreSkinScroll();
          } },
        ],
      );
      audio.play("click");
    };

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
      const ownedCount = skins.filter((skin) => profile.unlockedSkins.includes(skin.id) || skinUnlockStatus(skin, profile).unlocked).length;
      return `<section class="pet-shop-intro skin-shop-intro" aria-label="Resumo das skins">
        <div><span class="kicker">SUA COLEÇÃO</span><h2>${ownedCount} de ${skins.length} skins</h2><p>Desbloqueie e equipe visuais para personalizar sua cobrinha.</p></div>
        <div class="pet-wallet"><span>🪙 SALDO</span><strong>${profile.totalCoins.toLocaleString("pt-BR")}</strong><small>moedas</small></div>
      </section>
      <article class="card shop-ad-reward"><h2>🎬 Bônus diário</h2><p>Assista a um anúncio recompensado e receba ${SHOP_REWARDED_COINS} moedas. Opcional · disponível uma vez por dia.</p><button class="action" data-shop-reward ${rewardAvailable ? "" : "disabled"}>${rewardAvailable ? `ASSISTIR · +${SHOP_REWARDED_COINS} MOEDAS` : "RESGATADO HOJE"}</button></article><div class="skin-filters" role="group" aria-label="Filtrar skins">
        <button class="action small ${filter === "ALL" ? "" : "secondary"}" data-filter="ALL">TODAS</button>
        <button class="action small ${filter === "OWNED" ? "" : "secondary"}" data-filter="OWNED">MINHAS</button>
        <button class="action small ${filter === "LOCKED" ? "" : "secondary"}" data-filter="LOCKED">BLOQUEADAS</button>
        <select id="filter-rarity" aria-label="Filtrar por raridade"><option value="ALL">Todas as raridades</option>${skinRarities.map((value) => `<option value="${value}" ${rarity === value ? "selected" : ""}>${value}</option>`).join("")}</select>
      </div><div class="grid">${list.map((skin) => {
        const owned = profile.unlockedSkins.includes(skin.id) || skinUnlockStatus(skin, profile).unlocked;
        const selected = profile.selectedSkin === skin.id;
        const status = skinUnlockStatus(skin, profile);
        const mystery = isMysterySkin(skin) && !status.unlocked;
        const premium = skin.unlockType === "PREMIUM";
        const price = skin.unlockType === "COINS" ? `${skin.coinPrice?.toLocaleString("pt-BR")} moedas` : status.label;
        const equip = !premium && (owned || status.unlocked)
          ? `<button id="skin-${skin.id}" class="action small ${selected ? "secondary" : ""}" data-equip-skin="${skin.id}" ${selected ? "disabled" : ""}>${selected ? "EQUIPADA" : "EQUIPAR"}</button>`
          : !premium && skin.unlockType === "COINS" && skin.coinPrice !== null
            ? `<button class="action small" data-buy-skin="${skin.id}" ${profile.totalCoins < skin.coinPrice ? "disabled" : ""}>COMPRAR</button>`
            : "";
        return `<article class="card skin-card rarity-card rarity-${skin.rarity.toLowerCase()}" data-skin="${skin.id}" tabindex="0" role="button" aria-label="Visualizar ${mystery ? "skin misteriosa" : `${skin.name}, ${skin.rarity}`}">
          ${mystery ? '<div class="mystery-skin-mark" aria-label="Aparência oculta">?</div>' : `<img src="${textureURL(this, `${skin.id}-preview-head`)}" alt="Preview de ${skin.name}">`}
          <div class="details"><h2>${mystery ? "Skin misteriosa" : skin.name}</h2><span class="skin-rarity rarity-${skin.rarity.toLowerCase()}">${mystery ? "MISTÉRIO" : skin.rarity}</span><p>${mystery ? skinMysteryClues.subtle : premium ? "🔒 PREMIUM · INDISPONÍVEL" : owned ? selected ? "✓ EQUIPADA" : "✓ DESBLOQUEADA" : price}</p>
          <div class="skin-card-actions"><button class="action small secondary" data-view="${skin.id}">VER</button>${mystery ? '<button class="action small secondary" data-mystery-clue>REVELAR PISTA</button>' : equip}</div></div></article>`;
      }).join("") || '<p class="muted">Nenhuma skin nesta seleção.</p>'}</div>`;
    };

    const renderPets = () => {
      const visiblePets = pets.filter((pet) => pet.id !== "lucky-leprechaun" || profile.unlockedPets.includes(pet.id));
      const ownedCount = visiblePets.filter((pet) => profile.unlockedPets.includes(pet.id)).length;
      return `<section class="pet-shop-intro" aria-label="Resumo dos mascotes">
        <div><span class="kicker">SUA COLEÇÃO</span><h2>${ownedCount} de ${pets.length} mascotes</h2><p>Derrote chefes para liberar mascotes e colete Boss Coins que eles deixam cair para comprar novos companheiros.</p></div>
        <div class="pet-wallet"><span>◆ SALDO</span><strong>${profile.bossCoinBalance.toLocaleString("pt-BR")}</strong><small>Boss Coins</small></div>
      </section>
      <div class="pet-collection-grid">${visiblePets.map((pet) => {
        const unlocked = profile.unlockedPets.includes(pet.id);
        const available = profile.availablePets.includes(pet.id);
        const selected = profile.selectedPet === pet.id;
        const permanent = pet.id === "lucky-leprechaun";
        const premium = pet.unlockType === "PREMIUM";
        const purchasable = available && pet.unlockType === "BOSS" && Boolean(pet.coinPrice);
        const stateClass = permanent && unlocked || selected ? "pet-equipped" : unlocked ? "pet-owned" : purchasable ? "pet-available" : "pet-locked";
        const stateLabel = permanent && unlocked ? "EQUIPADO PERMANENTE" : selected ? "EQUIPADO" : unlocked ? "COMPRADO" : premium ? "PREMIUM" : purchasable ? "À VENDA" : "BLOQUEADO";
        const action = permanent && unlocked
          ? `<button class="action secondary" disabled>EQUIPADO PERMANENTE</button>`
          : unlocked
          ? `<button class="action ${selected ? "secondary" : ""}" data-equip-pet="${pet.id}" ${selected ? "disabled" : ""}>${selected ? "EQUIPADO" : "EQUIPAR"}</button>`
          : purchasable
            ? `<button class="action" data-buy-pet="${pet.id}" ${profile.bossCoinBalance < pet.coinPrice! ? "disabled" : ""}>COMPRAR · ${pet.coinPrice} BOSS COINS</button>`
            : `<button class="action secondary" disabled>${premium ? "PREMIUM · EM BREVE" : "BLOQUEADO"}</button>`;
        const detail = permanent && unlocked ? "Sempre ativo · não pode ser desequipado." : unlocked ? (selected ? "Seu mascote ativo nesta partida." : "Disponível para equipar quando quiser.") : pet.unlockedBy;
        const rarityClass = pet.rarity === "PREMIUM" ? "rarity-mythic" : `rarity-${pet.rarity.toLowerCase()}`;
        return `<article class="card rarity-card pet-card ${stateClass} ${rarityClass}">
          <div class="pet-card-top"><div class="pet-symbol" aria-hidden="true">${pet.symbol}</div><span class="pet-state" aria-label="Status: ${stateLabel}">${stateLabel}</span></div>
          <span class="skin-rarity ${rarityClass}">${pet.rarity}</span><h2>${pet.name}</h2><p class="pet-description">${pet.description}</p>
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
      const restoreScroll = category === "skins" ? this.skinScrollY : previous?.scrollY;
      if (restoreScroll !== undefined) {
        ui.root.scrollTop = restoreScroll;
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
        ui.root.querySelectorAll<HTMLButtonElement>("[data-mystery-clue]").forEach((button) => button.addEventListener("click", (event) => {
          event.stopPropagation();
          button.closest(".details")?.querySelector("p")?.replaceChildren(document.createTextNode(skinMysteryClues.clear));
          button.disabled = true;
          button.textContent = "PISTA REVELADA";
        }));
        ui.root.querySelectorAll<HTMLButtonElement>("[data-buy-skin]").forEach((button) => button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.captureSkinScroll();
          const skin = skins.find((entry) => entry.id === button.dataset.buySkin);
          if (!skin || skin.unlockType !== "COINS" || skin.coinPrice === null || profile.unlockedSkins.includes(skin.id)) return;
          confirmPurchase(skin.name, skin.coinPrice, () => buySkin(profile, skin.id));
        }));
        ui.root.querySelectorAll<HTMLButtonElement>("[data-equip-skin]").forEach((button) => button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.captureSkinScroll();
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
          const pet = pets.find((entry) => entry.id === id);
          if (!id || !pet || !profile.availablePets.includes(id) || profile.unlockedPets.includes(id)) {
            ui.toast("Este mascote não está disponível para compra.");
            return;
          }
          const price = pet.coinPrice;
          if (!price) return;
          confirmPurchase(pet.name, price, () => buyPet(profile, id), "Boss Coins", () => profile.bossCoinBalance);
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
    this.captureSkinScroll();
    audio.play("click");
    haptic("coin");
    this.ui.root.hidden = true;
    this.scene.pause();
    this.scene.launch("SkinPreview", { skinId: id });
  }

  showShop() {
    if (this.ui?.root.isConnected) this.ui.root.hidden = false;
  }

  showPurchaseSuccess(name: string) {
    this.ui.toast(`🎉 ${name} comprado com sucesso!`, "shop-purchase-success");
    audio.play("purchase_success");
    haptic("golden");
  }
}