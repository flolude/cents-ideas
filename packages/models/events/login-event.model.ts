export interface ILoginRequestedEvent {
  email: string;
  firstLogin: boolean;
}

export interface IGoogleLoginRequestedEvnet {
  email: string;
  googleUserId: string;
  firstLogin: boolean;
}

export interface ILoginConfirmedEvent {
  userId: string;
}
