import { getAccessToken, getUserInfo } from "zmp-sdk/apis";
import { signInWithCustomToken, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";
import type { UserProfile } from "../types/listing";

let cachedProfile: UserProfile | null = null;
let signInPromise: Promise<UserProfile> | null = null;

interface ZaloLoginResult {
  token: string;
  profile: { uid: string; zaloId: string; name: string; avatar: string | null };
}

/**
 * Signs the user into Firebase using their Zalo identity. Safe to call
 * multiple times - concurrent calls share the same in-flight sign-in.
 */
export function ensureSignedIn(): Promise<UserProfile> {
  if (cachedProfile) return Promise.resolve(cachedProfile);
  if (signInPromise) return signInPromise;

  signInPromise = (async () => {
    const accessToken = await getAccessToken();
    // getUserInfo gives us a fast local display name/avatar for optimistic UI;
    // the Cloud Function independently re-verifies the token with Zalo before
    // trusting anything, so this call is not itself a security boundary.
    let localInfo: { name?: string; avatar?: string } = {};
    try {
      const { userInfo } = await getUserInfo({});
      localInfo = { name: userInfo?.name, avatar: userInfo?.avatar };
    } catch {
      // Optional - user may decline the profile permission.
    }

    const zaloLogin = httpsCallable<{ accessToken: string }, ZaloLoginResult>(
      functions,
      "zaloLogin"
    );
    const { data } = await zaloLogin({ accessToken });
    await signInWithCustomToken(auth, data.token);

    cachedProfile = {
      uid: data.profile.uid,
      zaloId: data.profile.zaloId,
      name: localInfo.name ?? data.profile.name,
      avatar: localInfo.avatar ?? data.profile.avatar ?? undefined,
      createdAt: Date.now(),
    };
    return cachedProfile;
  })();

  return signInPromise;
}

export function getCachedProfile(): UserProfile | null {
  return cachedProfile;
}
