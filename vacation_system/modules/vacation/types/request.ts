import type { RequestStatus } from "./requestStatus";
import type { UserRole } from "./userRole";

export type VacationRequest = {
  id: string;
  teacherId: string;
  status: RequestStatus;
  currentReviewerRole?: UserRole;
};
