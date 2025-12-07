import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { UserStore } from '../../core/stores/user.store';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';


interface City {
    name: string;
    code: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule, SelectModule, InputTextModule],
  templateUrl: './signup.component.html',
  changeDetection:ChangeDetectionStrategy.OnPush
})

export class SignupComponent implements OnInit {
  selectedCity: City | undefined;
  cities = [
            { name: 'New York', code: 'NY' },
            { name: 'Rome', code: 'RM' },
            { name: 'London', code: 'LDN' },
            { name: 'Istanbul', code: 'IST' },
            { name: 'Paris', code: 'PRS' }
        ];
  public authService = inject(AuthService);
  private router = inject(Router);
  fb = inject(FormBuilder);
  signupForm = signal<FormGroup>(null);
  
  // Options for dropdown selects
  genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
  ];
  
  weightUnitOptions = [
    { label: 'Kilograms (kg)', value: 'kg' },
    { label: 'Pounds (lbs)', value: 'lbs' }
  ];
  
  heightUnitOptions = [
    { label: 'Centimeters (cm)', value: 'cm' },
    { label: 'Inches (in)', value: 'in' }
  ];
  
  // Default unit values
  defaultWeightUnit = 'kg';
  defaultHeightUnit = 'cm';

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    this.signupForm.set(this.fb.group({
      firstName: new FormControl('', [Validators.required, Validators.maxLength(50)]),
      lastName: new FormControl('', [Validators.required, Validators.maxLength(50)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)  // Strong password validation
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
      age: new FormControl(null, [Validators.min(18)]),
      gender: new FormControl(''),
      height: new FormControl(null, [Validators.min(0)]),
      unitsPreference: this.fb.group({
        weight: new FormControl(this.defaultWeightUnit, [Validators.required]),
        height: new FormControl(this.defaultHeightUnit, [Validators.required])
      })
    }, { validators: this.passwordMatchValidator }));
  }

  // Custom validator to check if password and confirm password match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  signup() {
    if (this.signupForm().valid) {
      const formValue = this.signupForm().value;
      
      // Create user object from form values - only include fields that have values
      const user: any = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        password: formValue.password
      };
      
      // Add optional fields only if they have values
      if (formValue.age !== null && formValue.age !== undefined && formValue.age !== '') {
        user.age = formValue.age;
      }
      if (formValue.gender && formValue.gender !== '') {
        user.gender = formValue.gender;
      }
      if (formValue.height !== null && formValue.height !== undefined && formValue.height !== '') {
        user.height = formValue.height;
      }
      if (formValue.unitsPreference) {
        user.unitsPreference = formValue.unitsPreference;
      }
      
      // Call signup method from auth service
      this.authService.signup(user);
    }
  }
}
