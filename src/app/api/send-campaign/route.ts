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

    // 1. SALVAR NO HISTÓRICO DO APP (Para o Sininho funcionar)
    // Criamos uma coleção 'campaigns' que todos os usuários podem ler
    await adminDb.collection('campaigns').add({
        title,
        body,
        createdAt: Timestamp.now(),
        active: true
    });

    // 2. BUSCAR TOKENS PARA PUSH (Para o celular vibrar)
    const usersSnap = await adminDb.collection('users')
      .where('pushToken', '!=', null)
      .get();
    
    const tokens: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.pushToken && data.pushToken.length > 10) {
        tokens.push(data.pushToken);
      }
    });

    // Se não tiver tokens, salvamos no banco mas avisamos que não foi push
    if (tokens.length === 0) {
      return NextResponse.json({ 
        success: true, 
        sentCount: 0, 
        message: 'Salvo no Sininho, mas nenhum celular para Push.' 
      });
    }

    // 3. ENVIAR PUSH
    const response = await adminMessaging.sendEachForMulticast({
      notification: { title, body },
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