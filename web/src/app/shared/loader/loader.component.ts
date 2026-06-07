import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
})
export class LoaderComponent {
  @Input() loading!: Signal<boolean>;
  @Input() message?: string = '';
  @Input() mode?: 'skeleton' | 'spinner' = 'skeleton';

  isLoading() {
    return !!this.loading && this.loading();
  }
}
