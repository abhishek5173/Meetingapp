import { getAuth } from "firebase/auth";

export const generateHeaders = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    const headers: Record<string, string> = {
    };

    if (!user) {
      throw new Error("No authenticated user found");
    }

    // Get Firebase ID token
    if (user) {
      try {
        const idToken = await user.getIdToken();
        headers["X-Auth-Token"] = `Bearer ${idToken}`;
      } catch (error) {
        console.error("Error fetching ID token:", error);
      }
    }

    // Return headers object
    return headers;
  } catch (error) {
    console.error("Error generating headers:", error);
    return {
      "Content-Type": "application/json",
    };
  }
};
