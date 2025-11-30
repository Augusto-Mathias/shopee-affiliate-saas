import { NextResponse } from "next/server";

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN não definido no .env.local" },
        { status: 500 }
      );
    }

    // Busca as últimas atualizações (mensagens) recebidas pelo bot
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar updates do Telegram", details: data },
        { status: 500 }
      );
    }

    // Extrai os chat_ids das mensagens recebidas
    const updates = data.result || [];
    const chatIds = updates.map((update: any) => {
      const chatId = update.message?.chat?.id || update.my_chat_member?.chat?.id;
      const chatType = update.message?.chat?.type || update.my_chat_member?.chat?.type;
      const chatTitle = update.message?.chat?.title || update.my_chat_member?.chat?.title || "Conversa privada";
      
      return {
        chatId,
        chatType,
        chatTitle,
      };
    }).filter((item: any) => item.chatId);

    return NextResponse.json({
      message: "Para descobrir o chat_id, envie uma mensagem para o bot ou adicione-o a um grupo/canal",
      chatIds: chatIds.length > 0 ? chatIds : "Nenhuma mensagem recebida ainda",
      raw: updates,
    });
  } catch (error: any) {
    console.error("Erro ao buscar chat_id:", error);
    return NextResponse.json(
      { error: "Erro ao buscar chat_id", details: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}