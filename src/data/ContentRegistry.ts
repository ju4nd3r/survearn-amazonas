import plantsRaw from './content/plants.json';
import animalsRaw from './content/animals.json';
import materialsRaw from './content/materials.json';
import recipesRaw from './content/recipes.json';
import biomesRaw from './content/biomes.json';
import npcsRaw from './content/npcs.json';
import {
  AnimalSpecies,
  AnimalSpeciesSchema,
  BiomeDefinition,
  BiomeDefinitionSchema,
  MaterialItem,
  MaterialItemSchema,
  NPCDefinition,
  NPCSchema,
  PlantSpecies,
  PlantSpeciesSchema,
  RecipeDefinition,
  RecipeSchema
} from './schemas';
import { z } from 'zod';

class ContentRegistryService {
  public readonly plants: PlantSpecies[];
  public readonly animals: AnimalSpecies[];
  public readonly materials: MaterialItem[];
  public readonly recipes: RecipeDefinition[];
  public readonly biomes: BiomeDefinition[];
  public readonly npcs: NPCDefinition[];

  private readonly plantMap = new Map<string, PlantSpecies>();
  private readonly animalMap = new Map<string, AnimalSpecies>();
  private readonly materialMap = new Map<string, MaterialItem>();
  private readonly recipeMap = new Map<string, RecipeDefinition>();

  constructor() {
    this.plants = z.array(PlantSpeciesSchema).parse(plantsRaw);
    this.animals = z.array(AnimalSpeciesSchema).parse(animalsRaw);
    this.materials = z.array(MaterialItemSchema).parse(materialsRaw);
    this.recipes = z.array(RecipeSchema).parse(recipesRaw);
    this.biomes = z.array(BiomeDefinitionSchema).parse(biomesRaw);
    this.npcs = z.array(NPCSchema).parse(npcsRaw);

    for (const p of this.plants) this.plantMap.set(p.id, p);
    for (const a of this.animals) this.animalMap.set(a.id, a);
    for (const m of this.materials) this.materialMap.set(m.id, m);
    for (const r of this.recipes) this.recipeMap.set(r.id, r);
  }

  public getPlant(id: string): PlantSpecies | undefined {
    return this.plantMap.get(id);
  }

  public getAnimal(id: string): AnimalSpecies | undefined {
    return this.animalMap.get(id);
  }

  public getMaterial(id: string): MaterialItem | undefined {
    return this.materialMap.get(id);
  }

  public getRecipe(id: string): RecipeDefinition | undefined {
    return this.recipeMap.get(id);
  }

  public getItemDisplayName(itemId: string, lang: 'es' | 'en'): string {
    const plant = this.plantMap.get(itemId);
    if (plant) return plant.commonName[lang];
    const mat = this.materialMap.get(itemId);
    if (mat) return mat.commonName[lang];
    const rec = this.recipeMap.get(itemId);
    if (rec) return rec.name[lang];
    return itemId;
  }
}

export const ContentRegistry = new ContentRegistryService();
