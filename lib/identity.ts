import { getChatGPTUser } from "@/app/chatgpt-auth";

export type AuthenticatedUser={
  userId:string;
  email:string;
  displayName:string;
  fullName:string|null;
  provider:"chatgpt-sites";
};

export interface IdentityProvider{
  getUser():Promise<AuthenticatedUser|null>;
}

export const chatGPTSitesIdentityProvider:IdentityProvider={
  async getUser(){
    const user=await getChatGPTUser();
    if(!user)return null;
    return {
      ...user,
      email:user.email.trim().toLowerCase(),
      provider:"chatgpt-sites",
    };
  },
};
