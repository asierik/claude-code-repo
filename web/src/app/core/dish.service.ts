import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Dish } from './models';

export type DishInput = Pick<Dish, 'name' | 'ingredients' | 'tags'>;

@Injectable({ providedIn: 'root' })
export class DishService {
  private api = inject(ApiService);

  async list(spaceId: number): Promise<Dish[]> {
    const { dishes } = await this.api.get<{ dishes: Dish[] }>(`/spaces/${spaceId}/dishes`);
    return dishes;
  }

  create(spaceId: number, body: DishInput) {
    return this.api.post<{ dish: Dish }>(`/spaces/${spaceId}/dishes`, body);
  }

  update(spaceId: number, id: number, body: DishInput) {
    return this.api.put<{ dish: Dish }>(`/spaces/${spaceId}/dishes/${id}`, body);
  }

  remove(spaceId: number, id: number) {
    return this.api.delete(`/spaces/${spaceId}/dishes/${id}`);
  }
}
