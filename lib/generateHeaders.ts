import { getAuth } from "firebase/auth";

export async function getFirebaseToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");
  return user.getIdToken(); // returns a JWT string
}
