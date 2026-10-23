import { useEffect, useState } from "react";

export function avatarKey(id: string) {
  return `mdm_avatar_${id}`;
}

export function notifyAvatar() {
  try {
    window.dispatchEvent(new Event("mdm-avatar"));
  } catch { /* ignore */ }
}

// O'quvchi fotosurati (localStorage). Profil saqlaganda/o'chirganda
// hamma joy (sidebar + profil) avtomatik yangilanadi.
export function useAvatar(id: string | undefined | null) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setPhoto(null);
      return;
    }
    const load = () => {
      try {
        setPhoto(localStorage.getItem(avatarKey(id)));
      } catch {
        setPhoto(null);
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === avatarKey(id)) load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("mdm-avatar", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mdm-avatar", load);
    };
  }, [id]);
  return photo;
}
