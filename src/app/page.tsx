import { PageEnter } from "@/components/PageEnter";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function Home() {
  return (
    <PageEnter label="กำลังเปิดหน้าลงทะเบียน...">
      <RegistrationForm />
    </PageEnter>
  );
}
