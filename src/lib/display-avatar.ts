import { isOwnAvatarKey } from "@/lib/avatar";
import { presignAvatarGet } from "@/lib/r2";

export async function displayAvatar(userId: string, image: string | null) {
  if (!image) {
    return null;
  }
  if (image.startsWith("https://") || image.startsWith("http://")) {
    return image;
  }
  if (!isOwnAvatarKey(userId, image)) {
    return null;
  }

  try {
    return await presignAvatarGet(image);
  } catch {
    return null;
  }
}
