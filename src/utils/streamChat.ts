import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamChatParams {
  messages: Message[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: StreamChatParams): Promise<void> {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
  
  try {
    // Récupérer le JWT de session de l'utilisateur authentifié
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Vous devez être connecté pour utiliser le chat IA');
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
      }
      if (resp.status === 402) {
        throw new Error('Crédits Lovable AI insuffisants. Contactez le support.');
      }
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de la connexion au chat IA');
    }

    if (!resp.body) {
      throw new Error('Pas de réponse du serveur');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onDelta(content);
          }
        } catch (parseError) {
          // JSON incomplet, remettre dans le buffer
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Flush du buffer restant
    if (buffer.trim()) {
      for (const rawLine of buffer.split('\n')) {
        if (!rawLine || rawLine.startsWith(':') || rawLine.trim() === '') continue;
        if (!rawLine.startsWith('data: ')) continue;
        
        const jsonStr = rawLine.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // Ignorer les erreurs de parsing dans le flush final
        }
      }
    }

    onDone();
  } catch (error) {
    console.error('[streamChat] Error:', error);
    if (onError) {
      onError(error instanceof Error ? error : new Error('Erreur inconnue'));
    } else {
      throw error;
    }
  }
}
