import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './core/interceptor/token.interceptor';
import { MessageService, ConfirmationService } from 'primeng/api';

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{gray.50}',
            100: '{gray.100}',
            200: '{gray.200}',
            300: '{gray.300}',
            400: '{gray.400}',
            500: '{gray.500}',
            600: '{gray.600}',
            700: '{gray.700}',
            800: '{gray.800}',
            900: '{gray.900}',
            950: '{gray.950}'
        }
    }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes,withComponentInputBinding(),withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(), 
    providePrimeNG({
      theme: {
        preset: MyPreset, 
        options: { 
          darkModeSelector: '.dark',
        }
      }
    }),
    MessageService,
    ConfirmationService
  ]
};
