import { Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserStore } from '../../core/stores/user.store';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  `,
  styles: []
})
export class CallbackComponent {
  private userStore = inject(UserStore);
  private router = inject(Router);

  constructor(){
    if(!untracked(this.userStore.initialised)){
        this.userStore.getRequest();
    }
    effect(()=>{
        if(this.userStore.initialised()){
            const data = this.userStore.data();
            if(data){
                localStorage.setItem('isLoggedIn', 'true');
                this.router.navigate(['/home']);
            }else{
                this.router.navigate(['/login']);
            }
        }
    })
  }
}

