import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { UserStore } from './core/stores/user.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule,TopbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class App {
  public userStore = inject(UserStore);
  isDarkMode = signal<boolean>(false);

  constructor() {
    effect(() => {
      const currentMode = this.isDarkMode();
      if (currentMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    });
    effect(() => {
      if(!untracked(this.userStore.initialised) && localStorage.getItem('isLoggedIn') === 'true'){
        this.userStore.getRequest();
      }
    })
  }

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      this.isDarkMode.set(prefersDark);
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update(value => !value);
  }
}

