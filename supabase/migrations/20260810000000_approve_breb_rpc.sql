-- Migración: Procedimiento Almacenado Transaccional RPC para Conciliación Bre-B (SOVOGIN - Edición Endurecida)
-- Descripción: Crea las funciones RPC approve_breb_payment_order y reject_breb_payment_order con aislamiento ACID, bloqueo FOR UPDATE, validación estricta de datos y permisos de ejecución exclusivos para service_role.

-- 1. Función RPC para APROBAR pago Bre-B y crear la inscripción de forma atómica
CREATE OR REPLACE FUNCTION public.approve_breb_payment_order(
  p_order_id UUID,
  p_admin_id UUID,
  p_breb_transaction_reference TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_admin_role TEXT;
  v_order RECORD;
  v_existing_reg_id UUID;
  v_existing_reg_created_at TIMESTAMP WITH TIME ZONE;
  v_new_reg_id UUID;
  v_full_name TEXT;
  v_clean_ref TEXT;
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  -- A. Verificar que el usuario ejecutor sea administrador
  SELECT role INTO v_admin_role 
  FROM public.profiles 
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: El usuario no posee permisos de administrador.';
  END IF;

  -- B. Validar y sanitizar referencia bancaria opcional
  v_clean_ref := TRIM(COALESCE(p_breb_transaction_reference, ''));
  IF LENGTH(v_clean_ref) > 150 THEN
    RAISE EXCEPTION 'La referencia bancaria excede la longitud máxima permitida (150 caracteres).';
  END IF;

  -- C. Bloquear la fila en payment_orders durante toda la transacción (Previene Race Conditions)
  SELECT * INTO v_order 
  FROM public.payment_orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden de pago no existe.';
  END IF;

  IF v_order.payment_method != 'breb_qr' THEN
    RAISE EXCEPTION 'La orden indicada no corresponde a un método de pago Bre-B.';
  END IF;

  -- D. Caso: Orden en estado final de cancelación o error
  IF v_order.status IN ('cancelled', 'failed', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'La orden se encuentra en un estado final (%) y no puede ser aprobada.', v_order.status;
  END IF;

  -- E. Caso: status = 'paid' (Idempotencia o manejo de inconsistencia)
  IF v_order.status = 'paid' THEN
    -- E1. Si ya posee registration_id vinculado
    IF v_order.registration_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_paid', true,
        'registration_id', v_order.registration_id
      );
    END IF;

    -- E2. Si status es paid pero registration_id es NULL: Buscar si existe inscripción previa por payment_order_id o reference
    SELECT id, created_at INTO v_existing_reg_id, v_existing_reg_created_at
    FROM public.registrations 
    WHERE payment_order_id = v_order.id OR payment_reference = v_order.reference 
    LIMIT 1;

    IF v_existing_reg_id IS NOT NULL THEN
      -- Reparación idempotente del vínculo (Preserva la identidad del verificador original si ya existía)
      UPDATE public.payment_orders SET
        breb_verified_at = COALESCE(breb_verified_at, NOW()),
        breb_verified_by = COALESCE(breb_verified_by, p_admin_id),
        registration_id = v_existing_reg_id,
        registration_created_at = COALESCE(registration_created_at, v_existing_reg_created_at),
        breb_transaction_reference = CASE 
          WHEN v_clean_ref != '' THEN v_clean_ref 
          ELSE breb_transaction_reference 
        END
      WHERE id = v_order.id;

      RETURN jsonb_build_object(
        'success', true,
        'already_paid', true,
        'relinked_existing_registration', true,
        'registration_id', v_existing_reg_id
      );
    ELSE
      -- Inconsistencia no reparable automáticamente: status = paid sin registration creada
      RAISE EXCEPTION 'La orden ya figura como pagada pero no posee una inscripción asociada. Requiere revisión administrativa.';
    END IF;
  END IF;

  -- F. Caso: Solo se permite aprobación en estado pending_verification
  IF v_order.status != 'pending_verification' THEN
    RAISE EXCEPTION 'La orden debe estar en estado pending_verification para ser aprobada (Estado actual: %).', v_order.status;
  END IF;

  -- G. Verificar si existe inscripción previa inesperada en estado pending_verification
  SELECT id INTO v_existing_reg_id 
  FROM public.registrations 
  WHERE payment_order_id = v_order.id OR payment_reference = v_order.reference 
  LIMIT 1;

  IF v_existing_reg_id IS NOT NULL THEN
    RAISE EXCEPTION 'La orden pendiente de verificación ya posee una inscripción asociada. Requiere revisión administrativa antes de aprobar.';
  END IF;

  -- H. Validación ESTRICTA de datos obligatorios de inscripción (Sin fabricar datos)
  IF v_order.product_id IS NULL OR 
     v_order.customer_name IS NULL OR TRIM(v_order.customer_name) = '' OR
     v_order.customer_last_name IS NULL OR TRIM(v_order.customer_last_name) = '' OR
     v_order.customer_email IS NULL OR TRIM(v_order.customer_email) = '' OR
     v_order.customer_document_type IS NULL OR TRIM(v_order.customer_document_type) = '' OR
     v_order.customer_document_number IS NULL OR TRIM(v_order.customer_document_number) = '' OR
     v_order.amount IS NULL OR v_order.amount <= 0 OR
     v_order.category IS NULL OR TRIM(v_order.category) = '' OR
     v_order.modality IS NULL OR TRIM(v_order.modality) = '' THEN
    RAISE EXCEPTION 'No es posible aprobar la orden porque faltan datos obligatorios de la inscripción.';
  END IF;

  v_now := NOW();
  v_full_name := TRIM(TRIM(v_order.customer_name) || ' ' || TRIM(v_order.customer_last_name));

  -- I. Crear la inscripción en public.registrations usando los datos reales de la orden
  INSERT INTO public.registrations (
    payment_order_id,
    payment_reference,
    event_id,
    full_name,
    email,
    phone,
    customer_document_type,
    document_number,
    amount,
    modality,
    category,
    status,
    payment_status,
    paid_at,
    origin
  ) VALUES (
    v_order.id,
    v_order.reference,
    v_order.product_id,
    v_full_name,
    LOWER(TRIM(v_order.customer_email)),
    v_order.customer_phone,
    TRIM(v_order.customer_document_type),
    TRIM(v_order.customer_document_number),
    v_order.amount,
    TRIM(v_order.modality),
    TRIM(v_order.category),
    'confirmed',
    'paid',
    v_now,
    'breb'
  ) RETURNING id INTO v_new_reg_id;

  -- J. Actualizar payment_orders con la confirmación administrativa
  UPDATE public.payment_orders SET
    status = 'paid',
    paid_at = v_now,
    breb_verified_at = v_now,
    breb_verified_by = p_admin_id,
    breb_rejection_reason = NULL,
    registration_id = v_new_reg_id,
    registration_created_at = v_now,
    breb_transaction_reference = CASE 
      WHEN v_clean_ref != '' THEN v_clean_ref 
      ELSE breb_transaction_reference 
    END
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'already_paid', false,
    'registration_id', v_new_reg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2. Función RPC para RECHAZAR reporte de pago Bre-B
CREATE OR REPLACE FUNCTION public.reject_breb_payment_order(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_admin_role TEXT;
  v_order RECORD;
  v_clean_reason TEXT;
BEGIN
  -- A. Verificar permisos de administrador
  SELECT role INTO v_admin_role 
  FROM public.profiles 
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: El usuario no posee permisos de administrador.';
  END IF;

  v_clean_reason := TRIM(COALESCE(p_reason, ''));
  IF LENGTH(v_clean_reason) < 5 THEN
    RAISE EXCEPTION 'El motivo del rechazo es obligatorio y debe tener al menos 5 caracteres.';
  END IF;

  IF LENGTH(v_clean_reason) > 500 THEN
    RAISE EXCEPTION 'El motivo del rechazo no puede superar los 500 caracteres.';
  END IF;

  -- B. Bloquear la fila durante la revisión (Locking FOR UPDATE)
  SELECT * INTO v_order 
  FROM public.payment_orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden de pago no existe.';
  END IF;

  IF v_order.payment_method != 'breb_qr' THEN
    RAISE EXCEPTION 'La orden indicada no corresponde a un pago Bre-B.';
  END IF;

  -- C. Idempotencia de rechazo
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true
    );
  END IF;

  IF v_order.status = 'paid' THEN
    RAISE EXCEPTION 'No es posible rechazar una orden que ya ha sido pagada y confirmada.';
  END IF;

  IF v_order.status != 'pending_verification' THEN
    RAISE EXCEPTION 'Solo se pueden rechazar órdenes en estado pending_verification (Estado actual: %).', v_order.status;
  END IF;

  -- D. Actualizar payment_orders a cancelled
  UPDATE public.payment_orders SET
    status = 'cancelled',
    breb_verified_at = NOW(),
    breb_verified_by = p_admin_id,
    breb_rejection_reason = v_clean_reason
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_cancelled', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 3. Permisos de ejecución restrictivos (Exclusivos para service_role)
REVOKE EXECUTE ON FUNCTION public.approve_breb_payment_order(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_breb_payment_order(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_breb_payment_order(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_breb_payment_order(UUID, UUID, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reject_breb_payment_order(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_breb_payment_order(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_breb_payment_order(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reject_breb_payment_order(UUID, UUID, TEXT) TO service_role;
