import { createBaseStore } from "./base.store";
import { signalStore, withComputed } from "@ngrx/signals";
import { API_ENDPOINTS } from "../constants/api-endpoints.constants";
import { computed } from "@angular/core";

const baseFeatures = createBaseStore<any>({
  initialEntityState: null,
  detailsApiEndpoint: API_ENDPOINTS.GET_USER,
})

export const UserStore = signalStore(
    {providedIn:'root'},
    baseFeatures,
    withComputed(({ initialised, error }) => ({
        isSettled: computed(() => initialised() || error() !== null),
    }))
)