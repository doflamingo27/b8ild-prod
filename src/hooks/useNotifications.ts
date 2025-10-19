import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Charger les notifications initiales
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading notifications:", error);
      } else {
        setNotifications(data || []);
        setUnreadCount(data?.filter((n) => !n.read).length || 0);
      }
      setLoading(false);
    };

    loadNotifications();

    // S'abonner aux nouvelles notifications en temps réel
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            );
            if (updatedNotif.read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
            if (!payload.old.read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const createNotification = async (
    notification: Omit<Notification, "id" | "created_at" | "read">
  ) => {
    const { error } = await supabase
      .from("notifications")
      .insert(notification);

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }
    return true;
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
  };
};
