import { httpClient } from './httpClient'

export type AuthenticatedUser = {
  id: string
  email: string | null
}

export async function getAuthenticatedUser() {
  const response = await httpClient.get<AuthenticatedUser>('/auth/me')
  return response.data
}
