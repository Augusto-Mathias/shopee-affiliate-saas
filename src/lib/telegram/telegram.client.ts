const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Envia uma mensagem simples de texto (vamos usar para testes).
 */
export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}) {
  const { botToken, chatId, text, parseMode } = params;

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  const body: any = {
    chat_id: chatId,
    text,
  };

  if (parseMode) {
    body.parse_mode = parseMode;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Envia uma oferta da Shopee como foto + legenda.
 * Vamos usar depois, quando já tivermos o chatId certinho.
 */
export async function sendOfferToTelegram(params: {
  botToken: string;
  chatId: string | number;
  imageUrl: string;
  caption: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}) {
  const { botToken, chatId, imageUrl, caption, parseMode } = params;

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendPhoto`;

  const body: any = {
    chat_id: chatId,
    photo: imageUrl,
    caption,
  };

  if (parseMode) {
    body.parse_mode = parseMode;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  return data;
}