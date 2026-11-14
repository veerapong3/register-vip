import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export function toastSuccess(title: string) {
  return toast.fire({ icon: "success", title });
}

export function toastError(title: string) {
  return toast.fire({ icon: "error", title });
}

export function toastInfo(title: string) {
  return toast.fire({ icon: "info", title });
}

export async function confirmAction(params: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "question" | "warning" | "info";
}) {
  const result = await Swal.fire({
    title: params.title,
    text: params.text,
    icon: params.icon || "question",
    showCancelButton: true,
    confirmButtonText: params.confirmText || "ยืนยัน",
    cancelButtonText: params.cancelText || "ยกเลิก",
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: "#b52d5c",
    cancelButtonColor: "#6b7280",
  });
  return result.isConfirmed;
}

export async function alertSuccess(title: string, text?: string) {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonText: "ตกลง",
    confirmButtonColor: "#b52d5c",
  });
}

export async function alertError(title: string, text?: string) {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "ตกลง",
    confirmButtonColor: "#b52d5c",
  });
}

export async function alertInfo(title: string, text?: string) {
  return Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonText: "รับทราบ",
    confirmButtonColor: "#b52d5c",
  });
}

export async function alertWarning(title: string, text?: string) {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    confirmButtonText: "รับทราบ",
    confirmButtonColor: "#c2410c",
  });
}
