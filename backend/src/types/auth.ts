import type { AccountType } from "@prisma/client";

export interface AppJwtPayload {
  sub: number;
  accountType: AccountType;
}

declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}
