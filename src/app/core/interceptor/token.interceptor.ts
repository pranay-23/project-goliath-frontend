import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { FormSanitizationService } from '../services/form-sanitization.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

/**
 * Checks if the request body needs sanitization and recursively sanitizes it.
 * Skips sanitization for FormData objects.
 * @param req The outgoing HttpRequest.
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object indicating if a sanitization error was found.
 */
function sanitizeRequestBody(req: HttpRequest<any>, sanitizer: FormSanitizationService): { hasError: boolean } {
  const endpoint = req.url.split('/').pop();
  const isSanitizableMethod = ['POST', 'PUT', 'PATCH'].includes(req.method);

  if (req.body && isSanitizableMethod && endpoint ) { // SANITIZED_END_POINTS.includes(endpoint) need to add
    return recursivelySanitize(req.body, sanitizer);
  }
  return { hasError: false };
}

/**
 * Recursively traverses an form data, object or array, sanitizing string values.
 * @param data The data to sanitize (can be any type).
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object containing the sanitized data and a flag indicating if an error occurred.
 */
function recursivelySanitize(data: any, sanitizer: FormSanitizationService): { sanitizedData: any, hasError: boolean } {
  if (data instanceof FormData) {
    return handleFormData(data, sanitizer);
  }
  if (typeof data === 'string') {
    return handleString(data, sanitizer);
  }
  if (Array.isArray(data)) {
    return handleArray(data, sanitizer);
  }
  if (typeof data === 'object' && data !== null) {
    return handleObject(data, sanitizer);
  }
  return { sanitizedData: data, hasError: false };
}

/**
 * Sanitizes a string input using the FormSanitizationService.
 * @param data The string to sanitize.
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object containing the sanitized string and a flag indicating if an error occurred.
 */
function handleString(data: string, sanitizer: FormSanitizationService): { sanitizedData: string, hasError: boolean } {
  const { sanitized, error } = sanitizer.sanitizeInput(data);
  return { sanitizedData: sanitized, hasError: error };
}

/**
 * Sanitizes a FormData object using the FormSanitizationService.
 * Iterates over the entries of the FormData and recursively sanitizes them.
 * @param data The FormData object to sanitize.
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object containing the sanitized FormData object and a flag indicating if an error occurred.
 */
function handleFormData(data: FormData, sanitizer: FormSanitizationService): { sanitizedData: string, hasError: boolean } {
  let hasError = false;
  for (const value of (data as any).values()) {
    const result = recursivelySanitize(value, sanitizer);
    if (result.hasError) hasError = true;
  }
  return { sanitizedData: 'sanitizedObject', hasError };
}

/**
 * Sanitizes an array of arbitrary values using the FormSanitizationService.
 * Iterates over the array and recursively sanitizes each item.
 * @param data The array to sanitize.
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object containing the sanitized array and a flag indicating if an error occurred.
 */
function handleArray(data: any[], sanitizer: FormSanitizationService): { sanitizedData: any[], hasError: boolean } {
  let hasError = false;
  const sanitizedArray = data.map(item => {
    const result = recursivelySanitize(item, sanitizer);
    if (result.hasError) hasError = true;
    return result.sanitizedData;
  });
  return { sanitizedData: sanitizedArray, hasError };
}

/**
 * Sanitizes an object of arbitrary values using the FormSanitizationService.
 * Iterates over the object's own enumerable properties and recursively sanitizes each value.
 * @param data The object to sanitize.
 * @param sanitizer The FormSanitizationService instance.
 * @returns An object containing the sanitized object and a flag indicating if an error occurred.
 */
function handleObject(data: object, sanitizer: FormSanitizationService): { sanitizedData: object, hasError: boolean } {
  let hasError = false;
  const sanitizedObject: any = { ...data };
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const result = recursivelySanitize(sanitizedObject[key], sanitizer);
      if (result.hasError) hasError = true;
      sanitizedObject[key] = result.sanitizedData;
    }
  }
  return { sanitizedData: sanitizedObject, hasError };
}

/**
 * Clones the request and adds appropriate authorization and Content-Type headers.
 * It specifically avoids setting Content-Type for FormData requests.
 * @param req The original HttpRequest.
 * @param token The user's access token, or null if not logged in.
 * @returns The cloned HttpRequest with added headers.
 */
function interceptorFn(req: HttpRequest<any>, token?: string | null): HttpRequest<any> {
//   if (!token) {
//     // Handles requests for non-authenticated users (e.g., login).
//     return req.clone({
//       headers: req.headers
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//     });
//   }

  // For FormData, only add the Authorization header. The browser MUST set the
  // Content-Type header to 'multipart/form-data' with the correct boundary.
//   if (req.body instanceof FormData) {
//     return req.clone({
//       headers: req.headers.set('Authorization', Bearer ${token})
//     });
//   }
  // if (!req.url.includes('/refresh')) {
  //   // Handles standard JSON requests for an authenticated user.
  //   return req.clone({
  //     headers: req.headers
  //       .set('Content-Type', 'application/json')
  //   });
  // }
  const reqWithCreds = req.clone({
    withCredentials: true
  });

  // Returns the original request for all other cases (e.g., refresh token requests).
  return reqWithCreds;
}

/**
 * Handles API errors that return a Blob, parsing it to find a JSON error message.
 * @param err The HttpErrorResponse containing the Blob.
 * @param toastService Service to display error messages to the user.
 * @returns An Observable that emits the parsed error.
 */
function handleBlobError(err: HttpErrorResponse, toastService: ToastService): Observable<HttpEvent<any>> {
  return new Observable<HttpEvent<any>>((observer) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const jsonError = JSON.parse(reader.result as string);
        const message = jsonError.message ?? jsonError.errorCode ?? 'An unknown error occurred.';
        toastService.showToast('error', 'Error', message, 'bottom-center');
        const newError = new HttpErrorResponse({ ...err, error: jsonError, url: err.url });
        observer.error(newError);
      } catch (e) {
        observer.error(err); // Fallback if Blob parsing fails.
      }
    };
    reader.onerror = () => observer.error(err);
    reader.readAsText(err.error);
  });
}

/**
 * Dispatches HTTP errors to the appropriate handler or displays a generic toast message.
 * @param err The HttpErrorResponse.
 * @param authService Service to handle logout on 401 errors.
 * @param toastService Service to display error messages.
 * @returns An Observable that throws the processed error.
 */
function handleHttpErrors(err: HttpErrorResponse,authService:AuthService, toastService: ToastService): Observable<HttpEvent<any>> {
  if (err.error instanceof Blob) {
    return handleBlobError(err, toastService);
  }

  const errorUrl = err.url.split('/').pop();

  if (err.status === 400) {
    toastService.showToast('error', 'Error', (err?.error?.message || 'An unexpected error occurred.'), 'bottom-center');
    return throwError(() => err);
  }

  if (err.status === 401) {
    const message = err.error?.message ?? 'Unauthorized Access. Please log in again.';
    toastService.showToast('error', 'Error', message, 'bottom-center');
    authService.logout();
    return throwError(() => err);
  }

  if ([400, 402, 404, 409, 500].includes(err.status)) {
    const msg = err.status === 404
      ? 'Sorry, the requested resource was not found.'
      : err.error?.message ?? err.error?.error_description ?? 'An unexpected error occurred.';

    if (!err.url?.includes('/dummyapi')) {
      toastService.showToast('error', 'Error', msg, 'bottom-center');
    }
  }

  return throwError(() => err);
}


/**
 * Main Authentication Interceptor. It orchestrates the entire request lifecycle:
 * 1. Checks for an internet connection.
 * 2. Sanitizes the request body for potential XSS vectors.
 * 3. Adds authorization headers.
 * 4. Shows a global loader based on context.
 * 5. Handles all API errors in a centralized way.
 * 6. Hides the loader when the request is complete.
 * @param req The outgoing HttpRequest.
 * @param next The next interceptor in the chain.
 * @returns An Observable of the HttpEvent.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  // --- Service Injection ---
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const formSanitizationService = inject(FormSanitizationService);

//   const showLoader = req.context.get(SHOW_LOADER);

  // --- 1. Handle Offline Case ---
  if (!window.navigator.onLine) {
    return throwError(() => new HttpErrorResponse({ error: 'No Internet Connection', status: 0 }));
  }

  // --- 2. Sanitize Request Body ---
  const { hasError } = sanitizeRequestBody(req, formSanitizationService);
  if (hasError) {
    toastService.showToast("error", "Error", "Please enter valid input.", 'bottom-center');
    return throwError(() => new HttpErrorResponse({ error: 'Invalid Input', status: 400 }));
  }

  // --- 3. Add Authorization Headers ---
//   const token = authService.getAccessToken();
  const processedReq = interceptorFn(req);

  // --- 4. Show Loader and Handle Request Lifecycle ---
//   if (showLoader) {
//     // loaderService.show();
//   }

  return next(processedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Centralized error handling
      return handleHttpErrors(err, authService, toastService);
    }),
    finalize(() => {
      // Always hide loader after request completes
    //   if (showLoader) {
    //     loaderService.hide();
    //   }
    })
  );
};

