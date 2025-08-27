// WhatsApp integration utilities
import { supabase } from './supabase'

export interface WhatsAppMessageData {
  phoneNumber: string
  message: string
}

/**
 * Formats a phone number for WhatsApp URL
 * Removes all non-digit characters and ensures proper format
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // If it starts with +964, keep it as is
  // If it starts with 964, add +
  // If it starts with 0, replace with +964
  // Otherwise, assume it's a local number and add +964
  if (digitsOnly.startsWith('964')) {
    return `+${digitsOnly}`
  } else if (digitsOnly.startsWith('0')) {
    return `+964${digitsOnly.substring(1)}`
  } else if (digitsOnly.length >= 10) {
    // Assume it's already a local number without country code
    return `+964${digitsOnly}`
  }
  
  return `+964${digitsOnly}`
}

/**
 * Generates WhatsApp URL with pre-filled message
 */
export const generateWhatsAppURL = (phoneNumber: string, message: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phoneNumber)
  const encodedMessage = encodeURIComponent(message)
  
  // Use WhatsApp Web URL format
  return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`
}

/**
 * Opens WhatsApp with the specified message
 */
export const openWhatsApp = (phoneNumber: string, message: string): void => {
  const whatsappUrl = generateWhatsAppURL(phoneNumber, message)
  window.open(whatsappUrl, '_blank')
}

/**
 * Fetches status message templates for the current user
 */
export const getStatusMessageTemplates = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('invoice_status_settings')
    .select('status, default_message, allow_extra_note, send_whatsapp')
    .eq('user_id', user.id)

  if (error) throw error

  // Convert array to object for easier access
  const templates: Record<string, { message: string; allowExtraNote: boolean; sendWhatsApp: boolean }> = {}
  
  data?.forEach(setting => {
    templates[setting.status] = {
      message: setting.default_message || '',
      allowExtraNote: setting.allow_extra_note || false,
      sendWhatsApp: setting.send_whatsapp !== false // Default to true
    }
  })

  return templates
}

/**
 * Composes WhatsApp message for invoice status update
 */
export const composeStatusMessage = (
  statusTemplate: string,
  customerName: string,
  invoiceId: string,
  newStatus: string,
  extraNote?: string
): string => {
  let message = statusTemplate

  // Replace common placeholders
  message = message.replace(/\{customer_name\}/gi, customerName)
  message = message.replace(/\{customer\}/gi, customerName)
  message = message.replace(/\{invoice_id\}/gi, invoiceId.slice(0, 8))
  message = message.replace(/\{invoice\}/gi, invoiceId.slice(0, 8))
  message = message.replace(/\{status\}/gi, newStatus)

  // Add extra note if provided
  if (extraNote && extraNote.trim()) {
    message += `\n\nAdditional note: ${extraNote.trim()}`
  }

  return message
}
