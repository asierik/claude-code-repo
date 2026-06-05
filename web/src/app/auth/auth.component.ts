import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  template: `
    <section class="auth">
      <div class="auth-card">
        <h1 class="brand">🥕 MealMate</h1>
        <p class="tagline">Plan meals together. Shop once.</p>
        <form class="stack" (ngSubmit)="submit()">
          <input name="username" placeholder="Username" autocomplete="username"
                 [(ngModel)]="username" />
          <input name="password" type="password" placeholder="Password"
                 [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                 [(ngModel)]="password" />
          @if (error()) { <p class="error">{{ error() }}</p> }
          <button type="submit" class="primary" [disabled]="busy()">
            {{ mode() === 'login' ? 'Sign in' : 'Create account' }}
          </button>
        </form>
        <p class="switch">
          <span>{{ mode() === 'login' ? 'New here?' : 'Have an account?' }}</span>
          <a (click)="toggle()">{{ mode() === 'login' ? 'Create an account' : 'Sign in' }}</a>
        </p>
      </div>
    </section>
  `,
})
export class AuthComponent {
  private auth = inject(AuthService);

  mode = signal<'login' | 'register'>('login');
  username = '';
  password = '';
  error = signal('');
  busy = signal(false);

  toggle() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set('');
  }

  async submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const u = this.username.trim();
      if (this.mode() === 'login') await this.auth.login(u, this.password);
      else await this.auth.register(u, this.password);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      this.busy.set(false);
    }
  }
}
