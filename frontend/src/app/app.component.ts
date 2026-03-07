import { AfterViewInit, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.remove();
    }
  }
}
