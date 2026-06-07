import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../shared/loader/loader.component';
import { SpaceService } from '../core/space.service';
import { DishService } from '../core/dish.service';
import { Dish, Ingredient } from '../core/models';

@Component({
  selector: 'app-dishes',
  imports: [FormsModule, LoaderComponent],
  template: `
    <div style="position:relative">
      <app-loader [loading]="loading" message="Loading…"></app-loader>
      <h2>Dishes</h2>

    <div class="filterbar">
      <input placeholder="Search name or ingredient…"
             [ngModel]="search()" (ngModelChange)="search.set($event)" />
    </div>
    @if (allTags().length) {
      <div style="margin-bottom:var(--space-3)">
        @for (t of allTags(); track t) {
          <span class="tag toggle" [class.on]="activeTags().includes(t)" (click)="toggleTag(t)">{{ t }}</span>
        }
      </div>
    }

    @for (d of filtered(); track d.id) {
      <div class="card dish-card">
        <div class="row">
          <h3>{{ d.name }}</h3>
          <span class="spacer"></span>
          <button class="btn small" (click)="openEdit(d)">Edit</button>
          <button class="btn small danger" (click)="remove(d)">✕</button>
        </div>
        @if (d.tags.length) {
          <div>@for (t of d.tags; track t) { <span class="tag">{{ t }}</span> }</div>
        }
        @if (d.ingredients.length) {
          <ul class="ing-list">
            @for (ing of d.ingredients; track $index) {
              <li>{{ ing.name }}@if (ing.amount) { <span class="muted"> — {{ ing.amount }}</span> }</li>
            }
          </ul>
        }
      </div>
    } @empty {
      <p class="empty">No dishes yet. Tap ＋ to add your first one.</p>
    }

    <button class="fab" (click)="openNew()" aria-label="Add dish">＋</button>

    @if (formOpen()) {
      <div class="scrim" (click)="closeForm()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>{{ editingId() ? 'Edit dish' : 'New dish' }}</h3>

          <div class="field">
            <label>Name</label>
            <input placeholder="e.g. Pasta Pesto" [(ngModel)]="fName" />
          </div>

          <div class="field">
            <label>Ingredients</label>
            @for (ing of fIngredients(); track $index) {
              <div class="ing-row">
                <input class="ing-name" placeholder="Ingredient" [(ngModel)]="ing.name" />
                <input class="ing-amt" placeholder="Amount" [(ngModel)]="ing.amount" />
                <button class="btn small danger" (click)="removeIngredient($index)">✕</button>
              </div>
            }
            <button class="btn small" (click)="addIngredient()">+ ingredient</button>
          </div>

          <div class="field">
            <label>Tags (comma separated)</label>
            <input placeholder="quick, veggie" [(ngModel)]="fTags" />
          </div>

          @if (formError()) { <p class="error">{{ formError() }}</p> }

          <div class="sheet-actions">
            <button class="btn" (click)="closeForm()">Cancel</button>
            <button class="primary" [disabled]="busy()" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
      </div>
  `,
})
export class DishesComponent {
  private space = inject(SpaceService);
  private dishSvc = inject(DishService);

  dishes = signal<Dish[]>([]);
  loading = signal(false);
  search = signal('');
  activeTags = signal<string[]>([]);

  formOpen = signal(false);
  editingId = signal<number | null>(null);
  fName = '';
  fIngredients = signal<Ingredient[]>([]);
  fTags = '';
  formError = signal('');
  busy = signal(false);

  allTags = computed(() => {
    const set = new Set<string>();
    for (const d of this.dishes()) for (const t of d.tags) set.add(t);
    return [...set].sort();
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const tags = this.activeTags();
    return this.dishes().filter((d) => {
      const matchesText =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.ingredients.some((i) => i.name.toLowerCase().includes(q));
      const matchesTags = tags.every((t) => d.tags.includes(t));
      return matchesText && matchesTags;
    });
  });

  constructor() {
    effect(() => {
      const id = this.space.activeId();
      if (id != null) {
        this.loading.set(true);
        this.reload(id).finally(() => this.loading.set(false));
      }
    });
  }

  private async reload(spaceId: number) {
    this.dishes.set(await this.dishSvc.list(spaceId));
  }

  toggleTag(t: string) {
    const cur = this.activeTags();
    this.activeTags.set(cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  }

  openNew() {
    this.editingId.set(null);
    this.fName = '';
    this.fIngredients.set([{ name: '', amount: '' }]);
    this.fTags = '';
    this.formError.set('');
    this.formOpen.set(true);
  }

  openEdit(d: Dish) {
    this.editingId.set(d.id);
    this.fName = d.name;
    this.fIngredients.set(d.ingredients.length ? d.ingredients.map((i) => ({ ...i })) : [{ name: '', amount: '' }]);
    this.fTags = d.tags.join(', ');
    this.formError.set('');
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  addIngredient() {
    this.fIngredients.set([...this.fIngredients(), { name: '', amount: '' }]);
  }
  removeIngredient(i: number) {
    this.fIngredients.set(this.fIngredients().filter((_, idx) => idx !== i));
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
    const body = {
      name,
      ingredients: this.fIngredients().filter((i) => i.name.trim()),
      tags: this.fTags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      const editId = this.editingId();
      if (editId) await this.dishSvc.update(id, editId, body);
      else await this.dishSvc.create(id, body);
      this.closeForm();
      await this.reload(id);
    } catch (e) {
      this.formError.set(e instanceof Error ? e.message : 'Could not save');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(d: Dish) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.dishSvc.remove(id, d.id);
    await this.reload(id);
  }
}
