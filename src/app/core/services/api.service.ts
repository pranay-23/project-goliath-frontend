import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse, HttpContext, HttpResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Defines the structure for HTTP options that can be passed to API requests.
 */
export interface HttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: 'json';
  context?: HttpContext;
  observe?: 'response'; // Allow observe property
}

/**
 * Defines the structure for the response header information.
 */
export class ResponseHeaderModel {
  status: number;
  statusText: string;
  success: boolean;
}

/**
 * Defines the standardized response structure for all API calls made through ApiService.
 */
export interface ApiServiceResponse<T> {
  options: HttpOptions;
  response: T;
  responseHeader: ResponseHeaderModel;
  id: number;
  localOnly: boolean;
  error: any;
  reflectOnly: boolean;
  requestBody?: any;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  // private readonly authService = inject(AuthService);

  /**
   * Generates a standardized ApiServiceResponse object from an HTTP response or error.
   * This ensures a consistent response format for all API calls.
   * @param response The HttpResponse or HttpErrorResponse from the HttpClient.
   * @param options The original HttpOptions used for the request.
   * @param requestBody The body of the original request, if any.
   * @returns An ApiServiceResponse object.
  */
  generateResponse<T>(response: HttpResponse<any> | HttpErrorResponse, options: HttpOptions, requestBody?:any): ApiServiceResponse<T> {
    const isError = response instanceof HttpErrorResponse;
    const status = response.status;
    const body = isError ? null : response.body;
    const error = isError ? response.error : null;

    const responseHeader: ResponseHeaderModel = {
      status: status,
      statusText: response.statusText,
      success: (([200, 201, 300].indexOf(response.status) >= 0))
    };

    return { requestBody:requestBody, options: options, response: body, responseHeader: responseHeader, id: 0, localOnly: false, reflectOnly: false, error:error };
  }

  /**
   * Creates an HttpContext for the request, primarily used to control UI behaviors like showing a loader.
   * @param showLoader A boolean to indicate whether the loader context token should be set.
   * @returns An HttpContext object or undefined if showLoader is not specified.
   */
//   private createHttpContext(showLoader?: boolean): HttpContext | undefined {
//     if (showLoader === undefined) return undefined; // If not specified, don't set the token
//     return new HttpContext().set(SHOW_LOADER, showLoader);
//   }

  /**
   * Replaces URL placeholders (e.g., ':id') with actual values from the queryParams object.
   * It also removes the used parameters from the queryParams object to prevent them from being sent as query strings.
   * @param endpoint The API endpoint URL with placeholders (e.g., 'users/:id').
   * @param queryParams An object containing parameters to be substituted into the URL.
   * @returns The endpoint URL with placeholders replaced by actual values.
   */
  setParamsInUrl(endpoint, queryParams){
    let tempurl = endpoint.split('/');
    const keys = Object.keys(queryParams);
    const vals = Object.values(queryParams);
    keys.forEach((itm: string, key: number) => {
      const nval = vals[key].toString();
      tempurl = tempurl.map((ustr) => {
        const regxStr = `:${itm}`;
        if (regxStr == ustr) {
          // Delete the parameter from the original object so it's not added as a query string
          delete queryParams[itm];
        }
        return ustr.replace(regxStr, nval);
      });
    });
    return tempurl.join('/');
  }

  /**
   * Performs an HTTP GET request.
   * @template T The expected response body type.
   * @param suffix A boolean indicating whether to append the environment-specific suffix to the URL.
   * @param endpoint The API endpoint (e.g., '/users').
   * @param options Optional HTTP options (headers, params, etc.).
   * @param showLoader A boolean to control the visibility of a global loader.
   * @param isMock A boolean to fetch data from a local mock file instead of the actual API.
   * @returns An Observable of ApiServiceResponse<T>.
   */
  get<T>(suffix: boolean, endpoint: string, options: HttpOptions={}, showLoader?: boolean, isMock?: boolean): Observable<ApiServiceResponse<T>> {
    const params = {...options.params};
    if (options.params) {
      endpoint = this.setParamsInUrl(endpoint, options.params);
    }

    if (isMock) {
      return this.http.get<T>(this.getMockDataUrl(endpoint)).pipe(
        catchError((error: HttpErrorResponse) => {
          // Handle cases where the mock file itself is not found (404)
          console.error(`Mock file not found for endpoint: ${endpoint}`, error);
          const mockErrorHeader: ResponseHeaderModel = { status: 404, statusText: 'Not Found (mock file missing)', success: false };
          const mockErrorResponse = { options:{...options,params:params}, response: null, responseHeader: mockErrorHeader, id: 0, localOnly: false, reflectOnly: false, error:{message:'Mock file not found'} };
          return throwError(() => mockErrorResponse);
        }),
        map((mockData: T) => {
          // Manually create the standard response structure
          const mockResponseHeader: ResponseHeaderModel = { status: 200, statusText: 'OK (from mock file)', success: true };
          return { options:{...options,params:params}, response: mockData, responseHeader: mockResponseHeader, id: 0, localOnly: false, reflectOnly: false, error:null };
        })
      );
    }

    const httpOptions = {
      ...options,
    //   context: this.createHttpContext(showLoader) ?? options.context,
      observe: 'response' as const
    };
    
    return this.http.get<T>(this.getFullUrl(suffix, endpoint), httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        const customError = this.generateResponse<T>(error, {...options,params:params});
        const err = Object.assign(customError, error);
        return throwError(() => err);
      }),
      map((response: HttpResponse<T>) => {
        return this.generateResponse<T>(response, {...options,params:params});
      })
    );
  }

  /**
   * Performs an HTTP POST request.
   * @template T The expected response body type.
   * @param suffix A boolean indicating whether to append the environment-specific suffix to the URL.
   * @param endpoint The API endpoint (e.g., '/login').
   * @param body The request body.
   * @param options Optional HTTP options (headers, params, etc.).
   * @param showLoader A boolean to control the visibility of a global loader.
   * @param isMock A boolean to fetch data from a local mock file instead of the actual API.
   * @returns An Observable of ApiServiceResponse<T>.
   */
  post<T>(suffix: boolean, endpoint: string, body: any, options: HttpOptions = {}, showLoader?: boolean, isMock?: boolean): Observable<ApiServiceResponse<T>> {
    const params = {...options.params};
    if (options?.params) {
      endpoint = this.setParamsInUrl(endpoint, options.params);
    }
     if (isMock) {
      return this.http.get<T>(this.getMockDataUrl(endpoint)).pipe(
        catchError((error: HttpErrorResponse) => {
          // Handle cases where the mock file itself is not found (404)
          console.error(`Mock file not found for endpoint: ${endpoint}`, error);
          const mockErrorHeader: ResponseHeaderModel = { status: 404, statusText: 'Not Found (mock file missing)', success: false };
          const mockErrorResponse = { options:{...options,params:params}, response: null, responseHeader: mockErrorHeader, id: 0, localOnly: false, reflectOnly: false, error: { message: 'Mock file not found' } };
          return throwError(() => mockErrorResponse);
        }),
        map((mockData: T) => {
          // Manually create the standard response structure
          const mockResponseHeader: ResponseHeaderModel = { status: 200, statusText: 'OK (from mock file)', success: true };
          return { options:{...options,params:params}, response: mockData, responseHeader: mockResponseHeader, id: 0, localOnly: false, reflectOnly: false, error:null };
        })
      );
    }

    const httpOptions = {
      ...options,
    //   context: this.createHttpContext(showLoader) ?? options.context,
      observe: 'response' as const
    };

    return this.http.post<T>(this.getFullUrl(suffix, endpoint), body, httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        const customError = this.generateResponse<T>(error, {...options,params:params}, body);
        const err = Object.assign(customError, error);
        return throwError(() => err);
      }),
      map((response: HttpResponse<T>) => {
        return this.generateResponse<T>(response, {...options,params:params}, body)
      })
    );
  }

  /**
   * Performs an HTTP PUT request.
   * @template T The expected response body type.
   * @param suffix A boolean indicating whether to append the environment-specific suffix to the URL.
   * @param endpoint The API endpoint (e.g., '/users/1').
   * @param body The request body.
   * @param options Optional HTTP options (headers, params, etc.).
   * @param showLoader A boolean to control the visibility of a global loader.
   * @returns An Observable of ApiServiceResponse<T>.
   */
  put<T>(suffix: boolean, endpoint: string, body: any, options: HttpOptions = {}, showLoader?: boolean): Observable<ApiServiceResponse<T>> {
    const params = {...options.params};
    if (options.params) {
      endpoint = this.setParamsInUrl(endpoint, options.params);
    }
    const httpOptions = {
      ...options,
    //   context: this.createHttpContext(showLoader) ?? options.context,
      observe: 'response' as const
    };
    return this.http.put<T>(this.getFullUrl(suffix, endpoint), body, httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        const customError = this.generateResponse<T>(error, {...options,params:params}, body);
        const err = Object.assign(customError, error);
        return throwError(() => err);
      }),
      map((response: HttpResponse<T>) => {
        return this.generateResponse<T>(response, {...options,params:params}, body)
      }),
    );
  }

  /**
   * Performs an HTTP DELETE request.
   * @template T The expected response body type.
   * @param suffix A boolean indicating whether to append the environment-specific suffix to the URL.
   * @param endpoint The API endpoint (e.g., '/users/1').
   * @param options Optional HTTP options (headers, params, etc.).
   * @param showLoader A boolean to control the visibility of a global loader.
   * @returns An Observable of ApiServiceResponse<T>.
   */
  delete<T>(suffix: boolean, endpoint: string, options: HttpOptions = {}, showLoader?: boolean): Observable<ApiServiceResponse<T>> {
    const params = {...options.params};
    if (options.params) {
      endpoint = this.setParamsInUrl(endpoint, options.params);
    }
    const httpOptions = {
      ...options,
    //   context: this.createHttpContext(showLoader) ?? options.context,
      observe: 'response' as const
    };
    return this.http.delete<T>(this.getFullUrl(suffix, endpoint), httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        const customError = this.generateResponse<T>(error, {...options,params:params});
        const err = Object.assign(customError, error);
        return throwError(() => err);
      }),
      map((response: HttpResponse<T>) => {
        return this.generateResponse<T>(response, {...options,params:params})
      }),
    );
  }

  /**
   * Constructs the full API URL by combining the base URL, an optional suffix, and the specific endpoint.
   * @param suffix A boolean indicating whether to append the environment-specific suffix.
   * @param endpoint The specific API endpoint.
   * @returns The complete URL string.
   */
  getFullUrl(suffix, endpoint){
    return `${environment.apiUrl}${suffix ? environment.suffix: ''}${endpoint}`;
  }

  /**
   * Constructs the URL for a local mock data file based on the endpoint.
   * It assumes mock files are stored in 'assets/mock-data/' and named after the last segment of the endpoint.
   * @param endpoint The API endpoint.
   * @returns The path to the corresponding mock JSON file.
   */
  getMockDataUrl(endpoint){
    endpoint = endpoint.split("/")[endpoint.split("/").length-1];
    return `assets/mock-data/${endpoint}.json`;
  }

  /**
   * Handles API errors globally, delegating to helper methods based on the error type.
   * @param err The error object from the API call.
   */
  handleApiError(err: any): void {
    if (this.isSessionExpiredError(err)) {
      this.handleSessionExpiration(err);
    } else {
      // Handle other types of errors here if necessary
      console.error('An unexpected API error occurred:', err);
    }
  }

  /**
   * Checks if the given error indicates an expired or invalid token.
   * @param err The error object.
   * @returns True if the error is a session expiration error, false otherwise.
   */
  private isSessionExpiredError(err: any): boolean {
    if (!err) {
      return false;
    }

    // A 401 status is a clear indicator of an authorization issue.
    if (err instanceof HttpErrorResponse && err.status === 401) {
      return true;
    }

    // Check for the 'invalid_token' string in the error body,
    // which covers both HttpErrorResponse bodies and other custom error objects.
    if (err.error?.error === 'invalid_token') {
      return true;
    }

    return false;
  }

  /**
   * Handles the application state reset when a session expires.
   * It logs the user out, clears storage, and redirects to the login page.
   * @param err The error object containing details about the session failure.
   */
  private handleSessionExpiration(err: any): void {
    const description = err?.error?.error_description || 'No description provided.';

    // NOTE: In a real application, using a non-blocking toast/modal is better than alert().
    alert('Your session has expired or is invalid. Please log in again.');

    // if (environment.name !== 'local') {
    //   window.location.href = environment.webUrl;
    // } else {
    // }
    // this.authService.logout();
    // this.router.navigate(['/home']);
  }

}