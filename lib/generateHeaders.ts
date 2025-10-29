import auth from "@react-native-firebase/auth";

export const generateHeaders = async () => {
  const currentUser = auth().currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;

    const headers: Record<string, string> = {
    };

    headers["X-Auth-Token"] = `Bearer ${token}`;

  return headers;
};
