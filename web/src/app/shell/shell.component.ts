import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { SpaceService } from '../core/space.service';
import { Member } from '../core/models';
import { CalendarComponent } from '../calendar/calendar.component';
import { DishesComponent } from '../dishes/dishes.component';
import { GroceryComponent } from '../grocery/grocery.component';

type View = 'calendar' | 'dishes' | 'grocery';

@Component({
  selector: 'app-shell',
  imports: [FormsModule, CalendarComponent, DishesComponent, GroceryComponent],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="space-switch">
          <select [ngModel]="space.activeId()" (ngModelChange)="onSpaceChange($event)">
            @for (s of space.spaces(); track s.id) {
              <option [ngValue]="s.id">{{ s.name }}{{ s.role === 'member' ? ' (shared)' : '' }}</option>
            }
          </select>
          <button
            class="icon-btn"
            (click)="toggleFavourite()"
            [disabled]="favouriteBusy()"
            [title]="space.favouriteId() === space.activeId() ? 'Unset favourite space' : 'Set as favourite space'"
          >{{ space.favouriteId() === space.activeId() ? '★' : '☆' }}</button>
          <button class="icon-btn" (click)="openShare()" title="Share this space">🔗</button>
        </div>
        <button class="icon-btn" (click)="logout()" title="Sign out">⎋</button>
      </header>

      @if (space.favouriteStale()) {
        <p class="small note-stale">
          Your favourite space is no longer available, so it wasn't auto-selected.
          <button class="link-btn" (click)="space.favouriteStale.set(false)">Dismiss</button>
        </p>
      }

      <main class="view">
        @switch (view()) {
          @case ('calendar') { <app-calendar /> }
          @case ('dishes') { <app-dishes /> }
          @case ('grocery') { <app-grocery /> }
        }
      </main>

      <nav class="tabbar">
        <button class="tab" [class.active]="view() === 'calendar'" (click)="view.set('calendar')">
          <span class="ico">📅</span>Calendar
        </button>
        <button class="tab" [class.active]="view() === 'dishes'" (click)="view.set('dishes')">
          <span class="ico">📖</span>Dishes
        </button>
        <button class="tab" [class.active]="view() === 'grocery'" (click)="view.set('grocery')">
          <span class="ico">🛒</span>Grocery
        </button>
      </nav>
    </div>

    @if (shareOpen()) {
      <div class="scrim" (click)="closeShare()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Share “{{ space.active()?.name }}”</h3>

          @if (space.active()?.role === 'owner') {
            <div class="field">
              <label>Invite a user by username</label>
              <input placeholder="username"
                     [ngModel]="shareUsername()" (ngModelChange)="shareUsername.set($event)" />
            </div>
            @if (shareMsg()) { <p class="small note-ok">{{ shareMsg() }}</p> }
            @if (shareError()) { <p class="error">{{ shareError() }}</p> }
            <div class="sheet-actions">
              <button class="btn" (click)="closeShare()">Close</button>
              <button class="primary" [disabled]="busy()" (click)="doShare()">Share</button>
            </div>
          } @else {
            <p class="muted">Shared with you by {{ space.active()?.owner }}. Only the owner can invite others.</p>
            <div class="sheet-actions"><button class="btn" (click)="closeShare()">Close</button></div>
          }

          <h3 class="mt-4">People with access</h3>
          @for (m of members(); track m.username) {
            <div class="row member-row">
              <span>{{ m.username }}</span><span class="spacer"></span>
              <span class="tag">{{ m.role }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ShellComponent {
  protected auth = inject(AuthService);
  protected space = inject(SpaceService);

  view = signal<View>('calendar');

  shareOpen = signal(false);
  shareUsername = signal('');
  shareMsg = signal('');
  shareError = signal('');
  members = signal<Member[]>([]);
  busy = signal(false);
  favouriteBusy = signal(false);

  constructor() {
    this.space.load();
  }

  onSpaceChange(id: number) {
    this.space.setActive(Number(id));
  }

  async toggleFavourite() {
    const id = this.space.activeId();
    if (id == null || this.favouriteBusy()) return;
    this.favouriteBusy.set(true);
    try {
      await this.space.toggleFavourite(id);
    } finally {
      this.favouriteBusy.set(false);
    }
  }

  async logout() {
    await this.auth.logout();
    this.space.reset();
  }

  async openShare() {
    this.shareUsername.set('');
    this.shareMsg.set('');
    this.shareError.set('');
    this.shareOpen.set(true);
    await this.loadMembers();
  }
  closeShare() {
    this.shareOpen.set(false);
  }

  private async loadMembers() {
    const id = this.space.activeId();
    if (id != null) this.members.set(await this.space.members(id));
  }

  async doShare() {
    const id = this.space.activeId();
    const username = this.shareUsername().trim();
    if (id == null || !username || this.busy()) return;
    this.busy.set(true);
    this.shareMsg.set('');
    this.shareError.set('');
    try {
      const who = await this.space.share(id, username);
      this.shareMsg.set(`Shared with ${who}.`);
      this.shareUsername.set('');
      await this.loadMembers();
    } catch (e) {
      this.shareError.set(e instanceof Error ? e.message : 'Could not share');
    } finally {
      this.busy.set(false);
    }
  }
}
