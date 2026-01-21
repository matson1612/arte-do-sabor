// src/app/api/send-campaign/route.ts
import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Título e Mensagem são obrigatórios' }, { status: 400 });
    }

    // 1. Salvar no Banco (Histórico/Sininho)
    await adminDb.collection('campaigns').add({
        title,
        body,
        createdAt: Timestamp.now(),
        active: true
    });

    // 2. Buscar Tokens
    const usersSnap = await adminDb.collection('users').where('pushToken', '!=', null).get();
    const tokens: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.pushToken && data.pushToken.length > 10) tokens.push(data.pushToken);
    });

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'Salvo no histórico, mas sem tokens para Push.' });
    }

    // 3. Enviar Push (CORRIGIDO PARA TER AÇÃO DE CLIQUE)
    const response = await adminMessaging.sendEachForMulticast({
      notification: { 
          title: title, 
          body: body,
      },
      // Dados invisíveis que o Service Worker usa para saber onde clicar
      data: {
          url: "/", // Redireciona para a Home ao clicar
          click_action: "/" 
      },
      tokens: tokens,
    });

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    });

  } catch (error: any) {
    console.error('Erro API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}