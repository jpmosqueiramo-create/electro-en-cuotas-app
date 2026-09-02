// Firebase Admin setup con resguardo seguro para Firebase App Hosting (Cloud Run)
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "negocio-facil-page";

    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        })
      });
    } else {
      // En Firebase App Hosting (Cloud Run), usar Application Default Credentials automáticas de GCP
      admin.initializeApp({
        projectId
      });
    }
  } catch (err) {
    console.error("Error al inicializar Firebase Admin en App Hosting:", err);
  }
}

export { admin };
