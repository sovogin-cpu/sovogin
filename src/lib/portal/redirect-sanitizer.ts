/**
 * Sanitizador de redirección segura contra vulnerabilidades de Open Redirect.
 * Permite únicamente rutas relativas internas pertenecientes a /portal.
 */
export function sanitizeRedirectUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "/portal";

  const trimmed = rawUrl.trim();

  // Rechazar esquemas de protocolo (http:, https:, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+-.]*:/.test(trimmed)) {
    return "/portal";
  }

  // Rechazar barras dobles o invertidas al inicio (ej. //evil.com o \\evil.com)
  if (trimmed.startsWith("//") || trimmed.startsWith("\\")) {
    return "/portal";
  }

  // Debe comenzar estrictamente con /portal
  if (!trimmed.startsWith("/portal")) {
    return "/portal";
  }

  // Verificar el siguiente carácter tras /portal (debe ser fin de cadena o /)
  const afterPortal = trimmed.substring(7);
  if (afterPortal.length > 0 && !afterPortal.startsWith("/")) {
    return "/portal";
  }

  // Validar caracteres permitidos en la ruta relativa
  if (!/^\/portal(\/[a-zA-Z0-9._~%!$&'()*+,;=:@-]*)*\/?(\?[a-zA-Z0-9._~%!$&'()*+,;=:@-]*=?[a-zA-Z0-9._~%!$&'()*+,;=:@-]*(&[a-zA-Z0-9._~%!$&'()*+,;=:@-]*=?[a-zA-Z0-9._~%!$&'()*+,;=:@-]*)*)?$/.test(trimmed)) {
    return "/portal";
  }

  return trimmed;
}
