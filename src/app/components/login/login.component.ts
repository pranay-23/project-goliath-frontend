import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { UserStore } from '../../core/stores/user.store';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule, InputTextModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true
})
export class LoginComponent implements OnInit{
  public authService = inject(AuthService);
  private router = inject(Router);
  fb = inject(FormBuilder);
  loginForm = signal<FormGroup>(null);

  constructor(){
    if(this.authService.isAuthenticated()){
      this.router.navigate(['/dashboard']);
    }
  }

  
  ngOnInit(): void {
    this.loginForm.set(this.fb.group({
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required]),
    }))
  }

  login() {
    const email = this.loginForm().get('email').value;
    const password = this.loginForm().get('password').value;

    this.authService.login({email,password});
  }
}
