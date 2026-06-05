import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { GroceryItem } from './models';

@Injectable({ providedIn: 'root' })
export class GroceryService {
  private api = inject(ApiService);

  async list(spaceId: number): Promise<GroceryItem[]> {
    const { grocery } = await this.api.get<{ grocery: GroceryItem[] }>(`/spaces/${spaceId}/grocery`);
    return grocery;
  }

  setChecked(spaceId: number, itemKey: string, checked: boolean) {
    return this.api.post(`/spaces/${spaceId}/grocery/check`, { item_key: itemKey, checked });
  }
}
