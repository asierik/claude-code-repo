import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Member, Space } from './models';

// Holds the list of accessible spaces and which one is active. Feature
// services read `activeId()` to scope their requests.
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private api = inject(ApiService);

  readonly spaces = signal<Space[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly active = computed(() => this.spaces().find((s) => s.id === this.activeId()) ?? null);
  readonly favouriteId = signal<number | null>(null);
  // True for one load() after a stored favourite turned out to be
  // inaccessible (space deleted, access revoked) — the shell shows a notice
  // for it, then it's cleared.
  readonly favouriteStale = signal(false);

  async load(): Promise<void> {
    const { spaces, favouriteId, favouriteStale } = await this.api.get<{
      spaces: Space[];
      favouriteId: number | null;
      favouriteStale: boolean;
    }>('/spaces');
    this.spaces.set(spaces);
    this.favouriteId.set(favouriteId);
    this.favouriteStale.set(favouriteStale);
    // Keep current selection if still valid, else prefer the favourite, else the first space.
    if (!spaces.some((s) => s.id === this.activeId())) {
      this.activeId.set(favouriteId ?? spaces[0]?.id ?? null);
    }
  }

  setActive(id: number): void {
    this.activeId.set(id);
  }

  async setFavourite(id: number): Promise<void> {
    await this.api.put<{ ok: true }>(`/spaces/${id}/favourite`, {});
    this.favouriteId.set(id);
    this.favouriteStale.set(false);
  }

  async clearFavourite(id: number): Promise<void> {
    await this.api.delete<{ ok: true }>(`/spaces/${id}/favourite`);
    if (this.favouriteId() === id) this.favouriteId.set(null);
  }

  toggleFavourite(id: number): Promise<void> {
    return this.favouriteId() === id ? this.clearFavourite(id) : this.setFavourite(id);
  }

  async members(spaceId: number): Promise<Member[]> {
    const { members } = await this.api.get<{ members: Member[] }>(`/spaces/${spaceId}/members`);
    return members;
  }

  async share(spaceId: number, username: string): Promise<string> {
    const res = await this.api.post<{ shared_with: string }>(`/spaces/${spaceId}/share`, { username });
    return res.shared_with;
  }

  reset(): void {
    this.spaces.set([]);
    this.activeId.set(null);
    this.favouriteId.set(null);
    this.favouriteStale.set(false);
  }
}
