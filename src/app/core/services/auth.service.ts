import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { catchError, filter, map, Observable, take, tap, throwError } from 'rxjs';
import { UserStore } from '../stores/user.store';
import { Router, UrlTree } from '@angular/router';
import {CookieService} from 'ngx-cookie-service';
import { toObservable } from '@angular/core/rxjs-interop';


@Injectable({
  providedIn: 'root',
})

export class AuthService {
    private readonly apiService = inject(ApiService);
    private readonly router = inject(Router);
    private readonly cookieService = inject(CookieService);
    public userStore = inject(UserStore);


    login(credentials:{email:string,password:string}){
        const body = credentials;
        this.apiService.post<any>(true,API_ENDPOINTS.LOGIN,body).subscribe({
            next: (response:any) =>{
                if(response.responseHeader.success){
                    localStorage.setItem('isLoggedIn', 'true');
                    this.userStore.getRequest();
                    this.router.navigate(['/dashboard']);
                }
            },
            error: (error) => {
                localStorage.removeItem('isLoggedIn');
                console.log(error);
            }
        })
    }
    
    signup(user: any) {
        this.apiService.post<any>(true, API_ENDPOINTS.SIGNUP, user).subscribe({
            next: (response: any) => {
                if (response.responseHeader.success) {
                    // Automatically log in after successful signup
                    this.login({
                        email: user.email,
                        password: user.password
                    });
                }
            },
            error: (error) => {
                console.log(error);
            }
        });
    }

    logout(){
        this.apiService.get(true,API_ENDPOINTS.LOGOUT).subscribe({
            next: (response:any) =>{
                if(response.responseHeader.success){
                    localStorage.removeItem('isLoggedIn');
                    this.userStore.clearState();
                    this.router.navigate(['/home']);
                }
            }
        })
    }

    canActivate(): Observable<boolean | UrlTree> {
        // Assuming your UserStore has a signal like `isSettled` that becomes
        // true after the initial API call is complete (either success or error).
        return toObservable(this.userStore.isSettled).pipe(
            // 1. Wait until the initial user check is complete.
            filter(isSettled => isSettled),

            // 2. Take only the first result and then unsubscribe.
            take(1),
            
            // 3. Once the check is done, determine the outcome.
            map(() => {
                // Now, perform the synchronous check on the store's final state.
                const isAuthenticated = this.userStore.data() !== null && !this.userStore.error();
                
                if (isAuthenticated) {
                return true;
                } else {
                return this.router.createUrlTree(['/home']);
                }
            })
        );
    }

    isAuthenticated():boolean{
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if(isLoggedIn === 'true'){
            return true;
        }else{
            return false;
        }
    }
}