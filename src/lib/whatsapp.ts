/** Ventana flotante reutilizable de WhatsApp Web.
 *  Siempre usa la MISMA ventana nombrada: el usuario inicia sesión una vez
 *  y cada click en cualquier contacto la trae al frente ya en su chat.
 *  (La integración oficial multi-agente llega con el motor GHL — esto es
 *  el WhatsApp personal del usuario, ambas opciones conviven.) */
export function openWhatsApp(phone: string, text = '') {
  const digits = phone.replace(/\D/g, '')
  if (!digits) {
    alert('Este lead no tiene teléfono registrado. Agrégalo en su Perfil.')
    return
  }
  const url = `https://web.whatsapp.com/send?phone=${digits}${text ? `&text=${encodeURIComponent(text)}` : ''}`
  const left = Math.max(0, (window.screen?.width ?? 1400) - 560)
  const win = window.open(url, 'leadsuite-whatsapp', `width=520,height=780,top=40,left=${left}`)
  win?.focus()
}
