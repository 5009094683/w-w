import { getZohoAccessToken } from '../../utils/zoho-payments'

export default defineEventHandler(async () => {
  try {
    const config = useRuntimeConfig()
    const accessToken = await getZohoAccessToken(config)

    return {
      success: true,
      accessToken
    }
  } catch (error: any) {
    console.error('Zoho authorization error:', error)

    if (error.data) {
      console.error('Zoho auth error response:', error.data)
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Zoho authorization failed'
    })
  }
})
