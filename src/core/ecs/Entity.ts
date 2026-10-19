export interface ComponentMap {
  position: { x: number; y: number };
  tag: { category: 'player' | 'threat' | 'npc' | 'resource' | 'structure'; refId: string };
}

export class Entity {
  public readonly id: string;
  private readonly components = new Map<keyof ComponentMap, unknown>();

  constructor(id: string) {
    this.id = id;
  }

  public addComponent<K extends keyof ComponentMap>(key: K, data: ComponentMap[K]): this {
    this.components.set(key, data);
    return this;
  }

  public getComponent<K extends keyof ComponentMap>(key: K): ComponentMap[K] | undefined {
    return this.components.get(key) as ComponentMap[K] | undefined;
  }

  public hasComponent<K extends keyof ComponentMap>(key: K): boolean {
    return this.components.has(key);
  }
}
