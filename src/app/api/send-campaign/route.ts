// src/app/api/send-campaign/route.ts
import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Título e Mensagem são obrigatórios' }, { status: 400 });
    }

    // 1. Buscar todos os usuários que têm pushToken salvo
    const usersSnap = await adminDb.collection('users').where('pushToken', '!=', null).get();
    
    const tokens: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.pushToken) tokens.push(data.pushToken);
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'Nenhum cliente com notificação ativa encontrado.' });
    }

    // 2. Enviar mensagem em massa
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: tokens,
    };

    const response = await adminMessaging.sendEachForMulticast(message);

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    });

  } catch (error: any) {
    console.error('Erro no envio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}