import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface Comment {
  id: string;
  user_id: string;
  contenu: string;
  created_at: string;
  parent_id: string | null;
  profiles?: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
  };
}

interface CommentThreadProps {
  chantierId: string;
}

export const CommentThread = ({ chantierId }: CommentThreadProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    loadComments();

    const channel = supabase
      .channel(`comments_${chantierId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commentaires",
          filter: `chantier_id=eq.${chantierId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chantierId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("commentaires")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Récupérer les profils des utilisateurs
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, prenom, nom, email")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      }));

      setComments(commentsWithProfiles);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    const { error } = await supabase.from("commentaires").insert({
      chantier_id: chantierId,
      user_id: user.id,
      contenu: newComment.trim(),
      parent_id: replyTo,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive",
      });
      return;
    }

    setNewComment("");
    setReplyTo(null);
    queryClient.invalidateQueries({ queryKey: ["project-comments"] });
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from("commentaires")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["project-comments"] });
  };

  const getUserInitials = (comment: Comment) => {
    const prenom = comment.profiles?.prenom || "";
    const nom = comment.profiles?.nom || "";
    if (prenom && nom) {
      return `${prenom[0]}${nom[0]}`.toUpperCase();
    }
    return comment.profiles?.email?.[0].toUpperCase() || "?";
  };

  const getUserName = (comment: Comment) => {
    const prenom = comment.profiles?.prenom || "";
    const nom = comment.profiles?.nom || "";
    if (prenom && nom) {
      return `${prenom} ${nom}`;
    }
    return comment.profiles?.email || "Utilisateur";
  };

  const topLevelComments = comments.filter((c) => !c.parent_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            {replyTo && (
              <Button variant="outline" size="sm" onClick={() => setReplyTo(null)}>
                Annuler réponse
              </Button>
            )}
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {topLevelComments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun commentaire pour le moment
            </p>
          ) : (
            topLevelComments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getUserInitials(comment)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{getUserName(comment)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.contenu}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyTo(comment.id)}
                        className="h-7 text-xs"
                      >
                        Répondre
                      </Button>
                      {user?.id === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comment.id)}
                          className="h-7 text-xs text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested replies */}
                {comments
                  .filter((c) => c.parent_id === comment.id)
                  .map((reply) => (
                    <div key={reply.id} className="ml-11 flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitials(reply)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{getUserName(reply)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.contenu}</p>
                        {user?.id === reply.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(reply.id)}
                            className="h-7 text-xs text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};