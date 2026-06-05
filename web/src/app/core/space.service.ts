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

  async load(): Promise<void> {
    const { spaces } = await this.api.get<{ spaces: Space[] }>('/spaces');
    this.spaces.set(spaces);
    // Keep current selection if still valid, else default to the first space.
    if (!spaces.some((s) => s.id === this.activeId())) {
      this.activeId.set(spaces[0]?.id ?? null);
    }
  }

  setActive(id: number): void {
    this.activeId.set(id);
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
  }
}
