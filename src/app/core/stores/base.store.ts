// Common Base store for managing entity state with default functions like for getRequest, postRequest, clearState, updateState
import { inject } from '@angular/core';
import { patchState, signalStoreFeature, withMethods, withState } from '@ngrx/signals';
import { ApiService, ApiServiceResponse } from '../services/api.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Defines the shape of the state managed by the base store.
 * @template T The type of the entity data being stored.
 */
export type BaseState<T> = {
  data: T | null; /** The actual entity data. Can be null if not yet fetched or on error. */
  response: ApiServiceResponse<T> | null; /** The full API response, including headers and status, from the last request. */
  loading: boolean; /** A boolean flag indicating if an API request is currently in progress. */
  error: HttpErrorResponse | null;   /** Holds the error object if the last API request failed. */
  initialised: boolean;   /** A boolean flag indicating if the store has been successfully initialized with data at least once. */
};

/**
 * Defines the configuration required to create a new base store instance.
 * @template T The type of the entity data the store will manage.
 */
export interface BaseStoreConfig<T> {
  initialEntityState: T | null;  /** The initial value for the entity state before any data is fetched. */
  detailsApiEndpoint: string; /** The default API endpoint for GET, PUT, DELETE requests. */
  createApiEndpoint?: string; /** Optional: A specific endpoint for POST (create) requests. If not provided, `detailsApiEndpoint` is used. */
}

/**
 * A private helper function to handle successful API responses.
 * It patches the store state to reflect the successful data fetch.
 * @param state The store's state management object.
 * @param response The successful response from the ApiService.
 */
const handleRequestSuccess = <T>(
  state: any,
  response: ApiServiceResponse<T>
) => {
  patchState(state, (currentState) => ({    
    loading: false,
    data: response?.response, // Update data with the payload from the response
    response: response, // Store the full response object
    error:null, // Clear any previous errors
    initialised: true // Mark the store as initialized
  }));
};

/**
 * A private helper function to handle API errors.
 * It patches the store state to reflect the error and calls the global API error handler.
 * @param state The store's state management object.
 * @param userError The error response from the API call.
 * @param apiService The injected ApiService instance to access the global error handler.
 * @param config The store's configuration, used to reset data to its initial state.
 */
const handleRequestError = <T>(
  state: any,
  userError: HttpErrorResponse,
  apiService: any,
  config: BaseStoreConfig<T>
) => {
  patchState(state, (currentState) => ({
    loading: false,
    data: config.initialEntityState, // Reset data on error
    response: null, // Clear previous response
    error: userError ?? 'An unknown error occurred', // Store error message
    initialised: false,  // Mark as not initialized, so a fetch can be re-attempted
  }));
  apiService.handleApiError(userError);
};

/**
 * A factory function that creates a reusable NgRx Signal store feature for entity management.
 * This feature provides standardized methods for fetching (GET), creating (POST),
 * and managing the state (loading, error, data) of a single entity type.
 *
 * @template T The type of the entity data the store will manage.
 * @param config The configuration object for the store.
 * @returns A `signalStoreFeature` containing the state and methods for entity management.
 */
export function createBaseStore<T>(
  config: BaseStoreConfig<T>
) {
  // Construct the initial state
  const initialState: BaseState<T> = {
    data: config.initialEntityState,
    response:null,
    loading: false,
    error: null,
    initialised: false
  };

  return signalStoreFeature(
    withState<BaseState<T>>(initialState),
    withMethods((state, apiService = inject(ApiService)) => ({
      /**
       * Fetches entity data from the API using a GET request.
       * It sets the loading state, makes the API call, and updates the store
       * with the response data or error.
       * @param suffix - (Optional) Whether to add the API suffix from environment config. Defaults to `true`.
       * @param queryParams - (Optional) An object of query parameters to be sent with the request.
       * @param showLoader - (Optional) Whether to trigger a global loading indicator. Defaults to `false`.
       * @param header - (Optional) Custom HTTP headers for the request.
       */
      getRequest: (
        suffix: boolean = true,
        queryParams: Record<string, any> = {},
        showLoader: boolean = false,
        header: any = null
      ): void => {
        // Set loading state and clear previous data/errors before the request
        patchState(state, {data:config.initialEntityState, response:null, loading: true, error: null, initialised: false });

        apiService.get<T>(suffix, config.detailsApiEndpoint, { params: queryParams, headers: header }, showLoader, false).subscribe(
          {
          next: (response:ApiServiceResponse<T>) =>{
            // Call the helper function to handle success logic
            handleRequestSuccess<T>(state, response);
          },
          error: (userError: HttpErrorResponse) => {
            // Call the helper function to handle error logic
            handleRequestError<T>(state, userError, apiService, config);
          }
        });
      },

      /**
       * Sends a POST request to the API to create a new entity.
       * It sets the loading state and updates the store based on the API response.
       * @param suffix - (Optional) Whether to add the API suffix from environment config. Defaults to `true`.
       * @param body - (Optional) The request payload.
       * @param queryParams - (Optional) An object of query parameters.
       * @param showLoader - (Optional) Whether to trigger a global loading indicator. Defaults to `false`.
       * @param header - (Optional) Custom HTTP headers for the request.
       */
      postRequest: (
        suffix: boolean = true,
        body: any = {},
        queryParams: Record<string, any> = {},
        showLoader: boolean = false,
        header:any = null
      ): void => {
        // Set loading state and clear previous data/errors
        patchState(state, {data:config.initialEntityState, response:null, loading: true, error: null, initialised: false });

        // Use createApiEndpoint if provided, otherwise fallback to detailsApiEndpoint
        const apiEndpoint = config.createApiEndpoint ?? config.detailsApiEndpoint;
        apiService.post<T>(suffix, apiEndpoint, body, { params: queryParams, headers: header }, showLoader).subscribe({
          next: (response:ApiServiceResponse<T>) =>{
            // Call the helper function to handle success logic
            handleRequestSuccess<T>(state, response);
          },
          error: (userError: HttpErrorResponse) => {
            // Call the helper function to handle error logic
            handleRequestError(state, userError, apiService, config);
          }
        });
      },

      /**
       * Manually updates the `data` in the store and resets loading/error states.
       * Useful for updates or setting state without an API call.
       * @param entityValue The new value for the `data` property in the state.
       */
      updateState: (entityValue: T | null): void => {
        patchState(state, (currentState) => ({
          ...currentState,
          data: entityValue, // Update data
          loading: false,
          error: null,
          // initialised: true // this can be changed as per requirement currently it keeps the previous value
        }));
      },

      /**
       * Resets the store to its initial state.
       * Clears entity data, response, loading, and error states.
       */
      clearState: (): void => {
        patchState(state, (currentState) => ({
          data: config.initialEntityState, // Reset data
          response:null,
          loading: false,
          error: null,
          initialised: false // Set to false to indicate data needs to be fetched again
        }));
      },    
    }))
  );
}