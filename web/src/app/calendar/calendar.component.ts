import { Component, computed, effect, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceService } from '../core/space.service';
import { PlanService } from '../core/plan.service';
import { DishService } from '../core/dish.service';
import { Dish, PlanEntry, Slot } from '../core/models';

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner'];
const MAX_DISHES_PER_SLOT = 3; // keep in sync with planService.MAX_DISHES_PER_SLOT

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (x.getDay() + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, TitleCasePipe],
  template: `
    <h2>Calendar</h2>

    <div class="week-nav">
      <button class="btn small" (click)="shiftWeek(-1)">‹ Prev</button>
      <span class="label">{{ rangeLabel() }}</span>
      <button class="btn small" (click)="shiftWeek(1)">Next ›</button>
    </div>
    <div class="row" style="margin-bottom:var(--space-3)">
      <button class="btn small" (click)="goToday()">Today</button>
      <span class="spacer"></span>
    </div>

    @for (day of days(); track day.key) {
      <div class="card day" [class.today]="day.isToday">
        <div class="day-head">
          <span class="dow">{{ day.dow }}</span>
          <span class="date">{{ day.label }}</span>
        </div>
        @for (slot of slots; track slot) {
          <button class="slot" [class.filled]="entriesFor(day.key, slot).length"
                  (click)="openPicker(day.key, slot)">
            <span class="slot-name">{{ slot }}</span>
            @if (entriesFor(day.key, slot).length) {
              <span class="slot-val">{{ dishNamesFor(day.key, slot) }}</span>
            } @else {
              <span class="slot-val is-empty">+ add</span>
            }
          </button>
        }
      </div>
    }

    @if (picker(); as p) {
      <div class="scrim" (click)="closePicker()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>{{ p.slot | titlecase }} · {{ p.dateLabel }}</h3>

          @if (entriesFor(p.date, p.slot).length) {
            <div style="margin-bottom:var(--space-3)">
              @for (e of entriesFor(p.date, p.slot); track e.id) {
                <div class="picker-item">
                  <span class="pi-name">{{ e.dish_name }}</span>
                  <button class="btn small danger" (click)="remove(p.date, p.slot, e.dish_id)">Remove</button>
                </div>
              }
            </div>
            <button class="btn danger" style="width:100%;margin-bottom:var(--space-3)"
                    (click)="clear(p.date, p.slot)">Clear all</button>
          }

          @if (slotFull(p.date, p.slot)) {
            <p class="empty">This slot already has {{ maxDishesPerSlot }} dishes — remove one to add another.</p>
          } @else if (dishes().length) {
            <input placeholder="Search dishes…"
                   [ngModel]="pickerSearch()" (ngModelChange)="pickerSearch.set($event)" />
            <div style="margin-top:var(--space-2)">
              @for (d of pickerResults(); track d.id) {
                <button class="picker-item" (click)="choose(p.date, p.slot, d)">
                  <span class="pi-name">{{ d.name }}</span>
                  @for (t of d.tags; track t) { <span class="tag">{{ t }}</span> }
                </button>
              } @empty {
                <p class="empty">No dishes match.</p>
              }
            </div>
          } @else {
            <p class="empty">No dishes yet — add some in the Dishes tab first.</p>
          }

          <div class="sheet-actions">
            <button class="btn" (click)="closePicker()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CalendarComponent {
  private space = inject(SpaceService);
  private planSvc = inject(PlanService);
  private dishSvc = inject(DishService);

  slots = SLOTS;
  maxDishesPerSlot = MAX_DISHES_PER_SLOT;
  weekStart = signal<Date>(startOfWeek(new Date()));
  plan = signal<PlanEntry[]>([]);
  dishes = signal<Dish[]>([]);
  picker = signal<{ date: string; slot: Slot; dateLabel: string } | null>(null);
  pickerSearch = signal('');

  private todayKey = ymd(new Date());

  days = computed(() => {
    const start = this.weekStart();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const key = ymd(d);
      return {
        key,
        isToday: key === this.todayKey,
        dow: d.toLocaleDateString(undefined, { weekday: 'long' }),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };
    });
  });

  rangeLabel = computed(() => {
    const s = this.weekStart();
    const e = addDays(s, 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
  });

  private planMap = computed(() => {
    const m = new Map<string, PlanEntry[]>();
    for (const e of this.plan()) {
      const key = `${e.date}|${e.slot}`;
      const list = m.get(key);
      if (list) list.push(e);
      else m.set(key, [e]);
    }
    return m;
  });

  // Dishes matching the search, excluding ones already assigned to the open slot.
  pickerResults = computed(() => {
    const q = this.pickerSearch().trim().toLowerCase();
    const p = this.picker();
    const assigned = p ? new Set(this.entriesFor(p.date, p.slot).map((e) => e.dish_id)) : new Set<number>();
    const all = this.dishes().filter((d) => !assigned.has(d.id));
    return q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all;
  });

  constructor() {
    // Reload whenever the active space changes (and on first mount).
    effect(() => {
      const id = this.space.activeId();
      if (id != null) this.reload(id);
    });
  }

  entriesFor(date: string, slot: Slot): PlanEntry[] {
    return this.planMap().get(`${date}|${slot}`) ?? [];
  }

  dishNamesFor(date: string, slot: Slot): string {
    return this.entriesFor(date, slot).map((e) => e.dish_name).join(', ');
  }

  slotFull(date: string, slot: Slot): boolean {
    return this.entriesFor(date, slot).length >= MAX_DISHES_PER_SLOT;
  }

  private async reload(spaceId: number) {
    const [plan, dishes] = await Promise.all([
      this.planSvc.list(spaceId),
      this.dishSvc.list(spaceId),
    ]);
    this.plan.set(plan);
    this.dishes.set(dishes);
  }

  shiftWeek(n: number) {
    this.weekStart.set(addDays(this.weekStart(), n * 7));
  }
  goToday() {
    this.weekStart.set(startOfWeek(new Date()));
  }

  openPicker(date: string, slot: Slot) {
    this.pickerSearch.set('');
    const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    this.picker.set({ date, slot, dateLabel: label });
  }
  closePicker() {
    this.picker.set(null);
  }

  async choose(date: string, slot: Slot, d: Dish) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.planSvc.addToSlot(id, date, slot, d.id);
    this.plan.set(await this.planSvc.list(id));
  }

  async remove(date: string, slot: Slot, dishId: number) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.planSvc.removeFromSlot(id, date, slot, dishId);
    this.plan.set(await this.planSvc.list(id));
  }

  async clear(date: string, slot: Slot) {
    const id = this.space.activeId();
    if (id == null) return;
    await this.planSvc.clearSlot(id, date, slot);
    this.closePicker();
    this.plan.set(await this.planSvc.list(id));
  }
}
