import { Component, inject } from '@angular/core';
import { AuthService } from './core/auth.service';
import { AuthComponent } from './auth/auth.component';
import { ShellComponent } from './shell/shell.component';

@Component({
  selector: 'app-root',
  imports: [AuthComponent, ShellComponent],
  template: `
    @if (auth.ready()) {
      @if (auth.user()) {
        <app-shell />
      } @else {
        <app-auth />
      }
    }
  `,
})
export class App {
  protected auth = inject(AuthService);

  constructor() {
    // Restore an existing session on load; flips auth.ready() when done.
    this.auth.loadMe();
  }
}
