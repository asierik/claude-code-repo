import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { PlanEntry, Slot } from './models';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private api = inject(ApiService);

  async list(spaceId: number): Promise<PlanEntry[]> {
    const { plan } = await this.api.get<{ plan: PlanEntry[] }>(`/spaces/${spaceId}/plan`);
    return plan;
  }

  addToSlot(spaceId: number, date: string, slot: Slot, dishId: number) {
    return this.api.post(`/spaces/${spaceId}/plan`, { date, slot, dish_id: dishId });
  }

  removeFromSlot(spaceId: number, date: string, slot: Slot, dishId: number) {
    return this.api.delete(`/spaces/${spaceId}/plan`, { date, slot, dish_id: dishId });
  }

  clearSlot(spaceId: number, date: string, slot: Slot) {
    return this.api.delete(`/spaces/${spaceId}/plan`, { date, slot, dish_id: null });
  }
}
