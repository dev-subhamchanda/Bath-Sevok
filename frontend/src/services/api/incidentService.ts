import type { AxiosRequestConfig } from "axios";
import type { Incident, NewIncidentInput } from "@/types/domain";
import { getAdaptive, postAdaptive } from "./httpClient";

/**
 * Incidents Service
 */
export const incidentApi = {
  async getAll(config?: AxiosRequestConfig): Promise<Incident[]> {
    const d = await getAdaptive<Incident[] | { data: Incident[] }>("/incidents", "/api/incidents", config);
    return (Array.isArray(d) ? d : (d as { data: Incident[] })?.data || []) as Incident[];
  },

  async create(input: NewIncidentInput, config?: AxiosRequestConfig): Promise<Incident> {
    const d = await postAdaptive<Incident | { data: Incident } | { incident: Incident }>(
      "/incidents",
      "/api/incidents",
      input,
      config
    );
    if (d && typeof d === "object") {
      if ("data" in d) return (d as { data: Incident }).data;
      if ("incident" in d) return (d as { incident: Incident }).incident;
    }
    return d as Incident;
  }
};
