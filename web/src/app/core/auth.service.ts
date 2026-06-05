import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);

  readonly user = signal<User | null>(null);
  readonly ready = signal(false); // true once the initial /me check completes

  // Called once at startup to restore an existing session.
  async loadMe(): Promise<void> {
    try {
      const { user } = await this.api.get<{ user: User }>('/me');
      this.user.set(user);
    } catch {
      this.user.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async login(username: string, password: string): Promise<void> {
    const { user } = await this.api.post<{ user: User }>('/login', { username, password });
    this.user.set(user);
  }

  async register(username: string, password: string): Promise<void> {
    const { user } = await this.api.post<{ user: User }>('/register', { username, password });
    this.user.set(user);
  }

  async logout(): Promise<void> {
    await this.api.post('/logout', {});
    this.user.set(null);
  }
}
