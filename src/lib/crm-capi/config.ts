/**
 * Configuration of the Meta CRM feedback events. Pure: it reads an env object
 * that the caller passes in, so tests never touch the real environment.
 *
 * Sending is OFF unless META_CAPI_CRM_SEND_ENABLED is set to true AND the CRM
 * dataset ID and the access token are both set. The website Lead switch
 * (META_CAPI_SEND_ENABLED) has no effect here.
 */

/**
 * lead_event_source sent with each event: the name of the CRM the leads come
 * from. Meta's Conversion Leads payload specification describes it as that name
 * and mentions no setup step for it.
 */
export const CRM_LEAD_EVENT_SOURCE = "Fireberry";

/**
 * CRM stage names. Meta's specification makes them free text, so they only have
 * to be the same for every lead. The raw lead is the first stage of every lead.
 */
export const RAW_EVENT_NAME = "RawLead";
export const QUALIFIED_EVENT_NAME = "QualifiedLead";
export const REGISTERED_EVENT_NAME = "RegisteredLead";

export interface CrmCapiConfig {
  datasetId: string | null;
  accessToken: string | null;
  graphApiVersion: string;
  testEventCode: string | null;
  sendEnabled: boolean;
}

type EnvSource = Record<string, string | undefined>;

export function readCrmCapiConfig(env: EnvSource = process.env): CrmCapiConfig {
  const datasetId = env.META_CRM_DATASET_ID?.trim() || null;
  const accessToken = env.META_CAPI_ACCESS_TOKEN?.trim() || null;
  const flagOn = (env.META_CAPI_CRM_SEND_ENABLED?.trim().toLowerCase() ?? "") === "true";
  return {
    datasetId,
    accessToken,
    graphApiVersion: env.META_GRAPH_API_VERSION?.trim() || "v26.0",
    testEventCode: env.META_CAPI_CRM_TEST_EVENT_CODE?.trim() || null,
    sendEnabled: flagOn && datasetId !== null && accessToken !== null,
  };
}
