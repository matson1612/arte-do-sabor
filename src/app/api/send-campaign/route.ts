// src/app/api/send-campaign/route.ts
import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Título e Mensagem são obrigatórios' }, { status: 400 });
    }

    // 1. Buscar todos os usuários que têm pushToken salvo e válido
    const usersSnap = await adminDb.collection('users')
      .where('pushToken', '!=', null)
      .get();
    
    // Filtra tokens vazios ou inválidos
    const tokens: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.pushToken && typeof data.pushToken === 'string' && data.pushToken.length > 10) {
        tokens.push(data.pushToken);
      }
    });

    // Se não encontrou ninguém, retorna 0 com sucesso (para não quebrar o front)
    if (tokens.length === 0) {
      return NextResponse.json({ 
        success: true, 
        sentCount: 0, 
        message: 'Nenhum dispositivo cadastrado encontrado.' 
      });
    }

    // 2. Enviar mensagem em massa (limite de 500 por lote, mas o admin sdk gerencia bem)
    const response = await adminMessaging.sendEachForMulticast({
      notification: { title, body },
      tokens: tokens,
    });

    // Limpeza de tokens inválidos (opcional, mas recomendado)
    if (response.failureCount > 0) {
      console.log(`Falha em ${response.failureCount} envios. Tokens podem estar expirados.`);
    }

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    });

  } catch (error: any) {
    console.error('Erro API:', error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}