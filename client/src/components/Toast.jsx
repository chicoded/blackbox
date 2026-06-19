import { useStore } from "../net/store.js";

export default function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.text}</div>;
}
