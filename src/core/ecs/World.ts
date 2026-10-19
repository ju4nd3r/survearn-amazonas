import { ComponentMap, Entity } from './Entity';

export class ECSWorld {
  private readonly entities = new Map<string, Entity>();

  public addEntity(entity: Entity): Entity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  public removeEntity(id: string): void {
    this.entities.delete(id);
  }

  public getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  public query<K extends keyof ComponentMap>(...requiredKeys: K[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (requiredKeys.every((k) => entity.hasComponent(k))) {
        result.push(entity);
      }
    }
    return result;
  }

  public clear(): void {
    this.entities.clear();
  }
}
