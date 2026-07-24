import { httpClient } from './httpClient'

export type HealthResponse = {
  status: 'ok'
  service: 'marketlens-api'
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await httpClient.get<HealthResponse>('/health')
  return response.data
}
