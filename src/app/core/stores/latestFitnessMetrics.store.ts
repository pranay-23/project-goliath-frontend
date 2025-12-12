import { createBaseStore } from "./base.store";
import { signalStore } from "@ngrx/signals";
import { API_ENDPOINTS } from "../constants/api-endpoints.constants";

const baseFeatures = createBaseStore<any>({
  initialEntityState: null,
  detailsApiEndpoint: API_ENDPOINTS.GET_LATEST_FITNESS_METRICS,
})

export const LatestFitnessMetricsStore = signalStore(
    {providedIn:'root'},
    baseFeatures
)