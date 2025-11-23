import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Brain, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { streamChat } from '@/utils/streamChat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "Quel est l'état de mes chantiers en cours ?",
  "Quels chantiers ont une rentabilité critique ?",
  "Quel est mon budget total engagé ?",
  "Combien de membres d'équipe sont disponibles ?",
];

const ChatAI = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger ou créer une conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      loadOrCreateConversation();
    }
  }, [isOpen]);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadOrCreateConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer l'entreprise
      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();

      if (!entreprise) return;

      // Chercher la conversation la plus récente
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        setConversationId(existingConv.id);
        // Charger les messages
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', existingConv.id)
          .order('created_at', { ascending: true });

        if (msgs) {
          setMessages(msgs.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
          })));
        }
      } else {
        // Créer une nouvelle conversation
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            entreprise_id: entreprise.id,
            title: 'Nouvelle conversation',
          })
          .select()
          .single();

        if (newConv) {
          setConversationId(newConv.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement conversation:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) return;

    try {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role,
        content,
      });

      // Mettre à jour updated_at de la conversation
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Erreur sauvegarde message:', error);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Sauvegarder le message utilisateur
    await saveMessage('user', text);

    let assistantContent = '';

    try {
      await streamChat({
        messages: [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content,
        })),
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date(),
              },
            ];
          });
        },
        onDone: async () => {
          setIsLoading(false);
          await saveMessage('assistant', assistantContent);
        },
        onError: (error) => {
          setIsLoading(false);
          toast.error(error.message);
          // Retirer le dernier message assistant incomplet
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  return (
    <>
      {/* Bouton flottant avec effet pulse */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 relative group"
          size="icon"
        >
          <MessageCircle className="h-7 w-7 text-primary-foreground transition-transform group-hover:scale-110" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </Button>
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
      </div>

      {/* Dialog du chat */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <SheetTitle className="flex items-center gap-2">
              <div className="relative">
                <Brain className="h-6 w-6 text-primary" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <span className="text-lg font-semibold">Assistant IA</span>
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span className="ml-auto text-xs text-muted-foreground font-normal">En ligne</span>
            </SheetTitle>
          </SheetHeader>

          {/* Zone de messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in-0 duration-500">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg">
                  <Brain className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Assistant IA BTP</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                  Bonjour ! Je suis votre assistant IA pour la gestion de vos chantiers BTP.
                  Posez-moi vos questions sur vos projets, finances, équipes...
                </p>
                <div className="w-full space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Questions suggérées
                  </p>
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-3 hover:bg-primary/5 hover:border-primary/30 transition-all"
                      onClick={() => {
                        setInput(q);
                        sendMessage(q);
                      }}
                    >
                      <span className="text-xs text-muted-foreground mr-2">💬</span>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={cn(
                  'mb-4 flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {msg.role === 'assistant' && (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-primary/20">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 max-w-[80%] shadow-md transition-all hover:shadow-lg',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                      : 'bg-gradient-to-br from-muted to-muted/50 border border-border'
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {msg.role === 'assistant' && (
                      <span className="text-xs opacity-50 ml-auto">✓</span>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-semibold text-sm">
                    U
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 mb-4 animate-in fade-in-0 slide-in-from-bottom-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-primary/20">
                  <Brain className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="bg-gradient-to-br from-muted to-muted/50 border border-border rounded-2xl px-5 py-3 shadow-md flex items-center gap-1">
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input fixé en bas */}
          <div className="p-4 border-t bg-gradient-to-t from-muted/20 to-transparent">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                disabled={isLoading}
                className="flex-1 border-2 focus:border-primary transition-colors"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
                size="icon"
                className="bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-105 shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Propulsé par Lovable AI
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChatAI;
