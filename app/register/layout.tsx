import type { ReactNode } from "react";

import { Providers } from "@/app/register/Providers";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
