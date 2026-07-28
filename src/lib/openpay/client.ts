type OpenpayCustomer = {
  name: string;
  last_name: string;
  phone_number?: string;
  email: string;
};

type CreateOpenpayChargeInput = {
  amount: number;
  description: string;
  orderId: string;
  redirectUrl: string;
  customer: OpenpayCustomer;
};

export type OpenpayChargeResponse = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id?: string;
  authorization?: string | null;
  error_message?: string | null;
  payment_method?: {
    type?: string;
    url?: string;
  };
};

function getOpenpayConfiguration() {
  if (typeof window !== "undefined") {
    throw new Error("createOpenpayRedirectCharge solo puede ejecutarse del lado servidor.");
  }

  const merchantId = process.env.OPENPAY_MERCHANT_ID;
  const privateKey = process.env.OPENPAY_PRIVATE_KEY;

  const apiUrl =
    process.env.OPENPAY_API_URL ||
    "https://sandbox-api.openpay.co";

  if (!merchantId) {
    throw new Error(
      "Falta OPENPAY_MERCHANT_ID en el archivo .env.local"
    );
  }

  if (!privateKey) {
    throw new Error(
      "Falta OPENPAY_PRIVATE_KEY en el archivo .env.local"
    );
  }

  return {
    merchantId,
    privateKey,
    apiUrl,
  };
}

export async function createOpenpayRedirectCharge(
  input: CreateOpenpayChargeInput
): Promise<OpenpayChargeResponse> {
  const { merchantId, privateKey, apiUrl } =
    getOpenpayConfiguration();

  const basicAuthentication = Buffer.from(
    `${privateKey}:`
  ).toString("base64");

  const response = await fetch(
    `${apiUrl}/v1/${merchantId}/charges`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuthentication}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "card",
        amount: input.amount,
        currency: "COP",
        description: input.description,
        order_id: input.orderId,
        customer: input.customer,
        confirm: false,
        send_email: false,
        redirect_url: input.redirectUrl,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Error devuelto por Openpay:", data);

    throw new Error(
      data?.description ||
        data?.error_message ||
        "Openpay rechazó la creación del pago."
    );
  }

  return data as OpenpayChargeResponse;
}