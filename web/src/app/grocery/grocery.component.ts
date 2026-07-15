import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpaceService } from '../core/space.service';
import { GroceryService } from '../core/grocery.service';
import { GroceryItem } from '../core/models';

@Component({
  selector: 'app-grocery',
  imports: [FormsModule],
  template: `
    <h2>Grocery list</h2>
    <p class="view-subtitle">
      Everything for meals planned from today onward, plus anything else you add. Tick items off as you grab them.
    </p>

    <div class="card">
      @if (loading()) {
        @for (i of skeletonRows; track i) {
          <div class="gitem">
            <div class="skeleton skel-checkbox"></div>
            <span class="g-main"><span class="skeleton skeleton-line w-60"></span></span>
          </div>
        }
      } @else {
        @for (item of items(); track item.key) {
          <label class="gitem" [class.done]="item.checked">
            <input type="checkbox" [checked]="item.checked" (change)="toggle(item)" />
            <span class="g-main">
              <span class="g-name">{{ item.name }}&nbsp;</span>
              @if (item.amounts.length) { <span class="muted"> · {{ item.amounts.join(', ') }}</span> }
              @if (item.from.length) { <span class="g-sub">for {{ item.from.join(', ') }}</span> }
            </span>
            @if (item.custom) {
              <button class="btn small danger" (click)="remove(item, $event)">✕</button>
            }
          </label>
        } @empty {
          <p class="empty">Nothing to buy yet — plan some meals in the Calendar, or add your own item.</p>
        }
      }
    </div>
    <button class="fab" (click)="openAdd()" aria-label="Add item">＋</button>

    @if (formOpen()) {
      <div class="scrim" (click)="closeForm()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Add item</h3>

          <div class="field">
            <label>Name</label>
            <input placeholder="e.g. window cleaner" [(ngModel)]="fName" (keyup.enter)="save()" autofocus />
          </div>

          @if (formError()) { <p class="error">{{ formError() }}</p> }

          <div class="sheet-actions">
            <button class="btn" (click)="closeForm()">Cancel</button>
            <button class="primary" [disabled]="busy()" (click)="save()">Add</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GroceryComponent {
  private space = inject(SpaceService);
  private grocerySvc = inject(GroceryService);

  items = signal<GroceryItem[]>([]);
  loading = signal(true);
  skeletonRows = Array.from({ length: 4 }, (_, i) => i);

  formOpen = signal(false);
  fName = '';
  formError = signal('');
  busy = signal(false);

  constructor() {
    effect(() => {
      const id = this.space.activeId();
      if (id != null) this.reload(id);
    });
  }

  // Full reload (space switch / first mount) — shows the skeleton.
  private async reload(spaceId: number) {
    this.loading.set(true);
    try {
      await this.refresh(spaceId);
    } finally {
      this.loading.set(false);
    }
  }

  // Silent refetch after a mutation — keeps the current list on screen.
  private async refresh(spaceId: number) {
    this.items.set(await this.grocerySvc.list(spaceId));
  }

  async toggle(item: GroceryItem) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.grocerySvc.setChecked(id, item.key, !item.checked);
    await this.refresh(id);
  }

  openAdd() {
    this.fName = '';
    this.formError.set('');
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  async save() {
    const id = this.space.activeId();
    if (id == null || this.busy()) return;
    const name = this.fName.trim();
    if (!name) {
      this.formError.set('Name is required');
      return;
    }
    this.busy.set(true);
    this.formError.set('');
    try {
      await this.grocerySvc.addCustom(id, name);
      this.closeForm();
      await this.refresh(id);
    } catch (e) {
      this.formError.set(e instanceof Error ? e.message : 'Could not add item');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(item: GroceryItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const id = this.space.activeId();
    if (id == null || item.id == null) return;
    await this.grocerySvc.removeCustom(id, item.id);
    await this.refresh(id);
  }
}
