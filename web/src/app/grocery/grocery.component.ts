import { Component, effect, inject, signal } from '@angular/core';
import { SpaceService } from '../core/space.service';
import { GroceryService } from '../core/grocery.service';
import { GroceryItem } from '../core/models';

@Component({
  selector: 'app-grocery',
  template: `
    <h2>Grocery list</h2>
    <p class="view-subtitle">
      Everything for meals planned from today onward. Tick items off as you grab them.
    </p>

    <div class="card">
      @for (item of items(); track item.key) {
        <label class="gitem" [class.done]="item.checked">
          <input type="checkbox" [checked]="item.checked" (change)="toggle(item)" />
          <span class="g-main">
            <span class="g-name">{{ item.name }}&nbsp;</span>
            @if (item.amounts.length) { <span class="muted"> · {{ item.amounts.join(', ') }}</span> }
            <span class="g-sub">for {{ item.from.join(', ') }}</span>
          </span>
        </label>
      } @empty {
        <p class="empty">Nothing to buy yet — plan some meals in the Calendar.</p>
      }
    </div>
  `,
})
export class GroceryComponent {
  private space = inject(SpaceService);
  private grocerySvc = inject(GroceryService);

  items = signal<GroceryItem[]>([]);

  constructor() {
    effect(() => {
      const id = this.space.activeId();
      if (id != null) this.reload(id);
    });
  }

  private async reload(spaceId: number) {
    this.items.set(await this.grocerySvc.list(spaceId));
  }

  async toggle(item: GroceryItem) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.grocerySvc.setChecked(id, item.key, !item.checked);
    await this.reload(id);
  }
}
