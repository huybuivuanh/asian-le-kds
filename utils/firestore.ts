import { collection, doc } from "firebase/firestore";
import { firebase } from "@/services/firebase/config";

export const generateFirestoreId = () =>
  doc(collection(firebase.db, "_")).id;
