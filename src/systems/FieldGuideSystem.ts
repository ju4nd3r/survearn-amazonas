import { DiscoveryLevel } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';

export interface FieldGuideFilter {
  query: string;
  category: 'all' | 'plants' | 'animals' | 'materials';
  statusFilter: 'all' | 'edible' | 'medicinal' | 'toxic';
  lang: 'es' | 'en';
}

export interface FieldGuideCardView {
  id: string;
  category: 'plants' | 'animals' | 'materials';
  discoveryLevel: DiscoveryLevel | 'unknown';
  commonName: string;
  scientificName: string;
  badgeType: 'edible' | 'medicinal' | 'toxic' | 'utility';
  badgeLabel: string;
  habitatText: string;
  hintText: string;
  howToUseText: string;
  funFactText: string;
  sources: string[];
  spriteTint: string;
}

export class FieldGuideSystem {
  public static unlockSpecies(
    discovered: Record<string, DiscoveryLevel>,
    speciesId: string,
    level: DiscoveryLevel
  ): Record<string, DiscoveryLevel> {
    const current = discovered[speciesId];
    if (current === 'mastered') {
      return { ...discovered };
    }
    return {
      ...discovered,
      [speciesId]: level
    };
  }

  public static buildFilteredCards(
    discovered: Record<string, DiscoveryLevel>,
    filter: FieldGuideFilter
  ): FieldGuideCardView[] {
    const allCards: FieldGuideCardView[] = [];
    const q = filter.query.trim().toLowerCase();

    if (filter.category === 'all' || filter.category === 'plants') {
      for (const p of ContentRegistry.plants) {
        const level = discovered[p.id] ?? 'unknown';
        const badgeType =
          p.edibility === 'edible_raw' || p.edibility === 'edible_processed'
            ? 'edible'
            : p.edibility === 'medicinal'
              ? 'medicinal'
              : 'toxic';
        const badgeLabel =
          badgeType === 'edible'
            ? filter.lang === 'es'
              ? '✓ Comestible'
              : '✓ Edible'
            : badgeType === 'medicinal'
              ? filter.lang === 'es'
                ? '✚ Medicinal'
                : '✚ Medicinal'
              : filter.lang === 'es'
                ? '⚠️ Tóxico / Procesar'
                : '⚠️ Toxic / Process';

        allCards.push({
          id: p.id,
          category: 'plants',
          discoveryLevel: level,
          commonName: p.commonName[filter.lang],
          scientificName: p.scientificName,
          badgeType,
          badgeLabel,
          habitatText: p.biomeIds.join(', '),
          hintText: p.inspectionHint[filter.lang],
          howToUseText: p.howToUse[filter.lang],
          funFactText: p.funFact[filter.lang],
          sources: p.sources,
          spriteTint: p.spriteTint
        });
      }
    }

    if (filter.category === 'all' || filter.category === 'animals') {
      for (const a of ContentRegistry.animals) {
        const level = discovered[a.id] ?? 'unknown';
        const isSafeFood = a.threatLevel === 'harmless_prey';
        const badgeType = isSafeFood ? 'edible' : 'toxic';
        const badgeLabel = isSafeFood
          ? filter.lang === 'es'
            ? '✓ Fauna / Alimento'
            : '✓ Prey / Food'
          : filter.lang === 'es'
            ? '⚠️ Amenaza / Precaución'
            : '⚠️ Threat / Caution';

        allCards.push({
          id: a.id,
          category: 'animals',
          discoveryLevel: level,
          commonName: a.commonName[filter.lang],
          scientificName: a.scientificName,
          badgeType,
          badgeLabel,
          habitatText: a.biomeIds.join(', '),
          hintText: a.inspectionHint[filter.lang],
          howToUseText: a.behaviorNote[filter.lang],
          funFactText: a.funFact[filter.lang],
          sources: a.sources,
          spriteTint: a.spriteTint
        });
      }
    }

    if (filter.category === 'all' || filter.category === 'materials') {
      for (const m of ContentRegistry.materials) {
        const level = discovered[m.id] ?? 'observed';
        const badgeType = m.edibility === 'edible_safe' ? 'edible' : 'utility';
        const badgeLabel =
          badgeType === 'edible'
            ? filter.lang === 'es'
              ? '✓ Consumible'
              : '✓ Consumable'
            : filter.lang === 'es'
              ? '⚒️ Material / Utensilio'
              : '⚒️ Craft Material';

        allCards.push({
          id: m.id,
          category: 'materials',
          discoveryLevel: level,
          commonName: m.commonName[filter.lang],
          scientificName: m.scientificName,
          badgeType,
          badgeLabel,
          habitatText: m.biomeIds.length > 0 ? m.biomeIds.join(', ') : 'Camp / Crafted',
          hintText: m.description[filter.lang],
          howToUseText: m.description[filter.lang],
          funFactText: m.funFact[filter.lang],
          sources: m.sources,
          spriteTint: m.spriteTint
        });
      }
    }

    return allCards.filter((card) => {
      if (filter.statusFilter === 'edible' && card.badgeType !== 'edible') return false;
      if (filter.statusFilter === 'medicinal' && card.badgeType !== 'medicinal') return false;
      if (filter.statusFilter === 'toxic' && card.badgeType !== 'toxic') return false;

      if (q.length > 0) {
        const hay =
          `${card.commonName} ${card.scientificName} ${card.hintText} ${card.howToUseText}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }
}
